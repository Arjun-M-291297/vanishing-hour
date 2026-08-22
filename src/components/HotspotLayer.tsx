import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Hotspot } from '../types/study';

interface Props {
  hotspots: Hotspot[];
  collectedClueIds: string[];
  onObservation: (hotspot: Extract<Hotspot, { kind: 'observation' }>, alreadyFound: boolean) => void;
  onComingSoon: (hotspot: Extract<Hotspot, { kind: 'comingSoon' }>) => void;
  onNumberLock: (hotspot: Extract<Hotspot, { kind: 'numberLock' }>) => void;
  onSymbolLock: (hotspot: Extract<Hotspot, { kind: 'symbolLock' }>) => void;
  onSyncSignal?: (hotspot: Extract<Hotspot, { kind: 'syncSignal' }>) => void;
  onSharedBoard?: (hotspot: Extract<Hotspot, { kind: 'sharedBoard' }>) => void;
  onLocked: (hotspot: Hotspot) => void;
}

// Hotspots are positioned with plain percentage strings, not pixels computed
// from a measured parent size — Yoga (RN's layout engine) resolves
// percentages against the parent directly, no JS measurement needed (an
// earlier version tried measuring via onLayout, which never fired on web
// for this box's shape). This is only correct as long as the box the image
// renders into is always displayed at the photo's own aspect ratio
// (letterboxed, never cropped) — study.jpeg is cropped to exactly 2:1 and
// the scene box is always sized to that same 2:1 ratio for exactly this
// reason, so hotspot fractions never need runtime crop compensation.
export function HotspotLayer({
  hotspots,
  collectedClueIds,
  onObservation,
  onComingSoon,
  onNumberLock,
  onSymbolLock,
  onSyncSignal,
  onSharedBoard,
  onLocked,
}: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hotspots.map((hotspot) => {
        const unlocked = !hotspot.requiresClueId || collectedClueIds.includes(hotspot.requiresClueId);
        if (!unlocked && hotspot.silentLock) return null;

        const alreadyFound = hotspot.kind === 'observation' && collectedClueIds.includes(hotspot.clue.id);

        const handlePress = () => {
          if (!unlocked) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onLocked(hotspot);
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (hotspot.kind === 'observation') onObservation(hotspot, alreadyFound);
          else if (hotspot.kind === 'numberLock') onNumberLock(hotspot);
          else if (hotspot.kind === 'symbolLock') onSymbolLock(hotspot);
          else if (hotspot.kind === 'syncSignal') onSyncSignal?.(hotspot);
          else if (hotspot.kind === 'sharedBoard') onSharedBoard?.(hotspot);
          else onComingSoon(hotspot);
        };

        return (
          <HotspotTouchable
            key={hotspot.id}
            left={`${hotspot.x * 100}%`}
            top={`${hotspot.y * 100}%`}
            width={`${hotspot.w * 100}%`}
            height={`${hotspot.h * 100}%`}
            onPress={handlePress}
          />
        );
      })}
    </View>
  );
}

/** A single hotspot's invisible touch target — no visual feedback on press. */
function HotspotTouchable({
  left,
  top,
  width,
  height,
  onPress,
}: {
  left: `${number}%`;
  top: `${number}%`;
  width: `${number}%`;
  height: `${number}%`;
  onPress: () => void;
}) {
  const positionStyle: ViewStyle = { left, top, width, height };

  return <Pressable onPress={onPress} style={[styles.hotspot, positionStyle]} hitSlop={4} />;
}

const styles = StyleSheet.create({
  hotspot: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
