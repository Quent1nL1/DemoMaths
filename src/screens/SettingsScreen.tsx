// src/screens/SettingsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Platform,
  TextInput,
} from 'react-native';
import Checkbox from 'expo-checkbox';
import { useSettings } from '../store/useSettings';
import { useCustomData } from '../store/useCustomData';
import { getAllCursus } from '../lib/dataSource';
import type { Cursus } from '../store/useCustomData';

// --- Contenu libre pour "Informations & crédits"
const INFO_LINES = [
  'DemoMaths – Application de flash cards pour démonstrations mathématiques.',
  'Fonctionnement : Base SQL officielle + données personnalisées locales.',
  "Tutoriel : (W.I.P.) ",
  "Auteurs / Contributeurs : \n      • Quentin Lyonnet - développeur de l'application et contributeur principal, étudiant à Sorbonne université et ancien préparationnaire.",
  "Contact : quentin@lyonnet.org - veillez mettre dans l'objet de votre mail [DemoMaths] afin qu'il soit traité. Je suis un étudiant qui fait ça sur son temps libre, merci de votre patience :)",
];

function normalizeHex(s: string): string | null {
  let v = s.trim();
  if (!v) return null;
  if (v[0] !== '#') v = '#' + v;
  if (/^#([A-Fa-f0-9]{6})$/.test(v)) return v.toLowerCase();
  return null;
}

function ColorBar({ value, onChange }: { value: string; onChange: (hex: string) => void; }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.colorBarWebWrap}>
        <input
          type="color"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            width: '100%', height: '100%', border: 'none',
            background: 'transparent', padding: 0, margin: 0, display: 'block', cursor: 'pointer',
          }}
        />
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.colorPreview, { backgroundColor: value }]} />
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={() => {
          const hex = normalizeHex(draft) ?? value;
          setDraft(hex);
          onChange(hex);
        }}
        placeholder="#8e44ad"
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { marginTop: 8 }]}
      />
      <Text style={styles.helpText}>Saisir une couleur hexadécimale (#RRGGBB).</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const themeColor      = useSettings((s) => s.themeColor);
  const setThemeColor   = useSettings((s) => s.setThemeColor);
  const selectedCursus  = useSettings((s) => s.selectedCursus);
  const toggleCursus    = useSettings((s) => s.toggleCursus);

  // re-déclenche le chargement quand l’utilisateur ajoute/édite des cursus locaux
  const localCursus     = useCustomData((s) => s.cursus);

  const [cursusList, setCursusList] = useState<Cursus[]>([]);

  useEffect(() => {
    (async () => {
      const cu = await getAllCursus(); // DB + locaux (fusion déjà faite côté dataSource)
      setCursusList(cu);
    })();
  }, [localCursus]);

  // Liste disponible = exactement DB + locaux (déjà fusionnés) ; tri par titre
  const available = useMemo(
    () => [...cursusList].sort((a, b) => (a.title ?? a.code).localeCompare(b.title ?? b.code)),
    [cursusList]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ==== Thème ==== */}
      <Text style={styles.h2}>Thème</Text>
      <ColorBar value={themeColor} onChange={(hex) => setThemeColor(hex)} />

      {/* ==== Cursus affichés ==== */}
      <Text style={[styles.h2, { marginTop: 16 }]}>Cursus affichés</Text>
      <View style={{ marginTop: 6 }}>
        {available.map(({ code, title }) => (
          <View key={code} style={styles.row}>
            <Checkbox
              value={selectedCursus.has(code)}
              onValueChange={() => toggleCursus(code)}
              color={themeColor}
              style={{ marginRight: 8 }}
            />
            <Text>{title ?? code}</Text>
          </View>
        ))}
        {available.length === 0 && (
          <Text style={styles.helpText}>
            Aucun cursus détecté. Ajoutez-en dans « Personnalisation ».
          </Text>
        )}
      </View>

      {/* ==== Infos & crédits ==== */}
      <Text style={[styles.h2, { marginTop: 16 }]}>Informations & crédits</Text>
      <View style={styles.infoBox}>
        {INFO_LINES.map((line, i) => (
          <Text key={i} style={styles.infoText}>• {line}</Text>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  h2: { fontSize: 16, fontWeight: '700', marginBottom: 8 },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },

  // Entrées
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
  },
  helpText: { color: '#666', fontSize: 12, marginTop: 4 },

  // Couleur (web)
  colorBarWebWrap: {
    width: '100%',
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  // Couleur (natif)
  colorPreview: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  // Infos
  infoBox: { backgroundColor: '#f2f2f7', borderRadius: 10, padding: 10 },
  infoText: { color: '#333', marginBottom: 4 },
});
