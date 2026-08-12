import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../navigation/types';
import { introSlides } from '../data/intro';
import { IntroPanelArt } from '../components/IntroPanelArt';
import { SpeechBubble } from '../components/SpeechBubble';
import { Button, BodyText } from '../components/ui';
import { colors, fonts, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Intro'>;

// Shown to both players independently, right after both are ready in the
// room and before they diverge into their own scene tracks — same content
// for both (not per-character), each player clicking through at their own
// pace. Not synchronized turn-by-turn: it's a shared cold open, not a
// lockstep cutscene.
export function IntroScreen({ route, navigation }: Props) {
  const { roomId } = route.params;
  const [index, setIndex] = useState(0);
  const slide = introSlides[index];
  const isLast = index === introSlides.length - 1;
  const total = introSlides.length;

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;
  const slideX = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    fade.setValue(0);
    rise.setValue(10);
    slideX.setValue(24);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 380, useNativeDriver: true }),
      Animated.timing(slideX, { toValue: 0, duration: 460, useNativeDriver: true }),
    ]).start();
  }, [index, fade, rise, slideX]);

  const finish = () => {
    navigation.replace('Game', { roomId });
  };

  const advance = () => {
    Haptics.selectionAsync();
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  const goBack = () => {
    Haptics.selectionAsync();
    if (index > 0) setIndex((i) => i - 1);
    else navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={10} style={styles.sideSlot}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.caseLabel} numberOfLines={1}>
              Case No. 001 — The Voss Study
            </Text>
            <View style={styles.dotsRow}>
              {introSlides.map((s, i) => (
                <View
                  key={s.id}
                  style={[styles.dot, i === index && styles.dotActive, i < index && styles.dotPast]}
                />
              ))}
            </View>
          </View>

          <Pressable onPress={finish} hitSlop={10} style={[styles.sideSlot, styles.sideSlotRight]}>
            <Text style={styles.skip}>Skip ›</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Animated.View style={[styles.imageCol, { opacity: fade, transform: [{ translateY: rise }] }]}>
            <Pressable style={styles.imagePress} onPress={advance}>
              <IntroPanelArt visual={slide.visual} />
              <View style={styles.slideBadge} pointerEvents="none">
                <Text style={styles.slideBadgeText}>
                  {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                </Text>
              </View>
            </Pressable>
          </Animated.View>

          <View style={styles.rule} />

          <Animated.View style={[styles.descCol, { opacity: fade, transform: [{ translateX: slideX }] }]}>
            <ScrollView contentContainerStyle={styles.descScroll} showsVerticalScrollIndicator={false}>
              {slide.title && <Text style={styles.title}>{slide.title}</Text>}
              {slide.speaker && slide.speech && (
                <View style={styles.bubbleSpacer}>
                  <SpeechBubble speaker={slide.speaker} speech={slide.speech} />
                </View>
              )}
              {slide.caption && <BodyText style={styles.caption}>{slide.caption}</BodyText>}
            </ScrollView>

            <View style={styles.footer}>
              <Button title={isLast ? 'Begin Investigation' : 'Continue'} onPress={advance} />
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sideSlot: { minWidth: 64, justifyContent: 'center' },
  sideSlotRight: { alignItems: 'flex-end' },
  backText: { color: colors.paperDim, fontFamily: fonts.display, fontSize: 12, letterSpacing: 1 },
  skip: { color: colors.paperDim, fontFamily: fonts.display, fontSize: 12, letterSpacing: 1 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 6 },
  caseLabel: {
    fontFamily: fonts.display,
    color: colors.brass,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotPast: { backgroundColor: colors.brassDim },
  dotActive: { backgroundColor: colors.brassBright, width: 16 },

  body: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  imageCol: { flex: 1 },
  imagePress: { flex: 1, position: 'relative' },
  slideBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(11,15,20,0.68)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  slideBadgeText: {
    fontFamily: fonts.display,
    color: colors.brassBright,
    fontSize: 10,
    letterSpacing: 1,
  },

  rule: { width: 1, backgroundColor: colors.border },

  descCol: { flex: 1, justifyContent: 'space-between' },
  descScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.sm },
  title: {
    fontFamily: fonts.display,
    color: colors.brassBright,
    fontSize: 20,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  bubbleSpacer: { marginBottom: spacing.md },
  caption: { fontSize: 14, fontStyle: 'italic', lineHeight: 21, opacity: 0.85 },
  footer: { paddingTop: spacing.sm },
});
