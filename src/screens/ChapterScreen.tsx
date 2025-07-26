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
import { supabase } from '../lib/supabase';
import { useProgress } from '../store/useProgress';
import { useSettings } from '../store/useSettings';
import { useNavigation } from '@react-navigation/native';

export default function ChapterScreen({ route }: any) {
  const { chapter } = route.params as { chapter: any };
  const navigation = useNavigation();
  const [demos, setDemos] = useState<any[] | null>(null);

  const mastery       = useProgress(s => s.mastery);
  const myDemos       = useProgress(s => s.myDemos);
  const toggleMyDemo  = useProgress(s => s.toggleMyDemo);
  const themeColor    = useSettings(s => s.themeColor);

  useEffect(() => {
    supabase
      .from('demos')
      .select('*')
      .eq('chapter_id', chapter.id)
      .order('sort_index')
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setDemos([]);
        } else {
          setDemos(data ?? []);
        }
      });
  }, [chapter.id]);

  if (demos === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  const total   = demos.length;
  const countNM = demos.filter(d => mastery[d.id] === 'not_mastered').length;
  const countIP = demos.filter(d => mastery[d.id] === 'in_progress').length;
  const countM  = demos.filter(d => mastery[d.id] === 'mastered').length;

  const colorMap: Record<string, string> = {
    mastered:     '#34c759',
    in_progress:  '#ff9f0a',
    not_mastered: '#ff3b30',
    unrated:      '#888'
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>{chapter.title}</Text>

      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: '#ff3b30' }]}>
          <Text style={styles.pillText}>{countNM}/{total}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: '#ff9f0a' }]}>
          <Text style={styles.pillText}>{countIP}/{total}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: '#34c759' }]}>
          <Text style={styles.pillText}>{countM}/{total}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.launchButton, { backgroundColor: themeColor }]}
        onPress={() => navigation.navigate('Learning', { demos })}
      >
        <Text style={styles.launchText}>LANCER L’APPRENTISSAGE</Text>
      </TouchableOpacity>

      {demos.map(d => {
        const selected = myDemos.has(d.id);
        const status   = mastery[d.id] ?? 'unrated';
        return (
          <View key={d.id} style={styles.demoRow}>
            <Checkbox
              value={selected}
              onValueChange={() => toggleMyDemo(d.id)}
              color={themeColor}
            />

            <Text style={styles.demoTitle}>{d.title}</Text>

            <View style={[styles.pillSmall, { backgroundColor: colorMap[status] }]}>
              <Text style={styles.pillTextSmall}>{status.replace('_', ' ')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: themeColor }]}
              onPress={() => navigation.navigate('Learning', { demos: [d] })}
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
  h1:           { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  pillRow:      { flexDirection: 'row', marginBottom: 12 },
  pill:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  pillText:     { color: 'white', fontWeight: '600' },
  launchButton: { borderRadius: 16, paddingVertical: 10, alignItems: 'center', marginBottom: 20 },
  launchText:   { color: 'white', fontWeight: '700' },
  demoRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  demoTitle:    { flex: 1, marginHorizontal: 8, fontSize: 16 },
  pillSmall:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  pillTextSmall:{ color: 'white', fontSize: 12 },
  button:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  buttonText:   { color: 'white', fontWeight: '600' }
});
