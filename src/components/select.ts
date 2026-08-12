import { define, esc, onGlobal, patchText, runCleanups } from '../core/dom';
import { ICONS, iconSvg } from '../core/icons';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary Single-select dropdown built from `<e-option>` children.
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * @attr {string} [value] - Currently selected option value.
 * @attr {string} [placeholder='Select…'] - Trigger placeholder when no value is set.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user picks a different option.
 *
 * @example
 * <e-select placeholder="Pick one">
 *   <e-option value="a" label="Apples"></e-option>
 *   <e-option value="b" label="Bananas"></e-option>
 * </e-select>
 */
export class ESelect extends BaseFormControl {
  static observedAttributes = ['value', 'placeholder'];

  private _wired = false;
  private _trigger: HTMLElement | null = null;
  private _menu: HTMLElement | null = null;
  private _triggerLabel: HTMLElement | null = null;
  private _chevPath: SVGPathElement | null = null;
  private _opts: Array<{ value: string; label: string }> = [];
  private _optEls: HTMLElement[] = [];
  private _selectedEl: HTMLElement | null = null;
  private _placeholder = 'Select…';

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this._placeholder = this.getAttribute('placeholder') || 'Select…';
    const value = this.getAttribute('value') ?? '';
    this._opts = [...this.querySelectorAll('e-option')].map((o) => ({
      value: o.getAttribute('value') ?? '',
      label: o.getAttribute('label') || o.textContent || '',
    }));
    const current = this._opts.find((o) => o.value === value);
    this.innerHTML = `<div class="ink-select">
      <button type="button" class="ink-select__trigger" aria-haspopup="listbox" aria-expanded="false">
        <span data-current>${esc(current ? current.label : this._placeholder)}</span>
        ${iconSvg('chevD', 18)}
      </button>
      <ul class="ink-select__menu" role="listbox" hidden>
        ${this._opts
          .map(
            (o) => `<li class="ink-select__option" role="option"
          data-value="${esc(o.value)}" aria-selected="${o.value === value}">
          <span style="flex:1">${esc(o.label)}</span>
          ${o.value === value ? iconSvg('check', 16) : ''}
        </li>`,
          )
          .join('')}
      </ul>
    </div>`;

    this._trigger = this.querySelector('.ink-select__trigger');
    this._menu = this.querySelector('.ink-select__menu');
    this._triggerLabel = this._trigger!.querySelector<HTMLElement>('[data-current]');
    this._chevPath = this._trigger!.querySelector<SVGPathElement>('svg path');
    this._optEls = [...this._menu!.querySelectorAll<HTMLElement>('.ink-select__option')];
    this._value = value;
    this.internals.setFormValue(value);

    // Cache the initially-selected option element.
    const selIdx = this._opts.findIndex((o) => o.value === value);
    this._selectedEl = selIdx >= 0 ? (this._optEls[selIdx] ?? null) : null;

    for (const opt of this._optEls) {
      opt.tabIndex = opt.getAttribute('aria-selected') === 'true' ? 0 : -1;
    }

    const setOpen = (v: boolean) => {
      this._menu!.hidden = !v;
      this._trigger!.setAttribute('aria-expanded', String(v));
      if (this._chevPath) this._chevPath.setAttribute('d', v ? ICONS.chevU : ICONS.chevD);
    };

    const focusOption = (idx: number): void => {
      if (this._optEls.length === 0) return;
      const i = ((idx % this._optEls.length) + this._optEls.length) % this._optEls.length;
      const target = this._optEls[i];
      if (!target) return;
      for (const o of this._optEls) o.tabIndex = -1;
      target.tabIndex = 0;
      target.focus();
    };

    const selectOption = (v: string): void => {
      this.setAttribute('value', v);
      setOpen(false);
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
      this._trigger!.focus();
    };

    this._trigger!.addEventListener('click', () => setOpen(!!this._menu!.hidden));
    this._trigger!.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
        const cur = this._optEls.findIndex((o) => o.getAttribute('aria-selected') === 'true');
        const start = cur >= 0 ? cur : e.key === 'ArrowDown' ? 0 : this._optEls.length - 1;
        focusOption(start);
      }
    });
    this._menu!.addEventListener('click', (e) => {
      const opt = (e.target as Element).closest<HTMLElement>('.ink-select__option');
      if (!opt) return;
      selectOption(opt.dataset['value'] ?? '');
    });
    this._menu!.addEventListener('keydown', (e) => {
      if (this._menu!.hidden) return;
      const cur = this._optEls.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusOption(cur < 0 ? 0 : cur + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusOption(cur < 0 ? this._optEls.length - 1 : cur - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        focusOption(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        focusOption(this._optEls.length - 1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const focused = document.activeElement as HTMLElement | null;
        if (focused?.classList.contains('ink-select__option')) {
          selectOption(focused.dataset['value'] ?? '');
        }
      }
    });
    onGlobal(this, document, 'mousedown', (e) => {
      if (!this.contains(e.target as Node)) setOpen(false);
    });
    onGlobal(this, document, 'keydown', (e) => {
      if (e.key === 'Escape' && !this._menu!.hidden && this.contains(document.activeElement)) {
        setOpen(false);
        this._trigger!.focus();
      }
    });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._menu || !this._trigger) return;
    if (name === 'placeholder') {
      this._placeholder = v ?? 'Select…';
      if (!this._opts.find((o) => o.value === this._value) && this._triggerLabel) {
        patchText(this._triggerLabel, this._placeholder);
      }
      return;
    }
    if (name !== 'value') return;
    const newValue = v ?? '';
    if (newValue === this._value) return;
    this._value = newValue;
    this.internals.setFormValue(newValue);

    // Deselect previous — only touch the old element.
    if (this._selectedEl) {
      this._selectedEl.setAttribute('aria-selected', 'false');
      this._selectedEl.querySelector('svg')?.remove();
    }
    // Select new — only touch the new element.
    const newIdx = this._opts.findIndex((o) => o.value === newValue);
    const newEl = newIdx >= 0 ? (this._optEls[newIdx] ?? null) : null;
    if (newEl) {
      newEl.setAttribute('aria-selected', 'true');
      if (!newEl.querySelector('svg')) newEl.insertAdjacentHTML('beforeend', iconSvg('check', 16));
    }
    this._selectedEl = newEl;

    if (this._triggerLabel) {
      const opt = this._opts.find((o) => o.value === newValue);
      patchText(this._triggerLabel, opt ? opt.label : this._placeholder);
    }
  }

  override get value(): string {
    return this._value;
  }
  override set value(v: string) {
    this.setAttribute('value', v ?? '');
  }

  protected serialize(v: string): string {
    return v ?? '';
  }
  protected parse(s: string): string {
    return s;
  }

  override formResetCallback(): void {
    this.value = this.getAttribute('default-value') ?? '';
  }
}
define('e-select', ESelect);

/**
 * @summary Single option entry inside an `<e-select>`.
 *
 * @attr {string} value - Option value emitted by the parent's `e-change` event.
 * @attr {string} [label] - Visible label. Falls back to text content.
 *
 * @example
 * <e-option value="a" label="Apples"></e-option>
 */
export class EOption extends HTMLElement {}
define('e-option', EOption);
