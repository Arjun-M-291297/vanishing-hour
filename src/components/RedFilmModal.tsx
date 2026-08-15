import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Button } from './ui';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  visible: boolean;
  imageSource: ImageSource;
  code: string;
  onDismiss: () => void;
}

const PHOTO_ASPECT_RATIO = 119 / 65;

export function RedFilmModal({ visible, imageSource, code, onDismiss }: Props) {
  useEffect(() => {
    if (visible) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Held to the Joined Page</Text>
          <View style={[styles.photoBox, { aspectRatio: PHOTO_ASPECT_RATIO }]}>
            <Image source={imageSource} style={styles.photo} contentFit="cover" />
            {/* The red film itself — a plain tint over the photo is enough
                to sell "holding red film against the page," no separate
                revealed-text art asset needed. */}
            <View style={styles.filmTint} pointerEvents="none" />
            <Text style={styles.code}>{code}</Text>
          </View>
          <Text style={styles.caption}>Held against the joined page, hidden text bleeds through.</Text>
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
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.brassBright,
    fontSize: 15,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  photoBox: {
    width: '100%',
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { position: 'absolute', width: '100%', height: '100%' },
  filmTint: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.rustBright,
    opacity: 0.45,
  },
  code: {
    fontFamily: fonts.display,
    color: colors.paper,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    fontFamily: fonts.serif,
    color: colors.paperDim,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
