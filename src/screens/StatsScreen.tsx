// src/screens/StatsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useProgress } from '../store/useProgress';
import { useSettings } from '../store/useSettings';
import { getAllChapters, getAllDemos, getAllCursus } from '../lib/dataSource';
import type { Chapter, Demo, Cursus } from '../store/useCustomData';

type Counts = { nm: number; ip: number; m: number; total: number };

function computeCounts(list: Demo[], mastery: Record<string, string | undefined>): Counts {
  let nm = 0, ip = 0, m = 0;
  for (const d of list) {
    const s = mastery[d.id];
    if (s === 'not_mastered') nm++;
    else if (s === 'in_progress') ip++;
    else if (s === 'mastered') m++;
  }
  return { nm, ip, m, total: list.length };
}

export default function StatsScreen() {
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [demos, setDemos]       = useState<Demo[] | null>(null);
  const [cursus, setCursus]     = useState<Cursus[]>([]);
  const themeColor     = useSettings(s => s.themeColor);
  const selectedCursus = useSettings(s => s.selectedCursus);
  const { mastery, myDemos }    = useProgress();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ch, de, cu] = await Promise.all([
        getAllChapters(),
        getAllDemos(),
        getAllCursus()
      ]);
      if (!cancelled) {
        setChapters(ch);
        setDemos(de);
        setCursus(cu);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const titleByCode = useMemo(() => {
    const m = new Map<string,string>();
    cursus.forEach(c => m.set(c.code, c.title || c.code));
    return m;
  }, [cursus]);

  const safeChapters = chapters ?? [];
  const safeDemos    = demos ?? [];
  const selSet       = selectedCursus ?? new Set<string>();

  const myDemosList = useMemo(
    () => safeDemos.filter(d => myDemos.has(d.id)),
    [safeDemos, myDemos]
  );
  const myCounts = useMemo(
    () => computeCounts(myDemosList, mastery),
    [myDemosList, mastery]
  );

  const byCursusSorted = useMemo(() => {
    const map: Record<string, Chapter[]> = {};
    for (const ch of safeChapters) {
      if (selSet.size > 0 && !selSet.has(ch.cursus_code)) continue;
      (map[ch.cursus_code] ||= []).push(ch);
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [safeChapters, selSet]);

  const demosByChapter = useMemo(() => {
    const map: Record<string, Demo[]> = {};
    for (const d of safeDemos) (map[d.chapter_id] ||= []).push(d);
    return map;
  }, [safeDemos]);

  if (chapters === null || demos === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Mes démos (global) */}
      <View style={styles.center}>
      <Text style={styles.blockTitle}>Mes démos</Text>
      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: '#ff3b30' }]}><Text style={styles.pillText}>{myCounts.nm}/{myCounts.total}</Text></View>
        <View style={[styles.pill, { backgroundColor: '#ff9f0a' }]}><Text style={styles.pillText}>{myCounts.ip}/{myCounts.total}</Text></View>
        <View style={[styles.pill, { backgroundColor: '#34c759' }]}><Text style={styles.pillText}>{myCounts.m}/{myCounts.total}</Text></View>
      </View>
      </View>

      {/* Par chapitre (par cursus) */}

      {byCursusSorted.map(([cursusCode, chs]) => (
        <View key={cursusCode} style={styles.section}>
          <Text style={styles.cursusHeader}>{titleByCode.get(cursusCode) ?? cursusCode}</Text>
          {chs.map(ch => {
            const list = demosByChapter[ch.id] ?? [];
            if (list.length === 0) return null;
            const c = computeCounts(list, mastery);
            return (
              <View key={ch.id} style={styles.chapterRow}>
                <Text style={styles.chapterTitle}>{ch.title}</Text>
                <View style={[styles.pill, { backgroundColor: '#ff3b30' }]}><Text style={styles.pillText}>{c.nm}/{c.total}</Text></View>
                <View style={[styles.pill, { backgroundColor: '#ff9f0a' }]}><Text style={styles.pillText}>{c.ip}/{c.total}</Text></View>
                <View style={[styles.pill, { backgroundColor: '#34c759' }]}><Text style={styles.pillText}>{c.m}/{c.total}</Text></View>
              </View>
            );
          })}
        </View>
      ))}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { padding: 16, paddingBottom: 32 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  h1:            { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  blockTitle:    { fontSize: 22, fontWeight: '700', marginTop: 8, marginBottom: 6 },

  pillRow:       { flexDirection: 'row', marginBottom: 12 },
  pill:          {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    marginLeft: 6, minWidth: 50, alignItems: 'center', justifyContent: 'center'
  },
  pillText:      { color: 'white', fontWeight: '600' },

  section:       { marginTop: 16 },
  cursusHeader:  { fontSize: 18, fontWeight: '700', marginBottom: 8 },

  chapterRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chapterTitle:  { fontSize: 16, flex: 1 }
});
