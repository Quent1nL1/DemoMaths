import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Button,
  StyleSheet
} from 'react-native';
import { useProgress } from '../store/useProgress';
import { useSettings } from '../store/useSettings';
import MathJaxView from '../components/MathJaxView';

export default function LearningScreen({ route, navigation }: any) {
  const { demos } = route.params as { demos: any[] };
  const [idx, setIdx] = useState(0);
  const [showProof, setShowProof] = useState(false);
  const { setMastery } = useProgress();
  const themeColor = useSettings(s => s.themeColor);

  const demo = demos[idx];
  if (!demo) return null;

  const next = () => {
    setShowProof(false);
    if (idx + 1 < demos.length) {
      setIdx(idx + 1);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }}>
        {/* Titre de la démo */}
        <Text style={styles.title}>{demo.title}</Text>

        {/* Énoncé LaTeX, s'auto-wrap à la largeur dispo */}
        <MathJaxView tex={demo.statement} />
        <Text>{'\n'}</Text>
    
        {/* Titre de la démo */}
        {showProof && <Text style={styles.title}>{"Démonstration :"}</Text>}

        {/* Preuve LaTeX (après clic), même wrapping */}
        {showProof && <MathJaxView tex={demo.proof} />}
      </ScrollView>

      {/* Bouton afficher la démo */}
      {!showProof ? (
        <Button title="Afficher la démo" color={themeColor} onPress={() => setShowProof(true)} />
      ) : (
        <View style={styles.btnRow}>
          <Button
            title="Non maîtrisée"
            color="#ff3b30"
            onPress={() => {
              setMastery(demo.id, 'not_mastered');
              next();
            }}
          />
          <Button
            title="À approfondir"
            color="#ff9f0a"
            onPress={() => {
              setMastery(demo.id, 'in_progress');
              next();
            }}
          />
          <Button
            title="Maîtrisée"
            color="#34c759"
            onPress={() => {
              setMastery(demo.id, 'mastered');
              next();
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }
});
