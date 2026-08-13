import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { IntroPanelVisual } from '../types/intro';
import { colors, radii, shadow } from '../theme';

interface Props {
  visual: IntroPanelVisual;
}

const PANEL_IMAGES: Record<IntroPanelVisual, ImageSource> = {
  deskSilhouette: require('../../assets/intro/1.jpg'),
  worriedSilhouette: require('../../assets/intro/2.jpg'),
  twoSilhouettesDoor: require('../../assets/intro/3.jpg'),
  clockCloseup: require('../../assets/intro/4.jpg'),
  emptyStudyNight: require('../../assets/intro/5.jpg'),
  stairSplit: require('../../assets/scenes/stair.png'),
};

export function IntroPanelArt({ visual }: Props) {
  return (
    <View style={styles.frame}>
      <Image source={PANEL_IMAGES[visual]} style={styles.image} contentFit="cover" transition={250} />
      <LinearGradient
        colors={['rgba(0,0,0,0.32)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']}
        locations={[0, 0.45, 1]}
        style={styles.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.innerBorder} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.ink,
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
});
