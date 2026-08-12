export type IntroPanelVisual =
  | 'deskSilhouette'
  | 'worriedSilhouette'
  | 'twoSilhouettesDoor'
  | 'clockCloseup'
  | 'emptyStudyNight';

export interface IntroSlide {
  id: string;
  visual: IntroPanelVisual;
  /** big typewriter title card, e.g. "TONIGHT" — omit for slides that are pure scene/dialogue */
  title?: string;
  /** who's speaking — omit for caption-only slides */
  speaker?: string;
  /** speech bubble line */
  speech?: string;
  /** smaller narrative line under the visual, shown with or without a speech bubble */
  caption?: string;
}
