// src/screens/CustomizeScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal
} from 'react-native';
import Checkbox from 'expo-checkbox';
import Collapsible from 'react-native-collapsible';
import { useCustomData, Cursus, Chapter, Demo } from '../store/useCustomData';
import { useSettings, ALL_CURSUS } from '../store/useSettings';
import { getAllChapters } from '../lib/dataSource';

type Option = { label: string; value: string };
type ExportKind = 'cursus' | 'chapters' | 'demos';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  options: Option[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selectBox} onPress={() => setOpen(true)}>
        <Text style={styles.selectText}>
          {selected ? selected.label : 'Choisir…'}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {options.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  style={styles.optionRow}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setOpen(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function csvEscape(v: any): string {
  const s = v === null || v === undefined ? '' : String(v);
  const needsQuotes = /[",\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function makeCsv(kind: ExportKind, rows: any[]): string {
  if (kind === 'cursus') {
    const header = 'code,title';
    const body = rows.map((r) => [csvEscape(r.code), csvEscape(r.title ?? r.code)].join(',')).join('\n');
    return header + '\n' + body;
  }
  if (kind === 'chapters') {
    const header = 'id,title,cursus_code,cover_url,sort_index';
    const body = rows.map((r) => [
      csvEscape(r.id),
      csvEscape(r.title),
      csvEscape(r.cursus_code),
      csvEscape(r.cover_url ?? ''),
      csvEscape(r.sort_index ?? '')
    ].join(',')).join('\n');
    return header + '\n' + body;
  }
  const header = 'id,chapter_id,title,statement,proof,sort_index';
  const body = rows.map((r) => [
    csvEscape(r.id),
    csvEscape(r.chapter_id),
    csvEscape(r.title),
    csvEscape(r.statement ?? ''),
    csvEscape(r.proof ?? ''),
    csvEscape(r.sort_index ?? '')
  ].join(',')).join('\n');
  return header + '\n' + body;
}

function downloadTextFile(filename: string, content: string, onFallback?: (text: string) => void) {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }
  onFallback?.(content);
}

function ExportModal({
  visible,
  kind,
  items,
  onClose,
  themeColor,
}: {
  visible: boolean;
  kind: ExportKind;
  items: any[];
  onClose: () => void;
  themeColor: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewText, setPreviewText] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelected(new Set(items.map((it) => (kind === 'cursus' ? it.code : it.id))));
      setPreviewText(null);
    }
  }, [visible, items, kind]);

  const keyOf = (it: any) => (kind === 'cursus' ? it.code : it.id);
  const labelOf = (it: any) => {
    if (kind === 'cursus') return `${it.code} — ${it.title ?? it.code}`;
    if (kind === 'chapters') return `[${it.cursus_code}] ${it.title} (${it.id})`;
    return `${it.title} (${it.id})`;
  };

  const toggle = (k: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const allSelected = selected.size === items.length && items.length > 0;

  const doExport = () => {
    const rows = items.filter((it) => selected.has(keyOf(it)));
    const csv = makeCsv(kind, rows);
    const filename = `${kind}-export.txt`;
    downloadTextFile(filename, csv, (text) => setPreviewText(text));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { maxWidth: 720, width: '100%' }]}>
          <Text style={styles.modalTitle}>
            Exporter {kind === 'cursus' ? 'les cursus' : kind === 'chapters' ? 'les chapitres' : 'les démonstrations'}
          </Text>

          {previewText === null ? (
            <>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <Text style={{ fontWeight:'600' }}>{items.length} élément(s)</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (allSelected) setSelected(new Set());
                    else setSelected(new Set(items.map((it) => keyOf(it))));
                  }}
                  style={[styles.actionBtn, { borderColor: themeColor }]}
                >
                  <Text style={[styles.actionText, { color: themeColor }]}>{allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 320 }}>
                {items.map((it) => {
                  const k = keyOf(it);
                  return (
                    <View key={k} style={styles.exportRow}>
                      <Checkbox value={selected.has(k)} onValueChange={() => toggle(k)} />
                      <Text style={{ marginLeft: 8, flex: 1 }}>{labelOf(it)}</Text>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Boutons alignés horizontalement */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: themeColor }]} onPress={doExport}>
                  <Text style={styles.primaryText}>Télécharger (.txt)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCloseInline} onPress={onClose}>
                  <Text style={styles.modalCloseText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={{ marginBottom: 8, color:'#555' }}>
                Copiez ce texte (format CSV) si le téléchargement de fichier n’est pas disponible sur votre plateforme :
              </Text>
              <TextInput
                value={previewText}
                editable={false}
                multiline
                style={[styles.input, styles.inputMultiline, { minHeight: 180 }]}
              />
              <View style={styles.modalActionRow}>
                <TouchableOpacity style={styles.modalCloseInline} onPress={onClose}>
                  <Text style={styles.modalCloseText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function CustomizeScreen() {
  const themeColor = useSettings(s => s.themeColor);
  const {
    cursus, chapters, demos,
    upsertCursus, upsertChapter, upsertDemo,
    removeCursus, removeChapter, removeDemo,
    importCsv
  } = useCustomData();
  const toggleCursus = useSettings(s => s.toggleCursus);

  const [editingCursusCode, setEditingCursusCode] = useState<string | null>(null);
  const [editingChapterId,  setEditingChapterId]  = useState<string | null>(null);
  const [editingDemoId,     setEditingDemoId]     = useState<string | null>(null);

  const [cursusForm, setCursusForm] = useState<Cursus>({ code: '', title: '' });
  const [chapterForm, setChapterForm] = useState<Chapter>({
    id: '', title: '', cursus_code: '', cover_url: '', sort_index: null
  });
  const [demoForm, setDemoForm] = useState<Demo>({
    id: '', chapter_id: '', title: '', statement: '', proof: '', sort_index: null
  });

  const [csvCursus, setCsvCursus] = useState('');
  const [csvChapters, setCsvChapters] = useState('');
  const [csvDemos, setCsvDemos] = useState('');

  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  useEffect(() => {
    (async () => setAllChapters(await getAllChapters()))();
  }, [chapters]);

  const availableCursus = useMemo(() => {
    const set = new Set<string>(ALL_CURSUS as unknown as string[]);
    cursus.forEach(c => set.add(c.code));
    allChapters.forEach(ch => set.add(ch.cursus_code));
    return Array.from(set.values()).sort((a,b) => a.localeCompare(b));
  }, [cursus, allChapters]);

  const cursusOptions: Option[] = useMemo(
    () => availableCursus.map(code => ({ label: code, value: code })),
    [availableCursus]
  );

  const chapterOptions: Option[] = useMemo(() => {
    const list = [...allChapters].sort((a, b) => {
      if (a.cursus_code !== b.cursus_code) return a.cursus_code.localeCompare(b.cursus_code);
      const sa = a.sort_index ?? 1e9;
      const sb = b.sort_index ?? 1e9;
      if (sa !== sb) return sa - sb;
      return a.title.localeCompare(b.title);
    });
    return list.map(ch => ({
      value: ch.id,
      label: `[${ch.cursus_code}] ${ch.title}`
    }));
  }, [allChapters]);

  const onSaveCursus = () => {
    const code = cursusForm.code.trim();
    if (!code) return;
    upsertCursus({ code, title: (cursusForm.title || code).trim() });
    if (!editingCursusCode) toggleCursus(code);
    setCursusForm({ code: '', title: '' });
    setEditingCursusCode(null);
  };

  const onSaveChapter = () => {
    const id = chapterForm.id.trim();
    if (!id || !chapterForm.title.trim() || !chapterForm.cursus_code?.trim()) return;
    upsertChapter({
      id,
      title: chapterForm.title.trim(),
      cursus_code: chapterForm.cursus_code.trim(),
      cover_url: chapterForm.cover_url?.trim() || null,
      sort_index: chapterForm.sort_index ?? null
    });
    setChapterForm({ id: '', title: '', cursus_code: '', cover_url: '', sort_index: null });
    setEditingChapterId(null);
  };

  const onSaveDemo = () => {
    const id = demoForm.id.trim();
    if (!id || !demoForm.title.trim() || !demoForm.chapter_id?.trim()) return;
    upsertDemo({
      id,
      chapter_id: demoForm.chapter_id.trim(),
      title: demoForm.title.trim(),
      statement: demoForm.statement ?? '',
      proof: demoForm.proof ?? '',
      sort_index: demoForm.sort_index ?? null
    });
    setDemoForm({ id: '', chapter_id: '', title: '', statement: '', proof: '', sort_index: null });
    setEditingDemoId(null);
  };

  const onEditCursus = (c: Cursus) => {
    setCursusForm(c);
    setEditingCursusCode(c.code);
  };
  const onEditChapter = (c: Chapter) => {
    setChapterForm({
      id: c.id,
      title: c.title,
      cursus_code: c.cursus_code,
      cover_url: c.cover_url ?? '',
      sort_index: c.sort_index ?? null
    });
    setEditingChapterId(c.id);
  };
  const onEditDemo = (d: Demo) => {
    setDemoForm({
      id: d.id,
      chapter_id: d.chapter_id,
      title: d.title,
      statement: d.statement,
      proof: d.proof,
      sort_index: d.sort_index ?? null
    });
    setEditingDemoId(d.id);
  };

  const onCancelCursus = () => {
    setCursusForm({ code: '', title: '' });
    setEditingCursusCode(null);
  };
  const onCancelChapter = () => {
    setChapterForm({ id: '', title: '', cursus_code: '', cover_url: '', sort_index: null });
    setEditingChapterId(null);
  };
  const onCancelDemo = () => {
    setDemoForm({ id: '', chapter_id: '', title: '', statement: '', proof: '', sort_index: null });
    setEditingDemoId(null);
  };

  const handleCsvImport = async (kind: ExportKind, text: string) => {
    const { imported, errors } = importCsv(kind, text);
    if (typeof alert !== 'undefined') {
      alert(`${imported} ligne(s) importée(s).` + (errors.length ? `\nErreurs: ${errors.join('; ')}` : ''));
    }
  };

  const FilePicker = ({ kind }: { kind: ExportKind }) => {
    if (Platform.OS !== 'web') return null;
    return (
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={async (e: any) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const text = await f.text();
          handleCsvImport(kind, text);
          e.target.value = '';
        }}
        style={{ marginTop: 8 }}
      />
    );
  };

  const sortedCursus = useMemo(
    () => [...cursus].sort((a,b) => a.code.localeCompare(b.code)),
    [cursus]
  );
  const sortedChapters = useMemo(
    () => [...chapters].sort((a,b) => {
      if (a.cursus_code !== b.cursus_code) return a.cursus_code.localeCompare(b.cursus_code);
      const sa = a.sort_index ?? 1e9, sb = b.sort_index ?? 1e9;
      if (sa !== sb) return sa - sb;
      return a.title.localeCompare(b.title);
    }),
    [chapters]
  );
  const sortedDemos = useMemo(
    () => [...demos].sort((a,b) => {
      if (a.chapter_id !== b.chapter_id) return a.chapter_id.localeCompare(b.chapter_id);
      const sa = a.sort_index ?? 1e9, sb = b.sort_index ?? 1e9;
      if (sa !== sb) return sa - sb;
      return a.title.localeCompare(b.title);
    }),
    [demos]
  );

  const [openList, setOpenList] = useState<{cursus:boolean;chapters:boolean;demos:boolean}>({
    cursus: false, chapters: false, demos: false
  });

  const [exportKind, setExportKind] = useState<ExportKind | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* ==== CURSUS ==== */}
      <Section title="Cursus (CSV: code,title)">
        <View style={styles.row}>
          <TextInput
            placeholder="code"
            value={cursusForm.code}
            onChangeText={(t) => setCursusForm(s => ({ ...s, code: t }))}
            editable={editingCursusCode === null}
            style={[styles.input, { flex:1, marginRight:8, opacity: editingCursusCode ? 0.6 : 1 }]}
          />
          <TextInput
            placeholder="titre"
            value={cursusForm.title}
            onChangeText={(t) => setCursusForm(s => ({ ...s, title: t }))}
            style={[styles.input, { flex:1 }]}
          />
        </View>
        <View style={{ flexDirection:'row' }}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: themeColor, flex:1 }]} onPress={onSaveCursus}>
            <Text style={styles.primaryText}>{editingCursusCode ? 'Mettre à jour' : 'Enregistrer'}</Text>
          </TouchableOpacity>
          {editingCursusCode && (
            <TouchableOpacity style={[styles.secondaryBtn, { marginLeft: 8 }]} onPress={onCancelCursus}>
              <Text style={styles.secondaryText}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          placeholder="Coller un CSV de cursus ici…"
          value={csvCursus}
          onChangeText={setCsvCursus}
          style={[styles.input, styles.inputMultiline]}
          multiline
        />
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: themeColor }]} onPress={() => handleCsvImport('cursus', csvCursus)}>
              <Text style={[styles.secondaryText, { color: themeColor }]}>Importer (texte)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: themeColor, marginLeft: 8 }]} onPress={() => setExportKind('cursus')}>
              <Text style={[styles.secondaryText, { color: themeColor }]}>Exporter données</Text>
            </TouchableOpacity>
          </View>
          <FilePicker kind="cursus" />
        </View>

        <Text style={styles.smallInfo}>Cursus enregistrés: {cursus.length}</Text>

        <TouchableOpacity
          style={styles.foldHeader}
          onPress={() => setOpenList(s => ({ ...s, cursus: !s.cursus }))}
        >
          <Text style={styles.foldTitle}>Voir / Modifier les cursus</Text>
          <Text style={styles.chevron}>{openList.cursus ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        <Collapsible collapsed={!openList.cursus}>
          {sortedCursus.map(c => (
            <View key={c.code} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{c.title}</Text>
                <Text style={styles.listSub}>code: {c.code}</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onEditCursus(c)}>
                  <Text style={styles.actionText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => removeCursus(c.code)}>
                  <Text style={[styles.actionText, styles.dangerText]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Collapsible>
      </Section>

      {/* ==== CHAPITRE ==== */}
      <Section title="Chapitre (CSV: id,title,cursus_code,cover_url?,sort_index?)">
        <TextInput
          placeholder="id"
          value={chapterForm.id}
          onChangeText={(t) => setChapterForm(s => ({ ...s, id: t }))}
          editable={editingChapterId === null}
          style={[styles.input, { opacity: editingChapterId ? 0.6 : 1 }]}
        />
        <TextInput
          placeholder="titre"
          value={chapterForm.title}
          onChangeText={(t) => setChapterForm(s => ({ ...s, title: t }))}
          style={styles.input}
        />

        <Select
          label="Cursus"
          value={chapterForm.cursus_code}
          options={cursusOptions}
          onChange={(v) => setChapterForm(s => ({ ...s, cursus_code: v }))}
        />

        <TextInput
          placeholder="cover_url (optionnel)"
          value={chapterForm.cover_url ?? ''}
          onChangeText={(t) => setChapterForm(s => ({ ...s, cover_url: t }))}
          style={styles.input}
        />
        <TextInput
          placeholder="sort_index (optionnel, nombre)"
          keyboardType="numeric"
          value={chapterForm.sort_index != null ? String(chapterForm.sort_index) : ''}
          onChangeText={(t) => setChapterForm(s => ({ ...s, sort_index: t ? Number(t) : null }))}
          style={styles.input}
        />
        <View style={{ flexDirection:'row' }}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: themeColor, flex:1 }]} onPress={onSaveChapter}>
            <Text style={styles.primaryText}>{editingChapterId ? 'Mettre à jour' : 'Enregistrer'}</Text>
          </TouchableOpacity>
          {editingChapterId && (
            <TouchableOpacity style={[styles.secondaryBtn, { marginLeft: 8 }]} onPress={onCancelChapter}>
              <Text style={styles.secondaryText}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          placeholder="Coller un CSV de chapitres ici…"
          value={csvChapters}
          onChangeText={setCsvChapters}
          style={[styles.input, styles.inputMultiline]}
          multiline
        />
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: themeColor }]} onPress={() => handleCsvImport('chapters', csvChapters)}>
              <Text style={[styles.secondaryText, { color: themeColor }]}>Importer (texte)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: themeColor, marginLeft: 8 }]} onPress={() => setExportKind('chapters')}>
              <Text style={[styles.secondaryText, { color: themeColor }]}>Exporter données</Text>
            </TouchableOpacity>
          </View>
          <FilePicker kind="chapters" />
        </View>

        <Text style={styles.smallInfo}>Chapitres enregistrés: {chapters.length}</Text>

        <TouchableOpacity
          style={styles.foldHeader}
          onPress={() => setOpenList(s => ({ ...s, chapters: !s.chapters }))}
        >
          <Text style={styles.foldTitle}>Voir / Modifier les chapitres</Text>
          <Text style={styles.chevron}>{openList.chapters ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        <Collapsible collapsed={!openList.chapters}>
          {sortedChapters.map(ch => (
            <View key={ch.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{ch.title}</Text>
                <Text style={styles.listSub}>id: {ch.id} • cursus: {ch.cursus_code}</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onEditChapter(ch)}>
                  <Text style={styles.actionText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => removeChapter(ch.id)}>
                  <Text style={[styles.actionText, styles.dangerText]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Collapsible>
      </Section>

      {/* ==== DÉMONSTRATION ==== */}
      <Section title="Démonstration (CSV: id,chapter_id,title,statement,proof,sort_index?)">
        <TextInput
          placeholder="id"
          value={demoForm.id}
          onChangeText={(t) => setDemoForm(s => ({ ...s, id: t }))}
          editable={editingDemoId === null}
          style={[styles.input, { opacity: editingDemoId ? 0.6 : 1 }]}
        />

        <Select
          label="Chapitre"
          value={demoForm.chapter_id}
          options={chapterOptions}
          onChange={(v) => setDemoForm(s => ({ ...s, chapter_id: v }))}
        />

        <TextInput
          placeholder="titre"
          value={demoForm.title}
          onChangeText={(t) => setDemoForm(s => ({ ...s, title: t }))}
          style={styles.input}
        />
        <TextInput
          placeholder="énoncé (statement)"
          value={demoForm.statement}
          onChangeText={(t) => setDemoForm(s => ({ ...s, statement: t }))}
          style={[styles.input, styles.inputMultiline]}
          multiline
        />
        <TextInput
          placeholder="preuve (proof)"
          value={demoForm.proof}
          onChangeText={(t) => setDemoForm(s => ({ ...s, proof: t }))}
          style={[styles.input, styles.inputMultiline]}
          multiline
        />
        <TextInput
          placeholder="sort_index (optionnel, nombre)"
          keyboardType="numeric"
          value={demoForm.sort_index != null ? String(demoForm.sort_index) : ''}
          onChangeText={(t) => setDemoForm(s => ({ ...s, sort_index: t ? Number(t) : null }))}
          style={styles.input}
        />
        <View style={{ flexDirection:'row' }}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: themeColor, flex:1 }]} onPress={onSaveDemo}>
            <Text style={styles.primaryText}>{editingDemoId ? 'Mettre à jour' : 'Enregistrer'}</Text>
          </TouchableOpacity>
          {editingDemoId && (
            <TouchableOpacity style={[styles.secondaryBtn, { marginLeft: 8 }]} onPress={onCancelDemo}>
              <Text style={styles.secondaryText}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          placeholder="Coller un CSV de démos ici…"
          value={csvDemos}
          onChangeText={setCsvDemos}
          style={[styles.input, styles.inputMultiline]}
          multiline
        />
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: themeColor }]} onPress={() => handleCsvImport('demos', csvDemos)}>
              <Text style={[styles.secondaryText, { color: themeColor }]}>Importer (texte)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: themeColor, marginLeft: 8 }]} onPress={() => setExportKind('demos')}>
              <Text style={[styles.secondaryText, { color: themeColor }]}>Exporter données</Text>
            </TouchableOpacity>
          </View>
          <FilePicker kind="demos" />
        </View>

        <Text style={styles.smallInfo}>Démonstrations enregistrées: {demos.length}</Text>

        <TouchableOpacity
          style={styles.foldHeader}
          onPress={() => setOpenList(s => ({ ...s, demos: !s.demos }))}
        >
          <Text style={styles.foldTitle}>Voir / Modifier les démonstrations</Text>
          <Text style={styles.chevron}>{openList.demos ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        <Collapsible collapsed={!openList.demos}>
          {sortedDemos.map(d => (
            <View key={d.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{d.title}</Text>
                <Text style={styles.listSub}>id: {d.id} • chapitre: {d.chapter_id}</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onEditDemo(d)}>
                  <Text style={styles.actionText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => removeDemo(d.id)}>
                  <Text style={[styles.actionText, styles.dangerText]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Collapsible>
      </Section>

      <View style={{ height: 24 }} />

      <ExportModal
        visible={exportKind !== null}
        kind={exportKind ?? 'cursus'}
        items={
          exportKind === 'chapters'
            ? sortedChapters
            : exportKind === 'demos'
            ? sortedDemos
            : sortedCursus
        }
        onClose={() => setExportKind(null)}
        themeColor={themeColor}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  h2: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  section: { marginTop: 16, padding: 12, backgroundColor: '#f2f2f7', borderRadius: 12 },

  row: { flexDirection: 'row', alignItems: 'center' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },

  label: { marginBottom: 4, color: '#333', fontWeight: '600' },
  selectBox: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 },
  selectText: { color: '#111' },

  primaryBtn: { paddingVertical: 10, borderRadius: 16, alignItems: 'center', marginBottom: 8 },
  primaryText: { color: 'white', fontWeight: '700' },

  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2, borderColor: '#ddd' },
  secondaryText: { fontWeight: '700', color: '#333' },

  smallInfo: { color: '#666', marginTop: 4 },

  // Listes
  foldHeader: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#e9e9ef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  foldTitle: { fontWeight: '700' },
  chevron: { fontSize: 16, color: '#555' },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8
  },
  listTitle: { fontSize: 16, fontWeight: '600' },
  listSub:   { color: '#666', marginTop: 2 },

  actionRow: { flexDirection: 'row', marginLeft: 8 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginLeft: 8 },
  actionText: { fontWeight: '700' },
  dangerBtn: { borderColor: '#ff3b30' },
  dangerText: { color: '#ff3b30', fontWeight: '700' },

  // Modales
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: 'white', borderRadius: 12, padding: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  optionRow: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  optionText: { fontSize: 16 },
  modalClose: { marginTop: 8, alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#eee' },
  modalCloseText: { fontWeight: '700', color: '#333' },

  // Export list rows
  exportRow: { flexDirection:'row', alignItems:'center', paddingVertical:6, paddingHorizontal:4 },

  // Alignement propre des boutons dans la modale d'export
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12 },
  modalCloseInline: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#eee', marginLeft: 8 },
});
