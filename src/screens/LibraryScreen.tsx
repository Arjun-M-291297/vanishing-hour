import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { libraryHotspots } from '../data/library';
import { ClueEntry, Hotspot } from '../types/study';
import { HotspotLayer } from '../components/HotspotLayer';
import { ClueModal } from '../components/ClueModal';
import { NotebookSheet } from '../components/NotebookSheet';
import { Toast } from '../components/Toast';
import { CaseFileLabel, BodyText } from '../components/ui';
import { leaveRoom } from '../services/rooms';
import { markPuzzleSolvedRemote } from '../services/progress';
import { colors, fonts, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Library'>;

const LIBRARY_BG = require('../../assets/scenes/library.png');
// Not force-cropped to a round 2:1 like study.jpeg — the hotspot fractions
// here were drawn against library.png's own dimensions (1385x685), so the
// scene box is locked to that exact ratio instead.
const LIBRARY_ASPECT_RATIO = 1385 / 685;

// Pulling this is the one action in this room that leaves the room — it's
// what the Inspector's cellar valve (see CellarScreen) is waiting on.
const LEVER_HOTSPOT_ID = 'lever';

const clueRegistry: Record<string, ClueEntry> = Object.fromEntries(
  libraryHotspots
    .filter((h): h is Extract<Hotspot, { kind: 'observation' }> => h.kind === 'observation')
    .map((h) => [h.clue.id, h.clue])
);

export function LibraryScreen({ route, navigation }: Props) {
  const { roomId } = route.params;

  const [collectedClueIds, setCollectedClueIds] = useState<string[]>([]);
  const [solvedPuzzleIds, setSolvedPuzzleIds] = useState<string[]>([]);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [activeClue, setActiveClue] = useState<ClueEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const collectedClues = collectedClueIds.map((id) => clueRegistry[id]).filter((c): c is ClueEntry => Boolean(c));

  const handleObservation = (hotspot: Extract<Hotspot, { kind: 'observation' }>, alreadyFound: boolean) => {
    if (!alreadyFound) setCollectedClueIds((ids) => [...ids, hotspot.clue.id]);
    setActiveClue(hotspot.clue);
  };

  const handleComingSoon = (hotspot: Extract<Hotspot, { kind: 'comingSoon' }>) => {
    if (hotspot.id === LEVER_HOTSPOT_ID) {
      if (solvedPuzzleIds.includes(LEVER_HOTSPOT_ID)) {
        setToastMessage("The lever's already thrown — it won't move again.");
        return;
      }
      setSolvedPuzzleIds((ids) => [...ids, LEVER_HOTSPOT_ID]);
      markPuzzleSolvedRemote(roomId, LEVER_HOTSPOT_ID);
      setToastMessage('You throw the lever. Somewhere below, pipes groan and shift.');
      return;
    }
    setToastMessage(hotspot.message);
  };

  const handleLocked = (hotspot: Hotspot) => {
    setToastMessage(hotspot.lockedHint ?? 'Nothing happens. Not yet, anyway.');
  };

  const handleBack = () => {
    leaveRoom(roomId);
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} hitSlop={10} style={styles.topBtn}>
            <Text style={styles.topBtnText}>‹ Leave</Text>
          </Pressable>
          <View style={styles.sceneLabelBox}>
            <CaseFileLabel>The Upper Library</CaseFileLabel>
          </View>
          <Pressable onPress={() => setNotebookOpen(true)} hitSlop={10} style={styles.notebookBtn}>
            <Text style={styles.topBtnText}>📓 {collectedClues.length}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={[styles.sceneBox, { aspectRatio: LIBRARY_ASPECT_RATIO }]}>
            <Image source={LIBRARY_BG} style={styles.sceneImage} contentFit="cover" />
            <HotspotLayer
              hotspots={libraryHotspots}
              collectedClueIds={collectedClueIds}
              onObservation={handleObservation}
              onComingSoon={handleComingSoon}
              onNumberLock={() => {}}
              onSymbolLock={() => {}}
              onLocked={handleLocked}
            />
          </View>

          <View style={styles.descriptionBox}>
            <BodyText style={styles.description}>
              Quiet up here — just the smell of old paper and lamp oil. Whatever happened tonight, it started
              somewhere in this room too.
            </BodyText>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
      <NotebookSheet visible={notebookOpen} onClose={() => setNotebookOpen(false)} clues={collectedClues} />
      <ClueModal clue={activeClue} onDismiss={() => setActiveClue(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  overlay: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topBtn: { backgroundColor: 'rgba(11,15,20,0.7)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  notebookBtn: { backgroundColor: 'rgba(11,15,20,0.7)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  topBtnText: { color: colors.paper, fontFamily: fonts.display, fontSize: 12 },
  sceneLabelBox: { backgroundColor: 'rgba(11,15,20,0.7)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 8 },
  scrollView: { flex: 1, backgroundColor: colors.ink },
  scrollBody: { flexGrow: 1 },
  sceneBox: { width: '100%', overflow: 'hidden' },
  sceneImage: { width: '100%', height: '100%' },
  descriptionBox: {
    margin: spacing.md,
    backgroundColor: 'rgba(11,15,20,0.78)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  description: { fontSize: 13, color: colors.paperDim },
});
