import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen, Heading, BodyText, CaseFileLabel } from '../components/ui';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

// Placeholder: both players land here once the room flips to 'active'. The
// actual scene/hotspot/puzzle engine (ported and split into two parallel
// tracks per src/data/characters.ts) is the next slice of work, not part of
// this foundation pass.
export function GameScreen({ route }: Props) {
  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <CaseFileLabel>Room {route.params.roomId.slice(0, 8)}</CaseFileLabel>
        <Heading style={styles.title}>The case begins.</Heading>
        <BodyText>
          Both detectives are in. This is where each player's scene/puzzle track picks up — not built yet in this
          foundation pass.
        </BodyText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 480, paddingHorizontal: spacing.xl, gap: spacing.sm },
  title: { fontSize: 20 },
});
