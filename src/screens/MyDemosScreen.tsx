// src/screens/MyDemosScreen.tsx
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
import Collapsible from 'react-native-collapsible';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useProgress } from '../store/useProgress';
import { useSettings } from '../store/useSettings';
import { getAllChapters, getAllDemos } from '../lib/dataSource';
import type { Chapter, Demo } from '../store/useCustomData';

export default function MyDemosScreen() {
  const { myDemos, toggleMyDemo } = useProgress();
  const mastery        = useProgress(s => s.mastery);
  const themeColor     = useSettings(s => s.themeColor);
  const selectedCursus = useSettings(s => s.selectedCursus);
  const navigation     = useNavigation<any>();

  const [chapters, setChapters] = useState<(Chapter & { demos: Demo[] })[] | null>(null);
  const [open, setOpen]         = useState<Record<string,boolean>>({});

  useEffect(() => {
    (async () => {
      const ch = await getAllChapters();
      const de = await getAllDemos();
      const joined = ch
        .filter(c => selectedCursus.size === 0 || selectedCursus.has(c.cursus_code))
        .map(c => ({ ...c, demos: de.filter(d => d.chapter_id === c.id) }));
      setChapters(joined);
    })();
  }, []);

  if (chapters === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  const allSelected = chapters.flatMap(c => c.demos.filter(d => myDemos.has(d.id)));

  const colorMap: Record<string,string> = {
    mastered:     '#34c759',
    in_progress:  '#ff9f0a',
    not_mastered: '#ff3b30',
    unrated:      '#888'
  };
  const labelMap: Record<string,string> = {
    mastered:     'Maîtrisé',
    in_progress:  'À approfondir',
    not_mastered: 'Non maîtrisé',
    unrated:      '-'
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {allSelected.length === 0 && (
        <View style={styles.center}><Text>Aucune démo sélectionnée.</Text></View>
      )}

      {chapters.map(ch => {
        const isOpen = !!open[ch.id];
        const selectedCount = ch.demos.filter(d => myDemos.has(d.id)).length;
        if (selectedCount === 0) return null;
        return (
          <View key={ch.id}>
            <TouchableOpacity
              style={styles.header}
              onPress={() => setOpen(o => ({ ...o, [ch.id]: !isOpen }))}
            >
              <Text style={styles.h2}>{ch.title}</Text>
              <MaterialCommunityIcons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
            <Collapsible collapsed={!isOpen}>
              {ch.demos.filter(d => myDemos.has(d.id)).map(d => {
                const status = mastery[d.id] ?? 'unrated';
                const color  = colorMap[status];
                const label  = labelMap[status];
                return (
                  <View key={d.id} style={styles.demoRow}>
                    <Checkbox value={true} onValueChange={() => toggleMyDemo(d.id)} />
                    <Text style={styles.demoTitle}>{d.title}</Text>

                    {/* Libellé clair (comme dans ChapterScreen) */}
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
            </Collapsible>
          </View>
        );
      })}

      {allSelected.length > 0 && (
        <TouchableOpacity
          style={[styles.learnButton, { backgroundColor: themeColor }]}
          onPress={() => navigation.navigate('Learning', { demos: allSelected } as never)}
        >
          <Text style={styles.learnText}>LANCER L’APPRENTISSAGE ({allSelected.length})</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { padding:16, paddingBottom:32 },
  center:        { justifyContent:'center', alignItems:'center', marginTop:40 },

  header:        {
    flexDirection:'row',
    justifyContent:'space-between',
    padding:12,
    backgroundColor:'#f2f2f7',
    marginBottom:2
  },
  h2:            { fontWeight:'700', fontSize:16 },

  demoRow:       { flexDirection:'row', alignItems:'center', marginBottom: 12 },
  demoTitle:     { flex:1, marginLeft:8 },

  // Libellé de statut (identique à ChapterScreen)
  pillLabel:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8, minWidth: 110, alignItems:'center' },
  pillLabelText: { color: 'white', fontSize: 12, fontWeight: '700' },

  button:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  buttonText:   { color: 'white', fontWeight: '600' },

  learnButton:   {
    marginTop:24,
    paddingVertical:12,
    borderRadius:16,
    alignItems:'center'
  },
  learnText:     { color:'white', fontSize:16, fontWeight:'700' },
  disabled:      { opacity:0.5 },
});
