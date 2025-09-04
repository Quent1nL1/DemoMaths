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

  // Reset (optionnel)
  clearAll: () => void;
};

const STORAGE_KEY = 'DemoMaths_CustomData_v1';

function save(state: Pick<CustomDataState, 'cursus' | 'chapters' | 'demos'>) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

function parseCsv(csv: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const lines = csv
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return rows;

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length === 1 && cols[0].trim() === '') continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
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
      // S'assure que le cursus existe
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

