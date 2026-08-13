import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NumberCipherPuzzle } from '../../types/study';
import { PuzzleShell } from './PuzzleShell';
import { colors, fonts, radii, spacing } from '../../theme';

interface Props {
  puzzle: NumberCipherPuzzle | null;
  onClose: () => void;
  onSolved: () => void;
  onMistake: () => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function NumberCipherModal({ puzzle, onClose, onSolved, onMistake }: Props) {
  const [entry, setEntry] = useState('');
  const [shakeSignal, setShakeSignal] = useState(0);
  const { height } = useWindowDimensions();
  const compact = height < 420;

  const targetLetters = useMemo(
    () => (puzzle ? puzzle.solution.replace(/[^A-Z]/gi, '').toUpperCase() : ''),
    [puzzle]
  );

  if (!puzzle) return null;

  const handleClose = () => {
    setEntry('');
    onClose();
  };

  const submit = (value: string) => {
    if (value === targetLetters) {
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

  const pressLetter = (letter: string) => {
    if (entry.length >= targetLetters.length) return;
    Haptics.selectionAsync();
    setEntry((e) => {
      const next = e + letter;
      if (next.length === targetLetters.length) setTimeout(() => submit(next), 150);
      return next;
    });
  };

  const backspace = () => {
    if (!entry) return;
    Haptics.selectionAsync();
    setEntry((e) => e.slice(0, -1));
  };

  // Walk cipherGroups alongside entry so each word's numbers line up with
  // however much of that word has been filled in so far, left to right.
  let consumed = 0;

  return (
    <PuzzleShell
      visible={Boolean(puzzle)}
      title={puzzle.puzzleTitle}
      flavorText={puzzle.flavorText}
      onClose={handleClose}
      shakeSignal={shakeSignal}
    >
      <View style={styles.groupsWrap}>
        {puzzle.cipherGroups.map((group, gi) => {
          const startIndex = consumed;
          consumed += group.length;
          return (
            <View key={gi} style={styles.wordGroup}>
              {group.map((num, ni) => {
                const filled = entry[startIndex + ni];
                return (
                  <View key={ni} style={[styles.numberCell, compact && styles.numberCellCompact]}>
                    <Text style={[styles.numberText, compact && styles.numberTextCompact]}>{num}</Text>
                    <View style={styles.cellRule} />
                    <Text style={[styles.letterText, compact && styles.letterTextCompact]}>{filled ?? ''}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={styles.alphabetGrid}>
        {ALPHABET.map((letter) => (
          <Pressable
            key={letter}
            style={[styles.letterKey, compact && styles.letterKeyCompact]}
            onPress={() => pressLetter(letter)}
          >
            <Text style={[styles.letterKeyText, compact && styles.letterKeyTextCompact]}>{letter}</Text>
          </Pressable>
        ))}
        <Pressable
          style={[styles.letterKey, styles.backspaceKey, compact && styles.letterKeyCompact]}
          onPress={backspace}
        >
          <Text style={[styles.letterKeyText, compact && styles.letterKeyTextCompact]}>⌫</Text>
        </Pressable>
      </View>
    </PuzzleShell>
  );
}

const styles = StyleSheet.create({
  groupsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  wordGroup: { flexDirection: 'row', gap: 4 },
  numberCell: { width: 26, alignItems: 'center' },
  numberCellCompact: { width: 21 },
  numberText: { color: colors.brassBright, fontFamily: fonts.display, fontSize: 13 },
  numberTextCompact: { fontSize: 11 },
  cellRule: { width: '100%', height: 1, backgroundColor: colors.border, marginVertical: 2 },
  letterText: { color: colors.paper, fontFamily: fonts.display, fontSize: 15 },
  letterTextCompact: { fontSize: 12 },
  alphabetGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5 },
  letterKey: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterKeyCompact: { width: 24, height: 24 },
  backspaceKey: { backgroundColor: colors.inkElevated, borderColor: colors.borderStrong },
  letterKeyText: { color: colors.paper, fontFamily: fonts.display, fontSize: 13 },
  letterKeyTextCompact: { fontSize: 11 },
});
