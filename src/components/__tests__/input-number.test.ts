import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(async () => {
  await import('../input-number');
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

type InputNumberElement = HTMLElement & {
  value: string;
  checkValidity(): boolean;
};

const mount = (attributes = ''): InputNumberElement => {
  const element = document.createElement('e-input-number') as InputNumberElement;
  for (const [name, value] of Object.entries(attributesFromString(attributes))) {
    element.setAttribute(name, value);
  }
  document.body.appendChild(element);
  return element;
};

const attributesFromString = (source: string): Record<string, string> => {
  const probe = document.createElement('div');
  probe.innerHTML = `<i ${source}></i>`;
  return Object.fromEntries(
    [...probe.firstElementChild!.attributes].map(({ name, value }) => [name, value]),
  );
};

const controls = (element: InputNumberElement) => ({
  input: element.querySelector<HTMLInputElement>('input')!,
  decrement: element.querySelector<HTMLButtonElement>('[data-step="-1"]')!,
  increment: element.querySelector<HTMLButtonElement>('[data-step="1"]')!,
});

describe('e-input-number stepping', () => {
  it('increments when the visible plus icon itself is clicked', () => {
    const element = mount('value="1"');
    const { increment } = controls(element);
    increment.querySelector('svg')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(element.value).toBe('2');
    expect(element.getAttribute('value')).toBe('2');
  });

  it('increments and decrements by decimal steps', () => {
    const element = mount('value="1.5" step="0.25"');
    const { increment, decrement } = controls(element);
    increment.click();
    expect(element.value).toBe('1.75');
    decrement.click();
    expect(element.value).toBe('1.5');
  });

  it('starts an empty bounded input at the appropriate bound', () => {
    const element = mount('min="5" max="10" step="2"');
    const { increment, decrement } = controls(element);
    increment.click();
    expect(element.value).toBe('5');
    element.value = '';
    decrement.click();
    expect(element.value).toBe('10');
  });

  it('clamps at min and max without emitting fake changes', () => {
    const element = mount('value="9" min="0" max="10" step="2"');
    const listener = vi.fn();
    element.addEventListener('e-change', listener);
    const { increment, decrement } = controls(element);
    increment.click();
    expect(element.value).toBe('10');
    expect(listener).toHaveBeenCalledOnce();
    increment.click();
    expect(element.value).toBe('10');
    expect(listener).toHaveBeenCalledOnce();
    element.value = '0';
    decrement.click();
    expect(element.value).toBe('0');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('emits one bubbling numeric change with the committed value', () => {
    const element = mount('value="3" step="2"');
    const listener = vi.fn();
    document.body.addEventListener('e-change', listener, { once: true });
    controls(element).increment.click();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail).toEqual({ value: 5 });
  });

  it('repeats while held and stops immediately on mouseup', () => {
    vi.useFakeTimers();
    const element = mount('value="0"');
    const { increment } = controls(element);
    increment.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    vi.advanceTimersByTime(399);
    expect(element.value).toBe('0');
    vi.advanceTimersByTime(401);
    expect(Number(element.value)).toBeGreaterThan(0);
    increment.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const stoppedAt = element.value;
    vi.advanceTimersByTime(1000);
    expect(element.value).toBe(stoppedAt);
  });

  it('cancels press-and-hold work when disconnected', () => {
    vi.useFakeTimers();
    const element = mount('value="0"');
    controls(element).increment.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    element.remove();
    vi.advanceTimersByTime(1000);
    expect(element.value).toBe('0');
  });

  it('does not duplicate click listeners after repeated reconnects', () => {
    const element = mount('value="0"');
    for (let index = 0; index < 3; index++) {
      element.remove();
      document.body.appendChild(element);
    }
    controls(element).increment.click();
    expect(element.value).toBe('1');
  });
});

describe('e-input-number defensive attributes', () => {
  it('normalizes invalid, zero, negative, and infinite steps', () => {
    for (const step of ['invalid', '0', '-2', 'Infinity']) {
      const element = mount(`value="1" step="${step}"`);
      expect(controls(element).input.step).toBe('1');
      controls(element).increment.click();
      expect(element.value).toBe('2');
      element.remove();
    }
  });

  it('removes invalid bounds from the native control', () => {
    const element = mount('min="invalid" max="Infinity"');
    const { input } = controls(element);
    expect(input.hasAttribute('min')).toBe(false);
    expect(input.hasAttribute('max')).toBe(false);
    element.setAttribute('min', '-2.5');
    element.setAttribute('max', '4.5');
    expect(input.min).toBe('-2.5');
    expect(input.max).toBe('4.5');
  });

  it('does not throw when author constraints are temporarily inconsistent', () => {
    const element = mount('value="5" min="10" max="0"');
    expect(() => controls(element).increment.click()).not.toThrow();
    expect(() => controls(element).decrement.click()).not.toThrow();
    expect(element.value).toBe('5');
  });

  it('keeps the public value property, attribute, and native input synchronized', () => {
    const element = mount('value="2"');
    const { input } = controls(element);
    element.value = '7';
    expect(element.getAttribute('value')).toBe('7');
    expect(input.value).toBe('7');
    input.value = '4';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(element.value).toBe('4');
    expect(element.getAttribute('value')).toBe('4');
  });

  it('reacts to accessible-label addition, changes, and removal', () => {
    const element = mount();
    const { input } = controls(element);
    expect(input.hasAttribute('aria-label')).toBe(false);
    element.setAttribute('aria-label', 'Quantity');
    expect(input.getAttribute('aria-label')).toBe('Quantity');
    element.setAttribute('aria-label', 'Items');
    expect(input.getAttribute('aria-label')).toBe('Items');
    element.removeAttribute('aria-label');
    expect(input.hasAttribute('aria-label')).toBe(false);
  });

  it('disables every interactive part and ignores synthetic events', () => {
    const element = mount('value="2" disabled');
    const listener = vi.fn();
    element.addEventListener('e-change', listener);
    const { input, increment, decrement } = controls(element);
    expect(input.disabled).toBe(true);
    expect(increment.disabled).toBe(true);
    expect(decrement.disabled).toBe(true);
    increment.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    input.value = '8';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(element.value).toBe('2');
    expect(listener).not.toHaveBeenCalled();
  });

  it('becomes interactive again when disabled is removed', () => {
    const element = mount('value="2" disabled');
    element.removeAttribute('disabled');
    const { input, increment, decrement } = controls(element);
    expect(input.disabled).toBe(false);
    expect(increment.disabled).toBe(false);
    expect(decrement.disabled).toBe(false);
    increment.click();
    expect(element.value).toBe('3');
  });
});
