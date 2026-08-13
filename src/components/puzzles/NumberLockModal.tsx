import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NumberLockHotspot } from '../../types/study';
import { PuzzleShell } from './PuzzleShell';
import { colors, fonts, radii, spacing } from '../../theme';

interface Props {
  puzzle: NumberLockHotspot | null;
  onClose: () => void;
  onSolved: () => void;
  onMistake: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];

export function NumberLockModal({ puzzle, onClose, onSolved, onMistake }: Props) {
  const [entry, setEntry] = useState('');
  const [shakeSignal, setShakeSignal] = useState(0);
  const { height } = useWindowDimensions();
  const compact = height < 420;

  if (!puzzle) return null;
  const digits = puzzle.solution.length;

  const handleClose = () => {
    setEntry('');
    onClose();
  };

  const submit = (value: string) => {
    if (value === puzzle.solution) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEntry('');
      onSolved();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShakeSignal((n) => n + 1);
      onMistake();
      setEntry('');
    }
  };

  const press = (key: string) => {
    if (key === '⌫') {
      setEntry((e) => e.slice(0, -1));
      return;
    }
    if (key === '✓') {
      if (entry.length === digits) submit(entry);
      return;
    }
    Haptics.selectionAsync();
    setEntry((e) => {
      const next = e.length < digits ? e + key : e;
      if (next.length === digits) setTimeout(() => submit(next), 120);
      return next;
    });
  };

  return (
    <PuzzleShell
      visible={Boolean(puzzle)}
      title={puzzle.puzzleTitle}
      flavorText={puzzle.flavorText}
      onClose={handleClose}
      shakeSignal={shakeSignal}
    >
      <View style={styles.digitsRow}>
        {Array.from({ length: digits }).map((_, i) => (
          <View key={i} style={[styles.digitBox, compact && styles.digitBoxCompact]}>
            <Text style={[styles.digitText, compact && styles.digitTextCompact]}>{entry[i] ?? ''}</Text>
          </View>
        ))}
      </View>
      <View style={styles.keypad}>
        {KEYS.map((key) => (
          <Pressable key={key} style={[styles.key, compact && styles.keyCompact]} onPress={() => press(key)}>
            <Text style={[styles.keyText, compact && styles.keyTextCompact]}>{key}</Text>
          </Pressable>
        ))}
      </View>
    </PuzzleShell>
  );
}

const styles = StyleSheet.create({
  digitsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
  digitBox: {
    width: 40,
    height: 48,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxCompact: { width: 32, height: 38 },
  digitText: { color: colors.paper, fontFamily: fonts.display, fontSize: 20 },
  digitTextCompact: { fontSize: 16 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  key: {
    width: '28%',
    aspectRatio: 1.8,
    borderRadius: radii.sm,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCompact: { aspectRatio: 2.4 },
  keyText: { color: colors.paper, fontFamily: fonts.display, fontSize: 16 },
  keyTextCompact: { fontSize: 13 },
});
