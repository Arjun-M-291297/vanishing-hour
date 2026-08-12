-- Fixes a regression introduced by 0002: once the broad "list all lobby
-- rooms" SELECT policy was removed, room creation broke. The client did
-- `insert into rooms ... returning *`, and PostgREST's INSERT...RETURNING
-- is itself subject to the table's SELECT policy — "members can read their
-- room" requires a room_players seat, which doesn't exist yet one statement
-- before the client creates it. Result: creating a room failed with "new
-- row violates row-level security policy for table rooms", even though the
-- INSERT's own WITH CHECK (created_by = auth.uid()) was satisfied.
--
-- Fix: do both inserts (the room, then its creator's seat) inside one
-- security-definer function. RLS doesn't apply to a security-definer
-- function's own internal table access, so there's no ordering problem.

create or replace function public.create_room(p_code text, p_case_id text default 'vanishing-hour')
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
