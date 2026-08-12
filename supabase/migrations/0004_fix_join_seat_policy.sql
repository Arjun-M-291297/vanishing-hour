-- Fixes a second regression from 0002, same root cause as 0003's.
--
-- room_players' INSERT policy ("signed-in users can take an open seat")
-- checks the room is still open via `exists (select 1 from public.rooms r
-- where r.id = room_id and r.status = 'lobby')`. That's a plain SELECT
-- against `rooms`, which is itself subject to rooms' own RLS — and a
-- player joining a room isn't a member of it yet, so "members can read
-- their room" hides the row from them entirely. The EXISTS always finds
-- zero rows, the WITH CHECK always fails, and joining a room by code is
-- broken (confirmed live: a fresh account with a valid code, room genuinely
-- in 'lobby', and room_player_count() correctly returning 1, still got 403
-- "new row violates row-level security policy for table room_players").
--
-- Same fix pattern as 0003: move the check into a security-definer helper
-- so it isn't subject to the caller's own RLS view of `rooms`.

create or replace function public.room_is_open(target_room_id uuid)
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

drop policy if exists "signed-in users can take an open seat" on public.room_players;

create policy "signed-in users can take an open seat"
  on public.room_players for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.room_player_count(room_id) < 2
    and public.room_is_open(room_id)
  );
