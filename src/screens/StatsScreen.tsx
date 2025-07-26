// src/screens/StatsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useProgress } from '../store/useProgress';
import { useSettings } from '../store/useSettings';

export default function StatsScreen() {
  const [chapters, setChapters] = useState<any[] | null>(null);
  const [demos, setDemos]       = useState<any[] | null>(null);

  const mastery        = useProgress(s => s.mastery);
  const myDemos        = useProgress(s => s.myDemos);
  const themeColor     = useSettings(s => s.themeColor);
  const selectedCursus = useSettings(s => s.selectedCursus); // Set<string>

  // 1) Chargement
  useEffect(() => {
    supabase.from('chapters').select('*').order('sort_index')
      .then(({ data }) => setChapters(data ?? []));
    supabase.from('demos').select('*')
      .then(({ data }) => setDemos(data ?? []));
  }, []);

  // 2) Loader
  if (chapters === null || demos === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  // 3) Aucun cursus sélectionné ?
  if (selectedCursus.size === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          Aucun cursus sélectionné.{'\n'}
          Allez dans Paramètres pour en choisir.
        </Text>
      </View>
    );
  }

  // 4) Stats globales de la sélection
  const selectedDemos = demos.filter(d => myDemos.has(d.id));
  const totalSel      = selectedDemos.length;
  const selNM         = selectedDemos.filter(d => mastery[d.id] === 'not_mastered').length;
  const selIP         = selectedDemos.filter(d => mastery[d.id] === 'in_progress').length;
  const selM          = selectedDemos.filter(d => mastery[d.id] === 'mastered').length;

  // 5) Grouper chapitres par cursus sélectionné
  const byCursus: Record<string, any[]> = {};
  chapters.forEach(ch => {
    if (!selectedCursus.has(ch.cursus_code)) return;
    if (!byCursus[ch.cursus_code]) byCursus[ch.cursus_code] = [];
    byCursus[ch.cursus_code].push(ch);
  });

  // 6) Couleurs selon statut
  const colorMap: Record<string, string> = {
    mastered:     '#34c759',
    in_progress:  '#ff9f0a',
    not_mastered: '#ff3b30',
    unrated:      '#888'
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Sélection */}
      <View style={styles.row}>
        <Text style={[styles.header, { color: themeColor }]}>Sélection</Text>
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: '#ff3b30' }]}>
            <Text style={styles.pillText}>{`${selNM}/${totalSel}`}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: '#ff9f0a' }]}>
            <Text style={styles.pillText}>{`${selIP}/${totalSel}`}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: '#34c759' }]}>
            <Text style={styles.pillText}>{`${selM}/${totalSel}`}</Text>
          </View>
        </View>
      </View>

      {/* Stats par chapitre */}
      {Object.entries(byCursus).map(([cursus, chs]) => (
        <View key={cursus} style={styles.section}>
          <Text style={[styles.cursusHeader, { color: themeColor }]}>
            {cursus}
          </Text>
          {chs.map(ch => {
            const chDemos = demos.filter(d => d.chapter_id === ch.id);
            const total   = chDemos.length;
            const nm      = chDemos.filter(d => mastery[d.id] === 'not_mastered').length;
            const ip      = chDemos.filter(d => mastery[d.id] === 'in_progress').length;
            const m       = chDemos.filter(d => mastery[d.id] === 'mastered').length;
            return (
              <View key={ch.id} style={styles.row}>
                <Text style={styles.chapterTitle}>{ch.title}</Text>
                <View style={styles.pills}>
                  <View style={[styles.pill, { backgroundColor: '#ff3b30' }]}>
                    <Text style={styles.pillText}>{`${nm}/${total}`}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: '#ff9f0a' }]}>
                    <Text style={styles.pillText}>{`${ip}/${total}`}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: '#34c759' }]}>
                    <Text style={styles.pillText}>{`${m}/${total}`}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { padding: 16, paddingBottom: 32 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText:    { textAlign: 'center', color: '#666', padding: 16 },

  row:          {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   12
  },
  header:       { fontSize: 20, fontWeight: '700' },
  pills:        { flexDirection: 'row' },

  pill:         {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      8,
    marginLeft:        6
  },
  pillText:     { color: 'white', fontWeight: '600' },

  section:      { marginTop: 24 },
  cursusHeader: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  chapterTitle: { fontSize: 16, flex: 1 }
});
