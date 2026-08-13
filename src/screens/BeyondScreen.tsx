import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen, CaseFileLabel, BodyText, Button } from '../components/ui';
import { leaveRoom } from '../services/rooms';
import { STAIR_DESTINATION_TEXT, STAIR_DESTINATION_FALLBACK } from '../data/characters';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Beyond'>;

// Landed on once both players have reached the stairwell and the local
// player taps Continue on GameScreen's stair reveal. A brief narrative beat
// (the character's own destination text) before continuing on into their
// half of the cellar/library puzzle — known characters route straight
// there; an unrecognized characterId (e.g. the dev solo-preview flow) has
// nowhere built to go, so it only offers Leave Room.
export function BeyondScreen({ route, navigation }: Props) {
  const { roomId, characterId } = route.params;
  const destinationText = (characterId && STAIR_DESTINATION_TEXT[characterId]) ?? STAIR_DESTINATION_FALLBACK;

  const handleLeave = async () => {
    await leaveRoom(roomId);
    navigation.popToTop();
  };

  const handleContinue = () => {
    if (characterId === 'inspector') navigation.replace('Cellar', { roomId, characterId });
    else if (characterId === 'associate') navigation.replace('Library', { roomId, characterId });
  };

  return (
    <Screen>
      <View style={styles.content}>
        <CaseFileLabel style={styles.label}>End of Case File</CaseFileLabel>
        <BodyText style={styles.text}>{destinationText}</BodyText>
        <View style={styles.actions}>
          {(characterId === 'inspector' || characterId === 'associate') && (
            <Button title="Continue" onPress={handleContinue} />
          )}
          <Button title="Leave Room" variant="secondary" onPress={handleLeave} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  label: { marginBottom: spacing.md },
  text: { textAlign: 'center', maxWidth: 480, marginBottom: spacing.xl },
  actions: { width: '100%', maxWidth: 320, gap: spacing.sm },
});
