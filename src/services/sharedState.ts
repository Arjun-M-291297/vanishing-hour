import { supabase } from './supabase';

export interface SharedCaseStateRow {
  room_id: string;
  shared_clue_ids: string[];
  deduction_selections: Record<string, unknown>;
  updated_at: string;
}

export async function fetchSharedState(roomId: string): Promise<SharedCaseStateRow | null> {
  const { data } = await supabase.from('shared_case_state').select().eq('room_id', roomId).maybeSingle();
  return (data as SharedCaseStateRow) ?? null;
}

// Goes through the update_shared_state RPC rather than a client-side
// read-modify-write on deduction_selections — the same reason
// markPuzzleSolvedRemote goes through an RPC for player_progress (see
// 0006_shared_case_state_merge.sql): two players' patches landing close
// together could otherwise clobber each other, since this row (unlike
// player_progress) is written by BOTH members of a room, not just one.
export async function updateSharedState(
  roomId: string,
  patch: Record<string, unknown>
): Promise<{ row?: SharedCaseStateRow; error?: string }> {
  const { data, error } = await supabase.rpc('update_shared_state', { p_room_id: roomId, p_patch: patch });
  if (error) return { error: error.message };
  return { row: data as SharedCaseStateRow };
}

export function subscribeToSharedState(roomId: string, onChange: () => void) {
  const channel = supabase
    .channel(`shared:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shared_case_state', filter: `room_id=eq.${roomId}` },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
