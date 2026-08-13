export interface ClueEntry {
  id: string;
  title: string;
  detail: string;
  icon: string; // emoji glyph — no art assets needed for clue icons
}

export interface HotspotBase {
  id: string;
  label: string;
  x: number; // 0-1 fraction of scene width
  y: number; // 0-1 fraction of scene height
  w: number; // 0-1 fraction of scene width
  h: number; // 0-1 fraction of scene height
  requiresClueId?: string; // gated: locked until this clue is collected
  lockedHint?: string; // shown as a toast if tapped while locked
  // When true, the hotspot renders no touch target at all while locked —
  // not even a lockedHint toast — instead of the usual "tap it and get told
  // no" feedback. For a hotspot whose existence as an interactive thing is
  // itself part of what a prior puzzle reveals (nothing should happen here,
  // full stop, until then).
  silentLock?: boolean;
}

export interface ObservationHotspot extends HotspotBase {
  kind: 'observation';
  clue: ClueEntry;
}

/** A hotspot whose real destination (a puzzle, a second scene) isn't built
 * yet in this duo pass — tapping it (once unlocked) says so plainly instead
 * of dead-ending or crashing on a scene/puzzle that doesn't exist. */
export interface ComingSoonHotspot extends HotspotBase {
  kind: 'comingSoon';
  message: string;
}

/** An A=1...Z=26 number-cipher puzzle: the note shows each word as a group
 * of alphabet-position numbers, and the player fills in letters by tapping
 * an A-Z grid — a real decode (translate each number to its letter), not a
 * dial-and-guess. Solving it grants `rewardClue` (added to the notebook,
 * same as an observation clue) in addition to showing successMessage. Only
 * reachable by chaining off another puzzle's `next` field — it has no
 * hotspot of its own (found "inside" that puzzle, not tapped directly in
 * the scene). */
export interface NumberCipherPuzzle {
  kind: 'numberCipher';
  puzzleTitle: string;
  flavorText: string;
  cipherGroups: number[][]; // one sub-array per word; each number is a 1-26 letter position
  solution: string; // plaintext with spaces, e.g. "SEEK THE THIRD SHELF" — drives the target letters and reward copy
  rewardClue: ClueEntry;
  successMessage: string;
  // If set, solving this puzzle plays a MemorizeSequencePuzzle immediately
  // instead of granting rewardClue right away — rewardClue is only granted
  // once that memorize step finishes (see GameScreen), so the hotspot it
  // gates can't become interactive until after the player has actually seen
  // the sequence.
  next?: MemorizeSequencePuzzle;
}

/** A sequence of symbols that flashes on screen for `revealMs` before
 * hiding itself — tests recall of what was seen, not lookup, since nothing
 * re-shows it afterward. Only reachable by chaining off a NumberCipherPuzzle's
 * `next` field, same as that puzzle chains off a NumberLockHotspot. */
export interface MemorizeSequencePuzzle {
  kind: 'memorize';
  title: string;
  flavorText: string;
  symbols: string[];
  revealMs: number;
  followUpMessage: string; // toasted once the reveal ends and the gated clue is granted
}

/** A hotspot that opens a 4-digit combination lock puzzle once unlocked
 * (via requiresClueId). Solved state lives in GameScreen for the session —
 * re-tapping after solving shows successMessage instead of the puzzle.
 * `next`, if set, chains straight into a NumberCipherPuzzle on solve
 * instead of closing — for a multi-stage "open the drawer, then decode the
 * note" beat. */
export interface NumberLockHotspot extends HotspotBase {
  kind: 'numberLock';
  puzzleTitle: string;
  flavorText: string;
  solution: string;
  successMessage: string;
  next?: NumberCipherPuzzle;
}

/** A hotspot that opens a tap-to-select symbol sequence puzzle once
 * unlocked (via requiresClueId) — same solved/re-tap semantics as
 * numberLock. `symbols` is the full option pool shown to the player
 * (including decoys); `solution` is the correct subsequence/order. */
export interface SymbolLockHotspot extends HotspotBase {
  kind: 'symbolLock';
  puzzleTitle: string;
  flavorText: string;
  symbols: string[];
  solution: string[];
  successMessage: string;
}

export type Hotspot = ObservationHotspot | ComingSoonHotspot | NumberLockHotspot | SymbolLockHotspot;
