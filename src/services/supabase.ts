import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// EXPO_PUBLIC_-prefixed vars are inlined at build time by the Expo CLI — see
// .env.example. They're safe to ship in the client bundle: the anon key is
// meant to be public, and every table it can touch is locked down by Row
// Level Security policies (see supabase/migrations). The service-role key
// must never appear here or anywhere else in this app.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values (see SETUP.md).'
  );
}

// AsyncStorage, not expo-secure-store: SecureStore caps values at ~2048 bytes
// (Android Keystore-backed), and a Supabase session blob (access + refresh
// JWT + user metadata) regularly exceeds that, causing silent write failures.
// This is Supabase's own documented React Native pattern. Hardening this
// further (encrypting the blob with a SecureStore-held key) is a reasonable
// follow-up once the app is past the foundation stage.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
