// src/screens/StatsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { useProgress, type Status } from '../store/useProgress';
import { useSettings } from '../store/useSettings';
import { getAllChapters, getAllDemos, getAllCursus } from '../lib/dataSource';
import type { Chapter, Demo, Cursus } from '../store/useCustomData';

type Counts = {
  nm: number; // not_mastered
  ip: number; // in_progress
  m: number;  // mastered
  nc: number; // non classé
  total: number;
};

const COLORS = {
  not_mastered: '#ff3b30', // rouge
  in_progress:  '#ff9f0a', // orange
  mastered:     '#34c759', // vert
  unclassified: '#808080'  // gris (non classé)
};

const BAR_WIDTH = 180;  // taille fixe pour tous les chapitres
const BAR_HEIGHT = 16;

export default function StatsScreen({ navigation }: any) {
  const { mastery, myDemos } = useProgress();
  const { selectedCursus } = useSettings();

  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [demos, setDemos] = useState<Demo[] | null>(null);
  const [cursus, setCursus] = useState<Cursus[] | null>(null);

  const [openedId, setOpenedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [chs, ds, cur] = await Promise.all([
        getAllChapters(),
        getAllDemos(),
        getAllCursus()
      ]);
      if (!alive) return;
      setChapters(chs);
      setDemos(ds);
      setCursus(cur);
    })();
    return () => { alive = false; };
  }, []);

  const titleByCode = useMemo(() => {
    const map = new Map<string, string>();
    (cursus ?? []).forEach(c => map.set(c.code, c.title || c.code));
    return map;
  }, [cursus]);

  const safeChapters = chapters ?? [];
  const safeDemos    = demos ?? [];
  const selected     = selectedCursus ?? new Set<string>();

  const demosByChapter = useMemo(() => {
    const m = new Map<string, Demo[]>();
    safeDemos.forEach(d => {
      const arr = m.get(d.chapter_id) ?? [];
      arr.push(d);
      m.set(d.chapter_id, arr);
    });
    return m;
  }, [safeDemos]);

  function splitByStatus(list: Demo[]) {
    const groups: Record<'not_mastered'|'in_progress'|'mastered'|'unclassified', Demo[]> = {
      not_mastered: [],
      in_progress: [],
      mastered: [],
      unclassified: []
    };
    list.forEach(d => {
      const s = mastery[d.id] as Status | undefined;
      if (!s) groups.unclassified.push(d);
      else if (s === 'not_mastered') groups.not_mastered.push(d);
      else if (s === 'in_progress')  groups.in_progress.push(d);
      else groups.mastered.push(d);
    });
    return groups;
  }

  function countFor(list: Demo[]): Counts {
    const g = splitByStatus(list);
    const nm = g.not_mastered.length;
    const ip = g.in_progress.length;
    const m  = g.mastered.length;
    const nc = g.unclassified.length;
    const total = list.length;
    return { nm, ip, m, nc, total };
  }

  const chapsFiltered = useMemo(() => {
    const all = selected.size
      ? safeChapters.filter(ch => selected.has(ch.cursus_code))
      : safeChapters;
    return all.slice().sort((a, b) => {
      if (a.cursus_code !== b.cursus_code) return a.cursus_code.localeCompare(b.cursus_code);
      const ia = (a.sort_index ?? 0);
      const ib = (b.sort_index ?? 0);
      if (ia !== ib) return ia - ib;
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [safeChapters, selected]);

  const loading = !chapters || !demos || !cursus;

  // --------- Mes démos (liste et stats) ----------
  const myDemosList = useMemo(
    () => safeDemos.filter(d => myDemos.has(d.id)),
    [safeDemos, myDemos]
  );
  const myGroups = useMemo(() => splitByStatus(myDemosList), [myDemosList, mastery]);
  const myCounts = useMemo(() => countFor(myDemosList), [myDemosList, mastery]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  let currentCursus: string | null = null;

  const renderBar = (counts: Counts, onPress: () => void) => {
    const { nc, nm, ip, m, total } = counts;
    const fTotal = Math.max(total, 1);
    const segs = [
      { key: 'unclassified', value: nc, color: COLORS.unclassified },
      { key: 'not_mastered', value: nm, color: COLORS.not_mastered },
      { key: 'in_progress',  value: ip, color: COLORS.in_progress },
      { key: 'mastered',     value: m,  color: COLORS.mastered }
    ];
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.barHitbox}>
        <View style={styles.barContainer}>
          {segs.map((s, idx) => {
            const w = (s.value / fTotal) * BAR_WIDTH;
            if (w <= 0) return null;
            const isFirst = segs.findIndex(x => x.value > 0) === idx;
            const isLast  = segs.slice(idx + 1).every(x => x.value === 0);
            return (
              <View
                key={s.key}
                style={[
                  styles.barSegment,
                  {
                    width: w,
                    backgroundColor: s.color,
                    borderTopLeftRadius: isFirst ? BAR_HEIGHT / 2 : 0,
                    borderBottomLeftRadius: isFirst ? BAR_HEIGHT / 2 : 0,
                    borderTopRightRadius: isLast ? BAR_HEIGHT / 2 : 0,
                    borderBottomRightRadius: isLast ? BAR_HEIGHT / 2 : 0
                  }
                ]}
              />
            );
          })}
          {total === 0 && (
            <View
              style={[
                styles.barSegment,
                { width: BAR_WIDTH, backgroundColor: '#e0e0e0', borderRadius: BAR_HEIGHT / 2 }
              ]}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderPopover = (id: string, groups: ReturnType<typeof splitByStatus>, counts: Counts) => {
    const { nc, nm, ip, m, total } = counts;
    if (openedId !== id) return null;
    return (
      <View style={styles.popover}>
        <View style={styles.popoverRow}>
          <Text style={styles.popoverLabel}>Non classé :</Text>
          <TouchableOpacity
            style={[styles.rect, { backgroundColor: COLORS.unclassified }]}
            onPress={() => navigation?.navigate?.('Learning', { demos: groups.unclassified } as never)}
          >
            <Text style={styles.rectText}>{nc}/{total}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.popoverRow}>
          <Text style={styles.popoverLabel}>Non maîtrisé :</Text>
          <TouchableOpacity
            style={[styles.rect, { backgroundColor: COLORS.not_mastered }]}
            onPress={() => navigation?.navigate?.('Learning', { demos: groups.not_mastered } as never)}
          >
            <Text style={styles.rectText}>{nm}/{total}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.popoverRow}>
          <Text style={styles.popoverLabel}>À approfondir :</Text>
          <TouchableOpacity
            style={[styles.rect, { backgroundColor: COLORS.in_progress }]}
            onPress={() => navigation?.navigate?.('Learning', { demos: groups.in_progress } as never)}
          >
            <Text style={styles.rectText}>{ip}/{total}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.popoverRow}>
          <Text style={styles.popoverLabel}>Maîtrisé :</Text>
          <TouchableOpacity
            style={[styles.rect, { backgroundColor: COLORS.mastered }]}
            onPress={() => navigation?.navigate?.('Learning', { demos: groups.mastered } as never)}
          >
            <Text style={styles.rectText}>{m}/{total}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* ======= Mes démos (affiché comme un chapitre) ======= */}
      <View style={styles.section}>
        <View style={styles.chapterRow}>
          <Text style={styles.MyDemoTitle}>Mes démonstrations séléctionnées</Text>
          {renderBar(myCounts, () =>
            setOpenedId(prev => prev === '__mydemos__' ? null : '__mydemos__')
          )}
        </View>
        {renderPopover('__mydemos__', myGroups, myCounts)}
      </View>

      {/* ======= Par chapitre (groupé par cursus) ======= */}
      {chapsFiltered.map(ch => {
        const list = demosByChapter.get(ch.id) ?? [];
        const counts = countFor(list);
        const groups = splitByStatus(list);

        const header =
          currentCursus !== ch.cursus_code ? (
            <Text key={`hdr-${ch.cursus_code}`} style={styles.cursusHeader}>
              {titleByCode.get(ch.cursus_code) ?? ch.cursus_code}
            </Text>
          ) : null;
        currentCursus = ch.cursus_code;

        return (
          <View key={ch.id} style={styles.section}>
            {header}
            <View style={styles.chapterRow}>
              <Text style={styles.chapterTitle}>{ch.title}</Text>
              {renderBar(counts, () => setOpenedId(prev => (prev === ch.id ? null : ch.id)))}
            </View>
            {renderPopover(ch.id, groups, counts)}
          </View>
        );
      })}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { padding: 20 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  section:      { marginBottom: 8 },

  cursusHeader: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },

  chapterRow:   { flexDirection: 'row', alignItems: 'center' },

  chapterTitle: { fontSize: 16, flex: 1, paddingRight: 12 },

  MyDemoTitle: { fontSize: 18, fontWeight: '700', flex: 1, paddingRight: 12 },

  // ---- Barre segmentée ----
  barHitbox:    { paddingVertical: 6, paddingLeft: 6 },
  barContainer: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
    flexDirection: 'row'
  },
  barSegment:   { height: BAR_HEIGHT },

  // ---- Boîte détaillée ----
  popover: {
    marginTop: 8,
    marginLeft: 6,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  popoverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  popoverLabel: { width: 120, fontSize: 14 },

  rect: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rectText: { color: 'white', fontWeight: '700' }
});
