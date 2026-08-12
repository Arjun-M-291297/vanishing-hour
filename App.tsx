import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

export default function App() {
  // Belt-and-suspenders alongside app.json's "orientation": "landscape" (which
  // sets the native build-time lock) — re-asserts the lock at runtime in case
  // a device's OS-level rotation lock or an edge case lets portrait slip
  // through. LANDSCAPE (not landscape-left/-right) permits both directions.
  // expo-screen-orientation has limited/inconsistent web support, so failures
  // there are expected and swallowed rather than surfaced.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SafeAreaProvider>
    </View>
  );
}
