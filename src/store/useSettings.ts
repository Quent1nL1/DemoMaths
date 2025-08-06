// src/store/useSettings.ts
import create from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeColor = '#808080' | '#8e44ad' | '#34c759' | '#ff3b30';
export const ALL_CURSUS = ['MathsSup','MathsSpé','SU - MA001','SU - MA002','SU - MA003'] as const;

interface SettingsState {
  themeColor: ThemeColor;
  selectedCursus: Set<string>;
  setThemeColor: (c: ThemeColor) => void;
  toggleCursus: (code: string) => void;
}

const STORAGE_KEY = 'DemoMaths_Settings_v1';

export const useSettings = create<SettingsState>((set, get) => ({
  themeColor: '#007aff',
  selectedCursus: new Set(ALL_CURSUS),
  setThemeColor: c => {
    set({ themeColor: c });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      themeColor: c,
      selectedCursus: Array.from(get().selectedCursus)
    }));
  },
  toggleCursus: code => {
    const sel = new Set(get().selectedCursus);
    sel.has(code) ? sel.delete(code) : sel.add(code);
    set({ selectedCursus: sel });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      themeColor: get().themeColor,
      selectedCursus: Array.from(sel)
    }));
  }
}));

// Hydratation au démarrage
AsyncStorage.getItem(STORAGE_KEY).then(str => {
  if (!str) return;
  try {
    const { themeColor, selectedCursus } = JSON.parse(str);
    useSettings.setState({
      themeColor,
      selectedCursus: new Set(selectedCursus)
    });
  } catch {}
});
