import { Hotspot } from '../types/study';

// The Associate's half of the cross-room puzzle. The pneumatic lever is the
// one hotspot whose "solve" is written to Supabase instead of staying
// local — pulling it is what the Inspector's valve (in cellar.ts) is
// waiting on. It's gated behind reading the breaker diagram first, since
// that gate lives entirely within this one room/screen and doesn't have
// the cross-room knowledge-asymmetry problem the cellar's boxes do.
export const libraryHotspots: Hotspot[] = [
  {
    id: 'caesarBust',
    kind: 'observation',
    label: 'Caesar Bust',
    x: 0.079,
    y: 0.5631,
    w: 0.1325,
    h: 0.1122,
    clue: {
      id: 'bustCipher',
      title: 'Bust Inscription: III · V · XIX',
      detail:
        'A marble bust on a pedestal, inscribed III · V · XIX. Counted out along the alphabet — the 3rd, 5th, and 19th letters — C, E, S. Cancer. Earth. Scorpio. Three symbols, in that order.',
      icon: '🗿',
    },
  },
  {
    id: 'rotaryBox',
    kind: 'observation',
    label: 'Carved Wooden Box',
    x: 0.3996,
    y: 0.7153,
    w: 0.0676,
    h: 0.0909,
    clue: {
      id: 'breakerDiagram',
      title: 'Carved Box & Breaker Diagram',
      detail:
        "A small wooden box, its lid carved with rotary notches — a twin to something in the cellar, by the look of it. Beside it, tucked under the desk blotter, a hand-drawn diagram of the house's pneumatic lines: a lever, wired to a valve two floors down.",
      icon: '📐',
    },
  },
  {
    id: 'journal',
    kind: 'observation',
    label: "Edmund's Journal",
    x: 0.4805,
    y: 0.7608,
    w: 0.2689,
    h: 0.1442,
    clue: {
      id: 'journalEntry',
      title: "Edmund's Journal",
      detail:
        'The last entry, dated the night he vanished: "The trouble is getting worse — I forget names now, sometimes my own. Before it takes the rest of me, I mean to disappear on my own terms, not have it decided for me. Silas knows where. No one else should." He wasn\'t taken. He left.',
      icon: '📓',
    },
  },
  {
    id: 'libraryPhoto',
    kind: 'observation',
    label: 'Case File Photo',
    x: 0.3162,
    y: 0.8356,
    w: 0.0954,
    h: 0.0855,
    clue: {
      id: 'libraryPhotoHalf',
      title: 'Torn Photograph — Upper Half',
      detail:
        "The upper half of a torn photograph, paperclipped inside Edmund's case file — two figures from the shoulders up, one of them unmistakably him, younger. Along the torn edge, more surviving words: \"Twenty-three...\" The rest is torn away.",
      icon: '📷',
    },
  },
  {
    id: 'lever',
    kind: 'comingSoon',
    label: 'Pneumatic Lever',
    x: 0.8157,
    y: 0.3092,
    w: 0.0503,
    h: 0.2458,
    requiresClueId: 'breakerDiagram',
    lockedHint: "A lever, but pulling it blind with no idea what it does seems like a bad idea.",
    message: 'A lever, wired into the wall — the other end of it is somewhere below.',
  },
  {
    id: 'stairsDown',
    kind: 'comingSoon',
    label: 'Passage Down',
    x: 0.605,
    y: 0.2986,
    w: 0.0662,
    h: 0.3847,
    message:
      "The stairs lead back down toward the cellar — but there's no way past the gate from this side. Whatever happens next happens down there.",
  },
];
