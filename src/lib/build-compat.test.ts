import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build, resolveConfig } from 'vite';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const configFile = join(root, 'vite.config.ts');

let outDir = '';
let cssPath = '';
let jsPath = '';

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), 'iptv-build-'));
  await build({
    root,
    configFile,
    logLevel: 'silent',
    build: { outDir, emptyOutDir: true },
  });
  const assetsDir = join(outDir, 'assets');
  const assets = readdirSync(assetsDir);
  cssPath = join(assetsDir, assets.find((f) => f.endsWith('.css'))!);
  jsPath = join(assetsDir, assets.find((f) => f.endsWith('.js'))!);
}, 120_000);

afterAll(() => {
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

// Protege a correcao que fez o app voltar a funcionar em TV Box e projetor:
// WebViews antigos nao executam JS moderno nem entendem `@layer`/`oklch()`.
describe('build de producao (compatibilidade com WebView antigo)', () => {
  it('configura target ES2015 e transformador lightningcss', async () => {
    const resolved = await resolveConfig({ configFile }, 'build');
    expect(String(resolved.build.target)).toContain('es2015');
    expect(resolved.css.transformer).toBe('lightningcss');
  });

  it('nao deixa nenhum @layer no CSS final', () => {
    expect(readFileSync(cssPath, 'utf8')).not.toContain('@layer');
  });

  it('converte cores oklch() para formatos suportados', () => {
    expect(readFileSync(cssPath, 'utf8')).not.toMatch(/oklch\(/);
  });

  it('transpila nullish coalescing (?? e ??=) para sintaxe antiga', () => {
    const js = readFileSync(jsPath, 'utf8');
    expect((js.match(/\?\?=/g) ?? []).length).toBe(0);
    expect((js.match(/\?\?/g) ?? []).length).toBe(0);
  });

  it('mantem o CSS balanceado e com as regras essenciais', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect((css.match(/\{/g) ?? []).length).toBe((css.match(/\}/g) ?? []).length);
    expect(css).toContain(':root');
  });
});
