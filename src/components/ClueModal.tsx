import React, { useEffect } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ClueEntry } from '../types/study';
import { Button } from './ui';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  clue: ClueEntry | null;
  onDismiss: () => void;
}

export function ClueModal({ clue, onDismiss }: Props) {
  // The app is landscape-locked, so height is the scarce dimension — a
  // small phone in landscape can be as short as ~320px. A compact,
  // side-by-side layout with a scrollable detail body keeps the card usable
  // there instead of overflowing or swallowing the whole screen.
  const { height } = useWindowDimensions();
  const compact = height < 420;

  useEffect(() => {
    if (clue) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [clue]);

  return (
    <Modal visible={Boolean(clue)} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { maxHeight: compact ? '90%' : '80%' }]}>
          <View style={styles.header}>
            <Text style={[styles.icon, compact && styles.iconCompact]}>{clue?.icon}</Text>
            <Text style={[styles.title, compact && styles.titleCompact]}>{clue?.title}</Text>
          </View>
          <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.detail, compact && styles.detailCompact]}>{clue?.detail}</Text>
          </ScrollView>
          <Button title="Add to Notebook" onPress={onDismiss} />
        </View>
      </View>
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
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  icon: { fontSize: 26 },
  iconCompact: { fontSize: 20 },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    color: colors.brassBright,
    fontSize: 15,
  },
  titleCompact: { fontSize: 13 },
  detailScroll: { flexGrow: 0, marginBottom: spacing.sm },
  detail: {
    fontFamily: fonts.serif,
    color: colors.paper,
    fontSize: 14,
    lineHeight: 20,
  },
  detailCompact: { fontSize: 12, lineHeight: 17 },
});
