import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { RootStackParamList } from './types';
import { useAuthStore } from '../store/authStore';
import { SplashScreen } from '../screens/SplashScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { RoomScreen } from '../screens/RoomScreen';
import { IntroScreen } from '../screens/IntroScreen';
import { GameScreen } from '../screens/GameScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.ink, card: colors.ink, border: colors.border },
};

export function RootNavigator() {
  const { session, initializing } = useAuthStore();

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {initializing ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : !session ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Lobby" component={LobbyScreen} />
            <Stack.Screen name="Room" component={RoomScreen} />
            <Stack.Screen name="Intro" component={IntroScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
