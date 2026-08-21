import {
  addCleanup,
  boolAttr,
  captureWrap,
  define,
  patchBoolAttr,
  runCleanups,
} from '../../core/dom';

/**
 * @summary Small inline label, optionally removable.
 * @since v1.0.1
 *
 * Children are used as the tag text. Distinct from `<e-badge>` (purely
 * decorative) because a tag can be dismissed by the user via a close button.
 *
 * @attr {boolean} [closable] - Renders a close button after the label.
 * @attr {boolean} [disabled] - Disables the close button.
 *
 * @fires {CustomEvent<{value: string}>} e-close - Fired when the close button is activated. `value` is the tag's text content.
 *
 * @slot - Default slot for the tag label.
 *
 * @example
 * <e-tag closable>Draft</e-tag>
 */
export class ETag extends HTMLElement {
  static readonly observedAttributes = ['closable', 'disabled'];

  private _wrap: HTMLElement | null = null;
  private _btn: HTMLButtonElement | null = null;

  connectedCallback() {
    if (!this._wrap) {
      this._wrap = captureWrap(this, 'span');
      this._wrap.classList.add('ink-tag');
    }
    this._sync();
    this._bindButton();
  }

  disconnectedCallback() {
    runCleanups(this);
    this._buttonBound = false;
  }

  attributeChangedCallback() {
    if (this._wrap) this._sync();
  }

  private _sync(): void {
    const wrap = this._wrap!;
    const closable = boolAttr(this, 'closable');
    const disabled = boolAttr(this, 'disabled');
    if (closable && !this._btn) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ink-tag__close';
      btn.setAttribute('aria-label', 'Remove');
      btn.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="square"/></svg>';
      wrap.appendChild(btn);
      this._btn = btn;
      this._bindButton();
    } else if (!closable && this._btn) {
      this._btn.removeEventListener('click', this._onClick);
      this._btn.remove();
      this._btn = null;
      this._buttonBound = false;
    }
    if (this._btn) {
      this._btn.disabled = disabled;
      patchBoolAttr(this._btn, 'disabled', disabled);
    }
  }

  private _buttonBound = false;

  private readonly _onClick = (e: Event): void => {
    if (boolAttr(this, 'disabled')) {
      e.stopImmediatePropagation();
      return;
    }
    this.dispatchEvent(
      new CustomEvent('e-close', {
        detail: { value: (this._wrap?.textContent || '').trim() },
        bubbles: true,
      }),
    );
  };

  private _bindButton(): void {
    if (!this.isConnected || !this._btn || this._buttonBound) return;
    const btn = this._btn;
    btn.addEventListener('click', this._onClick);
    addCleanup(this, () => btn.removeEventListener('click', this._onClick));
    this._buttonBound = true;
  }
}

define('e-tag', ETag);
