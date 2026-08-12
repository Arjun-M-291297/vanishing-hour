-- Closes three RLS gaps found in 0001_init.sql. Safe to run on top of your
-- existing data — this only touches policies/functions/triggers, no tables
-- are dropped, so the rooms/players/profiles you already have stay intact.
--
-- 1. rooms' "look up by code" policy actually listed every lobby room to
--    any signed-in user (confirmed live: a fresh account with no code could
--    enumerate open rooms, including their join codes). Replaced with a
--    security-definer RPC that returns at most the one room matching a
--    code you already know, instead of a broad SELECT policy.
-- 2. room_players' and player_progress' UPDATE policies only checked that
--    you owned the row, not that room_id/user_id stayed the same — a
--    player could PATCH their own seat/progress row's room_id to jump into
--    an arbitrary room, bypassing the 2-seat cap and membership checks that
--    only ran on INSERT. Closed with a trigger that makes those columns
--    immutable after the row is created.
-- 3. shared_case_state granted DELETE via a catch-all "for all" policy,
--    which nothing in the app needs. Narrowed to select/insert/update.

-- ---------------------------------------------------------------------------
-- 1. Replace the leaky "look up room by code" SELECT policy with an RPC.
-- ---------------------------------------------------------------------------
drop policy if exists "anyone signed in can look up an open room by code" on public.rooms;

create or replace function public.find_room_by_code(p_code text)
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

-- ---------------------------------------------------------------------------
-- 2. Make room_id/user_id immutable on room_players and player_progress
--    once a row exists — only INSERT (which is properly gated) may set them.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_seat_reassignment()
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

drop trigger if exists room_players_immutable_keys on public.room_players;
create trigger room_players_immutable_keys
  before update on public.room_players
  for each row execute procedure public.prevent_seat_reassignment();

drop trigger if exists player_progress_immutable_keys on public.player_progress;
create trigger player_progress_immutable_keys
  before update on public.player_progress
  for each row execute procedure public.prevent_seat_reassignment();

-- ---------------------------------------------------------------------------
-- 3. Narrow shared_case_state's policy: drop DELETE, keep select/insert/update.
-- ---------------------------------------------------------------------------
drop policy if exists "members can write shared state" on public.shared_case_state;

create policy "members can insert shared state"
  on public.shared_case_state for insert
  to authenticated
  with check (public.is_room_member(room_id));

create policy "members can update shared state"
  on public.shared_case_state for update
  to authenticated
  using (public.is_room_member(room_id))
  with check (public.is_room_member(room_id));
