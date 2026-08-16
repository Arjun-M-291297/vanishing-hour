import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button } from './ui';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  visible: boolean;
  /** Identifies which puzzle stage these hints belong to — revealed count
   * resets whenever this changes, so moving on to a new stage always
   * starts fresh at hint 1, but re-opening on the SAME stage keeps
   * whatever was already revealed. */
  stageKey: string;
  title: string;
  hints: string[];
  onDismiss: () => void;
}

// No in-modal "reveal" control — each press of the hint button that opens
// this (a closed->open transition of `visible`) reveals one more hint, so
// the button the player already knows about (the 💡 in the top bar) is the
// only control needed. Tracked via refs rather than a dependency-array
// effect since it has to distinguish "stage changed" from "reopened on the
// same stage" even when both happen to change in the same render.
export function HintModal({ visible, stageKey, title, hints, onDismiss }: Props) {
  const [revealedCount, setRevealedCount] = useState(0);
  const prev = useRef({ stageKey, visible: false });

  useEffect(() => {
    const stageChanged = prev.current.stageKey !== stageKey;
    const justOpened = visible && !prev.current.visible;
    if (stageChanged) {
      setRevealedCount(justOpened ? 1 : 0);
      if (justOpened) Haptics.selectionAsync();
    } else if (justOpened) {
      setRevealedCount((n) => Math.min(n + 1, hints.length));
      Haptics.selectionAsync();
    }
    prev.current = { stageKey, visible };
  }, [stageKey, visible, hints.length]);

  const hasMore = revealedCount < hints.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.icon}>💡</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.progress}>
              {revealedCount}/{hints.length}
            </Text>
          </View>
          <ScrollView style={styles.hintScroll} showsVerticalScrollIndicator={false}>
            {hints.slice(0, revealedCount).map((hint, i) => (
              <View key={i} style={styles.hintRow}>
                <Text style={styles.hintNumber}>{i + 1}</Text>
                <Text style={styles.hintText}>{hint}</Text>
              </View>
            ))}
          </ScrollView>
          {/* {hasMore && <Text style={styles.moreHint}>Tap the hint button again for another hint.</Text>} */}
          <Button title="Close" onPress={onDismiss} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  icon: { fontSize: 22 },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    color: colors.brassBright,
    fontSize: 14,
  },
  progress: {
    fontFamily: fonts.display,
    fontVariant: ['tabular-nums'],
    color: colors.paperDim,
    fontSize: 12,
    backgroundColor: colors.inkRaised,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  hintScroll: { flexGrow: 0, marginBottom: spacing.sm },
  hintRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  hintNumber: {
    fontFamily: fonts.display,
    color: colors.brass,
    fontSize: 13,
    width: 18,
  },
  hintText: {
    flex: 1,
    fontFamily: fonts.serif,
    color: colors.paper,
    fontSize: 14,
    lineHeight: 20,
  },
  moreHint: {
    fontFamily: fonts.serif,
    fontStyle: 'italic',
    color: colors.paperDim,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
});
