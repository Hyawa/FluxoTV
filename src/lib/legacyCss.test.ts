import { describe, expect, it } from 'vitest';
import { flattenAtLayers } from './legacyCss';

describe('flattenAtLayers', () => {
  it('remove o encapsulamento de @layer preservando as regras internas', () => {
    const input = '@layer theme{--x:1}@layer base{:root{color:red}}@layer utilities{.flex{display:flex}}';
    const out = flattenAtLayers(input);

    expect(out).not.toContain('@layer');
    expect(out).toContain('--x:1');
    expect(out).toContain(':root{color:red}');
    expect(out).toContain('.flex{display:flex}');
  });

  it('preserva a ordem original das camadas (theme -> base -> utilities)', () => {
    const input =
      '@layer theme{--x:1}@layer base{:root{color:red}}@layer utilities{.flex{display:flex}}';
    const out = flattenAtLayers(input);

    expect(out.indexOf('--x:1')).toBeLessThan(out.indexOf(':root{color:red}'));
    expect(out.indexOf(':root{color:red}')).toBeLessThan(out.indexOf('.flex{display:flex}'));
  });

  it('remove a declaracao de ordem das camadas (@layer a, b;)', () => {
    const out = flattenAtLayers('@layer theme, base, utilities;\n.a{color:red}');
    expect(out).not.toContain('@layer');
    expect(out).toContain('.a{color:red}');
  });

  it('mantem blocos aninhados (@media/@supports) intactos', () => {
    const input = '@layer utilities{@media (min-width:600px){.a{color:red}}.b{color:blue}}';
    expect(flattenAtLayers(input)).toBe(
      '@media (min-width:600px){.a{color:red}}.b{color:blue}',
    );
  });

  it('lida com camadas aninhadas', () => {
    const input = '@layer a{@media{x{}}y{}}';
    expect(flattenAtLayers(input)).toBe('@media{x{}}y{}');
  });

  it('nao confunde chaves dentro de strings', () => {
    const input = '.a::before{content:"}"}.b::after{content:"{"}';
    expect(flattenAtLayers(input)).toBe(input);
  });

  it('nao confunde chaves dentro de comentarios', () => {
    const input = '/* @layer fake { } */ .a{color:red}';
    expect(flattenAtLayers(input)).toBe(input);
  });

  it('nao altera CSS sem @layer', () => {
    const input = '@supports (display:flex){.a{color:red}}@keyframes x{from{opacity:0}}';
    expect(flattenAtLayers(input)).toBe(input);
  });

  it('e idempotente', () => {
    const input = '@layer base{:root{--x:1}}@layer utilities{.a{color:red}}';
    const once = flattenAtLayers(input);
    expect(flattenAtLayers(once)).toBe(once);
  });

  it('mantem o CSS balanceado (mesma qtd de chaves abertas e fechadas)', () => {
    const input =
      '@layer p{@supports (a:b){*,:before{--tw:0}}}@layer theme{:root{--c:rgb(1,2,3)}}@layer utilities{@media(x){.a{color:var(--c)}}}';
    const out = flattenAtLayers(input);
    const open = (out.match(/\{/g) ?? []).length;
    const close = (out.match(/\}/g) ?? []).length;
    expect(open).toBe(close);
  });
});
