import React, { useState } from 'react';
import { View, Text, ScrollView, Button, StyleSheet } from 'react-native';
import { useProgress } from '../store/useProgress';

export default function LearningScreen({ route, navigation }) {
  const { demos } = route.params as { demos: any[] };
  const [idx, setIdx] = useState(0);
  const [showProof, setShowProof] = useState(false);
  const { setMastery } = useProgress();

  const demo = demos[idx];
  const next = () => {
    setShowProof(false);
    if (idx + 1 < demos.length) setIdx(idx + 1);
    else navigation.goBack();
  };

  if (!demo) return null;

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }}>
        <Text style={styles.title}>{demo.title}</Text>
        <Text style={styles.statement}>{demo.statement}</Text>
        {showProof && <Text style={styles.proof}>{demo.proof}</Text>}
      </ScrollView>
      {!showProof && <Button title="Afficher la démo" onPress={() => setShowProof(true)} />}
      {showProof && (
        <View style={styles.btnRow}>
          <Button title="Non maîtrisée" color="#ff3b30" onPress={() => { setMastery(demo.id, 'not_mastered'); next(); }} />
          <Button title="À travailler" color="#ff9f0a" onPress={() => { setMastery(demo.id, 'in_progress'); next(); }} />
          <Button title="Maîtrisée" color="#34c759" onPress={() => { setMastery(demo.id, 'mastered'); next(); }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: '600' },
  statement: { marginTop: 10 },
  proof: { marginTop: 12, fontStyle: 'italic' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }
});