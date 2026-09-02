// Behavioural tests for the core form controls and the kiosk input family.
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
  await import('../rating/rating');
  await import('../slider/slider');
  await import('../pin-input/pin-input');
  await import('../signature/signature');
  await import('../keypad/keypad');
  await import('../input/input');
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
    expect(el.value).toBe('a,c');

    // v1.3.x: the authored carriers stay in the light DOM as the reactive
    // source of truth, hidden rather than removed, and contribute nothing to
    // the rendered group besides the row `_sync` builds from them.
    const carriers = [...el.querySelectorAll('e-cbox-option')];
    expect(carriers).toHaveLength(4);
    for (const carrier of carriers) expect((carrier as HTMLElement).style.display).toBe('none');

    const container = el.querySelector<HTMLElement>('[role="group"]')!;
    expect(carriers.every((c) => !container.contains(c))).toBe(true);
    expect(container.children).toHaveLength(4); // rendered rows only, not the carriers
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
    // v1.3.x: reconnecting re-syncs from the `value` attribute — selection is
    // always re-derived from it, never cached per row — so the stray native
    // toggle on 'b' above is discarded rather than surviving into the value
    // the next real click reports.
    expect(boxes()[1]!.checked).toBe(false);
    boxes()[2]!.click();
    expect(changes).toHaveLength(1);
    expect(detailsOf(changes)).toEqual([{ value: ['a', 'c'] }]);
    expect(el.getAttribute('value')).toBe('a,c');
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

/* ===================================================================== *
 * e-rating
 * ===================================================================== */

describe('e-rating', () => {
  const symbols = (el: HTMLElement): HTMLButtonElement[] => [
    ...el.querySelectorAll<HTMLButtonElement>('.ink-rating__symbol'),
  ];
  const press = (el: HTMLElement, key: string): void => {
    const focused = symbols(el).find((s) => s.tabIndex === 0) ?? symbols(el)[0];
    focused.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  };

  it('renders one symbol per step with the selected ones filled', () => {
    const el = mount(`<e-rating value="3" max="5" label="Taste"></e-rating>`);
    expect(symbols(el)).toHaveLength(5);
    expect(symbols(el).map((s) => s.dataset['on'])).toEqual([
      'true',
      'true',
      'true',
      undefined,
      undefined,
    ]);
    expect(symbols(el)[2].getAttribute('aria-checked')).toBe('true');
    expect(symbols(el)[2].tabIndex).toBe(0);
    expect(symbols(el).filter((s) => s.tabIndex === 0)).toHaveLength(1);
    expect(el.querySelector('.ink-rating__group')!.getAttribute('role')).toBe('radiogroup');
    expect(el.querySelector('.ink-label')!.textContent).toBe('Taste');
    expect(symbols(el)[0].querySelector('svg')).not.toBeNull();
  });

  it('picks a rating on click and announces it once', () => {
    const el = mount<HTMLElement & { value: number }>(`<e-rating max="5"></e-rating>`);
    const seen = record(el, 'e-change');
    symbols(el)[3].click();
    expect(el.value).toBe(4);
    expect(el.getAttribute('value')).toBe('4');
    expect(detailsOf(seen)).toEqual([{ value: 4 }]);
    // Selecting the same rating again is not a change.
    symbols(el)[3].click();
    expect(seen).toHaveLength(1);
  });

  it('clears on re-select only with allow-clear', () => {
    const el = mount<HTMLElement & { value: number }>(`<e-rating value="2"></e-rating>`);
    symbols(el)[1].click();
    expect(el.value).toBe(2);
    el.setAttribute('allow-clear', '');
    symbols(el)[1].click();
    expect(el.value).toBe(0);
    expect(symbols(el).every((s) => s.dataset['on'] === undefined)).toBe(true);
  });

  it('is fully keyboard operable', () => {
    const el = mount<HTMLElement & { value: number }>(`<e-rating value="2" max="5"></e-rating>`);
    press(el, 'ArrowRight');
    expect(el.value).toBe(3);
    press(el, 'ArrowLeft');
    press(el, 'ArrowDown');
    expect(el.value).toBe(1);
    press(el, 'End');
    expect(el.value).toBe(5);
    press(el, 'Home');
    expect(el.value).toBe(0);
    press(el, '4');
    expect(el.value).toBe(4);
    // Out-of-range digits clamp, unrelated keys are ignored.
    press(el, '9');
    expect(el.value).toBe(5);
    press(el, 'q');
    expect(el.value).toBe(5);
  });

  it('does not move past its bounds', () => {
    const el = mount<HTMLElement & { value: number }>(`<e-rating value="5" max="5"></e-rating>`);
    press(el, 'ArrowUp');
    expect(el.value).toBe(5);
    el.setAttribute('value', '0');
    press(el, 'ArrowLeft');
    expect(el.value).toBe(0);
  });

  it('ignores input while readonly or disabled', () => {
    const el = mount<HTMLElement & { value: number }>(`<e-rating value="2" readonly></e-rating>`);
    symbols(el)[4].click();
    press(el, 'ArrowRight');
    expect(el.value).toBe(2);
    expect(el.querySelector('.ink-rating__group')!.getAttribute('aria-readonly')).toBe('true');
    el.removeAttribute('readonly');
    el.setAttribute('disabled', '');
    symbols(el)[4].click();
    expect(el.value).toBe(2);
    expect(symbols(el)[0].disabled).toBe(true);
  });

  it('ignores a click that lands beside a symbol', () => {
    const el = mount<HTMLElement & { value: number }>(`<e-rating value="2" max="5"></e-rating>`);
    const changes = record(el, 'e-change');
    // The gap between two 44px targets is still inside the radiogroup, and a
    // gloved tap lands there often enough to matter.
    el.querySelector<HTMLElement>('.ink-rating__group')!.click();
    expect(el.value).toBe(2);
    expect(changes).toHaveLength(0);
  });

  it('rebuilds the row when max or glyph changes and re-clamps the value', () => {
    const el = mount<HTMLElement & { value: number }>(`<e-rating value="5" max="5"></e-rating>`);
    el.setAttribute('max', '3');
    expect(symbols(el)).toHaveLength(3);
    expect(el.value).toBe(3);
    el.setAttribute('glyph', 'smiley');
    expect(el.querySelector('.ink-rating__group')!.getAttribute('data-glyph')).toBe('smiley');
    expect(symbols(el)[0].querySelectorAll('path')).toHaveLength(2);
    el.setAttribute('max', '99');
    expect(symbols(el)).toHaveLength(10);
  });

  it('clamps a value set through the property and exposes it', () => {
    const el = mount<HTMLElement & { value: number }>(`<e-rating max="5"></e-rating>`);
    el.value = 12;
    expect(el.value).toBe(5);
    el.value = -3;
    expect(el.value).toBe(0);
    el.value = Number.NaN;
    expect(el.value).toBe(0);
    el.value = 3.4;
    expect(el.value).toBe(3);
  });

  it('serializes and parses through the base-class contract', () => {
    const el = mount(`<e-rating max="5"></e-rating>`);
    expect(inner(el).serialize(3 as unknown as string)).toBe('3');
    expect(inner(el).serialize(0 as unknown as string)).toBe('');
    expect(inner(el).parse('4')).toBe(4 as unknown as string);
    expect(inner(el).parse('nonsense')).toBe(0 as unknown as string);
  });

  it('updates the label and hint after mount', () => {
    const el = mount(`<e-rating></e-rating>`);
    expect(el.querySelector('.ink-label')!.hasAttribute('hidden')).toBe(true);
    el.setAttribute('label', 'Service');
    el.setAttribute('hint', 'Five is best');
    expect(el.querySelector('.ink-label')!.textContent).toBe('Service');
    expect(el.querySelector('.ink-hint')!.textContent).toBe('Five is best');
    expect(el.querySelector('.ink-rating__group')!.getAttribute('aria-label')).toBe('Service');
  });
});

/* ===================================================================== *
 * e-slider
 * ===================================================================== */

describe('e-slider', () => {
  const range = (el: HTMLElement): HTMLInputElement =>
    el.querySelector<HTMLInputElement>('.ink-slider__input')!;
  const drag = (el: HTMLElement, to: string, type: 'input' | 'change'): void => {
    range(el).value = to;
    range(el).dispatchEvent(new Event(type, { bubbles: true }));
  };

  it('mirrors min, max, step and the value onto the native range', () => {
    const el = mount<HTMLElement & { value: number }>(
      `<e-slider min="10" max="30" step="5" value="20" label="Level" unit="°C"></e-slider>`,
    );
    expect(range(el).min).toBe('10');
    expect(range(el).max).toBe('30');
    expect(range(el).step).toBe('5');
    expect(range(el).value).toBe('20');
    expect(el.value).toBe(20);
    expect(el.querySelector('.ink-slider__value')!.textContent).toBe('20 °C');
    expect(el.querySelector('.ink-slider__scale-min')!.textContent).toBe('10 °C');
    expect(el.querySelector('.ink-slider__scale-max')!.textContent).toBe('30 °C');
    expect(el.querySelector('label.ink-label')!.textContent).toBe('Level');
  });

  it('fires e-input while dragging and e-change on commit', () => {
    const el = mount<HTMLElement & { value: number }>(`<e-slider min="0" max="10"></e-slider>`);
    const inputs = record(el, 'e-input');
    const changes = record(el, 'e-change');
    drag(el, '4', 'input');
    drag(el, '7', 'change');
    expect(detailsOf(inputs)).toEqual([{ value: 4 }]);
    expect(detailsOf(changes)).toEqual([{ value: 7 }]);
    expect(el.value).toBe(7);
    expect(el.querySelector('.ink-slider__value')!.textContent).toBe('7');
  });

  it('clamps values set through the attribute and the property', () => {
    const el = mount<HTMLElement & { value: number }>(
      `<e-slider min="0" max="10" value="99"></e-slider>`,
    );
    expect(el.value).toBe(10);
    el.setAttribute('value', '-5');
    expect(el.value).toBe(0);
    el.value = 6;
    expect(range(el).value).toBe('6');
    el.value = Number.NaN;
    expect(el.value).toBe(0);
  });

  it('repairs an inverted range and a non-positive step', () => {
    const el = mount<HTMLElement & { value: number }>(
      `<e-slider min="10" max="2" step="0" value="10"></e-slider>`,
    );
    expect(range(el).max).toBe('11');
    expect(range(el).step).toBe('1');
  });

  it('draws tick marks only when asked for a sensible number', () => {
    const el = mount(`<e-slider min="0" max="10" ticks="5"></e-slider>`);
    const ticks = el.querySelector<HTMLElement>('.ink-slider__ticks')!;
    expect(ticks.children).toHaveLength(6);
    expect((ticks.children[0] as HTMLElement).style.left).toBe('0%');
    expect((ticks.children[5] as HTMLElement).style.left).toBe('100%');
    el.setAttribute('ticks', '1');
    expect(ticks.children).toHaveLength(0);
    expect(ticks.hasAttribute('hidden')).toBe(true);
    el.setAttribute('ticks', '999');
    expect(ticks.children).toHaveLength(21);
  });

  it('hides the readout and the scale on demand', () => {
    const el = mount(`<e-slider hide-value hide-scale></e-slider>`);
    expect(el.querySelector('.ink-slider__value')!.hasAttribute('hidden')).toBe(true);
    expect(el.querySelector('.ink-slider__scale')!.hasAttribute('hidden')).toBe(true);
    el.removeAttribute('hide-value');
    expect(el.querySelector('.ink-slider__value')!.hasAttribute('hidden')).toBe(false);
  });

  it('labels the native control when no visible label is given', () => {
    const el = mount(`<e-slider aria-label="Contrast"></e-slider>`);
    expect(range(el).getAttribute('aria-label')).toBe('Contrast');
    el.setAttribute('label', 'Contrast');
    expect(range(el).hasAttribute('aria-label')).toBe(false);
    expect(el.querySelector('label.ink-label')!.textContent).toBe('Contrast');
  });

  it('follows disabled and serializes through the base-class contract', () => {
    const el = mount(`<e-slider min="0" max="10" value="5" disabled></e-slider>`);
    expect(range(el).disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(range(el).disabled).toBe(false);
    expect(inner(el).serialize(5 as unknown as string)).toBe('5');
    expect(inner(el).parse('7')).toBe(7 as unknown as string);
    expect(inner(el).parse('nonsense')).toBe(0 as unknown as string);
    inner(el).resetValue();
    expect((el as HTMLElement & { value: number }).value).toBe(0);
  });

  it('escapes a hostile id when building the control markup', () => {
    const el = mount(`<e-slider id="a&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"></e-slider>`);
    expect(el.querySelector('img')).toBeNull();
  });
});

/* ===================================================================== *
 * e-pin-input
 * ===================================================================== */

describe('e-pin-input', () => {
  const boxes = (el: HTMLElement): HTMLInputElement[] => [
    ...el.querySelectorAll<HTMLInputElement>('.ink-pin__box'),
  ];
  const type = (box: HTMLInputElement, text: string): void => {
    box.value = text;
    box.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const keyOn = (box: HTMLInputElement, key: string): void => {
    box.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  };

  it('renders one box per digit and fills them from the value', () => {
    const el = mount<HTMLElement & { value: string }>(
      `<e-pin-input length="4" value="1234" label="PIN"></e-pin-input>`,
    );
    expect(boxes(el).map((b) => b.value)).toEqual(['1', '2', '3', '4']);
    expect(boxes(el)[0].inputMode).toBe('numeric');
    expect(boxes(el)[0].maxLength).toBe(1);
    expect(boxes(el)[0].getAttribute('aria-label')).toBe('Digit 1 of 4');
    expect(boxes(el).every((b) => b.dataset['filled'] === 'true')).toBe(true);
    expect(el.value).toBe('1234');
  });

  it('drops non-digits and truncates to the configured length', () => {
    const el = mount<HTMLElement & { value: string }>(
      `<e-pin-input length="4" value="12ab34567"></e-pin-input>`,
    );
    expect(el.value).toBe('1234');
  });

  it('advances while typing and fires e-input, then e-change when complete', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-pin-input length="3"></e-pin-input>`);
    const inputs = record(el, 'e-input');
    const changes = record(el, 'e-change');
    type(boxes(el)[0], '1');
    expect(document.activeElement).toBe(boxes(el)[1]);
    type(boxes(el)[1], '2');
    expect(changes).toHaveLength(0);
    type(boxes(el)[2], '3');
    expect(detailsOf(inputs)).toEqual([{ value: '1' }, { value: '12' }, { value: '123' }]);
    expect(detailsOf(changes)).toEqual([{ value: '123' }]);
    expect(el.value).toBe('123');
  });

  it('spills a multi-character entry into the following boxes', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-pin-input length="4"></e-pin-input>`);
    type(boxes(el)[0], '12');
    expect(el.value).toBe('12');
    expect(boxes(el).map((b) => b.value)).toEqual(['1', '2', '', '']);
  });

  it('deletes with Backspace and steps back from an empty box', () => {
    const el = mount<HTMLElement & { value: string }>(
      `<e-pin-input length="4" value="12"></e-pin-input>`,
    );
    type(boxes(el)[1], '');
    expect(el.value).toBe('1');
    keyOn(boxes(el)[1], 'Backspace');
    expect(el.value).toBe('');
    expect(document.activeElement).toBe(boxes(el)[0]);
    // Backspace in the first box has nowhere to go.
    keyOn(boxes(el)[0], 'Backspace');
    expect(el.value).toBe('');
  });

  it('moves between boxes with the arrow keys and ignores other keys', () => {
    const el = mount(`<e-pin-input length="3" value="123"></e-pin-input>`);
    boxes(el)[1].focus();
    keyOn(boxes(el)[1], 'ArrowLeft');
    expect(document.activeElement).toBe(boxes(el)[0]);
    keyOn(boxes(el)[0], 'ArrowLeft');
    expect(document.activeElement).toBe(boxes(el)[0]);
    keyOn(boxes(el)[0], 'ArrowRight');
    expect(document.activeElement).toBe(boxes(el)[1]);
    keyOn(boxes(el)[1], 'Enter');
    expect(document.activeElement).toBe(boxes(el)[1]);
  });

  it('fills every box from a pasted code and ignores a paste without digits', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-pin-input length="4"></e-pin-input>`);
    const paste = (text: string): void => {
      const data = new DataTransfer();
      data.setData('text', text);
      boxes(el)[0].dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
      );
    };
    paste('98-76');
    expect(el.value).toBe('9876');
    paste('nope');
    expect(el.value).toBe('9876');
  });

  it('masks the digits without losing the value', () => {
    const el = mount<HTMLElement & { value: string }>(
      `<e-pin-input length="4" value="1234" masked></e-pin-input>`,
    );
    expect(boxes(el).map((b) => b.value)).toEqual(['•', '•', '•', '•']);
    expect(el.value).toBe('1234');
    el.removeAttribute('masked');
    expect(boxes(el).map((b) => b.value)).toEqual(['1', '2', '3', '4']);
  });

  it('rebuilds and re-clamps when the length changes', () => {
    const el = mount<HTMLElement & { value: string }>(
      `<e-pin-input length="6" value="123456"></e-pin-input>`,
    );
    el.setAttribute('length', '4');
    expect(boxes(el)).toHaveLength(4);
    expect(el.value).toBe('1234');
    el.setAttribute('length', '99');
    expect(boxes(el)).toHaveLength(12);
  });

  it('selects the box content on focus and exposes focusNext', () => {
    const el = mount<HTMLElement & { value: string; focusNext(): void }>(
      `<e-pin-input length="4" value="12"></e-pin-input>`,
    );
    el.focusNext();
    expect(document.activeElement).toBe(boxes(el)[2]);
    boxes(el)[0].dispatchEvent(new FocusEvent('focus', { bubbles: false }));
    expect(boxes(el)[0].selectionStart).toBe(0);
    expect(boxes(el)[0].selectionEnd).toBe(1);
    el.value = '1234';
    el.focusNext();
    expect(document.activeElement).toBe(boxes(el)[3]);
  });

  it('follows disabled and the base-class contract', () => {
    const el = mount<HTMLElement & { value: string }>(
      `<e-pin-input length="4" value="12" disabled></e-pin-input>`,
    );
    expect(boxes(el).every((b) => b.disabled)).toBe(true);
    expect(inner(el).serialize('12')).toBe('12');
    expect(inner(el).parse('9a87654')).toBe('9876');
    inner(el).resetValue();
    expect(el.value).toBe('');
  });
});

/* ===================================================================== *
 * e-signature
 * ===================================================================== */

describe('e-pin-input · attribute mutation after mount', () => {
  it('follows label, hint and an externally set value', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-pin-input length="4"></e-pin-input>`);
    el.setAttribute('label', 'PIN');
    el.setAttribute('hint', 'Four digits');
    expect(el.querySelector('.ink-label')!.textContent).toBe('PIN');
    expect(el.querySelector('.ink-hint')!.textContent).toBe('Four digits');

    // A host that re-renders its template writes the attribute rather than the
    // property, so the boxes have to follow it.
    el.setAttribute('value', '12ab7');
    expect(el.value).toBe('127');
    expect([...el.querySelectorAll<HTMLInputElement>('.ink-pin__box')].map((b) => b.value)).toEqual(
      ['1', '2', '7', ''],
    );
  });
});

describe('e-signature', () => {
  const PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const canvasOf = (el: HTMLElement): HTMLCanvasElement =>
    el.querySelector<HTMLCanvasElement>('.ink-signature__canvas')!;
  const stroke = (el: HTMLElement): void => {
    const canvas = canvasOf(el);
    const base = { bubbles: true, cancelable: true, pointerId: 1, clientX: 10, clientY: 10 };
    canvas.dispatchEvent(new PointerEvent('pointerdown', base));
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...base, clientX: 40, clientY: 30 }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...base, clientX: 40, clientY: 30 }));
  };

  it('sizes the pad from its attributes and labels the canvas', () => {
    const el = mount(`<e-signature width="320" height="120" label="Sign here"></e-signature>`);
    const canvas = canvasOf(el);
    expect(canvas.width).toBe(320);
    expect(canvas.height).toBe(120);
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('Sign here');
    expect(el.querySelector('.ink-signature__fallback')!.hasAttribute('hidden')).toBe(true);
    expect(el.querySelector('.ink-btn')!.textContent).toBe('Clear');
  });

  it('clamps the geometry attributes', () => {
    const el = mount(`<e-signature width="1" height="1" pen-width="99"></e-signature>`);
    expect(canvasOf(el).width).toBe(64);
    expect(canvasOf(el).height).toBe(48);
  });

  it('captures a stroke as a PNG data URL and announces it', () => {
    const el = mount<HTMLElement & { value: string; empty: boolean }>(
      `<e-signature></e-signature>`,
    );
    const changes = record(el, 'e-change');
    expect(el.empty).toBe(true);
    stroke(el);
    expect(el.value.startsWith('data:image/png')).toBe(true);
    expect(el.empty).toBe(false);
    expect(changes).toHaveLength(1);
  });

  it('clears the pad, the value and the form entry', () => {
    const el = mount<HTMLElement & { value: string; clear(): void; empty: boolean }>(
      `<e-signature name="sig"></e-signature>`,
    );
    stroke(el);
    const changes = record(el, 'e-change');
    el.clear();
    expect(el.value).toBe('');
    expect(el.empty).toBe(true);
    expect(changes).toHaveLength(1);
    // Clearing an already empty pad is not a change.
    el.clear();
    expect(changes).toHaveLength(1);
  });

  it('erases the pad when the value property is set to an empty string', () => {
    const el = mount<HTMLElement & { value: string; empty: boolean }>(
      `<e-signature name="sig"></e-signature>`,
    );
    stroke(el);
    expect(el.empty).toBe(false);
    const changes = record(el, 'e-change');

    // Assigning the property is a host-side write, not user input, so it
    // wipes the surface without announcing a change.
    el.value = '';
    expect(el.value).toBe('');
    expect(el.empty).toBe(true);
    expect(changes).toHaveLength(0);
  });

  it('ignores pointer input while readonly or disabled', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-signature readonly></e-signature>`);
    stroke(el);
    expect(el.value).toBe('');
    expect(el.getAttribute('data-readonly')).toBe('true');
    el.removeAttribute('readonly');
    el.setAttribute('disabled', '');
    stroke(el);
    expect(el.value).toBe('');
    expect(el.querySelector<HTMLButtonElement>('.ink-btn')!.disabled).toBe(true);
  });

  it('paints an image assigned through the property, and drops it on resize', async () => {
    const el = mount<HTMLElement & { value: string; empty: boolean }>(
      `<e-signature></e-signature>`,
    );
    // A solid square, so "has the image landed on the canvas" is observable:
    // the 1x1 transparent PNG used elsewhere is indistinguishable from a
    // blank pad.
    const source = document.createElement('canvas');
    source.width = 8;
    source.height = 8;
    const sourceCtx = source.getContext('2d')!;
    sourceCtx.fillStyle = '#000';
    sourceCtx.fillRect(0, 0, 8, 8);
    const solid = source.toDataURL('image/png');

    el.value = solid;
    expect(el.value).toBe(solid);
    expect(el.empty).toBe(false);

    // Decoding is asynchronous: poll until the pad actually carries ink,
    // which is what proves the load handler ran rather than just being wired.
    const ctx = canvasOf(el).getContext('2d')!;
    const opaque = (): number => ctx.getImageData(2, 2, 1, 1).data[3];
    for (let i = 0; i < 100 && opaque() === 0; i++) await settle();
    expect(opaque()).toBeGreaterThan(0);

    el.setAttribute('width', '300');
    expect(el.value).toBe('');
    expect(el.empty).toBe(true);
  });

  it('serializes to a File and restores one through parseFile', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-signature name="sig"></e-signature>`);
    const control = inner(el);
    expect(control.serialize('')).toBeNull();
    const file = control.serialize(PNG) as File;
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('sig.png');
    expect(file.size).toBeGreaterThan(0);
    // A value that is not a data URL cannot be turned into a PNG.
    expect(control.serialize('https://example.test/x.png')).toBeNull();

    // `parse` is the string half of the same contract: a restored data URL
    // is its own in-memory value.
    expect(control.parse(PNG)).toBe(PNG);
    expect(control.parse('')).toBe('');

    const restored = new File([new Uint8Array([1, 2, 3])], 'x.png', { type: 'image/png' });
    (el as unknown as { formStateRestoreCallback(s: File): void }).formStateRestoreCallback(
      restored,
    );
    expect(el.value.startsWith('blob:')).toBe(true);
    expect(control.serialize(el.value)).toBe(restored);
  });

  it('updates its texts after mount', () => {
    const el = mount(`<e-signature></e-signature>`);
    el.setAttribute('clear-label', 'Erase');
    el.setAttribute('hint', 'Use a finger');
    el.setAttribute('label', 'Signature');
    expect(el.querySelector('.ink-btn')!.textContent).toBe('Erase');
    expect(el.querySelector('.ink-hint')!.textContent).toBe('Use a finger');
    expect(canvasOf(el).getAttribute('aria-label')).toBe('Signature');
    el.setAttribute('fallback-text', 'No canvas here');
    expect(el.querySelector('.ink-signature__fallback')!.textContent).toBe('No canvas here');
  });

  it('clears through the clear button and a form reset', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-signature></e-signature>`);
    stroke(el);
    el.querySelector<HTMLButtonElement>('.ink-btn')!.click();
    expect(el.value).toBe('');
    stroke(el);
    inner(el).resetValue();
    expect(el.value).toBe('');
  });
});

/* ===================================================================== *
 * e-keypad
 * ===================================================================== */

describe('e-keypad', () => {
  const keys = (el: HTMLElement): HTMLButtonElement[] => [
    ...el.querySelectorAll<HTMLButtonElement>('.ink-keypad__key'),
  ];
  const tap = (el: HTMLElement, label: string): void => {
    keys(el)
      .find((k) => k.dataset['key'] === label)!
      .click();
  };

  it('renders a 3-column numeric layout with clear and backspace', () => {
    const el = mount(`<e-keypad></e-keypad>`);
    expect(keys(el).map((k) => k.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'C',
      '0',
      '⌫',
    ]);
    expect(el.querySelector('.ink-keypad__grid')!.getAttribute('role')).toBe('group');
    expect(keys(el)[9].getAttribute('aria-label')).toBe('Clear');
  });

  it('adds a decimal key on demand, keeping clear reachable', () => {
    const el = mount(`<e-keypad decimal decimal-separator=","></e-keypad>`);
    const labels = keys(el).map((k) => k.textContent);
    expect(labels).toHaveLength(13);
    expect(labels[9]).toBe(',');
    expect(labels.at(-1)).toBe('C');
  });

  it('types, backspaces and clears, announcing every change once', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-keypad></e-keypad>`);
    const changes = record(el, 'e-change');
    tap(el, '4');
    tap(el, '2');
    expect(el.value).toBe('42');
    expect(el.getAttribute('value')).toBe('42');
    tap(el, 'backspace');
    expect(el.value).toBe('4');
    tap(el, 'clear');
    expect(el.value).toBe('');
    expect(detailsOf(changes)).toEqual([
      { value: '4' },
      { value: '42' },
      { value: '4' },
      { value: '' },
    ]);
    // Clearing an empty keypad changes nothing.
    tap(el, 'clear');
    expect(changes).toHaveLength(4);
  });

  it('stops at max-length', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-keypad max-length="2"></e-keypad>`);
    tap(el, '1');
    tap(el, '2');
    tap(el, '3');
    expect(el.value).toBe('12');
  });

  it('types into the control named by `for`', () => {
    const wrap = mount(
      `<div><e-input id="qty" value=""></e-input><e-keypad for="qty"></e-keypad></div>`,
    );
    const keypad = wrap.querySelector<HTMLElement & { value: string; control: HTMLElement | null }>(
      'e-keypad',
    )!;
    const target = wrap.querySelector<HTMLElement & { value: string }>('e-input')!;
    expect(keypad.control).toBe(target);
    tap(keypad, '7');
    tap(keypad, '5');
    expect(target.value).toBe('75');
    expect(target.querySelector('input')!.value).toBe('75');
    keypad.setAttribute('for', 'missing');
    expect(keypad.control).toBeNull();
    tap(keypad, '1');
    expect(target.value).toBe('75');
  });

  it('shows its own readout only when asked', () => {
    const el = mount(`<e-keypad show-display value="12"></e-keypad>`);
    const display = el.querySelector('.ink-keypad__display')!;
    expect(display.hasAttribute('hidden')).toBe(false);
    expect(display.textContent).toBe('12');
    el.removeAttribute('show-display');
    expect(display.hasAttribute('hidden')).toBe(true);
  });

  it('follows disabled and the base-class contract', () => {
    const el = mount<HTMLElement & { value: string; press(k: string): void }>(
      `<e-keypad value="9" disabled></e-keypad>`,
    );
    expect(keys(el).every((k) => k.disabled)).toBe(true);
    tap(el, '1');
    expect(el.value).toBe('9');
    // The API still works while the UI is disabled.
    el.press('8');
    expect(el.value).toBe('98');
    el.removeAttribute('disabled');
    expect(keys(el).some((k) => k.disabled)).toBe(false);
    expect(inner(el).serialize('98')).toBe('98');
    expect(inner(el).parse('123456')).toBe('123456');
    inner(el).resetValue();
    expect(el.value).toBe('');
  });

  it('updates the label and hint after mount', () => {
    const el = mount(`<e-keypad></e-keypad>`);
    el.setAttribute('label', 'Quantity');
    el.setAttribute('hint', 'Digits only');
    expect(el.querySelector('.ink-label')!.textContent).toBe('Quantity');
    expect(el.querySelector('.ink-hint')!.textContent).toBe('Digits only');
    expect(el.querySelector('.ink-keypad__grid')!.getAttribute('aria-label')).toBe('Quantity');
  });

  it('rebuilds the pad when the layout attributes change', () => {
    const el = mount(`<e-keypad disabled></e-keypad>`);
    expect(keys(el).map((k) => k.dataset['key'])).not.toContain('.');

    el.setAttribute('decimal', '');
    el.setAttribute('decimal-separator', ',');
    el.setAttribute('clear-label', 'Leeren');
    el.setAttribute('backspace-label', 'Zurück');
    const rebuilt = keys(el);
    expect(rebuilt.map((k) => k.dataset['key'])).toContain(',');
    expect(rebuilt.find((k) => k.dataset['kind'] === 'clear')!.textContent).toBe('Leeren');
    expect(rebuilt.find((k) => k.dataset['kind'] === 'backspace')!.textContent).toBe('Zurück');
    // A rebuild must not hand a disabled pad back as enabled.
    expect(rebuilt.every((k) => k.disabled)).toBe(true);
  });

  it('follows an externally set value attribute', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-keypad show-display></e-keypad>`);
    // A host that re-renders its template writes the attribute, not the
    // property; the readout has to follow it.
    el.setAttribute('value', '4711');
    expect(el.value).toBe('4711');
    expect(el.querySelector('.ink-keypad__display')!.textContent).toBe('4711');
  });

  it('ignores a tap that lands between the keys', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-keypad value="9"></e-keypad>`);
    const changes = record(el, 'e-change');
    el.querySelector<HTMLElement>('.ink-keypad__grid')!.click();
    expect(el.value).toBe('9');
    expect(changes).toHaveLength(0);
  });

  it('leaves the `for` target alone when it already holds the value', () => {
    const wrap = mount(
      `<div><e-input id="qty2" value=""></e-input><e-keypad for="qty2"></e-keypad></div>`,
    );
    const keypad = wrap.querySelector<HTMLElement & { press(k: string): void }>('e-keypad')!;
    const target = wrap.querySelector<HTMLElement & { value: string }>('e-input')!;
    const seen: string[] = [];
    target.addEventListener('input', () => seen.push(target.value));
    target.value = '5';
    keypad.press('5');
    expect(target.value).toBe('5');
    // Same value: no echo back into the control, so no repaint of its box.
    expect(seen).toHaveLength(0);
  });

  it('accepts a value before it is connected', () => {
    const el = document.createElement('e-keypad') as HTMLElement & {
      value: string;
      press(k: string): void;
    };
    el.setAttribute('show-display', '');
    // `press` reflects into the `value` attribute, so the state survives the
    // upgrade that `connectedCallback` performs when the element lands.
    el.press('7');
    el.press('3');
    expect(el.value).toBe('73');

    const host = mount(`<div></div>`);
    host.appendChild(el);
    expect(el.querySelector('.ink-keypad__display')!.textContent).toBe('73');
  });
});

/* ===================================================================== *
 * v2.0.0 — form reset, and the phantom radio field
 *
 * `form.reset()` resets the native controls a component renders *before* the
 * component's own `formResetCallback` runs. Where the reset target was the
 * value the host attribute already carried, nothing re-asserted the rendered
 * state and the two drifted apart: a box drawn checked that submitted nothing,
 * a radio group with no visible selection that submitted one anyway.
 * ===================================================================== */

describe('form reset re-asserts the rendered state (v2.0.0)', () => {
  const inForm = (html: string): { form: HTMLFormElement; el: HTMLElement } => {
    const form = mount<HTMLFormElement>(`<form>${html}</form>`);
    return { form, el: form.firstElementChild as HTMLElement };
  };

  it('e-checkbox: unchecking a declared-checked box and resetting restores both halves', () => {
    const { form, el } = inForm('<e-checkbox name="d" checked default-checked></e-checkbox>');
    const box = el.querySelector('input')!;
    box.click();
    expect(new FormData(form).get('d')).toBeNull();

    form.reset();
    expect(box.checked).toBe(true);
    expect((el as HTMLElement & { checked: boolean }).checked).toBe(true);
    expect(new FormData(form).get('d')).toBe('on');
  });

  it('e-checkbox: resetting to an unchecked default clears the rendered box', () => {
    const { form, el } = inForm('<e-checkbox name="d"></e-checkbox>');
    const box = el.querySelector('input')!;
    box.click();
    expect(new FormData(form).get('d')).toBe('on');

    form.reset();
    expect(box.checked).toBe(false);
    expect(new FormData(form).get('d')).toBeNull();
  });

  it('e-toggle: the ON/OFF pip follows a reset that does not move the attribute', () => {
    const { form, el } = inForm('<e-toggle name="t" checked default-checked></e-toggle>');
    const box = el.querySelector('input')!;
    box.click();
    form.reset();
    expect(box.checked).toBe(true);
    expect(el.querySelector('.ink-toggle__state')!.textContent).toBe('ON');
    expect(new FormData(form).get('t')).toBe('on');
  });

  it('checked="false" and the property setter agree', () => {
    const el = mount<HTMLElement & { checked: boolean }>(
      '<e-checkbox checked="false"></e-checkbox>',
    );
    expect(el.checked).toBe(false);
    el.checked = true;
    expect(el.checked).toBe(true);
    expect(el.querySelector('input')!.checked).toBe(true);
    expect(el.getAttribute('checked')).toBe('');
  });

  it('e-radio-group: resetting to the value it already carries re-checks the row', () => {
    const { form, el } = inForm(`<e-radio-group name="g" value="a" default-value="a">
        <e-radio value="a" label="A"></e-radio>
        <e-radio value="b" label="B"></e-radio>
      </e-radio-group>`);
    const radios = [...el.querySelectorAll('input')];
    radios[1]!.click();
    expect(new FormData(form).get('g')).toBe('b');

    form.reset();
    expect(radios.map((r) => r.checked)).toEqual([true, false]);
    expect(new FormData(form).get('g')).toBe('a');
  });

  it('e-radio-group: submits one field, not a second under an internal name', () => {
    const { form, el } = inForm(`<e-radio-group name="g" value="a">
        <e-radio value="a" label="A"></e-radio>
        <e-radio value="b" label="B"></e-radio>
      </e-radio-group>`);
    expect([...new FormData(form).keys()]).toEqual(['g']);
    // The rendered radios keep a shared name so the browser still groups them.
    const names = new Set([...el.querySelectorAll('input')].map((r) => r.name));
    expect(names.size).toBe(1);
    expect([...names][0]).not.toBe('g');
  });

  it('e-checkbox-group: resetting to the value it already carries re-checks the rows', () => {
    const { form, el } = inForm(`<e-checkbox-group name="t" value="a" default-value="a">
        <e-cbox-option value="a" label="A"></e-cbox-option>
        <e-cbox-option value="b" label="B"></e-cbox-option>
      </e-checkbox-group>`);
    const boxes = [...el.querySelectorAll('input')];
    boxes[1]!.click();
    expect(new FormData(form).getAll('t')).toEqual(['a', 'b']);

    form.reset();
    expect(boxes.map((b) => b.checked)).toEqual([true, false]);
    expect(new FormData(form).getAll('t')).toEqual(['a']);
  });
});

describe('e-keypad · mirroring into a library control (v2.0.0)', () => {
  it('fires the target control own events, not just its value', () => {
    const wrap = mount(`<div>
        <e-input id="kp-target" name="qty"></e-input>
        <e-keypad for="kp-target"></e-keypad>
      </div>`);
    const target = wrap.querySelector<HTMLElement & { value: string }>('e-input')!;
    const keypad = wrap.querySelector<HTMLElement & { press(key: string): void }>('e-keypad')!;
    const changes: string[] = [];
    const inputs: string[] = [];
    target.addEventListener('e-change', (e) => changes.push((e as CustomEvent).detail.value));
    target.addEventListener('e-input', (e) => inputs.push((e as CustomEvent).detail.value));

    keypad.press('4');
    keypad.press('2');

    expect(target.querySelector('input')!.value).toBe('42');
    expect(target.value).toBe('42');
    expect(inputs).toEqual(['4', '42']);
    expect(changes).toEqual(['4', '42']);
  });
});
