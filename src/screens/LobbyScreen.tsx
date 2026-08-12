import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen, Heading, BodyText, Button, TextField, Divider } from '../components/ui';
import { createRoom, joinRoomByCode } from '../services/rooms';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Lobby'>;

export function LobbyScreen({ navigation }: Props) {
  const signOut = useAuthStore((s) => s.signOut);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setBusy('create');
    setError(null);
    const { room, error: err } = await createRoom();
    setBusy(null);
    if (err || !room) return setError(err ?? 'Could not create a room.');
    navigation.navigate('Room', { roomId: room.id });
  };

  const handleJoin = async () => {
    if (joinCode.trim().length < 4) return setError('Enter the room code your partner shared.');
    setBusy('join');
    setError(null);
    const { room, error: err } = await joinRoomByCode(joinCode);
    setBusy(null);
    if (err || !room) return setError(err ?? 'Could not join that room.');
    navigation.navigate('Room', { roomId: room.id });
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <Heading style={styles.title}>The Detective's Desk</Heading>
        <BodyText style={styles.subtitle}>Start a case with your partner, or join one already waiting.</BodyText>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button title="Create a Room" onPress={handleCreate} loading={busy === 'create'} disabled={busy !== null} />

        <Divider />

        <BodyText style={styles.joinLabel}>Have a room code?</BodyText>
        <View style={styles.joinRow}>
          <View style={styles.joinInput}>
            <TextField
              value={joinCode}
              onChangeText={(v) => setJoinCode(v.toUpperCase())}
              placeholder="ROOM CODE"
              autoCapitalize="characters"
              maxLength={6}
            />
          </View>
          <Button title="Join" onPress={handleJoin} loading={busy === 'join'} disabled={busy !== null} />
        </View>

        <Button title="Sign Out" variant="ghost" onPress={signOut} disabled={busy !== null} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 480, paddingHorizontal: spacing.xl },
  title: { fontSize: 22, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { textAlign: 'center', marginBottom: spacing.xl },
  joinLabel: { textAlign: 'center', marginBottom: spacing.sm, fontSize: 13 },
  joinRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch', marginBottom: spacing.xl },
  joinInput: { flex: 1 },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md, fontSize: 13 },
});
