// src/store/useCustomData.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
// @ts-ignore – présent sur mobile natif ; ignoré sur web
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Types de données locales personnalisables
 * ----------------------------------------
 * ⚠️ Ajout demandé : `description?: string | null` sur Cursus.
 */
export type Cursus = {
  code: string;
  title: string;
  /** Description locale facultative ; synchronisée avec la colonne SQL `description` */
  description?: string | null;
};

export type Chapter = {
  id: string;
  title: string;
  cover_url?: string | null;
  cursus_code: string;
  sort_index?: number;
};

export type Demo = {
  id: string;
  chapter_id: string;
  title: string;
  statement?: string;
  proof?: string;
  sort_index?: number;
};

/**
 * Fusion utilitaire : les éléments de `override` remplacent/complètent ceux de `base` (par `id`)
 */
export function mergeById<T extends { id: string }>(base: T[], override: T[]): T[] {
  const map = new Map<string, T>();
  base.forEach(x => map.set(x.id, x));
  override.forEach(x => {
    const prev = map.get(x.id);
    map.set(x.id, prev ? { ...prev, ...x } : x);
  });
  return Array.from(map.values());
}

/**
 * Store local (avec persistance)
 */
type CustomDataState = {
  cursus: Cursus[];
  chapters: Chapter[];
  demos: Demo[];

  // Cursus
  upsertCursus: (c: Cursus) => void;
  removeCursus: (code: string) => void;

  // Chapitres
  upsertChapter: (ch: Chapter) => void;
  removeChapter: (id: string) => void;

  // Démos
  upsertDemo: (d: Demo) => void;
  removeDemo: (id: string) => void;
};

const storage = createJSONStorage(
  () => (Platform.OS === 'web' ? localStorage : AsyncStorage)
);

export const useCustomData = create<CustomDataState>()(
  persist(
    (set, get) => ({
      cursus: [],
      chapters: [],
      demos: [],

      // ---- Cursus ----
      upsertCursus: (c: Cursus) =>
        set(state => {
          const idx = state.cursus.findIndex(x => x.code === c.code);
          const next = [...state.cursus];
          if (idx === -1) next.push(c);
          else next[idx] = { ...next[idx], ...c };
          return { cursus: next };
        }),

      removeCursus: (code: string) =>
        set(state => ({
          cursus: state.cursus.filter(c => c.code !== code),
          // on ne touche pas aux chapitres/démos ici (ils peuvent rester attachés)
        })),

      // ---- Chapitres ----
      upsertChapter: (ch: Chapter) =>
        set(state => {
          const idx = state.chapters.findIndex(x => x.id === ch.id);
          const next = [...state.chapters];
          if (idx === -1) next.push(ch);
          else next[idx] = { ...next[idx], ...ch };
          return { chapters: next };
        }),

      removeChapter: (id: string) =>
        set(state => ({
          chapters: state.chapters.filter(c => c.id !== id),
          demos: state.demos.filter(d => d.chapter_id !== id)
        })),

      // ---- Démos ----
      upsertDemo: (d: Demo) =>
        set(state => {
          const idx = state.demos.findIndex(x => x.id === d.id);
          const next = [...state.demos];
          if (idx === -1) next.push(d);
          else next[idx] = { ...next[idx], ...d };
          return { demos: next };
        }),

      removeDemo: (id: string) =>
        set(state => ({
          demos: state.demos.filter(d => d.id !== id)
        }))
    }),
    {
      name: 'custom-data',
      storage
    }
  )
);
