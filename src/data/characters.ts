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
