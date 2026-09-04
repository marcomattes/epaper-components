import { captureWrap, define, EpaperElement, patchAttr, patchClassModifier } from '../../core/dom';

/** True when `document.createElement` accepts `tag` as an element name. */
const isElementName = (tag: string): boolean => {
  try {
    document.createElement(tag);
    return true;
  } catch {
    return false;
  }
};

/** Alignments accepted by `align`; anything else leaves the wrapper unaligned. */
const ALIGNMENTS = ['start', 'center', 'end', 'justify'] as const;

/**
 * @summary Typography wrapper with semantic tag and visual kind selectors.
 * @since v1.0.1
 *
 * Children are used as the text content.
 *
 * `align` is carried as `data-align` rather than as a class, because the kind
 * modifier owns the whole `ink-text--` prefix: a second class under that
 * prefix would be stripped the next time `kind` changes.
 *
 * @attr {'body'|'prose'|'small'|'mono'|'label'|'caption'|'strike'} [kind='body'] - Visual style.
 *   `caption` is the small, muted figure/table caption size (`--ink-text-caption`);
 *   `strike` renders `line-through` for a superseded price or a withdrawn line item. @since v2.0.0 (`caption`, `strike`)
 * @attr {'start'|'center'|'end'|'justify'} [align] - Horizontal alignment, applied as `data-align` on the wrapper. Unknown values are ignored. @since v2.0.0
 * @attr {'p'|'span'|'div'} [as='span'] - Wrapping element tag name. Changes to `as` after
 *   mount rebuild the wrapper and carry its classes over. A value that is not a valid
 *   element name is ignored: the mounted wrapper is kept, and at mount time `span` is used.
 *
 * @example
 * <e-text kind="label" as="span">SECTION</e-text>
 *
 * @example
 * <e-text kind="strike">UVP 249,00 €</e-text>
 * <e-text kind="caption" align="center" as="p">Abb. 3 — Messpunkt Nord</e-text>
 */
export class EText extends EpaperElement {
  static readonly observedAttributes = ['kind', 'as', 'align'];

  private _wrap: HTMLElement | null = null;
  private _tag = '';

  connectedCallback() {
    if (!this._wrap) this._mountWrap();
    this._render();
  }

  attributeChangedCallback(name: string) {
    if (!this._wrap) return;
    if (name === 'as') {
      const next = this.getAttribute('as') || 'span';
      if (next !== this._tag && isElementName(next)) {
        const newWrap = document.createElement(next);
        newWrap.className = this._wrap.className;
        newWrap.classList.add('ink-text');
        while (this._wrap.firstChild) newWrap.appendChild(this._wrap.firstChild);
        this._wrap.replaceWith(newWrap);
        this._wrap = newWrap;
        this._tag = next;
      }
    }
    this._render();
  }

  private _mountWrap(): void {
    const tag = this.getAttribute('as') || 'span';
    this._tag = isElementName(tag) ? tag : 'span';
    this._wrap = captureWrap(this, this._tag);
    this._wrap.classList.add('ink-text');
  }

  private _render(): void {
    if (!this._wrap) return;
    const kind = this.getAttribute('kind') || 'body';
    patchClassModifier(this._wrap, 'ink-text--', kind === 'body' ? null : kind);
    const align = this.getAttribute('align');
    patchAttr(
      this._wrap,
      'data-align',
      align && (ALIGNMENTS as readonly string[]).includes(align) ? align : null,
    );
  }
}

define('e-text', EText);
