import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MemorizeSequencePuzzle } from '../../types/study';
import { PuzzleShell } from './PuzzleShell';
import { colors, fonts, spacing } from '../../theme';

interface Props {
  puzzle: MemorizeSequencePuzzle | null;
  onDone: () => void;
}

/** Not a puzzle to solve here — just a timed reveal. Auto-closes itself
 * (calling onDone) once revealMs elapses; closing early via the shell's ✕
 * ends the reveal the same way, just sooner. */
export function MemorizeModal({ puzzle, onDone }: Props) {
  const { height } = useWindowDimensions();
  const compact = height < 420;
  const [remainingMs, setRemainingMs] = useState(puzzle?.revealMs ?? 0);

  useEffect(() => {
    if (!puzzle) return;
    setRemainingMs(puzzle.revealMs);
    const start = Date.now();
    const interval = setInterval(() => {
      setRemainingMs(Math.max(0, puzzle.revealMs - (Date.now() - start)));
    }, 100);
    const timeout = setTimeout(onDone, puzzle.revealMs);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle]);

  if (!puzzle) return null;

  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <PuzzleShell visible={Boolean(puzzle)} title={puzzle.title} flavorText={puzzle.flavorText} onClose={onDone} shakeSignal={0}>
      <View style={styles.symbolRow}>
        {puzzle.symbols.map((symbol, i) => (
          <Text key={i} style={[styles.symbol, compact && styles.symbolCompact]}>
            {symbol}
          </Text>
        ))}
      </View>
      <Text style={styles.timer}>{secondsLeft > 0 ? `Fading in ${secondsLeft}…` : 'Gone.'}</Text>
    </PuzzleShell>
  );
}

const styles = StyleSheet.create({
  symbolRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.md },
  symbol: { fontSize: 36 },
  symbolCompact: { fontSize: 26 },
  timer: {
    color: colors.paperDim,
    fontFamily: fonts.display,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
