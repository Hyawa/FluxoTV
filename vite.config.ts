import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { flattenAtLayers } from './src/lib/legacyCss';

// Browsers alvo: Android WebView antigo (TV Boxes e projetores baratos com
// Android 11 costumam ter um WebView desatualizado). O Lightning CSS codifica
// a versao como major << 16 | minor << 8 | patch, entao Chrome 60 = 60 << 16.
// Isso forca a conversao de cores modernas (oklch/lab) para rgb.
const legacyTargets = { chrome: 60 << 16 };

// Depois que o build escreve o CSS final, achata as camadas `@layer` para
// compatibilizar com WebViews antigos (ver src/lib/legacyCss.ts).
function legacyCssPlugin(): Plugin {
  let assetsDir = '';
  return {
    name: 'iptv-legacy-css',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      const outDir = isAbsolute(config.build.outDir)
        ? config.build.outDir
        : resolve(config.root, config.build.outDir);
      assetsDir = join(outDir, 'assets');
    },
    closeBundle() {
      if (!assetsDir || !existsSync(assetsDir)) return;
      for (const file of readdirSync(assetsDir)) {
        if (!file.endsWith('.css')) continue;
        const path = join(assetsDir, file);
        const original = readFileSync(path, 'utf8');
        const flattened = flattenAtLayers(original);
        if (flattened !== original) writeFileSync(path, flattened);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), legacyCssPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Transpila sintaxe moderna (optional chaining `?.`, nullish `??`, etc.)
    // para que WebViews antigos consigam executar o bundle.
    target: 'es2015',
  },
  css: {
    // Converte cores modernas (oklch/lab) para rgb, suportado por WebViews antigos.
    transformer: 'lightningcss',
    lightningcss: {
      targets: legacyTargets,
    },
  },
});
