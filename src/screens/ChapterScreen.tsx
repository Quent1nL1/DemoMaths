// src/screens/ChapterScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import Checkbox from 'expo-checkbox';
import { useProgress } from '../store/useProgress';
import { useSettings } from '../store/useSettings';
import { getAllDemos } from '../lib/dataSource';
import type { Demo } from '../store/useCustomData';
import { useNavigation } from '@react-navigation/native';

export default function ChapterScreen({ route }: any) {
  const { chapter } = route.params as { chapter: { id: string; title: string } };
  const themeColor = useSettings(s => s.themeColor);
  const { myDemos, toggleMyDemo, mastery } = useProgress();
  const navigation = useNavigation<any>();

  const [demos, setDemos] = useState<Demo[] | null>(null);

  useEffect(() => {
    (async () => {
      const all = await getAllDemos();
      const inChapter = all.filter(d => d.chapter_id === chapter.id);
      // 🔽 Tri strictement croissant par sort_index (numérique), puis par titre
      inChapter.sort((a, b) => {
        const sa = Number(a.sort_index ?? 1e9);
        const sb = Number(b.sort_index ?? 1e9);
        if (sa !== sb) return sa - sb;
        return (a.title || '').localeCompare(b.title || '');
      });
      setDemos(inChapter);
    })();
  }, [chapter.id]);

  if (demos === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  // Stats
  const total = demos.length;
  const countNM = demos.filter(d => mastery[d.id] === 'not_mastered').length;
  const countIP = demos.filter(d => mastery[d.id] === 'in_progress').length;
  const countM  = demos.filter(d => mastery[d.id] === 'mastered').length;

  const colorMap: Record<string, string> = {
    mastered:     '#34c759',
    in_progress:  '#ff9f0a',
    not_mastered: '#ff3b30',
    unrated:      '#888'
  };
  const labelMap: Record<string, string> = {
    mastered:     'Maîtrisé',
    in_progress:  'À approfondir',
    not_mastered: 'Non maîtrisé',
    unrated:      '-'
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.center}>
        <Text style={styles.h1}>Progression </Text>
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: '#ff3b30' }]}><Text style={styles.pillText}>{countNM}/{total}</Text></View>
          <View style={[styles.pill, { backgroundColor: '#ff9f0a' }]}><Text style={styles.pillText}>{countIP}/{total}</Text></View>
          <View style={[styles.pill, { backgroundColor: '#34c759' }]}><Text style={styles.pillText}>{countM}/{total}</Text></View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.launchButton, { backgroundColor: themeColor }]}
        onPress={() => navigation.navigate('Learning', { demos } as never)}
      >
        <Text style={styles.launchText}>LANCER L’APPRENTISSAGE</Text>
      </TouchableOpacity>

      {demos.map((d) => {
        const status = mastery[d.id] ?? 'unrated';
        const color = colorMap[status];
        const label = labelMap[status];
        return (
          <View key={d.id} style={styles.demoRow}>
            <Checkbox value={myDemos.has(d.id)} onValueChange={() => toggleMyDemo(d.id)} />
            <Text style={styles.demoTitle}>{d.title}</Text>

            {/* Libellé clair à la place de "…" */}
            <View style={[styles.pillLabel, { backgroundColor: color }]}>
              <Text style={styles.pillLabelText}>{label}</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: themeColor }]}
              onPress={() => navigation.navigate('Learning', { demos: [d] } as never)}
            >
              <Text style={styles.buttonText}>Voir</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { padding: 20 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  h1:           { fontSize: 22, fontWeight: '500', marginBottom: 12 },
  pillRow:      { flexDirection: 'row', marginBottom: 12 },
  pill:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  pillText:     { color: 'white', fontWeight: '600' },
  launchButton: { borderRadius: 16, paddingVertical: 10, alignItems: 'center', marginBottom: 20 },
  launchText:   { color: 'white', fontWeight: '700' },

  demoRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  demoTitle:    { flex: 1, marginHorizontal: 8, fontSize: 16 },

  // Nouveau pill pour libellé texte
  pillLabel:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8, minWidth: 110, alignItems:'center' },
  pillLabelText:{ color: 'white', fontSize: 12, fontWeight: '700' },

  button:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  buttonText:   { color: 'white', fontWeight: '600' }
});
