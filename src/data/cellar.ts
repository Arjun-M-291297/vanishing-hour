import { Hotspot } from '../types/study';

// The Inspector's half of the cross-room "get the Detective out of the
// cellar" puzzle. Box A and Box B are deliberately NOT gated behind
// requiresClueId — the thing standing between the player and solving them
// is knowledge only the Associate has (the bust cipher, the breaker
// diagram), not an in-app flag. That's the whole point of the split: the
// app can't verify what players tell each other out loud, so the "lock" is
// real information asymmetry, same as any other clue in this case.
export const cellarHotspots: Hotspot[] = [
  {
    id: 'cellarPhoto',
    kind: 'observation',
    label: 'Torn Photograph',
    x: 0.185,
    y: 0.379,
    w: 0.0583,
    h: 0.123,
    clue: {
      id: 'cellarPhotoHalf',
      title: 'Torn Photograph — Lower Half',
      detail:
        "Tucked into a crack in the brickwork, the bottom half of an old photograph — two figures from the waist down, torn clean across the middle. Along the torn edge, a few surviving words: \"...opens what 1123 begins.\" The rest of the sentence, and the rest of the photo, must be somewhere else.",
      icon: '📷',
    },
  },
  {
    id: 'boxA',
    kind: 'symbolLock',
    label: 'Box A',
    x: 0.6342,
    y: 0.3255,
    w: 0.0847,
    h: 0.115,
    puzzleTitle: 'Box A — Symbol Dial',
    flavorText:
      "A small dial set into the iron door of the alcove, three notches worn smooth from turning. Whatever opens it isn't written down anywhere down here — someone upstairs might know.",
    symbols: ['♋', '🌍', '♏', '♈', '☿'],
    solution: ['♋', '🌍', '♏'],
    successMessage:
      "The dial gives way. Inside, wedged into the corner, a strip of stained red film. Held up to the torn photograph, hidden text bleeds through the creases: OVERRIDE CODE — 4 8 1 9.",
  },
  {
    id: 'boxB',
    kind: 'numberLock',
    label: 'Box B',
    x: 0.6381,
    y: 0.4779,
    w: 0.0835,
    h: 0.1096,
    puzzleTitle: 'Box B — Number Lock',
    flavorText: 'A second, sturdier lock beneath the first. Four digits.',
    solution: '4819',
    successMessage:
      "The lock clicks open. Inside: a brass valve handle, and beneath it, a folded slip of paper in Edmund's hand.",
  },
  {
    id: 'gatePlate',
    kind: 'observation',
    label: 'The Gate',
    x: 0.5056,
    y: 0.4539,
    w: 0.053,
    h: 0.0828,
    clue: {
      id: 'gatePlate',
      title: 'Iron Gate — "1123"',
      detail:
        "A brass plate is bolted to the gate: 1123. The same four digits from the study clock, stamped here like a signature. The gate itself doesn't move — not yet.",
      icon: '🚪',
    },
  },
  {
    id: 'valve',
    kind: 'comingSoon',
    label: 'Valve Wheel',
    x: 0.8183,
    y: 0.4378,
    w: 0.057,
    h: 0.2219,
    message: 'A heavy iron valve wheel, sealed tight, connected to pipework that vanishes into the wall.',
  },
];
