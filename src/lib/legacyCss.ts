/**
 * Compatibilidade de CSS para WebViews antigos (TV Boxes e projetores Android).
 *
 * O Tailwind v4 envolve praticamente todo o CSS gerado em `@layer`. WebViews
 * antigos nao conhecem `@layer` e descartam o bloco inteiro, deixando a tela
 * sem nenhum estilo. `flattenAtLayers` remove essas camadas preservando a ordem
 * original das regras, de modo que o CSS volte a ser aplicado.
 */
export function flattenAtLayers(css: string): string {
  const stack: boolean[] = [];
  let out = '';
  let i = 0;
  const n = css.length;

  while (i < n) {
    const c = css[i];

    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      out += css.slice(i, stop);
      i = stop;
      continue;
    }

    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) {
        if (css[j] === '\\') {
          j += 2;
          continue;
        }
        if (css[j] === c) {
          j++;
          break;
        }
        j++;
      }
      out += css.slice(i, j);
      i = j;
      continue;
    }

    if (css.startsWith('@layer', i)) {
      const after = css[i + 6];
      if (after === undefined || /[\s{;,]/.test(after)) {
        let j = i + 6;
        while (j < n && css[j] !== '{' && css[j] !== ';') j++;
        if (css[j] === ';') {
          i = j + 1;
          continue;
        }
        if (css[j] === '{') {
          stack.push(true);
          i = j + 1;
          continue;
        }
      }
    }

    if (c === '{') {
      stack.push(false);
      out += c;
      i++;
      continue;
    }

    if (c === '}') {
      const isLayer = stack.pop();
      if (!isLayer) out += c;
      i++;
      continue;
    }

    out += c;
    i++;
  }

  return out;
}
