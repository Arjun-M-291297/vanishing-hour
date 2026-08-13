import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, Heading, BodyText, Button } from '../components/ui';
import { signInWithGoogle, isGoogleAuthConfigured } from '../services/googleAuth';
import { supabase } from '../services/supabase';
import { colors, spacing } from '../theme';

export function AuthScreen() {
  const [busy, setBusy] = useState<'google' | 'guest' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const googleConfigured = isGoogleAuthConfigured();

  const handleGoogle = async () => {
    setBusy('google');
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err);
    setBusy(null);
  };

  const handleGuest = async () => {
    setBusy('guest');
    setError(null);
    const { error: err } = await supabase.auth.signInAnonymously();
    if (err) setError(err.message);
    setBusy(null);
  };

  return (
    <Screen>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Heading style={styles.title}>THE VANISHING HOUR</Heading>
          <BodyText style={styles.subtitle}>Two detectives. One vanished man. Sign in to open a case together.</BodyText>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Button
              title={googleConfigured ? 'Sign in with Google' : 'Google sign-in not configured'}
              onPress={handleGoogle}
              loading={busy === 'google'}
              disabled={!googleConfigured || busy !== null}
            />
            <Button title="Continue as Guest" variant="secondary" onPress={handleGuest} loading={busy === 'guest'} disabled={busy !== null} />
          </View>

          {!googleConfigured && (
            <Text style={styles.hint}>Add your Google OAuth client IDs to app.json (see SETUP.md) to enable Google sign-in.</Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: colors.ink },
  screen: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 480, paddingHorizontal: spacing.xl },
  title: { fontSize: 22, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { textAlign: 'center', marginBottom: spacing.xl },
  actions: { gap: spacing.sm },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md, fontSize: 13 },
  hint: { color: colors.paperDim, fontSize: 11, textAlign: 'center', marginTop: spacing.md, opacity: 0.7 },
});
