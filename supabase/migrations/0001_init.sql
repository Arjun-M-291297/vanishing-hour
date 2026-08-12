-- Vanishing Hour: Duo — foundation schema.
-- Run this once against a fresh Supabase project: paste into the SQL editor,
-- or `supabase db push` if you're using the CLI (see SETUP.md). Safe to
-- re-run from scratch at any point during development — it drops its own
-- objects first (there's no user data worth preserving yet).
--
-- Design: two players per room, each assigned one of two characters, each
-- starting in a different location and progressing through their own track
-- (own solved puzzles / collected clues), converging on a shared deduction
-- step at the end. RLS is the only access boundary — there is no separate
-- backend server in this pass, so every table here is locked down so a
-- player can only ever write their own row, never their partner's.

-- ---------------------------------------------------------------------------
-- Clean slate (safe on a fresh project — everything below is IF EXISTS).
-- ---------------------------------------------------------------------------
drop table if exists public.room_events cascade;
drop table if exists public.shared_case_state cascade;
drop table if exists public.player_progress cascade;
drop table if exists public.room_players cascade;
drop table if exists public.rooms cascade;
drop table if exists public.profiles cascade;
drop type if exists public.room_status cascade;
drop function if exists public.is_room_member(uuid) cascade;
drop function if exists public.room_player_count(uuid) cascade;
drop function if exists public.find_room_by_code(text) cascade;
drop function if exists public.create_room(text, text) cascade;
drop function if exists public.room_is_open(uuid) cascade;
drop function if exists public.prevent_seat_reassignment() cascade; -- cascades to its triggers too
drop function if exists public.handle_new_user() cascade; -- cascades to the on_auth_user_created trigger too

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, mirrored from auth.users on signup.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any signed-in user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-create a profile row whenever someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'Detective'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- rooms — one shared session for exactly two players.
-- ---------------------------------------------------------------------------
create type public.room_status as enum ('lobby', 'active', 'complete');

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  -- Short, unguessable-enough join code (6 chars, base32-ish alphabet minus
  -- ambiguous characters). Not a security boundary by itself -- pair with
  -- rate limiting on the join endpoint/client and a lobby-only join window.
  code text not null unique,
  case_id text not null default 'vanishing-hour',
  status public.room_status not null default 'lobby',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

-- ---------------------------------------------------------------------------
-- room_players — each player's seat in a room: character claim, ready
-- state, and which scene of their track they're currently in. Created
-- before the helper functions below, which query it.
-- ---------------------------------------------------------------------------
create table public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  character_id text, -- null until claimed in the lobby; one of the case's two roles
  is_ready boolean not null default false,
  current_scene_id text,
  connection_status text not null default 'online', -- 'online' | 'offline'
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

-- At most one player per character per room (partial unique index — only
-- applies once a character is actually claimed).
create unique index room_players_unique_character
  on public.room_players (room_id, character_id)
  where character_id is not null;

alter table public.room_players enable row level security;

-- ---------------------------------------------------------------------------
-- Helper functions — security-definer so room_players' own RLS policies
-- (which call these) don't recurse into themselves.
-- ---------------------------------------------------------------------------
create function public.is_room_member(target_room_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.room_players
    where room_id = target_room_id and user_id = auth.uid()
  );
$$;

create function public.room_player_count(target_room_id uuid)
returns int
language sql
security definer set search_path = public
stable
as $$
  select count(*)::int from public.room_players where room_id = target_room_id;
$$;

-- ---------------------------------------------------------------------------
-- rooms policies (now that is_room_member exists).
-- ---------------------------------------------------------------------------
create policy "members can read their room"
  on public.rooms for select
  to authenticated
  using (public.is_room_member(id));

-- Joining requires looking a room up by its code before you're a member.
-- Deliberately NOT a SELECT policy: `using (status = 'lobby')` would let any
-- signed-in user list every open room (leaking codes + creator ids to
-- strangers), since RLS filters rows, not the WHERE clause a client sends.
-- A security-definer RPC gives an exact by-code lookup without exposing a
-- generic "list all lobby rooms" capability.
create function public.find_room_by_code(p_code text)
returns table (id uuid, code text, case_id text, status public.room_status)
language sql
security definer set search_path = public
stable
as $$
  select r.id, r.code, r.case_id, r.status
  from public.rooms r
  where r.code = upper(p_code) and r.status = 'lobby';
$$;

grant execute on function public.find_room_by_code(text) to authenticated;

create policy "signed-in users can create a room"
  on public.rooms for insert
  to authenticated
  with check (created_by = auth.uid());

-- Room creation goes through this RPC, not a direct client-side INSERT,
-- because PostgREST's INSERT...RETURNING is itself subject to the table's
-- SELECT policy — and "members can read their room" (above) requires a
-- room_players seat that doesn't exist yet the instant the room is created.
-- Doing both inserts here, inside one security-definer function, sidesteps
-- that ordering problem entirely (RLS doesn't apply to a security-definer
-- function's own internal table access).
create function public.create_room(p_code text, p_case_id text default 'vanishing-hour')
returns public.rooms
language plpgsql
security definer set search_path = public
as $$
declare
  new_room public.rooms;
begin
  insert into public.rooms (code, case_id, created_by)
  values (p_code, p_case_id, auth.uid())
  returning * into new_room;

  insert into public.room_players (room_id, user_id)
  values (new_room.id, auth.uid());

  return new_room;
end;
$$;

grant execute on function public.create_room(text, text) to authenticated;

create policy "members can update their room"
  on public.rooms for update
  to authenticated
  using (public.is_room_member(id))
  with check (public.is_room_member(id));

-- ---------------------------------------------------------------------------
-- room_players policies.
-- ---------------------------------------------------------------------------
create policy "members can read seats in their room"
  on public.room_players for select
  to authenticated
  using (public.is_room_member(room_id));

-- Joining a room: insert your own seat, only while it's still lobby-status
-- and has fewer than two players already. The "still open" check goes
-- through a security-definer helper rather than a plain SELECT against
-- rooms, because a joining player isn't a member of the room yet — a plain
-- SELECT would be invisible to them under rooms' own "members can read
-- their room" policy, making this check always fail.
create function public.room_is_open(target_room_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.rooms where id = target_room_id and status = 'lobby'
  );
$$;

grant execute on function public.room_is_open(uuid) to authenticated;

create policy "signed-in users can take an open seat"
  on public.room_players for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.room_player_count(room_id) < 2
    and public.room_is_open(room_id)
  );

create policy "players can update only their own seat"
  on public.room_players for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- The UPDATE policy above only checks ownership, not which room the row
-- points at — without this trigger, a player could PATCH their own seat's
-- room_id to jump into an arbitrary room, sidestepping the 2-seat-cap and
-- room-status checks that only run on INSERT. Applied to player_progress
-- below too, for the same reason.
create function public.prevent_seat_reassignment()
returns trigger
language plpgsql
as $$
begin
  if new.room_id <> old.room_id or new.user_id <> old.user_id then
    raise exception 'room_id and user_id cannot be changed after the row is created';
  end if;
  return new;
end;
$$;

create trigger room_players_immutable_keys
  before update on public.room_players
  for each row execute procedure public.prevent_seat_reassignment();

create policy "players can leave by deleting their own seat"
  on public.room_players for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- player_progress — each player's own track: what they've solved/collected.
-- A player can only ever write their own row (enforced below), never their
-- partner's -- the closest thing to server authority this pass has, short
-- of moving puzzle-answer checks into an Edge Function (see SETUP.md /
-- follow-up note at the bottom of this file).
-- ---------------------------------------------------------------------------
create table public.player_progress (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  solved_puzzle_ids text[] not null default '{}',
  collected_clue_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.player_progress enable row level security;

create policy "members can read progress in their room"
  on public.player_progress for select
  to authenticated
  using (public.is_room_member(room_id));

create policy "players can only write their own progress"
  on public.player_progress for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_room_member(room_id));

create policy "players can only update their own progress"
  on public.player_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger player_progress_immutable_keys
  before update on public.player_progress
  for each row execute procedure public.prevent_seat_reassignment();

-- ---------------------------------------------------------------------------
-- shared_case_state — the joint layer both players read and write: clues
-- either of them has surfaced to the other, and the final combined
-- deduction. One row per room.
-- ---------------------------------------------------------------------------
create table public.shared_case_state (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  shared_clue_ids text[] not null default '{}',
  deduction_selections jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.shared_case_state enable row level security;

create policy "members can read shared state"
  on public.shared_case_state for select
  to authenticated
  using (public.is_room_member(room_id));

create policy "members can insert shared state"
  on public.shared_case_state for insert
  to authenticated
  with check (public.is_room_member(room_id));

create policy "members can update shared state"
  on public.shared_case_state for update
  to authenticated
  using (public.is_room_member(room_id))
  with check (public.is_room_member(room_id));
-- No DELETE policy: nothing in the app deletes shared state, and losing it
-- would wipe both players' joint clues/deduction with no way back.

-- ---------------------------------------------------------------------------
-- room_events — lightweight activity feed for presence ("Partner examined
-- the desk"), not gameplay-authoritative. Purely additive/append-only.
-- ---------------------------------------------------------------------------
create table public.room_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.room_events enable row level security;

create policy "members can read events in their room"
  on public.room_events for select
  to authenticated
  using (public.is_room_member(room_id));

create policy "members can post events as themselves"
  on public.room_events for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_room_member(room_id));

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes on the tables clients need to subscribe to.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.player_progress;
alter publication supabase_realtime add table public.shared_case_state;
alter publication supabase_realtime add table public.room_events;

-- ---------------------------------------------------------------------------
-- FOLLOW-UP (not implemented in this pass): puzzle-answer checks currently
-- have nowhere authoritative to live -- a client updates its own
-- player_progress row directly, so a modified client could write a solve
-- for a puzzle it never actually solved. RLS stops it from touching its
-- partner's row, but not from lying about its own. Closing that gap means
-- moving "did they get the puzzle right" into a Supabase Edge Function that
-- validates the answer against the case data server-side and only then
-- writes player_progress, rather than letting the client write it directly.
-- ---------------------------------------------------------------------------
