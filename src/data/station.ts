import { Hotspot } from '../types/study';

// Chapter 3, Blackwood Station — Inspector's half (the platform/tracks
// side, reached via the tunnel from the Cellar's grill door). Same split
// pattern as Chapter 2 (Cellar/Library): each character gets their own
// scene, cross-referencing information the other one holds. The
// Associate's matching half (station house / ticket office) has no art
// yet, so their side of these puzzles isn't built.
//
// Coordinates drawn against station_platform.jpg (1456x720) using the
// hotspot annotator tool, verified against an overlay render before being
// wired in here — same discipline as every other scene in this project.
export const stationHotspots: Hotspot[] = [
  {
    id: 'platformNumber',
    kind: 'observation',
    label: 'Platform Number',
    x: 0.103,
    y: 0.2083,
    w: 0.0515,
    h: 0.0903,
    clue: {
      id: 'platformNumber',
      title: 'Platform Number',
      detail: 'A number stenciled on the pillar: 3. Whoever finds the departure board needs this.',
      icon: '🔢',
    },
  },
  {
    id: 'signalLamp',
    kind: 'syncSignal',
    label: 'Signal Lamp',
    x: 0.3888,
    y: 0.0389,
    w: 0.057,
    h: 0.6236,
    puzzleTitle: 'The Signal Lamp',
    flavorText:
      "A trackside signal lamp, its lever cold under your hand. It only means something if it's thrown at the exact same moment as its twin, somewhere down the line.",
    windowMs: 3000,
    successMessage: 'Both signals catch at once — a heartbeat of green light down the tracks.',
    missedMessage: "The timing's off. Try again — together, this time.",
  },
  {
    id: 'switchLevers',
    kind: 'symbolLock',
    label: 'Track Switch',
    x: 0.5874,
    y: 0.4653,
    w: 0.0996,
    h: 0.4583,
    puzzleTitle: 'Track Switch',
    flavorText:
      'Two hand levers control the switch ahead. Which one goes first depends on where the guard is right now — better ask your partner.',
    symbols: ['◀', '▶'],
    solution: ['▶', '◀'],
    successMessage: 'The switch clunks over. The path ahead is clear.',
  },
];
