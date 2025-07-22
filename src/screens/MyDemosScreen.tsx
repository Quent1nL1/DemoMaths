// src/screens/MyDemosScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Button,
  ActivityIndicator
} from 'react-native';
import Checkbox from 'expo-checkbox';
import Collapsible from 'react-native-collapsible';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '../lib/supabase';
import { useProgress } from '../store/useProgress';

export default function MyDemosScreen() {
  const navigation = useNavigation();
  const { myDemos, toggleMyDemo } = useProgress();
  const [chapters, setChapters] = useState<any[] | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Charge les chapitres + démos
  useEffect(() => {
    (async () => {
      try {
        const { data: ch } = await supabase
          .from('chapters')
          .select('*')
          .order('sort_index');
        const { data: de } = await supabase
          .from('demos')
          .select('*')
          .order('sort_index');
        setChapters(
          (ch ?? []).map((c) => ({
            ...c,
            demos: (de ?? []).filter((d) => d.chapter_id === c.id)
          }))
        );
      } catch (e) {
        console.error('Erreur Supabase MyDemosScreen:', e);
        setChapters([]); 
      }
    })();
  }, []);

  // Affiche un loader tant que ça charge
  if (chapters === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Chargement…</Text>
      </View>
    );
  }

  // Calcule la sélection
  const selectedDemos = chapters
    .flatMap((c) => c.demos)
    .filter((d: any) => myDemos.has(d.id));

  console.log('Navigate to Learning with', selectedDemos.length, 'demos');

  // Navigation vers l'écran Learning du stack Cours
  const handleLearn = () => {
    navigation.navigate('Cours' as never, {
      screen: 'Learning',
      params: { demos: selectedDemos }
    } as never);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {chapters.map((ch) => {
        const isOpen = !!open[ch.id];
        return (
          <View key={ch.id}>
            <TouchableOpacity
              style={styles.header}
              onPress={() =>
                setOpen((o) => ({ ...o, [ch.id]: !isOpen }))
              }
            >
              <Text style={styles.h2}>{ch.title}</Text>
              <MaterialCommunityIcons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={22}
              />
            </TouchableOpacity>

            <Collapsible collapsed={!isOpen}>
              {ch.demos.map((demo: any) => (
                <View key={demo.id} style={styles.demoRow}>
                  <Checkbox
                    value={myDemos.has(demo.id)}
                    onValueChange={() => toggleMyDemo(demo.id)}
                    color="#007aff"
                  />
                  <Text style={styles.demoTitle}>{demo.title}</Text>
                </View>
              ))}
            </Collapsible>
          </View>
        );
      })}

      <View style={styles.buttonWrapper}>
        <Button
          title="Apprendre ma sélection"
          disabled={selectedDemos.length === 0}
          onPress={handleLearn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f2f2f7',
    marginBottom: 2
  },
  h2: {
    fontWeight: '700',
    fontSize: 16
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc'
  },
  demoTitle: {
    marginLeft: 8,
    flexShrink: 1
  },
  buttonWrapper: {
    marginTop: 24,
    marginHorizontal: 16
  }
});
