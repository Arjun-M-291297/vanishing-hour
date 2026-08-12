import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  session: Session | null;
  initializing: boolean;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initializing: true,
  signOut: async () => {
    await supabase.auth.signOut();
  },
}));

// Runs once at module load: seeds the store with whatever session Supabase
// already has persisted, then keeps it in sync as sign-in/refresh/sign-out
// events come in for the lifetime of the app.
supabase.auth.getSession().then(({ data }) => {
  useAuthStore.setState({ session: data.session, initializing: false });
});

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({ session, initializing: false });
});
