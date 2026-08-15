import { Hotspot } from '../types/study';

// Chapter 2, Associate's half. hotspot-11 is listed here as an
// 'observation' entry purely so its clue text/id exist for the notebook
// (clueRegistry in LibraryScreen reads kind:'observation' entries from
// this array) — in practice it's never tapped. LibraryScreen renders it as
// a draggable prop, visible from the moment the screen loads (not gated
// behind reading a clue first — the background art was healed to remove
// it, so there'd be nothing to show the player where to tap), and it
// covers the same spot, capturing all touches there. Dropping it into the
// dumbwaiter basket (hotspot-16) grants its clue as a side effect and sets
// 'imagePlaced', which is what unlocks hotspot-9 (the send lever) — not
// just having read it. hotspot-15 (the fallen book) is the final symbol
// puzzle — always tappable, not gated on anything the Cellar does; the
// only "gate" is that the four-symbol order is knowledge only the
// Inspector has, from their own hotspot-13.
export const libraryHotspots: Hotspot[] = [
  {
    id: 'hotspot-11',
    kind: 'observation',
    label: 'Torn Page',
    x: 0.1181,
    y: 0.8788,
    w: 0.0895,
    h: 0.0732,
    clue: {
      id: 'libraryPhoto',
      title: 'Torn Page',
      detail:
        "A scrap of a handwritten page, lying loose on the floor. On its own it reads like nothing — half-sentences, no context. Send it down to whoever's below; it needs its other half.",
      icon: '📄',
    },
  },
  {
    id: 'hotspot-9',
    kind: 'comingSoon',
    label: 'Dumbwaiter Lever',
    x: 0.5179,
    y: 0.6787,
    w: 0.0503,
    h: 0.2084,
    requiresClueId: 'imagePlaced',
    lockedHint: "The basket's still empty — nothing loaded to send down yet.",
    message: 'A lever beside the dumbwaiter shaft.',
  },
  {
    id: 'hotspot-12',
    kind: 'observation',
    label: 'Open Book',
    x: 0.0859,
    y: 0.1417,
    w: 0.0477,
    h: 0.0534,
    clue: {
      id: 'timestampBook',
      title: 'A Page of Times',
      detail:
        'A passage, underlined in three places: "...he left at 04:15, called again at 09:42, and was last seen at 01:08...". Three timestamps. Whoever is below might only need the minutes.',
      icon: '📖',
    },
  },
  {
    id: 'hotspot-15',
    kind: 'symbolLock',
    label: 'Fallen Book',
    x: 0.029,
    y: 0.7562,
    w: 0.0782,
    h: 0.0695,
    puzzleTitle: 'Match the Marking',
    flavorText:
      "A book lies open on the floor, its endpaper carved with four empty notches — waiting for symbols in a particular order. Your partner might know which.",
    symbols: ['♠', '♥', '♦', '♣'],
    solution: ['♥', '♣', '♠', '♦'],
    successMessage: 'The pattern locks in. Somewhere below, you hear iron give way.',
  },
];
