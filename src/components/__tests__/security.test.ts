// XSS surface tests: ensure that user-supplied attribute values are never
// rendered as raw HTML inside component templates.
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(async () => {
  await import('../date-picker');
  await import('../time-picker');
  await import('../calendar');
  await import('../cascader');
  await import('../tree-select');
  await import('../input');
  await import('../select');
  await import('../textarea');
  await import('../input-number');
  await import('../checkbox-group');
  await import('../upload');
  await import('../alert');
  await import('../dialog');
  await import('../popover');
  await import('../collapse');
  await import('../tree');
});

const mount = (html: string): HTMLElement => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild as HTMLElement;
};

const XSS_PAYLOADS = [
  '<img src=x onerror=alert(1)>',
  '<script>alert(1)</script>',
  '<svg onload=alert(1)>',
];

describe('XSS prevention', () => {
  for (const payload of XSS_PAYLOADS) {
    it(`e-date-picker value does not inject HTML: ${payload.slice(0, 30)}`, () => {
      const el = mount(
        `<e-date-picker value="${payload.replace(/"/g, '&quot;')}"></e-date-picker>`,
      );
      expect(el.querySelector('img[onerror]')).toBeNull();
      expect(el.querySelector('script')).toBeNull();
      expect(el.querySelector('svg[onload]')).toBeNull();
      el.remove();
    });

    it(`e-date-picker placeholder does not inject HTML: ${payload.slice(0, 30)}`, () => {
      const el = mount(
        `<e-date-picker placeholder="${payload.replace(/"/g, '&quot;')}"></e-date-picker>`,
      );
      expect(el.querySelector('img[onerror]')).toBeNull();
      expect(el.querySelector('script')).toBeNull();
      expect(el.querySelector('svg[onload]')).toBeNull();
      el.remove();
    });
  }

  it('e-input escapes value attribute', () => {
    const el = mount(`<e-input value="<img src=x onerror=alert(1)>"></e-input>`);
    expect(el.querySelector('img[onerror]')).toBeNull();
    el.remove();
  });

  it('e-input escapes placeholder attribute', () => {
    const el = mount(`<e-input placeholder="<script>alert(1)</script>"></e-input>`);
    expect(el.querySelector('script')).toBeNull();
    el.remove();
  });

  it('e-select escapes placeholder attribute', () => {
    const el = mount(
      `<e-select placeholder="<img src=x onerror=alert(1)>">
        <e-option value="a" label="A"></e-option>
      </e-select>`,
    );
    expect(el.querySelector('img[onerror]')).toBeNull();
    el.remove();
  });

  it('e-input escapes label attribute', () => {
    const el = mount(`<e-input label="<img src=x onerror=alert(1)>"></e-input>`);
    expect(el.querySelector('img[onerror]')).toBeNull();
    el.remove();
  });

  it('e-input escapes hint attribute', () => {
    const el = mount(`<e-input hint="<svg onload=alert(1)>"></e-input>`);
    expect(el.querySelector('svg[onload]')).toBeNull();
    el.remove();
  });

  it('e-textarea escapes value attribute', () => {
    const el = mount(`<e-textarea value="<img src=x onerror=alert(1)>"></e-textarea>`);
    expect(el.querySelector('img[onerror]')).toBeNull();
    el.remove();
  });

  it('e-textarea escapes placeholder attribute', () => {
    const el = mount(`<e-textarea placeholder="<script>alert(1)</script>"></e-textarea>`);
    expect(el.querySelector('script')).toBeNull();
    el.remove();
  });

  it('e-cascader escapes labels in option JSON', () => {
    const opts = JSON.stringify([{ value: 'a', label: '<img src=x onerror=alert(1)>' }]);
    const el = mount(`<e-cascader options='${opts}' value="a"></e-cascader>`);
    // The label is set via textContent in the cascader build; ensure no
    // raw HTML node was injected.
    expect(el.querySelector('img[onerror]')).toBeNull();
    el.remove();
  });

  it('e-tree-select escapes labels in data JSON', () => {
    const data = JSON.stringify([{ value: 'a', label: '<img src=x onerror=alert(1)>' }]);
    const el = mount(`<e-tree-select data='${data}' value="a"></e-tree-select>`);
    expect(el.querySelector('img[onerror]')).toBeNull();
    el.remove();
  });

  it('e-upload escapes accept attribute', () => {
    const el = mount(`<e-upload accept="<img src=x onerror=alert(1)>"></e-upload>`);
    expect(el.querySelector('img[onerror]')).toBeNull();
    el.remove();
  });

  for (const payload of XSS_PAYLOADS) {
    it(`e-alert heading does not inject HTML: ${payload.slice(0, 30)}`, () => {
      const el = mount(`<e-alert heading="${payload.replace(/"/g, '&quot;')}"></e-alert>`);
      expect(el.querySelector('img[onerror]')).toBeNull();
      expect(el.querySelector('script')).toBeNull();
      expect(el.querySelector('svg[onload]')).toBeNull();
      expect(el.querySelector('.ink-alert__heading')!.textContent).toBe(payload);
    });

    it(`e-dialog heading does not inject HTML: ${payload.slice(0, 30)}`, () => {
      const el = mount(`<e-dialog heading="${payload.replace(/"/g, '&quot;')}"></e-dialog>`);
      expect(el.querySelector('img[onerror]')).toBeNull();
      expect(el.querySelector('script')).toBeNull();
      expect(el.querySelector('svg[onload]')).toBeNull();
      expect(el.querySelector('.ink-dialog__title')!.textContent).toBe(payload);
    });

    it(`e-popover heading does not inject HTML: ${payload.slice(0, 30)}`, () => {
      const el = mount(`<e-popover heading="${payload.replace(/"/g, '&quot;')}"></e-popover>`);
      expect(el.querySelector('img[onerror]')).toBeNull();
      expect(el.querySelector('script')).toBeNull();
      expect(el.querySelector('svg[onload]')).toBeNull();
      expect(el.querySelector('.ink-popover__heading')!.textContent).toBe(payload);
    });

    it(`e-popconfirm message and labels do not inject HTML: ${payload.slice(0, 30)}`, () => {
      const escaped = payload.replace(/"/g, '&quot;');
      const el = mount(
        `<e-popconfirm message="${escaped}" confirm-label="${escaped}" cancel-label="${escaped}"></e-popconfirm>`,
      );
      expect(el.querySelector('img[onerror]')).toBeNull();
      expect(el.querySelector('script')).toBeNull();
      expect(el.querySelector('svg[onload]')).toBeNull();
      expect(el.querySelector('.ink-popconfirm__message')!.textContent).toBe(payload);
      expect(el.querySelector('.ink-popconfirm__confirm')!.textContent).toBe(payload);
    });

    it(`e-collapse heading does not inject HTML: ${payload.slice(0, 30)}`, () => {
      const el = mount(
        `<e-collapse><e-collapse-panel key="a" heading="${payload.replace(/"/g, '&quot;')}">b</e-collapse-panel></e-collapse>`,
      );
      expect(el.querySelector('img[onerror]')).toBeNull();
      expect(el.querySelector('script')).toBeNull();
      expect(el.querySelector('svg[onload]')).toBeNull();
      expect(el.querySelector('.ink-collapse__heading')!.textContent).toBe(payload);
    });

    it(`e-tree labels do not inject HTML: ${payload.slice(0, 30)}`, () => {
      const data = JSON.stringify([{ value: 'a', label: payload }]).replace(/"/g, '&quot;');
      const el = mount(`<e-tree data="${data}"></e-tree>`);
      expect(el.querySelector('img[onerror]')).toBeNull();
      expect(el.querySelector('script')).toBeNull();
      expect(el.querySelector('svg[onload]')).toBeNull();
      expect(el.querySelector('.ink-tree__label')!.textContent).toBe(payload);
    });
  }
});
