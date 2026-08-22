import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SyncSignalHotspot } from '../../types/study';
import { PuzzleShell } from './PuzzleShell';
import { Button } from '../ui';
import { fetchSharedState, subscribeToSharedState, updateSharedState } from '../../services/sharedState';
import { colors, fonts, spacing } from '../../theme';

type CharacterId = 'inspector' | 'associate';

interface Props {
  puzzle: SyncSignalHotspot | null;
  roomId: string;
  characterId: CharacterId | null;
  onClose: () => void;
  onSolved: () => void;
}

interface SignalState {
  inspector: string | null; // ISO timestamp, or null if not armed
  associate: string | null;
}

const EMPTY_SIGNAL: SignalState = { inspector: null, associate: null };

// Both players see the SAME hotspot/puzzle definition, from their own
// character's point of view — arming writes only this player's own key
// into shared_case_state.deduction_selections.signalArmedAt, and every
// change (from either client) re-evaluates whether both are now armed
// close enough together to solve, or too far apart to count as a miss.
export function SyncSignalModal({ puzzle, roomId, characterId, onClose, onSolved }: Props) {
  const [signal, setSignal] = useState<SignalState>(EMPTY_SIGNAL);
  const [missed, setMissed] = useState(false);
  // Guards against the solved-effect firing twice (e.g. a second realtime
  // event landing before the parent has closed this modal in response to
  // the first onSolved call).
  const resolvedRef = useRef(false);

  const refresh = async () => {
    const row = await fetchSharedState(roomId);
    const armed = (row?.deduction_selections?.signalArmedAt as Partial<SignalState>) ?? {};
    setSignal({ inspector: armed.inspector ?? null, associate: armed.associate ?? null });
  };

  useEffect(() => {
    if (!puzzle || !characterId) return;
    resolvedRef.current = false;
    setMissed(false);
    refresh();
    return subscribeToSharedState(roomId, refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, roomId, characterId]);

  useEffect(() => {
    if (!puzzle || !characterId || resolvedRef.current) return;
    const { inspector, associate } = signal;
    if (!inspector || !associate) return;

    const diffMs = Math.abs(new Date(inspector).getTime() - new Date(associate).getTime());
    // Both armed — clear the shared flags either way so a retry after a
    // miss starts clean, rather than leaving a stale timestamp that could
    // immediately "solve" against the next arm.
    updateSharedState(roomId, { signalArmedAt: { inspector: null, associate: null } });

    if (diffMs <= puzzle.windowMs) {
      resolvedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSolved();
    } else {
      setMissed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [signal, puzzle, characterId, roomId, onSolved]);

  if (!puzzle || !characterId) return null;

  const selfArmed = Boolean(signal[characterId]);
  const partnerArmed = Boolean(signal[characterId === 'inspector' ? 'associate' : 'inspector']);

  const handleArm = async () => {
    Haptics.selectionAsync();
    setMissed(false);
    await updateSharedState(roomId, { signalArmedAt: { [characterId]: new Date().toISOString() } });
  };

  const statusText = missed
    ? puzzle.missedMessage
    : selfArmed
    ? 'Signal armed — waiting on your partner…'
    : partnerArmed
    ? 'Your partner is ready — arm now!'
    : 'Ready when you are.';

  return (
    <PuzzleShell
      visible={Boolean(puzzle)}
      title={puzzle.puzzleTitle}
      flavorText={puzzle.flavorText}
      onClose={onClose}
      shakeSignal={0}
    >
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
      <Button title={selfArmed ? 'Armed' : 'Arm Signal'} onPress={handleArm} disabled={selfArmed} />
    </PuzzleShell>
  );
}

const styles = StyleSheet.create({
  statusBox: { marginBottom: spacing.md, alignItems: 'center' },
  statusText: { fontFamily: fonts.serif, color: colors.paper, fontSize: 14, textAlign: 'center' },
});
