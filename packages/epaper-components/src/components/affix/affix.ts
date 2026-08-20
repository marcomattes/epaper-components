import { define, numAttr } from '../../core/dom';

/**
 * @summary Wraps slotted content in a `position: sticky` container.
 * @since v1.0.1
 *
 * Use to keep a sidebar, toolbar or header pinned while the page scrolls.
 * Implementation is pure CSS sticky — no scroll listeners — so it never
 * triggers an e-paper waveform on scroll. The wrapped element will pin once
 * its top edge passes `offset-top` pixels from the viewport top.
 *
 * Note: the parent of `<e-affix>` must be tall enough and not have
 * `overflow: hidden` for sticky to engage.
 *
 * @attr {number} [offset-top=0] - Pixels from the viewport top at which the content pins.
 *
 * @slot - Default slot for the content to pin.
 *
 * @example
 * <e-affix offset-top="16">
 *   <nav>...</nav>
 * </e-affix>
 */
export class EAffix extends HTMLElement {
  static readonly observedAttributes = ['offset-top'];

  private _wired = false;
  private _wrap: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const wrap = document.createElement('div');
    wrap.className = 'ink-affix';
    while (this.firstChild) wrap.appendChild(this.firstChild);
    this.appendChild(wrap);
    this._wrap = wrap;
    this._apply();
  }

  attributeChangedCallback() {
    if (this._wrap) this._apply();
  }

  private _apply(): void {
    if (!this._wrap) return;
    const top = numAttr(this, 'offset-top', 0);
    this._wrap.style.top = `${top}px`;
  }
}
define('e-affix', EAffix);
