// Behavioural tests for the layout/decoration family.
//
// Each block sets an attribute before mount, then mutates it
// (add -> change -> remove) after mount and asserts the resulting DOM at
// every step, plus the clamping rules, the build-once `_wired` latches and
// the escaping contract.
//
// Assertions marked `QUIRK:` pin current behaviour that looks wrong, so a
// future fix surfaces as a failing test rather than as silent drift.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

beforeAll(async () => {
  await import('../badge-count');
  await import('../breadcrumb');
  await import('../flex');
  await import('../grid');
  await import('../icon');
  await import('../link');
  await import('../masonry');
  await import('../ribbon');
  await import('../space');
  await import('../form');
  await import('../layout');
  await import('../kaleido');
  await import('../watermark');
  await import('../badge');
  await import('../tag');
  await import('../chip');
  await import('../card');
  await import('../card-image');
  await import('../description-list');
  await import('../timeline');
  await import('../diff');
  await import('../button');
});

const mounted: HTMLElement[] = [];

const mount = <T extends HTMLElement = HTMLElement>(html: string): T => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  mounted.push(wrap);
  return wrap.firstElementChild as T;
};

afterEach(() => {
  for (const wrap of mounted.splice(0)) wrap.remove();
});

/** Detach and re-append in place — exercises the build-once `_wired` latches. */
const remount = (el: HTMLElement): void => {
  const parent = el.parentElement!;
  el.remove();
  parent.appendChild(el);
};

/** Collect every dispatched event of `type` so the detail shape can be asserted. */
const listen = <T>(el: HTMLElement, type: string): Array<CustomEvent<T>> => {
  const seen: Array<CustomEvent<T>> = [];
  el.addEventListener(type, (e) => seen.push(e as CustomEvent<T>));
  return seen;
};

/** `<e-button>`'s public surface (`form` getter, `type` accessor pair). */
interface ButtonLike extends HTMLElement {
  type: 'button' | 'submit' | 'reset';
  readonly form: HTMLFormElement | null;
}

/* ===================================================================== *
 * e-badge-count
 * ===================================================================== */

describe('e-badge-count', () => {
  const chip = (el: HTMLElement): HTMLElement | null =>
    el.querySelector('.ink-badge-count__num, .ink-badge-count__dot');

  it('wraps slotted content and appends the chip last', () => {
    const el = mount('<e-badge-count count="3">Inbox</e-badge-count>');
    const wrap = el.firstElementChild as HTMLElement;
    expect(el.children.length).toBe(1);
    expect(wrap.tagName).toBe('SPAN');
    expect(wrap.className).toBe('ink-badge-count');
    expect(wrap.firstChild!.textContent).toBe('Inbox');
    expect(wrap.lastElementChild!.className).toBe('ink-badge-count__num');
    expect(wrap.lastElementChild!.textContent).toBe('3');
  });

  it('hides the chip entirely when count is 0 and dot is absent', () => {
    const el = mount('<e-badge-count count="0">x</e-badge-count>');
    expect(chip(el)).toBeNull();
    expect(el.querySelector('.ink-badge-count')!.children.length).toBe(0);
  });

  it('adds, updates and removes the chip as count changes after mount', () => {
    const el = mount('<e-badge-count>x</e-badge-count>');
    expect(chip(el)).toBeNull();
    el.setAttribute('count', '2');
    expect(chip(el)!.textContent).toBe('2');
    el.setAttribute('count', '7');
    expect(chip(el)!.textContent).toBe('7');
    el.removeAttribute('count');
    expect(chip(el)).toBeNull();
  });

  it('clamps count over max to "<max>+" and keeps equality un-clamped', () => {
    const el = mount('<e-badge-count count="150" max="99">x</e-badge-count>');
    expect(chip(el)!.textContent).toBe('99+');
    el.setAttribute('count', '99');
    expect(chip(el)!.textContent).toBe('99');
    el.setAttribute('count', '100');
    expect(chip(el)!.textContent).toBe('99+');
  });

  it('supports max="0" producing "0+"', () => {
    const el = mount('<e-badge-count count="1" max="0">x</e-badge-count>');
    expect(chip(el)!.textContent).toBe('0+');
  });

  it('falls back to max=99 for a non-numeric max', () => {
    const el = mount('<e-badge-count count="150" max="abc">x</e-badge-count>');
    expect(chip(el)!.textContent).toBe('99+');
  });

  it('QUIRK: intAttr rejects a fractional count back to the default 0 (not rounded)', () => {
    const el = mount('<e-badge-count count="1.5">x</e-badge-count>');
    expect(chip(el)).toBeNull();
    el.setAttribute('count', '2');
    expect(chip(el)!.textContent).toBe('2');
    el.setAttribute('count', '2.9');
    expect(chip(el)).toBeNull();
  });

  it('floors a negative count to 0', () => {
    const el = mount('<e-badge-count count="-5">x</e-badge-count>');
    expect(chip(el)).toBeNull();
  });

  it('renders the dot variant with status semantics and no text', () => {
    const el = mount('<e-badge-count dot>x</e-badge-count>');
    const dot = chip(el)!;
    expect(dot.className).toBe('ink-badge-count__dot');
    expect(dot.getAttribute('role')).toBe('status');
    expect(dot.getAttribute('aria-label')).toBe('Notification');
    expect(dot.textContent).toBe('');
  });

  it('QUIRK: the dot aria-label uses the RAW count, not the clamped display string', () => {
    const el = mount('<e-badge-count dot count="150" max="99">x</e-badge-count>');
    expect(chip(el)!.getAttribute('aria-label')).toBe('150');
  });

  it('treats dot="false" as opted out (boolAttr semantics)', () => {
    const el = mount('<e-badge-count dot="false" count="4">x</e-badge-count>');
    expect(chip(el)!.className).toBe('ink-badge-count__num');
    el.setAttribute('dot', 'anything');
    expect(chip(el)!.className).toBe('ink-badge-count__dot');
  });

  it('replaces the chip node identity when toggling dot rather than swapping classes', () => {
    const el = mount('<e-badge-count count="4">x</e-badge-count>');
    const first = chip(el)!;
    el.setAttribute('dot', '');
    const second = chip(el)!;
    expect(second).not.toBe(first);
    expect(first.isConnected).toBe(false);
    el.removeAttribute('dot');
    const third = chip(el)!;
    expect(third).not.toBe(second);
    expect(third.getAttribute('role')).toBeNull();
    expect(third.getAttribute('aria-label')).toBeNull();
    expect(third.textContent).toBe('4');
  });

  it('does not double-wrap on reconnect', () => {
    const el = mount('<e-badge-count count="1">x</e-badge-count>');
    remount(el);
    expect(el.children.length).toBe(1);
    expect(el.querySelectorAll('.ink-badge-count').length).toBe(1);
    expect(el.querySelectorAll('.ink-badge-count__num').length).toBe(1);
  });

  it('ignores attribute changes before the wrapper exists', () => {
    const el = document.createElement('e-badge-count');
    el.setAttribute('count', '5');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-breadcrumb / e-breadcrumb-item
 * ===================================================================== */

describe('e-breadcrumb', () => {
  const trail =
    '<e-breadcrumb><e-breadcrumb-item href="/a">A</e-breadcrumb-item>' +
    '<e-breadcrumb-item href="/b">B</e-breadcrumb-item>' +
    '<e-breadcrumb-item href="/c">C</e-breadcrumb-item></e-breadcrumb>';

  it('builds a nav with anchors, separators and a current span', () => {
    const el = mount(trail);
    const nav = el.firstElementChild as HTMLElement;
    expect(el.children.length).toBe(1);
    expect(nav.tagName).toBe('NAV');
    expect(nav.className).toBe('ink-breadcrumb');
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    expect([...nav.children].map((c) => c.tagName)).toEqual(['A', 'SPAN', 'A', 'SPAN', 'SPAN']);
    const anchors = nav.querySelectorAll('a');
    expect(anchors.length).toBe(2);
    expect(anchors[0]!.getAttribute('href')).toBe('/a');
    expect(anchors[0]!.textContent).toBe('A');
    expect(anchors[0]!.className).toBe('');
  });

  it('QUIRK: the last item is never an anchor even when it has an href', () => {
    const el = mount(trail);
    const nav = el.firstElementChild!;
    const current = nav.querySelector('.ink-breadcrumb__current')!;
    expect(current.tagName).toBe('SPAN');
    expect(current.textContent).toBe('C');
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(nav.querySelector('a[href="/c"]')).toBeNull();
  });

  it('renders a bare class-less span for a non-last item without href', () => {
    const el = mount(
      '<e-breadcrumb><e-breadcrumb-item>A</e-breadcrumb-item>' +
        '<e-breadcrumb-item>B</e-breadcrumb-item></e-breadcrumb>',
    );
    const first = el.querySelector('nav')!.children[0] as HTMLElement;
    expect(first.tagName).toBe('SPAN');
    expect(first.className).toBe('');
    expect(first.getAttribute('aria-current')).toBeNull();
    expect(first.textContent).toBe('A');
  });

  it('defaults the separator to "/" and honours a custom one', () => {
    const plain = mount(trail);
    expect([...plain.querySelectorAll('span[aria-hidden]')].map((s) => s.textContent)).toEqual([
      '/',
      '/',
    ]);
    const custom = mount(trail.replace('<e-breadcrumb>', '<e-breadcrumb separator="›">'));
    expect([...custom.querySelectorAll('span[aria-hidden]')].map((s) => s.textContent)).toEqual([
      '›',
      '›',
    ]);
  });

  it('treats separator="" as the default "/"', () => {
    const el = mount(trail.replace('<e-breadcrumb>', '<e-breadcrumb separator="">'));
    expect(el.querySelector('span[aria-hidden]')!.textContent).toBe('/');
  });

  it('patches separator spans in place when the attribute changes after mount', () => {
    const el = mount(trail);
    const spans = [...el.querySelectorAll<HTMLElement>('span[aria-hidden]')];
    el.setAttribute('separator', '>');
    expect(spans.map((s) => s.textContent)).toEqual(['>', '>']);
    el.setAttribute('separator', '|');
    expect(spans.map((s) => s.textContent)).toEqual(['|', '|']);
    el.removeAttribute('separator');
    expect(spans.map((s) => s.textContent)).toEqual(['/', '/']);
    // Patched in place: identity preserved, no rebuild.
    expect(el.querySelectorAll('span[aria-hidden]')[0]).toBe(spans[0]);
  });

  it('never touches the current span when patching separators', () => {
    const el = mount(trail);
    el.setAttribute('separator', '::');
    expect(el.querySelector('.ink-breadcrumb__current')!.textContent).toBe('C');
  });

  it('prefers the item title attribute over its text content', () => {
    const el = mount(
      '<e-breadcrumb><e-breadcrumb-item title="Root" href="/">ignored</e-breadcrumb-item>' +
        '<e-breadcrumb-item title="Leaf">also ignored</e-breadcrumb-item></e-breadcrumb>',
    );
    expect(el.querySelector('a')!.textContent).toBe('Root');
    expect(el.querySelector('.ink-breadcrumb__current')!.textContent).toBe('Leaf');
  });

  it('renders a single item as the current span with no separator', () => {
    const el = mount(
      '<e-breadcrumb><e-breadcrumb-item href="/x">Only</e-breadcrumb-item></e-breadcrumb>',
    );
    const nav = el.querySelector('nav')!;
    expect(nav.children.length).toBe(1);
    expect(nav.children[0]!.className).toBe('ink-breadcrumb__current');
    expect(nav.querySelector('span[aria-hidden]')).toBeNull();
  });

  it('renders an empty nav for zero items and survives a separator change', () => {
    const el = mount('<e-breadcrumb></e-breadcrumb>');
    const nav = el.querySelector('nav')!;
    expect(nav.children.length).toBe(0);
    el.setAttribute('separator', '-');
    expect(nav.children.length).toBe(0);
  });

  it('destroys the authored e-breadcrumb-item elements', () => {
    const el = mount(trail);
    expect(el.querySelectorAll('e-breadcrumb-item').length).toBe(0);
  });

  it('ignores items appended after connect (_wired snapshot)', () => {
    const el = mount(trail);
    const nav = el.querySelector('nav')!;
    const before = nav.children.length;
    const late = document.createElement('e-breadcrumb-item');
    late.textContent = 'D';
    el.appendChild(late);
    expect(nav.children.length).toBe(before);
    expect(el.querySelector('.ink-breadcrumb__current')!.textContent).toBe('C');
  });

  it('does not rebuild on reconnect', () => {
    const el = mount(trail);
    const nav = el.querySelector('nav')!;
    remount(el);
    expect(el.querySelectorAll('nav').length).toBe(1);
    expect(el.querySelector('nav')).toBe(nav);
  });

  it('escapes markup-looking labels as text', () => {
    const el = mount(
      '<e-breadcrumb><e-breadcrumb-item title="&lt;script&gt;x&lt;/script&gt;" href="/s">a</e-breadcrumb-item>' +
        '<e-breadcrumb-item>b</e-breadcrumb-item></e-breadcrumb>',
    );
    expect(el.querySelector('a')!.textContent).toBe('<script>x</script>');
    expect(el.querySelector('script')).toBeNull();
  });

  it('e-breadcrumb-item on its own is an inert data carrier', () => {
    const el = mount('<e-breadcrumb-item href="/x">Solo</e-breadcrumb-item>');
    expect(el.children.length).toBe(0);
    expect(el.textContent).toBe('Solo');
  });
});

/* ===================================================================== *
 * e-flex
 * ===================================================================== */

describe('e-flex', () => {
  it('applies every default when no attribute is present', () => {
    const el = mount('<e-flex></e-flex>');
    expect(el.style.display).toBe('flex');
    expect(el.style.flexDirection).toBe('row');
    expect(el.style.flexWrap).toBe('nowrap');
    expect(el.style.justifyContent).toBe('flex-start');
    expect(el.style.alignItems).toBe('stretch');
    expect(el.style.gap).toBe('0px');
  });

  it('honours authored values and never creates a wrapper element', () => {
    const el = mount(
      '<e-flex direction="column" wrap="wrap" justify="space-between" align="center" gap="12"><i>a</i></e-flex>',
    );
    expect(el.children.length).toBe(1);
    expect(el.firstElementChild!.tagName).toBe('I');
    expect(el.style.flexDirection).toBe('column');
    expect(el.style.flexWrap).toBe('wrap');
    expect(el.style.justifyContent).toBe('space-between');
    expect(el.style.alignItems).toBe('center');
    expect(el.style.gap).toBe('12px');
  });

  it('switches display between flex and inline-flex via the inline boolean', () => {
    const el = mount('<e-flex></e-flex>');
    expect(el.style.display).toBe('flex');
    el.setAttribute('inline', '');
    expect(el.style.display).toBe('inline-flex');
    el.setAttribute('inline', 'false');
    expect(el.style.display).toBe('flex');
    el.setAttribute('inline', 'yes');
    expect(el.style.display).toBe('inline-flex');
    el.removeAttribute('inline');
    expect(el.style.display).toBe('flex');
  });

  it('mutates direction/justify/align after mount and restores defaults on removal', () => {
    const el = mount('<e-flex></e-flex>');
    el.setAttribute('direction', 'row-reverse');
    el.setAttribute('justify', 'center');
    el.setAttribute('align', 'flex-end');
    expect(el.style.flexDirection).toBe('row-reverse');
    expect(el.style.justifyContent).toBe('center');
    expect(el.style.alignItems).toBe('flex-end');
    el.removeAttribute('direction');
    el.removeAttribute('justify');
    el.removeAttribute('align');
    expect(el.style.flexDirection).toBe('row');
    expect(el.style.justifyContent).toBe('flex-start');
    expect(el.style.alignItems).toBe('stretch');
  });

  it('treats an empty attribute value as the default', () => {
    const el = mount('<e-flex direction="" wrap="" justify="" align="" gap=""></e-flex>');
    expect(el.style.flexDirection).toBe('row');
    expect(el.style.flexWrap).toBe('nowrap');
    expect(el.style.justifyContent).toBe('flex-start');
    expect(el.style.alignItems).toBe('stretch');
    expect(el.style.gap).toBe('0px');
  });

  it('appends px to a numeric gap and passes a unit-bearing gap through verbatim', () => {
    const el = mount('<e-flex gap="8"></e-flex>');
    expect(el.style.gap).toBe('8px');
    el.setAttribute('gap', '1rem');
    expect(el.style.gap).toBe('1rem');
    el.setAttribute('gap', '4');
    expect(el.style.gap).toBe('4px');
  });

  it('QUIRK: a whitespace-only gap coerces to " px" which CSSOM silently rejects', () => {
    const el = mount('<e-flex gap=" "></e-flex>');
    expect(el.style.gap).toBe('');
  });

  it('QUIRK: an invalid direction is silently dropped by CSSOM', () => {
    const el = mount('<e-flex direction="bogus"></e-flex>');
    expect(el.style.flexDirection).toBe('');
    expect(el.style.display).toBe('flex');
    el.setAttribute('direction', 'column');
    expect(el.style.flexDirection).toBe('column');
  });

  it('ignores attribute changes while disconnected', () => {
    const el = document.createElement('e-flex');
    el.setAttribute('gap', '20');
    expect(el.style.display).toBe('');
    expect(el.style.gap).toBe('');
    document.body.appendChild(el);
    mounted.push(el);
    expect(el.style.gap).toBe('20px');
  });
});

/* ===================================================================== *
 * e-grid / e-grid-item
 * ===================================================================== */

describe('e-grid', () => {
  it('defaults to a 12-column repeat grid with zero gap', () => {
    const el = mount('<e-grid></e-grid>');
    expect(el.style.display).toBe('grid');
    expect(el.style.gridTemplateColumns).toBe('repeat(12, minmax(0px, 1fr))');
    expect(el.style.gap).toBe('0px');
  });

  it('rebuilds the repeat() track list when cols changes after mount', () => {
    const el = mount('<e-grid cols="3"></e-grid>');
    expect(el.style.gridTemplateColumns).toBe('repeat(3, minmax(0px, 1fr))');
    el.setAttribute('cols', '4');
    expect(el.style.gridTemplateColumns).toBe('repeat(4, minmax(0px, 1fr))');
    el.removeAttribute('cols');
    expect(el.style.gridTemplateColumns).toBe('repeat(12, minmax(0px, 1fr))');
  });

  it('passes a non-numeric cols value through verbatim', () => {
    const el = mount('<e-grid cols="1fr 2fr"></e-grid>');
    expect(el.style.gridTemplateColumns).toBe('1fr 2fr');
  });

  it('QUIRK: cols="0" builds repeat(0, ...) which CSSOM rejects, leaving the property empty', () => {
    const el = mount('<e-grid cols="0"></e-grid>');
    expect(el.style.gridTemplateColumns).toBe('');
    expect(el.style.display).toBe('grid');
  });

  it('treats cols="" as the default 12', () => {
    const el = mount('<e-grid cols=""></e-grid>');
    expect(el.style.gridTemplateColumns).toBe('repeat(12, minmax(0px, 1fr))');
  });

  it('coerces a numeric gap to px and leaves a unit-bearing gap alone', () => {
    const el = mount('<e-grid gap="16"></e-grid>');
    expect(el.style.gap).toBe('16px');
    el.setAttribute('gap', '2rem');
    expect(el.style.gap).toBe('2rem');
    el.removeAttribute('gap');
    expect(el.style.gap).toBe('0px');
  });

  it('ignores attribute changes while disconnected', () => {
    const el = document.createElement('e-grid');
    el.setAttribute('cols', '2');
    expect(el.style.display).toBe('');
    expect(el.style.gridTemplateColumns).toBe('');
  });
});

describe('e-grid-item', () => {
  it('writes grid-column/grid-row and clears them when the attribute is removed', () => {
    const el = mount('<e-grid-item col="1 / 3" row="2 / 4"></e-grid-item>');
    expect(el.style.gridColumn).toBe('1 / 3');
    expect(el.style.gridRow).toBe('2 / 4');
    el.setAttribute('col', 'span 2');
    expect(el.style.gridColumn).toBe('span 2');
    el.removeAttribute('col');
    el.removeAttribute('row');
    expect(el.style.gridColumn).toBe('');
    expect(el.style.gridRow).toBe('');
  });

  it('sets no display or class of its own', () => {
    const el = mount('<e-grid-item col="1"></e-grid-item>');
    expect(el.style.display).toBe('');
    expect(el.className).toBe('');
  });

  it('ignores attribute changes while disconnected', () => {
    const el = document.createElement('e-grid-item');
    el.setAttribute('col', '1 / 3');
    expect(el.style.gridColumn).toBe('');
  });
});

/* ===================================================================== *
 * e-icon
 * ===================================================================== */

describe('e-icon', () => {
  it('renders a decorative svg at the default size for a known name', () => {
    const el = mount('<e-icon name="plus"></e-icon>');
    const svg = el.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('20');
    expect(svg.getAttribute('height')).toBe('20');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('role')).toBe('presentation');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('aria-label')).toBeNull();
    const path = el.querySelector('path')!;
    expect(path.getAttribute('d')).toBe('M12 4v16M4 12h16');
    expect(path.getAttribute('stroke')).toBe('currentColor');
    expect(path.getAttribute('stroke-width')).toBe('2');
    expect(path.getAttribute('fill')).toBe('none');
    expect(el.style.display).toBe('inline-flex');
    expect(el.style.lineHeight).toBe('0');
  });

  it('switches to img semantics when a label is present, and back when removed', () => {
    const el = mount('<e-icon name="star" label="Favourite"></e-icon>');
    expect(el.querySelector('svg')!.getAttribute('role')).toBe('img');
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('Favourite');
    expect(el.querySelector('svg')!.getAttribute('aria-hidden')).toBeNull();
    el.setAttribute('label', 'Starred');
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('Starred');
    el.removeAttribute('label');
    expect(el.querySelector('svg')!.getAttribute('role')).toBe('presentation');
    expect(el.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBeNull();
  });

  it('treats label="" as decorative', () => {
    const el = mount('<e-icon name="bell" label=""></e-icon>');
    expect(el.querySelector('svg')!.getAttribute('role')).toBe('presentation');
    expect(el.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('swaps the path when the name changes after mount', () => {
    const el = mount('<e-icon name="plus"></e-icon>');
    el.setAttribute('name', 'minus');
    expect(el.querySelector('path')!.getAttribute('d')).toBe('M4 12h16');
    el.setAttribute('name', 'check');
    expect(el.querySelector('path')!.getAttribute('d')).toBe('M4 12.5l5 5L20 6');
  });

  it('renders nothing for a missing, empty or unknown name', () => {
    const none = mount('<e-icon></e-icon>');
    expect(none.innerHTML).toBe('');
    expect(none.style.display).toBe('');
    const empty = mount('<e-icon name=""></e-icon>');
    expect(empty.innerHTML).toBe('');
    const unknown = mount('<e-icon name="definitely-not-an-icon"></e-icon>');
    expect(unknown.innerHTML).toBe('');
    expect(unknown.style.display).toBe('');
  });

  it('clears the inline display/lineHeight styles when the name stops resolving', () => {
    const el = mount('<e-icon name="plus"></e-icon>');
    expect(el.style.display).toBe('inline-flex');
    el.setAttribute('name', 'nope');
    expect(el.innerHTML).toBe('');
    expect(el.style.display).toBe('');
    expect(el.style.lineHeight).toBe('');
    el.setAttribute('name', 'plus');
    expect(el.style.display).toBe('inline-flex');
    expect(el.style.lineHeight).toBe('0');
  });

  it('renders nothing for an inherited Object.prototype name such as "toString"', () => {
    const el = mount('<e-icon name="toString"></e-icon>');
    expect(el.innerHTML).toBe('');
    expect(el.querySelector('svg')).toBeNull();
    expect(el.style.display).toBe('');
  });

  it('rejects every other inherited prototype name too', () => {
    for (const name of ['constructor', 'hasOwnProperty', 'valueOf', '__proto__']) {
      const el = mount(`<e-icon name="${name}"></e-icon>`);
      expect(el.innerHTML).toBe('');
      expect(el.querySelector('svg')).toBeNull();
    }
  });

  it('keeps a fractional size instead of falling back', () => {
    const el = mount('<e-icon name="plus" size="12.5"></e-icon>');
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('12.5');
    expect(el.querySelector('svg')!.getAttribute('height')).toBe('12.5');
  });

  it('falls back to size 20 for a non-numeric or empty size and clamps below 1', () => {
    const el = mount('<e-icon name="plus" size="abc"></e-icon>');
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('20');
    el.setAttribute('size', '');
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('20');
    el.setAttribute('size', '-5');
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('1');
    expect(el.querySelector('svg')!.getAttribute('height')).toBe('1');
    el.setAttribute('size', '0');
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('1');
    el.setAttribute('size', '32');
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('32');
    el.removeAttribute('size');
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('20');
  });

  it('escapes a markup-bearing label into the aria-label attribute instead of the DOM', () => {
    const el = mount('<e-icon name="plus"></e-icon>');
    el.setAttribute('label', '<img src=x onerror="boom()">');
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelectorAll('svg').length).toBe(1);
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe(
      '<img src=x onerror="boom()">',
    );
  });

  it('ignores attribute changes while disconnected', () => {
    const el = document.createElement('e-icon');
    el.setAttribute('name', 'plus');
    expect(el.innerHTML).toBe('');
    document.body.appendChild(el);
    mounted.push(el);
    expect(el.querySelector('svg')).not.toBeNull();
  });
});

/* ===================================================================== *
 * e-link
 * ===================================================================== */

describe('e-link', () => {
  it('wraps children in an anchor and mirrors the raw href attribute', () => {
    const el = mount('<e-link href="/docs">Docs</e-link>');
    const a = el.firstElementChild as HTMLAnchorElement;
    expect(el.children.length).toBe(1);
    expect(a.tagName).toBe('A');
    expect(a.className).toBe('ink-link');
    expect(a.getAttribute('href')).toBe('/docs');
    expect(a.textContent).toBe('Docs');
  });

  it('patches the href in place and falls back to "#" when it is removed', () => {
    const el = mount('<e-link href="/a">x</e-link>');
    const a = el.querySelector('a')!;
    el.setAttribute('href', '/b');
    expect(a.getAttribute('href')).toBe('/b');
    el.removeAttribute('href');
    expect(a.getAttribute('href')).toBe('#');
    expect(el.querySelector('a')).toBe(a);
  });

  it('treats href="" as "#"', () => {
    const el = mount('<e-link href="">x</e-link>');
    expect(el.querySelector('a')!.getAttribute('href')).toBe('#');
  });

  it('defaults to "#" when no href was ever authored', () => {
    const el = mount('<e-link>x</e-link>');
    expect(el.querySelector('a')!.getAttribute('href')).toBe('#');
  });

  it('does not double-wrap on reconnect', () => {
    const el = mount('<e-link href="/a">x</e-link>');
    const a = el.querySelector('a')!;
    remount(el);
    expect(el.querySelectorAll('a').length).toBe(1);
    expect(el.querySelector('a')).toBe(a);
  });

  it('ignores attribute changes before the anchor exists', () => {
    const el = document.createElement('e-link');
    el.setAttribute('href', '/x');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-masonry
 * ===================================================================== */

describe('e-masonry', () => {
  it('adds the host class and applies the defaults', () => {
    const el = mount('<e-masonry></e-masonry>');
    expect(el.classList.contains('ink-masonry')).toBe(true);
    expect(el.style.columnCount).toBe('3');
    expect(el.style.columnGap).toBe('16px');
    expect(el.style.getPropertyValue('--ink-masonry-gap')).toBe('16px');
  });

  it('clamps columns into the 1..20 range', () => {
    const el = mount('<e-masonry columns="0"></e-masonry>');
    expect(el.style.columnCount).toBe('1');
    el.setAttribute('columns', '100');
    expect(el.style.columnCount).toBe('20');
    el.setAttribute('columns', '5');
    expect(el.style.columnCount).toBe('5');
    el.setAttribute('columns', '-4');
    expect(el.style.columnCount).toBe('1');
    el.removeAttribute('columns');
    expect(el.style.columnCount).toBe('3');
  });

  it('QUIRK: a fractional columns value falls back to the default 3, not to a rounded value', () => {
    const el = mount('<e-masonry columns="2.5"></e-masonry>');
    expect(el.style.columnCount).toBe('3');
  });

  it('floors a negative gap to 0 and keeps a fractional one', () => {
    const el = mount('<e-masonry gap="-5"></e-masonry>');
    expect(el.style.columnGap).toBe('0px');
    expect(el.style.getPropertyValue('--ink-masonry-gap')).toBe('0px');
    el.setAttribute('gap', '12.5');
    expect(el.style.columnGap).toBe('12.5px');
    expect(el.style.getPropertyValue('--ink-masonry-gap')).toBe('12.5px');
    el.setAttribute('gap', 'abc');
    expect(el.style.columnGap).toBe('16px');
  });

  it('keeps the host class on reconnect without duplicating it', () => {
    const el = mount('<e-masonry></e-masonry>');
    remount(el);
    expect(el.className).toBe('ink-masonry');
  });

  it('ignores attribute changes while disconnected', () => {
    const el = document.createElement('e-masonry');
    el.setAttribute('columns', '4');
    expect(el.style.columnCount).toBe('');
    expect(el.className).toBe('');
  });
});

/* ===================================================================== *
 * e-ribbon
 * ===================================================================== */

describe('e-ribbon', () => {
  it('wraps children and always creates the tag span, even without text', () => {
    const el = mount('<e-ribbon><p>Body</p></e-ribbon>');
    const wrap = el.firstElementChild as HTMLElement;
    expect(el.children.length).toBe(1);
    expect(wrap.className).toBe('ink-ribbon');
    expect(wrap.firstElementChild!.tagName).toBe('P');
    const tag = el.querySelector('.ink-ribbon__tag')!;
    expect(tag.tagName).toBe('SPAN');
    expect(tag.textContent).toBe('');
    expect(wrap.lastElementChild).toBe(tag);
  });

  it('patches the tag text in place through add -> change -> remove', () => {
    const el = mount('<e-ribbon text="NEW">x</e-ribbon>');
    const tag = el.querySelector('.ink-ribbon__tag')!;
    expect(tag.textContent).toBe('NEW');
    el.setAttribute('text', 'HOT');
    expect(tag.textContent).toBe('HOT');
    el.removeAttribute('text');
    expect(tag.textContent).toBe('');
    expect(el.querySelector('.ink-ribbon__tag')).toBe(tag);
  });

  it('renders markup-looking text literally', () => {
    const el = mount('<e-ribbon text="&lt;b&gt;x&lt;/b&gt;">y</e-ribbon>');
    const tag = el.querySelector('.ink-ribbon__tag')!;
    expect(tag.textContent).toBe('<b>x</b>');
    expect(tag.querySelector('b')).toBeNull();
  });

  it('does not double-wrap or duplicate the tag on reconnect', () => {
    const el = mount('<e-ribbon text="A">x</e-ribbon>');
    remount(el);
    expect(el.querySelectorAll('.ink-ribbon').length).toBe(1);
    expect(el.querySelectorAll('.ink-ribbon__tag').length).toBe(1);
  });

  it('ignores attribute changes before the tag exists', () => {
    const el = document.createElement('e-ribbon');
    el.setAttribute('text', 'A');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-space
 * ===================================================================== */

describe('e-space', () => {
  it('applies the inline-flex defaults', () => {
    const el = mount('<e-space></e-space>');
    expect(el.style.display).toBe('inline-flex');
    expect(el.style.flexDirection).toBe('row');
    expect(el.style.flexWrap).toBe('nowrap');
    expect(el.style.gap).toBe('8px');
  });

  it('only the exact string "vertical" switches to a column', () => {
    const el = mount('<e-space direction="vertical"></e-space>');
    expect(el.style.flexDirection).toBe('column');
    el.setAttribute('direction', 'column');
    expect(el.style.flexDirection).toBe('row');
    el.setAttribute('direction', 'VERTICAL');
    expect(el.style.flexDirection).toBe('row');
    el.setAttribute('direction', '');
    expect(el.style.flexDirection).toBe('row');
    el.setAttribute('direction', 'vertical');
    expect(el.style.flexDirection).toBe('column');
    el.removeAttribute('direction');
    expect(el.style.flexDirection).toBe('row');
  });

  it('toggles wrap, honouring the wrap="false" opt-out', () => {
    const el = mount('<e-space wrap></e-space>');
    expect(el.style.flexWrap).toBe('wrap');
    el.setAttribute('wrap', 'false');
    expect(el.style.flexWrap).toBe('nowrap');
    el.setAttribute('wrap', '');
    expect(el.style.flexWrap).toBe('wrap');
    el.removeAttribute('wrap');
    expect(el.style.flexWrap).toBe('nowrap');
  });

  it('floors size at 0 and keeps fractions', () => {
    const el = mount('<e-space size="0"></e-space>');
    expect(el.style.gap).toBe('0px');
    el.setAttribute('size', '-4');
    expect(el.style.gap).toBe('0px');
    el.setAttribute('size', '12.5');
    expect(el.style.gap).toBe('12.5px');
    el.setAttribute('size', 'abc');
    expect(el.style.gap).toBe('8px');
    el.setAttribute('size', '');
    expect(el.style.gap).toBe('8px');
    el.setAttribute('size', '24');
    expect(el.style.gap).toBe('24px');
  });

  it('ignores attribute changes while disconnected', () => {
    const el = document.createElement('e-space');
    el.setAttribute('size', '24');
    expect(el.style.display).toBe('');
    expect(el.style.gap).toBe('');
  });
});

/* ===================================================================== *
 * e-form
 * ===================================================================== */

describe('e-form', () => {
  it('moves light-DOM children into an inner form.ink-form', () => {
    const el = mount('<e-form><span id="a">A</span><span id="b">B</span></e-form>');
    expect(el.children.length).toBe(1);
    const form = el.firstElementChild as HTMLFormElement;
    expect(form.tagName).toBe('FORM');
    expect(form.className).toBe('ink-form');
    expect([...form.children].map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('creates an empty inner form for an empty host', () => {
    const el = mount('<e-form></e-form>');
    const form = el.querySelector('form.ink-form')!;
    expect(form.children.length).toBe(0);
  });

  it('toggles the inline modifier only for the exact string "inline"', () => {
    const el = mount('<e-form layout="inline"></e-form>');
    const form = el.querySelector('form')!;
    expect(form.classList.contains('ink-form--inline')).toBe(true);
    el.setAttribute('layout', 'INLINE');
    expect(form.classList.contains('ink-form--inline')).toBe(false);
    el.setAttribute('layout', ' inline');
    expect(form.classList.contains('ink-form--inline')).toBe(false);
    el.setAttribute('layout', 'inline');
    expect(form.classList.contains('ink-form--inline')).toBe(true);
    el.removeAttribute('layout');
    expect(form.classList.contains('ink-form--inline')).toBe(false);
    expect(form.className).toBe('ink-form');
  });

  it('re-fires submit as e-submit with the inner form in detail', () => {
    const el = mount('<e-form></e-form>');
    const seen = listen<{ form: HTMLFormElement }>(el, 'e-submit');
    const form = el.querySelector('form.ink-form') as HTMLFormElement;
    form.requestSubmit();
    expect(seen.length).toBe(1);
    expect(seen[0]!.detail.form).toBe(form);
    expect(Object.keys(seen[0]!.detail)).toEqual(['form']);
    expect(seen[0]!.bubbles).toBe(true);
    expect(seen[0]!.composed).toBe(false);
    expect(seen[0]!.cancelable).toBe(false);
  });

  it('always preventDefaults the native submit', () => {
    const el = mount('<e-form></e-form>');
    const form = el.querySelector('form.ink-form') as HTMLFormElement;
    const evt = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
  });

  it('bubbles e-submit out of the host', () => {
    const el = mount('<e-form></e-form>');
    const seen = listen<{ form: HTMLFormElement }>(el.parentElement!, 'e-submit');
    (el.querySelector('form.ink-form') as HTMLFormElement).requestSubmit();
    expect(seen.length).toBe(1);
    expect(seen[0]!.target).toBe(el);
  });

  it('does not re-wrap or double-bind the submit listener on reconnect', () => {
    const el = mount('<e-form><span>x</span></e-form>');
    const form = el.querySelector('form.ink-form') as HTMLFormElement;
    remount(el);
    expect(el.querySelectorAll('form.ink-form').length).toBe(1);
    expect(el.querySelector('form.ink-form')).toBe(form);
    const seen = listen<{ form: HTMLFormElement }>(el, 'e-submit');
    form.requestSubmit();
    expect(seen.length).toBe(1);
  });

  it('ignores attribute changes before the inner form exists', () => {
    const el = document.createElement('e-form');
    el.setAttribute('layout', 'inline');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-form-item
 * ===================================================================== */

describe('e-form-item', () => {
  const root = (el: HTMLElement): HTMLElement => el.querySelector('.ink-form-item')!;

  it('builds the root/control scaffold and moves children into it', () => {
    const el = mount('<e-form-item><e-input></e-input></e-form-item>');
    expect(el.children.length).toBe(1);
    const r = root(el);
    expect(r.tagName).toBe('DIV');
    const control = r.querySelector('[data-control]') as HTMLElement;
    expect(control).not.toBeNull();
    expect(control.getAttribute('data-control')).toBe('');
    expect(control.querySelector('e-input')).not.toBeNull();
  });

  it('adds, updates and removes the label element', () => {
    const el = mount('<e-form-item><e-input></e-input></e-form-item>');
    expect(el.querySelector('.ink-form-item__label')).toBeNull();
    el.setAttribute('label', 'Name');
    const label = el.querySelector('label.ink-form-item__label') as HTMLLabelElement;
    expect(label.textContent).toBe('Name');
    expect(label.nextElementSibling!.getAttribute('data-control')).toBe('');
    el.setAttribute('label', 'Full name');
    expect(el.querySelector('label.ink-form-item__label')).toBe(label);
    expect(label.textContent).toBe('Full name');
    el.removeAttribute('label');
    expect(el.querySelector('.ink-form-item__label')).toBeNull();
  });

  it('treats label="" as no label', () => {
    const el = mount('<e-form-item label=""><e-input></e-input></e-form-item>');
    expect(el.querySelector('.ink-form-item__label')).toBeNull();
  });

  it('renders the required pill at the end of the label with the default text', () => {
    const el = mount('<e-form-item label="Name" required><e-input></e-input></e-form-item>');
    const label = el.querySelector('label.ink-form-item__label')!;
    const pill = label.querySelector('.ink-form-item__required')!;
    expect(pill.tagName).toBe('SPAN');
    expect(pill.textContent).toBe('REQ');
    expect(pill.getAttribute('aria-label')).toBe('required');
    expect(label.lastElementChild).toBe(pill);
  });

  it('honours a custom required-label and falls back for an empty one', () => {
    const el = mount(
      '<e-form-item label="Name" required required-label="*"><e-input></e-input></e-form-item>',
    );
    const pill = () => el.querySelector('.ink-form-item__required')!;
    expect(pill().textContent).toBe('*');
    el.setAttribute('required-label', 'MUST');
    expect(pill().textContent).toBe('MUST');
    el.setAttribute('required-label', '');
    expect(pill().textContent).toBe('REQ');
  });

  it('adds and removes the pill as required toggles, honouring required="false"', () => {
    const el = mount('<e-form-item label="Name"><e-input></e-input></e-form-item>');
    expect(el.querySelector('.ink-form-item__required')).toBeNull();
    el.setAttribute('required', '');
    expect(el.querySelector('.ink-form-item__required')).not.toBeNull();
    el.setAttribute('required', 'false');
    expect(el.querySelector('.ink-form-item__required')).toBeNull();
    el.setAttribute('required', '');
    expect(el.querySelector('.ink-form-item__required')).not.toBeNull();
    el.removeAttribute('required');
    expect(el.querySelector('.ink-form-item__required')).toBeNull();
  });

  it('anchors the pill to the label: no label, no pill — but the control still gets required', () => {
    const el = mount('<e-form-item required><e-input></e-input></e-form-item>');
    expect(el.querySelector('.ink-form-item__required')).toBeNull();
    expect(el.querySelector('.ink-form-item__label')).toBeNull();
    expect(el.querySelector('e-input')!.hasAttribute('required')).toBe(true);
    el.setAttribute('label', 'Name');
    expect(el.querySelector('.ink-form-item__required')).not.toBeNull();
    el.removeAttribute('label');
    expect(el.querySelector('.ink-form-item__required')).toBeNull();
    expect(el.querySelector('e-input')!.hasAttribute('required')).toBe(true);
  });

  it('renders the hint below the control', () => {
    const el = mount('<e-form-item hint="Helper"><e-input></e-input></e-form-item>');
    const hint = root(el).querySelector('.ink-hint')!;
    expect(hint.tagName).toBe('DIV');
    expect(hint.textContent).toBe('Helper');
    el.setAttribute('hint', 'Other');
    expect(root(el).querySelector('.ink-hint')!.textContent).toBe('Other');
    el.removeAttribute('hint');
    expect(root(el).querySelector('.ink-hint')).toBeNull();
  });

  it('prefixes the error with a literal "! "', () => {
    const el = mount('<e-form-item error="Required field"><e-input></e-input></e-form-item>');
    const err = root(el).querySelector('.ink-error')!;
    expect(err.textContent).toBe('! Required field');
    el.setAttribute('error', 'Too short');
    expect(root(el).querySelector('.ink-error')!.textContent).toBe('! Too short');
    el.removeAttribute('error');
    expect(root(el).querySelector('.ink-error')).toBeNull();
  });

  it('QUIRK: a truthy error suppresses the hint entirely', () => {
    const el = mount('<e-form-item hint="Helper" error="Nope"><e-input></e-input></e-form-item>');
    expect(root(el).querySelector('.ink-hint')).toBeNull();
    expect(root(el).querySelector('.ink-error')!.textContent).toBe('! Nope');
    el.removeAttribute('error');
    expect(root(el).querySelector('.ink-hint')!.textContent).toBe('Helper');
    expect(root(el).querySelector('.ink-error')).toBeNull();
    el.setAttribute('error', 'Again');
    expect(root(el).querySelector('.ink-hint')).toBeNull();
  });

  it('treats error="" as no error, so the hint survives', () => {
    const el = mount('<e-form-item hint="Helper" error=""><e-input></e-input></e-form-item>');
    expect(root(el).querySelector('.ink-hint')!.textContent).toBe('Helper');
    expect(root(el).querySelector('.ink-error')).toBeNull();
  });

  it('generates an id for the control and wires the label htmlFor', () => {
    const el = mount('<e-form-item label="Name"><e-input></e-input></e-form-item>');
    const control = el.querySelector('e-input')!;
    expect(control.id).toMatch(/^e-field-[a-z0-9]{1,7}$/);
    expect((el.querySelector('label') as HTMLLabelElement).htmlFor).toBe(control.id);
  });

  it('preserves an author-supplied control id', () => {
    const el = mount('<e-form-item label="Name"><e-input id="mine"></e-input></e-form-item>');
    expect(el.querySelector('e-input')!.id).toBe('mine');
    expect((el.querySelector('label') as HTMLLabelElement).htmlFor).toBe('mine');
  });

  it('owns the control aria-label once it has written it, and removes it with the label', () => {
    const el = mount('<e-form-item label="Name"><e-input></e-input></e-form-item>');
    const control = el.querySelector('e-input')!;
    expect(control.getAttribute('aria-label')).toBe('Name');
    el.setAttribute('label', 'Full name');
    expect(control.getAttribute('aria-label')).toBe('Full name');
    el.removeAttribute('label');
    expect(control.hasAttribute('aria-label')).toBe(false);
  });

  it('leaves an author-supplied aria-label alone', () => {
    const el = mount(
      '<e-form-item label="Name"><e-input aria-label="Author choice"></e-input></e-form-item>',
    );
    const control = el.querySelector('e-input')!;
    expect(control.getAttribute('aria-label')).toBe('Author choice');
    el.setAttribute('label', 'Changed');
    expect(control.getAttribute('aria-label')).toBe('Author choice');
    el.removeAttribute('label');
    expect(control.getAttribute('aria-label')).toBe('Author choice');
  });

  it('owns the control required attribute once it has written it', () => {
    const el = mount('<e-form-item label="Name" required><e-input></e-input></e-form-item>');
    const control = el.querySelector('e-input')!;
    expect(control.getAttribute('required')).toBe('');
    el.removeAttribute('required');
    expect(control.hasAttribute('required')).toBe(false);
  });

  it('leaves an author-supplied required alone, so it survives the form-item dropping its own', () => {
    const el = mount(
      '<e-form-item label="Name" required><e-input required></e-input></e-form-item>',
    );
    const control = el.querySelector('e-input')!;
    expect(control.hasAttribute('required')).toBe(true);
    el.removeAttribute('required');
    expect(control.hasAttribute('required')).toBe(true);
  });

  it('propagates the error onto an e-input as error + error-message', () => {
    const el = mount('<e-form-item error="Bad"><e-input></e-input></e-form-item>');
    const control = el.querySelector('e-input')!;
    expect(control.getAttribute('error')).toBe('');
    expect(control.getAttribute('error-message')).toBe('Bad');
    el.setAttribute('error', 'Worse');
    expect(control.getAttribute('error-message')).toBe('Worse');
    el.removeAttribute('error');
    expect(control.hasAttribute('error')).toBe(false);
    expect(control.hasAttribute('error-message')).toBe(false);
  });

  it('propagates the error onto an e-textarea too', () => {
    const el = mount('<e-form-item error="Bad"><e-textarea></e-textarea></e-form-item>');
    const control = el.querySelector('e-textarea')!;
    expect(control.getAttribute('error')).toBe('');
    expect(control.getAttribute('error-message')).toBe('Bad');
  });

  it('leaves an author-set error on an e-input alone when the form-item has none', () => {
    const el = mount(
      '<e-form-item label="Name"><e-input error error-message="mine"></e-input></e-form-item>',
    );
    const control = el.querySelector('e-input')!;
    expect(control.hasAttribute('error')).toBe(true);
    expect(control.getAttribute('error-message')).toBe('mine');
    // The form-item never claimed it, so its own error churn leaves it intact.
    el.setAttribute('error', 'Nope');
    expect(control.getAttribute('error-message')).toBe('mine');
    el.removeAttribute('error');
    expect(control.getAttribute('error-message')).toBe('mine');
  });

  it('resets attribute ownership when the resolved control is swapped out', () => {
    const el = mount(
      '<e-form-item label="Name" required error="Bad"><e-input></e-input></e-form-item>',
    );
    const first = el.querySelector('e-input')!;
    expect(first.getAttribute('aria-label')).toBe('Name');
    expect(first.getAttribute('error-message')).toBe('Bad');

    const wrap = el.querySelector('[data-control]')!;
    const second = document.createElement('e-input');
    second.setAttribute('aria-label', 'Author choice');
    second.setAttribute('required', '');
    second.setAttribute('error', '');
    second.setAttribute('error-message', 'mine');
    first.remove();
    wrap.appendChild(second);

    // The new control is unowned, so nothing this component wrote on the old
    // one carries over onto the author's attributes.
    el.removeAttribute('error');
    el.removeAttribute('required');
    el.removeAttribute('label');
    expect(second.getAttribute('aria-label')).toBe('Author choice');
    expect(second.hasAttribute('required')).toBe(true);
    expect(second.getAttribute('error-message')).toBe('mine');
  });

  it('never puts error attributes on a non-input control', () => {
    const el = mount('<e-form-item error="Bad"><e-select></e-select></e-form-item>');
    const control = el.querySelector('e-select')!;
    expect(control.hasAttribute('error')).toBe(false);
    expect(control.hasAttribute('error-message')).toBe(false);
    // …but it still receives label/required semantics.
    el.setAttribute('label', 'Pick');
    expect(control.getAttribute('aria-label')).toBe('Pick');
  });

  it('picks the first matching control in document order', () => {
    const el = mount(
      '<e-form-item label="L"><e-textarea></e-textarea><e-input></e-input></e-form-item>',
    );
    expect(el.querySelector('e-textarea')!.getAttribute('aria-label')).toBe('L');
    expect(el.querySelector('e-input')!.hasAttribute('aria-label')).toBe(false);
  });

  it('does nothing to semantics when no known control is present', () => {
    const el = mount('<e-form-item label="Name"><input></e-form-item>');
    const label = el.querySelector('label') as HTMLLabelElement;
    expect(label.htmlFor).toBe('');
    expect(el.querySelector('input')!.id).toBe('');
  });

  it('re-queries the control on every render, picking up one added after connect', () => {
    const el = mount('<e-form-item label="L"></e-form-item>');
    const control = document.createElement('e-input');
    el.querySelector('[data-control]')!.appendChild(control);
    el.setAttribute('label', 'L2');
    expect(control.getAttribute('aria-label')).toBe('L2');
    expect(control.id).not.toBe('');
  });

  it('does not re-wrap on reconnect', () => {
    const el = mount('<e-form-item label="L"><e-input></e-input></e-form-item>');
    const r = root(el);
    remount(el);
    expect(el.querySelectorAll('.ink-form-item').length).toBe(1);
    expect(el.querySelectorAll('[data-control]').length).toBe(1);
    expect(root(el)).toBe(r);
  });

  it('renders markup-looking label/hint/error values as text', () => {
    const el = mount(
      '<e-form-item label="&lt;script&gt;a&lt;/script&gt;" hint="&lt;b&gt;h&lt;/b&gt;"><e-input></e-input></e-form-item>',
    );
    expect(el.querySelector('label')!.textContent).toBe('<script>a</script>');
    expect(el.querySelector('.ink-hint')!.textContent).toBe('<b>h</b>');
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('.ink-hint b')).toBeNull();
    el.setAttribute('error', '<img src=x onerror=boom>');
    expect(el.querySelector('.ink-error')!.textContent).toBe('! <img src=x onerror=boom>');
    expect(el.querySelector('img')).toBeNull();
  });

  it('ignores attribute changes before the root exists', () => {
    const el = document.createElement('e-form-item');
    el.setAttribute('label', 'L');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-layout family
 * ===================================================================== */

describe('e-layout', () => {
  it('marks the host and never moves its children', () => {
    const el = mount('<e-layout><span id="c">x</span></e-layout>');
    expect(el.classList.contains('ink-layout')).toBe(true);
    expect(el.children.length).toBe(1);
    expect(el.firstElementChild!.id).toBe('c');
  });

  it('toggles the has-sider modifier through add -> change -> remove', () => {
    const el = mount('<e-layout></e-layout>');
    expect(el.classList.contains('ink-layout--has-sider')).toBe(false);
    el.setAttribute('has-sider', '');
    expect(el.classList.contains('ink-layout--has-sider')).toBe(true);
    el.setAttribute('has-sider', 'false');
    expect(el.classList.contains('ink-layout--has-sider')).toBe(false);
    el.setAttribute('has-sider', '0');
    expect(el.classList.contains('ink-layout--has-sider')).toBe(true);
    el.removeAttribute('has-sider');
    expect(el.classList.contains('ink-layout--has-sider')).toBe(false);
  });

  it('never verifies that a sider actually exists', () => {
    const el = mount('<e-layout has-sider></e-layout>');
    expect(el.classList.contains('ink-layout--has-sider')).toBe(true);
    expect(el.querySelector('e-layout-sider')).toBeNull();
  });

  it('ignores attribute changes while disconnected', () => {
    const el = document.createElement('e-layout');
    el.setAttribute('has-sider', '');
    expect(el.className).toBe('');
  });
});

describe('e-layout regions', () => {
  const cases: Array<[string, string, string]> = [
    ['e-layout-header', 'HEADER', 'ink-layout__header'],
    ['e-layout-content', 'MAIN', 'ink-layout__content'],
    ['e-layout-footer', 'FOOTER', 'ink-layout__footer'],
  ];

  for (const [tag, wrapperTag, cls] of cases) {
    it(`${tag} wraps its children in a <${wrapperTag.toLowerCase()}>`, () => {
      const el = mount(`<${tag}><span id="k">x</span></${tag}>`);
      expect(el.children.length).toBe(1);
      const wrap = el.firstElementChild as HTMLElement;
      expect(wrap.tagName).toBe(wrapperTag);
      expect(wrap.className).toBe(cls);
      expect(wrap.firstElementChild!.id).toBe('k');
    });

    it(`${tag} creates the wrapper even when empty and does not double-wrap on reconnect`, () => {
      const el = mount(`<${tag}></${tag}>`);
      const wrap = el.firstElementChild as HTMLElement;
      expect(wrap.children.length).toBe(0);
      remount(el);
      expect(el.children.length).toBe(1);
      expect(el.firstElementChild).toBe(wrap);
    });

    it(`${tag} works standalone, outside an e-layout`, () => {
      const el = mount(`<div><${tag}>x</${tag}></div>`);
      expect(el.querySelector(`.${cls}`)).not.toBeNull();
    });
  }
});

describe('e-layout-sider', () => {
  const aside = (el: HTMLElement): HTMLElement => el.querySelector('aside.ink-layout__sider')!;

  it('wraps children in an aside and applies the default width', () => {
    const el = mount('<e-layout-sider><span id="s">x</span></e-layout-sider>');
    expect(el.children.length).toBe(1);
    const a = aside(el);
    expect(a.tagName).toBe('ASIDE');
    expect(a.firstElementChild!.id).toBe('s');
    expect(a.style.width).toBe('220px');
    expect(el.style.width).toBe('');
  });

  it('clamps width into 0..10000 and falls back for invalid input', () => {
    const el = mount('<e-layout-sider></e-layout-sider>');
    const a = aside(el);
    const table: Array<[string | null, string]> = [
      ['240', '240px'],
      ['abc', '220px'],
      ['NaN', '220px'],
      ['-50', '0px'],
      ['99999', '10000px'],
      ['120.5', '120.5px'],
      ['1e3', '1000px'],
      ['', '220px'],
      ['   ', '220px'],
    ];
    for (const [value, expected] of table) {
      el.setAttribute('width', value!);
      expect(a.style.width, `width=${JSON.stringify(value)}`).toBe(expected);
    }
    el.removeAttribute('width');
    expect(a.style.width).toBe('220px');
  });

  it('does not re-wrap on reconnect', () => {
    const el = mount('<e-layout-sider width="300">x</e-layout-sider>');
    const a = aside(el);
    remount(el);
    expect(el.querySelectorAll('aside').length).toBe(1);
    expect(aside(el)).toBe(a);
    expect(a.style.width).toBe('300px');
  });

  it('ignores attribute changes before the aside exists', () => {
    const el = document.createElement('e-layout-sider');
    el.setAttribute('width', '300');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-kaleido
 * ===================================================================== */

describe('e-kaleido', () => {
  const HEXES = ['#000000', '#FFFFFF', '#D11A1A', '#E26A1B', '#E8C81C', '#1F8A3B', '#1E4FB8'];
  const NAMES = ['Ink', 'Paper', 'Red', 'Orange', 'Yellow', 'Green', 'Blue'];

  const pixel = (canvas: HTMLCanvasElement, x = 0, y = 0): [number, number, number, number] => {
    const data = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data;
    return [data[0]!, data[1]!, data[2]!, data[3]!];
  };

  it('renders one canvas per palette entry, in order', () => {
    const el = mount('<e-kaleido></e-kaleido>');
    const canvases = [...el.querySelectorAll<HTMLCanvasElement>('canvas[data-color]')];
    expect(canvases.length).toBe(7);
    expect(canvases.map((c) => c.dataset['color'])).toEqual(HEXES);
  });

  it('labels every card with its color name and hex', () => {
    const el = mount('<e-kaleido></e-kaleido>');
    const text = el.textContent ?? '';
    for (const name of NAMES) expect(text).toContain(name);
    for (const hex of HEXES) expect(text).toContain(hex);
    expect(text.match(/IDEAL/g)!.length).toBe(7);
    expect(text.match(/KALEIDO/g)!.length).toBe(7);
  });

  it('uses no CSS classes at all', () => {
    const el = mount('<e-kaleido></e-kaleido>');
    expect(el.querySelectorAll('[class]').length).toBe(0);
  });

  it('sizes every canvas to 88 CSS px at device pixel ratio', () => {
    const el = mount('<e-kaleido></e-kaleido>');
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    for (const canvas of el.querySelectorAll<HTMLCanvasElement>('canvas')) {
      expect(canvas.width).toBe(88 * dpr);
      expect(canvas.height).toBe(88 * dpr);
      expect(canvas.style.width).toBe('88px');
      expect(canvas.style.height).toBe('88px');
    }
  });

  it('short-circuits white, fills black solid and dithers the chromatic swatches', () => {
    const el = mount('<e-kaleido cell="3"></e-kaleido>');
    const byHex = (hex: string): HTMLCanvasElement =>
      el.querySelector<HTMLCanvasElement>(`canvas[data-color="${hex}"]`)!;
    expect(pixel(byHex('#FFFFFF'))).toEqual([255, 255, 255, 255]);
    expect(pixel(byHex('#000000'))).toEqual([0, 0, 0, 255]);
    // BAYER_8[0][0] === 0, so t = 0 < density: the top-left cell is filled
    // with the swatch color itself.
    expect(pixel(byHex('#D11A1A'))).toEqual([209, 26, 26, 255]);
    expect(pixel(byHex('#1E4FB8'))).toEqual([30, 79, 184, 255]);
  });

  it('clamps cell into 1..88, so zero and negative values still dither', () => {
    const red = (el: HTMLElement): HTMLCanvasElement =>
      el.querySelector<HTMLCanvasElement>('canvas[data-color="#D11A1A"]')!;
    // cell="0" would make Math.ceil(88 / cell) Infinity without the clamp.
    const zero = mount('<e-kaleido cell="0"></e-kaleido>');
    expect(pixel(red(zero))).toEqual([209, 26, 26, 255]);
    const negative = mount('<e-kaleido cell="-1"></e-kaleido>');
    expect(pixel(red(negative))).toEqual([209, 26, 26, 255]);
    // The two early-return colors are unaffected by cell.
    expect(
      pixel(negative.querySelector<HTMLCanvasElement>('canvas[data-color="#000000"]')!),
    ).toEqual([0, 0, 0, 255]);
    // Above the swatch edge the clamp leaves a single cell covering the canvas.
    const huge = mount('<e-kaleido cell="500"></e-kaleido>');
    expect(pixel(red(huge))).toEqual([209, 26, 26, 255]);
    expect(pixel(red(huge), 87, 87)).toEqual([209, 26, 26, 255]);
  });

  it('re-renders destructively when cell changes after mount', () => {
    const el = mount('<e-kaleido cell="3"></e-kaleido>');
    const before = el.querySelector('canvas')!;
    el.setAttribute('cell', '6');
    const after = el.querySelector('canvas')!;
    expect(after).not.toBe(before);
    expect(before.isConnected).toBe(false);
    expect(el.querySelectorAll('canvas').length).toBe(7);
  });

  it('falls back to cell=3 for an empty or non-numeric value', () => {
    const el = mount('<e-kaleido cell="abc"></e-kaleido>');
    const red = () => el.querySelector<HTMLCanvasElement>('canvas[data-color="#D11A1A"]')!;
    expect(pixel(red())).toEqual([209, 26, 26, 255]);
    el.setAttribute('cell', '');
    expect(pixel(red())).toEqual([209, 26, 26, 255]);
    el.removeAttribute('cell');
    expect(pixel(red())).toEqual([209, 26, 26, 255]);
  });

  it('accepts a fractional cell', () => {
    const el = mount('<e-kaleido cell="2.5"></e-kaleido>');
    expect(el.querySelectorAll('canvas').length).toBe(7);
  });

  it('fully re-renders on every reconnect (no _wired latch)', () => {
    const el = mount('<e-kaleido></e-kaleido>');
    const before = el.querySelector('canvas')!;
    remount(el);
    expect(el.querySelectorAll('canvas').length).toBe(7);
    expect(el.querySelector('canvas')).not.toBe(before);
  });

  it('ignores attribute changes while disconnected', () => {
    const el = document.createElement('e-kaleido');
    el.setAttribute('cell', '4');
    expect(el.innerHTML).toBe('');
  });
});

/* ===================================================================== *
 * e-watermark
 * ===================================================================== */

describe('e-watermark', () => {
  const layer = (el: HTMLElement): HTMLElement => el.querySelector('.ink-watermark__layer')!;

  const svgOf = (el: HTMLElement): string => {
    const raw = layer(el).style.backgroundImage;
    const match = /^url\("?data:image\/svg\+xml;utf8,(.*?)"?\)$/.exec(raw);
    return match ? decodeURIComponent(match[1]!) : '';
  };

  it('wraps children and appends an aria-hidden layer last', () => {
    const el = mount('<e-watermark content="DRAFT"><article id="a">Body</article></e-watermark>');
    expect(el.children.length).toBe(1);
    const wrap = el.firstElementChild as HTMLElement;
    expect(wrap.className).toBe('ink-watermark');
    expect(wrap.firstElementChild!.id).toBe('a');
    const l = layer(el);
    expect(l.getAttribute('aria-hidden')).toBe('true');
    expect(wrap.lastElementChild).toBe(l);
  });

  it('builds an svg data-uri background with the defaults', () => {
    const el = mount('<e-watermark content="DRAFT"></e-watermark>');
    const svg = svgOf(el);
    expect(svg).toContain('width="120" height="80"');
    expect(svg).toContain('transform="rotate(-22 60 40)"');
    expect(svg).toContain('fill-opacity="0.18"');
    expect(svg).toContain('font-size="16"');
    expect(svg).toContain('>DRAFT<');
    expect(layer(el).style.backgroundSize).toBe('120px 80px');
  });

  it('repaints when content changes and clears the image when it is removed', () => {
    const el = mount('<e-watermark content="DRAFT"></e-watermark>');
    el.setAttribute('content', 'COPY');
    expect(svgOf(el)).toContain('>COPY<');
    el.removeAttribute('content');
    expect(layer(el).style.backgroundImage).toBe('');
  });

  it('clears the backgroundSize alongside the image when the content goes away', () => {
    const el = mount('<e-watermark content="DRAFT" gap-x="300" gap-y="200"></e-watermark>');
    expect(layer(el).style.backgroundSize).toBe('300px 200px');
    el.setAttribute('content', '');
    expect(layer(el).style.backgroundImage).toBe('');
    expect(layer(el).style.backgroundSize).toBe('');
    el.setAttribute('content', 'DRAFT');
    expect(layer(el).style.backgroundSize).toBe('300px 200px');
  });

  it('clamps every numeric attribute to its documented range', () => {
    const el = mount('<e-watermark content="X" font-size="2"></e-watermark>');
    expect(svgOf(el)).toContain('font-size="8"');
    el.setAttribute('font-size', '9999');
    expect(svgOf(el)).toContain('font-size="512"');
    el.setAttribute('font-size', 'abc');
    expect(svgOf(el)).toContain('font-size="16"');

    el.setAttribute('gap-x', '5');
    el.setAttribute('gap-y', '1');
    expect(layer(el).style.backgroundSize).toBe('20px 20px');
    el.setAttribute('gap-x', '99999');
    expect(layer(el).style.backgroundSize).toBe('10000px 20px');

    el.setAttribute('gap-x', '120');
    el.setAttribute('gap-y', '80');
    el.setAttribute('rotate', '900');
    expect(svgOf(el)).toContain('rotate(360 60 40)');
    el.setAttribute('rotate', '-900');
    expect(svgOf(el)).toContain('rotate(-360 60 40)');

    el.setAttribute('opacity', '5');
    expect(svgOf(el)).toContain('fill-opacity="1"');
    el.setAttribute('opacity', '-2');
    expect(svgOf(el)).toContain('fill-opacity="0"');
    el.setAttribute('opacity', '0.5');
    expect(svgOf(el)).toContain('fill-opacity="0.5"');
  });

  it('escapes the content into the svg text node rather than emitting markup', () => {
    const el = mount('<e-watermark></e-watermark>');
    el.setAttribute('content', '<script>alert(1)</script>');
    const raw = layer(el).style.backgroundImage;
    expect(raw).not.toContain('%3Cscript%3E');
    expect(svgOf(el)).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(el.querySelector('script')).toBeNull();
  });

  it('does not double-wrap on reconnect', () => {
    const el = mount('<e-watermark content="DRAFT">x</e-watermark>');
    const l = layer(el);
    remount(el);
    expect(el.querySelectorAll('.ink-watermark').length).toBe(1);
    expect(el.querySelectorAll('.ink-watermark__layer').length).toBe(1);
    expect(layer(el)).toBe(l);
  });

  it('ignores attribute changes before the layer exists', () => {
    const el = document.createElement('e-watermark');
    el.setAttribute('content', 'DRAFT');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-badge
 * ===================================================================== */

describe('e-badge', () => {
  it('wraps children in span.ink-badge', () => {
    const el = mount('<e-badge>NEW</e-badge>');
    const wrap = el.firstElementChild as HTMLElement;
    expect(el.children.length).toBe(1);
    expect(wrap.tagName).toBe('SPAN');
    expect(wrap.className).toBe('ink-badge');
    expect(wrap.textContent).toBe('NEW');
  });

  it('toggles the inverted modifier through add -> change -> remove', () => {
    const el = mount('<e-badge>NEW</e-badge>');
    const wrap = el.firstElementChild as HTMLElement;
    el.setAttribute('inverted', '');
    expect(wrap.className).toBe('ink-badge ink-badge--inverted');
    el.setAttribute('inverted', 'false');
    expect(wrap.className).toBe('ink-badge');
    el.setAttribute('inverted', 'yes');
    expect(wrap.classList.contains('ink-badge--inverted')).toBe(true);
    el.removeAttribute('inverted');
    expect(wrap.className).toBe('ink-badge');
  });

  it('starts inverted when authored that way', () => {
    const el = mount('<e-badge inverted>NEW</e-badge>');
    expect(el.firstElementChild!.className).toBe('ink-badge ink-badge--inverted');
  });

  it('does not double-wrap on reconnect', () => {
    const el = mount('<e-badge inverted>NEW</e-badge>');
    const wrap = el.firstElementChild;
    remount(el);
    expect(el.children.length).toBe(1);
    expect(el.firstElementChild).toBe(wrap);
  });

  it('ignores attribute changes before the wrapper exists', () => {
    const el = document.createElement('e-badge');
    el.setAttribute('inverted', '');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-tag
 * ===================================================================== */

describe('e-tag', () => {
  const closeBtn = (el: HTMLElement): HTMLButtonElement | null =>
    el.querySelector('button.ink-tag__close');

  it('wraps children and renders no close button by default', () => {
    const el = mount('<e-tag>Draft</e-tag>');
    const wrap = el.firstElementChild as HTMLElement;
    expect(el.children.length).toBe(1);
    expect(wrap.className).toBe('ink-tag');
    expect(closeBtn(el)).toBeNull();
  });

  it('adds and removes the close button as closable toggles', () => {
    const el = mount('<e-tag>Draft</e-tag>');
    el.setAttribute('closable', '');
    const btn = closeBtn(el)!;
    expect(btn.type).toBe('button');
    expect(btn.getAttribute('aria-label')).toBe('Remove');
    expect(btn.querySelector('svg')).not.toBeNull();
    expect(el.querySelector('.ink-tag')!.lastElementChild).toBe(btn);
    el.setAttribute('closable', 'false');
    expect(closeBtn(el)).toBeNull();
    el.setAttribute('closable', '');
    expect(closeBtn(el)).not.toBeNull();
    el.removeAttribute('closable');
    expect(closeBtn(el)).toBeNull();
  });

  it('fires e-close with the trimmed label as value', () => {
    const el = mount('<e-tag closable> Draft </e-tag>');
    const seen = listen<{ value: string }>(el, 'e-close');
    closeBtn(el)!.click();
    expect(seen.length).toBe(1);
    expect(seen[0]!.detail).toEqual({ value: 'Draft' });
    expect(seen[0]!.bubbles).toBe(true);
  });

  it('reflects disabled onto the close button and suppresses e-close', () => {
    const el = mount('<e-tag closable>Draft</e-tag>');
    const btn = closeBtn(el)!;
    expect(btn.disabled).toBe(false);
    el.setAttribute('disabled', '');
    expect(btn.disabled).toBe(true);
    expect(btn.hasAttribute('disabled')).toBe(true);
    const seen = listen<{ value: string }>(el, 'e-close');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen.length).toBe(0);
    el.removeAttribute('disabled');
    expect(btn.disabled).toBe(false);
    expect(btn.hasAttribute('disabled')).toBe(false);
    btn.click();
    expect(seen.length).toBe(1);
  });

  it('honours disabled="false" as enabled', () => {
    const el = mount('<e-tag closable disabled="false">Draft</e-tag>');
    expect(closeBtn(el)!.disabled).toBe(false);
  });

  it('does not double-bind the close listener across disconnect/reconnect', () => {
    const el = mount('<e-tag closable>Draft</e-tag>');
    remount(el);
    expect(el.querySelectorAll('.ink-tag').length).toBe(1);
    expect(el.querySelectorAll('button.ink-tag__close').length).toBe(1);
    const seen = listen<{ value: string }>(el, 'e-close');
    closeBtn(el)!.click();
    expect(seen.length).toBe(1);
  });

  it('ignores attribute changes before the wrapper exists', () => {
    const el = document.createElement('e-tag');
    el.setAttribute('closable', '');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-chip
 * ===================================================================== */

describe('e-chip', () => {
  const inner = (el: HTMLElement): HTMLButtonElement => el.querySelector('button.ink-chip')!;

  it('wraps children in a type=button chip with aria-pressed', () => {
    const el = mount('<e-chip>Today</e-chip>');
    const btn = inner(el);
    expect(el.children.length).toBe(1);
    expect(btn.type).toBe('button');
    expect(btn.className).toBe('ink-chip');
    expect(btn.textContent).toBe('Today');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('reflects the selected attribute onto aria-pressed', () => {
    const el = mount('<e-chip selected>Today</e-chip>');
    expect(inner(el).getAttribute('aria-pressed')).toBe('true');
    el.setAttribute('selected', 'false');
    expect(inner(el).getAttribute('aria-pressed')).toBe('false');
    el.setAttribute('selected', '');
    expect(inner(el).getAttribute('aria-pressed')).toBe('true');
    el.removeAttribute('selected');
    expect(inner(el).getAttribute('aria-pressed')).toBe('false');
  });

  it('toggles selected and fires e-change with the new state', () => {
    const el = mount('<e-chip>Today</e-chip>');
    const seen = listen<{ value: boolean }>(el, 'e-change');
    inner(el).click();
    expect(el.hasAttribute('selected')).toBe(true);
    expect(inner(el).getAttribute('aria-pressed')).toBe('true');
    expect(seen[0]!.detail).toEqual({ value: true });
    inner(el).click();
    expect(el.hasAttribute('selected')).toBe(false);
    expect(seen[1]!.detail).toEqual({ value: false });
    expect(seen.length).toBe(2);
  });

  it('reflects disabled and suppresses the click entirely', () => {
    const el = mount('<e-chip disabled>Today</e-chip>');
    const btn = inner(el);
    expect(btn.disabled).toBe(true);
    expect(btn.hasAttribute('disabled')).toBe(true);
    const seen = listen<{ value: boolean }>(el, 'e-change');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen.length).toBe(0);
    expect(el.hasAttribute('selected')).toBe(false);
    el.removeAttribute('disabled');
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(seen.length).toBe(1);
  });

  it('does not double-bind the click listener across disconnect/reconnect', () => {
    const el = mount('<e-chip>Today</e-chip>');
    const btn = inner(el);
    remount(el);
    expect(el.querySelectorAll('button.ink-chip').length).toBe(1);
    expect(inner(el)).toBe(btn);
    const seen = listen<{ value: boolean }>(el, 'e-change');
    btn.click();
    expect(seen.length).toBe(1);
  });

  it('ignores attribute changes before the wrapper exists', () => {
    const el = document.createElement('e-chip');
    el.setAttribute('selected', '');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-card
 * ===================================================================== */

describe('e-card', () => {
  it('builds a section with body only when there is no header content', () => {
    const el = mount('<e-card>Body</e-card>');
    const section = el.firstElementChild as HTMLElement;
    expect(section.tagName).toBe('SECTION');
    expect(section.className).toBe('ink-card');
    expect(section.children.length).toBe(1);
    expect(section.firstElementChild!.className).toBe('ink-card__body');
    expect(section.firstElementChild!.textContent).toBe('Body');
    expect(el.querySelector('.ink-card__header')).toBeNull();
  });

  it('renders eyebrow, title and action inside the header', () => {
    const el = mount(
      '<e-card eyebrow="PROJECT" title="Atlas"><span slot="action" id="act">Open</span>Body</e-card>',
    );
    const header = el.querySelector('.ink-card__header')!;
    const left = header.firstElementChild!;
    expect(left.querySelector('.ink-card__eyebrow')!.textContent).toBe('PROJECT');
    expect(left.querySelector('h3.ink-card__title')!.textContent).toBe('Atlas');
    expect(header.lastElementChild!.id).toBe('act');
    expect(el.querySelector('.ink-card__body')!.textContent).toBe('Body');
    expect(header.nextElementSibling!.className).toBe('ink-card__body');
  });

  it('creates the header lazily when a title arrives after mount', () => {
    const el = mount('<e-card>Body</e-card>');
    el.setAttribute('title', 'Later');
    const section = el.querySelector('section.ink-card')!;
    expect(section.firstElementChild!.className).toBe('ink-card__header');
    expect(section.querySelector('.ink-card__title')!.textContent).toBe('Later');
    el.setAttribute('title', 'Renamed');
    expect(section.querySelector('.ink-card__title')!.textContent).toBe('Renamed');
  });

  it('drops the whole header when title and eyebrow both go away', () => {
    const el = mount('<e-card title="T" eyebrow="E">Body</e-card>');
    expect(el.querySelector('.ink-card__header')).not.toBeNull();
    el.removeAttribute('eyebrow');
    expect(el.querySelector('.ink-card__eyebrow')).toBeNull();
    expect(el.querySelector('.ink-card__header')).not.toBeNull();
    el.removeAttribute('title');
    expect(el.querySelector('.ink-card__header')).toBeNull();
    expect(el.querySelector('.ink-card__title')).toBeNull();
  });

  it('keeps the header alive for an action slot even with no title', () => {
    const el = mount('<e-card><span slot="action" id="act">Open</span>Body</e-card>');
    const header = el.querySelector('.ink-card__header')!;
    expect(header).not.toBeNull();
    expect(header.querySelector('.ink-card__title')).toBeNull();
    expect(header.querySelector('#act')).not.toBeNull();
    el.setAttribute('title', 'T');
    expect(header.querySelector('.ink-card__title')!.textContent).toBe('T');
    el.removeAttribute('title');
    expect(el.querySelector('.ink-card__header')).toBe(header);
  });

  it('treats title="" as absent', () => {
    const el = mount('<e-card title="">Body</e-card>');
    expect(el.querySelector('.ink-card__header')).toBeNull();
  });

  it('renders markup-looking title text as text', () => {
    const el = mount('<e-card title="&lt;b&gt;T&lt;/b&gt;">Body</e-card>');
    const title = el.querySelector('.ink-card__title')!;
    expect(title.textContent).toBe('<b>T</b>');
    expect(title.querySelector('b')).toBeNull();
  });

  it('does not rebuild the section on reconnect', () => {
    const el = mount('<e-card title="T">Body</e-card>');
    const section = el.querySelector('section.ink-card');
    remount(el);
    expect(el.querySelectorAll('section.ink-card').length).toBe(1);
    expect(el.querySelector('section.ink-card')).toBe(section);
    expect(el.querySelectorAll('.ink-card__body').length).toBe(1);
  });

  it('ignores attribute changes before the section exists', () => {
    const el = document.createElement('e-card');
    el.setAttribute('title', 'T');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-card-image
 * ===================================================================== */

describe('e-card-image', () => {
  it('orders cover, header, body and footer inside the section', () => {
    const el = mount(
      '<e-card-image cover="hatch" eyebrow="GUIDE" title="Setup">Lorem<div slot="footer" id="ft">Updated</div></e-card-image>',
    );
    const section = el.querySelector('section.ink-card')!;
    expect([...section.children].map((c) => c.className)).toEqual([
      'ink-card__cover ink-card__cover--hatch',
      'ink-card__header',
      'ink-card__body',
      'ink-card__footer',
    ]);
    expect(section.querySelector('.ink-card__cover')!.textContent).toBe('');
    expect(section.querySelector('.ink-card__eyebrow')!.textContent).toBe('GUIDE');
    expect(section.querySelector('.ink-card__title')!.textContent).toBe('Setup');
    expect(section.querySelector('.ink-card__footer')!.firstElementChild!.id).toBe('ft');
  });

  it('omits the footer when no [slot="footer"] child was authored', () => {
    const el = mount('<e-card-image title="Setup">Lorem</e-card-image>');
    expect(el.querySelector('.ink-card__footer')).toBeNull();
    expect([...el.querySelector('section')!.children].map((c) => c.className)).toEqual([
      'ink-card__header',
      'ink-card__body',
    ]);
  });

  it('renders a non-hatch cover as text and switches to the hatch modifier', () => {
    const el = mount('<e-card-image cover="Photo">Body</e-card-image>');
    const cover = el.querySelector('.ink-card__cover')!;
    expect(cover.className).toBe('ink-card__cover');
    expect(cover.textContent).toBe('Photo');
    el.setAttribute('cover', 'hatch');
    expect(cover.className).toBe('ink-card__cover ink-card__cover--hatch');
    expect(cover.textContent).toBe('');
    el.setAttribute('cover', 'hatch-dense');
    expect(cover.className).toBe('ink-card__cover ink-card__cover--hatch');
    el.setAttribute('cover', 'Other');
    expect(cover.className).toBe('ink-card__cover');
    expect(cover.textContent).toBe('Other');
  });

  it('creates an empty cover for cover="" and removes it when the attribute goes', () => {
    const el = mount('<e-card-image cover="">Body</e-card-image>');
    const cover = el.querySelector('.ink-card__cover')!;
    expect(cover.className).toBe('ink-card__cover');
    expect(cover.textContent).toBe('');
    el.removeAttribute('cover');
    expect(el.querySelector('.ink-card__cover')).toBeNull();
    expect(cover.isConnected).toBe(false);
  });

  it('adds the cover lazily and keeps the header after it', () => {
    const el = mount('<e-card-image title="T">Body</e-card-image>');
    el.setAttribute('cover', 'hatch');
    expect([...el.querySelector('section')!.children].map((c) => c.className)).toEqual([
      'ink-card__cover ink-card__cover--hatch',
      'ink-card__header',
      'ink-card__body',
    ]);
  });

  it('drops the header when title and eyebrow both go away', () => {
    const el = mount('<e-card-image eyebrow="E" title="T">Body</e-card-image>');
    el.removeAttribute('eyebrow');
    el.removeAttribute('title');
    expect(el.querySelector('.ink-card__header')).toBeNull();
    expect(el.querySelector('.ink-card__title')).toBeNull();
    expect(el.querySelector('.ink-card__eyebrow')).toBeNull();
    el.setAttribute('title', 'Back');
    expect(el.querySelector('.ink-card__title')!.textContent).toBe('Back');
  });

  it('renders markup-looking cover text as text', () => {
    const el = mount('<e-card-image cover="&lt;b&gt;c&lt;/b&gt;">Body</e-card-image>');
    const cover = el.querySelector('.ink-card__cover')!;
    expect(cover.textContent).toBe('<b>c</b>');
    expect(cover.querySelector('b')).toBeNull();
  });

  it('does not rebuild on reconnect', () => {
    const el = mount(
      '<e-card-image title="T" cover="hatch">Body<div slot="footer">F</div></e-card-image>',
    );
    const section = el.querySelector('section.ink-card');
    remount(el);
    expect(el.querySelectorAll('section.ink-card').length).toBe(1);
    expect(el.querySelector('section.ink-card')).toBe(section);
    expect(el.querySelectorAll('.ink-card__footer').length).toBe(1);
  });

  it('ignores attribute changes before the section exists', () => {
    const el = document.createElement('e-card-image');
    el.setAttribute('cover', 'hatch');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * e-description-list / e-desc-item
 * ===================================================================== */

describe('e-description-list', () => {
  const sample =
    '<e-description-list columns="2" bordered>' +
    '<e-desc-item term="Status">Shipped</e-desc-item>' +
    '<e-desc-item term="Tracking"><b id="code">EP-2048</b></e-desc-item>' +
    '</e-description-list>';

  it('renders a dl of dt/dd pairs and moves the detail nodes across', () => {
    const el = mount(sample);
    const dl = el.firstElementChild as HTMLElement;
    expect(el.children.length).toBe(1);
    expect(dl.tagName).toBe('DL');
    expect(dl.className).toBe('ink-desc-list ink-desc-list--horizontal ink-desc-list--bordered');
    const pairs = dl.querySelectorAll('.ink-desc-list__pair');
    expect(pairs.length).toBe(2);
    expect(pairs[0]!.children[0]!.tagName).toBe('DT');
    expect(pairs[0]!.children[0]!.className).toBe('ink-desc-list__term');
    expect(pairs[0]!.children[0]!.textContent).toBe('Status');
    expect(pairs[0]!.children[1]!.tagName).toBe('DD');
    expect(pairs[0]!.children[1]!.className).toBe('ink-desc-list__detail');
    expect(pairs[0]!.children[1]!.textContent).toBe('Shipped');
    expect(pairs[1]!.querySelector('#code')).not.toBeNull();
    expect(el.querySelectorAll('e-desc-item').length).toBe(0);
  });

  it('clamps columns into 1..4 and rejects fractions back to the default', () => {
    const el = mount(
      '<e-description-list><e-desc-item term="a">1</e-desc-item></e-description-list>',
    );
    const dl = el.querySelector('dl')!;
    const track = (): string => dl.style.gridTemplateColumns;
    expect(track()).toBe('repeat(1, minmax(0px, 1fr))');
    el.setAttribute('columns', '3');
    expect(track()).toBe('repeat(3, minmax(0px, 1fr))');
    el.setAttribute('columns', '9');
    expect(track()).toBe('repeat(4, minmax(0px, 1fr))');
    el.setAttribute('columns', '0');
    expect(track()).toBe('repeat(1, minmax(0px, 1fr))');
    el.setAttribute('columns', '2.5');
    expect(track()).toBe('repeat(1, minmax(0px, 1fr))');
    el.removeAttribute('columns');
    expect(track()).toBe('repeat(1, minmax(0px, 1fr))');
  });

  it('switches layout and bordered after mount, without rebuilding the dl', () => {
    const el = mount(sample);
    const dl = el.querySelector('dl')!;
    el.setAttribute('layout', 'vertical');
    expect(dl.className).toBe('ink-desc-list ink-desc-list--vertical ink-desc-list--bordered');
    el.removeAttribute('bordered');
    expect(dl.className).toBe('ink-desc-list ink-desc-list--vertical');
    el.setAttribute('layout', 'VERTICAL');
    expect(dl.className).toBe('ink-desc-list ink-desc-list--horizontal');
    el.setAttribute('bordered', 'false');
    expect(dl.className).toBe('ink-desc-list ink-desc-list--horizontal');
    el.setAttribute('bordered', 'yes');
    expect(dl.className).toBe('ink-desc-list ink-desc-list--horizontal ink-desc-list--bordered');
    expect(el.querySelector('dl')).toBe(dl);
  });

  it('treats bordered="false" as off at mount time too', () => {
    const el = mount(
      '<e-description-list bordered="false"><e-desc-item term="a">1</e-desc-item></e-description-list>',
    );
    expect(el.querySelector('dl')!.className).toBe('ink-desc-list ink-desc-list--horizontal');
  });

  it('defaults a missing term to an empty dt', () => {
    const el = mount(
      '<e-description-list><e-desc-item>only detail</e-desc-item></e-description-list>',
    );
    expect(el.querySelector('dt')!.textContent).toBe('');
    expect(el.querySelector('dd')!.textContent).toBe('only detail');
  });

  it('renders an empty dl for zero items and still patches attributes', () => {
    const el = mount('<e-description-list></e-description-list>');
    const dl = el.querySelector('dl')!;
    expect(dl.children.length).toBe(0);
    el.setAttribute('columns', '3');
    expect(dl.style.gridTemplateColumns).toBe('repeat(3, minmax(0px, 1fr))');
  });

  it('ignores items appended after connect', () => {
    const el = mount(sample);
    const late = document.createElement('e-desc-item');
    late.setAttribute('term', 'Late');
    el.appendChild(late);
    expect(el.querySelectorAll('.ink-desc-list__pair').length).toBe(2);
  });

  it('does not rebuild on reconnect', () => {
    const el = mount(sample);
    const dl = el.querySelector('dl');
    remount(el);
    expect(el.querySelectorAll('dl').length).toBe(1);
    expect(el.querySelector('dl')).toBe(dl);
  });

  it('renders a markup-looking term as text', () => {
    const el = mount(
      '<e-description-list><e-desc-item term="&lt;script&gt;x&lt;/script&gt;">v</e-desc-item></e-description-list>',
    );
    expect(el.querySelector('dt')!.textContent).toBe('<script>x</script>');
    expect(el.querySelector('dt script')).toBeNull();
  });

  it('ignores attribute changes before the dl exists', () => {
    const el = document.createElement('e-description-list');
    el.setAttribute('columns', '3');
    expect(el.children.length).toBe(0);
  });

  it('e-desc-item on its own is an inert data carrier', () => {
    const el = mount('<e-desc-item term="Status">Shipped</e-desc-item>');
    expect(el.children.length).toBe(0);
    expect(el.textContent).toBe('Shipped');
  });
});

/* ===================================================================== *
 * e-timeline / e-timeline-item
 * ===================================================================== */

describe('e-timeline', () => {
  const sample =
    '<e-timeline>' +
    '<e-timeline-item time="08:30" title="Stand-up" variant="done">Daily <b id="sync">sync</b>.</e-timeline-item>' +
    '<e-timeline-item time="11:00"></e-timeline-item>' +
    '</e-timeline>';

  it('renders an ordered list with marker, time, title and body', () => {
    const el = mount(sample);
    const list = el.firstElementChild as HTMLElement;
    expect(el.children.length).toBe(1);
    expect(list.tagName).toBe('OL');
    expect(list.className).toBe('ink-timeline ink-timeline--time-left');
    const rows = list.querySelectorAll('li.ink-timeline__item');
    expect(rows.length).toBe(2);
    const first = rows[0]!;
    expect(first.getAttribute('data-variant')).toBe('done');
    expect([...first.children].map((c) => c.className)).toEqual([
      'ink-timeline__time',
      'ink-timeline__rail',
      'ink-timeline__content',
    ]);
    expect(first.querySelector('.ink-timeline__time')!.textContent).toBe('08:30');
    const rail = first.querySelector('.ink-timeline__rail')!;
    expect(rail.getAttribute('aria-hidden')).toBe('true');
    expect(rail.firstElementChild!.className).toBe('ink-timeline__marker');
    expect(first.querySelector('.ink-timeline__title')!.textContent).toBe('Stand-up');
    expect(first.querySelector('.ink-timeline__body')!.textContent).toBe('Daily sync.');
    expect(first.querySelector('#sync')).not.toBeNull();
    expect(el.querySelectorAll('e-timeline-item').length).toBe(0);
  });

  it('omits the title and body blocks for an item that has neither', () => {
    const el = mount(sample);
    const second = el.querySelectorAll('li.ink-timeline__item')[1]!;
    expect(second.getAttribute('data-variant')).toBe('default');
    expect(second.querySelector('.ink-timeline__title')).toBeNull();
    expect(second.querySelector('.ink-timeline__body')).toBeNull();
    expect(second.querySelector('.ink-timeline__content')!.children.length).toBe(0);
  });

  it('swaps the time-position modifier after mount without rebuilding', () => {
    const el = mount(sample);
    const list = el.querySelector('ol')!;
    el.setAttribute('time-position', 'right');
    expect(list.className).toBe('ink-timeline ink-timeline--time-right');
    el.setAttribute('time-position', 'RIGHT');
    expect(list.className).toBe('ink-timeline ink-timeline--time-left');
    el.setAttribute('time-position', 'right');
    el.removeAttribute('time-position');
    expect(list.className).toBe('ink-timeline ink-timeline--time-left');
    expect(el.querySelector('ol')).toBe(list);
  });

  it('honours time-position="right" at mount time', () => {
    const el = mount(sample.replace('<e-timeline>', '<e-timeline time-position="right">'));
    expect(el.querySelector('ol')!.className).toBe('ink-timeline ink-timeline--time-right');
  });

  it('renders an empty ol for zero items and still patches the modifier', () => {
    const el = mount('<e-timeline></e-timeline>');
    const list = el.querySelector('ol')!;
    expect(list.children.length).toBe(0);
    el.setAttribute('time-position', 'right');
    expect(list.className).toBe('ink-timeline ink-timeline--time-right');
  });

  it('ignores items appended after connect', () => {
    const el = mount(sample);
    const late = document.createElement('e-timeline-item');
    late.setAttribute('time', '13:00');
    el.appendChild(late);
    expect(el.querySelectorAll('li.ink-timeline__item').length).toBe(2);
  });

  it('does not rebuild on reconnect', () => {
    const el = mount(sample);
    const list = el.querySelector('ol');
    remount(el);
    expect(el.querySelectorAll('ol').length).toBe(1);
    expect(el.querySelector('ol')).toBe(list);
  });

  it('renders markup-looking time/title values as text', () => {
    const el = mount(
      '<e-timeline><e-timeline-item time="&lt;i&gt;t&lt;/i&gt;" title="&lt;script&gt;x&lt;/script&gt;">b</e-timeline-item></e-timeline>',
    );
    expect(el.querySelector('.ink-timeline__time')!.textContent).toBe('<i>t</i>');
    expect(el.querySelector('.ink-timeline__title')!.textContent).toBe('<script>x</script>');
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('.ink-timeline__time i')).toBeNull();
  });

  it('ignores attribute changes before the list exists', () => {
    const el = document.createElement('e-timeline');
    el.setAttribute('time-position', 'right');
    expect(el.children.length).toBe(0);
  });

  it('e-timeline-item on its own is an inert data carrier', () => {
    const el = mount('<e-timeline-item time="08:30">Body</e-timeline-item>');
    expect(el.children.length).toBe(0);
    expect(el.textContent).toBe('Body');
  });
});

/* ===================================================================== *
 * e-diff
 * ===================================================================== */

describe('e-diff', () => {
  const val = (el: HTMLElement, which: 'before' | 'after'): string =>
    el.querySelector(`.ink-diff__state--${which} .ink-diff__value`)!.textContent ?? '';
  const lbl = (el: HTMLElement, which: 'before' | 'after'): string =>
    el.querySelector(`.ink-diff__state--${which} .ink-diff__label`)!.textContent ?? '';

  it('renders both states, the cue and the group semantics', () => {
    const el = mount('<e-diff label="Firmware" before="1.8.4" after="1.9.0"></e-diff>');
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-label')).toBe('Firmware: changed');
    const rootEl = el.querySelector('.ink-diff')!;
    expect(rootEl.getAttribute('data-changed')).toBe('true');
    expect(rootEl.getAttribute('data-layout')).toBe('inline');
    expect(lbl(el, 'before')).toBe('Previous');
    expect(lbl(el, 'after')).toBe('Current');
    expect(val(el, 'before')).toBe('1.8.4');
    expect(val(el, 'after')).toBe('1.9.0');
    expect(el.querySelector('.ink-diff__cue')!.textContent).toBe('→ Changed');
  });

  it('reports unchanged when before and after match, including both absent', () => {
    const el = mount('<e-diff before="1.0" after="1.0"></e-diff>');
    expect(el.querySelector('.ink-diff')!.getAttribute('data-changed')).toBe('false');
    expect(el.querySelector('.ink-diff__cue')!.textContent).toBe('= Unchanged');
    expect(el.getAttribute('aria-label')).toBe('Value comparison: unchanged');
    const bare = mount('<e-diff></e-diff>');
    expect(bare.querySelector('.ink-diff')!.getAttribute('data-changed')).toBe('false');
    expect(val(bare, 'before')).toBe('—');
    expect(val(bare, 'after')).toBe('—');
  });

  it('flips changed/unchanged as the values are mutated after mount', () => {
    const el = mount('<e-diff before="a" after="a"></e-diff>');
    const rootEl = el.querySelector('.ink-diff')!;
    el.setAttribute('after', 'b');
    expect(rootEl.getAttribute('data-changed')).toBe('true');
    expect(val(el, 'after')).toBe('b');
    el.removeAttribute('after');
    expect(rootEl.getAttribute('data-changed')).toBe('true');
    expect(val(el, 'after')).toBe('—');
    el.removeAttribute('before');
    expect(rootEl.getAttribute('data-changed')).toBe('false');
    expect(el.querySelector('.ink-diff__cue')!.textContent).toBe('= Unchanged');
  });

  it('honours a custom empty-text placeholder', () => {
    const el = mount('<e-diff after="x" empty-text="none"></e-diff>');
    expect(val(el, 'before')).toBe('none');
    el.setAttribute('empty-text', '');
    expect(val(el, 'before')).toBe('—');
    el.removeAttribute('empty-text');
    expect(val(el, 'before')).toBe('—');
  });

  it('honours custom state headings', () => {
    const el = mount('<e-diff before-label="Was" after-label="Is" before="a" after="b"></e-diff>');
    expect(lbl(el, 'before')).toBe('Was');
    expect(lbl(el, 'after')).toBe('Is');
    el.removeAttribute('before-label');
    el.setAttribute('after-label', '');
    expect(lbl(el, 'before')).toBe('Previous');
    expect(lbl(el, 'after')).toBe('Current');
  });

  it('toggles the stacked layout only for the exact string', () => {
    const el = mount('<e-diff layout="stacked"></e-diff>');
    const rootEl = el.querySelector('.ink-diff')!;
    expect(rootEl.getAttribute('data-layout')).toBe('stacked');
    el.setAttribute('layout', 'STACKED');
    expect(rootEl.getAttribute('data-layout')).toBe('inline');
    el.setAttribute('layout', 'stacked');
    el.removeAttribute('layout');
    expect(rootEl.getAttribute('data-layout')).toBe('inline');
  });

  it('updates the aria-label when the label changes', () => {
    const el = mount('<e-diff before="a" after="b"></e-diff>');
    expect(el.getAttribute('aria-label')).toBe('Value comparison: changed');
    el.setAttribute('label', 'Firmware');
    expect(el.getAttribute('aria-label')).toBe('Firmware: changed');
    el.removeAttribute('label');
    expect(el.getAttribute('aria-label')).toBe('Value comparison: changed');
  });

  it('renders markup-looking values as text', () => {
    const el = mount(
      '<e-diff before="&lt;script&gt;a&lt;/script&gt;" after="&lt;b&gt;c&lt;/b&gt;"></e-diff>',
    );
    expect(val(el, 'before')).toBe('<script>a</script>');
    expect(val(el, 'after')).toBe('<b>c</b>');
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('.ink-diff__value b')).toBeNull();
  });

  it('does not rebuild its scaffold on reconnect', () => {
    const el = mount('<e-diff before="a" after="b"></e-diff>');
    const rootEl = el.querySelector('.ink-diff');
    remount(el);
    expect(el.querySelectorAll('.ink-diff').length).toBe(1);
    expect(el.querySelector('.ink-diff')).toBe(rootEl);
    expect(el.querySelectorAll('.ink-diff__value').length).toBe(2);
  });

  it('ignores attribute changes before the scaffold exists', () => {
    const el = document.createElement('e-diff');
    el.setAttribute('before', 'a');
    expect(el.innerHTML).toBe('');
  });
});

/* ===================================================================== *
 * e-button
 * ===================================================================== */

describe('e-button', () => {
  const inner = (el: HTMLElement): HTMLButtonElement => el.querySelector('button.ink-btn')!;

  it('exposes the associated form through the internals-backed getter', () => {
    const host = mount('<form id="host-form"><e-button>Go</e-button></form>');
    const btn = host.querySelector<ButtonLike>('e-button')!;
    expect(btn.form).toBe(host);
    const loose = mount<ButtonLike>('<e-button>Go</e-button>');
    expect(loose.form).toBeNull();
  });

  it('reflects the type accessor pair onto the attribute', () => {
    const el = mount<ButtonLike>('<e-button>Go</e-button>');
    expect(el.type).toBe('button');
    el.type = 'submit';
    expect(el.getAttribute('type')).toBe('submit');
    expect(el.type).toBe('submit');
    el.type = 'reset';
    expect(el.getAttribute('type')).toBe('reset');
    el.setAttribute('type', 'nonsense');
    expect(el.type).toBe('button');
  });

  it('adds and removes the destructive glyph as variant changes', () => {
    const el = mount('<e-button variant="destructive">Delete</e-button>');
    const btn = inner(el);
    expect(btn.className).toBe('ink-btn ink-btn--destructive');
    expect(btn.firstElementChild!.tagName).toBe('SPAN');
    expect(btn.firstElementChild!.querySelector('svg')).not.toBeNull();
    el.setAttribute('variant', 'primary');
    expect(btn.className).toBe('ink-btn ink-btn--primary');
    expect(btn.querySelector('span svg')).toBeNull();
    el.setAttribute('variant', 'destructive');
    expect(btn.querySelector('span svg')).not.toBeNull();
    el.removeAttribute('variant');
    expect(btn.className).toBe('ink-btn ink-btn--secondary');
    expect(btn.querySelector('span svg')).toBeNull();
  });

  it('does not add a second glyph when the variant is set to destructive twice', () => {
    const el = mount('<e-button variant="destructive">Delete</e-button>');
    el.setAttribute('variant', 'destructive ');
    el.setAttribute('variant', 'destructive');
    expect(inner(el).querySelectorAll('span svg').length).toBe(1);
  });

  it('fires e-click carrying the original MouseEvent', () => {
    const el = mount('<e-button>Go</e-button>');
    const seen = listen<{ originalEvent: MouseEvent }>(el, 'e-click');
    inner(el).click();
    expect(seen.length).toBe(1);
    expect(Object.keys(seen[0]!.detail)).toEqual(['originalEvent']);
    expect(seen[0]!.detail.originalEvent).toBeInstanceOf(MouseEvent);
    expect(seen[0]!.detail.originalEvent.type).toBe('click');
    expect(seen[0]!.bubbles).toBe(true);
  });

  it('suppresses e-click while disabled', () => {
    const el = mount('<e-button disabled>Go</e-button>');
    const seen = listen<{ originalEvent: MouseEvent }>(el, 'e-click');
    inner(el).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen.length).toBe(0);
    el.removeAttribute('disabled');
    inner(el).click();
    expect(seen.length).toBe(1);
  });

  it('submits the owning form for type="submit" and resets it for type="reset"', () => {
    const host = mount(
      '<form><e-button type="submit">Go</e-button><input name="n" value="a"></form>',
    );
    const form = host as HTMLFormElement;
    let submits = 0;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submits += 1;
    });
    const btn = host.querySelector<ButtonLike>('e-button')!;
    inner(btn).click();
    expect(submits).toBe(1);

    const field = form.querySelector('input')!;
    field.value = 'changed';
    btn.type = 'reset';
    inner(btn).click();
    expect(field.value).toBe('a');
    expect(submits).toBe(1);
  });

  it('does not rebuild on reconnect and keeps exactly one click listener', () => {
    const el = mount('<e-button>Go</e-button>');
    const btn = inner(el);
    remount(el);
    expect(el.querySelectorAll('button.ink-btn').length).toBe(1);
    expect(inner(el)).toBe(btn);
    const seen = listen<{ originalEvent: MouseEvent }>(el, 'e-click');
    btn.click();
    expect(seen.length).toBe(1);
  });

  it('ignores attribute changes before the inner button exists', () => {
    const el = document.createElement('e-button');
    el.setAttribute('variant', 'primary');
    el.setAttribute('disabled', '');
    expect(el.children.length).toBe(0);
  });
});

/* ===================================================================== *
 * Cross-component integration: e-form + e-button + e-form-item
 * ===================================================================== */

describe('e-form integration', () => {
  it('an inner e-button type=submit drives e-submit exactly once', () => {
    const el = mount(
      '<e-form><e-form-item label="Name"><e-input></e-input></e-form-item>' +
        '<e-button type="submit" variant="primary">Save</e-button></e-form>',
    );
    const form = el.querySelector('form.ink-form') as HTMLFormElement;
    const submits = listen<{ form: HTMLFormElement }>(el, 'e-submit');
    const clicks = listen<{ originalEvent: MouseEvent }>(el, 'e-click');
    el.querySelector<HTMLButtonElement>('button.ink-btn')!.click();
    expect(clicks.length).toBe(1);
    expect(submits.length).toBe(1);
    expect(submits[0]!.detail.form).toBe(form);
    expect(el.querySelector('.ink-form-item__label')!.textContent).toBe('Name');
  });
});
