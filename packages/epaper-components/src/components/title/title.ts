import { define, intAttr } from '../../core/dom';

/**
 * @summary Heading element rendered as `<h1>`…`<h6>` based on `level`.
 * @since v1.0.1
 *
 * Children are used as the heading text.
 *
 * @attr {1|2|3|4|5|6} [level=1] - Heading level. Out-of-range values are clamped to `1`…`6`;
 *   fractional and non-numeric values fall back to `1`.
 *
 * @example
 * <e-title level="2">Section heading</e-title>
 */
export class ETitle extends HTMLElement {
  static readonly observedAttributes = ['level'];

  private _wrap: HTMLElement | null = null;
  private _level = 0;

  connectedCallback() {
    if (!this._wrap) {
      const level = this._readLevel();
      const h = document.createElement(`h${level}`);
      while (this.firstChild) h.appendChild(this.firstChild);
      this.appendChild(h);
      this._wrap = h;
      this._level = level;
      h.className = `ink-title ink-title--${level}`;
    }
  }

  attributeChangedCallback() {
    if (!this._wrap) return;
    const level = this._readLevel();
    if (level === this._level) return;
    const next = document.createElement(`h${level}`);
    while (this._wrap.firstChild) next.appendChild(this._wrap.firstChild);
    next.className = `ink-title ink-title--${level}`;
    this._wrap.replaceWith(next);
    this._wrap = next;
    this._level = level;
  }

  private _readLevel(): number {
    return Math.min(Math.max(intAttr(this, 'level', 1), 1), 6);
  }
}

define('e-title', ETitle);
