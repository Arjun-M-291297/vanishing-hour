import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { studyHotspots } from '../data/study';
import { MemorizeSequencePuzzle, NumberCipherPuzzle, ClueEntry, Hotspot } from '../types/study';
import { HotspotLayer } from '../components/HotspotLayer';
import { IntroPanelArt } from '../components/IntroPanelArt';
import { ClueModal } from '../components/ClueModal';
import { NumberLockModal } from '../components/puzzles/NumberLockModal';
import { NumberCipherModal } from '../components/puzzles/NumberCipherModal';
import { MemorizeModal } from '../components/puzzles/MemorizeModal';
import { SymbolLockModal } from '../components/puzzles/SymbolLockModal';
import { NotebookSheet } from '../components/NotebookSheet';
import { Toast } from '../components/Toast';
import { CaseFileLabel, BodyText, Button } from '../components/ui';
import { leaveRoom } from '../services/rooms';
import { supabase } from '../services/supabase';
import { fetchRoomProgress, markPuzzleSolvedRemote, subscribeToProgress } from '../services/progress';
import { CHARACTER_OPTIONS } from '../data/characters';
import { DEV_SOLO_PREVIEW } from '../devFlags';
import { colors, fonts, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const STUDY_BG = require('../../assets/scenes/study.jpeg');
// study.jpeg is cropped to exactly 2:1 (see src/data/study.ts) so it's a
// close match for real phone landscape screens (~1.78:1-2.22:1). The box
// always fills the full screen width at this exact ratio (height follows
// automatically) — never cropped, so hotspot fractions need no runtime
// compensation. On any screen shorter than the resulting height, the
// ScrollView below is what makes the rest of the image and the hotspots on
// it reachable, instead of clipping them.
const STUDY_ASPECT_RATIO = 2;

// The one hotspot whose solve reveals the shared stairwell — both players
// must reach it before either can proceed, so it's the only puzzle in this
// scene whose solved state is written to Supabase instead of staying local.
const STAIR_TRIGGER_HOTSPOT_ID = 'bookshelfPuzzle';

// Clues collectible directly from an observation hotspot, plus clues only
// reachable as a chained puzzle's reward (e.g. the cipher note found inside
// the desk drawer) — both show up in the notebook the same way.
const observationClues = studyHotspots
  .filter((h): h is Extract<Hotspot, { kind: 'observation' }> => h.kind === 'observation')
  .map((h) => h.clue);
const chainedRewardClues = studyHotspots
  .filter((h): h is Extract<Hotspot, { kind: 'numberLock' }> => h.kind === 'numberLock' && Boolean(h.next))
  .map((h) => h.next!.rewardClue);
const clueRegistry: Record<string, ClueEntry> = Object.fromEntries(
  [...observationClues, ...chainedRewardClues].map((clue) => [clue.id, clue])
);

// Both players land here after Begin Investigation, but each on their own
// independent instance of the Study — no shared/synced hotspot state
// between them, same as sitting side by side with two separate copies of
// the case file. Collected-clue state is purely local to this screen.
export function GameScreen({ route, navigation }: Props) {
  const { roomId, characterId } = route.params;
  const character = CHARACTER_OPTIONS.find((c) => c.id === characterId);

  const [collectedClueIds, setCollectedClueIds] = useState<string[]>([]);
  const [solvedPuzzleIds, setSolvedPuzzleIds] = useState<string[]>([]);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [activeClue, setActiveClue] = useState<ClueEntry | null>(null);
  const [activeLockPuzzle, setActiveLockPuzzle] = useState<Extract<Hotspot, { kind: 'numberLock' }> | null>(null);
  const [activeNumberCipherPuzzle, setActiveNumberCipherPuzzle] = useState<NumberCipherPuzzle | null>(null);
  const [activeMemorizePuzzle, setActiveMemorizePuzzle] = useState<MemorizeSequencePuzzle | null>(null);
  // The cipher's rewardClue while a chained memorize step plays out — held
  // here instead of granted immediately so the gated hotspot stays
  // non-interactive until the player has actually seen the sequence.
  const [pendingRewardClue, setPendingRewardClue] = useState<ClueEntry | null>(null);
  // Number-lock hotspot ids whose full chain (lock -> cipher -> memorize)
  // has been cleared at least once. Reopening one of these jumps straight
  // to the end of its chain instead of replaying the trivial lock and
  // already-decoded note — see handleNumberLock.
  const [clearedChainIds, setClearedChainIds] = useState<string[]>([]);
  const [pendingChainHotspotId, setPendingChainHotspotId] = useState<string | null>(null);
  const [activeSymbolPuzzle, setActiveSymbolPuzzle] = useState<Extract<Hotspot, { kind: 'symbolLock' }> | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  // True once the local player has solved STAIR_TRIGGER_HOTSPOT_ID — swaps
  // the whole scene for the stair reveal, which stays up until the partner
  // gets there too (see the player_progress subscription below).
  const [stairRevealed, setStairRevealed] = useState(false);
  const [partnerAtStair, setPartnerAtStair] = useState(false);

  const collectedClues = collectedClueIds.map((id) => clueRegistry[id]).filter((c): c is ClueEntry => Boolean(c));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  // Only subscribed once the local player has actually reached the stair
  // reveal — there's nothing to react to before then, and it avoids an
  // unnecessary realtime channel for the rest of the scene.
  useEffect(() => {
    if (!stairRevealed || !myUserId) return;
    const checkPartner = async () => {
      const rows = await fetchRoomProgress(roomId);
      const partnerThere = rows.some(
        (row) => row.user_id !== myUserId && row.solved_puzzle_ids.includes(STAIR_TRIGGER_HOTSPOT_ID)
      );
      setPartnerAtStair(partnerThere);
    };
    checkPartner();
    return subscribeToProgress(roomId, checkPartner);
  }, [stairRevealed, myUserId, roomId]);

  const handleObservation = (hotspot: Extract<Hotspot, { kind: 'observation' }>, alreadyFound: boolean) => {
    if (!alreadyFound) setCollectedClueIds((ids) => [...ids, hotspot.clue.id]);
    setActiveClue(hotspot.clue);
  };

  const handleComingSoon = (hotspot: Extract<Hotspot, { kind: 'comingSoon' }>) => {
    setToastMessage(hotspot.message);
  };

  // Unlike observation/symbolLock hotspots, a number lock stays reopenable
  // even after it's been solved once — entering a combination you already
  // know is trivial, and it's the only way back to a chained puzzle (e.g.
  // the memorize step) if the player needs a second look. Once the whole
  // chain behind it has been cleared once, reopening it skips straight to
  // the end of that chain (the memorize replay) instead of making the
  // player redo the number pad and the already-decoded note first.
  const handleNumberLock = (hotspot: Extract<Hotspot, { kind: 'numberLock' }>) => {
    const tail = hotspot.next?.next;
    if (clearedChainIds.includes(hotspot.id) && tail) {
      setActiveMemorizePuzzle(tail);
      return;
    }
    setPendingChainHotspotId(hotspot.id);
    setActiveLockPuzzle(hotspot);
  };

  const handleNumberLockSolved = () => {
    if (!activeLockPuzzle) return;
    setSolvedPuzzleIds((ids) => (ids.includes(activeLockPuzzle.id) ? ids : [...ids, activeLockPuzzle.id]));
    // A chained puzzle (e.g. a note found inside the drawer) opens straight
    // away instead of closing back out to the scene.
    if (activeLockPuzzle.next) {
      setActiveNumberCipherPuzzle(activeLockPuzzle.next);
    } else {
      setToastMessage(activeLockPuzzle.successMessage);
      markChainCleared();
    }
    setActiveLockPuzzle(null);
  };

  const markChainCleared = () => {
    if (!pendingChainHotspotId) return;
    const id = pendingChainHotspotId;
    setClearedChainIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setPendingChainHotspotId(null);
  };

  const handleCipherSolved = () => {
    if (!activeNumberCipherPuzzle) return;
    const puzzle = activeNumberCipherPuzzle;
    setActiveNumberCipherPuzzle(null);
    if (puzzle.next) {
      setPendingRewardClue(puzzle.rewardClue);
      setActiveMemorizePuzzle(puzzle.next);
    } else {
      // Guards against a duplicate notebook entry if the drawer (and this
      // cipher along with it) gets reopened after already being solved.
      setCollectedClueIds((ids) => (ids.includes(puzzle.rewardClue.id) ? ids : [...ids, puzzle.rewardClue.id]));
      setToastMessage(puzzle.successMessage);
      markChainCleared();
    }
  };

  const handleMemorizeDone = () => {
    if (!activeMemorizePuzzle) return;
    setToastMessage(activeMemorizePuzzle.followUpMessage);
    setActiveMemorizePuzzle(null);
    if (pendingRewardClue) {
      const clueId = pendingRewardClue.id;
      setCollectedClueIds((ids) => (ids.includes(clueId) ? ids : [...ids, clueId]));
      setPendingRewardClue(null);
    }
    markChainCleared();
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
    const hotspotId = activeSymbolPuzzle.id;
    setSolvedPuzzleIds((ids) => [...ids, hotspotId]);
    setActiveSymbolPuzzle(null);
    if (hotspotId === STAIR_TRIGGER_HOTSPOT_ID) {
      // The stair reveal itself is the feedback here — skip the usual toast
      // and hand off to the shared wait screen instead.
      setStairRevealed(true);
      markPuzzleSolvedRemote(roomId, hotspotId);
    } else {
      setToastMessage(activeSymbolPuzzle.successMessage);
    }
  };

  const handleLocked = (hotspot: Hotspot) => {
    setToastMessage(hotspot.lockedHint ?? 'Nothing happens. Not yet, anyway.');
  };

  const handleBack = () => {
    leaveRoom(roomId);
    navigation.goBack();
  };

  const handleContinueBeyond = () => {
    navigation.replace('Beyond', { roomId, characterId });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} hitSlop={10} style={styles.topBtn}>
            <Text style={styles.topBtnText}>‹ Leave</Text>
          </Pressable>
          <View style={styles.sceneLabelBox}>
            <CaseFileLabel>{character ? `The Study — ${character.label}` : 'The Study'}</CaseFileLabel>
          </View>
          <View style={styles.topRightGroup}>
            {DEV_SOLO_PREVIEW && (
              // Dummy shortcut for fast iteration on Cellar/Library while
              // they're being built — skips the whole puzzle chain instead
              // of re-solving it every reload. Gated behind the same dev
              // flag as the solo-preview lobby buttons; flip that off before
              // a real release and this disappears with it.
              <Pressable onPress={handleContinueBeyond} hitSlop={10} style={styles.topBtn}>
                <Text style={styles.topBtnText}>⏭ Skip</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setNotebookOpen(true)} hitSlop={10} style={styles.notebookBtn}>
              <Text style={styles.topBtnText}>📓 {collectedClues.length}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={[styles.sceneBox, { aspectRatio: STUDY_ASPECT_RATIO }]}>
            <Image source={STUDY_BG} style={styles.sceneImage} contentFit="cover" />
            <HotspotLayer
              hotspots={studyHotspots}
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
              Heavy curtains. A cold fireplace. The air still smells faintly of pipe smoke, as if he only just
              stepped out.
            </BodyText>
          </View>
        </ScrollView>
      </SafeAreaView>

      {stairRevealed && (
        // Same image-column + rule + text-column layout as IntroScreen, not
        // a full-bleed background — this is a narrative beat like the intro
        // slides, not a gameplay scene, so it should read as one.
        <View style={styles.stairOverlay}>
          <SafeAreaView style={styles.stairSafe}>
            <View style={styles.stairBody}>
              <View style={styles.stairImageCol}>
                <IntroPanelArt visual="stairSplit" />
              </View>

              <View style={styles.stairRule} />

              <View style={styles.stairTextCol}>
                <CaseFileLabel style={styles.stairLabel}>The Passage Opens</CaseFileLabel>
                {partnerAtStair ? (
                  <>
                    <BodyText style={styles.stairText}>Both of you have found the way through.</BodyText>
                    <Button title="Continue" onPress={handleContinueBeyond} />
                  </>
                ) : (
                  <>
                    <BodyText style={styles.stairText}>
                      The shelf slides aside, revealing a narrow staircase splitting into two.
                    </BodyText>
                    <View style={styles.waitingRow}>
                      <ActivityIndicator color={colors.brassBright} />
                      <BodyText style={styles.waitingText}>Waiting for your partner to find their way through…</BodyText>
                    </View>
                  </>
                )}
              </View>
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
      <NumberCipherModal
        puzzle={activeNumberCipherPuzzle}
        onClose={() => setActiveNumberCipherPuzzle(null)}
        onSolved={handleCipherSolved}
        onMistake={() => {}}
      />
      <MemorizeModal puzzle={activeMemorizePuzzle} onDone={handleMemorizeDone} />
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
  stairOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink },
  stairSafe: { flex: 1 },
  // Mirrors IntroScreen's `body`/`imageCol`/`rule`/`descCol` layout exactly,
  // so this reveal reads as the same kind of narrative beat as the intro
  // slides rather than a gameplay HUD screen.
  stairBody: { flex: 1, flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.lg },
  stairImageCol: { flex: 1 },
  stairRule: { width: 1, backgroundColor: colors.border },
  stairTextCol: { flex: 1, justifyContent: 'center' },
  stairLabel: { marginBottom: spacing.sm },
  stairText: { marginBottom: spacing.md },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waitingText: { color: colors.paperDim, fontSize: 13, flexShrink: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topRightGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  topBtn: { backgroundColor: 'rgba(11,15,20,0.7)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  notebookBtn: { backgroundColor: 'rgba(11,15,20,0.7)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  topBtnText: { color: colors.paper, fontFamily: fonts.display, fontSize: 12 },
  sceneLabelBox: { backgroundColor: 'rgba(11,15,20,0.7)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  // The ScrollView's outer scrollable element needs its own background —
  // without one, overscroll/bounce exposes the page's default white
  // background behind it, not just the (already-dark) content container.
  scrollView: { flex: 1, backgroundColor: colors.ink },
  scrollBody: { flexGrow: 1 },
  // Always fills the full width; height follows from the fixed 2:1 ratio.
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
});
