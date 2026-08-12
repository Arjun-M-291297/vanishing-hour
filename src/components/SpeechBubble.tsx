import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface Props {
  speaker: string;
  speech: string;
}

// Inline dialogue quote — brass accent rule + speaker label — meant to sit
// in a text column next to the image, not float over it.
export function SpeechBubble({ speaker, speech }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.speaker}>{speaker.toUpperCase()}</Text>
      <Text style={styles.speech}>"{speech}"</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderLeftWidth: 3,
    borderLeftColor: colors.brass,
    paddingLeft: spacing.md,
  },
  speaker: {
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.8,
    color: colors.brassBright,
    marginBottom: 4,
  },
  speech: {
    fontFamily: fonts.serif,
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 25,
    color: colors.paper,
  },
});
