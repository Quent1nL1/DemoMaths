// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useSettings } from '../store/useSettings';

export default function HomeScreen({ navigation }: any) {
  const [chapters, setChapters] = useState<any[] | null>(null);
  const selectedCursus = useSettings(s => s.selectedCursus); // Set<string>
  const themeColor     = useSettings(s => s.themeColor);

  // Nouvel état pour stocker la hauteur max des cartes
  const [cardHeight, setCardHeight] = useState<number>(0);

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

  // Callback pour mesurer chaque carte et mettre à jour la hauteur max
  const onCardLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > cardHeight) {
      setCardHeight(h);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {Object.entries(groups).map(([cursus, items]) => (
        <View key={cursus} style={styles.section}>
          <Text style={[styles.cursusHeader, { color: themeColor }]}>
            Cursus {cursus}
          </Text>

          <View style={styles.row}>
            {items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.card,
                  { borderColor: themeColor },
                  // une fois qu'on connaît la hauteur max, on l'applique
                  cardHeight > 0 && { height: cardHeight }
                ]}
                onLayout={onCardLayout}
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
          </View>
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

  row: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    paddingLeft:   16,
  },

  card: {
    width:         140,
    marginRight:   12,
    marginBottom:  12,
    borderRadius:  16,
    borderWidth:   2,
    backgroundColor:'#fff',
    overflow:      'hidden',
    alignItems:    'center',
    justifyContent:'center'
  },
  img:           { width: '100%', height: 80 },

  title: {
    padding:      8,
    textAlign:    'center',
    width:        '100%',
    flexWrap:     'wrap'
  }
});
