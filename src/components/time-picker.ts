import { addCleanup, define, patchAttr, patchText, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';
import { pad2 } from '../core/date';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary Hour/minute picker with stepper buttons.
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * @attr {string} [value='00:00'] - Current time in `HH:MM` format. Wraps around the 24-hour and 60-minute boundaries.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user changes the time. `value` is `HH:MM`.
 *
 * @example
 * <e-time-picker value="09:30"></e-time-picker>
 */
export class ETimePicker extends BaseFormControl {
  static observedAttributes = ['value'];

  private _wired = false;
  private _hCell: HTMLElement | null = null;
  private _mCell: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const initial = this.getAttribute('value') || '00:00';
    this._value = initial;
    this.internals.setFormValue(initial);
    this._build();

    const step = (axis: 'h' | 'm', dir: number): void => {
      const cur = this.getAttribute('value') || '00:00';
      let [h, m] = cur.split(':').map(Number);
      if (!Number.isFinite(h)) h = 0;
      if (!Number.isFinite(m)) m = 0;
      if (axis === 'h') h = (h + dir + 24) % 24;
      else m = (m + dir + 60) % 60;
      const v = `${pad2(h)}:${pad2(m)}`;
      // setAttribute triggers attributeChangedCallback → _applyValue — no manual _render needed.
      this.setAttribute('value', v);
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
    };

    const onClick = (e: Event) => {
      const btn = (e.target as Element).closest<HTMLElement>('[data-axis]');
      if (!btn) return;
      step(btn.dataset['axis'] as 'h' | 'm', Number(btn.dataset['dir']));
    };

    const onKeydown = (e: Event) => {
      const ke = e as KeyboardEvent;
      const cell = (ke.target as Element).closest<HTMLElement>('[data-cell]');
      if (!cell) return;
      const axis = cell.dataset['cell'] as 'h' | 'm';
      const partner = axis === 'h' ? this._mCell : this._hCell;

      if (ke.key === 'ArrowUp') {
        ke.preventDefault();
        step(axis, 1);
        // Cell identity is stable — focus is maintained, but explicit for reliability.
        cell.focus();
      } else if (ke.key === 'ArrowDown') {
        ke.preventDefault();
        step(axis, -1);
        cell.focus();
      } else if (ke.key === 'ArrowLeft' || ke.key === 'ArrowRight') {
        ke.preventDefault();
        partner?.focus();
      } else if (ke.key === 'Home' || ke.key === 'End') {
        ke.preventDefault();
        const cur = this.getAttribute('value') || '00:00';
        let [h, m] = cur.split(':').map(Number);
        if (!Number.isFinite(h)) h = 0;
        if (!Number.isFinite(m)) m = 0;
        if (axis === 'h') h = ke.key === 'Home' ? 0 : 23;
        else m = ke.key === 'Home' ? 0 : 59;
        const v = `${pad2(h)}:${pad2(m)}`;
        this.setAttribute('value', v);
        this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
        cell.focus();
      }
    };

    this.addEventListener('click', onClick);
    this.addEventListener('keydown', onKeydown);
    addCleanup(this, () => this.removeEventListener('click', onClick));
    addCleanup(this, () => this.removeEventListener('keydown', onKeydown));
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (name !== 'value') return;
    this._value = v ?? '00:00';
    this.internals.setFormValue(this._value);
    if (this._wired) this._applyValue(this._value);
  }

  private _build(): void {
    let [h, m] = (this.getAttribute('value') || '00:00').split(':').map(Number);
    if (!Number.isFinite(h)) h = 0;
    if (!Number.isFinite(m)) m = 0;

    const makeSteppers = (axis: 'h' | 'm'): HTMLElement => {
      const col = document.createElement('div');
      col.className = 'ink-timepicker__steppers';
      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'ink-timepicker__step ink-timepicker__step--top';
      up.dataset['axis'] = axis;
      up.dataset['dir'] = '1';
      up.setAttribute('aria-label', axis === 'h' ? 'Hour up' : 'Minute up');
      up.tabIndex = -1;
      up.innerHTML = iconSvg('chevU', 14);
      const dn = document.createElement('button');
      dn.type = 'button';
      dn.className = 'ink-timepicker__step';
      dn.dataset['axis'] = axis;
      dn.dataset['dir'] = '-1';
      dn.setAttribute('aria-label', axis === 'h' ? 'Hour down' : 'Minute down');
      dn.tabIndex = -1;
      dn.innerHTML = iconSvg('chevD', 14);
      col.appendChild(up);
      col.appendChild(dn);
      return col;
    };

    const makeCell = (axis: 'h' | 'm', val: number, max: number): HTMLElement => {
      const cell = document.createElement('div');
      cell.className = 'ink-timepicker__cell';
      cell.dataset['cell'] = axis;
      cell.tabIndex = 0;
      cell.setAttribute('role', 'spinbutton');
      cell.setAttribute('aria-label', axis === 'h' ? 'Hours' : 'Minutes');
      cell.setAttribute('aria-valuemin', '0');
      cell.setAttribute('aria-valuemax', String(max));
      cell.setAttribute('aria-valuenow', String(val));
      cell.textContent = pad2(val);
      return cell;
    };

    const hCell = makeCell('h', h, 23);
    const mCell = makeCell('m', m, 59);
    this._hCell = hCell;
    this._mCell = mCell;

    const sep = document.createElement('div');
    sep.className = 'ink-timepicker__sep';
    sep.textContent = ':';

    const wrap = document.createElement('div');
    wrap.className = 'ink-timepicker';
    wrap.appendChild(makeSteppers('h'));
    wrap.appendChild(hCell);
    wrap.appendChild(sep);
    wrap.appendChild(mCell);
    wrap.appendChild(makeSteppers('m'));

    this.replaceChildren(wrap);
  }

  private _applyValue(value: string): void {
    if (!this._hCell || !this._mCell) return;
    let [h, m] = value.split(':').map(Number);
    if (!Number.isFinite(h)) h = 0;
    if (!Number.isFinite(m)) m = 0;
    patchText(this._hCell, pad2(h));
    patchAttr(this._hCell, 'aria-valuenow', String(h));
    patchText(this._mCell, pad2(m));
    patchAttr(this._mCell, 'aria-valuenow', String(m));
  }

  override get value(): string {
    return this._value;
  }
  override set value(v: string) {
    this.setAttribute('value', v ?? '00:00');
  }

  protected serialize(v: string): string {
    return v ?? '00:00';
  }
  protected parse(s: string): string {
    return s || '00:00';
  }

  override formResetCallback(): void {
    const dflt = this.getAttribute('default-value') ?? '00:00';
    this.setAttribute('value', dflt);
  }
}

define('e-time-picker', ETimePicker);
