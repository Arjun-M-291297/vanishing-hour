import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ClueEntry } from '../types/study';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  clues: ClueEntry[];
}

export function NotebookSheet({ visible, onClose, clues }: Props) {
  const translateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 400,
      useNativeDriver: true,
      friction: 9,
      tension: 60,
    }).start();
  }, [visible, translateY]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <Pressable style={styles.sheetBody} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>Detective's Notebook</Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {clues.length === 0 && (
                <Text style={styles.empty}>Nothing logged yet. Start looking around the room.</Text>
              )}
              {clues.map((clue) => (
                <View key={clue.id} style={styles.entry}>
                  <Text style={styles.entryIcon}>{clue.icon}</Text>
                  <View style={styles.entryText}>
                    <Text style={styles.entryTitle}>{clue.title}</Text>
                    <Text style={styles.entryDetail}>{clue.detail}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.inkElevated,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderBottomWidth: 0,
    maxHeight: '75%',
    // Without this, content taller than maxHeight just overflows the card
    // instead of clipping — which is also what was silently defeating the
    // ScrollView below (nothing bounded its height, so it grew to fit its
    // content like everything else instead of scrolling).
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  // flexShrink lets this (and the ScrollView inside it) actually shrink
  // below their natural content height once the sheet hits its maxHeight
  // cap, instead of the handle/title/list all just rendering at full size.
  sheetBody: { flexShrink: 1 },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.display, color: colors.brassBright, fontSize: 16, marginBottom: spacing.md, textAlign: 'center' },
  list: { flexShrink: 1 },
  listContent: { paddingBottom: spacing.sm },
  empty: { color: colors.paperDim, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg },
  entry: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryIcon: { fontSize: 22, width: 30 },
  entryText: { flex: 1 },
  entryTitle: { color: colors.paper, fontFamily: fonts.display, fontSize: 13, marginBottom: 2 },
  entryDetail: { color: colors.paperDim, fontSize: 13, lineHeight: 19 },
});
