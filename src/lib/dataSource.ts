// src/lib/dataSource.ts
import { supabase } from './supabase';
import { useCustomData, Chapter, Demo } from '../store/useCustomData';
import type { Cursus } from '../store/useCustomData';

// ---------- Helpers ----------
function mergeCursus(sql: Cursus[], custom: Cursus[]): Cursus[] {
  const map = new Map<string, Cursus>();
  sql.forEach(c => map.set(c.code, c));
  // le local écrase/complète le SQL
  custom.forEach(c => map.set(c.code, { ...(map.get(c.code) || {}), ...c }));
  return Array.from(map.values());
}

function normalizeCursusRow(row: any): Cursus | null {
  if (!row || !row.code) return null;
  // On tente plusieurs colonnes de titre possibles (title, titre, name, label, libelle, etc.)
  const title =
    row.title ??
    row.titre ??
    row.name ??
    row.label ??
    row.libelle ??
    row.long_title ??
    row.display_title ??
    row.nom ??
    row.text ??
    row.description ?? // au cas où
    row.code;
  return { code: String(row.code), title: String(title) };
}

// ---------- Chapitres (SQL + local) ----------
export async function getAllChapters(): Promise<Chapter[]> {
  try {
    const { data, error } = await supabase.from('chapters').select('*').order('sort_index');
    if (error) throw error;
    const sqlChapters = (data ?? []) as Chapter[];
    const customChapters = useCustomData.getState().chapters;

    const map = new Map<string, Chapter>();
    [...sqlChapters, ...customChapters].forEach(ch => map.set(ch.id, ch));

    const merged = Array.from(map.values());
    return merged.sort((a, b) => {
      const sa = a.sort_index ?? 1e9;
      const sb = b.sort_index ?? 1e9;
      if (sa !== sb) return sa - sb;
      return a.title.localeCompare(b.title);
    });
  } catch {
    return [...useCustomData.getState().chapters];
  }
}

// ---------- Démos (SQL + local) ----------
export async function getAllDemos(): Promise<Demo[]> {
  try {
    const { data, error } = await supabase.from('demos').select('*').order('sort_index');
    if (error) throw error;
    const sqlDemos = (data ?? []) as Demo[];
    const customDemos = useCustomData.getState().demos;

    const map = new Map<string, Demo>();
    [...sqlDemos, ...customDemos].forEach(d => map.set(d.id, d));

    const merged = Array.from(map.values());
    return merged.sort((a, b) => {
      const sa = a.sort_index ?? 1e9;
      const sb = b.sort_index ?? 1e9;
      if (sa !== sb) return sa - sb;
      return a.title.localeCompare(b.title);
    });
  } catch {
    return [...useCustomData.getState().demos];
  }
}

// ---------- Cursus (SQL + local) ----------
export async function getAllCursus(): Promise<Cursus[]> {
  try {
    // On récupère * puis on normalise pour supporter différentes conventions de colonnes
    const { data, error } = await supabase.from('cursus').select('*');
    if (error) throw error;

    const sql = (data ?? [])
      .map(normalizeCursusRow)
      .filter((x: Cursus | null): x is Cursus => !!x);

    const custom = useCustomData.getState().cursus;
    const merged = mergeCursus(sql, custom);

    return merged.sort((a, b) => {
      const ta = (a.title ?? a.code).toLowerCase();
      const tb = (b.title ?? b.code).toLowerCase();
      if (ta !== tb) return ta.localeCompare(tb);
      return a.code.localeCompare(b.code);
    });
  } catch {
    // fallback: uniquement locaux
    return [...useCustomData.getState().cursus];
  }
}

// Map { code -> cursus } (pratique pour afficher les titres)
export async function getCursusMap(): Promise<Record<string, Cursus>> {
  const list = await getAllCursus();
  const map: Record<string, Cursus> = {};
  list.forEach(c => { map[c.code] = c; });
  return map;
}
