import { captureWrap, define, patchClassModifier } from '../core/dom';

/**
 * @summary Typography wrapper with semantic tag and visual kind selectors.
 *
 * Children are used as the text content.
 *
 * @attr {'body'|'prose'|'small'|'mono'|'label'} [kind='body'] - Visual style.
 * @attr {'p'|'span'|'div'} [as='span'] - Wrapping element tag name. Changes to `as` after mount rebuild the wrapper.
 *
 * @example
 * <e-text kind="label" as="span">SECTION</e-text>
 */
export class EText extends HTMLElement {
  static observedAttributes = ['kind', 'as'];

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
      if (next !== this._tag) {
        const newWrap = document.createElement(next);
        while (this._wrap.firstChild) newWrap.appendChild(this._wrap.firstChild);
        this._wrap.replaceWith(newWrap);
        this._wrap = newWrap;
        this._tag = next;
      }
    }
    this._render();
  }

  private _mountWrap(): void {
    this._tag = this.getAttribute('as') || 'span';
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
