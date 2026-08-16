import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaseFileLabel, BodyText, Button } from './ui';
import { colors, radii, shadow, spacing } from '../theme';

interface Props {
  visible: boolean;
  imageSource: ImageSource;
  label: string;
  caption: string;
  onContinue: () => void;
}

// A brief narrative beat between puzzle states. Same image-column + rule +
// text-column layout as GameScreen's stairRevealed panel and the intro
// slides (landscape-locked, so side-by-side reads better than stacking),
// and the same framed/vignetted image treatment as IntroPanelArt — this is
// the same kind of one-shot story panel, just triggered mid-gameplay
// instead of during the fixed intro sequence.
export function RevelationOverlay({ visible, imageSource, label, caption, onContinue }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <View style={styles.imageCol}>
            <View style={styles.frame}>
              <Image source={imageSource} style={styles.image} contentFit="cover" transition={250} />
              <LinearGradient
                colors={['rgba(0,0,0,0.32)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']}
                locations={[0, 0.45, 1]}
                style={styles.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.innerBorder} pointerEvents="none" />
            </View>
          </View>

          <View style={styles.rule} />

          <View style={styles.textCol}>
            <CaseFileLabel style={styles.label}>{label}</CaseFileLabel>
            <BodyText style={styles.caption}>{caption}</BodyText>
            <Button title="Continue" onPress={onContinue} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink },
  safe: { flex: 1 },
  body: { flex: 1, flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.lg },
  imageCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.inkRaised,
    ...shadow.card,
  },
  image: { width: '100%', height: '100%' },
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  innerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,154,82,0.18)',
  },
  rule: { width: 1, backgroundColor: colors.border },
  textCol: { flex: 1, justifyContent: 'center' },
  label: { marginBottom: spacing.sm },
  caption: { marginBottom: spacing.md },
});
