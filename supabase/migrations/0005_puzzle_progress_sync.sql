-- Adds an atomic way to record "this player solved this puzzle" in
-- player_progress. A plain client-side read-modify-write on
-- solved_puzzle_ids (fetch the array, append, write it back) would race
-- against a second solve landing between the read and the write; this RPC
-- does the append inside the database instead, so concurrent calls can't
-- clobber each other. security definer only for the same reason the other
-- RPCs in 0001_init.sql are: bypassing RLS ordering issues, not bypassing
-- the "only your own row" rule -- it still only ever touches auth.uid()'s
-- own row.

drop function if exists public.mark_puzzle_solved(uuid, text) cascade;

create function public.mark_puzzle_solved(p_room_id uuid, p_puzzle_id text)
returns public.player_progress
language plpgsql
security definer set search_path = public
as $$
declare
  result public.player_progress;
begin
  insert into public.player_progress (room_id, user_id, solved_puzzle_ids)
  values (p_room_id, auth.uid(), array[p_puzzle_id])
  on conflict (room_id, user_id) do update
    set solved_puzzle_ids = (
          select array_agg(distinct e)
          from unnest(public.player_progress.solved_puzzle_ids || array[p_puzzle_id]) as e
        ),
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.mark_puzzle_solved(uuid, text) to authenticated;
