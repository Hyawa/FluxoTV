import { useEffect } from 'react';

const FOCUSABLE = '[data-focusable="true"]';

function getFocusable(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.closest('[inert]')) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}

export function focusFirst() {
  getFocusable()[0]?.focus();
}

export function useSpatialNav(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!keys.includes(e.key)) return;

      const items = getFocusable();
      if (items.length === 0) return;

      const current = document.activeElement as HTMLElement | null;

      if (!current || !items.includes(current)) {
        items[0]?.focus();
        e.preventDefault();
        return;
      }

      const cur = current.getBoundingClientRect();
      const cx = cur.left + cur.width / 2;
      const cy = cur.top + cur.height / 2;

      let best: HTMLElement | null = null;
      let bestScore = Infinity;

      for (const el of items) {
        if (el === current) continue;
        const r = el.getBoundingClientRect();
        const dx = r.left + r.width / 2 - cx;
        const dy = r.top + r.height / 2 - cy;

        let primary = 0;
        let secondary = 0;
        let ok = false;

        switch (e.key) {
          case 'ArrowRight':
            ok = dx > 8;
            primary = dx;
            secondary = Math.abs(dy);
            break;
          case 'ArrowLeft':
            ok = dx < -8;
            primary = -dx;
            secondary = Math.abs(dy);
            break;
          case 'ArrowDown':
            ok = dy > 8;
            primary = dy;
            secondary = Math.abs(dx);
            break;
          case 'ArrowUp':
            ok = dy < -8;
            primary = -dy;
            secondary = Math.abs(dx);
            break;
        }

        if (!ok) continue;

        const score = primary + secondary * 2.5;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }

      if (best) {
        best.focus();
        best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        e.preventDefault();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
