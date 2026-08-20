import { boolAttr, define, patchText, randId } from '../core/dom';

/**
 * @summary Form wrapper that intercepts `submit` and re-fires it as `e-submit`.
 * @since v1.0.1
 *
 * @attr {'inline'} [layout] - Set to `inline` to render fields on one line.
 *
 * @fires {CustomEvent<{form: HTMLFormElement}>} e-submit - Fired when the inner form is submitted; the native submit is `preventDefault`-ed.
 *
 * @example
 * <e-form layout="inline">
 *   <e-form-item label="Name" required><e-input></e-input></e-form-item>
 *   <e-button variant="primary">Save</e-button>
 * </e-form>
 */
export class EForm extends HTMLElement {
  static readonly observedAttributes = ['layout'];

  private _form: HTMLFormElement | null = null;

  connectedCallback() {
    if (!this._form) {
      const form = document.createElement('form');
      form.className = 'ink-form';
      while (this.firstChild) form.appendChild(this.firstChild);
      this.appendChild(form);
      this._form = form;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('e-submit', { detail: { form }, bubbles: true }));
      });
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._form) this._render();
  }

  private _render(): void {
    if (!this._form) return;
    this._form.classList.toggle('ink-form--inline', this.getAttribute('layout') === 'inline');
  }
}
define('e-form', EForm);

/**
 * @summary Labeled wrapper for a single form control with hint and error states.
 *
 * @attr {string} [label] - Field label rendered above the control.
 * @attr {string} [hint] - Helper text rendered below the control. Hidden when `error` is set.
 * @attr {string} [error] - Error message rendered below the control. Mirrored onto an `e-input`/`e-textarea` as `error` + `error-message`, unless the control already carries an author-set `error`.
 * @attr {boolean} [required] - Marks the field as required: sets `required` on the inner control and renders the required pill. The pill lives inside the label, so with no `label` the semantics still reach the control but no pill is rendered.
 * @attr {string} [required-label='REQ'] - Text shown inside the required pill. Only visible while `label` is set.
 */
export class EFormItem extends HTMLElement {
  static readonly observedAttributes = ['label', 'hint', 'error', 'required', 'required-label'];

  private _root: HTMLElement | null = null;
  private _control: HTMLElement | null = null;
  private _labelEl: HTMLLabelElement | null = null;
  private _requiredPill: HTMLElement | null = null;
  private _hintEl: HTMLElement | null = null;
  private _errorEl: HTMLElement | null = null;
  private _resolvedControl: HTMLElement | null = null;
  private _requiredApplied = false;
  private _labelApplied = false;
  private _errorApplied = false;

  connectedCallback() {
    if (!this._root) {
      const controlWrap = document.createElement('div');
      controlWrap.dataset.control = '';
      while (this.firstChild) controlWrap.appendChild(this.firstChild);
      const root = document.createElement('div');
      root.className = 'ink-form-item';
      root.appendChild(controlWrap);
      this.appendChild(root);
      this._root = root;
      this._control = controlWrap;
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._root) this._render();
  }

  private _render(): void {
    const root = this._root!;
    const label = this.getAttribute('label');
    const hint = this.getAttribute('hint');
    const error = this.getAttribute('error');
    const required = boolAttr(this, 'required');

    // One sync method per slot. Inlining all four kept `_render` above the
    // cognitive-complexity budget while each block is independently simple.
    this._syncLabel(root, label, required);
    this._syncHint(root, hint, error);
    this._syncError(root, error);
    this._syncControlSemantics(label, required, error);
  }

  /** Create, update or drop the label element (and its required pill). */
  private _syncLabel(root: HTMLElement, label: string | null, required: boolean): void {
    if (!label) {
      this._labelEl?.remove();
      this._labelEl = null;
      this._requiredPill = null;
      return;
    }
    if (this._labelEl) {
      const txt = this._labelEl.firstChild;
      if (txt?.nodeType === Node.TEXT_NODE) patchText(txt, label);
    } else {
      this._labelEl = document.createElement('label');
      this._labelEl.className = 'ink-form-item__label';
      this._labelEl.appendChild(document.createTextNode(label));
      root.insertBefore(this._labelEl, this._control!);
    }
    this._syncRequiredPill(required);
  }

  /**
   * Keep the "REQ" pill inside an existing label in step with `required`.
   * The pill is a flex child of `.ink-form-item__label`; with no label there
   * is nothing to anchor it to, and a bare `<label for>` holding only the pill
   * would hand the control the accessible name "required". The `required`
   * semantics reach the control through `_syncControlSemantics` regardless.
   */
  private _syncRequiredPill(required: boolean): void {
    if (!required) {
      this._requiredPill?.remove();
      this._requiredPill = null;
      return;
    }
    const requiredLabel = this.getAttribute('required-label') || 'REQ';
    if (this._requiredPill) {
      patchText(this._requiredPill, requiredLabel);
      return;
    }
    const pill = document.createElement('span');
    pill.className = 'ink-form-item__required';
    pill.setAttribute('aria-label', 'required');
    pill.textContent = requiredLabel;
    this._labelEl!.appendChild(pill);
    this._requiredPill = pill;
  }

  /** The hint is suppressed while an error is showing. */
  private _syncHint(root: HTMLElement, hint: string | null, error: string | null): void {
    if (!hint || error) {
      this._hintEl?.remove();
      this._hintEl = null;
      return;
    }
    if (!this._hintEl) {
      this._hintEl = document.createElement('div');
      this._hintEl.className = 'ink-hint';
      root.appendChild(this._hintEl);
    }
    this._hintEl.textContent = hint;
  }

  private _syncError(root: HTMLElement, error: string | null): void {
    if (!error) {
      this._errorEl?.remove();
      this._errorEl = null;
      return;
    }
    if (!this._errorEl) {
      this._errorEl = document.createElement('div');
      this._errorEl.className = 'ink-error';
      root.appendChild(this._errorEl);
    }
    this._errorEl.textContent = `! ${error}`;
  }

  private _syncControlSemantics(
    label: string | null,
    required: boolean,
    error: string | null,
  ): void {
    const control =
      this._control?.querySelector<HTMLElement>(
        'e-input, e-textarea, e-select, e-checkbox, e-toggle, e-radio-group, e-checkbox-group, e-date-picker, e-time-picker, e-cascader, e-tree-select, e-input-number, e-upload',
      ) ?? null;
    // Ownership is tracked per control. A different control starts out unowned
    // so its author-set attributes are never claimed from the previous one.
    if (control !== this._resolvedControl) {
      this._resolvedControl = control;
      this._labelApplied = false;
      this._requiredApplied = false;
      this._errorApplied = false;
    }
    if (!control) return;
    if (!control.id) control.id = randId('e-field');
    if (this._labelEl) this._labelEl.htmlFor = control.id;

    if (label && (!control.hasAttribute('aria-label') || this._labelApplied)) {
      control.setAttribute('aria-label', label);
      this._labelApplied = true;
    } else if (!label && this._labelApplied) {
      control.removeAttribute('aria-label');
      this._labelApplied = false;
    }

    if (required && (!control.hasAttribute('required') || this._requiredApplied)) {
      control.setAttribute('required', '');
      this._requiredApplied = true;
    } else if (!required && this._requiredApplied) {
      control.removeAttribute('required');
      this._requiredApplied = false;
    }

    this._syncControlError(control, error);
  }

  /**
   * Mirror the error onto the controls that render one, claiming ownership the
   * same way `aria-label` and `required` do: an author-set `error` on the
   * control is left alone, and only what this component wrote is cleared.
   */
  private _syncControlError(control: HTMLElement, error: string | null): void {
    if (control.localName !== 'e-input' && control.localName !== 'e-textarea') return;
    if (error && (!control.hasAttribute('error') || this._errorApplied)) {
      control.setAttribute('error', '');
      control.setAttribute('error-message', error);
      this._errorApplied = true;
    } else if (!error && this._errorApplied) {
      control.removeAttribute('error');
      control.removeAttribute('error-message');
      this._errorApplied = false;
    }
  }
}
define('e-form-item', EFormItem);
