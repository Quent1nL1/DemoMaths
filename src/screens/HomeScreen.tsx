import React, { useEffect, useState } from 'react';
import {
  FlatList,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

interface HomeScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [chapters, setChapters] = useState<any[]>([]);

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

  if (chapters.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Aucun chapitre trouvé</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={chapters}
      numColumns={2}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Chapter', { chapter: item })}
        >
          {item.cover_url && <Image source={{ uri: item.cover_url }} style={styles.img} />}
          <Text style={styles.title}>{item.title}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 2,
    overflow: 'hidden',
    alignItems: 'center'
  },
  img: {
    width: '100%',
    height: 100
  },
  title: {
    padding: 12,
    fontWeight: '600'
  }
});