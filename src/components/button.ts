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
  static formAssociated = true;
  // `autofocus` is not observed — it only applies at mount time.
  static observedAttributes = ['variant', 'disabled'];

  private internals: ElementInternals;
  private _wired = false;
  private _btn: HTMLButtonElement | null = null;

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
    const variant = this.getAttribute('variant') || 'secondary';
    const disabled = boolAttr(this, 'disabled');
    const autofocus = boolAttr(this, 'autofocus');
    const label = this.innerHTML;
    const glyph =
      variant === 'destructive'
        ? '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 4h10M5 4V2.5h4V4M3.5 4l.7 8.5h5.6l.7-8.5M6 6.5v4M8 6.5v4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="square"/></svg>'
        : '';
    // Inner native button stays type="button" so the form is only submitted
    // through our explicit `internals.form?.requestSubmit()` path below.
    this.innerHTML = `<button type="button" class="ink-btn ink-btn--${variant}"${disabled ? ' disabled' : ''}${autofocus ? ' autofocus' : ''}>${glyph}${label}</button>`;
    this._btn = this.firstElementChild as HTMLButtonElement;
    this._btn.addEventListener('click', (e) => {
      if (boolAttr(this, 'disabled')) {
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
      const variant = this.getAttribute('variant') || 'secondary';
      patchClassModifier(this._btn, 'ink-btn--', variant);
    }
    if (name === 'disabled') {
      const d = boolAttr(this, 'disabled');
      this._btn.disabled = d;
      patchBoolAttr(this._btn, 'disabled', d);
    }
  }
}

define('e-button', EButton);
