// src/lib/dataSource.ts
import { supabase } from './supabase';
import { useCustomData, Chapter, Demo, mergeById } from '../store/useCustomData';

// Récupère chapitres (SQL + CSV local)
export async function getAllChapters(): Promise<Chapter[]> {
  try {
    const { data, error } = await supabase.from('chapters').select('*').order('sort_index');
    if (error) throw error;
    const sqlChapters = (data ?? []) as Chapter[];
    const customChapters = useCustomData.getState().chapters;
    // fusion: le local écrase le SQL si même id
    const merged = mergeById(sqlChapters, customChapters);
    // tri stable par sort_index puis titre
    return merged.sort((a, b) => {
      const sa = a.sort_index ?? 1e9;
      const sb = b.sort_index ?? 1e9;
      if (sa !== sb) return sa - sb;
      return a.title.localeCompare(b.title);
    });
  } catch {
    // fallback local
    return [...useCustomData.getState().chapters];
  }
}

// Récupère démos (SQL + CSV local)
export async function getAllDemos(): Promise<Demo[]> {
  try {
    const { data, error } = await supabase.from('demos').select('*').order('sort_index');
    if (error) throw error;
    const sqlDemos = (data ?? []) as Demo[];
    const customDemos = useCustomData.getState().demos;
    const merged = mergeById(sqlDemos, customDemos);
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
