// src/screens/HomeScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useSettings } from '../store/useSettings';

export default function HomeScreen({ navigation }: any) {
  const [chapters, setChapters] = useState<any[] | null>(null);
  const selectedCursus = useSettings(s => s.selectedCursus); // Set<string>
  const themeColor     = useSettings(s => s.themeColor);

  useEffect(() => {
    supabase
      .from('chapters')
      .select('*')
      .order('sort_index')
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setChapters([]);
        } else {
          setChapters(data ?? []);
        }
      });
  }, []);

  // 1) Chargement
  if (chapters === null) {
    return (
      <View style={styles.center}>
        <Text>Chargement…</Text>
      </View>
    );
  }

  // 2) Aucun chapitre trouvé côté base
  if (chapters.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Aucun chapitre trouvé</Text>
      </View>
    );
  }

  // 3) Filtrer selon les cursus cochés
  const filtered = chapters.filter(ch =>
    selectedCursus.has(ch.cursus_code)
  );

  // 4) Si aucun chapitre n’est disponible pour ces cursus
  if (filtered.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          Aucun chapitre disponible pour vos cursus sélectionnés.{'\n'}
          Allez dans les Paramètres pour en sélectionner.
        </Text>
      </View>
    );
  }

  // 5) Regrouper les chapitres filtrés par cursus
  const groups: Record<string, any[]> = {};
  filtered.forEach(ch => {
    if (!groups[ch.cursus_code]) groups[ch.cursus_code] = [];
    groups[ch.cursus_code].push(ch);
  });

  return (
    <ScrollView style={styles.container}>
      {Object.entries(groups).map(([cursus, items]) => (
        <View key={cursus} style={styles.section}>
          <Text style={[styles.cursusHeader, { color: themeColor }]}>
            Cursus {cursus}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            {items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { borderColor: themeColor }]}
                onPress={() =>
                  navigation.navigate('Chapter', { chapter: item })
                }
              >
                {item.cover_url && (
                  <Image source={{ uri: item.cover_url }} style={styles.img} />
                )}
                <Text style={styles.title}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText:     { textAlign: 'center', color: '#666', padding: 16 },

  section:       { marginVertical: 12 },
  cursusHeader:  { fontSize: 18, fontWeight: '700', marginLeft: 16, marginBottom: 8 },
  row:           { paddingLeft: 16 },
  card:          {
    width:         140,
    marginRight:   12,
    borderRadius:  16,
    borderWidth:   2,
    backgroundColor:'#fff',
    overflow:      'hidden',
    alignItems:    'center'
  },
  img:           { width: '100%', height: 80 },
  title:         { padding: 8, textAlign: 'center' }
});
