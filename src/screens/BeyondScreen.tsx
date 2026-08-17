import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen, CaseFileLabel, BodyText, Button } from '../components/ui';
import { leaveRoom } from '../services/rooms';
import { STAIR_DESTINATION_FALLBACK } from '../data/characters';
import { spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Beyond'>;

// Reached only when GameScreen's stair reveal can't route the local player
// anywhere real — i.e. an unrecognized characterId (the dev solo-preview
// flow), which has no cellar/library half of its own. Inspector and
// Associate route straight to Cellar/Library from GameScreen instead of
// passing through here.
export function BeyondScreen({ route, navigation }: Props) {
  const { roomId } = route.params;

  const handleLeave = async () => {
    await leaveRoom(roomId);
    navigation.popToTop();
  };

  return (
    <Screen>
      <View style={styles.content}>
        <CaseFileLabel style={styles.label}>End of Case File</CaseFileLabel>
        <BodyText style={styles.text}>{STAIR_DESTINATION_FALLBACK}</BodyText>
        <View style={styles.actions}>
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
