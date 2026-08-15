import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { cellarHotspots } from '../data/cellar';
import { ClueEntry, Hotspot } from '../types/study';
import { HotspotLayer } from '../components/HotspotLayer';
import { DraggableProp } from '../components/DraggableProp';
import { ClueModal } from '../components/ClueModal';
import { RedFilmModal } from '../components/RedFilmModal';
import { NumberLockModal } from '../components/puzzles/NumberLockModal';
import { NotebookSheet } from '../components/NotebookSheet';
import { Toast } from '../components/Toast';
import { CaseFileLabel, BodyText, Button } from '../components/ui';
import { leaveRoom } from '../services/rooms';
import { supabase } from '../services/supabase';
import { fetchRoomProgress, subscribeToProgress } from '../services/progress';
import { colors, fonts, spacing } from '../theme';
import { DEV_SOLO_PREVIEW } from '../devFlags';

type Props = NativeStackScreenProps<RootStackParamList, 'Cellar'>;

const CELLAR_BG = require('../../assets/scenes/cellar.jpg');
// Swapped in once the drawer traps the player and the power cuts — the
// oil lantern is dark, but the fluorescent cell-box (the actual hotspot-4/
// 5/6 puzzle object, down by the ledger) is already glowing, matching the
// "an emergency lamp flickers on" toast.
const CELLAR_FLOURO_ON_BG = require('../../assets/scenes/cellar_flouro_on.jpg');
// Swapped in once all three cells are solved — the oil lantern is lit,
// and its light now reveals the card-symbol mark on the wall (hotspot-13)
// beside the grill door.
const CELLAR_LANTERN_ON_BG = require('../../assets/scenes/cellar_lanern_on.jpg');
// All three variants share cellar.jpg's own dimensions (1456x720), so
// every hotspot fraction lands the same regardless of which is showing.
const CELLAR_ASPECT_RATIO = 1456 / 720;
// Same art as the Library's draggable piece — it's literally the same
// physical page, just viewed from this side of the dumbwaiter.
const RECEIVED_IMAGE = require('../../assets/props/lower-torn-image.png');
// hotspot-17 — not a tap target, just where the received image starts once
// hotspot-8 (the chute lever) has been pulled; from there it's draggable.
const RECEIVED_IMAGE_BOX = { x: 0.0805, y: 0.3374, w: 0.0687, h: 0.1909 };

// hotspot-18 — where the reassembled photo settles once dragged there from
// hotspot-17. A skewed quad rather than an axis-aligned box, since in the
// art it's lying flat on an angled surface, not floating flush with the
// screen.
const COMBINED_IMAGE_QUAD: [number, number][] = [
  [0.3541, 0.653],
  [0.4423, 0.6216],
  [0.3852, 0.5614],
  [0.2971, 0.5797],
];

function quadBoundingBox(points: [number, number][]) {
  const xs = points.map(([px]) => px);
  const ys = points.map(([, py]) => py);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// clip-path percentages are relative to the clipped element's own box, so
// each quad corner is re-expressed as a fraction of the quad's own
// bounding box (what the Image is actually sized to) rather than of the
// whole scene image — this is what makes the placed photo conform to the
// quad's skewed outline instead of sitting inside it as a plain rectangle.
function quadClipPath(points: [number, number][], box: { x: number; y: number; w: number; h: number }) {
  return `polygon(${points
    .map(([px, py]) => `${(((px - box.x) / box.w) * 100).toFixed(2)}% ${(((py - box.y) / box.h) * 100).toFixed(2)}%`)
    .join(', ')})`;
}

// hotspot-3's own position (the red film prop) — reused here as a drag
// start box once the combined photo exists to hold it against; cellar.ts
// still owns hotspot-3 as a tap target for its "not ready yet" flavor text
// before that point.
const RED_FILM_START_BOX = { x: 0.2184, y: 0.3821, w: 0.0782, h: 0.0588 };
const OVERRIDE_CODE = '3 9 0 7';

const COMBINED_IMAGE_BOX = quadBoundingBox(COMBINED_IMAGE_QUAD);
// Web-only CSS (react-native-web passes unknown style keys straight
// through), so it's kept out of the typed StyleSheet.create block below —
// same pattern as DraggableProp's webNoDragStyle. No native equivalent
// without an SVG mask, so on iOS/Android the placed photo just renders as
// a plain rectangle inside the quad's bounding box.
const webClipStyle: any = { clipPath: quadClipPath(COMBINED_IMAGE_QUAD, COMBINED_IMAGE_BOX) };

const LANTERN_CELL_IDS = ['hotspot-4', 'hotspot-5', 'hotspot-6'];

const clueRegistry: Record<string, ClueEntry> = Object.fromEntries(
  cellarHotspots
    .filter((h): h is Extract<Hotspot, { kind: 'observation' }> => h.kind === 'observation')
    .map((h) => [h.clue.id, h.clue])
);

export function CellarScreen({ route, navigation }: Props) {
  const { roomId } = route.params;

  // collectedClueIds doubles as the gate-flag store: real clue ids from
  // observation hotspots, plus three synthetic markers pushed here directly
  // ('trapped', 'lanternLit', 'grillUnlocked') that never resolve to a
  // notebook entry (clueRegistry doesn't know them) but still work with
  // requiresClueId on hotspot-4/5/6/13/14 — same mechanism, no new plumbing.
  const [collectedClueIds, setCollectedClueIds] = useState<string[]>([]);
  const [solvedPuzzleIds, setSolvedPuzzleIds] = useState<string[]>([]);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [activeClue, setActiveClue] = useState<ClueEntry | null>(null);
  const [activeLockPuzzle, setActiveLockPuzzle] = useState<Extract<Hotspot, { kind: 'numberLock' }> | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [grillUnlocked, setGrillUnlocked] = useState(false);
  const [escaped, setEscaped] = useState(false);
  const [redFilmModalOpen, setRedFilmModalOpen] = useState(false);
  const dropTargetRef = useRef<View>(null);

  const collectedClues = collectedClueIds.map((id) => clueRegistry[id]).filter((c): c is ClueEntry => Boolean(c));
  const hasTopHalf = solvedPuzzleIds.includes('hotspot-8');
  const imageCombined = collectedClueIds.includes('imageCombined');
  const trapped = collectedClueIds.includes('trapped');
  const lanternLit = collectedClueIds.includes('lanternLit');
  const sceneBackground = lanternLit ? CELLAR_LANTERN_ON_BG : trapped ? CELLAR_FLOURO_ON_BG : CELLAR_BG;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  // Only worth subscribing once the door's actually locked — before that,
  // whether the Library has solved their half doesn't change anything the
  // player can do yet.
  useEffect(() => {
    if (!trapped || !myUserId) return;
    const checkGrill = async () => {
      const rows = await fetchRoomProgress(roomId);
      const unlocked = rows.some((row) => row.user_id !== myUserId && row.solved_puzzle_ids.includes('grillUnlocked'));
      if (unlocked) {
        setGrillUnlocked(true);
        setCollectedClueIds((ids) => (ids.includes('grillUnlocked') ? ids : [...ids, 'grillUnlocked']));
      }
    };
    checkGrill();
    return subscribeToProgress(roomId, checkGrill);
  }, [trapped, myUserId, roomId]);

  const handleObservation = (hotspot: Extract<Hotspot, { kind: 'observation' }>, alreadyFound: boolean) => {
    if (!alreadyFound) setCollectedClueIds((ids) => [...ids, hotspot.clue.id]);
    setActiveClue(hotspot.clue);
  };

  const handleComingSoon = async (hotspot: Extract<Hotspot, { kind: 'comingSoon' }>) => {
    if (hotspot.id === 'hotspot-8') {
      if (hasTopHalf) {
        setToastMessage('The chute is empty now.');
        return;
      }
      // In solo dev preview there's no Associate in another session to ever
      // pull the Library lever and set 'imageSent' remotely, so this gate
      // would block solo testing of everything past this point — skip the
      // remote check and let the chute deliver on the first pull instead.
      if (!DEV_SOLO_PREVIEW) {
        const rows = await fetchRoomProgress(roomId);
        const sent = rows.some((row) => row.solved_puzzle_ids.includes('imageSent'));
        if (!sent) {
          setToastMessage("The dumbwaiter sits empty. Nothing's come down yet.");
          return;
        }
      }
      setSolvedPuzzleIds((ids) => [...ids, 'hotspot-8']);
      setToastMessage('The dumbwaiter clatters down. Inside: the missing half of a torn page.');
      return;
    }

    if (hotspot.id === 'hotspot-3') {
      if (solvedPuzzleIds.includes('hotspot-3')) {
        setRedFilmModalOpen(true);
        return;
      }
      if (!imageCombined) {
        setToastMessage('A strip of stained red film. Useless without something to hold it against.');
        return;
      }
      // Once the photo's combined, hotspot-3 is superseded by the
      // DraggableProp overlay below — this only fires if a tap somehow
      // lands here anyway (e.g. missed the drag start).
      setToastMessage('Drag the film onto the joined page.');
      return;
    }

    if (hotspot.id === 'hotspot-14') {
      if (!grillUnlocked) {
        setToastMessage("The padlock doesn't move — not from this side.");
        return;
      }
      setEscaped(true);
      return;
    }

    setToastMessage(hotspot.message);
  };

  const handleImageCombined = () => {
    setCollectedClueIds((ids) => (ids.includes('imageCombined') ? ids : [...ids, 'imageCombined']));
    setToastMessage('The two halves settle together, flat against the stone.');
  };

  const handleRedFilmDropped = () => {
    setSolvedPuzzleIds((ids) => (ids.includes('hotspot-3') ? ids : [...ids, 'hotspot-3']));
    setRedFilmModalOpen(true);
  };

  const handleNumberLock = (hotspot: Extract<Hotspot, { kind: 'numberLock' }>) => {
    setActiveLockPuzzle(hotspot);
  };

  const handleNumberLockSolved = () => {
    if (!activeLockPuzzle) return;
    const id = activeLockPuzzle.id;
    const successMessage = activeLockPuzzle.successMessage;
    setSolvedPuzzleIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setActiveLockPuzzle(null);
    setToastMessage(successMessage);

    if (id === 'hotspot-1') {
      setTimeout(() => {
        setToastMessage("You move for the door — it doesn't budge. Somewhere close, an emergency lamp flickers on.");
        setCollectedClueIds((ids) => (ids.includes('trapped') ? ids : [...ids, 'trapped']));
      }, 1800);
      return;
    }

    if (LANTERN_CELL_IDS.includes(id)) {
      const allLit = LANTERN_CELL_IDS.every((cellId) => cellId === id || solvedPuzzleIds.includes(cellId));
      if (allLit) {
        setTimeout(() => {
          setToastMessage('The lantern catches — light floods back into the room.');
          setCollectedClueIds((ids) => (ids.includes('lanternLit') ? ids : [...ids, 'lanternLit']));
        }, 1600);
      }
    }
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
            <Image source={sceneBackground} style={styles.sceneImage} contentFit="cover" transition={200} />
            <HotspotLayer
              hotspots={cellarHotspots}
              collectedClueIds={collectedClueIds}
              onObservation={handleObservation}
              onComingSoon={handleComingSoon}
              onNumberLock={handleNumberLock}
              onSymbolLock={() => {}}
              onLocked={handleLocked}
            />
            {/* hotspot-17/18 and the red film all sit on the workbench —
                which goes essentially pitch black the moment the power
                cuts (see cellar_flouro_on.jpg/cellar_lanern_on.jpg), so
                none of this renders once trapped is true. That's also
                exactly when it stops mattering: trapped only becomes true
                after hotspot-1's drawer (code 3907, same as what the red
                film reveals here) is already open. */}
            {hasTopHalf && !trapped && (
              // Purely a measurement anchor for DraggableProp's drop
              // hit-test — see dropTargetRef — sized to hotspot-18's
              // bounding box, invisible, never touchable. Rendered
              // unconditionally (not just pre-combine) since the red film
              // drag below targets this same spot too.
              <View
                ref={dropTargetRef}
                pointerEvents="none"
                style={[
                  styles.dropTarget,
                  {
                    left: `${COMBINED_IMAGE_BOX.x * 100}%`,
                    top: `${COMBINED_IMAGE_BOX.y * 100}%`,
                    width: `${COMBINED_IMAGE_BOX.w * 100}%`,
                    height: `${COMBINED_IMAGE_BOX.h * 100}%`,
                  },
                ]}
              />
            )}
            {hasTopHalf && !imageCombined && !trapped && (
              <DraggableProp
                startBox={RECEIVED_IMAGE_BOX}
                targetRef={dropTargetRef}
                imageSource={RECEIVED_IMAGE}
                onDropped={handleImageCombined}
              />
            )}
            {imageCombined && !trapped && (
              <Image
                source={RECEIVED_IMAGE}
                style={[
                  styles.combinedPhoto,
                  webClipStyle,
                  {
                    left: `${COMBINED_IMAGE_BOX.x * 100}%`,
                    top: `${COMBINED_IMAGE_BOX.y * 100}%`,
                    width: `${COMBINED_IMAGE_BOX.w * 100}%`,
                    height: `${COMBINED_IMAGE_BOX.h * 100}%`,
                  },
                ]}
                contentFit="cover"
                transition={200}
              />
            )}
            {imageCombined && !trapped && (
              // No icon/imageSource — the red film is already drawn into
              // cellar.jpg at this spot, so this is purely an invisible
              // drag handle over the real art (see DraggableProp's hasVisual
              // note). Left mounted permanently (not gated on hotspot-3
              // being unsolved) so the film can be held against the page
              // and re-read as many times as the player wants.
              <DraggableProp
                startBox={RED_FILM_START_BOX}
                targetRef={dropTargetRef}
                onDropped={handleRedFilmDropped}
              />
            )}
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
              <CaseFileLabel style={styles.escapeLabel}>The Grill Door Gives Way</CaseFileLabel>
              <BodyText style={styles.escapeText}>
                The padlock falls away. The grill door swings open onto the tunnel — and the tracks beyond lead
                straight toward Blackwood Station. Whatever happens next, it happens on a train Edmund never should
                have needed to catch alone.
              </BodyText>
              <Button title="Leave Room" variant="secondary" onPress={handleLeaveRoom} />
            </View>
          </SafeAreaView>
        </View>
      )}

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
      <NotebookSheet visible={notebookOpen} onClose={() => setNotebookOpen(false)} clues={collectedClues} />
      <ClueModal clue={activeClue} onDismiss={() => setActiveClue(null)} />
      <RedFilmModal
        visible={redFilmModalOpen}
        imageSource={RECEIVED_IMAGE}
        code={OVERRIDE_CODE}
        onDismiss={() => setRedFilmModalOpen(false)}
      />
      <NumberLockModal
        puzzle={activeLockPuzzle}
        onClose={() => setActiveLockPuzzle(null)}
        onSolved={handleNumberLockSolved}
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
  combinedPhoto: {
    position: 'absolute',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  dropTarget: { position: 'absolute' },
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
