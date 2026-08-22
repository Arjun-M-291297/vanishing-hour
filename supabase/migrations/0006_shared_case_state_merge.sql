-- Chapter 3 (Blackwood Station) introduces puzzles that both players read
-- AND write live -- Synchronized Signal (each player arms their own side,
-- solved only if the timestamps land close together) and the closing
-- Shared Deduction Board (both players pick from the same shortlist).
-- Both need shared_case_state.deduction_selections updated from two
-- different clients in quick succession. A plain client-side
-- read-modify-write (fetch the jsonb, merge in JS, write it back) would
-- race exactly like solved_puzzle_ids did before mark_puzzle_solved existed
-- (see 0005_puzzle_progress_sync.sql) -- this does the merge inside
-- Postgres instead, so two overlapping calls can't clobber each other.
--
-- Unlike mark_puzzle_solved, this touches a row that ISN'T scoped to
-- auth.uid() alone (shared_case_state is one row per ROOM, both members
-- write it) -- security definer here bypasses RLS entirely, so the
-- function has to re-check room membership itself instead of relying on
-- the table's own policies.

drop function if exists public.update_shared_state(uuid, jsonb) cascade;

create function public.update_shared_state(p_room_id uuid, p_patch jsonb)
returns public.shared_case_state
language plpgsql
security definer set search_path = public
as $$
declare
  result public.shared_case_state;
begin
  if not public.is_room_member(p_room_id) then
    raise exception 'not a member of this room';
  end if;

  insert into public.shared_case_state (room_id, deduction_selections)
  values (p_room_id, p_patch)
  on conflict (room_id) do update
    set deduction_selections = public.shared_case_state.deduction_selections || p_patch,
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.update_shared_state(uuid, jsonb) to authenticated;
