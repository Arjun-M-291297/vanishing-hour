import { Asset } from 'expo-asset';
import { Image } from 'expo-image';

// Warms expo-image's cache for a set of require()'d local assets, so a
// later state-driven source swap (background variant, narrative panel)
// doesn't pay the fetch/decode cost the first time it's actually shown.
// expo-image's Image.prefetch takes URLs, not require() module ids, so
// each one is resolved through expo-asset first — react-native core's own
// Image.resolveAssetSource looked like the obvious tool for this, but
// react-native-web's Image doesn't implement that static at all (it only
// has getSize/prefetch/queryCache), so it throws under web builds.
// Asset.fromModule handles the web-vs-native resolution difference
// internally and exposes a real URI synchronously via `.uri`.
export function prefetchImages(modules: number[]): void {
  const uris = modules.map((m) => Asset.fromModule(m).uri).filter((uri): uri is string => Boolean(uri));
  if (uris.length) Image.prefetch(uris);
}
