import { boolAttr, define, EpaperElement, intAttr, patchAttr } from '../../core/dom';
import { t } from '../../core/i18n';
import { slugifyTitle, uniqueSlugId } from '../../core/slug';

/**
 * @summary Heading element rendered as `<h1>`…`<h6>` based on `level`.
 * @since v1.0.1
 *
 * Children are used as the heading text.
 *
 * Unless switched off, the heading receives a deterministic `id` derived from
 * its own text, so a table of contents or a `#fragment` link has something to
 * point at without every author hand-writing ids. An `id` on the host element
 * always wins: the host is then already the jump target, and the heading is
 * left untouched. Duplicate slugs in one document get a `-2`, `-3`, … suffix
 * in document order.
 *
 * The slug is computed from the text present when the heading mounts (and
 * again whenever `level`, `auto-id` or `anchor` change); later edits to the
 * child nodes do not re-slug it, so a live id never moves out from under an
 * existing link.
 *
 * @attr {1|2|3|4|5|6} [level=1] - Heading level. Out-of-range values are clamped to `1`…`6`;
 *   fractional and non-numeric values fall back to `1`.
 * @attr {boolean} [auto-id=true] - Derives the heading `id` from its text. Set `auto-id="false"` to opt out. @since v2.0.0
 * @attr {boolean} [anchor] - Appends a self-link to the heading's own id. @since v2.0.0
 * @attr {string} [anchor-label='Link to this section'] - Accessible name of the anchor link. @since v2.0.0
 *
 * @example
 * <e-title level="2">Section heading</e-title>
 *
 * @example
 * <!-- id="jahresbilanz-2026", plus a "#" self-link -->
 * <e-title level="2" anchor>Jahresbilanz 2026</e-title>
 */
export class ETitle extends EpaperElement {
  static readonly observedAttributes = ['level', 'auto-id', 'anchor', 'anchor-label'];

  private _wrap: HTMLElement | null = null;
  private _level = 0;
  private _anchor: HTMLAnchorElement | null = null;
  private _autoId = '';

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
    this._syncIdentity();
  }

  attributeChangedCallback() {
    if (!this._wrap) return;
    const level = this._readLevel();
    if (level !== this._level) {
      const next = document.createElement(`h${level}`);
      while (this._wrap.firstChild) next.appendChild(this._wrap.firstChild);
      next.className = `ink-title ink-title--${level}`;
      if (this._wrap.id) next.id = this._wrap.id;
      this._wrap.replaceWith(next);
      this._wrap = next;
      this._level = level;
    }
    this._syncIdentity();
  }

  private _readLevel(): number {
    return Math.min(Math.max(intAttr(this, 'level', 1), 1), 6);
  }

  /** Heading text with the anchor affordance excluded, so it never self-feeds. */
  private _headingText(): string {
    if (!this._wrap) return '';
    let text = '';
    for (const node of this._wrap.childNodes) {
      if (node !== this._anchor) text += node.textContent ?? '';
    }
    return text;
  }

  /**
   * The fragment this heading is reachable by: the author's own host `id` when
   * there is one, else the generated slug.
   */
  private _targetId(): string {
    return this.id || this._wrap?.id || '';
  }

  private _syncIdentity(): void {
    this._syncAutoId();
    this._syncAnchor();
  }

  private _syncAutoId(): void {
    const h = this._wrap;
    if (!h) return;
    // An author-set id on the host makes the host the jump target; generating
    // a second one on the heading would only split the anchor surface.
    const enabled = this.getAttribute('auto-id') !== 'false' && !this.id;
    if (!enabled) {
      // Only ever retract an id this component put there itself.
      if (this._autoId && h.id === this._autoId) h.removeAttribute('id');
      this._autoId = '';
      return;
    }
    if (this._autoId && h.id === this._autoId) return;
    const slug = slugifyTitle(this._headingText());
    if (!slug) {
      this._autoId = '';
      return;
    }
    this._autoId = uniqueSlugId(slug, (owner) => owner === h);
    patchAttr(h, 'id', this._autoId);
  }

  private _syncAnchor(): void {
    const h = this._wrap;
    if (!h) return;
    const target = this._targetId();
    if (!boolAttr(this, 'anchor') || !target) {
      this._anchor?.remove();
      this._anchor = null;
      return;
    }
    if (!this._anchor) {
      const a = document.createElement('a');
      a.className = 'ink-title__anchor';
      a.textContent = '#';
      this._anchor = a;
    }
    patchAttr(this._anchor, 'href', `#${target}`);
    patchAttr(
      this._anchor,
      'aria-label',
      this.getAttribute('anchor-label') || t(this, 'linkToSection'),
    );
    if (this._anchor.parentElement !== h) h.appendChild(this._anchor);
  }
}

define('e-title', ETitle);
