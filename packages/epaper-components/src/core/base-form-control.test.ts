// Unit tests for the form-associated base class, driven through throwaway
// subclasses registered under `x-bfc-*` tags. This covers the paths no
// shipped component reaches: the FormData/File restore hooks and their
// default throws, every `ValidityState` flag being forwarded, and the
// deferred-validation contract that keeps `aria-invalid` off an untouched
// `required` control, plus the `required="false"` reading shared by every
// composite control.
//
// `useDefineForClassFields: false` is on, so subclasses declare instance
// state without an initializer and assign it in the constructor after
// `super()`.
import { describe, it, expect, beforeAll } from 'vitest';
import { BaseFormControl } from './base-form-control';
import { t } from './i18n';

/* --------------------------------------------------------------------- *
 * Throwaway subclasses
 * --------------------------------------------------------------------- */

/** Plain string control with no extra hooks — the FormData/File defaults throw. */
class PlainControl extends BaseFormControl<string> {
  protected serialize(v: string): string {
    return v;
  }
  protected parse(s: string): string {
    return s;
  }
  /** Test seam for the protected reset path. */
  callResetValue(): void {
    this.resetValue();
  }
}

/** Records reset calls and prefixes parsed values so the parse path is visible. */
class ResetControl extends BaseFormControl<string> {
  resets!: number;

  constructor() {
    super();
    this.resets = 0;
  }

  protected serialize(v: string): string {
    return v;
  }
  protected parse(s: string): string {
    return `parsed:${s}`;
  }
  protected override resetValue(): void {
    this.resets += 1;
    super.resetValue();
  }
}

/** Multi-value control whose `serialize` returns FormData. */
class MultiControl extends BaseFormControl<string[]> {
  constructor() {
    super();
    this.value = [];
  }

  protected serialize(v: string[]): FormData {
    const fd = new FormData();
    for (const s of v) fd.append(this.name || 'unnamed', s);
    return fd;
  }
  protected parse(s: string): string[] {
    return s === '' ? [] : s.split(',');
  }
  protected override parseFormData(fd: FormData): string[] {
    return [...fd.values()].map((v) => String(v));
  }
}

/** Single-file control whose `serialize` returns a File. */
class FileControl extends BaseFormControl<File | null> {
  constructor() {
    super();
    this.value = null;
  }

  protected serialize(v: File | null): File | null {
    return v;
  }
  protected parse(s: string): File | null {
    return s === '' ? null : new File(['body'], s, { type: 'text/plain' });
  }
  protected override parseFile(file: File): File | null {
    return file;
  }
}

/** Composite control using the shared `required` contract against an anchor. */
class RequiredControl extends BaseFormControl<string> {
  anchor!: HTMLElement;

  constructor() {
    super();
    this.anchor = document.createElement('div');
    this.anchor.className = 'ink-control';
    this.anchor.tabIndex = 0;
  }

  connectedCallback(): void {
    if (!this.anchor.isConnected) this.appendChild(this.anchor);
    this.sync();
  }

  /** Re-derives validity from the current value. */
  sync(message?: string): boolean {
    return message === undefined
      ? this.applyRequiredValidity(this.value !== '', this.anchor)
      : this.applyRequiredValidity(this.value !== '', this.anchor, message);
  }

  /** Same contract, but with no anchor element at all. */
  syncAnchorless(): boolean {
    return this.applyRequiredValidity(this.value !== '');
  }

  protected override resetValue(): void {
    super.resetValue();
    this.sync();
  }

  protected serialize(v: string): string {
    return v;
  }
  protected parse(s: string): string {
    return s;
  }
}

/** Wraps a real `<input>` so `mirrorNativeValidity` can be driven end to end. */
class NativeControl extends BaseFormControl<string> {
  control!: HTMLInputElement;

  constructor() {
    super();
    this.control = document.createElement('input');
  }

  connectedCallback(): void {
    if (!this.control.isConnected) this.appendChild(this.control);
  }

  mirror(customErrorMessage?: string): boolean {
    return customErrorMessage === undefined
      ? this.mirrorNativeValidity(this.control)
      : this.mirrorNativeValidity(this.control, customErrorMessage);
  }

  protected serialize(v: string): string {
    return v;
  }
  protected parse(s: string): string {
    return s;
  }
}

/** Records `formDisabledChanged` deliveries. */
class DisableControl extends BaseFormControl<string> {
  seen!: boolean[];

  constructor() {
    super();
    this.seen = [];
  }

  get isFormDisabled(): boolean {
    return this._formDisabled;
  }

  protected override formDisabledChanged(disabled: boolean): void {
    this.seen.push(disabled);
  }

  protected serialize(v: string): string {
    return v;
  }
  protected parse(s: string): string {
    return s;
  }
}

beforeAll(() => {
  customElements.define('x-bfc-plain', PlainControl);
  customElements.define('x-bfc-reset', ResetControl);
  customElements.define('x-bfc-multi', MultiControl);
  customElements.define('x-bfc-file', FileControl);
  customElements.define('x-bfc-required', RequiredControl);
  customElements.define('x-bfc-native', NativeControl);
  customElements.define('x-bfc-disable', DisableControl);
});

/* --------------------------------------------------------------------- *
 * Helpers
 * --------------------------------------------------------------------- */

const forms: HTMLFormElement[] = [];

/** Mount `el` inside a fresh `<form>` attached to the document. */
function inForm<T extends HTMLElement>(el: T, name?: string): { el: T; form: HTMLFormElement } {
  const form = document.createElement('form');
  if (name !== undefined) el.setAttribute('name', name);
  form.appendChild(el);
  document.body.appendChild(form);
  forms.push(form);
  return { el, form };
}

const make = <T extends HTMLElement>(tag: string): T => document.createElement(tag) as T;

/**
 * Replace a real input's `validity`/`validationMessage` so a flag that cannot
 * be produced programmatically (`tooLong`, `tooShort`, `badInput`) can still be
 * pushed through `mirrorNativeValidity`.
 */
function stubValidity(
  input: HTMLInputElement,
  over: Partial<Record<keyof ValidityState, boolean>>,
  message = 'stubbed message',
): void {
  const base: Record<keyof ValidityState, boolean> = {
    badInput: false,
    customError: false,
    patternMismatch: false,
    rangeOverflow: false,
    rangeUnderflow: false,
    stepMismatch: false,
    tooLong: false,
    tooShort: false,
    typeMismatch: false,
    valid: false,
    valueMissing: false,
  };
  Object.defineProperty(input, 'validity', {
    value: { ...base, ...over } as unknown as ValidityState,
    configurable: true,
  });
  Object.defineProperty(input, 'validationMessage', { value: message, configurable: true });
}

/* --------------------------------------------------------------------- *
 * Tests
 * --------------------------------------------------------------------- */

describe('formAssociated contract', () => {
  it('declares itself form-associated', () => {
    expect(BaseFormControl.formAssociated).toBe(true);
  });
});

describe('value round-trip', () => {
  it('round-trips through the getter/setter', () => {
    const el = make<PlainControl>('x-bfc-plain');
    expect(el.value).toBe('');
    el.value = 'hello';
    expect(el.value).toBe('hello');
  });

  it('passes the serialized string to setFormValue', () => {
    const { el, form } = inForm(make<PlainControl>('x-bfc-plain'), 'a');
    el.value = 'hello';
    expect(new FormData(form).get('a')).toBe('hello');
    el.value = 'bye';
    expect(new FormData(form).get('a')).toBe('bye');
  });

  it('submits every entry when serialize returns FormData', () => {
    const { el, form } = inForm(make<MultiControl>('x-bfc-multi'), 'm');
    el.value = ['x', 'y', 'z'];
    expect(new FormData(form).getAll('m')).toEqual(['x', 'y', 'z']);
    expect(el.value).toEqual(['x', 'y', 'z']);
  });

  it('submits a File when serialize returns one', () => {
    const { el, form } = inForm(make<FileControl>('x-bfc-file'), 'f');
    const file = new File(['data'], 'note.txt', { type: 'text/plain' });
    el.value = file;
    const sent = new FormData(form).get('f');
    expect(sent).toBeInstanceOf(File);
    expect((sent as File).name).toBe('note.txt');
  });

  it('omits the entry when serialize returns null', () => {
    const { el, form } = inForm(make<FileControl>('x-bfc-file'), 'f');
    el.value = null;
    expect(new FormData(form).get('f')).toBeNull();
  });
});

describe('name', () => {
  it('reads the attribute and defaults to the empty string', () => {
    const el = make<PlainControl>('x-bfc-plain');
    expect(el.name).toBe('');
    el.setAttribute('name', 'from-attr');
    expect(el.name).toBe('from-attr');
  });

  it('writes the attribute from the setter', () => {
    const el = make<PlainControl>('x-bfc-plain');
    el.name = 'from-prop';
    expect(el.getAttribute('name')).toBe('from-prop');
    expect(el.name).toBe('from-prop');
  });
});

describe('form / validity surface', () => {
  it('form is null outside a form and the owning form inside one', () => {
    const loose = make<PlainControl>('x-bfc-plain');
    document.body.appendChild(loose);
    expect(loose.form).toBeNull();
    loose.remove();

    const { el, form } = inForm(make<PlainControl>('x-bfc-plain'), 'a');
    expect(el.form).toBe(form);
  });

  it('exposes validity, validationMessage, willValidate and checkValidity', () => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', '');
    el.sync();

    expect(el.validity.valueMissing).toBe(true);
    expect(el.validity.valid).toBe(false);
    expect(el.validationMessage).toBe('Please fill out this field.');
    expect(el.willValidate).toBe(true);
    expect(el.checkValidity()).toBe(false);

    el.value = 'filled';
    el.sync();
    expect(el.validity.valid).toBe(true);
    expect(el.validationMessage).toBe('');
    expect(el.checkValidity()).toBe(true);
  });

  it('reportValidity mirrors checkValidity', () => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', '');
    el.sync();
    expect(el.reportValidity()).toBe(false);
    el.value = 'ok';
    el.sync();
    expect(el.reportValidity()).toBe(true);
  });

  it('is barred from validation while disabled', () => {
    const { el } = inForm(make<PlainControl>('x-bfc-plain'), 'a');
    expect(el.willValidate).toBe(true);
    el.setAttribute('disabled', '');
    expect(el.willValidate).toBe(false);
    el.removeAttribute('disabled');
    expect(el.willValidate).toBe(true);
  });
});

describe('deferred validation', () => {
  const mountRequired = (): RequiredControl => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', '');
    el.sync();
    return el;
  };

  it('does not paint aria-invalid on first paint', () => {
    const el = mountRequired();
    // The violation is real and reported to the form...
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Please fill out this field.');
    // ...but nothing is shown until the user has had a chance to satisfy it.
    expect(el.anchor.hasAttribute('aria-invalid')).toBe(false);
  });

  it('paints after a change event', () => {
    const el = mountRequired();
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.anchor.getAttribute('aria-invalid')).toBe('true');
  });

  it('paints after a focusout event', () => {
    const el = mountRequired();
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(el.anchor.getAttribute('aria-invalid')).toBe('true');
  });

  it('paints after an invalid event raised by checkValidity()', () => {
    const el = mountRequired();
    expect(el.anchor.hasAttribute('aria-invalid')).toBe(false);
    expect(el.checkValidity()).toBe(false);
    expect(el.anchor.getAttribute('aria-invalid')).toBe('true');
  });

  it('paints after reportValidity()', () => {
    const el = mountRequired();
    expect(el.reportValidity()).toBe(false);
    expect(el.anchor.getAttribute('aria-invalid')).toBe('true');
  });

  it('paints a violation raised after surfacing, without another event', () => {
    const el = mountRequired();
    el.value = 'ok';
    el.sync();
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.anchor.hasAttribute('aria-invalid')).toBe(false);

    el.value = '';
    el.sync();
    expect(el.anchor.getAttribute('aria-invalid')).toBe('true');
  });

  it('surfaces only once', () => {
    const el = mountRequired();
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.anchor.getAttribute('aria-invalid')).toBe('true');

    // A second surfacing attempt must return early rather than repaint.
    el.anchor.removeAttribute('aria-invalid');
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    el.reportValidity();
    expect(el.anchor.hasAttribute('aria-invalid')).toBe(false);
  });

  it('clears aria-invalid once the control becomes valid', () => {
    const el = mountRequired();
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.anchor.getAttribute('aria-invalid')).toBe('true');
    el.value = 'now filled';
    el.sync();
    expect(el.anchor.hasAttribute('aria-invalid')).toBe(false);
  });

  it('never paints anything when the control has no anchor', () => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', '');
    expect(el.syncAnchorless()).toBe(false);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.anchor.hasAttribute('aria-invalid')).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
  });
});

describe('mirrorNativeValidity', () => {
  const mountNative = (): NativeControl => {
    const { el } = inForm(make<NativeControl>('x-bfc-native'), 'n');
    return el;
  };

  it('clears validity on the valid path', () => {
    const el = mountNative();
    el.control.value = 'anything';
    expect(el.mirror()).toBe(true);
    expect(el.validity.valid).toBe(true);
    expect(el.validationMessage).toBe('');
    expect(el.control.hasAttribute('aria-invalid')).toBe(false);
  });

  it('clears a previously painted aria-invalid when it turns valid', () => {
    const el = mountNative();
    el.control.required = true;
    el.mirror();
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.control.getAttribute('aria-invalid')).toBe('true');

    el.control.value = 'now filled';
    expect(el.mirror()).toBe(true);
    expect(el.control.hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows an author customErrorMessage immediately, before any interaction', () => {
    const el = mountNative();
    el.control.value = 'fine';
    expect(el.mirror('Author says no')).toBe(false);
    expect(el.validity.customError).toBe(true);
    expect(el.validationMessage).toBe('Author says no');
    expect(el.control.getAttribute('aria-invalid')).toBe('true');
  });

  it('holds a native violation back until validation is surfaced', () => {
    const el = mountNative();
    el.control.required = true;
    expect(el.mirror()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.control.hasAttribute('aria-invalid')).toBe(false);

    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.control.getAttribute('aria-invalid')).toBe('true');
  });

  it('forwards valueMissing from a real required input', () => {
    const el = mountNative();
    el.control.required = true;
    el.control.value = '';
    expect(el.mirror()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe(el.control.validationMessage);
  });

  it('forwards typeMismatch from a real email input', () => {
    const el = mountNative();
    el.control.type = 'email';
    el.control.value = 'not-an-email';
    expect(el.mirror()).toBe(false);
    expect(el.validity.typeMismatch).toBe(true);
  });

  it('forwards patternMismatch from a real pattern', () => {
    const el = mountNative();
    el.control.pattern = '\\d+';
    el.control.value = 'abc';
    expect(el.mirror()).toBe(false);
    expect(el.validity.patternMismatch).toBe(true);
  });

  it('forwards rangeUnderflow, rangeOverflow and stepMismatch from a number input', () => {
    const under = mountNative();
    under.control.type = 'number';
    under.control.min = '5';
    under.control.value = '1';
    expect(under.mirror()).toBe(false);
    expect(under.validity.rangeUnderflow).toBe(true);

    const over = mountNative();
    over.control.type = 'number';
    over.control.max = '5';
    over.control.value = '9';
    expect(over.mirror()).toBe(false);
    expect(over.validity.rangeOverflow).toBe(true);

    const step = mountNative();
    step.control.type = 'number';
    step.control.step = '2';
    step.control.min = '0';
    step.control.value = '3';
    expect(step.mirror()).toBe(false);
    expect(step.validity.stepMismatch).toBe(true);
  });

  it('forwards customError set on the inner control', () => {
    const el = mountNative();
    el.control.setCustomValidity('inner says no');
    expect(el.mirror()).toBe(false);
    expect(el.validity.customError).toBe(true);
    expect(el.validationMessage).toBe('inner says no');
  });

  it.each([
    ['badInput'],
    ['tooLong'],
    ['tooShort'],
    ['patternMismatch'],
    ['rangeOverflow'],
    ['rangeUnderflow'],
    ['stepMismatch'],
    ['typeMismatch'],
    ['valueMissing'],
    ['customError'],
  ] as const)('forwards the %s flag individually', (flag) => {
    const el = mountNative();
    stubValidity(el.control, { [flag]: true }, `message for ${flag}`);
    expect(el.mirror()).toBe(false);

    const mirrored = el.validity;
    expect(mirrored[flag]).toBe(true);
    expect(mirrored.valid).toBe(false);
    expect(el.validationMessage).toBe(`message for ${flag}`);

    // Only the one flag is forwarded.
    const others = (['badInput', 'tooLong', 'tooShort', 'typeMismatch', 'valueMissing'] as const)
      .filter((f) => f !== flag)
      .map((f) => mirrored[f]);
    expect(others.every((v) => v === false)).toBe(true);
  });

  it('forwards several flags at once', () => {
    const el = mountNative();
    stubValidity(el.control, { tooShort: true, patternMismatch: true }, 'two problems');
    expect(el.mirror()).toBe(false);
    expect(el.validity.tooShort).toBe(true);
    expect(el.validity.patternMismatch).toBe(true);
    expect(el.validity.badInput).toBe(false);
  });
});

describe('applyRequiredValidity', () => {
  it('reports valueMissing with the default message when required and empty', () => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', '');
    expect(el.sync()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Please fill out this field.');
  });

  it('is satisfied when a value is present', () => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', '');
    el.value = 'x';
    expect(el.sync()).toBe(true);
    expect(el.validity.valid).toBe(true);
    expect(el.validationMessage).toBe('');
  });

  it('is satisfied when the control is not required at all', () => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    expect(el.sync()).toBe(true);
    expect(el.validity.valid).toBe(true);
  });

  it('reads required with the library boolean convention, so "false" is false', () => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', 'false');
    expect(el.sync()).toBe(true);
    expect(el.validity.valueMissing).toBe(false);
    expect(el.validity.valid).toBe(true);
    expect(el.anchor.hasAttribute('aria-invalid')).toBe(false);

    // Any other value, including the empty string, is required.
    el.setAttribute('required', 'required');
    expect(el.sync()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
  });

  it('honours the required-message attribute override', () => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', '');
    el.setAttribute('required-message', 'Pick something.');
    expect(el.sync()).toBe(false);
    expect(el.validationMessage).toBe('Pick something.');
  });

  it('falls back to the caller message when required-message is empty', () => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', '');
    el.setAttribute('required-message', '');
    expect(el.sync('Please select a date.')).toBe(false);
    expect(el.validationMessage).toBe('Please select a date.');
  });

  it('accepts a caller-supplied message', () => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', '');
    expect(el.sync('Please select an option.')).toBe(false);
    expect(el.validationMessage).toBe('Please select an option.');
  });

  // Callers pass `t(this, key)` rather than a literal, so the reported message
  // follows the element's locale even though this module never reads it.
  it('reports the locale-resolved message a caller passes in', () => {
    const { el } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', '');
    el.setAttribute('locale', 'de');
    expect(el.sync(t(el, 'requiredDate'))).toBe(false);
    expect(el.validationMessage).toBe('Bitte wählen Sie ein Datum.');
  });
});

describe('formResetCallback', () => {
  it('calls resetValue, which parses default-value', () => {
    const { el, form } = inForm(make<ResetControl>('x-bfc-reset'), 'r');
    el.setAttribute('default-value', 'abc');
    el.value = 'typed';
    form.reset();
    expect(el.resets).toBe(1);
    expect(el.value).toBe('parsed:abc');
    expect(new FormData(form).get('r')).toBe('parsed:abc');
  });

  it('parses the empty string when default-value is absent', () => {
    const { el, form } = inForm(make<ResetControl>('x-bfc-reset'), 'r');
    el.value = 'typed';
    form.reset();
    expect(el.value).toBe('parsed:');
  });

  it('default resetValue reads default-value directly', () => {
    const el = make<PlainControl>('x-bfc-plain');
    el.setAttribute('default-value', 'seed');
    el.callResetValue();
    expect(el.value).toBe('seed');
  });

  it('clears the surfaced-validation flag so the control is untouched again', () => {
    const { el, form } = inForm(make<RequiredControl>('x-bfc-required'), 'r');
    el.setAttribute('required', '');
    el.sync();
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.anchor.getAttribute('aria-invalid')).toBe('true');

    form.reset();
    expect(el.value).toBe('');
    expect(el.anchor.hasAttribute('aria-invalid')).toBe(false);
    expect(el.validity.valueMissing).toBe(true);

    // And it can be surfaced again by a fresh interaction.
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.anchor.getAttribute('aria-invalid')).toBe('true');
  });
});

describe('formDisabledCallback', () => {
  it('stores the flag and calls the subclass hook when invoked directly', () => {
    const el = make<DisableControl>('x-bfc-disable');
    expect(el.isFormDisabled).toBe(false);
    el.formDisabledCallback(true);
    expect(el.isFormDisabled).toBe(true);
    expect(el.seen).toEqual([true]);
    el.formDisabledCallback(false);
    expect(el.isFormDisabled).toBe(false);
    expect(el.seen).toEqual([true, false]);
  });

  it('fires when inserted into an already-disabled fieldset', () => {
    const form = document.createElement('form');
    const fieldset = document.createElement('fieldset');
    fieldset.disabled = true;
    form.appendChild(fieldset);
    document.body.appendChild(form);
    forms.push(form);

    const el = make<DisableControl>('x-bfc-disable');
    fieldset.appendChild(el);
    expect(el.seen).toEqual([true]);
    expect(el.isFormDisabled).toBe(true);
  });

  it('fires when a surrounding fieldset toggles disabled', () => {
    const form = document.createElement('form');
    const fieldset = document.createElement('fieldset');
    const el = make<DisableControl>('x-bfc-disable');
    fieldset.appendChild(el);
    form.appendChild(fieldset);
    document.body.appendChild(form);
    forms.push(form);
    expect(el.seen).toEqual([]);

    fieldset.disabled = true;
    expect(el.seen).toEqual([true]);
    expect(el.isFormDisabled).toBe(true);

    fieldset.disabled = false;
    expect(el.seen).toEqual([true, false]);
    expect(el.isFormDisabled).toBe(false);
  });

  it('the default hook is a harmless no-op', () => {
    const el = make<PlainControl>('x-bfc-plain');
    expect(() => el.formDisabledCallback(true)).not.toThrow();
  });
});

describe('formStateRestoreCallback', () => {
  it('returns early for null', () => {
    const el = make<PlainControl>('x-bfc-plain');
    el.value = 'kept';
    el.formStateRestoreCallback(null);
    expect(el.value).toBe('kept');
  });

  it('restores a string through parse()', () => {
    const el = make<ResetControl>('x-bfc-reset');
    el.formStateRestoreCallback('restored');
    expect(el.value).toBe('parsed:restored');
    expect(el.resets).toBe(0);
  });

  it('restores FormData through parseFormData()', () => {
    const el = make<MultiControl>('x-bfc-multi');
    const fd = new FormData();
    fd.append('m', 'one');
    fd.append('m', 'two');
    el.formStateRestoreCallback(fd);
    expect(el.value).toEqual(['one', 'two']);
  });

  it('restores a File through parseFile()', () => {
    const el = make<FileControl>('x-bfc-file');
    const file = new File(['x'], 'restored.txt', { type: 'text/plain' });
    el.formStateRestoreCallback(file);
    expect(el.value).toBe(file);
    expect(el.value!.name).toBe('restored.txt');
  });

  it('the default parseFormData throws, naming the subclass', () => {
    const el = make<PlainControl>('x-bfc-plain');
    expect(() => el.formStateRestoreCallback(new FormData())).toThrow(
      'PlainControl: parseFormData() not implemented for FormData restore.',
    );
  });

  it('the default parseFile throws, naming the subclass', () => {
    const el = make<PlainControl>('x-bfc-plain');
    expect(() => el.formStateRestoreCallback(new File(['x'], 'a.txt'))).toThrow(
      'PlainControl: parseFile() not implemented for File restore.',
    );
  });
});
