import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen, Heading, BodyText, CaseFileLabel, Button } from '../components/ui';
import {
  RoomPlayerRow,
  RoomRow,
  claimCharacter,
  fetchRoomPlayers,
  leaveRoom,
  setReady,
  subscribeToRoom,
} from '../services/rooms';
import { supabase } from '../services/supabase';
import { CHARACTER_OPTIONS } from '../data/characters';
import { useAppForeground } from '../utils/useAppForeground';
import { colors, fonts, radii, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;

export function RoomScreen({ route, navigation }: Props) {
  const { roomId } = route.params;
  // Landscape is the app's intended orientation, but web/mobile-browser
  // testing can't guarantee it — this screen's 2-column layout (fixed
  // sidebar + side-by-side character cards) needs to fall back to a
  // single-column stack on a narrow portrait viewport, or it squeezes
  // everything into unreadably narrow columns and pushes Ready Up far below
  // the fold.
  const { width } = useWindowDimensions();
  const isNarrow = width < 700;
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<RoomPlayerRow[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [{ data: roomData }, playerRows] = await Promise.all([
      supabase.from('rooms').select().eq('id', roomId).single(),
      fetchRoomPlayers(roomId),
    ]);
    if (roomData) setRoom(roomData as RoomRow);
    setPlayers(playerRows);
  }, [roomId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
    refresh();
    const unsubscribe = subscribeToRoom(roomId, refresh);
    return unsubscribe;
  }, [roomId, refresh]);

  // Realtime doesn't replay what happened while backgrounded — e.g. the
  // partner readying up while this player's app was backgrounded. Re-check
  // on every foreground return rather than trusting the subscription alone.
  useAppForeground(refresh);

  const me = players.find((p) => p.user_id === myUserId);
  const partner = players.find((p) => p.user_id !== myUserId);
  const bothReady = players.length === 2 && players.every((p) => p.is_ready && p.character_id);

  // Any client can flip the room live once both seats are ready — RLS lets
  // every member update it, and the write is idempotent, so a double-fire
  // from both clients noticing at once is harmless.
  useEffect(() => {
    if (bothReady && room?.status === 'lobby') {
      supabase.from('rooms').update({ status: 'active' }).eq('id', roomId).then(() => {});
    }
    if (room?.status === 'active') {
      navigation.replace('Intro', { roomId, characterId: me?.character_id ?? undefined });
    }
  }, [bothReady, room?.status, roomId, navigation, me?.character_id]);

  const handleClaim = async (characterId: string) => {
    setBusy(true);
    await claimCharacter(roomId, characterId);
    setBusy(false);
  };

  const handleReady = async () => {
    if (!me) return;
    setBusy(true);
    await setReady(roomId, !me.is_ready);
    setBusy(false);
  };

  const handleLeave = async () => {
    await leaveRoom(roomId);
    navigation.goBack();
  };

  return (
    <Screen>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CaseFileLabel>Room Code</CaseFileLabel>
          <Heading style={styles.code}>{room?.code ?? '——————'}</Heading>
          <BodyText style={styles.shareHint}>Share this code with your partner to pair up.</BodyText>
        </View>

        <View style={[styles.body, isNarrow && styles.bodyNarrow]}>
          <View style={[styles.playersCol, isNarrow && styles.playersColNarrow]}>
            <CaseFileLabel>Detectives</CaseFileLabel>
            <PlayerRow label="You" player={me} />
            <PlayerRow label="Partner" player={partner} waitingLabel="Waiting for partner…" />
          </View>

          <View style={isNarrow ? styles.ruleNarrow : styles.rule} />

          <View style={styles.selectCol}>
            <CaseFileLabel>Choose Your Role</CaseFileLabel>
            <View style={[styles.characterGrid, isNarrow && styles.characterGridNarrow]}>
              {CHARACTER_OPTIONS.map((c) => {
                const takenBy = players.find((p) => p.character_id === c.id);
                const takenByMe = takenBy?.user_id === myUserId;
                const takenByOther = Boolean(takenBy) && !takenByMe;
                return (
                  <Pressable
                    key={c.id}
                    disabled={takenByOther || busy}
                    onPress={() => handleClaim(c.id)}
                    style={[
                      styles.characterCard,
                      takenByMe && styles.characterCardSelected,
                      takenByOther && styles.characterCardDisabled,
                    ]}
                  >
                    <Text style={styles.characterLabel}>{c.label}</Text>
                    <Text style={styles.characterTagline}>{c.tagline}</Text>
                    {takenByOther && <Text style={styles.characterTaken}>Taken by partner</Text>}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actions}>
              <Button
                title={me?.is_ready ? 'Ready ✓ (tap to unready)' : 'Ready Up'}
                onPress={handleReady}
                disabled={!me?.character_id || busy}
              />
              <Button title="Leave Room" variant="ghost" onPress={handleLeave} disabled={busy} />
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function PlayerRow({
  label,
  player,
  waitingLabel,
}: {
  label: string;
  player?: RoomPlayerRow;
  waitingLabel?: string;
}) {
  if (!player) {
    return (
      <View style={styles.playerRow}>
        <Text style={styles.playerLabel}>{label}</Text>
        <Text style={styles.playerWaiting}>{waitingLabel ?? '—'}</Text>
      </View>
    );
  }
  const character = CHARACTER_OPTIONS.find((c) => c.id === player.character_id);
  return (
    <View style={styles.playerRow}>
      <Text style={styles.playerLabel}>{label}</Text>
      <Text style={styles.playerStatus}>
        {character ? character.label : 'Choosing…'} {player.is_ready ? '· Ready' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: colors.ink },
  container: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  header: { alignItems: 'center', marginBottom: spacing.md },
  code: { fontSize: 30, letterSpacing: 6, marginTop: 2 },
  shareHint: { fontSize: 12, marginTop: 2 },
  body: { flex: 1, flexDirection: 'row', gap: spacing.lg },
  bodyNarrow: { flexDirection: 'column' },
  playersCol: { width: 220, gap: spacing.sm },
  playersColNarrow: { width: '100%' },
  rule: { width: 1, backgroundColor: colors.border },
  ruleNarrow: { height: 1, width: '100%', backgroundColor: colors.border, marginVertical: spacing.md },
  selectCol: { flex: 1 },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerLabel: { fontFamily: fonts.display, color: colors.paper, fontSize: 13 },
  playerStatus: { color: colors.brassBright, fontSize: 12 },
  playerWaiting: { color: colors.paperDim, fontSize: 12, fontStyle: 'italic', opacity: 0.7 },
  characterGrid: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  characterGridNarrow: { flexDirection: 'column' },
  characterCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.inkElevated,
  },
  characterCardSelected: { borderColor: colors.brassBright, backgroundColor: 'rgba(201,154,82,0.12)' },
  characterCardDisabled: { opacity: 0.4 },
  characterLabel: { fontFamily: fonts.display, color: colors.paper, fontSize: 15, marginBottom: 4 },
  characterTagline: { color: colors.paperDim, fontSize: 12, lineHeight: 17 },
  characterTaken: { color: colors.rustBright, fontSize: 11, marginTop: spacing.xs },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
