import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/nodejs');
const outFile = resolve(outDir, 'index.js');

await mkdir(outDir, { recursive: true });

await build({
  entryPoints: [resolve(root, 'server/src/index.ts')],
  outfile: outFile,
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  minify: false,
  sourcemap: false,
  logLevel: 'info',
});

await writeFile(
  resolve(outDir, 'package.json'),
  JSON.stringify({ name: 'iptv-core', private: true, main: 'index.js', type: 'commonjs' }, null, 2),
);

console.log(`[build] backend gerado em ${outFile}`);
