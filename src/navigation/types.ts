export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Lobby: undefined;
  Room: { roomId: string };
  Intro: { roomId: string };
  Game: { roomId: string };
};
