import { Hotspot } from '../types/study';

// Chapter 2, Inspector's half. Three synthetic gate flags get pushed into
// collectedClueIds purely to drive requiresClueId — they're never granted
// by an observation hotspot and never resolve to a visible notebook entry
// (clueRegistry doesn't know them), just markers: 'trapped' (drawer solved,
// door won't open), 'lanternLit' (all three cells solved), 'grillUnlocked'
// (remote signal from the Library's half of the final puzzle).
export const cellarHotspots: Hotspot[] = [
  {
    id: 'hotspot-1',
    kind: 'numberLock',
    label: 'Locked Drawer',
    x: 0.4527,
    y: 0.4279,
    w: 0.0311,
    h: 0.089,
    puzzleTitle: 'Locked Drawer',
    flavorText: 'A small drawer set into the delivery bench, sealed with a four-digit combination lock.',
    solution: '3907',
    successMessage:
      'The lock gives. Inside: a train ticket to Blackwood Station, and a ledger page marked "DEBTOR: Edmund Voss." A debt big enough to disappear over.',
  },
  {
    id: 'hotspot-2',
    kind: 'observation',
    label: 'Torn Page — Upper Half',
    // Bounding box of the page's true (skewed, non-axis-aligned) outline
    // on the new art — HotspotLayer only supports rects, so this is the
    // tightest rect around the quad the page actually occupies.
    x: 0.2037,
    y: 0.5902,
    w: 0.1517,
    h: 0.1178,
    clue: {
      id: 'cellarPhotoTop',
      title: 'Torn Page — Upper Half',
      detail:
        "The top half of a handwritten page, torn clean across the middle. On its own it reads like nothing — half-sentences, no context. It needs its other half.",
      icon: '📄',
    },
  },
  {
    id: 'hotspot-3',
    kind: 'comingSoon',
    label: 'Red Film',
    x: 0.2219,
    y: 0.3887,
    w: 0.0842,
    h: 0.0392,
    message: 'A strip of stained red film, tucked into a crate. Useless on its own.',
  },
  {
    id: 'hotspot-4',
    kind: 'numberLock',
    label: 'Lantern — Cell I',
    x: 0.7587,
    y: 0.7211,
    w: 0.0246,
    h: 0.1439,
    requiresClueId: 'trapped',
    silentLock: true,
    puzzleTitle: 'Lantern — Cell I',
    flavorText: 'Trust the minute, not the hour.',
    solution: '15',
    successMessage: 'The first cell clicks into place.',
  },
  {
    id: 'hotspot-5',
    kind: 'numberLock',
    label: 'Lantern — Cell II',
    x: 0.8015,
    y: 0.7289,
    w: 0.0311,
    h: 0.1413,
    requiresClueId: 'trapped',
    silentLock: true,
    puzzleTitle: 'Lantern — Cell II',
    flavorText: 'Trust the minute, not the hour.',
    solution: '42',
    successMessage: 'The second cell clicks into place.',
  },
  {
    id: 'hotspot-6',
    kind: 'numberLock',
    label: 'Lantern — Cell III',
    x: 0.8495,
    y: 0.7341,
    w: 0.0337,
    h: 0.1283,
    requiresClueId: 'trapped',
    silentLock: true,
    puzzleTitle: 'Lantern — Cell III',
    flavorText: 'Trust the minute, not the hour.',
    solution: '08',
    successMessage: 'The third cell clicks into place.',
  },
  {
    id: 'hotspot-8',
    kind: 'comingSoon',
    label: 'Delivery Lever',
    // Now a literal hand-crank prop in the art rather than the chute
    // opening itself — same mechanism, moved to where the crank actually
    // sits.
    x: 0.2011,
    y: 0.229,
    w: 0.048,
    h: 0.1937,
    message: 'A hand-crank lever beside the DELIVERY chute. It runs up through the wall.',
  },
  {
    id: 'hotspot-13',
    kind: 'observation',
    label: 'A Mark on the Wall',
    x: 0.5749,
    y: 0.1416,
    w: 0.0914,
    h: 0.1764,
    requiresClueId: 'lanternLit',
    silentLock: true,
    clue: {
      id: 'revealedSymbols',
      title: 'A Mark on the Wall',
      detail:
        'With the lantern lit, a mark on the wall catches the light: ♥ ♣ ♠ ♦, in that order. Tell your partner — they need this order upstairs.',
      icon: '🃏',
    },
  },
  {
    id: 'hotspot-14',
    kind: 'comingSoon',
    label: 'Grill Door',
    x: 0.6939,
    y: 0.3416,
    w: 0.0389,
    h: 0.0994,
    requiresClueId: 'grillUnlocked',
    silentLock: true,
    message: 'The padlock on the grill door, chained shut.',
  },
];
