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

import { supabase } from '../lib/supabase';
import { useProgress } from '../store/useProgress';
import { useSettings } from '../store/useSettings';

export default function MyDemosScreen() {
  const navigation   = useNavigation();
  const { myDemos, toggleMyDemo } = useProgress();
  const mastery      = useProgress(s => s.mastery);
  const themeColor   = useSettings(s => s.themeColor);

  const [chapters, setChapters] = useState<any[]|null>(null);
  const [open, setOpen]         = useState<Record<string,boolean>>({});

  // 1) Charge chapitres + démos
  useEffect(() => {
    (async () => {
      const { data: ch, error: errCh } = await supabase
        .from('chapters').select('*').order('sort_index');
      if (errCh) { console.error(errCh); setChapters([]); return; }

      const { data: de, error: errDe } = await supabase
        .from('demos').select('*').order('sort_index');
      if (errDe) { console.error(errDe); setChapters([]); return; }

      setChapters(
        ch.map(c => ({
          ...c,
          demos: de.filter(d => d.chapter_id === c.id)
        }))
      );
    })();
  }, []);

  if (chapters === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={themeColor}/>
        <Text>Chargement…</Text>
      </View>
    );
  }

  // 2) Ne garder que les démos sélectionnées
  const visibleChapters = chapters
    .map(c => ({ ...c, demos: c.demos.filter((d:any) => myDemos.has(d.id)) }))
    .filter(c => c.demos.length > 0);

  const allSelected = visibleChapters.flatMap(c => c.demos);

  // 3) Handler apprentissage
  const handleLearn = () => {
    navigation.navigate('Cours' as never, {
      screen: 'Learning',
      params: { demos: allSelected }
    } as never);
  };

  // couleur par statut
  const colorMap: Record<string,string> = {
    mastered:     '#34c759',
    in_progress:  '#ff9f0a',
    not_mastered: '#ff3b30',
    unrated:      '#888'
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {visibleChapters.length === 0 && (
        <View style={styles.center}>
          <Text>Aucune démo sélectionnée.</Text>
        </View>
      )}

      {visibleChapters.map(ch => {
        const isOpen = !!open[ch.id];
        return (
          <View key={ch.id}>
            <TouchableOpacity
              style={styles.header}
              onPress={() => setOpen(o => ({ ...o, [ch.id]: !isOpen }))}
            >
              <Text style={styles.h2}>{ch.title}</Text>
              <MaterialCommunityIcons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={22}
                color="#333"
              />
            </TouchableOpacity>

            <Collapsible collapsed={!isOpen}>
              {ch.demos.map((demo:any) => {
                const status = mastery[demo.id] ?? 'unrated';
                return (
                  <View key={demo.id} style={styles.demoRow}>
                    <Checkbox
                      value={myDemos.has(demo.id)}
                      onValueChange={() => toggleMyDemo(demo.id)}
                      color={themeColor}
                    />
                    <Text style={styles.demoTitle}>{demo.title}</Text>
                    <View style={[styles.pillSmall,{backgroundColor: colorMap[status]}]}>
                      <Text style={styles.pillTextSmall}>
                        {status.replace('_',' ')}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Collapsible>
          </View>
        );
      })}

      <TouchableOpacity
        style={[
          styles.learnButton,
          { backgroundColor: themeColor },
          allSelected.length===0 && styles.disabled
        ]}
        onPress={handleLearn}
        disabled={allSelected.length===0}
      >
        <Text style={styles.learnText}>Apprendre ma sélection</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { padding:16, paddingBottom:32 },
  center:        { flex:1, justifyContent:'center', alignItems:'center', marginTop:40 },

  header:        {
    flexDirection:'row',
    justifyContent:'space-between',
    padding:12,
    backgroundColor:'#f2f2f7',
    marginBottom:2
  },
  h2:            { fontWeight:'700', fontSize:16 },

  demoRow:       {
    flexDirection:'row',
    alignItems:'center',
    paddingVertical:10,
    paddingHorizontal:4,
    borderBottomWidth:StyleSheet.hairlineWidth,
    borderColor:'#ccc'
  },
  demoTitle:     { flex:1, marginLeft:8 },

  pillSmall:    { paddingHorizontal:6,paddingVertical:2,borderRadius:4,marginLeft:8 },
  pillTextSmall:{ color:'white', fontSize:12 },

  learnButton:   {
    marginTop:24,
    paddingVertical:12,
    borderRadius:16,
    alignItems:'center'
  },
  learnText:     { color:'white', fontSize:16, fontWeight:'700' },
  disabled:      { opacity:0.5 },
});
