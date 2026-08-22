import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { stationHotspots } from '../data/station';
import { ClueEntry, Hotspot, SharedBoardHotspot } from '../types/study';
import { HotspotLayer } from '../components/HotspotLayer';
import { ClueModal } from '../components/ClueModal';
import { SymbolLockModal } from '../components/puzzles/SymbolLockModal';
import { SyncSignalModal } from '../components/puzzles/SyncSignalModal';
import { SharedBoardModal } from '../components/puzzles/SharedBoardModal';
import { NotebookSheet } from '../components/NotebookSheet';
import { Toast } from '../components/Toast';
import { CaseFileLabel, BodyText, Button } from '../components/ui';
import { leaveRoom } from '../services/rooms';
import { supabase } from '../services/supabase';
import { fetchRoomProgress, markPuzzleSolvedRemote, subscribeToProgress } from '../services/progress';
import { prefetchImages } from '../utils/prefetchImages';
import { useAppForeground } from '../utils/useAppForeground';
import { colors, fonts, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Station'>;

const STATION_BG = require('../../assets/scenes/station_platform.jpg');
// Hotspot fractions were drawn against station_platform.jpg's own
// dimensions (1456x720) via the hotspot annotator tool.
const STATION_ASPECT_RATIO = 1456 / 720;
const STATION_PREFETCH_ASSETS = [STATION_BG];

const clueRegistry: Record<string, ClueEntry> = Object.fromEntries(
  stationHotspots
    .filter((h): h is Extract<Hotspot, { kind: 'observation' }> => h.kind === 'observation')
    .map((h) => [h.clue.id, h.clue])
);

// Chapter 2's closing beat — not tied to a tap hotspot, opens automatically
// once both players have cleared their own half of the station (here:
// Signal Lamp + Track Switch; the Associate's own two puzzles once that
// scene exists). x/y/w/h are unused by SharedBoardModal but required by
// the shared Hotspot type shape.
const FINALE_PUZZLE: SharedBoardHotspot = {
  id: 'stationFinale',
  kind: 'sharedBoard',
  label: 'What Happened to Edmund',
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  puzzleTitle: 'What Happened to Edmund',
  flavorText: 'Between the two of you, the pieces are all here. Talk it through — what really sent him running?',
  options: [
    { id: 'debt', label: 'He ran to escape a debt he could never repay.' },
    { id: 'illness', label: "He ran because his mind was slipping, and he couldn't bear to be caught mid-collapse." },
    { id: 'memory', label: 'He was never running from anything — he was chasing the one clear memory he had left.' },
  ],
  solutionOptionId: 'illness',
  successMessage: 'It clicks into place, the same way for both of you at once. Whatever else was true, it was never just about the money.',
};

// Chapter 3, Inspector's half only for now — the Associate has no matching
// scene yet (see navigation/types.ts), so this screen doesn't wait on or
// sync with anything the Associate does. Its two new co-op puzzle kinds
// (syncSignal, symbolLock reused for the lever-order beat) both need a
// partner to actually be worth solving together, but that pairing only
// starts mattering once the Associate's side exists.
export function StationScreen({ route, navigation }: Props) {
  const { roomId, characterId } = route.params;

  const [collectedClueIds, setCollectedClueIds] = useState<string[]>([]);
  const [solvedPuzzleIds, setSolvedPuzzleIds] = useState<string[]>([]);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [activeClue, setActiveClue] = useState<ClueEntry | null>(null);
  const [activeSymbolPuzzle, setActiveSymbolPuzzle] = useState<Extract<Hotspot, { kind: 'symbolLock' }> | null>(null);
  const [activeSyncSignalPuzzle, setActiveSyncSignalPuzzle] = useState<Extract<
    Hotspot,
    { kind: 'syncSignal' }
  > | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [partnerReady, setPartnerReady] = useState(false);
  const [finaleSolved, setFinaleSolved] = useState(false);

  useEffect(() => {
    prefetchImages(STATION_PREFETCH_ASSETS);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  const collectedClues = collectedClueIds.map((id) => clueRegistry[id]).filter((c): c is ClueEntry => Boolean(c));
  // Both of the Inspector's own puzzles here, cleared — the Associate's
  // side (once it exists) marks its own equivalent readiness the same way.
  const selfReady = solvedPuzzleIds.includes('signalLamp') && solvedPuzzleIds.includes('switchLevers');

  // Fires once, the instant both local puzzles are actually solved — not
  // gated on myUserId being loaded yet, since markPuzzleSolvedRemote reads
  // auth.uid() server-side itself.
  useEffect(() => {
    if (selfReady) markPuzzleSolvedRemote(roomId, 'stationInspectorReady');
  }, [selfReady, roomId]);

  const checkPartnerReady = useCallback(async () => {
    if (!myUserId) return;
    const rows = await fetchRoomProgress(roomId);
    const ready = rows.some(
      (row) => row.user_id !== myUserId && row.solved_puzzle_ids.includes('stationAssociateReady')
    );
    setPartnerReady(ready);
  }, [myUserId, roomId]);

  // Only worth subscribing once this player's own half is actually done —
  // before that, whether the Associate is ready doesn't change anything
  // the player can do yet.
  useEffect(() => {
    if (!selfReady || !myUserId) return;
    checkPartnerReady();
    return subscribeToProgress(roomId, checkPartnerReady);
  }, [selfReady, myUserId, roomId, checkPartnerReady]);

  useAppForeground(() => {
    if (selfReady) checkPartnerReady();
  });

  const handleObservation = (hotspot: Extract<Hotspot, { kind: 'observation' }>, alreadyFound: boolean) => {
    if (!alreadyFound) setCollectedClueIds((ids) => [...ids, hotspot.clue.id]);
    setActiveClue(hotspot.clue);
  };

  const handleSymbolLock = (hotspot: Extract<Hotspot, { kind: 'symbolLock' }>) => {
    if (solvedPuzzleIds.includes(hotspot.id)) {
      setToastMessage(hotspot.successMessage);
      return;
    }
    setActiveSymbolPuzzle(hotspot);
  };

  const handleSymbolLockSolved = () => {
    if (!activeSymbolPuzzle) return;
    setSolvedPuzzleIds((ids) => [...ids, activeSymbolPuzzle.id]);
    setToastMessage(activeSymbolPuzzle.successMessage);
    setActiveSymbolPuzzle(null);
  };

  const handleSyncSignal = (hotspot: Extract<Hotspot, { kind: 'syncSignal' }>) => {
    if (solvedPuzzleIds.includes(hotspot.id)) {
      setToastMessage(hotspot.successMessage);
      return;
    }
    setActiveSyncSignalPuzzle(hotspot);
  };

  const handleSyncSignalSolved = () => {
    if (!activeSyncSignalPuzzle) return;
    setSolvedPuzzleIds((ids) => [...ids, activeSyncSignalPuzzle.id]);
    setToastMessage(activeSyncSignalPuzzle.successMessage);
    setActiveSyncSignalPuzzle(null);
  };

  const handleFinaleSolved = () => {
    setFinaleSolved(true);
    setToastMessage(FINALE_PUZZLE.successMessage);
  };

  const handleLocked = (hotspot: Hotspot) => {
    setToastMessage(hotspot.lockedHint ?? 'Nothing happens. Not yet, anyway.');
  };

  const handleBack = () => {
    leaveRoom(roomId);
    navigation.goBack();
  };

  const handleLeaveRoom = async () => {
    await leaveRoom(roomId);
    navigation.popToTop();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} hitSlop={10} style={styles.topBtn}>
            <Text style={styles.topBtnText}>‹ Leave</Text>
          </Pressable>
          <View style={styles.sceneLabelBox}>
            <CaseFileLabel>Blackwood Station — Platform</CaseFileLabel>
          </View>
          <Pressable onPress={() => setNotebookOpen(true)} hitSlop={10} style={styles.notebookBtn}>
            <Text style={styles.topBtnText}>📓 {collectedClues.length}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={[styles.sceneBox, { aspectRatio: STATION_ASPECT_RATIO }]}>
            <Image source={STATION_BG} style={styles.sceneImage} contentFit="cover" />
            <HotspotLayer
              hotspots={stationHotspots}
              collectedClueIds={collectedClueIds}
              onObservation={handleObservation}
              onComingSoon={() => {}}
              onNumberLock={() => {}}
              onSymbolLock={handleSymbolLock}
              onSyncSignal={handleSyncSignal}
              onLocked={handleLocked}
            />
          </View>

          <View style={styles.descriptionBox}>
            <BodyText style={styles.description}>
              {finaleSolved
                ? 'The fog hasn\'t lifted, but the two of you finally agree on what happened here.'
                : selfReady && !partnerReady
                ? 'Both puzzles here are solved. Waiting for your partner to finish their own half…'
                : 'Fog rolls low across the tracks. Somewhere on the other side of the station, your partner is making their own way in.'}
            </BodyText>
          </View>
        </ScrollView>
      </SafeAreaView>

      {finaleSolved && (
        <View style={styles.endingOverlay}>
          <SafeAreaView style={styles.endingSafe}>
            <View style={styles.endingContent}>
              <CaseFileLabel style={styles.endingLabel}>What Happened to Edmund</CaseFileLabel>
              <BodyText style={styles.endingText}>{FINALE_PUZZLE.successMessage}</BodyText>
              <Button title="Leave Room" variant="secondary" onPress={handleLeaveRoom} />
            </View>
          </SafeAreaView>
        </View>
      )}

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
      <NotebookSheet visible={notebookOpen} onClose={() => setNotebookOpen(false)} clues={collectedClues} />
      <ClueModal clue={activeClue} onDismiss={() => setActiveClue(null)} />
      <SymbolLockModal
        puzzle={activeSymbolPuzzle}
        onClose={() => setActiveSymbolPuzzle(null)}
        onSolved={handleSymbolLockSolved}
        onMistake={() => {}}
      />
      <SyncSignalModal
        puzzle={activeSyncSignalPuzzle}
        roomId={roomId}
        characterId={(characterId as 'inspector' | 'associate') ?? null}
        onClose={() => setActiveSyncSignalPuzzle(null)}
        onSolved={handleSyncSignalSolved}
      />
      {/* No dismiss action: once both players are ready this is the only
          thing left to do in the scene, so there's nowhere useful for a ✕
          to send the player back to. */}
      <SharedBoardModal
        puzzle={selfReady && partnerReady && !finaleSolved ? FINALE_PUZZLE : null}
        roomId={roomId}
        characterId={(characterId as 'inspector' | 'associate') ?? null}
        onClose={() => {}}
        onSolved={handleFinaleSolved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  overlay: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topBtn: { backgroundColor: 'rgba(11,15,20,0.7)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  notebookBtn: { backgroundColor: 'rgba(11,15,20,0.7)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  topBtnText: { color: colors.paper, fontFamily: fonts.display, fontSize: 12 },
  sceneLabelBox: { backgroundColor: 'rgba(11,15,20,0.7)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  scrollView: { flex: 1, backgroundColor: colors.ink },
  scrollBody: { flexGrow: 1 },
  sceneBox: { width: '100%', overflow: 'hidden' },
  sceneImage: { width: '100%', height: '100%' },
  descriptionBox: {
    margin: spacing.md,
    backgroundColor: 'rgba(11,15,20,0.78)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  description: { fontSize: 13, color: colors.paperDim },
  endingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink },
  endingSafe: { flex: 1 },
  endingContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  endingLabel: { marginBottom: spacing.md },
  endingText: { textAlign: 'center', maxWidth: 480, marginBottom: spacing.xl },
});
