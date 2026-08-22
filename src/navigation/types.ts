export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Lobby: undefined;
  Room: { roomId: string };
  // characterId is optional: the real flow only knows it once a player
  // claims a role in Room, and the dev solo-preview shortcut (see
  // devFlags.ts) skips Room entirely, setting it directly instead.
  Intro: { roomId: string; characterId?: string };
  Game: { roomId: string; characterId?: string };
  Beyond: { roomId: string; characterId?: string };
  Cellar: { roomId: string; characterId?: string };
  Library: { roomId: string; characterId?: string };
  // Chapter 3, Inspector's half only for now — the Associate's matching
  // scene (the ticket office / station house) has no art yet, so there's
  // nowhere real to route them once their own Chapter 2 track ends.
  Station: { roomId: string; characterId?: string };
};
