// src/screens/HomeScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  LayoutChangeEvent,
  Platform,
  Dimensions,
} from 'react-native';
import { useSettings } from '../store/useSettings';
import { getAllChapters, getCursusMap } from '../lib/dataSource';
import type { Chapter, Cursus } from '../store/useCustomData';

const CONTAINER_PAD = 16; // doit rester sync avec styles.container.padding
const GAP = 12;
const CARD_MIN_W = 170;
const CARD_RADIUS = 12;
const IMG_HEIGHT = 120;
const TITLE_HEIGHT = 60;

type CursusEx = Cursus & { description?: string | null };

// largeur utile = largeur - marges intérieures du conteneur
function innerWidth(totalWidth: number) {
  return Math.max(0, totalWidth - 2 * CONTAINER_PAD);
}

// ➜ Sur téléphone (natif) et petits viewports web, on force 2 colonnes.
//    Le calcul tient compte du GAP pour que deux cartes + l'espace tiennent parfaitement.
function computeGrid(totalWidth: number): { cols: number; cardW: number } {
  const w = innerWidth(totalWidth);
  const isPhoneLike = Platform.OS !== 'web' || w < 520; // iPhone et petits écrans web
  if (isPhoneLike) {
    const cols = 2;
    const cardW = Math.floor((w - GAP * (cols - 1)) / cols);
    return { cols, cardW };
  }
  // Écrans larges : comportement précédent
  const cols = Math.max(1, Math.floor((w + GAP) / (CARD_MIN_W + GAP)));
  const cardW = Math.floor((w - GAP * (cols - 1)) / cols);
  return { cols, cardW };
}

export default function HomeScreen({ navigation }: any) {
  const selectedCursus = useSettings(s => s.selectedCursus);
  const themeColor = useSettings(s => s.themeColor);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [cursusMap, setCursusMap] = useState<Record<string, CursusEx>>({});
  const [grid, setGrid] = useState<{ cols: number; cardW: number }>(() =>
    computeGrid(Dimensions.get('window').width)
  );
  const [openDesc, setOpenDesc] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [chs, cm] = await Promise.all([getAllChapters(), getCursusMap()]);
      setChapters(chs);
      setCursusMap(cm as Record<string, CursusEx>);
    })();
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setGrid(computeGrid(w));
  };

  const filtered = useMemo(
    () => chapters.filter(ch => selectedCursus.size === 0 || selectedCursus.has(ch.cursus_code)),
    [chapters, selectedCursus]
  );

  const groups = useMemo(() => {
    const map: Record<string, Chapter[]> = {};
    for (const ch of filtered) {
      if (!map[ch.cursus_code]) map[ch.cursus_code] = [];
      map[ch.cursus_code].push(ch);
    }
    Object.values(map).forEach(list =>
      list.sort((a, b) => {
        const sa = a.sort_index ?? 1e9;
        const sb = b.sort_index ?? 1e9;
        if (sa !== sb) return sa - sb;
        return a.title.localeCompare(b.title);
      })
    );
    return map;
  }, [filtered]);

  const cursusOrder = useMemo(() => {
    const codes = Object.keys(groups);
    return codes.sort((a, b) => {
      const ca = cursusMap[a]?.title ?? a;
      const cb = cursusMap[b]?.title ?? b;
      return ca.localeCompare(cb);
    });
  }, [groups, cursusMap]);

  const renderHeader = (code: string) => {
    const c = cursusMap[code] as CursusEx | undefined;
    return (
      <View style={styles.headerRow}>
        <Text style={styles.cursusTitle}>{c?.title ?? code}</Text>
        <TouchableOpacity
          accessibilityLabel="Voir la description du cursus"
          onPress={() => setOpenDesc(prev => (prev === code ? null : code))}
          style={styles.infoBtn}
        >
          <Text style={styles.infoBtnText}>?</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderDescription = (code: string) => {
    if (openDesc !== code) return null;
    const desc = (cursusMap[code] as CursusEx | undefined)?.description;
    return (
      <View style={styles.descBox}>
        <Text style={styles.descText}>
          {desc && desc.trim().length > 0 ? desc : 'Aucune description disponible.'}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} onLayout={onLayout}>
      {cursusOrder.map(code => {
        const list = groups[code] ?? [];
        return (
          <View key={code} style={styles.section}>
            {renderHeader(code)}
            {renderDescription(code)}

            <View style={styles.row}>
              {list.map(ch => {
                return (
                  <TouchableOpacity
                    key={ch.id}
                    style={[
                      styles.card,
                      {
                        width: grid.cardW,
                        flexBasis: grid.cardW, // évite l'étirement sur web
                        borderColor: themeColor,
                        marginHorizontal: GAP / 2,
                      }
                    ]}
                    onPress={() => navigation.navigate('Chapter', { chapter: ch })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.clip}>
                      <View style={styles.imgWrap}>
                        {ch.cover_url ? (
                          <Image source={{ uri: ch.cover_url }} style={styles.img} resizeMode="cover" />
                        ) : (
                          <View style={[styles.img, { alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ color: '#999' }}>Sans image</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.titleWrap}>
                        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
                          {ch.title}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: CONTAINER_PAD },
  section: { marginBottom: 18 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cursusTitle: { fontSize: 18, fontWeight: '700', flex: 1 },

  infoBtn: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1, borderColor: '#aaa',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8, backgroundColor: '#fff'
  },
  infoBtnText: { fontSize: 14, fontWeight: '700', color: '#555', top: -0.5 },

  descBox: {
    backgroundColor: '#fff',
    borderColor: '#e2e2e2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  descText: { color: '#333', lineHeight: 20 },

  // conteneur des cartes : gap robuste via marges symétriques
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    marginHorizontal: -GAP / 2, // compense la marge de chaque carte
    alignItems: 'flex-start'
  },

  // --- Carte avec coins lissés ---
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: CARD_RADIUS,
    marginBottom: GAP,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  clip: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden'
  },

  imgWrap: {
    width: '100%',
    height: IMG_HEIGHT,
    backgroundColor: '#fafafa'
  },
  img: { width: '100%', height: '100%' },

  titleWrap: {
    width: '100%',
    height: TITLE_HEIGHT,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  title: { textAlign: 'center', width: '100%', flexWrap: 'wrap', fontSize: 15 }
});
