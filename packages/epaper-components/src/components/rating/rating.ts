import {
  addCleanup,
  boolAttr,
  define,
  intAttr,
  patchAttr,
  randId,
  runCleanups,
} from '../../core/dom';
import { ICONS, SVG_NS } from '../../core/icons';
import { BaseFormControl } from '../../core/base-form-control';
import { t } from '../../core/i18n';

const SMILEY = {
  face: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  features: 'M9 10h.01M15 10h.01M8 14.5a5 5 0 0 0 8 0',
};

/**
 * @summary Star or smiley rating with touch-sized targets and full keyboard control.
 * @since v1.3.0
 *
 * Form-associated: participates in `<form>` submission and FormData. An
 * unrated control submits an empty value, so `required` behaves the way it
 * does on a native control.
 *
 * Every symbol is a 48px hit target — a kiosk panel is operated with a thumb,
 * often through a protective sheet — and the selected state is a solid fill,
 * never a colour change, so it survives a 1-bit refresh.
 *
 * @attr {number} [value=0] - Current rating. `0` means unrated.
 * @attr {number} [default-value] - Rating restored by a form reset.
 * @attr {number} [max=5] - Number of symbols (1–10).
 * @attr {'star'|'smiley'} [glyph='star'] - Symbol drawn for each step.
 * @attr {string} [label] - Label rendered above the symbols.
 * @attr {string} [hint] - Helper text rendered below the symbols.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [readonly] - Renders the current rating without accepting input.
 * @attr {boolean} [disabled] - Disables interaction. Presence alone disables.
 * @attr {boolean} [required] - Requires a rating of at least 1.
 * @attr {string} [required-message] - Message reported when `required` is not satisfied. Defaults to the string table's `required`.
 * @attr {boolean} [allow-clear] - Re-selecting the current rating clears it back to `0`.
 *
 * @fires {CustomEvent<{value: number}>} e-change - Fired when the rating changes.
 *
 * @example
 * <e-rating name="taste" max="5" value="4" label="How was it?"></e-rating>
 */
export class ERating extends BaseFormControl<number> {
  static readonly observedAttributes = [
    'value',
    'max',
    'glyph',
    'label',
    'hint',
    'readonly',
    'disabled',
    'required',
    'required-message',
    'allow-clear',
  ];

  private _wired = false;
  private _group: HTMLElement | null = null;
  private _labelEl: HTMLElement | null = null;
  private _hintEl: HTMLElement | null = null;
  private _buttons: HTMLButtonElement[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._value = this._clamp(intAttr(this, 'value', intAttr(this, 'default-value', 0)));
      this.internals.setFormValue(this.serialize(this._value));
      this._build();
      this._syncSymbols();
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

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    if (name === 'max' || name === 'glyph') {
      // A smaller `max` re-clamps the held rating; the form value has to
      // follow, or the control would submit a rating it no longer shows.
      const clamped = this._clamp(this._value);
      if (clamped !== this._value) {
        this._value = clamped;
        this.internals.setFormValue(this.serialize(clamped));
        this.setAttribute('value', String(clamped));
      }
      this._buildSymbols();
      this._syncSymbols();
      this._syncValidity();
      return;
    }
    if (name === 'value') {
      const next = this._clamp(intAttr(this, 'value', 0));
      if (next !== this._value) {
        this._value = next;
        this.internals.setFormValue(this.serialize(next));
      }
    }
    if (name === 'label' || name === 'hint') this._syncTexts();
    this._syncSymbols();
    this._syncValidity();
  }

  override get value(): number {
    return this._value;
  }
  override set value(v: number) {
    const next = this._clamp(Number(v));
    this._value = next;
    this.internals.setFormValue(this.serialize(next));
    this._syncSymbols();
    this._syncValidity();
  }

  protected serialize(v: number): string {
    return v > 0 ? String(v) : '';
  }
  protected parse(s: string): number {
    const parsed = Number(s);
    return Number.isFinite(parsed) ? this._clamp(parsed) : 0;
  }

  protected override resetValue(): void {
    this.value = this.parse(this.getAttribute('default-value') ?? '');
  }

  protected override formDisabledChanged(): void {
    this._syncSymbols();
  }

  private _max(): number {
    return Math.max(1, Math.min(10, intAttr(this, 'max', 5)));
  }

  private _clamp(v: number): number {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(this._max(), Math.round(v)));
  }

  private _interactive(): boolean {
    return !boolAttr(this, 'readonly') && !this.hasAttribute('disabled') && !this._formDisabled;
  }

  private readonly _onClick = (e: Event): void => {
    const button = (e.target as Element).closest<HTMLButtonElement>('.ink-rating__symbol');
    if (!button || !this.contains(button) || !this._interactive()) return;
    const picked = Number(button.dataset['value']);
    const next = picked === this._value && boolAttr(this, 'allow-clear') ? 0 : picked;
    this._commit(next);
  };

  private readonly _onKeydown = (e: KeyboardEvent): void => {
    const button = (e.target as Element).closest<HTMLButtonElement>('.ink-rating__symbol');
    if (!button || !this.contains(button) || !this._interactive()) return;
    const max = this._max();
    let next: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(max, this._value + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, this._value - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = max;
    else if (/^\d$/.test(e.key)) next = this._clamp(Number(e.key));
    else return;
    e.preventDefault();
    this._commit(next);
    this._focusValue(next);
  };

  private _commit(next: number): void {
    if (next === this._value) return;
    this._value = next;
    this.internals.setFormValue(this.serialize(next));
    this.setAttribute('value', String(next));
    this._syncSymbols();
    this._syncValidity();
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: next }, bubbles: true }));
  }

  private _focusValue(value: number): void {
    const index = Math.max(0, value - 1);
    this._buttons[index]?.focus();
  }

  private _build(): void {
    const root = document.createElement('div');
    root.className = 'ink-rating';

    const labelEl = document.createElement('div');
    labelEl.className = 'ink-label';
    const group = document.createElement('div');
    group.className = 'ink-rating__group';
    group.setAttribute('role', 'radiogroup');
    group.id = this.id ? `${this.id}-group` : randId('e-rt');
    const hintEl = document.createElement('div');
    hintEl.className = 'ink-hint';

    root.append(labelEl, group, hintEl);
    this._labelEl = labelEl;
    this._group = group;
    this._hintEl = hintEl;
    this.replaceChildren(root);
    this._syncTexts();
    this._buildSymbols();
  }

  /** Rebuild the symbol row. Only `max`/`glyph` changes reach this. */
  private _buildSymbols(): void {
    if (!this._group) return;
    const max = this._max();
    const smiley = this.getAttribute('glyph') === 'smiley';
    this._buttons = [];
    const symbols: HTMLButtonElement[] = [];
    for (let step = 1; step <= max; step++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ink-rating__symbol';
      button.dataset['value'] = String(step);
      button.setAttribute('role', 'radio');
      button.appendChild(smiley ? this._smileyGlyph() : this._starGlyph());
      symbols.push(button);
      this._buttons.push(button);
    }
    this._group.replaceChildren(...symbols);
  }

  private _svg(): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '28');
    svg.setAttribute('height', '28');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    return svg;
  }

  private _starGlyph(): SVGSVGElement {
    const svg = this._svg();
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ICONS.star);
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linejoin', 'miter');
    path.setAttribute('fill', 'none');
    path.classList.add('ink-rating__fill');
    svg.appendChild(path);
    return svg;
  }

  private _smileyGlyph(): SVGSVGElement {
    const svg = this._svg();
    const face = document.createElementNS(SVG_NS, 'path');
    face.setAttribute('d', SMILEY.face);
    face.setAttribute('stroke', 'currentColor');
    face.setAttribute('stroke-width', '2');
    face.setAttribute('fill', 'none');
    face.classList.add('ink-rating__fill');
    const features = document.createElementNS(SVG_NS, 'path');
    features.setAttribute('d', SMILEY.features);
    features.setAttribute('stroke', 'currentColor');
    features.setAttribute('stroke-width', '2');
    features.setAttribute('stroke-linecap', 'round');
    features.setAttribute('fill', 'none');
    features.classList.add('ink-rating__features');
    svg.append(face, features);
    return svg;
  }

  private _syncTexts(): void {
    if (!this._labelEl || !this._hintEl || !this._group) return;
    const label = this.getAttribute('label') || '';
    const hint = this.getAttribute('hint') || '';
    if (this._labelEl.textContent !== label) this._labelEl.textContent = label;
    patchAttr(this._labelEl, 'hidden', label ? null : '');
    if (this._hintEl.textContent !== hint) this._hintEl.textContent = hint;
    patchAttr(this._hintEl, 'hidden', hint ? null : '');
    patchAttr(
      this._group,
      'aria-label',
      label || this.getAttribute('aria-label') || t(this, 'rating'),
    );
  }

  private _syncSymbols(): void {
    if (!this._group) return;
    const interactive = this._interactive();
    const max = this._max();
    patchAttr(
      this._group,
      'data-glyph',
      this.getAttribute('glyph') === 'smiley' ? 'smiley' : 'star',
    );
    patchAttr(this._group, 'aria-readonly', boolAttr(this, 'readonly') ? 'true' : null);
    patchAttr(this._group, 'aria-disabled', interactive ? null : 'true');
    this._buttons.forEach((button, index) => {
      const step = index + 1;
      const on = step <= this._value;
      patchAttr(button, 'aria-checked', String(step === this._value));
      patchAttr(button, 'data-on', on ? 'true' : null);
      patchAttr(button, 'aria-label', t(this, 'ratingOf', { value: step, max }));
      button.disabled = !interactive;
      // The focused step is the selected one, or the first when unrated:
      // one tab stop for the whole group, as a radio group requires.
      button.tabIndex = step === (this._value || 1) ? 0 : -1;
      const fill = button.querySelector<SVGElement>('.ink-rating__fill');
      if (fill) fill.setAttribute('fill', on ? 'currentColor' : 'none');
      const features = button.querySelector<SVGElement>('.ink-rating__features');
      if (features) features.setAttribute('stroke', on ? 'var(--ink-bg)' : 'currentColor');
    });
  }

  private _syncValidity(): void {
    this.applyRequiredValidity(this._value > 0, this._group ?? undefined, t(this, 'required'));
  }
}

define('e-rating', ERating);
