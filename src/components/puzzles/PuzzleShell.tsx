import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts, radii, spacing } from '../../theme';

interface Props {
  visible: boolean;
  title: string;
  flavorText: string;
  onClose: () => void;
  children: React.ReactNode;
  shakeSignal: number; // increment to trigger a shake
}

export function PuzzleShell({ visible, title, flavorText, onClose, children, shakeSignal }: Props) {
  const shake = useRef(new Animated.Value(0)).current;
  // Landscape-locked app — a small phone in landscape can be ~320px tall, so
  // the card trims its own padding/type instead of relying on the modal to
  // scroll the whole thing.
  const { height } = useWindowDimensions();
  const compact = height < 420;

  useEffect(() => {
    if (shakeSignal === 0) return;
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeSignal, shake]);

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { maxHeight: compact ? '92%' : '85%', transform: [{ translateX }] }]}>
          <Pressable onPress={onClose} style={styles.close} hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          {/* Title, flavor text, and the puzzle body (e.g. a keypad with
              fixed-size keys) all scroll together as one unit, clipped to
              the card's own bounds — otherwise a tall puzzle body has
              nowhere to go but visually past the card's rounded border on
              short mobile screens. */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
            <Text style={[styles.flavor, compact && styles.flavorCompact]}>{flavorText}</Text>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    overflow: 'hidden',
  },
  scrollBody: { flexGrow: 1 },
  close: { position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 1, padding: spacing.xs },
  closeText: { color: colors.paperDim, fontSize: 16 },
  title: { fontFamily: fonts.display, color: colors.brassBright, fontSize: 15, marginBottom: spacing.xs, paddingRight: spacing.lg },
  titleCompact: { fontSize: 13 },
  flavor: { fontFamily: fonts.serif, color: colors.paperDim, fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
  flavorCompact: { fontSize: 11, lineHeight: 16 },
});
