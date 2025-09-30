// src/components/MathJaxView.tsx
import React from 'react';
import { View, Text, Platform, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

type Props = {
  tex: string;
};

const htmlTemplate = (math: string, display: boolean) => `
<!DOCTYPE html>
<html><head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    body { margin:0; padding:0; }
    #math {
      display: ${display ? 'block' : 'inline-block'};
      white-space: normal !important;
      overflow-wrap: break-word;
      word-break: normal;
      max-width: 100%;
      font-size: 1.2em;
      margin: ${display ? '0.5em 0' : '0 0.2em'};
    }
  </style>
</head><body>
  <div id="math"></div>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script>
    katex.render(
      String.raw\`${math}\`,
      document.getElementById('math'),
      { throwOnError: false, displayMode: ${display} }
    );
  </script>
</body></html>
`;

// --- Détection "téléphone" côté web (mobile web) ---
const isPhoneWeb = () => {
  if (Platform.OS !== 'web') return false;
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // téléphone uniquement (évite iPad / tablettes)
  return /Android.*Mobile|iPhone|iPod|Windows Phone|Mobi/i.test(ua);
};

// Normalisation : convertir $$…$$ -> $…$
const normalizeDollars = (s: string) =>
  s.replace(/\$\$([\s\S]+?)\$\$/g, (_m, inner) => `$${inner}$`);

export default function MathJaxView({ tex }: Props) {
  const { width } = Dimensions.get('window');

  // 📱 Sur téléphone (iOS/Android natif OU mobile web), on interprète $$...$$ comme $...$
  const shouldInlineDisplay = Platform.OS !== 'web' || isPhoneWeb();
  const normalizedTex = shouldInlineDisplay ? normalizeDollars(tex) : tex;

  const paragraphs = normalizedTex.split(/\r?\n/).filter(p => p.length > 0);

  // ------ Branche WEB ------
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {paragraphs.map((para, pIdx) => {
          const parts = para.split(/(\$\$[\s\S]+?\$\$|\$[^$]+\$)/g).filter(Boolean);
          return (
            <div key={pIdx} style={styles.webParagraph}>
              {parts.map((part, i) => {
                // Même si la normalisation a déjà remplacé $$...$$ en $...$ sur mobile web,
                // on garde ce garde‑fou : si un $$...$$ passe, on le rend inline sur téléphone web.
                const block = part.match(/^\$\$([\s\S]+)\$\$$/);
                if (block) {
                  if (isPhoneWeb()) {
                    return <InlineMath key={i} math={block[1]} />;
                  }
                  return <BlockMath key={i} math={block[1]} />;
                }
                const inline = part.match(/^\$([^$]+)\$$/);
                if (inline) {
                  return <InlineMath key={i} math={inline[1]} />;
                }
                return (
                  <span key={i} style={styles.plainWeb}>
                    {part}
                  </span>
                );
              })}
            </div>
          );
        })}
      </View>
    );
  }

  // ------ Branche MOBILE natif (iOS / Android) ------
  return (
    <View style={styles.container}>
      {paragraphs.map((para, pIdx) => {
        const parts = para.split(/(\$\$[\s\S]+?\$\$|\$[^$]+\$)/g).filter(Boolean);
        return (
          <View key={pIdx} style={styles.wrapper}>
            {parts.map((part, i) => {
              const block = part.match(/^\$\$([\s\S]+)\$\$$/);
              if (block) {
                // 📱 Sur téléphone natif, $$...$$ est rendu comme $...$ (inline)
                return (
                  <WebView
                    key={i}
                    originWhitelist={['*']}
                    source={{ html: htmlTemplate(block[1], false) }}
                    style={styles.inlineMobile}
                    scrollEnabled={false}
                  />
                );
              }
              const inline = part.match(/^\$([^$]+)\$$/);
              if (inline) {
                return (
                  <WebView
                    key={i}
                    originWhitelist={['*']}
                    source={{ html: htmlTemplate(inline[1], false) }}
                    style={styles.inlineMobile}
                    scrollEnabled={false}
                  />
                );
              }
              return (
                <Text key={i} style={styles.plainText}>
                  {part}
                </Text>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 0 },
  wrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginVertical: 4
  },
  // Texte natif
  plainText: {
    fontSize: 16,
    lineHeight: 24,
    marginRight: 2,
    flexShrink: 1,
    minWidth: 0
  },
  // Texte web
  plainWeb: {
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
    wordBreak: 'normal'
  },
  // Paragraphe web
  webParagraph: {
    width: '100%',
    margin: '0.5em 0',
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
    wordBreak: 'normal'
  },
  // Math inline dans WebView (mobile natif)
  inlineMobile: {
    height: 40,
    backgroundColor: 'transparent',
    marginHorizontal: 2,
    flexShrink: 1,
    minWidth: 0,
    alignSelf: 'baseline'
  }
});
