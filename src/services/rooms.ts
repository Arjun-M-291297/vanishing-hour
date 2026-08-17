import { supabase } from './supabase';

// A stored session can outlive its own `profiles` row — e.g. a Supabase
// project's public schema getting reset/reseeded during development while a
// device still has an old session persisted locally. The JWT itself stays
// cryptographically valid (Supabase doesn't re-check the database just to
// accept it), so the app carries on believing it's signed in until the
// first write that references profiles.id hits a foreign key violation
// (Postgres code 23503). Recovering from that locally isn't possible — the
// row it needs will never appear — so the only way out is a fresh sign-in,
// which is exactly what re-running the OAuth flow (e.g. in an incognito
// window, or after clearing local storage) does.
const STALE_SESSION_ERROR = 'Your session is out of date — signed you out. Please sign in again.';

function isStaleSessionError(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23503';
}

async function recoverFromStaleSession(): Promise<{ error: string }> {
  await supabase.auth.signOut();
  return { error: STALE_SESSION_ERROR };
}

export interface RoomRow {
  id: string;
  code: string;
  case_id: string;
  status: 'lobby' | 'active' | 'complete';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RoomPlayerRow {
  id: string;
  room_id: string;
  user_id: string;
  character_id: string | null;
  is_ready: boolean;
  current_scene_id: string | null;
  connection_status: string;
  joined_at: string;
}

// Base32-ish alphabet with ambiguous characters (0/O, 1/I/L) dropped, so a
// code read aloud over a call doesn't get mistyped.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRoomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function createRoom(caseId = 'vanishing-hour'): Promise<{ room?: RoomRow; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: 'Not signed in.' };

  // Goes through an RPC that creates the room and the creator's seat in one
  // transaction — a plain `.insert().select()` doesn't work here, because
  // INSERT...RETURNING is itself subject to the rooms SELECT policy, and
  // "members can read their room" needs a room_players seat that doesn't
  // exist yet the instant the room row is created.
  //
  // Collisions on a 6-char/32-symbol code are rare (~1 in 1B) but the unique
  // constraint means a collision fails loudly rather than silently — retry
  // a few times before giving up.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase.rpc('create_room', { p_code: code, p_case_id: caseId });

    if (!error && data) return { room: data as RoomRow };
    if (error && isStaleSessionError(error)) return recoverFromStaleSession();
    if (error && !error.message.includes('duplicate')) {
      return { error: error.message };
    }
  }
  return { error: 'Could not allocate a room code — try again.' };
}

export async function joinRoomByCode(
  code: string
): Promise<{ room?: Pick<RoomRow, 'id' | 'code' | 'case_id' | 'status'>; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: 'Not signed in.' };

  // Goes through an RPC rather than a direct `.from('rooms').select()` — rooms
  // has no general "select by code" RLS policy (that would let any signed-in
  // user list every open room, not just the one they know the code for). The
  // RPC is security-definer and returns at most the single matching row.
  const { data: rows, error: lookupError } = await supabase.rpc('find_room_by_code', {
    p_code: code.trim().toUpperCase(),
  });

  if (lookupError) return { error: lookupError.message };
  const room = rows?.[0];
  if (!room) return { error: 'No open room with that code.' };

  const { error: seatError } = await supabase
    .from('room_players')
    .insert({ room_id: room.id, user_id: userId });

  if (seatError && isStaleSessionError(seatError)) return recoverFromStaleSession();
  // Already-seated (e.g. rejoining after a refresh) isn't an error.
  if (seatError && !seatError.message.includes('duplicate')) {
    return { error: seatError.message };
  }
  return { room };
}

export async function claimCharacter(roomId: string, characterId: string): Promise<{ error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: 'Not signed in.' };

  const { error } = await supabase
    .from('room_players')
    .update({ character_id: characterId })
    .eq('room_id', roomId)
    .eq('user_id', userId);

  if (error?.message.includes('duplicate')) return { error: 'Your partner already picked that one.' };
  return { error: error?.message };
}

export async function setReady(roomId: string, isReady: boolean): Promise<{ error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: 'Not signed in.' };

  const { error } = await supabase
    .from('room_players')
    .update({ is_ready: isReady })
    .eq('room_id', roomId)
    .eq('user_id', userId);
  return { error: error?.message };
}

export async function leaveRoom(roomId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  await supabase.from('room_players').delete().eq('room_id', roomId).eq('user_id', userId);
}

export async function fetchRoomPlayers(roomId: string): Promise<RoomPlayerRow[]> {
  const { data } = await supabase.from('room_players').select().eq('room_id', roomId).order('joined_at');
  return (data as RoomPlayerRow[]) ?? [];
}

// Subscribes to both rooms and room_players changes for a given room in one
// channel; callers re-fetch whichever slice they need on each event rather
// than trying to diff payloads themselves.
export function subscribeToRoom(roomId: string, onChange: () => void) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, onChange)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
