// src/components/MathJaxView.tsx
import React from 'react';
import { Platform, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { renderToString } from 'katex';
import 'katex/dist/katex.min.css';

export default function MathJaxView({ tex }: { tex: string }) {
  const { width } = Dimensions.get('window');

  // 1) Génère le HTML KaTeX (span…) via renderToString
  const htmlFragment = renderToString(tex, {
    throwOnError: false,
    displayMode: true
  });

  if (Platform.OS === 'web') {
    // 2a) SUR LE WEB : on injecte directement ce fragment dans un <div>
    return (
      <div
        style={{ width, marginVertical: 12 }}
        dangerouslySetInnerHTML={{ __html: htmlFragment }}
      />
    );
  }

  // 2b) SUR MOBILE : on embarque dans une WebView une page minimale qui inclut KaTeX CSS
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
        />
        <style>body { margin:0; padding:0; font-size:1.2em; }</style>
      </head>
      <body>
        <div>${htmlFragment}</div>
      </body>
    </html>
  `;

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: fullHtml }}
      style={{ width, height: 120, backgroundColor: 'transparent' }}
      scrollEnabled={false}
    />
  );
}
