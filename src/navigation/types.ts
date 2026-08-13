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
};
