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
  static observedAttributes = ['layout'];

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
 * @attr {string} [error] - Error message rendered below the control.
 * @attr {boolean} [required] - Marks the field as required and renders the required pill.
 * @attr {string} [required-label='REQ'] - Text shown inside the required pill.
 */
export class EFormItem extends HTMLElement {
  static observedAttributes = ['label', 'hint', 'error', 'required', 'required-label'];

  private _root: HTMLElement | null = null;
  private _control: HTMLElement | null = null;
  private _labelEl: HTMLLabelElement | null = null;
  private _requiredPill: HTMLElement | null = null;
  private _hintEl: HTMLElement | null = null;
  private _errorEl: HTMLElement | null = null;
  private _requiredApplied = false;
  private _labelApplied = false;

  connectedCallback() {
    if (!this._root) {
      const controlWrap = document.createElement('div');
      controlWrap.setAttribute('data-control', '');
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
    const control = this._control!;
    const label = this.getAttribute('label');
    const hint = this.getAttribute('hint');
    const error = this.getAttribute('error');
    const required = boolAttr(this, 'required');
    const requiredLabel = this.getAttribute('required-label') || 'REQ';

    if (label) {
      if (!this._labelEl) {
        this._labelEl = document.createElement('label');
        this._labelEl.className = 'ink-form-item__label';
        this._labelEl.appendChild(document.createTextNode(label));
        root.insertBefore(this._labelEl, control);
      } else {
        const txt = this._labelEl.firstChild;
        if (txt?.nodeType === Node.TEXT_NODE) patchText(txt, label);
      }
      if (required) {
        if (!this._requiredPill) {
          const pill = document.createElement('span');
          pill.className = 'ink-form-item__required';
          pill.setAttribute('aria-label', 'required');
          pill.textContent = requiredLabel;
          this._labelEl.appendChild(pill);
          this._requiredPill = pill;
        } else {
          patchText(this._requiredPill, requiredLabel);
        }
      } else if (this._requiredPill) {
        this._requiredPill.remove();
        this._requiredPill = null;
      }
    } else if (this._labelEl) {
      this._labelEl.remove();
      this._labelEl = null;
      this._requiredPill = null;
    }

    if (hint && !error) {
      if (!this._hintEl) {
        this._hintEl = document.createElement('div');
        this._hintEl.className = 'ink-hint';
        root.appendChild(this._hintEl);
      }
      this._hintEl.textContent = hint;
    } else if (this._hintEl) {
      this._hintEl.remove();
      this._hintEl = null;
    }

    if (error) {
      if (!this._errorEl) {
        this._errorEl = document.createElement('div');
        this._errorEl.className = 'ink-error';
        root.appendChild(this._errorEl);
      }
      this._errorEl.textContent = `! ${error}`;
    } else if (this._errorEl) {
      this._errorEl.remove();
      this._errorEl = null;
    }

    this._syncControlSemantics(label, required, error);
  }

  private _syncControlSemantics(
    label: string | null,
    required: boolean,
    error: string | null,
  ): void {
    const control = this._control?.querySelector<HTMLElement>(
      'e-input, e-textarea, e-select, e-checkbox, e-toggle, e-radio-group, e-checkbox-group, e-date-picker, e-time-picker, e-cascader, e-tree-select, e-input-number, e-upload',
    );
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

    if (error && (control.localName === 'e-input' || control.localName === 'e-textarea')) {
      control.setAttribute('error', '');
      control.setAttribute('error-message', error);
    } else if (control.localName === 'e-input' || control.localName === 'e-textarea') {
      control.removeAttribute('error');
      control.removeAttribute('error-message');
    }
  }
}
define('e-form-item', EFormItem);
