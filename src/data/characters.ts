// Placeholder roster for the lobby's character-select step. Only the ids and
// starting-scene split matter structurally right now (asymmetric co-op: two
// players, two different starting rooms); names/flavor are stand-ins until
// the duo case content itself gets designed.
export interface CharacterOption {
  id: string;
  label: string;
  tagline: string;
  startingSceneId: string;
}

export const CHARACTER_OPTIONS: CharacterOption[] = [
  {
    id: 'inspector',
    label: 'The Inspector',
    tagline: 'Starts in the Study, where Edmund was last seen.',
    startingSceneId: 'study',
  },
  {
    id: 'associate',
    label: 'The Associate',
    tagline: 'Starts elsewhere in the house, working the other half of the case.',
    startingSceneId: 'parlor',
  },
];

// Where each character ends up once both players reach the stairwell behind
// the third shelf (see GameScreen/BeyondScreen) — the split itself (up to
// the library, down below the floor) is real content; what's actually in
// either destination isn't built yet. Keyed by CharacterOption.id.
export const STAIR_DESTINATION_TEXT: Record<string, string> = {
  associate:
    "The stairs climb up and up, opening onto a long-forgotten library — rows of shelves vanishing into the dark overhead. You step inside. What's up there isn't built yet.",
  inspector:
    "The stairs drop away beneath your feet, past the house's foundation stones, into a cellar carved below the floor. You descend alone. What's down there isn't built yet.",
};
export const STAIR_DESTINATION_FALLBACK = "You're through. What lies beyond isn't built yet.";
