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

export default function StatsScreen() {
  const [data, setData] = useState<
    { id: string; title: string; demos: any[] }[] | null
  >(null);

  // Récupère chapitres + démos, puis structure par chapitre
  useEffect(() => {
    (async () => {
      try {
        const { data: ch } = await supabase
          .from('chapters')
          .select('*')
          .order('sort_index');
        const { data: de } = await supabase.from('demos').select('*');
        const chapters = (ch ?? []).map((c) => ({
          ...c,
          demos: (de ?? []).filter((d) => d.chapter_id === c.id)
        }));
        setData(chapters);
      } catch (e) {
        console.error('Erreur chargement Stats:', e);
        setData([]);
      }
    })();
  }, []);

  const mastery = useProgress((s) => s.mastery);
  const myDemos = useProgress((s) => s.myDemos);

  // Affiche loader pendant la requête
  if (data === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Chargement des statistiques…</Text>
      </View>
    );
  }

  // Compte les démos de "Mes démos" par statut
  const myDemoList = Array.from(myDemos);
  const countNotMasteredMy = myDemoList.filter((id) => mastery[id] === 'not_mastered').length;
  const countInProgMy    = myDemoList.filter((id) => mastery[id] === 'in_progress').length;
  const countMasteredMy  = myDemoList.filter((id) => mastery[id] === 'mastered').length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Statistiques par chapitre</Text>

      {data.map((ch) => {
        const total = ch.demos.length;
        const notMast  = ch.demos.filter((d) => mastery[d.id] === 'not_mastered').length;
        const inProg   = ch.demos.filter((d) => mastery[d.id] === 'in_progress').length;
        const mastered = ch.demos.filter((d) => mastery[d.id] === 'mastered').length;

        return (
          <View key={ch.id} style={styles.row}>
            <Text style={styles.chapterTitle}>{ch.title}</Text>
            <View style={[styles.pill, { backgroundColor: '#ff3b30' }]}>
              <Text style={styles.pillText}>{`${notMast}/${total}`}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: '#ff9f0a' }]}>
              <Text style={styles.pillText}>{`${inProg}/${total}`}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: '#34c759' }]}>
              <Text style={styles.pillText}>{`${mastered}/${total}`}</Text>
            </View>
          </View>
        );
      })}

      <Text style={[styles.heading, { marginTop: 24 }]}>Mes démos</Text>
      <View style={styles.row}>
        <Text style={styles.chapterTitle}>Sélection</Text>
        <View style={[styles.pill, { backgroundColor: '#ff3b30' }]}>
          <Text style={styles.pillText}>{`${countNotMasteredMy}/${myDemoList.length}`}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: '#ff9f0a' }]}>
          <Text style={styles.pillText}>{`${countInProgMy}/${myDemoList.length}`}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: '#34c759' }]}>
          <Text style={styles.pillText}>{`${countMasteredMy}/${myDemoList.length}`}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  chapterTitle: {
    flex: 1,
    fontSize: 16
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6
  },
  pillText: {
    color: 'white',
    fontWeight: '600'
  }
});
