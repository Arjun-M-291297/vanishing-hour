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
import { HintModal } from '../components/HintModal';
import { RevelationOverlay } from '../components/RevelationOverlay';
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
// Swapped in once hotspot-8 (the delivery lever) has been pulled but
// before the drawer traps the player — same scene, lever crank rotated
// down. Lowest priority of the three variants: once trapped/lanternLit
// also apply, those take over since the lever area goes dark anyway.
const CELLAR_LEVER_DOWN_BG = require('../../assets/scenes/cellar_lever_down.jpg');
// Swapped in once the drawer traps the player and the power cuts — the
// oil lantern is dark, but the fluorescent cell-box (the actual hotspot-4/
// 5/6 puzzle object, down by the ledger) is already glowing, matching the
// "an emergency lamp flickers on" toast.
const CELLAR_FLUORO_ON_BG = require('../../assets/scenes/cellar_fluoro_on.jpg');
// Swapped in once all three cells are solved — the oil lantern is lit,
// and its light now reveals the card-symbol mark on the wall (hotspot-13)
// beside the grill door.
const CELLAR_LANTERN_ON_BG = require('../../assets/scenes/cellar_lantern_on.jpg');
// All four variants share cellar.jpg's own dimensions (1456x720), so
// every hotspot fraction lands the same regardless of which is showing.
const CELLAR_ASPECT_RATIO = 1456 / 720;

// Brief narrative panels (see RevelationOverlay) shown between puzzle
// beats. Keyed rather than one boolean per panel so adding the rest of
// this set (lock_clicks_open, evidence_documents, blackout, ...) later is
// just another entry here, not another piece of state each time.
const REVELATIONS = {
  inspectorRevelation: {
    image: require('../../assets/scenes/inspector_revelation.jpg'),
    label: 'Debt and a Departure',
    caption:
      'The lock gives. Inside: a stamped train ticket to Blackwood Station, and — tucked beneath it — a ledger page in a stranger\'s hand. "DEBTOR: Edmund Voss. Balance called in full. Assets subject to seizure if unpaid." Whoever Silas is, he wanted his money back, and Edmund didn\'t have it. A one-way ticket, bought and never used. He wasn\'t taken. He ran.',
  },
  lampLitten: {
    image: require('../../assets/scenes/lamp_litten.jpg'),
    label: 'Light Returns',
    caption: 'The lantern catches — flame steadying behind the glass. Light floods back into the room.',
  },
} as const;
type RevelationKey = keyof typeof REVELATIONS;
// Same art as the Library's draggable piece — it's literally the same
// physical page, just viewed from this side of the dumbwaiter.
const RECEIVED_IMAGE = require('../../assets/scenes/torn_image_lower.png');
// A pre-rotated (90°) copy of the same art, used only for the basket drag
// below — the basket slot is genuinely portrait-shaped, so the page reads
// as sitting upright in it, same as it visually would in real life. Once
// dropped it's the landscape RECEIVED_IMAGE that settles flat on the
// table (see combinedPhoto), which is its own separate visual moment —
// picked up standing in the basket, laid flat once placed.
const RECEIVED_IMAGE_VERTICAL = require('../../assets/scenes/torn_image_lower_vertical.png');
// hotspot-17 — not a tap target, just where the received image starts once
// hotspot-8 (the chute lever) has been pulled; from there it's draggable.
// Box shaped to the vertical image's own ~0.37:1 aspect — same center
// point and area as the basket's own verified quad, just narrower/taller
// to match both the art and the rotated asset.
const RECEIVED_IMAGE_BOX = { x: 0.0899, y: 0.365, w: 0.0524, h: 0.283 };

// hotspot-18 — where the reassembled photo settles once dragged there from
// hotspot-17. A skewed quad rather than an axis-aligned box, since in the
// art it's lying flat on an angled surface, not floating flush with the
// screen.
const COMBINED_IMAGE_QUAD: [number, number][] = [
  [0.3671, 0.6582],
  [0.2997, 0.5771],
  [0.3855, 0.5435],
  [0.4449, 0.6085],
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

// clip-path only reshapes the boundary — it doesn't rotate the image's own
// content to match the quad's actual tilt, so the page's texture/text was
// sitting dead level underneath a tilted cutout (visible as a mismatched
// "wrong angle" once dropped). This estimates that tilt from the quad
// itself: a hand-marked photo perspective quad isn't a perfect
// parallelogram, so of the two opposite-edge pairs, whichever pair has the
// closer matching length is the more reliable estimate of the object's
// true long axis — averaging that pair's angle (reversing one edge so
// both point the same way around the quad) gives the rotation to apply.
function quadRotationDeg(points: [number, number][], sceneW: number, sceneH: number) {
  const px = points.map(([x, y]) => [x * sceneW, y * sceneH] as const);
  const edges = px.map(([x0, y0], i) => {
    const [x1, y1] = px[(i + 1) % px.length];
    const dx = x1 - x0;
    const dy = y1 - y0;
    return { dx, dy, len: Math.hypot(dx, dy) };
  });
  const [pairA, pairB] = [
    [edges[0], edges[2]],
    [edges[1], edges[3]],
  ];
  const [e1, e2] = Math.abs(pairA[0].len - pairA[1].len) < Math.abs(pairB[0].len - pairB[1].len) ? pairA : pairB;
  const angle1 = (Math.atan2(e1.dy, e1.dx) * 180) / Math.PI;
  const angle2 = (Math.atan2(-e2.dy, -e2.dx) * 180) / Math.PI; // reversed so both edges point the same way
  return (angle1 + angle2) / 2;
}

// A cover-fit image rotated in place needs to be scaled up first, or its
// corners pull in from the box edges and expose gaps at the quad's own
// corners once clipped. This is the standard "smallest rotated rectangle
// that still covers an axis-aligned box" formula, projecting the target
// box's half-extents onto the rotated rectangle's own two axes — with a
// 5% margin for rounding safety. A thin, wide box (like this one) needs a
// surprisingly large scale for even a modest angle, since rotating a wide
// strip sweeps its short axis through a lot of extra vertical space.
function minCoverScale(boxWpx: number, boxHpx: number, angleDeg: number) {
  const rad = (Math.abs(angleDeg) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const scaleForWidth = cos + (boxHpx / boxWpx) * sin;
  const scaleForHeight = (boxWpx / boxHpx) * sin + cos;
  return Math.max(scaleForWidth, scaleForHeight) * 1.05;
}

// hotspot-3's own position (the red film prop) — reused here as a drag
// start box once the combined photo exists to hold it against; cellar.ts
// still owns hotspot-3 as a tap target for its "not ready yet" flavor text
// before that point.
// Scaled to 2.5x the film's actual position/size (same center point), for
// a bigger, easier-to-grab drag target.
const RED_FILM_START_BOX = { x: 0.1588, y: 0.3593, w: 0.2105, h: 0.098 };
const RED_FILM_IMAGE = require('../../assets/scenes/red_film.png');
const OVERRIDE_CODE = '3 9 0 7';

interface HintStage {
  key: string;
  title: string;
  hints: string[];
}

// Checked top to bottom, first match wins — this is what makes the hint
// button contextual instead of a fixed walkthrough: whichever condition is
// still unmet is by definition whatever the player is currently stuck on.
// The drag-photo/red-film stages are skipped once trapped, since that art
// goes dark and those props stop rendering entirely at that point (see the
// !trapped guards around them below) — hinting toward something the
// player can no longer even see would just be confusing.
function getCellarHintStage(state: {
  escaped: boolean;
  grillUnlocked: boolean;
  solvedHotspot1: boolean;
  hasTopHalf: boolean;
  imageCombined: boolean;
  solvedHotspot3: boolean;
  trapped: boolean;
  lanternLit: boolean;
  revealedSymbols: boolean;
}): HintStage | null {
  if (state.escaped) return null;

  if (state.grillUnlocked) {
    return {
      key: 'door',
      title: 'The Grill Door',
      hints: [
        "Whatever the Associate found upstairs, it's already done its work down here.",
        "Look at the door you couldn't move before.",
        "The padlock hanging there isn't stuck anymore — try it.",
        'Tap the grill door to step through.',
      ],
    };
  }

  if (!state.solvedHotspot1) {
    return {
      key: 'drawer',
      title: 'The Locked Drawer',
      hints: [
        "That drawer's not just decoration. Something in this cellar points to its combination.",
        'Numbers are scattered around the room — a stamped ticket, a scrawled figure in a ledger.',
        'Look closely at the objects on the bench near the drawer itself.',
        'The code is 3907.',
      ],
    };
  }

  if (!state.trapped) {
    if (!state.hasTopHalf) {
      return {
        key: 'lever',
        title: 'The Delivery Lever',
        hints: [
          "There's more to this delivery bench than the drawer.",
          'A hand-crank lever sits in a crate near the DELIVERY sign.',
          "Pull it — but only once the Associate has sent something down first.",
          'Tap the lever to bring the dumbwaiter down.',
        ],
      };
    }
    if (!state.imageCombined) {
      return {
        key: 'combine',
        title: 'The Delivered Page',
        hints: [
          "The dumbwaiter didn't come down empty.",
          "Whatever it delivered is sitting in the basket, waiting to be moved.",
          'Drag the page from the basket over to the open space on the workbench.',
          "Drop it next to the page already lying there — the two halves belong together.",
        ],
      };
    }
    if (!state.solvedHotspot3) {
      return {
        key: 'redfilm',
        title: 'The Red Film',
        hints: [
          "A page joined isn't the same as a page read.",
          "There's a strip of stained red film tucked in a nearby crate.",
          'Drag it and hold it against the now-complete page.',
          'Held to the joined page, it reveals the number 3907.',
        ],
      };
    }
  }

  if (state.trapped && !state.lanternLit) {
    return {
      key: 'cells',
      title: 'The Lantern Cells',
      hints: [
        "The lights are out, but something nearby is still glowing.",
        'Three glass cells sit in a box by the ledger, each with its own combination.',
        'Ask the Associate for the minutes — not the hours — on the timestamps in their book, in order.',
        'Cell I is 15, Cell II is 42, Cell III is 08.',
      ],
    };
  }

  if (state.lanternLit && !state.revealedSymbols) {
    return {
      key: 'symbols',
      title: 'The Mark on the Wall',
      hints: [
        'With light back in the room, look at what the lantern now reaches.',
        "There's a mark on the stone near the door that wasn't visible before.",
        'Four symbols are pressed into the wall — read them left to right.',
        'Hearts, clubs, spades, diamonds, in that order — tell your partner exactly that.',
      ],
    };
  }

  return {
    key: 'waiting',
    title: 'Waiting on the Associate',
    hints: ["You've done everything you can down here. The Associate needs to finish their half — all that's left is to wait."],
  };
}

const COMBINED_IMAGE_BOX = quadBoundingBox(COMBINED_IMAGE_QUAD);
// Web-only CSS (react-native-web passes unknown style keys straight
// through), so it's kept out of the typed StyleSheet.create block below —
// same pattern as DraggableProp's webNoDragStyle. No native equivalent
// without an SVG mask, so on iOS/Android the placed photo just renders as
// a plain rectangle inside the quad's bounding box.
const webClipStyle: any = { clipPath: quadClipPath(COMBINED_IMAGE_QUAD, COMBINED_IMAGE_BOX) };
// cellar.jpg's actual pixel dimensions (verified — see CELLAR_ASPECT_RATIO
// above), needed here because angles/lengths computed straight from the
// fractional quad coordinates would be skewed by the scene's own aspect
// ratio.
const CELLAR_PX = { w: 1457, h: 720 };
const COMBINED_IMAGE_ROTATION_DEG = quadRotationDeg(COMBINED_IMAGE_QUAD, CELLAR_PX.w, CELLAR_PX.h);
const COMBINED_IMAGE_SCALE = minCoverScale(
  COMBINED_IMAGE_BOX.w * CELLAR_PX.w,
  COMBINED_IMAGE_BOX.h * CELLAR_PX.h,
  COMBINED_IMAGE_ROTATION_DEG
);

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
  const [hintOpen, setHintOpen] = useState(false);
  const [activeRevelation, setActiveRevelation] = useState<RevelationKey | null>(null);
  const dropTargetRef = useRef<View>(null);

  const collectedClues = collectedClueIds.map((id) => clueRegistry[id]).filter((c): c is ClueEntry => Boolean(c));
  const hasTopHalf = solvedPuzzleIds.includes('hotspot-8');
  const imageCombined = collectedClueIds.includes('imageCombined');
  const trapped = collectedClueIds.includes('trapped');
  const lanternLit = collectedClueIds.includes('lanternLit');
  // hasTopHalf doubles as "lever pulled" — hotspot-8's own solved flag.
  const sceneBackground = lanternLit
    ? CELLAR_LANTERN_ON_BG
    : trapped
    ? CELLAR_FLUORO_ON_BG
    : hasTopHalf
    ? CELLAR_LEVER_DOWN_BG
    : CELLAR_BG;
  const hintStage = getCellarHintStage({
    escaped,
    grillUnlocked,
    solvedHotspot1: solvedPuzzleIds.includes('hotspot-1'),
    hasTopHalf,
    imageCombined,
    solvedHotspot3: solvedPuzzleIds.includes('hotspot-3'),
    trapped,
    lanternLit,
    revealedSymbols: collectedClueIds.includes('revealedSymbols'),
  });

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
        setToastMessage("The lever's already been thrown — it won't budge again.");
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
    if (solvedPuzzleIds.includes(hotspot.id)) {
      setToastMessage(hotspot.successMessage);
      return;
    }
    setActiveLockPuzzle(hotspot);
  };

  const handleNumberLockSolved = () => {
    if (!activeLockPuzzle) return;
    const id = activeLockPuzzle.id;
    const successMessage = activeLockPuzzle.successMessage;
    setSolvedPuzzleIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setActiveLockPuzzle(null);

    if (id === 'hotspot-1') {
      // The revelation panel covers the whole screen, so the usual toast
      // is skipped here rather than flashing underneath it — the panel's
      // own caption carries that beat instead. The "trapped" toast/state
      // change that used to fire on a flat timeout now waits for the
      // player to actually dismiss the panel (see handleRevelationContinue).
      setActiveRevelation('inspectorRevelation');
      return;
    }

    if (LANTERN_CELL_IDS.includes(id)) {
      const allLit = LANTERN_CELL_IDS.every((cellId) => cellId === id || solvedPuzzleIds.includes(cellId));
      if (allLit) {
        setTimeout(() => {
          setActiveRevelation('lampLitten');
        }, 1000);
        return;
      }
    }

    setToastMessage(successMessage);
  };

  // Whichever panel just closed decides what happens next — each
  // revelation stands in for a puzzle-solve's usual toast/state-change, so
  // that follow-up only fires once the player has actually dismissed it,
  // not on a flat timeout from the solve itself.
  const handleRevelationContinue = () => {
    const closed = activeRevelation;
    setActiveRevelation(null);
    if (closed === 'inspectorRevelation') {
      setTimeout(() => {
        setToastMessage("You move for the door — it doesn't budge. Somewhere close, an emergency lamp flickers on.");
        setCollectedClueIds((ids) => (ids.includes('trapped') ? ids : [...ids, 'trapped']));
      }, 800);
    } else if (closed === 'lampLitten') {
      setCollectedClueIds((ids) => (ids.includes('lanternLit') ? ids : [...ids, 'lanternLit']));
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
                cuts (see cellar_fluoro_on.jpg/cellar_lantern_on.jpg), so
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
                imageSource={RECEIVED_IMAGE_VERTICAL}
                onDropped={handleImageCombined}
              />
            )}
            {imageCombined && !trapped && (
              // The rotation has to live on the inner Image, not this
              // outer box — clip-path and transform on the SAME element
              // would rotate the already-quad-shaped clip along with the
              // content, dragging it away from the quad it's meant to
              // match. Keeping the clip on an unrotated outer box and
              // rotating only the image inside it keeps the clip fixed in
              // place while the content tilts to match.
              <View
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
              >
                <Image
                  source={RECEIVED_IMAGE}
                  style={[
                    styles.combinedPhotoInner,
                    { transform: [{ scale: COMBINED_IMAGE_SCALE }, { rotate: `${COMBINED_IMAGE_ROTATION_DEG}deg` }] },
                  ]}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            )}
            {imageCombined && !trapped && (
              // Left mounted permanently (not gated on hotspot-3 being
              // unsolved) so the film can be held against the page and
              // re-read as many times as the player wants. hideWhenIdle:
              // the film is already drawn into cellar.jpg sitting in its
              // crate, so a visible sprite there too would just double it
              // up — it only needs to actually show once picked up and
              // moving, standing in for "you're holding it now."
              <DraggableProp
                startBox={RED_FILM_START_BOX}
                targetRef={dropTargetRef}
                imageSource={RED_FILM_IMAGE}
                imageContentFit="contain"
                hideWhenIdle
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

      {activeRevelation && (
        <RevelationOverlay
          visible
          imageSource={REVELATIONS[activeRevelation].image}
          label={REVELATIONS[activeRevelation].label}
          caption={REVELATIONS[activeRevelation].caption}
          onContinue={handleRevelationContinue}
        />
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
      {hintStage && (
        <HintModal
          visible={hintOpen}
          stageKey={hintStage.key}
          title={hintStage.title}
          hints={hintStage.hints}
          onDismiss={() => setHintOpen(false)}
        />
      )}
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
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topBtnText: { color: colors.paper, fontFamily: fonts.display, fontSize: 12 },
  sceneLabelBox: { backgroundColor: 'rgba(11,15,20,0.7)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  scrollView: { flex: 1, backgroundColor: colors.ink },
  scrollBody: { flexGrow: 1 },
  sceneBox: { width: '100%', overflow: 'hidden' },
  sceneImage: { width: '100%', height: '100%' },
  combinedPhoto: {
    position: 'absolute',
    borderRadius: 4,
    // Belt-and-braces on native, which has no clip-path support — without
    // this the scaled-up, rotated inner Image would spill out past this
    // box's rectangular bounds instead of just being cropped to it.
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  combinedPhotoInner: { width: '100%', height: '100%' },
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
