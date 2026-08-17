// Lets you preview either journey solo (skipping room creation/pairing) and
// skip the whole puzzle chain via a dev-only button, for fast iteration
// while the two tracks are being built out. Tied to __DEV__ (true in a
// dev/Metro build, false in any production/release build) rather than a
// manually-flipped constant, so there's no risk of it accidentally
// shipping enabled in a real release.
export const DEV_SOLO_PREVIEW = __DEV__;
