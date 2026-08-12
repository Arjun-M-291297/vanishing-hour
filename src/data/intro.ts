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
      'Edmund Voss had spent thirty years building a life that ran on precision — a fortune, a reputation, a study no one entered uninvited. Then, for reasons he never spoke of, the precision slipped: reckless wagers, a fortune bleeding out one bet at a time. By the end, only two people besides himself held a key to that room — his housekeeper, Mara, and his brother, Silas. He trusted very little to memory, and even less to anyone else.',
  },
  {
    id: 'slide2',
    visual: 'worriedSilhouette',
    speaker: 'Edmund',
    speech: 'I keep losing pieces of the day. Just... gone.',
    caption:
      "He told no one. Not even his brother. But Mara had started watching him more closely than a housekeeper should — she'd waited years for the partnership he kept promising her, and lately, waiting was starting to look like all she'd ever get.",
  },
  {
    id: 'slide3',
    visual: 'twoSilhouettesDoor',
    speaker: 'Silas',
    speech: "You're not answering your letters, Edmund.",
    caption:
      "Some doors, once closed, are hard to explain. Edmund had borrowed a small fortune from his brother, back when the wagers still felt like they'd turn around. Silas had his own reasons for wanting this one open.",
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
      'Edmund Voss is gone. The room remembers more than he could. Only two people crossed that threshold tonight — Mara, bringing supper as always, and Silas, come one last time to ask for his money back.',
  },
];
