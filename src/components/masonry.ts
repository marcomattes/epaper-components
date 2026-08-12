import { addCleanup, define, runCleanups } from '../core/dom';

/**
 * @summary CSS-columns based masonry layout for cards of varying height.
 *
 * Observes `childList` mutations and container resizes via `MutationObserver`
 * and `ResizeObserver`, so dynamically inserted/removed children pick up the
 * configured `gap` automatically.
 *
 * @attr {string} [columns='3'] - Number of columns (forwarded to `column-count`).
 * @attr {string} [gap='16'] - Pixel gap between columns and items.
 *
 * @example
 * <e-masonry columns="3" gap="12">
 *   <e-card>…</e-card>
 *   <e-card>…</e-card>
 * </e-masonry>
 */
export class EMasonry extends HTMLElement {
  static observedAttributes = ['columns', 'gap'];

  private _mo: MutationObserver | null = null;
  private _ro: ResizeObserver | null = null;
  private _scheduled = false;

  connectedCallback() {
    this.classList.add('ink-masonry');
    this._render();

    this._mo = new MutationObserver(() => this._scheduleRender());
    this._mo.observe(this, { childList: true });
    addCleanup(this, () => this._mo?.disconnect());

    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._scheduleRender());
      this._ro.observe(this);
      addCleanup(this, () => this._ro?.disconnect());
    }
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  private _scheduleRender(): void {
    if (this._scheduled) return;
    this._scheduled = true;
    queueMicrotask(() => {
      this._scheduled = false;
      if (this.isConnected) this._render();
    });
  }

  private _render(): void {
    const cols = this.getAttribute('columns') || '3';
    const gap = this.getAttribute('gap') || '16';
    const gapPx = `${gap}px`;
    if (this.style.columnCount !== cols) this.style.columnCount = cols;
    if (this.style.columnGap !== gapPx) this.style.columnGap = gapPx;
    for (const c of this.children) {
      const el = c as HTMLElement;
      if (el.style.marginBottom !== gapPx) el.style.marginBottom = gapPx;
    }
  }
}

define('e-masonry', EMasonry);
