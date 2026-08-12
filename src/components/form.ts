import { boolAttr, define, patchText } from '../core/dom';

/**
 * @summary Form wrapper that intercepts `submit` and re-fires it as `e-submit`.
 *
 * @attr {'inline'} [layout] - Set to `inline` to render fields on one line.
 *
 * @fires {CustomEvent<{form: EventTarget}>} e-submit - Fired when the inner form is submitted; the native submit is `preventDefault`-ed.
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
        this.dispatchEvent(
          new CustomEvent('e-submit', { detail: { form: e.target }, bubbles: true }),
        );
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
  private _labelEl: HTMLElement | null = null;
  private _requiredPill: HTMLElement | null = null;
  private _hintEl: HTMLElement | null = null;
  private _errorEl: HTMLElement | null = null;

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

    if (label) {
      const input = control.querySelector('e-input');
      if (input && !input.getAttribute('label') && !input.getAttribute('aria-label')) {
        input.setAttribute('aria-label', label);
      }
    }
  }
}
define('e-form-item', EFormItem);
