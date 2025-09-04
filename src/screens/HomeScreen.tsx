// src/screens/HomeScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { useSettings } from '../store/useSettings';
import { getAllChapters } from '../lib/dataSource';
import type { Chapter } from '../store/useCustomData';

export default function HomeScreen({ navigation }: any) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const selectedCursus = useSettings(s => s.selectedCursus);
  const themeColor = useSettings(s => s.themeColor);

  useEffect(() => {
    (async () => {
      const ch = await getAllChapters();
      setChapters(ch);
    })();
  }, []);

  const [cardWidth, setCardWidth] = useState(140);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w <= 360) setCardWidth((w - 16 - 12) / 2);
    else if (w <= 540) setCardWidth((w - 16 - 12 * 2) / 3);
    else setCardWidth((w - 16 - 12 * 3) / 4);
  };

  // Filtrer selon les cursus sélectionnés
  const filtered = useMemo(
    () =>
      chapters.filter(
        ch => selectedCursus.size === 0 || selectedCursus.has(ch.cursus_code)
      ),
    [chapters, selectedCursus]
  );

  // Regrouper par cursus et trier
  const groups = useMemo(() => {
    const map: Record<string, Chapter[]> = {};
    for (const ch of filtered) {
      if (!map[ch.cursus_code]) map[ch.cursus_code] = [];
      map[ch.cursus_code].push(ch);
    }
    // Tri des chapitres dans chaque groupe: sort_index puis titre
    Object.values(map).forEach(list =>
      list.sort((a, b) => {
        const sa = a.sort_index ?? 1e9;
        const sb = b.sort_index ?? 1e9;
        if (sa !== sb) return sa - sb;
        return a.title.localeCompare(b.title);
      })
    );
    // Tri des groupes par code de cursus
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <ScrollView contentContainerStyle={styles.container} onLayout={onLayout}>
      {groups.map(([cursusCode, list]) => (
        <View key={cursusCode} style={styles.section}>
          <Text style={styles.cursusTitle}>{cursusCode}</Text>
          <View style={styles.row}>
            {list.map(ch => (
              <TouchableOpacity
                key={ch.id}
                style={[styles.card, { width: cardWidth, borderColor: themeColor }]}
                onPress={() => navigation.navigate('Chapter', { chapter: ch })}
              >
                <View style={styles.imgWrap}>
                  {ch.cover_url ? (
                    <Image source={{ uri: ch.cover_url }} style={styles.img} resizeMode="cover" />
                  ) : (
                    <View style={[styles.img, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: '#999' }}>Sans image</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.title}>{ch.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16, paddingBottom: 24 },
  h1: { fontSize: 22, fontWeight: '700', marginHorizontal: 16, marginBottom: 12 },

  section: { marginBottom: 16 },
  cursusTitle: { fontSize: 18, fontWeight: '700', marginHorizontal: 16, marginBottom: 8 },

  row: { flexDirection: 'row', flexWrap: 'wrap', paddingLeft: 16 },
  card: {
    marginRight: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imgWrap: { width: '100%', height: 80, backgroundColor: '#fafafa' },
  img: { width: '100%', height: '100%' },
  title: { padding: 8, textAlign: 'center', width: '100%', flexWrap: 'wrap' }
});

