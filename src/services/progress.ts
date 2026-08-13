import { supabase } from './supabase';

export interface PlayerProgressRow {
  room_id: string;
  user_id: string;
  solved_puzzle_ids: string[];
  collected_clue_ids: string[];
  updated_at: string;
}

// Goes through an RPC rather than a client-side read-modify-write on
// solved_puzzle_ids, so two solves landing close together (or a retry after
// a flaky connection) can't race and drop one — see the migration.
export async function markPuzzleSolvedRemote(roomId: string, puzzleId: string): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('mark_puzzle_solved', { p_room_id: roomId, p_puzzle_id: puzzleId });
  return { error: error?.message };
}

export async function fetchRoomProgress(roomId: string): Promise<PlayerProgressRow[]> {
  const { data } = await supabase.from('player_progress').select().eq('room_id', roomId);
  return (data as PlayerProgressRow[]) ?? [];
}

export function subscribeToProgress(roomId: string, onChange: () => void) {
  const channel = supabase
    .channel(`progress:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'player_progress', filter: `room_id=eq.${roomId}` },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
