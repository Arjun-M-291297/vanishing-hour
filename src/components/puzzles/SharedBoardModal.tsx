import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SharedBoardHotspot } from '../../types/study';
import { PuzzleShell } from './PuzzleShell';
import { fetchSharedState, subscribeToSharedState, updateSharedState } from '../../services/sharedState';
import { colors, fonts, radii, spacing } from '../../theme';

type CharacterId = 'inspector' | 'associate';

interface Props {
  puzzle: SharedBoardHotspot | null;
  roomId: string;
  characterId: CharacterId | null;
  onClose: () => void;
  onSolved: () => void;
}

interface BoardState {
  inspector: string | null; // option id, or null if not picked yet
  associate: string | null;
}

const EMPTY_BOARD: BoardState = { inspector: null, associate: null };

// A discussion prompt, not a guess-and-check lock: either player can pick
// or change their pick freely, both picks are visible to both players live,
// and it only solves once both have landed on the SAME correct option —
// there's no penalty/shake for picking wrong, since the point is to talk it
// through together, not race to guess.
export function SharedBoardModal({ puzzle, roomId, characterId, onClose, onSolved }: Props) {
  const [board, setBoard] = useState<BoardState>(EMPTY_BOARD);
  const resolvedRef = useRef(false);

  const refresh = async () => {
    const row = await fetchSharedState(roomId);
    const picks = (row?.deduction_selections?.deductionBoard as Partial<BoardState>) ?? {};
    setBoard({ inspector: picks.inspector ?? null, associate: picks.associate ?? null });
  };

  useEffect(() => {
    if (!puzzle || !characterId) return;
    resolvedRef.current = false;
    refresh();
    return subscribeToSharedState(roomId, refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, roomId, characterId]);

  useEffect(() => {
    if (!puzzle || !characterId || resolvedRef.current) return;
    if (board.inspector === puzzle.solutionOptionId && board.associate === puzzle.solutionOptionId) {
      resolvedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSolved();
    }
  }, [board, puzzle, characterId, onSolved]);

  if (!puzzle || !characterId) return null;

  const partnerId: CharacterId = characterId === 'inspector' ? 'associate' : 'inspector';

  const pick = async (optionId: string) => {
    Haptics.selectionAsync();
    await updateSharedState(roomId, { deductionBoard: { [characterId]: optionId } });
  };

  return (
    <PuzzleShell
      visible={Boolean(puzzle)}
      title={puzzle.puzzleTitle}
      flavorText={puzzle.flavorText}
      onClose={onClose}
      shakeSignal={0}
    >
      {puzzle.options.map((option) => {
        const selfPicked = board[characterId] === option.id;
        const partnerPicked = board[partnerId] === option.id;
        return (
          <Pressable
            key={option.id}
            style={[styles.option, selfPicked && styles.optionSelected]}
            onPress={() => pick(option.id)}
          >
            <Text style={styles.optionLabel}>{option.label}</Text>
            <View style={styles.marks}>
              {selfPicked && <Text style={styles.mark}>You</Text>}
              {partnerPicked && <Text style={styles.mark}>Partner</Text>}
            </View>
          </Pressable>
        );
      })}
    </PuzzleShell>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  optionSelected: { borderColor: colors.brass },
  optionLabel: { fontFamily: fonts.serif, color: colors.paper, fontSize: 14, flexShrink: 1 },
  marks: { flexDirection: 'row', gap: spacing.xs },
  mark: {
    fontFamily: fonts.display,
    color: colors.brassBright,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
