// src/lib/dataSource.ts
import { supabase } from './supabase';
import { useCustomData, type Chapter, type Demo, mergeById } from '../store/useCustomData';
import type { Cursus } from '../store/useCustomData';

// ---------- Helpers ----------
type CursusEx = Cursus & { description?: string | null };

function mergeCursus(sql: CursusEx[], custom: Cursus[]): CursusEx[] {
  const map = new Map<string, CursusEx>();
  sql.forEach(c => map.set(c.code, c));
  // le local écrase/complète le SQL
  custom.forEach(c => map.set(c.code, { ...(map.get(c.code) || {}), ...c }));
  return Array.from(map.values());
}

function normalizeCursusRow(row: any): CursusEx | null {
  if (!row || !row.code) return null;
  return {
    code: row.code,
    title: row.name ?? row.title ?? row.code,
    description: row.description ?? null
  };
}

function normalizeChapterRow(row: any): Chapter | null {
  if (!row || !row.id) return null;
  return {
    id: String(row.id),
    title: row.title ?? '',
    cover_url: row.cover_url ?? null,
    cursus_code: row.cursus_code ?? row.cursus ?? '',
    sort_index: row.sort_index ?? 0
  };
}

function normalizeDemoRow(row: any): Demo | null {
  if (!row || !row.id) return null;
  return {
    id: String(row.id),
    chapter_id: String(row.chapter_id),
    title: row.title ?? '',
    statement: row.statement ?? '',
    proof: row.proof ?? '',
    sort_index: row.sort_index ?? 0
  } as Demo;
}

// ---------- Public API ----------
export async function getAllCursus(): Promise<Cursus[]> {
  try {
    const { data, error } = await supabase.from('cursus').select('*');
    if (error) throw error;
    const sql = (data || []).map(normalizeCursusRow).filter(Boolean) as CursusEx[];
    const custom = [...useCustomData.getState().cursus];
    return mergeCursus(sql, custom);
  } catch {
    // fallback: uniquement locaux
    return [...useCustomData.getState().cursus];
  }
}

// Map { code -> cursus } (pratique pour afficher les titres + description)
export async function getCursusMap(): Promise<Record<string, CursusEx>> {
  const list = (await getAllCursus()) as CursusEx[];
  const map: Record<string, CursusEx> = {};
  list.forEach(c => { map[c.code] = c; });
  return map;
}

export async function getAllChapters(): Promise<Chapter[]> {
  try {
    const { data, error } = await supabase.from('chapters').select('*');
    if (error) throw error;
    const sql = (data || []).map(normalizeChapterRow).filter(Boolean) as Chapter[];
    const custom = [...useCustomData.getState().chapters];
    // local en second pour écraser d’éventuels champs
    return mergeById(sql, custom);
  } catch {
    return [...useCustomData.getState().chapters];
  }
}

export async function getAllDemos(): Promise<Demo[]> {
  try {
    const { data, error } = await supabase.from('demos').select('*');
    if (error) throw error;
    const sql = (data || []).map(normalizeDemoRow).filter(Boolean) as Demo[];
    const custom = [...useCustomData.getState().demos];
    return mergeById(sql, custom);
  } catch {
    return [...useCustomData.getState().demos];
  }
}
