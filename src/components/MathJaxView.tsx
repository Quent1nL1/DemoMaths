// src/components/MathJaxView.tsx
import React from 'react';
import {
  View,
  Text,
  Platform,
  Dimensions,
  StyleSheet
} from 'react-native';
import { WebView } from 'react-native-webview';
import { renderToString } from 'katex';
import 'katex/dist/katex.min.css';

const htmlTemplate = (math: string, display: boolean) => `
<!DOCTYPE html><html><head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    body { margin:0; padding:0; }
    #math {
      display:inline-block;
      white-space:normal !important;
      word-wrap:break-word;
      word-break:break-all;
      max-width:100%;
      font-size:1.2em;
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

export default function MathJaxView({ tex }: { tex: string }) {
  // split en gardant les délimiteurs $...$ ou $$...$$
  const parts = tex.split(/(\$\$[\s\S]+?\$\$|\$[^$]+\$)/g).filter(Boolean);

  return (
    <View style={styles.wrapper}>
      {parts.map((part, i) => {
        // cas $$...$$
        const m2 = part.match(/^\$\$([\s\S]+)\$\$$/);
        if (m2) {
          const math = m2[1];
          if (Platform.OS === 'web') {
            const html = renderToString(math, {
              throwOnError: false,
              displayMode: true
            });
            // on utilise un <div> pour web
            // @ts-ignore
            return (
              <div
                key={i}
                dangerouslySetInnerHTML={{ __html: html }}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  wordBreak: 'break-all',
                  maxWidth: '100%',
                  margin: 2
                }}
              />
            );
          } else {
            const { width } = Dimensions.get('window');
            return (
              <WebView
                key={i}
                originWhitelist={['*']}
                source={{ html: htmlTemplate(math, true) }}
                style={{ width, height: 150, backgroundColor: 'transparent' }}
                scrollEnabled={false}
              />
            );
          }
        }

        // cas $...$
        const m1 = part.match(/^\$([^$]+)\$$/);
        if (m1) {
          const math = m1[1];
          if (Platform.OS === 'web') {
            const html = renderToString(math, {
              throwOnError: false,
              displayMode: false
            });
            // idem, <div>
            // @ts-ignore
            return (
              <div
                key={i}
                dangerouslySetInnerHTML={{ __html: html }}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  wordBreak: 'break-all',
                  maxWidth: '100%',
                  margin: 2
                }}
              />
            );
          } else {
            const { width } = Dimensions.get('window');
            return (
              <WebView
                key={i}
                originWhitelist={['*']}
                source={{ html: htmlTemplate(math, false) }}
                style={{ width, height: 40, backgroundColor: 'transparent' }}
                scrollEnabled={false}
              />
            );
          }
        }

        // sinon texte brut
        return (
          <Text key={i} style={styles.plainText}>
            {part}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginVertical: 12
  },
  plainText: {
    fontSize: 16,
    lineHeight: 24
  }
});
