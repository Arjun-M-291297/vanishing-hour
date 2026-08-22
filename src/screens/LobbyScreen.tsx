import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen, Heading, BodyText, Button, TextField, Divider } from '../components/ui';
import { createRoom, joinRoomByCode } from '../services/rooms';
import { useAuthStore } from '../store/authStore';
import { CHARACTER_OPTIONS } from '../data/characters';
import { DEV_SOLO_PREVIEW } from '../devFlags';
import { colors, fonts, spacing } from '../theme';

// Not a real Supabase room — Intro/Game don't otherwise query by roomId
// except GameScreen's leave-room cleanup, which silently matches zero rows
// for an id that was never actually seated. Good enough for a preview-only
// id with no server round trip.
function makePreviewRoomId(characterId: string): string {
  return `preview-${characterId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Lobby'>;

// caseId is stored on the room row itself (rooms.case_id) and read back by
// both players once seated — see RoomScreen, which routes past the ready-up
// step differently depending on which chapter the room was created for.
// Joining a room never picks a chapter directly; whoever created it already
// fixed it for both players.
const CHAPTERS = [
  {
    caseId: 'vanishing-hour',
    title: 'The Vanishing House',
    description: "Edmund Voss has disappeared from his own study. Split up, search the house, and find your way below.",
  },
  {
    caseId: 'blackwood-station',
    title: 'Blackwood Station',
    description: 'The trail leads to the station — together now, but still not seeing the same thing.',
  },
];

export function LobbyScreen({ navigation }: Props) {
  const signOut = useAuthStore((s) => s.signOut);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartChapter = async (caseId: string) => {
    setBusy('create');
    setError(null);
    const { room, error: err } = await createRoom(caseId);
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

  // Same case_id-based branching as RoomScreen's post-ready-up routing —
  // duplicated rather than shared, since RoomScreen's version also has to
  // read the live room row, and this path skips Room/pairing entirely.
  const handlePreview = (characterId: string, caseId: string) => {
    const roomId = makePreviewRoomId(characterId);
    if (caseId === 'blackwood-station') {
      if (characterId === 'inspector') navigation.navigate('Station', { roomId, characterId });
      else navigation.navigate('Beyond', { roomId, characterId });
    } else {
      navigation.navigate('Intro', { roomId, characterId });
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Heading style={styles.title}>The Detective's Desk</Heading>
          <BodyText style={styles.subtitle}>Pick a chapter to start a case with your partner, or join one already waiting.</BodyText>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.chapterList}>
            {CHAPTERS.map((chapter, i) => (
              <View key={chapter.caseId} style={styles.chapterRow}>
                <Text style={styles.chapterNumber}>{`CHAPTER ${i + 1}`}</Text>
                <Text style={styles.chapterTitle}>{chapter.title}</Text>
                <Text style={styles.chapterDescription}>{chapter.description}</Text>
                <View style={styles.chapterAction}>
                  <Button
                    title="Start"
                    onPress={() => handleStartChapter(chapter.caseId)}
                    loading={busy === 'create'}
                    disabled={busy !== null}
                  />
                </View>
              </View>
            ))}
          </View>

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

          {DEV_SOLO_PREVIEW && (
            <>
              <Divider />
              <BodyText style={styles.devLabel}>Dev: preview a journey solo (skips pairing)</BodyText>
              {CHARACTER_OPTIONS.map((c) => (
                <View key={c.id} style={styles.devCharacterBlock}>
                  <Text style={styles.devCharacterLabel}>{c.label}</Text>
                  <View style={styles.devRow}>
                    {CHAPTERS.map((chapter, i) => (
                      <View key={chapter.caseId} style={styles.devButton}>
                        <Button
                          title={`Chapter ${i + 1}`}
                          variant="secondary"
                          onPress={() => handlePreview(c.id, chapter.caseId)}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
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
  chapterList: { gap: spacing.md, marginBottom: spacing.lg },
  chapterRow: {
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
  },
  chapterNumber: {
    fontFamily: fonts.display,
    color: colors.brass,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  chapterTitle: {
    fontFamily: fonts.display,
    color: colors.paper,
    fontSize: 15,
    marginBottom: 4,
  },
  chapterDescription: { fontFamily: fonts.serif, color: colors.paperDim, fontSize: 12, lineHeight: 17, marginBottom: spacing.sm },
  chapterAction: { alignSelf: 'flex-start', minWidth: 120 },
  joinLabel: { textAlign: 'center', marginBottom: spacing.sm, fontSize: 13 },
  joinRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch', marginBottom: spacing.xl },
  joinInput: { flex: 1 },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md, fontSize: 13 },
  devLabel: { textAlign: 'center', marginBottom: spacing.sm, fontSize: 12, opacity: 0.7 },
  devCharacterBlock: { marginBottom: spacing.sm },
  devCharacterLabel: { fontFamily: fonts.display, color: colors.paperDim, fontSize: 11, marginBottom: 4 },
  devRow: { flexDirection: 'row', gap: spacing.sm },
  devButton: { flex: 1 },
});
