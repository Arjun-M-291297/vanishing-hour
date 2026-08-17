import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Realtime subscriptions only stream events from the moment they're (re)
// opened — they don't replay whatever happened while the app was
// backgrounded (screen locked, switched away), and React Native's own JS
// engine throttles/suspends timers and can drop the underlying WebSocket
// during that time anyway. So anything waiting on a partner's remote state
// needs an explicit re-check on return to the foreground rather than
// trusting the subscription to have silently caught up. Call this
// unconditionally at each screen's top level (not nested inside another
// effect) — the callback itself decides whether there's anything to do.
export function useAppForeground(onForeground: () => void): void {
  const callbackRef = useRef(onForeground);
  callbackRef.current = onForeground;

  useEffect(() => {
    let current: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (current.match(/inactive|background/) && next === 'active') {
        callbackRef.current();
      }
      current = next;
    });
    return () => subscription.remove();
  }, []);
}
