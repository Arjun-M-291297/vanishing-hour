import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

export function SplashScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>THE VANISHING HOUR</Text>
      <Text style={styles.subtitle}>DUO</Text>
      <ActivityIndicator color={colors.brass} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontFamily: fonts.display,
    color: colors.brassBright,
    fontSize: 22,
    letterSpacing: 3,
  },
  subtitle: {
    fontFamily: fonts.display,
    color: colors.paperDim,
    fontSize: 12,
    letterSpacing: 6,
    marginTop: spacing.xs,
  },
  spinner: { marginTop: spacing.xl },
});
