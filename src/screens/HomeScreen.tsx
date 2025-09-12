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
import { getAllChapters, getCursusMap } from '../lib/dataSource';
import type { Chapter } from '../store/useCustomData';

const GAP = 12;
const PADDING_H = 16;
const MAX_COLS = 4;
const MIN_CARD_WIDTH = 200;

function computeGrid(containerWidth: number) {
  const inner = Math.max(0, containerWidth - 2 * PADDING_H);
  for (let cols = MAX_COLS; cols >= 1; cols--) {
    const totalGaps = GAP * (cols - 1);
    const base = Math.floor((inner - totalGaps) / cols);
    if (base >= MIN_CARD_WIDTH) {
      const used = base * cols + totalGaps;
      const remainder = Math.max(0, inner - used);
      return { cols, cardW: base, remainder };
    }
  }
  return { cols: 1, cardW: inner, remainder: 0 };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function HomeScreen({ navigation }: any) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [cursusMap, setCursusMap] = useState<Record<string, { code: string; title?: string }>>({});
  const selectedCursus = useSettings(s => s.selectedCursus);
  const themeColor = useSettings(s => s.themeColor);

  useEffect(() => {
    (async () => {
      const [ch, cu] = await Promise.all([getAllChapters(), getCursusMap()]);
      setChapters(ch);
      setCursusMap(cu);
    })();
  }, []);

  const [grid, setGrid] = useState<{ cols: number; cardW: number; remainder: number }>({ cols: 1, cardW: 320, remainder: 0 });
  const onLayout = (e: LayoutChangeEvent) => setGrid(computeGrid(e.nativeEvent.layout.width));

  const filtered = useMemo(
    () => chapters.filter(ch => selectedCursus.size === 0 || selectedCursus.has(ch.cursus_code)),
    [chapters, selectedCursus]
  );

  const groups = useMemo(() => {
    const map: Record<string, Chapter[]> = {};
    for (const ch of filtered) {
      if (!map[ch.cursus_code]) map[ch.cursus_code] = [];
      map[ch.cursus_code].push(ch);
    }
    Object.values(map).forEach(list =>
      list.sort((a, b) => {
        const sa = a.sort_index ?? 1e9;
        const sb = b.sort_index ?? 1e9;
        if (sa !== sb) return sa - sb;
        return a.title.localeCompare(b.title);
      })
    );
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <ScrollView contentContainerStyle={styles.container} onLayout={onLayout}>

      {groups.map(([cursusCode, list]) => {
        const rows = chunk(list, grid.cols);
        const cursusTitle = cursusMap[cursusCode]?.title || cursusCode; // <-- titre si dispo
        return (
          <View key={cursusCode} style={styles.section}>
            <Text style={styles.cursusTitle}>{cursusTitle}</Text>

            {rows.map((row, rIndex) => (
              <View key={`${cursusCode}-row-${rIndex}`} style={styles.row}>
                {row.map((ch, j) => {
                  const extra = j < grid.remainder ? 1 : 0;
                  const isLast = j === row.length - 1;
                  return (
                    <TouchableOpacity
                      key={ch.id}
                      style={[
                        styles.card,
                        {
                          width: grid.cardW + extra,
                          borderColor: themeColor,
                          marginRight: isLast ? 0 : GAP
                        }
                      ]}
                      onPress={() => navigation.navigate('Chapter', { chapter: ch })}
                    >
                      <View style={styles.imgWrap}>
                        {ch.cover_url ? (
                          <Image source={{ uri: ch.cover_url }} style={styles.img} resizeMode="cover" />
                        ) : (
                          <View style={[styles.img, { alignItems:'center', justifyContent:'center' }]}>
                            <Text style={{ color:'#999' }}>Sans image</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.titleWrap}>
                        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
                          {ch.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        );
      })}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16, paddingBottom: 24 },
  h1: { fontSize: 22, fontWeight: '700', marginHorizontal: 16, marginBottom: 12 },

  section: { marginBottom: 16 },
  cursusTitle: { fontSize: 18, fontWeight: '700', marginHorizontal: 16, marginBottom: 8 },

  row: { flexDirection: 'row', paddingHorizontal: PADDING_H, marginBottom: GAP },

  card: {
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imgWrap: { width: '100%', height: 80, backgroundColor: '#fafafa' },
  img: { width: '100%', height: '100%' },

  titleWrap: {
    width: '100%',
    height: 52,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  title: { textAlign: 'center', width: '100%', flexWrap: 'wrap' }
});
