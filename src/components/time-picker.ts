import { addCleanup, define, patchAttr, patchText, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';
import { pad2 } from '../core/date';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary Hour/minute picker with stepper buttons.
 * @since v1.0.1
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * @attr {string} [value='00:00'] - Current time in `HH:MM` format. Wraps around the 24-hour and 60-minute boundaries.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [required] - Requires a valid time value. The default `00:00` satisfies this constraint.
 * @attr {string} [required-message] - Message reported when no required time is selected.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user changes the time. `value` is `HH:MM`.
 *
 * @example
 * <e-time-picker value="09:30"></e-time-picker>
 */
export class ETimePicker extends BaseFormControl {
  static observedAttributes = ['value', 'required', 'required-message'];

  private _wired = false;
  private _hCell: HTMLElement | null = null;
  private _mCell: HTMLElement | null = null;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const initial = this._normalize(this.getAttribute('value'));
      this._value = initial;
      this.internals.setFormValue(initial);
      this._build();
      this._syncValidity();
    }

    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
    addCleanup(this, () => this.removeEventListener('keydown', this._onKeydown));
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (name === 'required' || name === 'required-message') {
      this._syncValidity();
      return;
    }
    if (name !== 'value') return;
    const normalized = this._normalize(v);
    if (v != null && v !== normalized) {
      this.setAttribute('value', normalized);
      return;
    }
    this._value = normalized;
    this.internals.setFormValue(this._value);
    if (this._wired) this._applyValue(this._value);
    this._syncValidity();
  }

  private _build(): void {
    const [h, m] = this._parts(this._value);

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
    const [h, m] = this._parts(value);
    patchText(this._hCell, pad2(h));
    patchAttr(this._hCell, 'aria-valuenow', String(h));
    patchText(this._mCell, pad2(m));
    patchAttr(this._mCell, 'aria-valuenow', String(m));
  }

  private _normalize(value: string | null | undefined): string {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return '00:00';
    const [hours, minutes] = value.split(':').map(Number) as [number, number];
    if (hours > 23 || minutes > 59) return '00:00';
    return `${pad2(hours)}:${pad2(minutes)}`;
  }

  private _parts(value: string): [number, number] {
    return value.split(':').map(Number) as [number, number];
  }

  private _step(axis: 'h' | 'm', direction: number): void {
    let [hours, minutes] = this._parts(this._normalize(this.getAttribute('value')));
    if (axis === 'h') hours = (hours + direction + 24) % 24;
    else minutes = (minutes + direction + 60) % 60;
    const value = `${pad2(hours)}:${pad2(minutes)}`;
    this.setAttribute('value', value);
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value }, bubbles: true }));
  }

  private _onClick = (e: Event): void => {
    const button = (e.target as Element).closest<HTMLElement>('[data-axis]');
    if (button) this._step(button.dataset['axis'] as 'h' | 'm', Number(button.dataset['dir']));
  };

  private _onKeydown = (e: KeyboardEvent): void => {
    const cell = (e.target as Element).closest<HTMLElement>('[data-cell]');
    if (!cell) return;
    const axis = cell.dataset['cell'] as 'h' | 'm';
    const partner = axis === 'h' ? this._mCell : this._hCell;
    if (e.key === 'ArrowUp') this._step(axis, 1);
    else if (e.key === 'ArrowDown') this._step(axis, -1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') partner?.focus();
    else if (e.key === 'Home' || e.key === 'End') {
      let [hours, minutes] = this._parts(this._value);
      if (axis === 'h') hours = e.key === 'Home' ? 0 : 23;
      else minutes = e.key === 'Home' ? 0 : 59;
      const value = `${pad2(hours)}:${pad2(minutes)}`;
      this.setAttribute('value', value);
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value }, bubbles: true }));
    } else return;
    e.preventDefault();
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') cell.focus();
  };

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
    return this._normalize(s);
  }

  override formResetCallback(): void {
    const dflt = this.getAttribute('default-value') ?? '00:00';
    this.setAttribute('value', dflt);
  }

  private _syncValidity(): void {
    const anchor = this._hCell ?? undefined;
    anchor?.setAttribute('aria-required', String(this.hasAttribute('required')));
    this.applyRequiredValidity(!!this._value, anchor, 'Please select a time.');
  }
}

define('e-time-picker', ETimePicker);
