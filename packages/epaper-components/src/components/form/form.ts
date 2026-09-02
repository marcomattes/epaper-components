import {
  boolAttr,
  define,
  EpaperElement,
  observeItems,
  patchText,
  randId,
  runCleanups,
} from '../../core/dom';
import { label as labelOf, t } from '../../core/i18n';

/**
 * @summary Form wrapper that intercepts `submit` and re-fires it as `e-submit`.
 * @since v1.0.1
 *
 * On a blocked submission the form also reports which controls failed and
 * moves focus to the first of them. Without that, a long form on a panel
 * leaves the user scrolling blind for an error they cannot see — the browser
 * refuses the submit and says nothing a custom control renders.
 *
 * @attr {'inline'} [layout] - Set to `inline` to render fields on one line.
 * @attr {boolean} [novalidate] - Skips constraint validation, as on a native `<form novalidate>`.
 * @attr {boolean} [no-autofocus] - Suppresses the focus move on a blocked submission. The browser still focuses a natively focusable control on its own.
 *
 * @fires {CustomEvent<{form: HTMLFormElement}>} e-submit - Fired when the inner form is submitted; the native submit is `preventDefault`-ed.
 * @fires {CustomEvent<{controls: HTMLElement[], form: HTMLFormElement}>} e-invalid - Fired once per blocked submission, listing the controls that failed constraint validation.
 *
 * @example
 * <e-form layout="inline">
 *   <e-form-item label="Name" required><e-input></e-input></e-form-item>
 *   <e-button variant="primary">Save</e-button>
 * </e-form>
 */
export class EForm extends EpaperElement {
  static readonly observedAttributes = ['layout', 'novalidate'];

  private _form: HTMLFormElement | null = null;
  private _invalid: HTMLElement[] = [];
  private _invalidQueued = false;

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
      // `invalid` fires on each failing control and does not bubble, so it is
      // caught in the capture phase instead. The browser blocks the submit
      // itself, which is why this cannot live in the submit handler above.
      form.addEventListener('invalid', (e) => this._onInvalid(e), true);
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._form) this._render();
  }

  /**
   * True when `el` sits inside another form-associated element — the native
   * `<input>` that `e-input` renders, for instance. The browser validates
   * both, so without this `e-invalid` would report each field twice: once as
   * the component and once as its own internals.
   */
  private _isInternal(el: HTMLElement): boolean {
    for (let parent = el.parentElement; parent && parent !== this; parent = parent.parentElement) {
      const ctor = customElements.get(parent.localName) as
        (CustomElementConstructor & { formAssociated?: boolean }) | undefined;
      if (ctor?.formAssociated) return true;
    }
    return false;
  }

  /**
   * Collect one validation pass. The browser fires `invalid` once per failing
   * control in the same task, so the batch is closed on a microtask and
   * reported as a single event rather than one per field.
   */
  private _onInvalid(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement) || this._isInternal(target)) return;
    this._invalid.push(target);
    if (this._invalidQueued) return;
    this._invalidQueued = true;
    queueMicrotask(() => {
      this._invalidQueued = false;
      const controls = this._invalid;
      this._invalid = [];
      if (controls.length === 0 || !this._form) return;
      for (const control of controls) {
        const item = control.closest('e-form-item');
        if (item instanceof EFormItem) item.showValidationMessage();
      }
      // The browser focuses the first invalid control itself when that control
      // is natively focusable, so this only steps in where it left focus
      // outside the form — a composite control whose validation anchor the
      // platform cannot focus. Fighting the browser for focus it already
      // placed would move the user somewhere they did not ask to go.
      if (!boolAttr(this, 'no-autofocus') && !this._form.contains(document.activeElement)) {
        EForm._focusControl(controls[0]);
      }
      this.dispatchEvent(
        new CustomEvent('e-invalid', {
          detail: { controls, form: this._form },
          bubbles: true,
        }),
      );
    });
  }

  /**
   * Move focus onto a blocked control.
   *
   * `HTMLElement.focus()` on the host is a no-op for a composite control:
   * `<e-rating>`, `<e-pin-input>`, `<e-keypad>`, `<e-signature>` and the two
   * groups take no tabindex of their own, so the promised "focus moves to the
   * first failing control" left the user on the submit button with no
   * indication of where the problem was. Falling back to the first focusable
   * element the control rendered puts the caret where the answer goes.
   */
  private static _focusControl(control: HTMLElement | undefined): void {
    if (!control) return;
    const before = control.ownerDocument.activeElement;
    control.focus();
    if (control.ownerDocument.activeElement !== before) return;
    const focusable = control.querySelector<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }

  private _render(): void {
    if (!this._form) return;
    this._form.classList.toggle('ink-form--inline', this.getAttribute('layout') === 'inline');
    this._form.noValidate = boolAttr(this, 'novalidate');
  }
}
define('e-form', EForm);

/**
 * @summary Labeled wrapper for a single form control with hint and error states.
 * @since v1.0.1
 *
 * @attr {string} [label] - Field label rendered above the control.
 * @attr {string} [hint] - Helper text rendered below the control. Hidden when `error` is set.
 * @attr {string} [error] - Error message rendered below the control. Mirrored onto an `e-input`/`e-textarea` as `error` + `error-message`, unless the control already carries an author-set `error`.
 * @attr {boolean} [required] - Marks the field as required: sets `required` on the inner control and renders the required pill. The pill lives inside the label, so with no `label` the semantics still reach the control but no pill is rendered.
 * @attr {string} [required-label='REQ'] - Text shown inside the required pill. Only visible while `label` is set.
 *
 * Hint and error text are linked to the control with `aria-describedby`, so a
 * screen-reader user hears them; previously they were rendered next to the
 * control but connected to nothing.
 *
 * @example
 * <e-form-item label="Email" required><e-input name="email"></e-input></e-form-item>
 */
export class EFormItem extends EpaperElement {
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
  private _describedByApplied = false;
  private _validationError: string | null = null;

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
      // A value change is the user's answer to the error, so drop a message
      // taken from the control's validity once it is satisfied. Listening on
      // `this` keeps the listener collected with the element — no `onGlobal`.
      this.addEventListener('change', () => {
        if (this._validationError === null) return;
        const control = this._resolvedControl as
          (HTMLElement & { checkValidity?(): boolean }) | null;
        if (control?.checkValidity?.() !== false) {
          this._validationError = null;
          this._render();
        }
      });
    }
    // Children can arrive after the wrap: a parser-inserted control when the
    // element upgrades early, or a host that builds the item first and appends
    // the control afterwards. Reading them once at connect left those outside
    // `[data-control]`, where nothing finds them — no label, no `required`, no
    // error. Adopting them keeps the item honest about what it wraps.
    observeItems(this, this._adopt, { isOutput: (n) => this._root?.contains(n) ?? false });
    this._render();
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  /** Move any host child that is not the rendered root into the control slot. */
  private readonly _adopt = (): void => {
    const root = this._root;
    const control = this._control;
    if (!root || !control) return;
    let moved = false;
    for (const node of [...this.childNodes]) {
      if (node === root) continue;
      control.appendChild(node);
      moved = true;
    }
    if (moved) this._render();
  };

  attributeChangedCallback() {
    if (this._root) this._render();
  }

  /**
   * Surface the control's own constraint message as this field's error.
   * Called by `e-form` when a submission is blocked, so a composite control
   * that renders no message of its own still shows why it was rejected. An
   * author-set `error` always wins.
   */
  showValidationMessage(): void {
    const control = this._resolvedControl as (HTMLElement & { validationMessage?: string }) | null;
    const message = control?.validationMessage;
    if (!message) return;
    this._validationError = message;
    this._render();
  }

  private _render(): void {
    const root = this._root!;
    const label = this.getAttribute('label');
    const hint = this.getAttribute('hint');
    const error = this.getAttribute('error') ?? this._validationError;
    const required = boolAttr(this, 'required');

    // One sync method per slot. Inlining all four kept `_render` above the
    // cognitive-complexity budget while each block is independently simple.
    this._syncLabel(root, label, required);
    this._syncHint(root, hint, error);
    this._syncError(root, error);
    this._syncControlSemantics(label, required);
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
    const requiredLabel = labelOf(this, 'required-label', 'requiredShort');
    if (this._requiredPill) {
      patchText(this._requiredPill, requiredLabel);
      return;
    }
    const pill = document.createElement('span');
    pill.className = 'ink-form-item__required';
    pill.setAttribute('aria-label', t(this, 'requiredMarker'));
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
      this._hintEl.id = randId('e-hint');
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
      this._errorEl.id = randId('e-error');
      root.appendChild(this._errorEl);
    }
    this._errorEl.textContent = `! ${error}`;
  }

  /**
   * The form control this item wraps.
   *
   * Resolved by asking the registry which custom element is form-associated,
   * rather than by matching a list of tag names. The hand-kept list went stale
   * the moment `e-rating`, `e-slider`, `e-pin-input`, `e-signature` and
   * `e-keypad` shipped: an item wrapping one of them propagated no label, no
   * `required` and no `aria-describedby`, and rendered no message when a
   * submit was blocked.
   *
   * A custom element the registry does not know yet is taken as a fallback,
   * since that is what a control whose module has not loaded looks like. Plain
   * HTML controls are deliberately left alone — a native `<input>` carries its
   * own labelling, and this item has never managed one.
   */
  private _findControl(): HTMLElement | null {
    const scope = this._control;
    if (!scope) return null;
    let pending: HTMLElement | null = null;
    for (const el of scope.querySelectorAll<HTMLElement>('*')) {
      if (!el.localName.includes('-')) continue;
      const ctor = customElements.get(el.localName) as
        (CustomElementConstructor & { formAssociated?: boolean }) | undefined;
      if (ctor?.formAssociated) return el;
      if (!ctor) pending ??= el;
    }
    return pending;
  }

  private _syncControlSemantics(label: string | null, required: boolean): void {
    const control = this._findControl();
    // Ownership is tracked per control. A different control starts out unowned
    // so its author-set attributes are never claimed from the previous one.
    if (control !== this._resolvedControl) {
      this._resolvedControl = control;
      this._labelApplied = false;
      this._requiredApplied = false;
      this._errorApplied = false;
      this._describedByApplied = false;
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

    this._syncDescribedBy(control);
    // Only an author-set `error` is mirrored back onto the control. A message
    // taken from the control's own validity must not be: it would land as a
    // customError that outlives the violation it describes, so the field could
    // never report itself valid again once the user fixed it.
    this._syncControlError(control, this.getAttribute('error'));
  }

  /**
   * Point the control at whichever of hint/error is currently rendered.
   * Ownership is tracked like the other mirrored attributes, so an
   * author-set `aria-describedby` is never overwritten or cleared.
   */
  private _syncDescribedBy(control: HTMLElement): void {
    const ids = [this._hintEl?.id, this._errorEl?.id].filter((id): id is string => !!id);
    if (ids.length > 0 && (!control.hasAttribute('aria-describedby') || this._describedByApplied)) {
      control.setAttribute('aria-describedby', ids.join(' '));
      this._describedByApplied = true;
    } else if (ids.length === 0 && this._describedByApplied) {
      control.removeAttribute('aria-describedby');
      this._describedByApplied = false;
    }
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
