import { addCleanup, define, patchAttr, runCleanups } from '../core/dom';

/**
 * @summary Single-select toggle row built from `<e-segment>` children.
 * @since v1.0.1
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
  static readonly observedAttributes = ['value'];

  private _wired = false;
  private _buttons: HTMLButtonElement[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const opts = [...this.querySelectorAll('e-segment')].map((s) => ({
        value: s.getAttribute('value') ?? '',
        label: s.getAttribute('label') || s.textContent || '',
      }));
      this._build(opts);
    }
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
    addCleanup(this, () => this.removeEventListener('keydown', this._onKeydown));
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback() {
    if (this._wired) this._syncSelection();
  }

  private readonly _onClick = (e: Event): void => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('.ink-segmented__btn');
    if (!btn || !this.contains(btn)) return;
    this._selectButton(btn);
  };

  private readonly _onKeydown = (e: KeyboardEvent): void => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('.ink-segmented__btn');
    if (!btn || !this.contains(btn)) return;
    const index = this._buttons.indexOf(btn);
    let next: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % this._buttons.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (index - 1 + this._buttons.length) % this._buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = this._buttons.length - 1;
    else return;
    e.preventDefault();
    const nextButton = this._buttons[next];
    if (!nextButton) return;
    this._selectButton(nextButton);
    nextButton.focus();
  };

  private _selectButton(btn: HTMLButtonElement): void {
    const v = btn.dataset['value'] ?? '';
    if (v === this.getAttribute('value')) return;
    this.setAttribute('value', v);
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
  }

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
      btn.tabIndex = o.value === value ? 0 : -1;
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
      btn.tabIndex = btn.dataset['value'] === value ? 0 : -1;
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
