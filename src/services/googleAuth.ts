import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Same strategy as the single-player prototype: Expo's current guidance (SDK 57)
// points production apps at native libraries (@react-native-google-signin/google-signin),
// which need a custom dev build. This uses the generic expo-auth-session OAuth flow
// against Google's discovery document instead, requesting an ID token to hand off to
// Supabase's signInWithIdToken -- and it still works inside Expo Go. Swap for the
// native Google Sign-In library before a store release.

WebBrowser.maybeCompleteAuthSession();

const googleConfig = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.[
  'googleAuth'
] as { iosClientId?: string; androidClientId?: string; webClientId?: string } | undefined;

export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    googleConfig &&
      (googleConfig.iosClientId || googleConfig.androidClientId || googleConfig.webClientId)
  );
}

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Built fresh per call (not via the useAuthRequest hook) because the nonce
// must be unique per sign-in attempt, and the hook memoizes its request
// config once. Supabase's signInWithIdToken wants the *raw* nonce back, but
// Google's authorization request must carry its SHA-256 hash -- that's what
// stops a stolen ID token from being replayed against this app.
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!isGoogleAuthConfigured()) {
    return { error: 'Google sign-in is not configured yet (see SETUP.md).' };
  }
  const clientId =
    googleConfig?.webClientId ?? googleConfig?.androidClientId ?? googleConfig?.iosClientId ?? '';

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: AuthSession.makeRedirectUri({ scheme: 'vanishinghourduo' }),
    responseType: AuthSession.ResponseType.IdToken,
    usePKCE: false,
    extraParams: { nonce: hashedNonce },
  });

  const result = await request.promptAsync(discovery);
  if (result.type !== 'success') return { error: null }; // user cancelled — not an error to surface

  const idToken = (result.params as Record<string, string>)?.id_token;
  if (!idToken) return { error: 'Google did not return an ID token.' };

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    nonce: rawNonce,
  });
  return { error: error?.message ?? null };
}
