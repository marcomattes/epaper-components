import { addCleanup, define, patchAttr, runCleanups } from '../core/dom';

/**
 * @summary Single-select toggle row built from `<e-segment>` children.
 *
 * @attr {string} [value] - Currently selected segment value. Reactive.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user picks a different segment.
 *
 * @example
 * <e-segmented value="a">
 *   <e-segment value="a" label="A"></e-segment>
 *   <e-segment value="b" label="B"></e-segment>
 * </e-segmented>
 */
export class ESegmented extends HTMLElement {
  static observedAttributes = ['value'];

  private _wired = false;
  private _buttons: HTMLButtonElement[] = [];

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const opts = [...this.querySelectorAll('e-segment')].map((s) => ({
      value: s.getAttribute('value') ?? '',
      label: s.getAttribute('label') || s.textContent || '',
    }));
    this._build(opts);
    this.addEventListener('click', this._onClick);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback() {
    if (this._wired) this._syncSelection();
  }

  private _onClick = (e: Event): void => {
    const btn = (e.target as Element).closest<HTMLElement>('.ink-segmented__btn');
    if (!btn || !this.contains(btn)) return;
    const v = btn.dataset['value'] ?? '';
    this.setAttribute('value', v);
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
  };

  private _build(opts: Array<{ value: string; label: string }>): void {
    const value = this.getAttribute('value');
    const container = document.createElement('div');
    container.className = 'ink-segmented';
    container.setAttribute('role', 'radiogroup');

    this._buttons = [];
    for (const o of opts) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ink-segmented__btn';
      btn.setAttribute('aria-checked', o.value === value ? 'true' : 'false');
      btn.setAttribute('role', 'radio');
      btn.dataset['value'] = o.value;
      btn.textContent = o.label;
      container.appendChild(btn);
      this._buttons.push(btn);
    }

    this.replaceChildren(container);
  }

  private _syncSelection(): void {
    const value = this.getAttribute('value');
    for (const btn of this._buttons) {
      patchAttr(btn, 'aria-checked', btn.dataset['value'] === value ? 'true' : 'false');
    }
  }
}
define('e-segmented', ESegmented);

/**
 * @summary Single segment entry inside an `<e-segmented>`.
 *
 * @attr {string} value - Value contributed when this segment is active.
 * @attr {string} [label] - Visible label. Falls back to text content.
 */
export class ESegment extends HTMLElement {}
define('e-segment', ESegment);
