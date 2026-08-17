import { boolAttr, define, patchBoolAttr, patchClassModifier } from '../core/dom';

/**
 * @summary Primary button with three visual variants.
 *
 * Children are used as the button label.
 *
 * Form-associated: when placed inside a `<form>`, `type="submit"` triggers
 * `form.requestSubmit()` and `type="reset"` triggers `form.reset()`.
 *
 * @attr {'primary'|'secondary'|'destructive'} [variant='secondary'] - Visual style.
 * @attr {'button'|'submit'|'reset'} [type='button'] - Submit behaviour inside a form.
 * @attr {boolean} [disabled] - Disables interaction and dims the control.
 * @attr {boolean} [autofocus] - Focuses the inner button on connect.
 *
 * @fires {CustomEvent<{originalEvent: MouseEvent}>} e-click - Fired when the button is activated and not disabled.
 *
 * @example
 * <e-button variant="primary">Save</e-button>
 */
export class EButton extends HTMLElement {
  static readonly formAssociated = true;
  // `autofocus` is not observed — it only applies at mount time.
  static readonly observedAttributes = ['variant', 'disabled'];

  private readonly internals: ElementInternals;
  private _wired = false;
  private _btn: HTMLButtonElement | null = null;
  private _glyph: HTMLElement | null = null;
  private _formDisabled = false;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  /** The form this button is associated with, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** Submit behaviour: 'button' (default), 'submit' or 'reset'. */
  get type(): 'button' | 'submit' | 'reset' {
    const t = this.getAttribute('type');
    return t === 'submit' || t === 'reset' ? t : 'button';
  }
  set type(v: 'button' | 'submit' | 'reset') {
    this.setAttribute('type', v);
  }

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const variant = this._variant();
    const disabled = boolAttr(this, 'disabled');
    const autofocus = boolAttr(this, 'autofocus');
    const content = [...this.childNodes];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ink-btn ink-btn--${variant}`;
    button.disabled = disabled;
    button.autofocus = autofocus;
    button.append(...content);
    this.replaceChildren(button);
    this._btn = button;
    this._syncGlyph(variant);
    button.addEventListener('click', (e) => {
      if (boolAttr(this, 'disabled') || this._formDisabled) {
        e.stopImmediatePropagation();
        return;
      }
      this.dispatchEvent(
        new CustomEvent('e-click', { detail: { originalEvent: e }, bubbles: true }),
      );
      const t = this.type;
      const form = this.internals.form;
      if (!form) return;
      if (t === 'submit') form.requestSubmit();
      else if (t === 'reset') form.reset();
    });
  }

  attributeChangedCallback(name: string, _old: string | null, _v: string | null) {
    if (!this._btn) return;
    if (name === 'variant') {
      const variant = this._variant();
      patchClassModifier(this._btn, 'ink-btn--', variant);
      this._syncGlyph(variant);
    }
    if (name === 'disabled') {
      const d = boolAttr(this, 'disabled');
      this._btn.disabled = d || this._formDisabled;
      patchBoolAttr(this._btn, 'disabled', d || this._formDisabled);
    }
  }

  formDisabledCallback(disabled: boolean): void {
    this._formDisabled = disabled;
    if (this._btn) this._btn.disabled = disabled || boolAttr(this, 'disabled');
  }

  private _syncGlyph(variant: string): void {
    if (!this._btn) return;
    if (variant === 'destructive' && !this._glyph) {
      const glyph = document.createElement('span');
      glyph.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 4h10M5 4V2.5h4V4M3.5 4l.7 8.5h5.6l.7-8.5M6 6.5v4M8 6.5v4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="square"/></svg>';
      this._btn.insertBefore(glyph, this._btn.firstChild);
      this._glyph = glyph;
    } else if (variant !== 'destructive' && this._glyph) {
      this._glyph.remove();
      this._glyph = null;
    }
  }

  private _variant(): 'primary' | 'secondary' | 'destructive' {
    const value = this.getAttribute('variant');
    return value === 'primary' || value === 'destructive' ? value : 'secondary';
  }
}

define('e-button', EButton);
