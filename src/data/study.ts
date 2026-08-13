import { Hotspot } from "../types/study";

// Coordinates drawn against the real (cropped, 2:1) study.jpeg using the
// hotspot annotator tool, then verified against labeled crops of the actual
// photo — not hand-calculated fractions. brandyGlasses and passageDoor were
// each drawn as two adjacent boxes (one per glass; the two upper shelves)
// and merged here into one bounding box, since each is a single hotspot
// with one clue/message. bookshelfPuzzle is the third (lowest) of three
// shelves drawn, matching its "Third Shelf" label. desk is now scoped to
// just the visible combination lock rather than the whole desk surface.
export const studyHotspots: Hotspot[] = [
  {
    id: "painting",
    kind: "observation",
    label: "Crooked Painting",
    x: 0.2101,
    y: 0.1008,
    w: 0.1552,
    h: 0.2496,
    clue: {
      id: "brassKey",
      title: "Small Brass Key",
      detail:
        "A landscape painting hangs slightly crooked. Behind it, taped to the wall, a small brass key.",
      icon: "🗝️",
    },
  },
  {
    id: "clock",
    kind: "observation",
    label: "Stopped Clock",
    x: 0.5382,
    y: 0.3205,
    w: 0.0648,
    h: 0.1012,
    clue: {
      id: "stoppedClock",
      title: "Stopped Clock",
      detail:
        "The mantel clock isn't broken — it's stopped on purpose, hour and minute hands held fast at eleven and twenty-three. Not midnight, when he vanished. Earlier. As if he needed to remember something under pressure, and trusted a clock more than his own memory.",
      icon: "🕚",
    },
  },
  {
    id: "prescription",
    kind: "observation",
    label: "Prescription Bottle",
    x: 0.6289,
    y: 0.3677,
    w: 0.0218,
    h: 0.059,
    clue: {
      id: "prescriptionBottle",
      title: "Prescription Bottle",
      detail:
        'Tucked behind the clock, half-hidden — a small amber bottle, prescribed three months ago. The label names a drug for memory. Early-onset Alzheimer\'s, though he never once wrote the word himself. Only ever "the trouble."',
      icon: "💊",
    },
  },
  {
    id: "armchair",
    kind: "observation",
    label: "Worn Armchair",
    x: 0.2975,
    y: 0.5305,
    w: 0.2035,
    h: 0.426,
    clue: {
      id: "chairAshes",
      title: "Cold Ashes",
      detail:
        'A worn reading chair beside the fireplace. The grate holds cold ashes — bank statements and old letters, by the curl of the scraps, burned before he left. One fragment survives, in a hurried hand: "...tell Silas I tried—" Nothing more.',
      icon: "🪑",
    },
  },
  {
    id: "soupCup",
    kind: "observation",
    label: "Emptied Bowl",
    x: 0.1527,
    y: 0.7011,
    w: 0.0668,
    h: 0.0466,
    clue: {
      id: "soupCup",
      title: "Bowl of Soup, Emptied",
      detail:
        "A small side table, and on it, a bowl — Mara's doing, by the faint herbal smell still clinging to it. But it's empty. Wiped clean at the bottom: no film of dried broth, no spoon left resting in a half-finished meal. Not eaten. Poured out somewhere else, and set back down as if untouched.",
      icon: "🥣",
    },
  },
  {
    id: "brandyGlasses",
    kind: "observation",
    label: "Two Glasses",
    x: 0.1163,
    y: 0.6526,
    w: 0.1279,
    h: 0.0872,
    clue: {
      id: "brandyGlasses",
      title: "Two Brandy Glasses",
      detail:
        "Two glasses on the same table, not one. Edmund's, barely touched — a finger's width gone. The other, drained to the bottom and set down hard enough to chip the rim. Whatever was said in this room tonight, only one of them stayed calm.",
      icon: "🥃",
    },
  },
  {
    id: "desk",
    kind: "numberLock",
    label: "Locked Desk",
    x: 0.7417,
    y: 0.7343,
    w: 0.1151,
    h: 0.0801,
    requiresClueId: "brassKey",
    lockedHint: "The desk drawer is locked tight. Nothing to turn a key in — yet.",
    puzzleTitle: "Desk Drawer Lock",
    flavorText: "",
    solution: "1123",
    successMessage: "The tumblers click into place. The drawer slides open.",
    next: {
      kind: "numberCipher",
      puzzleTitle: "A Folded Note",
      flavorText:
        "Tucked beneath a ledger, a scrap of paper in Edmund's hand — rows of numbers, nothing else. A childhood code between him and his brother: count each one out along the alphabet.",
      cipherGroups: [
        [19, 5, 5, 11],
        [20, 8, 5],
        [20, 8, 9, 18, 4],
        [19, 8, 5, 12, 6],
      ],
      solution: "SEEK THE THIRD SHELF",
      rewardClue: {
        id: "shelfNote",
        title: "Coded Note: Third Shelf",
        detail:
          'Decoded, the note reads plainly: "SEEK THE THIRD SHELF." Pressed into the paper beside it, four faint symbols — gone now that you\'ve looked away.',
        icon: "📜",
      },
      successMessage:
        'The numbers resolve into letters: "SEEK THE THIRD SHELF." Whatever he hid, he hid it there.',
      next: {
        kind: "memorize",
        title: "A Second Impression",
        flavorText:
          "Faint marks are pressed into the paper beside the note — symbols, not letters. The impression is already fading. Look now.",
        symbols: ["⭐", "🌙", "☀️", "💧"],
        revealMs: 4000,
        followUpMessage:
          "The marks fade to nothing. You'll have to trust what you saw — the third shelf is waiting.",
      },
    },
  },
  {
    id: "bookshelfPuzzle",
    kind: "symbolLock",
    label: "Third Shelf",
    x: 0.7318,
    y: 0.4036,
    w: 0.2682,
    h: 0.1224,
    requiresClueId: "shelfNote",
    silentLock: true,
    puzzleTitle: "Third Shelf Latch",
    flavorText:
      "A small brass fitting is set into the shelf's edge — four notches, each stamped with a different symbol. It wants to be turned in the order you saw them.",
    symbols: ["🌙", "💧", "⭐", "☀️"],
    solution: ["⭐", "🌙", "☀️", "💧"],
    successMessage:
      "The notches click round. The shelf shifts forward, just slightly — a hidden compartment. But what's inside isn't built yet.",
  },
  {
    id: "passageDoor",
    kind: "comingSoon",
    label: "Hidden Passage",
    x: 0.7335,
    y: 0.0955,
    w: 0.2665,
    h: 0.2907,
    message: "A hidden passage — coming in a future update.",
  },
];
