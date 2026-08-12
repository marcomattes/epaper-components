import { define, intAttr, patchAttr } from '../core/dom';

/**
 * @summary Static loading placeholder block.
 *
 * Pure outline — no shimmer, no animation. Use to reserve space for content
 * that is loading. On e-paper this avoids triggering a full GC16 refresh
 * when the real content arrives.
 *
 * @attr {'block'|'text'|'circle'} [shape='block'] - Geometry of the placeholder.
 * @attr {number} [lines=1] - When `shape="text"`, the number of stacked lines.
 * @attr {string} [width] - CSS width (e.g. `100%`, `12rem`). Defaults per shape.
 * @attr {string} [height] - CSS height. Defaults per shape.
 *
 * @example
 * <e-skeleton shape="text" lines="3"></e-skeleton>
 */
export class ESkeleton extends HTMLElement {
  static observedAttributes = ['shape', 'lines', 'width', 'height'];

  private _wired = false;
  private _wrap: HTMLElement | null = null;
  private _lineEls: HTMLElement[] = [];
  private _blockEl: HTMLElement | null = null;
  private _shape: string | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this._build();
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    const shape = this.getAttribute('shape') || 'block';
    if (name === 'shape' && shape !== this._shape) {
      this._build();
      return;
    }
    this._patch();
  }

  private _build(): void {
    const shape = this.getAttribute('shape') || 'block';
    this._shape = shape;
    const lines = Math.max(1, Math.min(100, intAttr(this, 'lines', 1)));
    const width = this.getAttribute('width') || '';
    const height = this.getAttribute('height') || '';

    const wrap = document.createElement('div');
    wrap.className = `ink-skeleton ink-skeleton--${shape}`;
    wrap.setAttribute('aria-hidden', 'true');
    this._wrap = wrap;
    this._lineEls = [];
    this._blockEl = null;

    if (shape === 'text') {
      for (let i = 0; i < lines; i++) {
        const line = document.createElement('div');
        line.className = 'ink-skeleton__line';
        if (i === lines - 1 && lines > 1) line.style.width = '60%';
        else if (width) line.style.width = width;
        if (height) line.style.height = height;
        wrap.appendChild(line);
        this._lineEls.push(line);
      }
    } else {
      const block = document.createElement('div');
      block.className = 'ink-skeleton__block';
      if (width) block.style.width = width;
      if (height) block.style.height = height;
      wrap.appendChild(block);
      this._blockEl = block;
    }

    patchAttr(this, 'role', 'status');
    patchAttr(this, 'aria-busy', 'true');
    this.replaceChildren(wrap);
  }

  private _patch(): void {
    const lines = Math.max(1, Math.min(100, intAttr(this, 'lines', 1)));
    const width = this.getAttribute('width') || '';
    const height = this.getAttribute('height') || '';

    if (this._shape === 'text') {
      while (this._lineEls.length < lines) {
        const line = document.createElement('div');
        line.className = 'ink-skeleton__line';
        this._wrap!.appendChild(line);
        this._lineEls.push(line);
      }
      while (this._lineEls.length > lines) {
        this._wrap!.removeChild(this._lineEls.pop()!);
      }
      for (let i = 0; i < this._lineEls.length; i++) {
        const line = this._lineEls[i];
        const isLast = i === lines - 1 && lines > 1;
        const w = isLast ? '60%' : width;
        if (line.style.width !== w) line.style.width = w;
        if (line.style.height !== height) line.style.height = height;
      }
    } else if (this._blockEl) {
      if (this._blockEl.style.width !== width) this._blockEl.style.width = width;
      if (this._blockEl.style.height !== height) this._blockEl.style.height = height;
    }
  }
}

define('e-skeleton', ESkeleton);
