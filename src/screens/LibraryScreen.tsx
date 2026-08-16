import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { libraryHotspots } from '../data/library';
import { ClueEntry, Hotspot } from '../types/study';
import { HotspotLayer } from '../components/HotspotLayer';
import { DraggableProp } from '../components/DraggableProp';
import { ClueModal } from '../components/ClueModal';
import { HintModal } from '../components/HintModal';
import { SymbolLockModal } from '../components/puzzles/SymbolLockModal';
import { NotebookSheet } from '../components/NotebookSheet';
import { Toast } from '../components/Toast';
import { CaseFileLabel, BodyText, Button } from '../components/ui';
import { leaveRoom } from '../services/rooms';
import { markPuzzleSolvedRemote } from '../services/progress';
import { colors, fonts, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Library'>;

const LIBRARY_BG = require('../../assets/scenes/library.jpg');
// Hotspot fractions were drawn against library.jpg's own dimensions
// (1456x720), so the scene box is locked to that exact ratio. The torn
// page's own art is a standalone cropped/cleaned-up sprite (not cut from
// this file directly), positioned at PHOTO_START_BOX's fractions to sit
// where the background used to show it before being healed.
const LIBRARY_ASPECT_RATIO = 1456 / 720;
const TORN_PAGE_IMAGE = require('../../assets/scenes/torn_image_lower.png');

// hotspot-11's own position (drag start) and hotspot-16, the dumbwaiter
// basket (drag target) — kept out of libraryHotspots since this isn't a
// tap target, it's what DraggableProp uses to place/aim the drag.
const PHOTO_START_BOX = { x: 0.1181, y: 0.8788, w: 0.0895, h: 0.0732 };
const PHOTO_TARGET_BOX = { x: 0.3668, y: 0.7535, w: 0.0809, h: 0.0668 };

const clueRegistry: Record<string, ClueEntry> = Object.fromEntries(
  libraryHotspots
    .filter((h): h is Extract<Hotspot, { kind: 'observation' }> => h.kind === 'observation')
    .map((h) => [h.clue.id, h.clue])
);

interface HintStage {
  key: string;
  title: string;
  hints: string[];
}

// Checked top to bottom, first match wins — see the matching function in
// CellarScreen.tsx for why this makes the hint button contextual rather
// than a fixed walkthrough.
function getLibraryHintStage(state: {
  symbolsSolved: boolean;
  imagePlaced: boolean;
  leverPulled: boolean;
  timestampBookRead: boolean;
}): HintStage | null {
  if (state.symbolsSolved) return null;

  if (!state.imagePlaced) {
    return {
      key: 'photo',
      title: 'The Torn Page',
      hints: [
        "There's a torn page sitting right where you started, waiting to be moved.",
        "It doesn't belong where it's sitting — there's a basket nearby built for exactly this.",
        'Drag the page into the dumbwaiter basket.',
        'Drop it squarely in the basket to load it.',
      ],
    };
  }

  if (!state.leverPulled) {
    return {
      key: 'lever',
      title: 'The Dumbwaiter Lever',
      hints: [
        "The basket won't send itself down.",
        'Look for the lever that operates the dumbwaiter shaft.',
        'Pull it once the page is loaded — not before.',
        'Tap the lever to send the basket down to the Inspector.',
      ],
    };
  }

  if (!state.timestampBookRead) {
    return {
      key: 'timestamps',
      title: 'The Timestamp Book',
      hints: [
        "There's a book nearby with more in it than it looks.",
        "It's got a handwritten row of times — not just one.",
        'Read the minutes (not the hours) off each of the three times, in order.',
        "Pass those three numbers to the Inspector — they're the combination to something down in the cellar.",
      ],
    };
  }

  return {
    key: 'symbols',
    title: 'The Fallen Book',
    hints: [
      "The fallen book on the shelf isn't just fallen — it's a lock.",
      'It wants four symbols, in a specific order.',
      "Ask the Inspector what's marked on the cellar wall, now that their lantern's lit.",
      'The order is hearts, clubs, spades, diamonds.',
    ],
  };
}

export function LibraryScreen({ route, navigation }: Props) {
  const { roomId } = route.params;

  const [collectedClueIds, setCollectedClueIds] = useState<string[]>([]);
  const [solvedPuzzleIds, setSolvedPuzzleIds] = useState<string[]>([]);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [activeClue, setActiveClue] = useState<ClueEntry | null>(null);
  const [activeSymbolPuzzle, setActiveSymbolPuzzle] = useState<Extract<Hotspot, { kind: 'symbolLock' }> | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dragScrollLocked, setDragScrollLocked] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const dropTargetRef = useRef<View>(null);

  const collectedClues = collectedClueIds.map((id) => clueRegistry[id]).filter((c): c is ClueEntry => Boolean(c));
  // hotspot-15 (the fallen book) is the Associate's own closing beat —
  // unlike the Inspector's grill door, there's no separate "step through"
  // action, solving it IS the ending, so this is derived rather than its
  // own piece of state.
  const symbolsSolved = solvedPuzzleIds.includes('hotspot-15');
  const hintStage = getLibraryHintStage({
    symbolsSolved,
    imagePlaced: collectedClueIds.includes('imagePlaced'),
    leverPulled: solvedPuzzleIds.includes('hotspot-9'),
    timestampBookRead: collectedClueIds.includes('timestampBook'),
  });

  const handleObservation = (hotspot: Extract<Hotspot, { kind: 'observation' }>, alreadyFound: boolean) => {
    if (!alreadyFound) setCollectedClueIds((ids) => [...ids, hotspot.clue.id]);
    setActiveClue(hotspot.clue);
  };

  const handleComingSoon = (hotspot: Extract<Hotspot, { kind: 'comingSoon' }>) => {
    if (hotspot.id === 'hotspot-9') {
      if (solvedPuzzleIds.includes('hotspot-9')) {
        setToastMessage('Already sent — nothing left to send.');
        return;
      }
      setSolvedPuzzleIds((ids) => [...ids, 'hotspot-9']);
      markPuzzleSolvedRemote(roomId, 'imageSent');
      setToastMessage('You pull the lever. The basket rattles away down the shaft.');
      return;
    }
    setToastMessage(hotspot.message);
  };

  // hotspot-11's art is visible (as a draggable prop, not a tap target —
  // see DraggableProp below) from the moment the screen loads, not gated
  // behind reading a clue first: the healed background leaves nothing else
  // to show the player where to look. Dropping it grants its notebook clue
  // as a side effect, since a separate tap step isn't reachable once the
  // drag overlay covers that spot, and sets 'imagePlaced', which is what
  // actually unlocks hotspot-9 (the lever).
  const handlePhotoDropped = () => {
    setCollectedClueIds((ids) => {
      const withClue = ids.includes('libraryPhoto') ? ids : [...ids, 'libraryPhoto'];
      return withClue.includes('imagePlaced') ? withClue : [...withClue, 'imagePlaced'];
    });
    setToastMessage('You set the page in the basket.');
  };

  // hotspot-15 (the fallen book) — always tappable; the "gate" is that only
  // the Inspector knows the correct symbol order (from their own
  // hotspot-13), not anything this app enforces.
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
    markPuzzleSolvedRemote(roomId, 'grillUnlocked');
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
            <CaseFileLabel>The Upper Library</CaseFileLabel>
          </View>
          <View style={styles.topBarRight}>
            {hintStage && (
              <Pressable onPress={() => setHintOpen(true)} hitSlop={10} style={styles.notebookBtn}>
                <Text style={styles.topBtnText}>💡</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setNotebookOpen(true)} hitSlop={10} style={styles.notebookBtn}>
              <Text style={styles.topBtnText}>📓 {collectedClues.length}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!dragScrollLocked}
        >
          <View style={[styles.sceneBox, { aspectRatio: LIBRARY_ASPECT_RATIO }]}>
            <Image source={LIBRARY_BG} style={styles.sceneImage} contentFit="cover" />
            <HotspotLayer
              hotspots={libraryHotspots}
              collectedClueIds={collectedClueIds}
              onObservation={handleObservation}
              onComingSoon={handleComingSoon}
              onNumberLock={() => {}}
              onSymbolLock={handleSymbolLock}
              onLocked={handleLocked}
            />
            {/* Purely a measurement anchor for DraggableProp's drop
                hit-test (see dropTargetRef) — percentage-positioned same as
                a hotspot, invisible, never touchable. */}
            <View
              ref={dropTargetRef}
              pointerEvents="none"
              style={[
                styles.dropTarget,
                {
                  left: `${PHOTO_TARGET_BOX.x * 100}%`,
                  top: `${PHOTO_TARGET_BOX.y * 100}%`,
                  width: `${PHOTO_TARGET_BOX.w * 100}%`,
                  height: `${PHOTO_TARGET_BOX.h * 100}%`,
                },
              ]}
            />
            {collectedClueIds.includes('imagePlaced') && !solvedPuzzleIds.includes('hotspot-9') && (
              // Sits in the basket from the moment it's dropped until the
              // lever sends it down the shaft — pulling the lever (below)
              // is what makes this stop rendering, matching "the basket
              // rattles away" in that toast instead of leaving a page
              // visibly sitting in an already-sent basket forever.
              <Image
                source={TORN_PAGE_IMAGE}
                style={[
                  styles.placedPhoto,
                  {
                    left: `${PHOTO_TARGET_BOX.x * 100}%`,
                    top: `${PHOTO_TARGET_BOX.y * 100}%`,
                    width: `${PHOTO_TARGET_BOX.w * 100}%`,
                    height: `${PHOTO_TARGET_BOX.h * 100}%`,
                  },
                ]}
                contentFit="cover"
                transition={200}
              />
            )}
            {!collectedClueIds.includes('imagePlaced') && (
              <DraggableProp
                startBox={PHOTO_START_BOX}
                targetRef={dropTargetRef}
                imageSource={TORN_PAGE_IMAGE}
                onDropped={handlePhotoDropped}
                onDragStart={() => setDragScrollLocked(true)}
                onDragEnd={() => setDragScrollLocked(false)}
              />
            )}
          </View>

          <View style={styles.descriptionBox}>
            <BodyText style={styles.description}>
              Quiet up here — just the smell of old paper and lamp oil. Whatever happened tonight, it started
              somewhere in this room too.
            </BodyText>
          </View>
        </ScrollView>
      </SafeAreaView>

      {symbolsSolved && (
        <View style={styles.endingOverlay}>
          <SafeAreaView style={styles.endingSafe}>
            <View style={styles.endingContent}>
              <CaseFileLabel style={styles.endingLabel}>The Lock Gives Way</CaseFileLabel>
              <BodyText style={styles.endingText}>
                The last symbol clicks into place, and the fallen book's cover falls still. Somewhere below, you
                don't so much hear it as feel it — a distant mechanism releasing, iron swinging free on the
                tunnel side. Whatever the Inspector finds down those tracks now is out of your hands. All that's
                left is to see if Edmund Voss ever meant to come back at all.
              </BodyText>
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
      {hintStage && (
        <HintModal
          visible={hintOpen}
          stageKey={hintStage.key}
          title={hintStage.title}
          hints={hintStage.hints}
          onDismiss={() => setHintOpen(false)}
        />
      )}
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
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topBtnText: { color: colors.paper, fontFamily: fonts.display, fontSize: 12 },
  sceneLabelBox: { backgroundColor: 'rgba(11,15,20,0.7)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  scrollView: { flex: 1, backgroundColor: colors.ink },
  scrollBody: { flexGrow: 1 },
  sceneBox: { width: '100%', overflow: 'hidden' },
  sceneImage: { width: '100%', height: '100%' },
  dropTarget: { position: 'absolute' },
  // No shadow here deliberately: this is an unclipped box around a
  // transparent, irregularly-shaped (torn-page) cutout — a CSS box-shadow
  // always follows the rectangular box, not the image's actual alpha
  // silhouette, so it would show as a blurry halo in the transparent
  // corners around the real shape instead of hugging it.
  placedPhoto: {
    position: 'absolute',
    borderRadius: 4,
  },
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
