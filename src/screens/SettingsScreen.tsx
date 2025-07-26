import React, { useLayoutEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import Checkbox from 'expo-checkbox';
import { useNavigation } from '@react-navigation/native';
import {
  useSettings,
  ALL_CURSUS,
  ThemeColor
} from '../store/useSettings';

const COLOR_OPTIONS: Record<ThemeColor, string> = {
  '#808080': 'Gris',
  '#8e44ad': 'Violet',
  '#34c759': 'Vert',
  '#ff3b30': 'Rouge',
  '#0a84ff': 'Bleu'
};

export default function SettingsScreen() {
  const navigation   = useNavigation();
  const theme        = useSettings(s => s.themeColor);
  const setTheme     = useSettings(s => s.setThemeColor);
  const selected     = useSettings(s => s.selectedCursus);
  const toggleCursus = useSettings(s => s.toggleCursus);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Thème */}
      <Text style={styles.h1}>Thème</Text>
      {(Object.keys(COLOR_OPTIONS) as ThemeColor[]).map(col => {
        const label = COLOR_OPTIONS[col];
        const isSel = theme === col;
        return (
          <TouchableOpacity
            key={col}
            style={[
              styles.colorButton,
              {
                backgroundColor: isSel ? col : '#ffffff',
                borderColor: col
              }
            ]}
            onPress={() => setTheme(col)}
          >
            <Text
              style={[
                styles.colorLabel,
                { color: isSel ? '#ffffff' : '#000000' }
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Cursus */}
      <Text style={[styles.h1, { marginTop: 24 }]}>Cursus affichés</Text>
      {ALL_CURSUS.map(code => {
        const isSel = selected.has(code);
        return (
          <View key={code} style={styles.row}>
            <Checkbox
              value={isSel}
              onValueChange={() => toggleCursus(code)}
              color={theme}
            />
            <Text style={styles.cursusLabel}>{code}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, padding: 20, paddingBottom: 40 },
  h1:            { fontSize: 20, fontWeight: '700', marginBottom: 12 },

  colorButton:   {
    paddingVertical:   12,
    paddingHorizontal: 16,
    borderRadius:      16,
    borderWidth:       2,
    marginBottom:      12,
    alignItems:        'center'
  },
  colorLabel:    { fontSize: 16, fontWeight: '600' },

  row:           {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  12
  },
  cursusLabel:   { marginLeft: 8, fontSize: 16 }
});
