import { captureWrap, define, patchClassModifier } from '../../core/dom';

/** True when `document.createElement` accepts `tag` as an element name. */
const isElementName = (tag: string): boolean => {
  try {
    document.createElement(tag);
    return true;
  } catch {
    return false;
  }
};

/**
 * @summary Typography wrapper with semantic tag and visual kind selectors.
 * @since v1.0.1
 *
 * Children are used as the text content.
 *
 * @attr {'body'|'prose'|'small'|'mono'|'label'} [kind='body'] - Visual style.
 * @attr {'p'|'span'|'div'} [as='span'] - Wrapping element tag name. Changes to `as` after
 *   mount rebuild the wrapper and carry its classes over. A value that is not a valid
 *   element name is ignored: the mounted wrapper is kept, and at mount time `span` is used.
 *
 * @example
 * <e-text kind="label" as="span">SECTION</e-text>
 */
export class EText extends HTMLElement {
  static readonly observedAttributes = ['kind', 'as'];

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
  }
}

define('e-text', EText);
