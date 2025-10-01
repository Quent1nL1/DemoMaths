// src/screens/CustomizeScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Platform
} from 'react-native';
import {
  useCustomData,
  type Cursus,
  type Chapter,
  type Demo
} from '../store/useCustomData';
import { useSettings } from '../store/useSettings';

/**
 * Écran de personnalisation locale
 * --------------------------------
 * - Cursus (avec description) + Chapitres + Démos (CRUD)
 * - Export / Import 3‑en‑1 (cursus + chapters + demos)
 * - Listes déroulantes (repliées par défaut)
 * - Boutons stylés avec themeColor (au lieu du bleu en dur)
 */

// ======================= Utils Export / Import =======================
function toBundle(cursus: Cursus[], chapters: Chapter[], demos: Demo[]) {
  return {
    cursus,
    chapters,
    demos,
    _meta: { kind: 'demomaths-local-bundle', version: 1, exportedAt: new Date().toISOString() }
  };
}
function toPrettyJSON(data: any) {
  return JSON.stringify(data, null, 2);
}
function parseImportJSON(
  raw: string
): { cursus: Cursus[]; chapters: Chapter[]; demos: Demo[] } | null {
  try {
    const obj = JSON.parse(raw);
    const src = obj?.data && (obj.data.cursus || obj.data.chapters || obj.data.demos) ? obj.data : obj;

    const out = {
      cursus: Array.isArray(src?.cursus) ? src.cursus : [],
      chapters: Array.isArray(src?.chapters) ? src.chapters : [],
      demos: Array.isArray(src?.demos) ? src.demos : []
    } as { cursus: Cursus[]; chapters: Chapter[]; demos: Demo[] };

    out.cursus = out.cursus
      .filter((c: any) => c && typeof c.code === 'string' && typeof (c.title ?? '') === 'string')
      .map((c: any) => ({
        code: String(c.code),
        title: String(c.title ?? ''),
        description: c.description ?? null
      }));

    out.chapters = out.chapters
      .filter(
        (ch: any) =>
          ch && typeof ch.id === 'string' && typeof (ch.title ?? '') === 'string' && typeof (ch.cursus_code ?? '') === 'string'
      )
      .map((ch: any) => ({
        id: String(ch.id),
        title: String(ch.title ?? ''),
        cover_url: ch.cover_url ?? null,
        cursus_code: String(ch.cursus_code ?? ''),
        sort_index: typeof ch.sort_index === 'number' ? ch.sort_index : Number(ch.sort_index ?? 0)
      }));

    out.demos = out.demos
      .filter(
        (d: any) => d && typeof d.id === 'string' && typeof d.chapter_id === 'string' && typeof (d.title ?? '') === 'string'
      )
      .map((d: any) => ({
        id: String(d.id),
        chapter_id: String(d.chapter_id),
        title: String(d.title ?? ''),
        statement: d.statement ?? '',
        proof: d.proof ?? '',
        sort_index: typeof d.sort_index === 'number' ? d.sort_index : Number(d.sort_index ?? 0)
      }));

    return out;
  } catch {
    return null;
  }
}

async function shareText(text: string) {
  try {
    await Share.share({ message: text });
  } catch {
    Alert.alert('Partage', 'Impossible de partager.');
  }
}

async function copyToClipboardWeb(text: string) {
  try {
    // @ts-ignore
    if (navigator?.clipboard?.writeText) {
      // @ts-ignore
      await navigator.clipboard.writeText(text);
      Alert.alert('Copié', 'JSON copié dans le presse‑papiers.');
      return;
    }
  } catch { /* fallthrough */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    Alert.alert('Copié', 'JSON copié dans le presse‑papiers.');
  } catch {
    Alert.alert('Copie', 'Échec de la copie. Sélectionnez manuellement le texte ci‑dessous.');
  }
}

function downloadFileWeb(filename: string, jsonText: string) {
  try {
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  } catch {
    Alert.alert('Export', 'Le téléchargement a échoué.');
  }
}

function confirmDestructive(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // @ts-ignore
    const ok = window.confirm(`${title}\n${message || ''}`);
    if (ok) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onConfirm }
    ]);
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

// ======================= Component =======================
export default function CustomizeScreen() {
  // Store
  const {
    cursus,
    chapters,
    demos,
    upsertCursus,
    removeCursus,
    upsertChapter,
    removeChapter,
    upsertDemo,
    removeDemo
  } = useCustomData(s => ({
    cursus: s.cursus,
    chapters: s.chapters,
    demos: s.demos,
    upsertCursus: s.upsertCursus,
    removeCursus: s.removeCursus,
    upsertChapter: s.upsertChapter,
    removeChapter: s.removeChapter,
    upsertDemo: s.upsertDemo,
    removeDemo: s.removeDemo
  }));

  const isWeb = Platform.OS === 'web';
  const themeColor = useSettings(s => s.themeColor) || '#2f80ed';

  // ---------------- Cursus ----------------
  const [cursusCode, setCursusCode] = useState('');
  const [cursusTitle, setCursusTitle] = useState('');
  const [cursusDescription, setCursusDescription] = useState('');
  const [cursusEditing, setCursusEditing] = useState(false);

  const cursusValid = useMemo(
    () => cursusCode.trim().length > 0 && cursusTitle.trim().length > 0,
    [cursusCode, cursusTitle]
  );

  const editCursus = (c: Cursus) => {
    setCursusCode(c.code);
    setCursusTitle(c.title);
    setCursusDescription(c.description ?? '');
    setCursusEditing(true);
  };
  const resetCursus = () => {
    setCursusCode(''); setCursusTitle(''); setCursusDescription(''); setCursusEditing(false);
  };
  const saveCursus = () => {
    if (!cursusValid) return;
    upsertCursus({
      code: cursusCode.trim(),
      title: cursusTitle.trim(),
      description: (cursusDescription || '').trim() || null
    });
    resetCursus();
  };
  const deleteCursus = (code: string) =>
    confirmDestructive('Supprimer le cursus ?', code, () => removeCursus(code));

  const cursusSorted = useMemo(
    () => [...cursus].sort((a, b) => (a.title || a.code).localeCompare(b.title || b.code)),
    [cursus]
  );

  // ---------------- Chapters ----------------
  const [chId, setChId] = useState('');
  const [chTitle, setChTitle] = useState('');
  const [chCursusCode, setChCursusCode] = useState('');
  const [chCover, setChCover] = useState('');
  const [chSort, setChSort] = useState<string>('0');
  const [chEditingId, setChEditingId] = useState<string | null>(null);

  const chapterValid = useMemo(
    () => chId.trim().length > 0 && chTitle.trim().length > 0 && chCursusCode.trim().length > 0,
    [chId, chTitle, chCursusCode]
  );

  const editChapter = (ch: Chapter) => {
    setChId(ch.id);
    setChTitle(ch.title);
    setChCursusCode(ch.cursus_code);
    setChCover(ch.cover_url || '');
    setChSort(String(ch.sort_index ?? 0));
    setChEditingId(ch.id);
  };
  const resetChapter = () => {
    setChId(''); setChTitle(''); setChCursusCode(''); setChCover(''); setChSort('0'); setChEditingId(null);
  };
  const saveChapter = () => {
    if (!chapterValid) return;
    upsertChapter({
      id: chId.trim(),
      title: chTitle.trim(),
      cursus_code: chCursusCode.trim(),
      cover_url: chCover.trim() || null,
      sort_index: Number(chSort || 0)
    });
    resetChapter();
  };
  const deleteChapter = (id: string) =>
    confirmDestructive('Supprimer le chapitre ?', id, () => removeChapter(id));

  const chaptersSorted = useMemo(() => {
    return [...chapters].sort((a, b) => {
      if (a.cursus_code !== b.cursus_code) return a.cursus_code.localeCompare(b.cursus_code);
      const sa = a.sort_index ?? 0, sb = b.sort_index ?? 0;
      if (sa !== sb) return sa - sb;
      return a.title.localeCompare(b.title);
    });
  }, [chapters]);

  // ---------------- Demos ----------------
  const [dId, setDId] = useState('');
  const [dChapterId, setDChapterId] = useState('');
  const [dTitle, setDTitle] = useState('');
  const [dStmt, setDStmt] = useState('');
  const [dProof, setDProof] = useState('');
  const [dSort, setDSort] = useState<string>('0');
  const [dEditingId, setDEditingId] = useState<string | null>(null);

  const demoValid = useMemo(
    () => dId.trim().length > 0 && dChapterId.trim().length > 0 && dTitle.trim().length > 0,
    [dId, dChapterId, dTitle]
  );

  const editDemo = (d: Demo) => {
    setDId(d.id);
    setDChapterId(d.chapter_id);
    setDTitle(d.title);
    setDStmt(d.statement || '');
    setDProof(d.proof || '');
    setDSort(String(d.sort_index ?? 0));
    setDEditingId(d.id);
  };
  const resetDemo = () => {
    setDId(''); setDChapterId(''); setDTitle(''); setDStmt(''); setDProof(''); setDSort('0'); setDEditingId(null);
  };
  const saveDemo = () => {
    if (!demoValid) return;
    upsertDemo({
      id: dId.trim(),
      chapter_id: dChapterId.trim(),
      title: dTitle.trim(),
      statement: dStmt,
      proof: dProof,
      sort_index: Number(dSort || 0)
    });
    resetDemo();
  };
  const deleteDemo = (id: string) =>
    confirmDestructive('Supprimer la démo ?', id, () => removeDemo(id));

  const demosSorted = useMemo(() => {
    return [...demos].sort((a, b) => {
      if (a.chapter_id !== b.chapter_id) return a.chapter_id.localeCompare(b.chapter_id);
      const sa = a.sort_index ?? 0, sb = b.sort_index ?? 0;
      if (sa !== sb) return sa - sb;
      return a.title.localeCompare(b.title);
    });
  }, [demos]);

  // ---------------- Import / Export ----------------
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<{ cursus: number; chapters: number; demos: number } | null>(null);

  const bundleJSON = useMemo(() => toPrettyJSON(toBundle(cursus, chapters, demos)), [cursus, chapters, demos]);

  const onExportFile = async () => {
    const filename = `demomaths-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    if (isWeb) downloadFileWeb(filename, bundleJSON);
    else await shareText(bundleJSON);
  };
  const onExportCopyOrShare = async () => {
    if (isWeb) {
      await copyToClipboardWeb(bundleJSON);
    } else {
      await shareText(bundleJSON);
    }
  };

  const onImportTextChanged = (text: string) => {
    setImportText(text);
    const parsed = parseImportJSON(text);
    setParsedPreview(parsed ? {
      cursus: parsed.cursus.length,
      chapters: parsed.chapters.length,
      demos: parsed.demos.length
    } : null);
  };
  const onImportMerge = () => {
    const parsed = parseImportJSON(importText);
    if (!parsed) return Alert.alert('Import', 'JSON invalide.');
    parsed.cursus.forEach(upsertCursus);
    parsed.chapters.forEach(upsertChapter);
    parsed.demos.forEach(upsertDemo);
    Alert.alert('Import', 'Import fusionné avec succès.');
  };
  const onImportReplaceAll = () => {
    const parsed = parseImportJSON(importText);
    if (!parsed) return Alert.alert('Import', 'JSON invalide.');
    confirmDestructive('Remplacer tout ?', 'Cette action écrase vos données locales.', () => {
      useCustomData.setState({
        cursus: parsed.cursus,
        chapters: parsed.chapters,
        demos: parsed.demos
      });
      Alert.alert('Import', 'Données remplacées.');
    });
  };

  // Sélecteur de fichier (Web)
  const pickImportFileWeb = () => {
    if (!isWeb) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = (input.files && input.files[0]) || null;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => onImportTextChanged(String(reader.result || ''));
      reader.readAsText(file, 'utf-8');
      input.value = '';
    };
    input.click();
  };

  // ---------------- UI ----------------
  const [openCursusList, setOpenCursusList] = useState(false);
  const [openChaptersList, setOpenChaptersList] = useState(false);
  const [openDemosList, setOpenDemosList] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ====================== CURSUS ====================== */}
      <Text style={styles.h1}>Cursus (locaux)</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Code *</Text>
        <TextInput
          value={cursusCode}
          onChangeText={setCursusCode}
          placeholder="ex. L2MA223"
          autoCapitalize="none"
          style={styles.input}
          editable={!cursusEditing}
        />

        <Text style={styles.label}>Titre *</Text>
        <TextInput
          value={cursusTitle}
          onChangeText={setCursusTitle}
          placeholder="ex. Géométrie"
          style={styles.input}
        />

        <Text style={styles.label}>Description (facultatif)</Text>
        <TextInput
          value={cursusDescription}
          onChangeText={setCursusDescription}
          placeholder="Brève description du cours…"
          multiline
          numberOfLines={4}
          style={[styles.input, styles.inputMultiline]}
        />

        <View style={styles.row}>
          <TouchableOpacity
            onPress={saveCursus}
            disabled={!cursusValid}
            style={[styles.btn, { backgroundColor: themeColor }, !cursusValid && styles.btnDisabled]}
          >
            <Text style={styles.btnText}>{cursusEditing ? 'Enregistrer' : 'Ajouter'}</Text>
          </TouchableOpacity>

          {cursusEditing && (
            <TouchableOpacity
              onPress={resetCursus}
              style={[styles.btn, styles.btnGhost, { borderColor: themeColor }]}
            >
              <Text style={[styles.btnText, styles.btnGhostText, { color: themeColor }]}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Liste Cursus (déroulante) */}
      <TouchableOpacity
        onPress={() => setOpenCursusList(v => !v)}
        style={styles.accordionHeader}
        activeOpacity={0.8}
      >
        <Text style={styles.accordionTitle}>
          {openCursusList ? '▼' : '▶'} Liste des cursus ({cursusSorted.length})
        </Text>
      </TouchableOpacity>

      {openCursusList && cursusSorted.length > 0 && (
        <View style={styles.listCard}>
          {cursusSorted.map(c => (
            <View key={c.code} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {c.title} <Text style={styles.itemCode}>({c.code})</Text>
                </Text>
                {c.description ? (
                  <Text style={styles.itemDesc} numberOfLines={2}>{c.description}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => editCursus(c)}
                style={[styles.smallBtn, styles.smallBtnPrimary, { backgroundColor: themeColor }]}
              >
                <Text style={styles.smallBtnText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCursus(c.code)} style={[styles.smallBtn, styles.smallBtnDanger]}>
                <Text style={styles.smallBtnText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* ====================== CHAPITRES ====================== */}
      <Text style={styles.h1}>Chapitres (locaux)</Text>

      <View style={styles.card}>
        <Text style={styles.label}>ID *</Text>
        <TextInput
          value={chId}
          onChangeText={setChId}
          placeholder="ex. ch_001"
          autoCapitalize="none"
          style={styles.input}
          editable={chEditingId === null}
        />

        <Text style={styles.label}>Titre *</Text>
        <TextInput
          value={chTitle}
          onChangeText={setChTitle}
          placeholder="Titre du chapitre"
          style={styles.input}
        />

        <Text style={styles.label}>Code cursus *</Text>
        <TextInput
          value={chCursusCode}
          onChangeText={setChCursusCode}
          placeholder="ex. L2MA223"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Image (URL, facultatif)</Text>
        <TextInput
          value={chCover}
          onChangeText={setChCover}
          placeholder="https://…"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Ordre (nombre)</Text>
        <TextInput
          value={chSort}
          onChangeText={setChSort}
          keyboardType="numeric"
          style={styles.input}
        />

        <View style={styles.row}>
          <TouchableOpacity
            onPress={saveChapter}
            disabled={!chapterValid}
            style={[styles.btn, { backgroundColor: themeColor }, !chapterValid && styles.btnDisabled]}
          >
            <Text style={styles.btnText}>{chEditingId ? 'Enregistrer' : 'Ajouter'}</Text>
          </TouchableOpacity>

          {chEditingId && (
            <TouchableOpacity
              onPress={resetChapter}
              style={[styles.btn, styles.btnGhost, { borderColor: themeColor }]}
            >
              <Text style={[styles.btnText, styles.btnGhostText, { color: themeColor }]}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Liste Chapitres (déroulante) */}
      <TouchableOpacity
        onPress={() => setOpenChaptersList(v => !v)}
        style={styles.accordionHeader}
        activeOpacity={0.8}
      >
        <Text style={styles.accordionTitle}>
          {openChaptersList ? '▼' : '▶'} Liste des chapitres ({chaptersSorted.length})
        </Text>
      </TouchableOpacity>

      {openChaptersList && chaptersSorted.length > 0 && (
        <View style={styles.listCard}>
          {chaptersSorted.map(ch => (
            <View key={ch.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {ch.title} <Text style={styles.itemCode}>({ch.id})</Text>
                </Text>
                <Text style={styles.itemDesc}>
                  Cursus : {ch.cursus_code} • Ordre : {ch.sort_index ?? 0}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => editChapter(ch)}
                style={[styles.smallBtn, styles.smallBtnPrimary, { backgroundColor: themeColor }]}
              >
                <Text style={styles.smallBtnText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteChapter(ch.id)} style={[styles.smallBtn, styles.smallBtnDanger]}>
                <Text style={styles.smallBtnText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* ====================== DEMOS ====================== */}
      <Text style={styles.h1}>Démos (locales)</Text>

      <View style={styles.card}>
        <Text style={styles.label}>ID *</Text>
        <TextInput
          value={dId}
          onChangeText={setDId}
          placeholder="ex. d_001"
          autoCapitalize="none"
          style={styles.input}
          editable={dEditingId === null}
        />

        <Text style={styles.label}>ID chapitre *</Text>
        <TextInput
          value={dChapterId}
          onChangeText={setDChapterId}
          placeholder="ex. ch_001"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Titre *</Text>
        <TextInput
          value={dTitle}
          onChangeText={setDTitle}
          placeholder="Titre de la démo"
          style={styles.input}
        />

        <Text style={styles.label}>Énoncé</Text>
        <TextInput
          value={dStmt}
          onChangeText={setDStmt}
          placeholder="Texte / LaTeX…"
          multiline
          numberOfLines={3}
          style={[styles.input, styles.inputMultiline]}
        />

        <Text style={styles.label}>Preuve</Text>
        <TextInput
          value={dProof}
          onChangeText={setDProof}
          placeholder="Texte / LaTeX…"
          multiline
          numberOfLines={3}
          style={[styles.input, styles.inputMultiline]}
        />

        <Text style={styles.label}>Ordre (nombre)</Text>
        <TextInput
          value={dSort}
          onChangeText={setDSort}
          keyboardType="numeric"
          style={styles.input}
        />

        <View style={styles.row}>
          <TouchableOpacity
            onPress={saveDemo}
            disabled={!demoValid}
            style={[styles.btn, { backgroundColor: themeColor }, !demoValid && styles.btnDisabled]}
          >
            <Text style={styles.btnText}>{dEditingId ? 'Enregistrer' : 'Ajouter'}</Text>
          </TouchableOpacity>

          {dEditingId && (
            <TouchableOpacity
              onPress={resetDemo}
              style={[styles.btn, styles.btnGhost, { borderColor: themeColor }]}
            >
              <Text style={[styles.btnText, styles.btnGhostText, { color: themeColor }]}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Liste Démos (déroulante) */}
      <TouchableOpacity
        onPress={() => setOpenDemosList(v => !v)}
        style={styles.accordionHeader}
        activeOpacity={0.8}
      >
        <Text style={styles.accordionTitle}>
          {openDemosList ? '▼' : '▶'} Liste des démos ({demosSorted.length})
        </Text>
      </TouchableOpacity>

      {openDemosList && demosSorted.length > 0 && (
        <View style={styles.listCard}>
          {demosSorted.map(d => (
            <View key={d.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {d.title} <Text style={styles.itemCode}>({d.id})</Text>
                </Text>
                <Text style={styles.itemDesc}>
                  Chapitre : {d.chapter_id} • Ordre : {d.sort_index ?? 0}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => editDemo(d)}
                style={[styles.smallBtn, styles.smallBtnPrimary, { backgroundColor: themeColor }]}
              >
                <Text style={styles.smallBtnText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteDemo(d.id)} style={[styles.smallBtn, styles.smallBtnDanger]}>
                <Text style={styles.smallBtnText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* ====================== IMPORT / EXPORT (3‑en‑1) ====================== */}
      <Text style={styles.h1}>Importer / Exporter (3‑en‑1)</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Exporter tout (cursus + chapitres + démos)</Text>
        <View style={styles.row}>
          <TouchableOpacity
            onPress={onExportFile}
            style={[styles.btn, { backgroundColor: themeColor }]}
          >
            <Text style={styles.btnText}>{isWeb ? 'Télécharger .json' : 'Partager (JSON)'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onExportCopyOrShare}
            style={[styles.btn, styles.btnGhost, { borderColor: themeColor }]}
          >
            <Text style={[styles.btnText, styles.btnGhostText, { color: themeColor }]}>
              {isWeb ? 'Copier JSON' : 'Partager (texte)'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Aperçu du paquet</Text>
        <TextInput
          value={bundleJSON}
          editable={false}
          multiline
          numberOfLines={8}
          style={[styles.input, styles.inputMultiline, { color: '#333' }]}
        />

        <TouchableOpacity
          onPress={() => setImportOpen(v => !v)}
          style={[styles.btn, styles.btnGhost, { marginTop: 12, borderColor: themeColor }]}
        >
          <Text style={[styles.btnText, styles.btnGhostText, { color: themeColor }]}>
            {importOpen ? 'Fermer l’import' : 'Ouvrir l’import'}
          </Text>
        </TouchableOpacity>

        {importOpen && (
          <View style={{ marginTop: 12 }}>
            {isWeb && (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.label}>Importer depuis un fichier (.json)</Text>
                <TouchableOpacity onPress={pickImportFileWeb} style={[styles.btn, { backgroundColor: themeColor }]}>
                  <Text style={styles.btnText}>Choisir un .json</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>…ou collez le JSON à importer</Text>
            <TextInput
              value={importText}
              onChangeText={onImportTextChanged}
              placeholder='{"cursus":[...],"chapters":[...],"demos":[...]}'
              multiline
              numberOfLines={8}
              style={[styles.input, styles.inputMultiline]}
            />

            {parsedPreview ? (
              <Text style={{ color: themeColor, marginTop: 6 }}>
                Aperçu : {parsedPreview.cursus} cursus, {parsedPreview.chapters} chapitres, {parsedPreview.demos} démos.
              </Text>
            ) : (
              <Text style={{ color: '#eb5757', marginTop: 6 }}>
                JSON non reconnu pour l’instant.
              </Text>
            )}

            <View style={styles.row}>
              <TouchableOpacity onPress={onImportMerge} style={[styles.btn, { backgroundColor: themeColor }]}>
                <Text style={styles.btnText}>Fusionner</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onImportReplaceAll} style={[styles.btn, styles.btnDanger]}>
                <Text style={styles.btnText}>Remplacer tout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {cursus.length} cursus • {chapters.length} chapitres • {demos.length} démos
        </Text>
      </View>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },

  h1: { fontSize: 20, fontWeight: '700', marginBottom: 8 },

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },

  label: { fontWeight: '600', marginTop: 8, marginBottom: 4 },

  input: {
    borderWidth: 1,
    borderColor: '#d7d7d7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top'
  },

  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 },

  btn: {
    backgroundColor: '#2f80ed', // sera surchargé par themeColor via style inline
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8
  },
  btnText: { color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2f80ed' },
  btnGhostText: { color: '#2f80ed' },

  btnSecondary: { backgroundColor: '#1f6fe0' },
  btnDanger: { backgroundColor: '#eb5757' },

  // Accordéons
  accordionHeader: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#f5f7fb',
    borderWidth: 1,
    borderColor: '#e8ebf2',
    marginBottom: 6
  },
  accordionTitle: { fontWeight: '700', color: '#334' },

  listCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 12,
    paddingVertical: 4,
    marginBottom: 12
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f2f2f2'
  },
  itemTitle: { fontWeight: '700' },
  itemCode: { color: '#666', fontWeight: '400' },
  itemDesc: { color: '#444', marginTop: 2 },

  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  smallBtnPrimary: { backgroundColor: '#2f80ed' }, // sera surchargé par themeColor via style inline
  smallBtnDanger: { backgroundColor: '#eb5757' },

  summary: { marginTop: 12, alignItems: 'center' },
  summaryText: { color: '#666' }
});
