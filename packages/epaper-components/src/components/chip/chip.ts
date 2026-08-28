import {
  addCleanup,
  boolAttr,
  captureWrap,
  define,
  EpaperElement,
  patchBoolAttr,
  runCleanups,
} from '../../core/dom';

/**
 * @summary Selectable label, often used for filters or quick choices.
 * @since v1.0.1
 *
 * Children are used as the chip text. A chip toggles `selected` on click and
 * fires `e-change`. Distinct from `<e-tag>` (which is a removable label) and
 * `<e-badge>` (which is purely decorative).
 *
 * @attr {boolean} [selected] - Visually marks the chip as active.
 * @attr {boolean} [disabled] - Disables interaction.
 *
 * @fires {CustomEvent<{value: boolean}>} e-change - Fired on click. `value` is the new selected state.
 *
 * @slot - Default slot for the chip label.
 *
 * @example
 * <e-chip selected>Today</e-chip>
 */
export class EChip extends EpaperElement {
  static readonly observedAttributes = ['selected', 'disabled'];

  private _wrap: HTMLButtonElement | null = null;

  connectedCallback() {
    if (!this._wrap) {
      const inner = captureWrap(this, 'button');
      inner.className = 'ink-chip';
      const btn = inner as HTMLButtonElement;
      btn.type = 'button';
      this._wrap = btn;
    }
    this._wrap.addEventListener('click', this._onClick);
    addCleanup(this, () => this._wrap?.removeEventListener('click', this._onClick));
    this._sync();
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback() {
    if (this._wrap) this._sync();
  }

  private _sync(): void {
    const btn = this._wrap!;
    const selected = boolAttr(this, 'selected');
    const disabled = boolAttr(this, 'disabled');
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    btn.disabled = disabled;
    patchBoolAttr(btn, 'disabled', disabled);
  }

  private readonly _onClick = (e: Event): void => {
    if (boolAttr(this, 'disabled')) {
      e.stopImmediatePropagation();
      return;
    }
    const next = !boolAttr(this, 'selected');
    patchBoolAttr(this, 'selected', next);
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: next }, bubbles: true }));
  };
}

define('e-chip', EChip);
