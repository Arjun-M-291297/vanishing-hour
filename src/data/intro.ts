import { IntroSlide } from '../types/intro';

// Cold open shown to both players together, right after both are ready in
// the room — before they diverge into their separate scene tracks. Same
// content as the single-player prototype's intro: it sets up Edmund as a
// person (and plants why the clock matters) without hinting at either
// player's individual half of the case.
export const introSlides: IntroSlide[] = [
  {
    id: 'slide1',
    visual: 'deskSilhouette',
    caption:
      'Edmund Voss built a life on precision — wealth, reputation, a private study no one entered uninvited. Then his luck turned: reckless bets, a fortune draining away. Only two people held a key to that room — his housekeeper Mara, and his brother Silas.',
  },
  {
    id: 'slide2',
    visual: 'worriedSilhouette',
    speaker: 'Edmund',
    speech: 'I keep losing pieces of the day. Just... gone.',
    caption:
      "He told no one — not even his brother. But Mara had started watching him closely. She'd waited years for the partnership he kept promising her. Lately, waiting felt like all she'd ever get.",
  },
  {
    id: 'slide3',
    visual: 'twoSilhouettesDoor',
    speaker: 'Silas',
    speech: "You're not answering your letters, Edmund.",
    caption:
      'Edmund had borrowed money from his brother, back when he thought his luck would turn. Now Silas wanted it back.',
  },
  {
    id: 'slide4',
    visual: 'clockCloseup',
    speaker: 'Edmund',
    speech: "If I forget everything else tonight... let this be the one thing I don't.",
    caption: 'He needed a way to remember. He never dreamed anyone else would need to.',
  },
  {
    id: 'slide5',
    visual: 'emptyStudyNight',
    title: 'TONIGHT',
    caption:
      'Edmund Voss is gone. Only two people came by tonight — Mara, bringing supper as always, and Silas, back one last time to ask for his money.',
  },
];
