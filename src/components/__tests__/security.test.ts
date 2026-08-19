// XSS surface tests: ensure that user-supplied attribute values are never
// rendered as raw HTML inside component templates.
//
// Two layers:
//   1. Hand-written cases below, kept for the components whose escaping
//      needed an assertion more specific than "no injected node appeared"
//      (e.g. verifying the escaped text still round-trips through
//      `textContent`, or that a JSON-encoded label was escaped).
//   2. An automated sweep at the bottom that discovers every component file
//      with an `innerHTML = \`...${...}\`` template (via `import.meta.glob`
//      raw source) and every `@attr {string}` it documents, then mounts each
//      with an XSS payload in that attribute. New components pick this up
//      for free — nothing here needs to be hand-maintained per component.
/// <reference types="vite/client" />
import { describe, it, expect, beforeAll } from 'vitest';

// Side-effect import every component module so its custom element is
// registered. Using a glob instead of a fixed list means a newly added
// component is automatically covered by the sweep below without anyone
// having to remember to add an import here.
const componentModules = import.meta.glob<Record<string, unknown>>('../*.ts');
// Raw source text of the same files, used only to statically derive which
// components interpolate into `innerHTML` and which attributes they accept.
const componentSources = import.meta.glob<string>('../*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

beforeAll(async () => {
  await Promise.all(Object.values(componentModules).map((load) => load()));
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

/** Asserts none of the standard payload markers made it into the rendered subtree. */
const expectNoInjection = (el: HTMLElement | null): void => {
  expect(el?.querySelector('img[onerror]') ?? null).toBeNull();
  expect(el?.querySelector('script') ?? null).toBeNull();
  expect(el?.querySelector('svg[onload]') ?? null).toBeNull();
};

describe('XSS prevention', () => {
  for (const payload of XSS_PAYLOADS) {
    it(`e-date-picker value does not inject HTML: ${payload.slice(0, 30)}`, () => {
      const el = mount(
        `<e-date-picker value="${payload.replace(/"/g, '&quot;')}"></e-date-picker>`,
      );
      expectNoInjection(el);
      el.remove();
    });

    it(`e-date-picker placeholder does not inject HTML: ${payload.slice(0, 30)}`, () => {
      const el = mount(
        `<e-date-picker placeholder="${payload.replace(/"/g, '&quot;')}"></e-date-picker>`,
      );
      expectNoInjection(el);
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
      expectNoInjection(el);
      expect(el.querySelector('.ink-alert__heading')!.textContent).toBe(payload);
    });

    it(`e-dialog heading does not inject HTML: ${payload.slice(0, 30)}`, () => {
      const el = mount(`<e-dialog heading="${payload.replace(/"/g, '&quot;')}"></e-dialog>`);
      expectNoInjection(el);
      expect(el.querySelector('.ink-dialog__title')!.textContent).toBe(payload);
    });

    it(`e-popover heading does not inject HTML: ${payload.slice(0, 30)}`, () => {
      const el = mount(`<e-popover heading="${payload.replace(/"/g, '&quot;')}"></e-popover>`);
      expectNoInjection(el);
      expect(el.querySelector('.ink-popover__heading')!.textContent).toBe(payload);
    });

    it(`e-popconfirm message and labels do not inject HTML: ${payload.slice(0, 30)}`, () => {
      const escaped = payload.replace(/"/g, '&quot;');
      const el = mount(
        `<e-popconfirm message="${escaped}" confirm-label="${escaped}" cancel-label="${escaped}"></e-popconfirm>`,
      );
      expectNoInjection(el);
      expect(el.querySelector('.ink-popconfirm__message')!.textContent).toBe(payload);
      expect(el.querySelector('.ink-popconfirm__confirm')!.textContent).toBe(payload);
    });

    it(`e-collapse heading does not inject HTML: ${payload.slice(0, 30)}`, () => {
      const el = mount(
        `<e-collapse><e-collapse-panel key="a" heading="${payload.replace(/"/g, '&quot;')}">b</e-collapse-panel></e-collapse>`,
      );
      expectNoInjection(el);
      expect(el.querySelector('.ink-collapse__heading')!.textContent).toBe(payload);
    });

    it(`e-tree labels do not inject HTML: ${payload.slice(0, 30)}`, () => {
      const data = JSON.stringify([{ value: 'a', label: payload }]).replace(/"/g, '&quot;');
      const el = mount(`<e-tree data="${data}"></e-tree>`);
      expectNoInjection(el);
      expect(el.querySelector('.ink-tree__label')!.textContent).toBe(payload);
    });
  }
});

// ---------------------------------------------------------------------------
// Automated sweep: every component that interpolates into `innerHTML` gets
// every `@attr {string}` it documents fuzzed with each payload above. This
// doesn't replace the curated cases (which assert exact escaped text lands
// in a specific node); it's a net under them so a *new* component that adds
// an `innerHTML` template with a raw `${attr}` doesn't ship untested. The
// ESLint rule `local/no-unescaped-innerhtml` catches the same class of bug
// at lint time — this is the runtime backstop.
// ---------------------------------------------------------------------------

interface SweepTarget {
  tag: string;
  attrs: string[];
}

function discoverSweepTargets(): SweepTarget[] {
  const targets: SweepTarget[] = [];
  for (const source of Object.values(componentSources)) {
    // A file may define more than one custom element — e.g. popover.ts
    // defines both `<e-popover>` and `<e-popconfirm>`, each with its own
    // JSDoc and its own `innerHTML` template. Split the source at each
    // `define()` call: everything from the end of the previous `define()`
    // (or the start of the file) up to and including a given `define()`
    // call belongs to *that* call's component, since a component's JSDoc
    // and class body always precede its own `define()`. This keeps a later
    // component's template from being missed (attributed only to the
    // file's first tag) and keeps an earlier component's attrs from
    // leaking into a later one.
    const defineMatches = [...source.matchAll(/define\(\s*'([\w-]+)'\s*,\s*\w+\s*\)/g)];
    let prevEnd = 0;
    for (const match of defineMatches) {
      const end = match.index! + match[0].length;
      const segment = source.slice(prevEnd, end);
      prevEnd = end;

      // Matches `something.innerHTML = \`...${` — a template literal
      // assignment with at least one interpolation. Static templates with
      // no `${}` (nothing to escape) and non-template assignments (e.g.
      // `el.innerHTML = iconSvg(...)`) don't match and are skipped.
      if (!/\.innerHTML\s*=\s*`[^`]*\$\{/.test(segment)) continue;

      const tag = match[1]!;
      const attrs = [...segment.matchAll(/@attr\s+\{string\}\s+\[?([\w-]+)/g)].map((m) => m[1]!);
      if (attrs.length === 0) continue;

      targets.push({ tag, attrs: [...new Set(attrs)] });
    }
  }
  return targets;
}

describe('XSS prevention — automated attribute sweep', () => {
  for (const { tag, attrs } of discoverSweepTargets()) {
    for (const attr of attrs) {
      for (const payload of XSS_PAYLOADS) {
        it(`${tag}[${attr}] does not inject HTML: ${payload.slice(0, 30)}`, () => {
          const escaped = payload.replace(/"/g, '&quot;');
          const el = mount(`<${tag} ${attr}="${escaped}"></${tag}>`);
          expectNoInjection(el);
          el?.remove();
        });
      }
    }
  }
});
