import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { cellarHotspots } from '../data/cellar';
import { ClueEntry, Hotspot } from '../types/study';
import { HotspotLayer } from '../components/HotspotLayer';
import { ClueModal } from '../components/ClueModal';
import { NumberLockModal } from '../components/puzzles/NumberLockModal';
import { SymbolLockModal } from '../components/puzzles/SymbolLockModal';
import { NotebookSheet } from '../components/NotebookSheet';
import { Toast } from '../components/Toast';
import { CaseFileLabel, BodyText, Button } from '../components/ui';
import { leaveRoom } from '../services/rooms';
import { supabase } from '../services/supabase';
import { fetchRoomProgress, subscribeToProgress } from '../services/progress';
import { colors, fonts, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Cellar'>;

const CELLAR_BG = require('../../assets/scenes/cellar.png');
// Not force-cropped to a round 2:1 like study.jpeg — the hotspot fractions
// here were drawn against cellar.png's own dimensions (1386x685), so the
// scene box is locked to that exact ratio instead, to keep hotspots
// pixel-aligned without needing to touch the source image.
const CELLAR_ASPECT_RATIO = 1386 / 685;

// The valve only becomes usable once both: (a) the Inspector has the valve
// handle (solved boxB), and (b) the Associate has pulled the library lever
// (a remote signal, not something visible in this room at all). Getting the
// Detective out is knowledge- and action-gated across both rooms at once.
const VALVE_HOTSPOT_ID = 'valve';
const REQUIRED_LOCAL_PUZZLE_ID = 'boxB';
const LEVER_SIGNAL_ID = 'lever';

const clueRegistry: Record<string, ClueEntry> = Object.fromEntries(
  cellarHotspots
    .filter((h): h is Extract<Hotspot, { kind: 'observation' }> => h.kind === 'observation')
    .map((h) => [h.clue.id, h.clue])
);

export function CellarScreen({ route, navigation }: Props) {
  const { roomId, characterId } = route.params;

  const [collectedClueIds, setCollectedClueIds] = useState<string[]>([]);
  const [solvedPuzzleIds, setSolvedPuzzleIds] = useState<string[]>([]);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [activeClue, setActiveClue] = useState<ClueEntry | null>(null);
  const [activeLockPuzzle, setActiveLockPuzzle] = useState<Extract<Hotspot, { kind: 'numberLock' }> | null>(null);
  const [activeSymbolPuzzle, setActiveSymbolPuzzle] = useState<Extract<Hotspot, { kind: 'symbolLock' }> | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [leverPulled, setLeverPulled] = useState(false);
  const [escaped, setEscaped] = useState(false);

  const collectedClues = collectedClueIds.map((id) => clueRegistry[id]).filter((c): c is ClueEntry => Boolean(c));
  const hasValveHandle = solvedPuzzleIds.includes(REQUIRED_LOCAL_PUZZLE_ID);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  // Only worth subscribing once the valve handle is actually in hand —
  // before that, whether the lever's been pulled doesn't change anything
  // the player can do yet.
  useEffect(() => {
    if (!hasValveHandle || !myUserId) return;
    const checkLever = async () => {
      const rows = await fetchRoomProgress(roomId);
      const pulled = rows.some((row) => row.user_id !== myUserId && row.solved_puzzle_ids.includes(LEVER_SIGNAL_ID));
      setLeverPulled(pulled);
    };
    checkLever();
    return subscribeToProgress(roomId, checkLever);
  }, [hasValveHandle, myUserId, roomId]);

  const handleObservation = (hotspot: Extract<Hotspot, { kind: 'observation' }>, alreadyFound: boolean) => {
    if (!alreadyFound) setCollectedClueIds((ids) => [...ids, hotspot.clue.id]);
    setActiveClue(hotspot.clue);
  };

  const handleComingSoon = (hotspot: Extract<Hotspot, { kind: 'comingSoon' }>) => {
    if (hotspot.id === VALVE_HOTSPOT_ID) {
      if (!hasValveHandle) {
        setToastMessage("The valve is jammed — you don't have anything to turn it with yet.");
      } else if (!leverPulled) {
        setToastMessage(
          'You fit the valve handle and brace against it, but nothing gives. Whatever holds this shut, it isn\'t on this side.'
        );
      } else {
        setEscaped(true);
      }
      return;
    }
    setToastMessage(hotspot.message);
  };

  const handleNumberLock = (hotspot: Extract<Hotspot, { kind: 'numberLock' }>) => {
    setActiveLockPuzzle(hotspot);
  };

  const handleNumberLockSolved = () => {
    if (!activeLockPuzzle) return;
    setSolvedPuzzleIds((ids) => (ids.includes(activeLockPuzzle.id) ? ids : [...ids, activeLockPuzzle.id]));
    setToastMessage(activeLockPuzzle.successMessage);
    setActiveLockPuzzle(null);
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
            <CaseFileLabel>The Sub-Cellar</CaseFileLabel>
          </View>
          <Pressable onPress={() => setNotebookOpen(true)} hitSlop={10} style={styles.notebookBtn}>
            <Text style={styles.topBtnText}>📓 {collectedClues.length}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={[styles.sceneBox, { aspectRatio: CELLAR_ASPECT_RATIO }]}>
            <Image source={CELLAR_BG} style={styles.sceneImage} contentFit="cover" />
            <HotspotLayer
              hotspots={cellarHotspots}
              collectedClueIds={collectedClueIds}
              onObservation={handleObservation}
              onComingSoon={handleComingSoon}
              onNumberLock={handleNumberLock}
              onSymbolLock={handleSymbolLock}
              onLocked={handleLocked}
            />
          </View>

          <View style={styles.descriptionBox}>
            <BodyText style={styles.description}>
              The gate slammed shut the moment you stepped through. Damp stone, dripping pipes, and no way back up.
            </BodyText>
          </View>
        </ScrollView>
      </SafeAreaView>

      {escaped && (
        <View style={styles.escapeOverlay}>
          <SafeAreaView style={styles.escapeSafe}>
            <View style={styles.escapeContent}>
              <CaseFileLabel style={styles.escapeLabel}>The Gate Gives Way</CaseFileLabel>
              <BodyText style={styles.escapeText}>
                The valve turns. Somewhere above, your partner threw the last lever, and the gate swings open. Inside
                Box B, alongside the valve handle, was a stamped train ticket to Blackwood Station — 11:45 PM — and
                Edmund's own hand confirming it: he left on his own terms, before the trouble took the rest of him.
              </BodyText>
              <Button title="Leave Room" variant="secondary" onPress={handleLeaveRoom} />
            </View>
          </SafeAreaView>
        </View>
      )}

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
      <NotebookSheet visible={notebookOpen} onClose={() => setNotebookOpen(false)} clues={collectedClues} />
      <ClueModal clue={activeClue} onDismiss={() => setActiveClue(null)} />
      <NumberLockModal
        puzzle={activeLockPuzzle}
        onClose={() => setActiveLockPuzzle(null)}
        onSolved={handleNumberLockSolved}
        onMistake={() => {}}
      />
      <SymbolLockModal
        puzzle={activeSymbolPuzzle}
        onClose={() => setActiveSymbolPuzzle(null)}
        onSolved={handleSymbolLockSolved}
        onMistake={() => {}}
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
  escapeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink },
  escapeSafe: { flex: 1 },
  escapeContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  escapeLabel: { marginBottom: spacing.md },
  escapeText: { textAlign: 'center', maxWidth: 480, marginBottom: spacing.xl },
});
