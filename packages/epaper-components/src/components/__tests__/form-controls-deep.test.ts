// Behavioural tests for the six core form controls.
//
// Each block does the same four things for its component: render from
// attributes, mutate every observed attribute after mount, drive the
// documented events through real DOM interaction, and put the element in a
// `<form>` to check FormData / reset / validity.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import type { EInput } from '../input/input';
import type { EToggle } from '../toggle/toggle';
import type { ECheckbox } from '../checkbox/checkbox';
import type { ECheckboxGroup } from '../checkbox-group/checkbox-group';
import type { ETextarea } from '../textarea/textarea';
import type { ERadioGroup } from '../radio-group/radio-group';

beforeAll(async () => {
  await import('../input/input');
  await import('../toggle/toggle');
  await import('../checkbox/checkbox');
  await import('../checkbox-group/checkbox-group');
  await import('../textarea/textarea');
  await import('../radio-group/radio-group');
});

const roots: HTMLElement[] = [];

const mount = <T extends HTMLElement = HTMLElement>(html: string): T => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  roots.push(wrap);
  return wrap.firstElementChild as T;
};

// Every mount leaks a wrapper into <body>; a stray `<fieldset disabled>` or a
// still-connected form-associated element would otherwise be visible to later
// tests through document-wide queries.
afterEach(() => {
  for (const root of roots.splice(0)) root.remove();
});

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/**
 * `serialize`/`parse`/`parseFormData`/`resetValue` are `protected` on
 * `BaseFormControl`, and several subclasses override `set value` so the base
 * class never routes through them at runtime. They are still part of the
 * documented contract, so they get called through this structural view.
 */
interface ProtectedControl {
  serialize(v: string): string | FormData | File | null;
  parse(s: string): string;
  parseFormData(fd: FormData): string;
  resetValue(): void;
}
const inner = (el: HTMLElement): ProtectedControl => el as unknown as ProtectedControl;

const detailsOf = (events: Event[]): unknown[] =>
  events.map((e) => (e as CustomEvent<unknown>).detail);

const record = (el: HTMLElement, type: string): Event[] => {
  const seen: Event[] = [];
  el.addEventListener(type, (e) => seen.push(e));
  return seen;
};

/* ===================================================================== *
 * e-input
 * ===================================================================== */

describe('e-input · rendering from attributes', () => {
  it('renders label, hint, placeholder, type and value and derives ids from the host id', () => {
    const el = mount<EInput>(
      `<e-input id="nm" label="Name" hint="Your full name" placeholder="Ada" type="email" value="a@b.c"></e-input>`,
    );
    const input = el.querySelector('input')!;
    const label = el.querySelector<HTMLLabelElement>('label.ink-label')!;
    expect(input.id).toBe('nm-control');
    expect(input.className).toBe('ink-control');
    expect(label.getAttribute('for')).toBe('nm-control');
    expect(label.textContent).toBe('Name');
    expect(el.querySelector('.ink-hint')!.textContent).toBe('Your full name');
    expect(input.placeholder).toBe('Ada');
    expect(input.type).toBe('email');
    expect(input.value).toBe('a@b.c');
    expect(el.value).toBe('a@b.c');
  });

  it('generates an id when the host has none and omits label/hint markup', () => {
    const el = mount<EInput>(`<e-input></e-input>`);
    const input = el.querySelector('input')!;
    expect(input.id).toMatch(/^e-i-[0-9a-z]+$/);
    expect(el.querySelector('label.ink-label')).toBeNull();
    expect(el.querySelector('.ink-hint')).toBeNull();
    expect(input.type).toBe('text');
    expect(input.placeholder).toBe('');
  });

  it('falls back to default-value when value is absent', () => {
    const el = mount<EInput>(`<e-input default-value="fallback"></e-input>`);
    expect(el.querySelector('input')!.value).toBe('fallback');
    expect(el.value).toBe('fallback');
  });

  it('renders readonly, required and aria-label from the initial markup', () => {
    const el = mount<EInput>(`<e-input aria-label="Code" readonly required></e-input>`);
    const input = el.querySelector('input')!;
    expect(input.readOnly).toBe(true);
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-label')).toBe('Code');
  });

  it('disables from markup on attribute presence alone', () => {
    // The browser disables a form-associated element whose `disabled`
    // attribute is present, whatever the value, so the rendered inner control
    // has to agree from the first paint.
    const el = mount<EInput>(`<e-input disabled="false"></e-input>`);
    expect(el.querySelector('input')!.disabled).toBe(true);
  });

  it('renders the disabled state and stays barred from constraint validation', () => {
    const el = mount<EInput>(`<e-input disabled required></e-input>`);
    expect(el.querySelector('input')!.disabled).toBe(true);
    expect(el.willValidate).toBe(false);
  });

  it('escapes label, hint, placeholder and value', () => {
    const el = mount<EInput>(
      `<e-input label="<script>alert(1)</script>" hint="a &amp; b" placeholder="<b>ph</b>" value="<i>v</i>"></e-input>`,
    );
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('label.ink-label')!.textContent).toBe('<script>alert(1)</script>');
    expect(el.querySelector('.ink-hint')!.textContent).toBe('a & b');
    expect(el.querySelector('input')!.placeholder).toBe('<b>ph</b>');
    expect(el.querySelector('input')!.value).toBe('<i>v</i>');
  });

  it('does not re-render when re-connected', () => {
    const el = mount<EInput>(`<e-input label="Keep"></e-input>`);
    const input = el.querySelector('input')!;
    el.remove();
    document.body.appendChild(el);
    roots.push(el);
    expect(el.querySelectorAll('input')).toHaveLength(1);
    expect(el.querySelector('input')).toBe(input);
  });
});

describe('e-input · attribute mutation after mount', () => {
  it('mirrors the value attribute and skips the DOM write when it already matches', () => {
    const el = mount<EInput>(`<e-input value="one"></e-input>`);
    const input = el.querySelector('input')!;
    el.setAttribute('value', 'two');
    expect(input.value).toBe('two');
    expect(el.value).toBe('two');
    // Same value again: the guard in attributeChangedCallback skips the write.
    input.value = 'three';
    el.setAttribute('value', 'three');
    expect(input.value).toBe('three');
    el.removeAttribute('value');
    expect(input.value).toBe('');
    expect(el.value).toBe('');
  });

  it('adds, updates and removes the label element', () => {
    const el = mount<EInput>(`<e-input></e-input>`);
    const input = el.querySelector('input')!;
    expect(el.querySelector('label.ink-label')).toBeNull();

    el.setAttribute('label', 'First');
    const label = el.querySelector<HTMLLabelElement>('label.ink-label')!;
    expect(label.textContent).toBe('First');
    expect(label.getAttribute('for')).toBe(input.id);
    expect(label.nextElementSibling).toBe(input);

    el.setAttribute('label', 'Second');
    expect(el.querySelector('label.ink-label')).toBe(label);
    expect(label.textContent).toBe('Second');

    el.removeAttribute('label');
    expect(el.querySelector('label.ink-label')).toBeNull();

    // Empty value with no label present is a no-op, not a crash.
    el.setAttribute('label', '');
    expect(el.querySelector('label.ink-label')).toBeNull();
  });

  it('adds, updates and removes the hint element', () => {
    const el = mount<EInput>(`<e-input></e-input>`);
    expect(el.querySelector('.ink-hint')).toBeNull();

    el.setAttribute('hint', 'Helpful');
    const hint = el.querySelector<HTMLElement>('.ink-hint')!;
    expect(hint.tagName).toBe('DIV');
    expect(hint.textContent).toBe('Helpful');
    expect(el.lastElementChild).toBe(hint);

    el.setAttribute('hint', 'Changed');
    expect(el.querySelector('.ink-hint')).toBe(hint);
    expect(hint.textContent).toBe('Changed');

    el.removeAttribute('hint');
    expect(el.querySelector('.ink-hint')).toBeNull();

    el.setAttribute('hint', '');
    expect(el.querySelector('.ink-hint')).toBeNull();
  });

  it('mirrors placeholder, aria-label, readonly and disabled', () => {
    const el = mount<EInput>(`<e-input></e-input>`);
    const input = el.querySelector('input')!;

    el.setAttribute('placeholder', 'Type here');
    expect(input.placeholder).toBe('Type here');
    el.removeAttribute('placeholder');
    expect(input.placeholder).toBe('');

    el.setAttribute('aria-label', 'Search');
    expect(input.getAttribute('aria-label')).toBe('Search');
    el.setAttribute('aria-label', '');
    expect(input.hasAttribute('aria-label')).toBe(false);
    el.setAttribute('aria-label', 'Again');
    expect(input.getAttribute('aria-label')).toBe('Again');
    el.removeAttribute('aria-label');
    expect(input.hasAttribute('aria-label')).toBe(false);

    el.setAttribute('readonly', '');
    expect(input.readOnly).toBe(true);
    el.setAttribute('readonly', 'false');
    expect(input.readOnly).toBe(false);
    el.setAttribute('readonly', '');
    expect(input.readOnly).toBe(true);
    el.removeAttribute('readonly');
    expect(input.readOnly).toBe(false);

    el.setAttribute('disabled', '');
    expect(input.disabled).toBe(true);
    // `disabled` follows the HTML spec for form-associated elements, not the
    // library's `x="false"` convention: presence alone disables, matching what
    // the browser already told the element through `formDisabledCallback`.
    el.setAttribute('disabled', 'false');
    expect(input.disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(input.disabled).toBe(false);
  });

  it('re-sanitises the value when the type changes and falls back to text', () => {
    const el = mount<EInput>(`<e-input value="hello"></e-input>`);
    const input = el.querySelector('input')!;
    el.setAttribute('type', 'number');
    expect(input.type).toBe('number');
    expect(input.value).toBe('');
    expect(el.value).toBe('');

    el.setAttribute('value', '42');
    expect(input.value).toBe('42');

    // An unknown type keeps the content attribute but reports as text.
    el.setAttribute('type', 'bogus');
    expect(input.getAttribute('type')).toBe('bogus');
    expect(input.type).toBe('text');

    el.removeAttribute('type');
    expect(input.type).toBe('text');
  });

  it('forwards and removes every native constraint / hint attribute', () => {
    const el = mount<EInput>(`<e-input></e-input>`);
    const input = el.querySelector('input')!;
    const pairs: Array<[string, string]> = [
      ['pattern', '[a-z]+'],
      ['minlength', '2'],
      ['maxlength', '8'],
      ['min', '1'],
      ['max', '9'],
      ['step', '2'],
      ['autocomplete', 'email'],
      ['inputmode', 'numeric'],
      ['enterkeyhint', 'done'],
      ['spellcheck', 'false'],
    ];
    for (const [name, value] of pairs) {
      el.setAttribute(name, value);
      expect(input.getAttribute(name)).toBe(value);
    }
    for (const [name] of pairs) {
      el.removeAttribute(name);
      expect(input.hasAttribute(name)).toBe(false);
    }
  });

  it('picks up constraint attributes that were present before mount', () => {
    const el = mount<EInput>(
      `<e-input pattern="[0-9]+" minlength="1" maxlength="4" inputmode="numeric" spellcheck="false"></e-input>`,
    );
    const input = el.querySelector('input')!;
    expect(input.getAttribute('pattern')).toBe('[0-9]+');
    expect(input.getAttribute('minlength')).toBe('1');
    expect(input.getAttribute('maxlength')).toBe('4');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('spellcheck')).toBe('false');
  });
});

describe('e-input · value property', () => {
  it('reads and writes through the inner input once connected', () => {
    const el = mount<EInput>(`<e-input value="a"></e-input>`);
    const input = el.querySelector('input')!;
    el.value = 'b';
    expect(input.value).toBe('b');
    expect(el.value).toBe('b');
    el.value = null as unknown as string;
    expect(input.value).toBe('');
    expect(el.value).toBe('');
  });

  it('buffers the value while the element is not yet connected', () => {
    const el = document.createElement('e-input') as EInput;
    expect(el.value).toBe('');
    el.value = 'buffered';
    expect(el.value).toBe('buffered');
    // The connect-time render reads the attributes, not the buffer.
    document.body.appendChild(el);
    roots.push(el);
    expect(el.value).toBe('');
  });

  it('serialize/parse round-trip the string value', () => {
    const el = mount<EInput>(`<e-input></e-input>`);
    expect(inner(el).serialize('abc')).toBe('abc');
    expect(inner(el).serialize(null as unknown as string)).toBe('');
    expect(inner(el).parse('xyz')).toBe('xyz');
  });
});

describe('e-input · events', () => {
  it('fires e-input on every keystroke and e-change on commit', () => {
    const el = mount<EInput>(`<e-input name="q"></e-input>`);
    const input = el.querySelector('input')!;
    const inputs = record(el, 'e-input');
    const changes = record(el, 'e-change');

    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = 'abc';
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(detailsOf(inputs)).toEqual([{ value: 'ab' }]);
    expect(detailsOf(changes)).toEqual([{ value: 'abc' }]);
    expect(inputs[0]!.bubbles).toBe(true);
    expect(changes[0]!.bubbles).toBe(true);
    expect(el.value).toBe('abc');
  });
});

describe('e-input · validity', () => {
  it('reports the native message for required and only paints aria-invalid once surfaced', () => {
    const el = mount<EInput>(`<e-input required></e-input>`);
    const input = el.querySelector('input')!;
    // Untouched: the violation is already recorded but deliberately unpainted.
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).not.toBe('');

    // checkValidity() dispatches `invalid` on the host, which surfaces it.
    expect(el.checkValidity()).toBe(false);
    expect(input.getAttribute('aria-invalid')).toBe('true');

    expect(el.reportValidity()).toBe(false);
    expect(input.getAttribute('aria-invalid')).toBe('true');

    el.value = 'filled';
    expect(el.checkValidity()).toBe(true);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('uses required-message and clears it when required is dropped', () => {
    const el = mount<EInput>(`<e-input required required-message="We need this"></e-input>`);
    const input = el.querySelector('input')!;
    // required-message changes what is reported, never when it is surfaced.
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('We need this');
    expect(input.getAttribute('aria-invalid')).toBe('true');

    el.setAttribute('required-message', 'Still needed');
    expect(el.validationMessage).toBe('Still needed');

    el.removeAttribute('required');
    expect(input.required).toBe(false);
    expect(el.checkValidity()).toBe(true);
    expect(el.validationMessage).toBe('');
  });

  it('applies the author error and error-message over native validity', () => {
    const el = mount<EInput>(`<e-input value="ok"></e-input>`);
    const input = el.querySelector('input')!;
    expect(el.checkValidity()).toBe(true);

    el.setAttribute('error', '');
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.customError).toBe(true);
    expect(el.validationMessage).toBe('Invalid value.');
    expect(input.getAttribute('aria-invalid')).toBe('true');

    el.setAttribute('error-message', 'Try again');
    expect(el.validationMessage).toBe('Try again');

    el.setAttribute('error', 'false');
    expect(el.checkValidity()).toBe(true);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('renders the initial error state straight from markup', () => {
    const el = mount<EInput>(`<e-input error error-message="Nope" value="x"></e-input>`);
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
    expect(el.validationMessage).toBe('Nope');
    expect(el.checkValidity()).toBe(false);
  });

  it('mirrors patternMismatch, typeMismatch and range/step violations', () => {
    const pattern = mount<EInput>(`<e-input value="abc" pattern="[0-9]+"></e-input>`);
    expect(pattern.checkValidity()).toBe(false);
    expect(pattern.validity.patternMismatch).toBe(true);

    const email = mount<EInput>(`<e-input type="email" value="not-an-email"></e-input>`);
    expect(email.checkValidity()).toBe(false);
    expect(email.validity.typeMismatch).toBe(true);

    const over = mount<EInput>(`<e-input type="number" value="12" max="9"></e-input>`);
    expect(over.checkValidity()).toBe(false);
    expect(over.validity.rangeOverflow).toBe(true);

    const under = mount<EInput>(`<e-input type="number" value="1" min="5"></e-input>`);
    expect(under.checkValidity()).toBe(false);
    expect(under.validity.rangeUnderflow).toBe(true);

    const step = mount<EInput>(`<e-input type="number" value="3" step="2" min="0"></e-input>`);
    expect(step.checkValidity()).toBe(false);
    expect(step.validity.stepMismatch).toBe(true);
  });

  it('re-validates when a constraint attribute changes after mount', () => {
    const el = mount<EInput>(`<e-input value="abc"></e-input>`);
    expect(el.checkValidity()).toBe(true);
    el.setAttribute('pattern', '[0-9]+');
    expect(el.checkValidity()).toBe(false);
    el.removeAttribute('pattern');
    expect(el.checkValidity()).toBe(true);
  });
});

describe('e-input · form participation', () => {
  it('round-trips through FormData and honours name', () => {
    const form = mount<HTMLFormElement>(`<form><e-input name="a" value="hello"></e-input></form>`);
    const el = form.querySelector<EInput>('e-input')!;
    expect(el.form).toBe(form);
    expect(el.name).toBe('a');
    expect(new FormData(form).get('a')).toBe('hello');

    el.value = 'changed';
    expect(new FormData(form).get('a')).toBe('changed');

    el.name = 'b';
    expect(el.getAttribute('name')).toBe('b');
    expect(new FormData(form).get('b')).toBe('changed');
  });

  it('restores default-value on form reset and clears the surfaced error', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-input name="a" value="typed" default-value="dflt" required></e-input></form>`,
    );
    const el = form.querySelector<EInput>('e-input')!;
    const input = el.querySelector('input')!;
    el.value = '';
    expect(el.reportValidity()).toBe(false);
    expect(input.getAttribute('aria-invalid')).toBe('true');

    form.reset();
    expect(el.value).toBe('dflt');
    expect(input.value).toBe('dflt');
    expect(new FormData(form).get('a')).toBe('dflt');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('restores state from the back-forward cache', () => {
    const el = mount<EInput>(`<e-input name="a" value="live"></e-input>`);
    el.formStateRestoreCallback('restored');
    expect(el.value).toBe('restored');
    expect(el.querySelector('input')!.value).toBe('restored');
    // A null state is a no-op.
    el.formStateRestoreCallback(null);
    expect(el.value).toBe('restored');
  });

  it('follows a disabled fieldset without losing its own disabled attribute', async () => {
    const fs = mount<HTMLFieldSetElement>(`<fieldset><e-input disabled></e-input></fieldset>`);
    const el = fs.querySelector<EInput>('e-input')!;
    const input = el.querySelector('input')!;
    expect(input.disabled).toBe(true);

    fs.disabled = true;
    await settle();
    expect(input.disabled).toBe(true);

    // Own attribute dropped, fieldset still disabled -> stays disabled.
    el.removeAttribute('disabled');
    expect(input.disabled).toBe(true);

    fs.disabled = false;
    await settle();
    expect(input.disabled).toBe(false);
  });

  it('responds to formDisabledCallback directly', () => {
    const el = mount<EInput>(`<e-input></e-input>`);
    const input = el.querySelector('input')!;
    el.formDisabledCallback(true);
    expect(input.disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(input.disabled).toBe(false);
  });
});

/* ===================================================================== *
 * e-toggle
 * ===================================================================== */

const toggleTextSpan = (el: HTMLElement): HTMLElement | null => {
  const label = el.querySelector<HTMLElement>('label.ink-toggle');
  if (!label) return null;
  for (const child of [...label.children]) {
    if (child.classList.contains('ink-toggle__state')) break;
    if (child.tagName === 'SPAN' && !child.hasAttribute('style')) return child as HTMLElement;
  }
  return null;
};

describe('e-toggle · rendering from attributes', () => {
  it('renders a checked, disabled switch with an inline label', () => {
    const el = mount<EToggle>(`<e-toggle id="tg" checked disabled label="Notify"></e-toggle>`);
    const cb = el.querySelector('input')!;
    expect(cb.type).toBe('checkbox');
    expect(cb.getAttribute('role')).toBe('switch');
    expect(cb.id).toBe('tg-control');
    expect(cb.checked).toBe(true);
    expect(cb.disabled).toBe(true);
    expect(el.querySelector<HTMLLabelElement>('label.ink-toggle')!.getAttribute('for')).toBe(
      'tg-control',
    );
    expect(el.querySelector('.ink-toggle__state')!.textContent).toBe('ON');
    expect(el.querySelector('.ink-toggle__track')).not.toBeNull();
    expect(el.querySelector('.ink-toggle__thumb')).not.toBeNull();
    expect(toggleTextSpan(el)!.textContent).toBe('Notify');
  });

  it('renders an unlabelled off switch by default', () => {
    const el = mount<EToggle>(`<e-toggle></e-toggle>`);
    const cb = el.querySelector('input')!;
    expect(cb.checked).toBe(false);
    expect(cb.disabled).toBe(false);
    expect(cb.id).toMatch(/^e-t-[0-9a-z]+$/);
    expect(el.querySelector('.ink-toggle__state')!.textContent).toBe('OFF');
    expect(toggleTextSpan(el)).toBeNull();
    expect(el.checked).toBe(false);
    expect(el.value).toBe('on');
  });

  it('escapes the label', () => {
    const el = mount<EToggle>(`<e-toggle label="<img src=x onerror=1>"></e-toggle>`);
    expect(el.querySelector('img')).toBeNull();
    expect(toggleTextSpan(el)!.textContent).toBe('<img src=x onerror=1>');
  });

  it('does not re-render when re-connected', () => {
    const el = mount<EToggle>(`<e-toggle label="Keep"></e-toggle>`);
    const cb = el.querySelector('input')!;
    el.remove();
    document.body.appendChild(el);
    roots.push(el);
    expect(el.querySelectorAll('input')).toHaveLength(1);
    expect(el.querySelector('input')).toBe(cb);
  });
});

describe('e-toggle · attribute mutation after mount', () => {
  it('mirrors checked into the input and the ON/OFF pill', () => {
    const el = mount<EToggle>(`<e-toggle></e-toggle>`);
    const cb = el.querySelector('input')!;
    const state = el.querySelector('.ink-toggle__state')!;

    el.setAttribute('checked', '');
    expect(cb.checked).toBe(true);
    expect(state.textContent).toBe('ON');

    el.setAttribute('checked', 'false');
    expect(cb.checked).toBe(false);
    expect(state.textContent).toBe('OFF');

    el.removeAttribute('checked');
    expect(cb.checked).toBe(false);
    expect(state.textContent).toBe('OFF');
  });

  it('adds, updates and removes the inline label span', () => {
    const el = mount<EToggle>(`<e-toggle></e-toggle>`);
    const label = el.querySelector<HTMLElement>('label.ink-toggle')!;
    const state = el.querySelector('.ink-toggle__state')!;
    expect(toggleTextSpan(el)).toBeNull();

    el.setAttribute('label', 'On air');
    const span = toggleTextSpan(el)!;
    expect(span.textContent).toBe('On air');
    expect(span.nextElementSibling).toBe(state);
    expect(label.contains(span)).toBe(true);

    el.setAttribute('label', 'Off air');
    expect(toggleTextSpan(el)).toBe(span);
    expect(span.textContent).toBe('Off air');

    el.removeAttribute('label');
    expect(toggleTextSpan(el)).toBeNull();

    el.setAttribute('label', '');
    expect(toggleTextSpan(el)).toBeNull();
  });

  it('mirrors disabled on attribute presence alone', () => {
    const el = mount<EToggle>(`<e-toggle></e-toggle>`);
    const cb = el.querySelector('input')!;
    el.setAttribute('disabled', '');
    expect(cb.disabled).toBe(true);
    // `disabled` follows the HTML spec for form-associated elements, not the
    // library's `x="false"` convention: presence alone disables, matching what
    // the browser already told the element through `formDisabledCallback`.
    el.setAttribute('disabled', 'false');
    expect(cb.disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(cb.disabled).toBe(false);
  });

  it('disables from markup on attribute presence alone', () => {
    const el = mount<EToggle>(`<e-toggle disabled="false"></e-toggle>`);
    expect(el.querySelector('input')!.disabled).toBe(true);
  });
});

describe('e-toggle · properties, events and form participation', () => {
  it('checked property reflects to the attribute in both directions', () => {
    const el = mount<EToggle>(`<e-toggle></e-toggle>`);
    const cb = el.querySelector('input')!;
    el.checked = true;
    expect(el.hasAttribute('checked')).toBe(true);
    expect(cb.checked).toBe(true);
    expect(el.checked).toBe(true);
    el.checked = false;
    expect(el.hasAttribute('checked')).toBe(false);
    expect(cb.checked).toBe(false);
    expect(el.checked).toBe(false);
  });

  it('fires e-change with {checked} and reflects the attribute on user input', () => {
    const el = mount<EToggle>(`<e-toggle name="t"></e-toggle>`);
    const cb = el.querySelector('input')!;
    const state = el.querySelector('.ink-toggle__state')!;
    const changes = record(el, 'e-change');

    cb.click();
    expect(el.hasAttribute('checked')).toBe(true);
    expect(state.textContent).toBe('ON');

    cb.click();
    expect(el.hasAttribute('checked')).toBe(false);
    expect(state.textContent).toBe('OFF');

    expect(detailsOf(changes)).toEqual([{ checked: true }, { checked: false }]);
    expect(changes[0]!.bubbles).toBe(true);
  });

  it('submits its value only while checked', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-toggle name="t" value="yes" checked></e-toggle></form>`,
    );
    const el = form.querySelector<EToggle>('e-toggle')!;
    expect(el.value).toBe('yes');
    expect(new FormData(form).get('t')).toBe('yes');

    el.value = 'no';
    expect(el.getAttribute('value')).toBe('no');
    expect(new FormData(form).get('t')).toBe('no');

    el.checked = false;
    expect(new FormData(form).get('t')).toBeNull();

    el.removeAttribute('value');
    el.checked = true;
    expect(el.value).toBe('on');
    expect(new FormData(form).get('t')).toBe('on');
  });

  it('serialize returns the value only when checked; parse is the identity', () => {
    const el = mount<EToggle>(`<e-toggle></e-toggle>`);
    expect(inner(el).serialize('yes')).toBeNull();
    el.checked = true;
    expect(inner(el).serialize('yes')).toBe('yes');
    expect(inner(el).serialize('')).toBe('on');
    expect(inner(el).parse('yes')).toBe('yes');
  });

  it('enforces required and honours required-message', () => {
    const el = mount<EToggle>(`<e-toggle name="t" required></e-toggle>`);
    const cb = el.querySelector('input')!;
    expect(cb.required).toBe(true);
    // Untouched: recorded but unpainted until something surfaces it.
    expect(cb.hasAttribute('aria-invalid')).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Please turn on this switch.');
    expect(el.checkValidity()).toBe(false);
    expect(cb.getAttribute('aria-invalid')).toBe('true');

    el.setAttribute('required-message', 'Flip the switch');
    expect(el.validationMessage).toBe('Flip the switch');

    expect(el.reportValidity()).toBe(false);
    expect(cb.getAttribute('aria-invalid')).toBe('true');

    el.checked = true;
    expect(el.checkValidity()).toBe(true);
    expect(cb.hasAttribute('aria-invalid')).toBe(false);

    el.checked = false;
    el.removeAttribute('required');
    expect(el.checkValidity()).toBe(true);
  });

  it('resets to default-checked on form reset', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-toggle name="t" default-checked></e-toggle><e-toggle name="u" checked></e-toggle></form>`,
    );
    const withDefault = form.querySelector<EToggle>('e-toggle[name="t"]')!;
    const withoutDefault = form.querySelector<EToggle>('e-toggle[name="u"]')!;
    expect(withDefault.checked).toBe(false);
    expect(withoutDefault.checked).toBe(true);

    form.reset();
    expect(withDefault.checked).toBe(true);
    expect(withoutDefault.checked).toBe(false);
    expect(new FormData(form).get('t')).toBe('on');
    expect(new FormData(form).get('u')).toBeNull();
  });

  it('restores the checked state from the back-forward cache', () => {
    const el = mount<EToggle>(`<e-toggle name="t" value="yes"></e-toggle>`);
    el.formStateRestoreCallback('checked');
    expect(el.checked).toBe(true);
    el.formStateRestoreCallback('unchecked');
    expect(el.checked).toBe(false);
    el.formStateRestoreCallback('yes');
    expect(el.checked).toBe(true);
    // No stored state is nothing to restore, not an instruction to switch off.
    el.formStateRestoreCallback(null);
    expect(el.checked).toBe(true);
  });

  it('follows a disabled fieldset and formDisabledCallback', async () => {
    const fs = mount<HTMLFieldSetElement>(`<fieldset><e-toggle></e-toggle></fieldset>`);
    const el = fs.querySelector<EToggle>('e-toggle')!;
    const cb = el.querySelector('input')!;
    fs.disabled = true;
    await settle();
    expect(cb.disabled).toBe(true);
    fs.disabled = false;
    await settle();
    expect(cb.disabled).toBe(false);

    el.formDisabledCallback(true);
    expect(cb.disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(cb.disabled).toBe(false);
  });
});

/* ===================================================================== *
 * e-checkbox
 * ===================================================================== */

const checkboxTextSpan = (el: HTMLElement): HTMLElement | null =>
  el.querySelector<HTMLElement>('label.ink-checkbox > span:not([style])');

describe('e-checkbox · rendering from attributes', () => {
  it('renders a checked, disabled box with an inline label', () => {
    const el = mount<ECheckbox>(
      `<e-checkbox id="cb" checked disabled label="Accept"></e-checkbox>`,
    );
    const cb = el.querySelector('input')!;
    expect(cb.type).toBe('checkbox');
    expect(cb.id).toBe('cb-control');
    expect(cb.checked).toBe(true);
    expect(cb.disabled).toBe(true);
    expect(el.querySelector<HTMLLabelElement>('label.ink-checkbox')!.getAttribute('for')).toBe(
      'cb-control',
    );
    expect(el.querySelector('.ink-checkbox__box svg')).not.toBeNull();
    expect(checkboxTextSpan(el)!.textContent).toBe('Accept');
  });

  it('renders an unlabelled unchecked box by default', () => {
    const el = mount<ECheckbox>(`<e-checkbox></e-checkbox>`);
    expect(el.querySelector('input')!.id).toMatch(/^e-c-[0-9a-z]+$/);
    expect(el.querySelector('input')!.checked).toBe(false);
    expect(checkboxTextSpan(el)).toBeNull();
    expect(el.checked).toBe(false);
    expect(el.value).toBe('on');
  });

  it('escapes the label', () => {
    const el = mount<ECheckbox>(`<e-checkbox label="<span>x</span>"></e-checkbox>`);
    expect(checkboxTextSpan(el)!.textContent).toBe('<span>x</span>');
    expect(el.querySelectorAll('label.ink-checkbox > span')).toHaveLength(2);
  });

  it('does not re-render when re-connected', () => {
    const el = mount<ECheckbox>(`<e-checkbox label="Keep"></e-checkbox>`);
    const cb = el.querySelector('input')!;
    el.remove();
    document.body.appendChild(el);
    roots.push(el);
    expect(el.querySelectorAll('input')).toHaveLength(1);
    expect(el.querySelector('input')).toBe(cb);
  });
});

describe('e-checkbox · attribute mutation after mount', () => {
  it('mirrors checked and disabled', () => {
    const el = mount<ECheckbox>(`<e-checkbox></e-checkbox>`);
    const cb = el.querySelector('input')!;

    el.setAttribute('checked', '');
    expect(cb.checked).toBe(true);
    el.setAttribute('checked', 'false');
    expect(cb.checked).toBe(false);
    el.setAttribute('checked', '');
    expect(cb.checked).toBe(true);
    el.removeAttribute('checked');
    expect(cb.checked).toBe(false);

    el.setAttribute('disabled', '');
    expect(cb.disabled).toBe(true);
    // `disabled` follows the HTML spec for form-associated elements, not the
    // library's `x="false"` convention: presence alone disables, matching what
    // the browser already told the element through `formDisabledCallback`.
    el.setAttribute('disabled', 'false');
    expect(cb.disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(cb.disabled).toBe(false);
  });

  it('disables from markup on attribute presence alone', () => {
    const el = mount<ECheckbox>(`<e-checkbox disabled="false"></e-checkbox>`);
    expect(el.querySelector('input')!.disabled).toBe(true);
  });

  it('adds, updates and removes the inline label span', () => {
    const el = mount<ECheckbox>(`<e-checkbox></e-checkbox>`);
    expect(checkboxTextSpan(el)).toBeNull();

    el.setAttribute('label', 'Terms');
    const span = checkboxTextSpan(el)!;
    expect(span.textContent).toBe('Terms');
    expect(el.querySelector('label.ink-checkbox')!.lastElementChild).toBe(span);

    el.setAttribute('label', 'Conditions');
    expect(checkboxTextSpan(el)).toBe(span);
    expect(span.textContent).toBe('Conditions');

    el.removeAttribute('label');
    expect(checkboxTextSpan(el)).toBeNull();

    el.setAttribute('label', '');
    expect(checkboxTextSpan(el)).toBeNull();
  });
});

describe('e-checkbox · properties, events and form participation', () => {
  it('checked property reflects to the attribute in both directions', () => {
    const el = mount<ECheckbox>(`<e-checkbox></e-checkbox>`);
    const cb = el.querySelector('input')!;
    el.checked = true;
    expect(el.hasAttribute('checked')).toBe(true);
    expect(cb.checked).toBe(true);
    el.checked = false;
    expect(el.hasAttribute('checked')).toBe(false);
    expect(cb.checked).toBe(false);
    expect(el.checked).toBe(false);
  });

  it('fires e-change with {checked} on user input', () => {
    const el = mount<ECheckbox>(`<e-checkbox name="c"></e-checkbox>`);
    const cb = el.querySelector('input')!;
    const changes = record(el, 'e-change');

    cb.click();
    expect(el.hasAttribute('checked')).toBe(true);
    cb.click();
    expect(el.hasAttribute('checked')).toBe(false);

    expect(detailsOf(changes)).toEqual([{ checked: true }, { checked: false }]);
    expect(changes[0]!.bubbles).toBe(true);
  });

  it('submits its value only while checked', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-checkbox name="c" value="yes" checked></e-checkbox></form>`,
    );
    const el = form.querySelector<ECheckbox>('e-checkbox')!;
    expect(new FormData(form).get('c')).toBe('yes');

    el.value = 'maybe';
    expect(el.getAttribute('value')).toBe('maybe');
    expect(el.value).toBe('maybe');
    expect(new FormData(form).get('c')).toBe('maybe');

    el.checked = false;
    expect(new FormData(form).get('c')).toBeNull();

    el.removeAttribute('value');
    el.checked = true;
    expect(el.value).toBe('on');
    expect(new FormData(form).get('c')).toBe('on');
  });

  it('serialize returns the value only when checked; parse is the identity', () => {
    const el = mount<ECheckbox>(`<e-checkbox></e-checkbox>`);
    expect(inner(el).serialize('yes')).toBeNull();
    el.checked = true;
    expect(inner(el).serialize('yes')).toBe('yes');
    expect(inner(el).serialize('')).toBe('on');
    expect(inner(el).parse('yes')).toBe('yes');
  });

  it('enforces required and honours required-message', () => {
    const el = mount<ECheckbox>(`<e-checkbox name="c" required></e-checkbox>`);
    const cb = el.querySelector('input')!;
    expect(cb.required).toBe(true);
    expect(cb.hasAttribute('aria-invalid')).toBe(false);
    expect(el.validationMessage).toBe('Please check this box.');
    expect(el.checkValidity()).toBe(false);
    expect(cb.getAttribute('aria-invalid')).toBe('true');

    el.setAttribute('required-message', 'Tick the box');
    expect(el.validationMessage).toBe('Tick the box');
    expect(el.reportValidity()).toBe(false);
    expect(cb.getAttribute('aria-invalid')).toBe('true');

    el.checked = true;
    expect(el.checkValidity()).toBe(true);
    expect(cb.hasAttribute('aria-invalid')).toBe(false);
  });

  it('resets to default-checked on form reset', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-checkbox name="c" default-checked></e-checkbox><e-checkbox name="d" checked></e-checkbox></form>`,
    );
    const withDefault = form.querySelector<ECheckbox>('e-checkbox[name="c"]')!;
    const withoutDefault = form.querySelector<ECheckbox>('e-checkbox[name="d"]')!;
    form.reset();
    expect(withDefault.checked).toBe(true);
    expect(withoutDefault.checked).toBe(false);
    expect(new FormData(form).get('c')).toBe('on');
    expect(new FormData(form).get('d')).toBeNull();
  });

  it('restores the checked state from the back-forward cache', () => {
    const el = mount<ECheckbox>(`<e-checkbox name="c" value="yes"></e-checkbox>`);
    el.formStateRestoreCallback('checked');
    expect(el.checked).toBe(true);
    el.formStateRestoreCallback('unchecked');
    expect(el.checked).toBe(false);
    el.formStateRestoreCallback('yes');
    expect(el.checked).toBe(true);
    // No stored state is nothing to restore, not an instruction to uncheck.
    el.formStateRestoreCallback(null);
    expect(el.checked).toBe(true);
  });

  it('follows a disabled fieldset and formDisabledCallback', async () => {
    const fs = mount<HTMLFieldSetElement>(`<fieldset><e-checkbox></e-checkbox></fieldset>`);
    const el = fs.querySelector<ECheckbox>('e-checkbox')!;
    const cb = el.querySelector('input')!;
    fs.disabled = true;
    await settle();
    expect(cb.disabled).toBe(true);
    fs.disabled = false;
    await settle();
    expect(cb.disabled).toBe(false);

    el.formDisabledCallback(true);
    expect(cb.disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(cb.disabled).toBe(false);
  });
});

/* ===================================================================== *
 * e-checkbox-group
 * ===================================================================== */

const groupLabels = (el: HTMLElement): string[] =>
  [...el.querySelectorAll('label.ink-checkbox > span:not([style])')].map(
    (s) => s.textContent ?? '',
  );
const groupValues = (el: HTMLElement): string[] =>
  [...el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].map((i) => i.value);
const groupChecked = (el: HTMLElement): boolean[] =>
  [...el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].map((i) => i.checked);

describe('e-checkbox-group · building options', () => {
  it('reads value/label from e-cbox-option with the documented fallbacks', () => {
    const el = mount<ECheckboxGroup>(
      `<e-checkbox-group value="a,c">
        <e-cbox-option value="a" label="Apples"></e-cbox-option>
        <e-cbox-option value="b">Bananas</e-cbox-option>
        <e-cbox-option value="c"></e-cbox-option>
        <e-cbox-option></e-cbox-option>
      </e-checkbox-group>`,
    );
    expect(groupValues(el)).toEqual(['a', 'b', 'c', '']);
    expect(groupLabels(el)).toEqual(['Apples', 'Bananas', 'c', '']);
    expect(groupChecked(el)).toEqual([true, false, true, false]);
    expect(el.querySelector('e-cbox-option')).toBeNull();
    expect(el.value).toBe('a,c');

    const container = el.querySelector<HTMLElement>('[role="group"]')!;
    expect(container.style.display).toBe('flex');
    expect(container.style.flexDirection).toBe('column');
    expect(container.style.flexWrap).toBe('wrap');
  });

  it('lays out horizontally when asked and reacts to layout changes', () => {
    const el = mount<ECheckboxGroup>(
      `<e-checkbox-group layout="horizontal"><e-cbox-option value="a" label="A"></e-cbox-option></e-checkbox-group>`,
    );
    const container = el.querySelector<HTMLElement>('[role="group"]')!;
    expect(container.style.flexDirection).toBe('row');
    el.setAttribute('layout', 'vertical');
    expect(container.style.flexDirection).toBe('column');
    el.setAttribute('layout', 'horizontal');
    expect(container.style.flexDirection).toBe('row');
    el.removeAttribute('layout');
    expect(container.style.flexDirection).toBe('column');
  });

  it('renders option labels as text, never as markup', () => {
    const el = mount<ECheckboxGroup>(
      `<e-checkbox-group><e-cbox-option value="a" label="<b>bold</b>"></e-cbox-option></e-checkbox-group>`,
    );
    expect(el.querySelector('b')).toBeNull();
    expect(groupLabels(el)).toEqual(['<b>bold</b>']);
  });
});

describe('e-checkbox-group · value, events and reconnection', () => {
  const markup = `<e-checkbox-group name="g" value="a">
      <e-cbox-option value="a" label="A"></e-cbox-option>
      <e-cbox-option value="b" label="B"></e-cbox-option>
      <e-cbox-option value="c" label="C"></e-cbox-option>
    </e-checkbox-group>`;

  it('fires e-change with the selected value array and reflects the attribute', () => {
    const el = mount<ECheckboxGroup>(markup);
    const changes = record(el, 'e-change');
    const boxes = [...el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];

    boxes[1]!.click();
    expect(el.getAttribute('value')).toBe('a,b');
    expect(el.value).toBe('a,b');

    boxes[0]!.click();
    expect(el.getAttribute('value')).toBe('b');
    expect(el.value).toBe('b');

    expect(detailsOf(changes)).toEqual([{ value: ['a', 'b'] }, { value: ['b'] }]);
    expect(changes[0]!.bubbles).toBe(true);
  });

  it('applies the value attribute to the boxes and ignores a no-op write', () => {
    const el = mount<ECheckboxGroup>(markup);
    el.setAttribute('value', 'b,c');
    expect(groupChecked(el)).toEqual([false, true, true]);
    expect(el.value).toBe('b,c');

    // Identical write: the guard returns before touching the DOM.
    const boxes = [...el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    boxes[0]!.checked = true;
    el.setAttribute('value', 'b,c');
    expect(boxes[0]!.checked).toBe(true);

    el.setAttribute('value', '');
    expect(groupChecked(el)).toEqual([false, false, false]);

    el.value = 'a';
    expect(el.getAttribute('value')).toBe('a');
    expect(groupChecked(el)).toEqual([true, false, false]);

    el.value = null as unknown as string;
    expect(el.getAttribute('value')).toBe('');
    expect(el.value).toBe('');
  });

  it('stops listening on disconnect and resumes on reconnect', () => {
    const el = mount<ECheckboxGroup>(markup);
    const changes = record(el, 'e-change');
    const boxes = () => [...el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];

    el.remove();
    // The native box still toggles; only the group's own handler is gone.
    boxes()[1]!.click();
    expect(changes).toHaveLength(0);
    expect(el.getAttribute('value')).toBe('a');

    document.body.appendChild(el);
    roots.push(el);
    expect(el.querySelectorAll('[role="group"]')).toHaveLength(1);
    boxes()[2]!.click();
    expect(changes).toHaveLength(1);
    expect(detailsOf(changes)).toEqual([{ value: ['a', 'b', 'c'] }]);
    expect(el.getAttribute('value')).toBe('a,b,c');
  });
});

describe('e-checkbox-group · form participation', () => {
  const markup = `<form><e-checkbox-group name="g" value="a" default-value="a,b">
      <e-cbox-option value="a" label="A"></e-cbox-option>
      <e-cbox-option value="b" label="B"></e-cbox-option>
    </e-checkbox-group></form>`;

  it('appends each selected option to FormData under name', () => {
    const form = mount<HTMLFormElement>(markup);
    const el = form.querySelector<ECheckboxGroup>('e-checkbox-group')!;
    expect(new FormData(form).getAll('g')).toEqual(['a']);

    el.setAttribute('value', 'a,b');
    expect(new FormData(form).getAll('g')).toEqual(['a', 'b']);

    el.setAttribute('value', '');
    expect(new FormData(form).getAll('g')).toEqual([]);
  });

  it('restores default-value on form reset', () => {
    const form = mount<HTMLFormElement>(markup);
    const el = form.querySelector<ECheckboxGroup>('e-checkbox-group')!;
    el.setAttribute('value', '');
    form.reset();
    expect(el.value).toBe('a,b');
    expect(groupChecked(el)).toEqual([true, true]);
    expect(new FormData(form).getAll('g')).toEqual(['a', 'b']);
  });

  it('serializes to FormData when named and to a joined string otherwise', () => {
    const named = mount<ECheckboxGroup>(
      `<e-checkbox-group name="g"><e-cbox-option value="a" label="A"></e-cbox-option></e-checkbox-group>`,
    );
    const fd = inner(named).serialize('a,b');
    expect(fd).toBeInstanceOf(FormData);
    expect((fd as FormData).getAll('g')).toEqual(['a', 'b']);
    expect((inner(named).serialize('') as FormData).getAll('g')).toEqual([]);
    expect(inner(named).parse('a,b')).toBe('a,b');

    const anonymous = mount<ECheckboxGroup>(
      `<e-checkbox-group value="a"><e-cbox-option value="a" label="A"></e-cbox-option></e-checkbox-group>`,
    );
    expect(inner(anonymous).serialize('a,b')).toBe('a,b');
    expect(inner(anonymous).serialize(null as unknown as string)).toBe('');
    expect(anonymous.value).toBe('a');
  });

  it('restores from FormData and from a plain string', () => {
    const el = mount<ECheckboxGroup>(
      `<e-checkbox-group name="g"><e-cbox-option value="a" label="A"></e-cbox-option><e-cbox-option value="b" label="B"></e-cbox-option></e-checkbox-group>`,
    );
    const fd = new FormData();
    fd.append('g', 'a');
    fd.append('g', 'b');
    el.formStateRestoreCallback(fd);
    expect(el.value).toBe('a,b');
    expect(groupChecked(el)).toEqual([true, true]);

    el.formStateRestoreCallback('b');
    expect(el.value).toBe('b');
    expect(groupChecked(el)).toEqual([false, true]);

    el.formStateRestoreCallback(null);
    expect(el.value).toBe('b');

    const anonymous = mount<ECheckboxGroup>(
      `<e-checkbox-group value="a"><e-cbox-option value="a" label="A"></e-cbox-option></e-checkbox-group>`,
    );
    expect(inner(anonymous).parseFormData(fd)).toBe('');
  });

  it('enforces required, exposes aria-required and honours required-message', () => {
    const el = mount<ECheckboxGroup>(
      `<e-checkbox-group name="g" required><e-cbox-option value="a" label="A"></e-cbox-option></e-checkbox-group>`,
    );
    const container = el.querySelector<HTMLElement>('[role="group"]')!;
    expect(container.getAttribute('aria-required')).toBe('true');
    expect(container.hasAttribute('aria-invalid')).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Please select at least one option.');
    expect(el.checkValidity()).toBe(false);
    expect(container.getAttribute('aria-invalid')).toBe('true');

    el.setAttribute('required-message', 'Pick at least one');
    expect(el.validationMessage).toBe('Pick at least one');
    expect(el.reportValidity()).toBe(false);
    expect(container.getAttribute('aria-invalid')).toBe('true');

    el.querySelector<HTMLInputElement>('input')!.click();
    expect(el.checkValidity()).toBe(true);
    expect(container.hasAttribute('aria-invalid')).toBe(false);

    el.setAttribute('value', '');
    expect(el.checkValidity()).toBe(false);
    el.removeAttribute('required');
    expect(container.getAttribute('aria-required')).toBe('false');
    expect(el.checkValidity()).toBe(true);
  });
});

/* ===================================================================== *
 * e-textarea
 * ===================================================================== */

describe('e-textarea · rendering from attributes', () => {
  it('renders value, placeholder, aria-label and the boolean states', () => {
    const el = mount<ETextarea>(
      `<e-textarea value="line one" placeholder="Notes" aria-label="Notes field" readonly required></e-textarea>`,
    );
    const ta = el.querySelector('textarea')!;
    expect(ta.className).toBe('ink-control');
    expect(ta.value).toBe('line one');
    expect(ta.placeholder).toBe('Notes');
    expect(ta.getAttribute('aria-label')).toBe('Notes field');
    expect(ta.readOnly).toBe(true);
    expect(ta.required).toBe(true);
    expect(el.value).toBe('line one');
  });

  it('disables from markup on attribute presence alone', () => {
    const el = mount<ETextarea>(`<e-textarea disabled="false"></e-textarea>`);
    expect(el.querySelector('textarea')!.disabled).toBe(true);
  });

  it('renders the disabled state and stays barred from constraint validation', () => {
    const el = mount<ETextarea>(`<e-textarea disabled required></e-textarea>`);
    expect(el.querySelector('textarea')!.disabled).toBe(true);
    expect(el.willValidate).toBe(false);
  });

  it('escapes the value and the placeholder', () => {
    const el = mount<ETextarea>(
      `<e-textarea value="<script>x</script> &amp; more" placeholder="<b>ph</b>"></e-textarea>`,
    );
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('textarea')!.value).toBe('<script>x</script> & more');
    expect(el.querySelector('textarea')!.placeholder).toBe('<b>ph</b>');
  });

  it('picks up constraint attributes present before mount', () => {
    const el = mount<ETextarea>(
      `<e-textarea minlength="2" maxlength="10" autocomplete="off" inputmode="text" enterkeyhint="send" spellcheck="false"></e-textarea>`,
    );
    const ta = el.querySelector('textarea')!;
    expect(ta.getAttribute('minlength')).toBe('2');
    expect(ta.getAttribute('maxlength')).toBe('10');
    expect(ta.getAttribute('autocomplete')).toBe('off');
    expect(ta.getAttribute('inputmode')).toBe('text');
    expect(ta.getAttribute('enterkeyhint')).toBe('send');
    expect(ta.getAttribute('spellcheck')).toBe('false');
  });

  it('does not re-render when re-connected', () => {
    const el = mount<ETextarea>(`<e-textarea value="keep"></e-textarea>`);
    const ta = el.querySelector('textarea')!;
    el.remove();
    document.body.appendChild(el);
    roots.push(el);
    expect(el.querySelectorAll('textarea')).toHaveLength(1);
    expect(el.querySelector('textarea')).toBe(ta);
  });
});

describe('e-textarea · attribute mutation after mount', () => {
  it('mirrors the value attribute and skips the DOM write when it already matches', () => {
    const el = mount<ETextarea>(`<e-textarea value="one"></e-textarea>`);
    const ta = el.querySelector('textarea')!;
    el.setAttribute('value', 'two');
    expect(ta.value).toBe('two');
    expect(el.value).toBe('two');

    ta.value = 'three';
    el.setAttribute('value', 'three');
    expect(ta.value).toBe('three');

    el.removeAttribute('value');
    expect(ta.value).toBe('');
    expect(el.value).toBe('');
  });

  it('mirrors placeholder, aria-label, readonly and disabled', () => {
    const el = mount<ETextarea>(`<e-textarea></e-textarea>`);
    const ta = el.querySelector('textarea')!;

    el.setAttribute('placeholder', 'Say more');
    expect(ta.placeholder).toBe('Say more');
    el.removeAttribute('placeholder');
    expect(ta.placeholder).toBe('');

    el.setAttribute('aria-label', 'Comment');
    expect(ta.getAttribute('aria-label')).toBe('Comment');
    el.setAttribute('aria-label', '');
    expect(ta.hasAttribute('aria-label')).toBe(false);
    el.setAttribute('aria-label', 'Comment');
    expect(ta.getAttribute('aria-label')).toBe('Comment');
    el.removeAttribute('aria-label');
    expect(ta.hasAttribute('aria-label')).toBe(false);

    el.setAttribute('readonly', '');
    expect(ta.readOnly).toBe(true);
    el.setAttribute('readonly', 'false');
    expect(ta.readOnly).toBe(false);
    el.setAttribute('readonly', '');
    expect(ta.readOnly).toBe(true);
    el.removeAttribute('readonly');
    expect(ta.readOnly).toBe(false);

    el.setAttribute('disabled', '');
    expect(ta.disabled).toBe(true);
    // `disabled` follows the HTML spec for form-associated elements, not the
    // library's `x="false"` convention: presence alone disables, matching what
    // the browser already told the element through `formDisabledCallback`.
    el.setAttribute('disabled', 'false');
    expect(ta.disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(ta.disabled).toBe(false);
  });

  it('forwards and removes every native constraint / hint attribute', () => {
    const el = mount<ETextarea>(`<e-textarea></e-textarea>`);
    const ta = el.querySelector('textarea')!;
    const pairs: Array<[string, string]> = [
      ['minlength', '3'],
      ['maxlength', '12'],
      ['autocomplete', 'off'],
      ['inputmode', 'text'],
      ['enterkeyhint', 'go'],
      ['spellcheck', 'true'],
    ];
    for (const [name, value] of pairs) {
      el.setAttribute(name, value);
      expect(ta.getAttribute(name)).toBe(value);
    }
    for (const [name] of pairs) {
      el.removeAttribute(name);
      expect(ta.hasAttribute(name)).toBe(false);
    }
  });
});

describe('e-textarea · value, events, validity and form participation', () => {
  it('reads and writes through the inner textarea, buffering before connect', () => {
    const el = mount<ETextarea>(`<e-textarea value="a"></e-textarea>`);
    el.value = 'b';
    expect(el.querySelector('textarea')!.value).toBe('b');
    expect(el.value).toBe('b');
    el.value = null as unknown as string;
    expect(el.value).toBe('');

    const detached = document.createElement('e-textarea') as ETextarea;
    expect(detached.value).toBe('');
    detached.value = 'buffered';
    expect(detached.value).toBe('buffered');
  });

  it('serialize/parse round-trip the string value', () => {
    const el = mount<ETextarea>(`<e-textarea></e-textarea>`);
    expect(inner(el).serialize('abc')).toBe('abc');
    expect(inner(el).serialize(null as unknown as string)).toBe('');
    expect(inner(el).parse('xyz')).toBe('xyz');
  });

  it('fires e-input on every keystroke and e-change on commit', () => {
    const el = mount<ETextarea>(`<e-textarea name="t"></e-textarea>`);
    const ta = el.querySelector('textarea')!;
    const inputs = record(el, 'e-input');
    const changes = record(el, 'e-change');

    ta.value = 'ab';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.value = 'abc';
    ta.dispatchEvent(new Event('change', { bubbles: true }));

    expect(detailsOf(inputs)).toEqual([{ value: 'ab' }]);
    expect(detailsOf(changes)).toEqual([{ value: 'abc' }]);
    expect(inputs[0]!.bubbles).toBe(true);
    expect(el.value).toBe('abc');
  });

  it('reports required with the native message and surfaces it on demand', () => {
    const el = mount<ETextarea>(`<e-textarea required></e-textarea>`);
    const ta = el.querySelector('textarea')!;
    expect(ta.hasAttribute('aria-invalid')).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.checkValidity()).toBe(false);
    expect(ta.getAttribute('aria-invalid')).toBe('true');
    expect(el.reportValidity()).toBe(false);
    expect(ta.getAttribute('aria-invalid')).toBe('true');
    el.value = 'text';
    expect(el.checkValidity()).toBe(true);
    expect(ta.hasAttribute('aria-invalid')).toBe(false);
  });

  it('honours required-message and drops it with required', () => {
    const el = mount<ETextarea>(
      `<e-textarea required required-message="Write something"></e-textarea>`,
    );
    const ta = el.querySelector('textarea')!;
    // required-message changes what is reported, never when it is surfaced.
    expect(ta.hasAttribute('aria-invalid')).toBe(false);
    expect(ta.required).toBe(true);
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('Write something');
    expect(ta.getAttribute('aria-invalid')).toBe('true');

    el.removeAttribute('required');
    expect(ta.required).toBe(false);
    expect(el.checkValidity()).toBe(true);
  });

  it('applies the author error and error-message over native validity', () => {
    const el = mount<ETextarea>(`<e-textarea value="ok"></e-textarea>`);
    const ta = el.querySelector('textarea')!;
    expect(el.checkValidity()).toBe(true);

    el.setAttribute('error', '');
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.customError).toBe(true);
    expect(el.validationMessage).toBe('Invalid value.');
    expect(ta.getAttribute('aria-invalid')).toBe('true');

    el.setAttribute('error-message', 'Too vague');
    expect(el.validationMessage).toBe('Too vague');

    el.removeAttribute('error');
    expect(el.checkValidity()).toBe(true);
    expect(ta.hasAttribute('aria-invalid')).toBe(false);
  });

  it('renders the initial error state straight from markup', () => {
    const el = mount<ETextarea>(`<e-textarea error error-message="Nope" value="x"></e-textarea>`);
    expect(el.querySelector('textarea')!.getAttribute('aria-invalid')).toBe('true');
    expect(el.validationMessage).toBe('Nope');
  });

  it('round-trips through FormData, reset and state restore', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-textarea name="t" value="typed" default-value="dflt"></e-textarea></form>`,
    );
    const el = form.querySelector<ETextarea>('e-textarea')!;
    expect(el.form).toBe(form);
    expect(new FormData(form).get('t')).toBe('typed');

    el.value = 'edited';
    expect(new FormData(form).get('t')).toBe('edited');

    form.reset();
    expect(el.value).toBe('dflt');
    expect(new FormData(form).get('t')).toBe('dflt');

    el.formStateRestoreCallback('restored');
    expect(el.value).toBe('restored');
    expect(el.querySelector('textarea')!.value).toBe('restored');
    el.formStateRestoreCallback(null);
    expect(el.value).toBe('restored');
  });

  it('follows a disabled fieldset and formDisabledCallback', async () => {
    const fs = mount<HTMLFieldSetElement>(`<fieldset><e-textarea></e-textarea></fieldset>`);
    const el = fs.querySelector<ETextarea>('e-textarea')!;
    const ta = el.querySelector('textarea')!;
    fs.disabled = true;
    await settle();
    expect(ta.disabled).toBe(true);

    el.setAttribute('disabled', '');
    fs.disabled = false;
    await settle();
    expect(ta.disabled).toBe(true);

    el.removeAttribute('disabled');
    expect(ta.disabled).toBe(false);

    el.formDisabledCallback(true);
    expect(ta.disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(ta.disabled).toBe(false);
  });
});

/* ===================================================================== *
 * e-radio-group
 * ===================================================================== */

const radioInputs = (el: HTMLElement): HTMLInputElement[] => [
  ...el.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
];

describe('e-radio-group · building options', () => {
  it('renders one radio per e-radio with a shared generated name', () => {
    const el = mount<ERadioGroup>(
      `<e-radio-group value="b">
        <e-radio value="a" label="Apples"></e-radio>
        <e-radio value="b">Bananas</e-radio>
        <e-radio></e-radio>
      </e-radio-group>`,
    );
    const group = el.querySelector<HTMLElement>('.ink-radio-group')!;
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.classList.contains('ink-radio-group--vertical')).toBe(false);

    const inputs = radioInputs(el);
    expect(inputs.map((i) => i.value)).toEqual(['a', 'b', '']);
    expect(inputs.map((i) => i.checked)).toEqual([false, true, false]);
    expect(inputs[0]!.name).toMatch(/^e-rg-[0-9a-z]+$/);
    expect(new Set(inputs.map((i) => i.name)).size).toBe(1);

    const labels = [...el.querySelectorAll('label.ink-radio')].map((l) => l.textContent!.trim());
    expect(labels).toEqual(['Apples', 'Bananas', '']);
    expect(el.querySelectorAll('.ink-radio__dot')).toHaveLength(3);
    expect(el.value).toBe('b');
  });

  it('renders vertically when asked and reacts to layout changes', () => {
    const el = mount<ERadioGroup>(
      `<e-radio-group layout="vertical"><e-radio value="a" label="A"></e-radio></e-radio-group>`,
    );
    const group = el.querySelector<HTMLElement>('.ink-radio-group')!;
    expect(group.classList.contains('ink-radio-group--vertical')).toBe(true);
    el.setAttribute('layout', 'horizontal');
    expect(group.classList.contains('ink-radio-group--vertical')).toBe(false);
    el.setAttribute('layout', 'vertical');
    expect(group.classList.contains('ink-radio-group--vertical')).toBe(true);
    el.removeAttribute('layout');
    expect(group.classList.contains('ink-radio-group--vertical')).toBe(false);
  });

  it('escapes option labels and values', () => {
    const el = mount<ERadioGroup>(
      `<e-radio-group><e-radio value="&quot;x&quot;" label="<b>bold</b>"></e-radio></e-radio-group>`,
    );
    expect(el.querySelector('b')).toBeNull();
    expect(el.querySelector('label.ink-radio')!.textContent!.trim()).toBe('<b>bold</b>');
    expect(radioInputs(el)[0]!.value).toBe('"x"');
  });

  it('does not re-render when re-connected', () => {
    const el = mount<ERadioGroup>(
      `<e-radio-group><e-radio value="a" label="A"></e-radio></e-radio-group>`,
    );
    el.remove();
    document.body.appendChild(el);
    roots.push(el);
    expect(el.querySelectorAll('.ink-radio-group')).toHaveLength(1);
    expect(radioInputs(el)).toHaveLength(1);
  });
});

describe('e-radio-group · value, events and form participation', () => {
  const markup = `<e-radio-group name="r" value="a">
      <e-radio value="a" label="A"></e-radio>
      <e-radio value="b" label="B"></e-radio>
    </e-radio-group>`;

  it('fires e-change with the selected value on user input', () => {
    const el = mount<ERadioGroup>(markup);
    const changes = record(el, 'e-change');
    radioInputs(el)[1]!.click();
    expect(el.getAttribute('value')).toBe('b');
    expect(el.value).toBe('b');
    expect(detailsOf(changes)).toEqual([{ value: 'b' }]);
    expect(changes[0]!.bubbles).toBe(true);
  });

  it('ignores change events that did not come from one of its radios', () => {
    const el = mount<ERadioGroup>(markup);
    const changes = record(el, 'e-change');
    el.querySelector('.ink-radio-group')!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(changes).toHaveLength(0);
    expect(el.value).toBe('a');
  });

  it('applies the value attribute to the radios and ignores a no-op write', () => {
    const el = mount<ERadioGroup>(markup);
    el.setAttribute('value', 'b');
    expect(radioInputs(el).map((i) => i.checked)).toEqual([false, true]);

    // Identical write: the guard returns before touching the DOM.
    radioInputs(el)[0]!.checked = true;
    el.setAttribute('value', 'b');
    expect(radioInputs(el)[0]!.checked).toBe(true);

    el.setAttribute('value', 'nope');
    expect(radioInputs(el).map((i) => i.checked)).toEqual([false, false]);
    // With nothing checked the getter falls back to the stored value.
    expect(el.value).toBe('nope');

    el.value = 'a';
    expect(el.getAttribute('value')).toBe('a');
    expect(radioInputs(el).map((i) => i.checked)).toEqual([true, false]);

    el.value = null as unknown as string;
    expect(el.getAttribute('value')).toBe('');
    expect(el.value).toBe('');
  });

  it('serialize/parse round-trip the string value', () => {
    const el = mount<ERadioGroup>(markup);
    expect(inner(el).serialize('a')).toBe('a');
    expect(inner(el).serialize(null as unknown as string)).toBe('');
    expect(inner(el).parse('b')).toBe('b');
  });

  it('round-trips through FormData, reset and state restore', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-radio-group name="r" value="a" default-value="b">
        <e-radio value="a" label="A"></e-radio>
        <e-radio value="b" label="B"></e-radio>
      </e-radio-group></form>`,
    );
    const el = form.querySelector<ERadioGroup>('e-radio-group')!;
    expect(el.form).toBe(form);
    expect(new FormData(form).get('r')).toBe('a');

    radioInputs(el)[1]!.click();
    expect(new FormData(form).get('r')).toBe('b');

    el.setAttribute('value', 'a');
    form.reset();
    expect(el.value).toBe('b');
    expect(new FormData(form).get('r')).toBe('b');

    el.formStateRestoreCallback('a');
    expect(el.value).toBe('a');
    expect(radioInputs(el).map((i) => i.checked)).toEqual([true, false]);
    el.formStateRestoreCallback(null);
    expect(el.value).toBe('a');
  });

  it('enforces required, exposes aria-required and honours required-message', () => {
    const el = mount<ERadioGroup>(
      `<e-radio-group name="r" required><e-radio value="a" label="A"></e-radio></e-radio-group>`,
    );
    const group = el.querySelector<HTMLElement>('[role="radiogroup"]')!;
    expect(group.getAttribute('aria-required')).toBe('true');
    expect(group.hasAttribute('aria-invalid')).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Please select an option.');
    expect(el.checkValidity()).toBe(false);
    expect(group.getAttribute('aria-invalid')).toBe('true');

    el.setAttribute('required-message', 'Choose one');
    expect(el.validationMessage).toBe('Choose one');
    expect(el.reportValidity()).toBe(false);
    expect(group.getAttribute('aria-invalid')).toBe('true');

    radioInputs(el)[0]!.click();
    expect(el.checkValidity()).toBe(true);
    expect(group.hasAttribute('aria-invalid')).toBe(false);

    el.setAttribute('value', '');
    expect(el.checkValidity()).toBe(false);
    el.removeAttribute('required');
    expect(group.getAttribute('aria-required')).toBe('false');
    expect(el.checkValidity()).toBe(true);
  });
});
