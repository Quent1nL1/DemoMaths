// src/store/useCustomData.ts
import create from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Cursus = { code: string; title: string };
export type Chapter = {
  id: string;
  title: string;
  cover_url?: string | null;
  cursus_code: string;
  sort_index?: number | null;
};
export type Demo = {
  id: string;
  chapter_id: string;
  title: string;
  statement: string;
  proof: string;
  sort_index?: number | null;
};

type CustomDataState = {
  cursus: Cursus[];
  chapters: Chapter[];
  demos: Demo[];

  // CRUD
  upsertCursus: (c: Cursus) => void;
  upsertChapter: (c: Chapter) => void;
  upsertDemo: (d: Demo) => void;

  removeCursus: (code: string) => void;   // supprime aussi chapitres & démos liés
  removeChapter: (id: string) => void;    // supprime aussi ses démos
  removeDemo: (id: string) => void;

  // Import CSV (le format doit matcher les colonnes de la base)
  importCsv: (
    kind: 'cursus' | 'chapters' | 'demos',
    csv: string
  ) => { imported: number; errors: string[] };

  clearAll: () => void;
};

const STORAGE_KEY = 'DemoMaths_CustomData_v1';

function save(state: Pick<CustomDataState, 'cursus' | 'chapters' | 'demos'>) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

/**
 * CSV parser robuste :
 * - Parcourt caractère par caractère.
 * - Respecte les champs entre guillemets, y compris les sauts de ligne internes.
 * - Gère l’échappement "" -> " en CSV.
 */
function parseCsv(csv: string): Record<string, string>[] {
  const s = csv.replace(/\r\n?/g, '\n');
  const rows: string[][] = [];

  let cell = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inQuotes) {
      if (ch === '"' && s[i + 1] === '"') {
        // échappement de guillemet
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  // dernière cellule / dernière ligne
  row.push(cell);
  rows.push(row);

  // aucun contenu utile
  if (rows.length === 0 || rows[0].every(v => (v ?? '').trim() === '')) return [];

  // En-têtes + BOM éventuel
  const headers = rows[0].map(h => h.trim());
  if (headers[0] && headers[0].charCodeAt(0) === 0xfeff) {
    headers[0] = headers[0].slice(1);
  }

  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    // ignorer lignes totalement vides
    const allEmpty = cols.every(c => (c ?? '').trim() === '');
    if (allEmpty) continue;

    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? '').trim();
    });
    out.push(obj);
  }
  return out;
}

export const useCustomData = create<CustomDataState>((set, get) => ({
  cursus: [],
  chapters: [],
  demos: [],

  upsertCursus: (c) =>
    set((st) => {
      const idx = st.cursus.findIndex((x) => x.code === c.code);
      const next = [...st.cursus];
      if (idx >= 0) next[idx] = { ...next[idx], ...c };
      else next.push(c);
      const payload = { cursus: next, chapters: st.chapters, demos: st.demos };
      save(payload);
      return payload;
    }),

  upsertChapter: (c) =>
    set((st) => {
      const idx = st.chapters.findIndex((x) => x.id === c.id);
      const next = [...st.chapters];
      if (idx >= 0) next[idx] = { ...next[idx], ...c };
      else next.push(c);
      // s'assure que le cursus existe
      if (!st.cursus.some((k) => k.code === c.cursus_code)) {
        st.cursus.push({ code: c.cursus_code, title: c.cursus_code });
      }
      const payload = { cursus: st.cursus, chapters: next, demos: st.demos };
      save(payload);
      return payload;
    }),

  upsertDemo: (d) =>
    set((st) => {
      const idx = st.demos.findIndex((x) => x.id === d.id);
      const next = [...st.demos];
      if (idx >= 0) next[idx] = { ...next[idx], ...d };
      else next.push(d);
      const payload = { cursus: st.cursus, chapters: st.chapters, demos: next };
      save(payload);
      return payload;
    }),

  removeCursus: (code) =>
    set((st) => {
      const chapterIds = st.chapters
        .filter((ch) => ch.cursus_code === code)
        .map((ch) => ch.id);
      const payload = {
        cursus: st.cursus.filter((c) => c.code !== code),
        chapters: st.chapters.filter((ch) => ch.cursus_code !== code),
        demos: st.demos.filter((d) => !chapterIds.includes(d.chapter_id)),
      };
      save(payload);
      return payload;
    }),

  removeChapter: (id) =>
    set((st) => {
      const payload = {
        cursus: st.cursus,
        chapters: st.chapters.filter((ch) => ch.id !== id),
        demos: st.demos.filter((d) => d.chapter_id !== id),
      };
      save(payload);
      return payload;
    }),

  removeDemo: (id) =>
    set((st) => {
      const payload = {
        cursus: st.cursus,
        chapters: st.chapters,
        demos: st.demos.filter((d) => d.id !== id),
      };
      save(payload);
      return payload;
    }),

  importCsv: (kind, csv) => {
    const rows = parseCsv(csv);
    const errors: string[] = [];
    let imported = 0;
    const { upsertCursus, upsertChapter, upsertDemo } = get();
    for (const r of rows) {
      try {
        if (kind === 'cursus') {
          if (!r['code']) throw new Error('Colonne "code" obligatoire');
          const c: Cursus = {
            code: r['code'],
            title: r['title'] ?? r['code'],
          };
          upsertCursus(c);
          imported++;
        } else if (kind === 'chapters') {
          if (!r['id'] || !r['title'] || !r['cursus_code']) {
            throw new Error('Colonnes "id","title","cursus_code" obligatoires');
          }
          const ch: Chapter = {
            id: r['id'],
            title: r['title'],
            cursus_code: r['cursus_code'],
            cover_url: r['cover_url'] ?? null,
            sort_index: r['sort_index'] ? Number(r['sort_index']) : null,
          };
          upsertChapter(ch);
          imported++;
        } else if (kind === 'demos') {
          if (!r['id'] || !r['chapter_id'] || !r['title']) {
            throw new Error('Colonnes "id","chapter_id","title" obligatoires');
          }
          const d: Demo = {
            id: r['id'],
            chapter_id: r['chapter_id'],
            title: r['title'],
            statement: r['statement'] ?? '',
            proof: r['proof'] ?? '',
            sort_index: r['sort_index'] ? Number(r['sort_index']) : null,
          };
          upsertDemo(d);
          imported++;
        }
      } catch (e: any) {
        errors.push(e.message);
      }
    }
    return { imported, errors };
  },

  clearAll: () =>
    set(() => {
      const payload = { cursus: [], chapters: [], demos: [] };
      save(payload);
      return payload;
    }),
}));

// Hydratation
AsyncStorage.getItem(STORAGE_KEY).then((str) => {
  if (!str) return;
  try {
    const parsed = JSON.parse(str);
    useCustomData.setState({
      cursus: parsed.cursus ?? [],
      chapters: parsed.chapters ?? [],
      demos: parsed.demos ?? [],
    });
  } catch {}
});

// Helpers pour fusionner avec Supabase
export function mergeById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  for (const x of a) map.set(x.id, x);
  for (const x of b) map.set(x.id, x);
  return Array.from(map.values());
}
