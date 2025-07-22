import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useProgress } from '../store/useProgress';

export default function ChapterScreen({ route, navigation }) {
  const { chapter } = route.params as { chapter: any };
  const [demos, setDemos] = useState<any[]>([]);
  const mastery = useProgress((s) => s.mastery);

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

  const mastered = demos.filter((d) => mastery[d.id] === 'mastered').length;
  const inProg = demos.filter((d) => mastery[d.id] === 'in_progress').length;
  const notMast = demos.filter((d) => mastery[d.id] === 'not_mastered').length;

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{chapter.title}</Text>
      <View style={styles.row}>
        <View style={[styles.pill, { backgroundColor: '#ff3b30' }]}>
          <Text style={styles.pillText}>{`${notMast}/${demos.length}`}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: '#ff9f0a' }]}>
          <Text style={styles.pillText}>{`${inProg}/${demos.length}`}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: '#34c759' }]}>
          <Text style={styles.pillText}>{`${mastered}/${demos.length}`}</Text>
        </View>
      </View>
      <Button
        title="Lancer l'apprentissage"
        onPress={() => navigation.navigate('Learning', { demos })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 6 },
  pillText: { color: 'white', fontWeight: '600' }
});