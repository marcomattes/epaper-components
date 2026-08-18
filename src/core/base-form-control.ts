// Form-associated base for EPaper input components.
//
// Generic over the in-memory value type `T`. Subclasses must provide
// `serialize(v: T)` (the wire form passed to `ElementInternals.setFormValue`)
// and `parse(s: string)` (used by `formResetCallback` and
// `formStateRestoreCallback` to turn a string back into `T`).

export abstract class BaseFormControl<T = string> extends HTMLElement {
  static readonly formAssociated = true;

  protected internals: ElementInternals;
  protected _value: T = '' as unknown as T;
  protected _formDisabled = false;

  // Constraint violations are reported to the form immediately but are not
  // *shown* until the user has had a chance to satisfy them. Without this an
  // untouched `<e-input required>` renders `aria-invalid="true"` on first
  // paint: screen readers announce an error before any interaction, and
  // `.ink-control:focus-visible:not([aria-invalid='true'])` stops matching, so
  // the focus ring disappears from exactly the fields that need it. Explicit
  // author errors (`error` / `error-message`) are unaffected — those are a
  // deliberate statement by the page, not a guess about user intent.
  private _validationSurfaced = false;
  private _pendingAnchor: HTMLElement | null = null;

  constructor() {
    super();
    // attachInternals is supported in all evergreen browsers since 2022.
    this.internals = this.attachInternals();
    // `change`, `focusout` and `invalid` all reach the host: the first two
    // bubble out of whatever native control the subclass renders, and the
    // third is dispatched on this element by ElementInternals during
    // `checkValidity()` and form submission. One listener per host therefore
    // covers every subclass. These are listeners on `this`, not on `document`,
    // so they are collected with the element and need no `onGlobal` teardown.
    const surface = (): void => this._surfaceValidation();
    this.addEventListener('change', surface);
    this.addEventListener('focusout', surface);
    this.addEventListener('invalid', surface);
  }

  /** Allow constraint violations to be shown, and paint any pending one. */
  private _surfaceValidation(): void {
    if (this._validationSurfaced) return;
    this._validationSurfaced = true;
    this._paintInvalid(this._pendingAnchor);
  }

  private _paintInvalid(anchor: HTMLElement | null): void {
    if (anchor && anchor.getAttribute('aria-invalid') !== 'true') {
      anchor.setAttribute('aria-invalid', 'true');
    }
  }

  private _clearInvalid(anchor: HTMLElement | null): void {
    if (anchor?.getAttribute('aria-invalid') === 'true') anchor.removeAttribute('aria-invalid');
  }

  /**
   * Record a constraint violation on `anchor`, showing it only once validation
   * has been surfaced. Held state lets a later blur or submit paint it.
   */
  private _markInvalid(anchor: HTMLElement | null | undefined): void {
    this._pendingAnchor = anchor ?? null;
    if (!anchor) return;
    if (this._validationSurfaced) this._paintInvalid(anchor);
    else this._clearInvalid(anchor);
  }

  private _markValid(anchor: HTMLElement | null | undefined): void {
    this._pendingAnchor = null;
    this._clearInvalid(anchor ?? null);
  }

  /** Convert the in-memory value to the form-submission representation. */
  protected abstract serialize(v: T): string | FormData | File | null;
  /** Inverse of `serialize` for the string case (reset / state restore). */
  protected abstract parse(s: string): T;

  /** Form-control name. Mirrors the `name` attribute. */
  get name(): string {
    return this.getAttribute('name') ?? '';
  }
  set name(v: string) {
    this.setAttribute('name', v);
  }

  /** Form-control value. Persisted to ElementInternals via `serialize`. */
  get value(): T {
    return this._value;
  }
  set value(v: T) {
    this._value = v;
    this.internals.setFormValue(this.serialize(v));
  }

  /** The form this control is associated with, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  get validity(): ValidityState {
    return this.internals.validity;
  }
  get validationMessage(): string {
    return this.internals.validationMessage;
  }
  get willValidate(): boolean {
    return this.internals.willValidate;
  }
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }
  reportValidity(): boolean {
    // Asking for the violation to be reported is itself a request to show it.
    this._surfaceValidation();
    return this.internals.reportValidity();
  }

  /**
   * Mirror a native inner control's constraint state onto the custom element.
   * The inner control remains the validation anchor, so the browser can place
   * its native validation UI next to the actual focus target.
   */
  protected mirrorNativeValidity(
    control: HTMLInputElement | HTMLTextAreaElement,
    customErrorMessage?: string,
  ): boolean {
    if (customErrorMessage) {
      // An author-set error is always shown: the page has already decided.
      this.internals.setValidity({ customError: true }, customErrorMessage, control);
      this._pendingAnchor = null;
      this._paintInvalid(control);
      return false;
    }

    const validity = control.validity;
    if (validity.valid) {
      this.internals.setValidity({});
      this._markValid(control);
      return true;
    }

    const flags: ValidityStateFlags = {};
    if (validity.badInput) flags.badInput = true;
    if (validity.customError) flags.customError = true;
    if (validity.patternMismatch) flags.patternMismatch = true;
    if (validity.rangeOverflow) flags.rangeOverflow = true;
    if (validity.rangeUnderflow) flags.rangeUnderflow = true;
    if (validity.stepMismatch) flags.stepMismatch = true;
    if (validity.tooLong) flags.tooLong = true;
    if (validity.tooShort) flags.tooShort = true;
    if (validity.typeMismatch) flags.typeMismatch = true;
    if (validity.valueMissing) flags.valueMissing = true;
    this.internals.setValidity(flags, control.validationMessage, control);
    this._markInvalid(control);
    return false;
  }

  /** Apply the shared `required` contract for non-native composite controls. */
  protected applyRequiredValidity(
    hasValue: boolean,
    anchor?: HTMLElement,
    defaultMessage = 'Please fill out this field.',
  ): boolean {
    const missing = this.hasAttribute('required') && !hasValue;
    if (missing) {
      const message = this.getAttribute('required-message') || defaultMessage;
      this.internals.setValidity({ valueMissing: true }, message, anchor);
      this._markInvalid(anchor);
      return false;
    }
    this.internals.setValidity({});
    this._markValid(anchor);
    return true;
  }

  /** Keep subclass UI in sync when a containing fieldset disables the control. */
  formDisabledCallback(disabled: boolean): void {
    this._formDisabled = disabled;
    this.formDisabledChanged(disabled);
  }

  protected formDisabledChanged(_disabled: boolean): void {
    // Optional subclass hook for forwarding the state to its focusable control.
  }

  /**
   * Form-reset entry point. Not overridden by subclasses — it clears the
   * surfaced-validation flag first so a reset returns the control to
   * "untouched" (matching first-paint behaviour) before `resetValue()` runs
   * and re-derives validity from the restored value. Subclasses implement
   * `resetValue()` instead.
   */
  formResetCallback(): void {
    this._validationSurfaced = false;
    this._pendingAnchor = null;
    this.resetValue();
  }

  /** Default reset behaviour: parse `default-value` and assign. */
  protected resetValue(): void {
    const dflt = this.getAttribute('default-value') ?? '';
    this.value = this.parse(dflt);
  }

  /**
   * Optional hook for subclasses whose `serialize()` returns `FormData`
   * (multi-value controls such as `<e-checkbox-group>` or `<e-upload>`).
   * Default throws to surface unimplemented BFCache restore paths.
   */
  protected parseFormData(_fd: FormData): T {
    throw new Error(
      `${this.constructor.name}: parseFormData() not implemented for FormData restore.`,
    );
  }

  /**
   * Optional hook for subclasses whose `serialize()` returns `File`
   * (e.g. single-file `<e-upload>`). Default throws.
   */
  protected parseFile(_file: File): T {
    throw new Error(`${this.constructor.name}: parseFile() not implemented for File restore.`);
  }

  /** Restore from autofill / back-forward cache. */
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (state == null) return;
    if (typeof state === 'string') this.value = this.parse(state);
    else if (state instanceof FormData) this.value = this.parseFormData(state);
    else if (state instanceof File) this.value = this.parseFile(state);
  }
}
