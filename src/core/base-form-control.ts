// Form-associated base for EPaper input components.
//
// Generic over the in-memory value type `T`. Subclasses must provide
// `serialize(v: T)` (the wire form passed to `ElementInternals.setFormValue`)
// and `parse(s: string)` (used by `formResetCallback` and
// `formStateRestoreCallback` to turn a string back into `T`).

export abstract class BaseFormControl<T = string> extends HTMLElement {
  static formAssociated = true;

  protected internals: ElementInternals;
  protected _value: T = '' as unknown as T;
  protected _formDisabled = false;

  constructor() {
    super();
    // attachInternals is supported in all evergreen browsers since 2022.
    this.internals = this.attachInternals();
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
      this.internals.setValidity({ customError: true }, customErrorMessage, control);
      if (control.getAttribute('aria-invalid') !== 'true')
        control.setAttribute('aria-invalid', 'true');
      return false;
    }

    const validity = control.validity;
    if (validity.valid) {
      this.internals.setValidity({});
      if (control.getAttribute('aria-invalid') === 'true') control.removeAttribute('aria-invalid');
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
    if (control.getAttribute('aria-invalid') !== 'true')
      control.setAttribute('aria-invalid', 'true');
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
      if (anchor?.getAttribute('aria-invalid') !== 'true') {
        anchor?.setAttribute('aria-invalid', 'true');
      }
      return false;
    }
    this.internals.setValidity({});
    if (anchor?.getAttribute('aria-invalid') === 'true') anchor.removeAttribute('aria-invalid');
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

  /** Default reset behaviour: parse `default-value` and assign. */
  formResetCallback(): void {
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
