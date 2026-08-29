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
import { ICONS } from '../../core/icons';

beforeAll(async () => {
  await import('../badge-count/badge-count');
  await import('../breadcrumb/breadcrumb');
  await import('../flex/flex');
  await import('../grid/grid');
  await import('../icon/icon');
  await import('../link/link');
  await import('../masonry/masonry');
  await import('../ribbon/ribbon');
  await import('../space/space');
  await import('../form/form');
  await import('../layout/layout');
  await import('../kaleido/kaleido');
  await import('../watermark/watermark');
  await import('../badge/badge');
  await import('../tag/tag');
  await import('../chip/chip');
  await import('../card/card');
  await import('../card-image/card-image');
  await import('../description-list/description-list');
  await import('../timeline/timeline');
  await import('../diff/diff');
  await import('../button/button');
  // v2.0.0 maturity work — see the "v2.0.0" sections at the end of this file.
  await import('../textarea/textarea');
  await import('../tabs/tabs');
  await import('../steps/steps');
  await import('../title/title');
  await import('../text/text');
  await import('../list/list');
  await import('../sparkline/sparkline');
  await import('../qrcode/qrcode');
  await import('../alert/alert');
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

/**
 * Let `observeItems` run. A MutationObserver delivers on a microtask and the
 * helper coalesces onto another one, so a task turn is the reliable wait.
 */
const flushObserver = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

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
    expect(el.children).toHaveLength(1);
    expect(wrap.tagName).toBe('SPAN');
    expect(wrap.className).toBe('ink-badge-count');
    expect(wrap.firstChild!.textContent).toBe('Inbox');
    expect(wrap.lastElementChild!.className).toBe('ink-badge-count__num');
    expect(wrap.lastElementChild!.textContent).toBe('3');
  });

  it('hides the chip entirely when count is 0 and dot is absent', () => {
    const el = mount('<e-badge-count count="0">x</e-badge-count>');
    expect(chip(el)).toBeNull();
    expect(el.querySelector('.ink-badge-count')!.children).toHaveLength(0);
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
    expect(el.children).toHaveLength(1);
    expect(el.querySelectorAll('.ink-badge-count')).toHaveLength(1);
    expect(el.querySelectorAll('.ink-badge-count__num')).toHaveLength(1);
  });

  it('ignores attribute changes before the wrapper exists', () => {
    const el = document.createElement('e-badge-count');
    el.setAttribute('count', '5');
    expect(el.children).toHaveLength(0);
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
    // Since v2.0.0 the authored items stay in the light DOM as the component's
    // data source, so the rendered nav is a sibling of them, not the only child.
    const nav = el.querySelector('nav')!;
    expect(el.children).toHaveLength(4);
    expect(nav.tagName).toBe('NAV');
    expect(nav.className).toBe('ink-breadcrumb');
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    expect([...nav.children].map((c) => c.tagName)).toEqual(['A', 'SPAN', 'A', 'SPAN', 'SPAN']);
    const anchors = nav.querySelectorAll('a');
    expect(anchors).toHaveLength(2);
    expect(anchors[0]!.getAttribute('href')).toBe('/a');
    expect(anchors[0]!.textContent).toBe('A');
    expect(anchors[0]!.className).toBe('');
  });

  it('QUIRK: the last item is never an anchor even when it has an href', () => {
    const el = mount(trail);
    const nav = el.querySelector('nav')!;
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
    expect(nav.children).toHaveLength(1);
    expect(nav.children[0]!.className).toBe('ink-breadcrumb__current');
    expect(nav.querySelector('span[aria-hidden]')).toBeNull();
  });

  it('renders an empty nav for zero items and survives a separator change', () => {
    const el = mount('<e-breadcrumb></e-breadcrumb>');
    const nav = el.querySelector('nav')!;
    expect(nav.children).toHaveLength(0);
    el.setAttribute('separator', '-');
    expect(nav.children).toHaveLength(0);
  });

  it('keeps the authored e-breadcrumb-item elements, hidden, as its data source', () => {
    const el = mount(trail);
    const items = el.querySelectorAll<HTMLElement>('e-breadcrumb-item');
    expect(items).toHaveLength(3);
    for (const item of items) expect(item.style.display).toBe('none');
  });

  it('renders items appended after connect', async () => {
    const el = mount(trail);
    const nav = el.querySelector('nav')!;
    const late = document.createElement('e-breadcrumb-item');
    late.textContent = 'D';
    el.appendChild(late);
    await flushObserver();
    // The new item becomes the trail's current page, and the old one demotes
    // to a link — the whole point of making these components observable.
    expect(el.querySelector('.ink-breadcrumb__current')!.textContent).toBe('D');
    expect(nav.querySelector('a[href="/c"]')).not.toBeNull();
  });

  it('does not rebuild on reconnect', () => {
    const el = mount(trail);
    const nav = el.querySelector('nav')!;
    remount(el);
    expect(el.querySelectorAll('nav')).toHaveLength(1);
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
    expect(el.children).toHaveLength(0);
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
    expect(el.children).toHaveLength(1);
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
    expect(el.querySelectorAll('svg')).toHaveLength(1);
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
    expect(el.children).toHaveLength(1);
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
    expect(el.querySelectorAll('a')).toHaveLength(1);
    expect(el.querySelector('a')).toBe(a);
  });

  it('ignores attribute changes before the anchor exists', () => {
    const el = document.createElement('e-link');
    el.setAttribute('href', '/x');
    expect(el.children).toHaveLength(0);
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
    expect(el.children).toHaveLength(1);
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
    expect(el.querySelectorAll('.ink-ribbon')).toHaveLength(1);
    expect(el.querySelectorAll('.ink-ribbon__tag')).toHaveLength(1);
  });

  it('ignores attribute changes before the tag exists', () => {
    const el = document.createElement('e-ribbon');
    el.setAttribute('text', 'A');
    expect(el.children).toHaveLength(0);
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
    expect(el.children).toHaveLength(1);
    const form = el.firstElementChild as HTMLFormElement;
    expect(form.tagName).toBe('FORM');
    expect(form.className).toBe('ink-form');
    expect([...form.children].map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('creates an empty inner form for an empty host', () => {
    const el = mount('<e-form></e-form>');
    const form = el.querySelector('form.ink-form')!;
    expect(form.children).toHaveLength(0);
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
    expect(seen).toHaveLength(1);
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
    expect(seen).toHaveLength(1);
    expect(seen[0]!.target).toBe(el);
  });

  it('does not re-wrap or double-bind the submit listener on reconnect', () => {
    const el = mount('<e-form><span>x</span></e-form>');
    const form = el.querySelector('form.ink-form') as HTMLFormElement;
    remount(el);
    expect(el.querySelectorAll('form.ink-form')).toHaveLength(1);
    expect(el.querySelector('form.ink-form')).toBe(form);
    const seen = listen<{ form: HTMLFormElement }>(el, 'e-submit');
    form.requestSubmit();
    expect(seen).toHaveLength(1);
  });

  it('ignores attribute changes before the inner form exists', () => {
    const el = document.createElement('e-form');
    el.setAttribute('layout', 'inline');
    expect(el.children).toHaveLength(0);
  });
});

/* ===================================================================== *
 * e-form-item
 * ===================================================================== */

describe('e-form-item', () => {
  const root = (el: HTMLElement): HTMLElement => el.querySelector('.ink-form-item')!;

  it('builds the root/control scaffold and moves children into it', () => {
    const el = mount('<e-form-item><e-input></e-input></e-form-item>');
    expect(el.children).toHaveLength(1);
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
    expect(el.querySelectorAll('.ink-form-item')).toHaveLength(1);
    expect(el.querySelectorAll('[data-control]')).toHaveLength(1);
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
    expect(el.children).toHaveLength(0);
  });
});

/* ===================================================================== *
 * e-layout family
 * ===================================================================== */

describe('e-layout', () => {
  it('marks the host and never moves its children', () => {
    const el = mount('<e-layout><span id="c">x</span></e-layout>');
    expect(el.classList.contains('ink-layout')).toBe(true);
    expect(el.children).toHaveLength(1);
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
      expect(el.children).toHaveLength(1);
      const wrap = el.firstElementChild as HTMLElement;
      expect(wrap.tagName).toBe(wrapperTag);
      expect(wrap.className).toBe(cls);
      expect(wrap.firstElementChild!.id).toBe('k');
    });

    it(`${tag} creates the wrapper even when empty and does not double-wrap on reconnect`, () => {
      const el = mount(`<${tag}></${tag}>`);
      const wrap = el.firstElementChild as HTMLElement;
      expect(wrap.children).toHaveLength(0);
      remount(el);
      expect(el.children).toHaveLength(1);
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
    expect(el.children).toHaveLength(1);
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
    expect(el.querySelectorAll('aside')).toHaveLength(1);
    expect(aside(el)).toBe(a);
    expect(a.style.width).toBe('300px');
  });

  it('ignores attribute changes before the aside exists', () => {
    const el = document.createElement('e-layout-sider');
    el.setAttribute('width', '300');
    expect(el.children).toHaveLength(0);
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
    expect(canvases).toHaveLength(7);
    expect(canvases.map((c) => c.dataset['color'])).toEqual(HEXES);
  });

  it('labels every card with its color name and hex', () => {
    const el = mount('<e-kaleido></e-kaleido>');
    const text = el.textContent ?? '';
    for (const name of NAMES) expect(text).toContain(name);
    for (const hex of HEXES) expect(text).toContain(hex);
    expect(text.match(/IDEAL/g)!).toHaveLength(7);
    expect(text.match(/KALEIDO/g)!).toHaveLength(7);
  });

  it('uses no CSS classes at all', () => {
    const el = mount('<e-kaleido></e-kaleido>');
    expect(el.querySelectorAll('[class]')).toHaveLength(0);
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
    expect(el.querySelectorAll('canvas')).toHaveLength(7);
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
    expect(el.querySelectorAll('canvas')).toHaveLength(7);
  });

  it('fully re-renders on every reconnect (no _wired latch)', () => {
    const el = mount('<e-kaleido></e-kaleido>');
    const before = el.querySelector('canvas')!;
    remount(el);
    expect(el.querySelectorAll('canvas')).toHaveLength(7);
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
    expect(el.children).toHaveLength(1);
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
    expect(el.querySelectorAll('.ink-watermark')).toHaveLength(1);
    expect(el.querySelectorAll('.ink-watermark__layer')).toHaveLength(1);
    expect(layer(el)).toBe(l);
  });

  it('ignores attribute changes before the layer exists', () => {
    const el = document.createElement('e-watermark');
    el.setAttribute('content', 'DRAFT');
    expect(el.children).toHaveLength(0);
  });
});

/* ===================================================================== *
 * e-badge
 * ===================================================================== */

describe('e-badge', () => {
  it('wraps children in span.ink-badge', () => {
    const el = mount('<e-badge>NEW</e-badge>');
    const wrap = el.firstElementChild as HTMLElement;
    expect(el.children).toHaveLength(1);
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
    expect(el.children).toHaveLength(1);
    expect(el.firstElementChild).toBe(wrap);
  });

  it('ignores attribute changes before the wrapper exists', () => {
    const el = document.createElement('e-badge');
    el.setAttribute('inverted', '');
    expect(el.children).toHaveLength(0);
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
    expect(el.children).toHaveLength(1);
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
    expect(seen).toHaveLength(1);
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
    expect(seen).toHaveLength(0);
    el.removeAttribute('disabled');
    expect(btn.disabled).toBe(false);
    expect(btn.hasAttribute('disabled')).toBe(false);
    btn.click();
    expect(seen).toHaveLength(1);
  });

  it('honours disabled="false" as enabled', () => {
    const el = mount('<e-tag closable disabled="false">Draft</e-tag>');
    expect(closeBtn(el)!.disabled).toBe(false);
  });

  it('does not double-bind the close listener across disconnect/reconnect', () => {
    const el = mount('<e-tag closable>Draft</e-tag>');
    remount(el);
    expect(el.querySelectorAll('.ink-tag')).toHaveLength(1);
    expect(el.querySelectorAll('button.ink-tag__close')).toHaveLength(1);
    const seen = listen<{ value: string }>(el, 'e-close');
    closeBtn(el)!.click();
    expect(seen).toHaveLength(1);
  });

  it('ignores attribute changes before the wrapper exists', () => {
    const el = document.createElement('e-tag');
    el.setAttribute('closable', '');
    expect(el.children).toHaveLength(0);
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
    expect(el.children).toHaveLength(1);
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
    expect(seen).toHaveLength(2);
  });

  it('reflects disabled and suppresses the click entirely', () => {
    const el = mount('<e-chip disabled>Today</e-chip>');
    const btn = inner(el);
    expect(btn.disabled).toBe(true);
    expect(btn.hasAttribute('disabled')).toBe(true);
    const seen = listen<{ value: boolean }>(el, 'e-change');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen).toHaveLength(0);
    expect(el.hasAttribute('selected')).toBe(false);
    el.removeAttribute('disabled');
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(seen).toHaveLength(1);
  });

  it('does not double-bind the click listener across disconnect/reconnect', () => {
    const el = mount('<e-chip>Today</e-chip>');
    const btn = inner(el);
    remount(el);
    expect(el.querySelectorAll('button.ink-chip')).toHaveLength(1);
    expect(inner(el)).toBe(btn);
    const seen = listen<{ value: boolean }>(el, 'e-change');
    btn.click();
    expect(seen).toHaveLength(1);
  });

  it('ignores attribute changes before the wrapper exists', () => {
    const el = document.createElement('e-chip');
    el.setAttribute('selected', '');
    expect(el.children).toHaveLength(0);
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
    expect(section.children).toHaveLength(1);
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
    expect(el.querySelectorAll('section.ink-card')).toHaveLength(1);
    expect(el.querySelector('section.ink-card')).toBe(section);
    expect(el.querySelectorAll('.ink-card__body')).toHaveLength(1);
  });

  it('ignores attribute changes before the section exists', () => {
    const el = document.createElement('e-card');
    el.setAttribute('title', 'T');
    expect(el.children).toHaveLength(0);
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
    expect(el.querySelectorAll('section.ink-card')).toHaveLength(1);
    expect(el.querySelector('section.ink-card')).toBe(section);
    expect(el.querySelectorAll('.ink-card__footer')).toHaveLength(1);
  });

  it('ignores attribute changes before the section exists', () => {
    const el = document.createElement('e-card-image');
    el.setAttribute('cover', 'hatch');
    expect(el.children).toHaveLength(0);
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

  it('renders a dl of dt/dd pairs and clones the detail nodes across', () => {
    const el = mount(sample);
    // v2.0.0: the authored items remain as the data source and the detail
    // nodes are cloned rather than moved, so the component can re-sync them.
    const dl = el.querySelector('dl')!;
    expect(el.children).toHaveLength(3);
    expect(dl.tagName).toBe('DL');
    expect(dl.className).toBe('ink-desc-list ink-desc-list--horizontal ink-desc-list--bordered');
    const pairs = dl.querySelectorAll('.ink-desc-list__pair');
    expect(pairs).toHaveLength(2);
    expect(pairs[0]!.children[0]!.tagName).toBe('DT');
    expect(pairs[0]!.children[0]!.className).toBe('ink-desc-list__term');
    expect(pairs[0]!.children[0]!.textContent).toBe('Status');
    expect(pairs[0]!.children[1]!.tagName).toBe('DD');
    expect(pairs[0]!.children[1]!.className).toBe('ink-desc-list__detail');
    expect(pairs[0]!.children[1]!.textContent).toBe('Shipped');
    // The clone carries the content but not the id: duplicating one would put
    // it in the document twice. The authored carrier keeps it, and edits there
    // flow back through the observer.
    expect(pairs[1]!.querySelector('#code')).toBeNull();
    expect(pairs[1]!.textContent).toContain('EP-2048');
    expect(el.querySelector('e-desc-item #code')).not.toBeNull();
    expect(el.querySelectorAll('#code')).toHaveLength(1);
    expect(el.querySelectorAll('e-desc-item')).toHaveLength(2);
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
    expect(dl.children).toHaveLength(0);
    el.setAttribute('columns', '3');
    expect(dl.style.gridTemplateColumns).toBe('repeat(3, minmax(0px, 1fr))');
  });

  it('renders items appended after connect', async () => {
    const el = mount(sample);
    const late = document.createElement('e-desc-item');
    late.setAttribute('term', 'Late');
    el.appendChild(late);
    await flushObserver();
    expect(el.querySelectorAll('.ink-desc-list__pair')).toHaveLength(3);
  });

  it('does not rebuild on reconnect', () => {
    const el = mount(sample);
    const dl = el.querySelector('dl');
    remount(el);
    expect(el.querySelectorAll('dl')).toHaveLength(1);
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
    expect(el.children).toHaveLength(0);
  });

  it('e-desc-item on its own is an inert data carrier', () => {
    const el = mount('<e-desc-item term="Status">Shipped</e-desc-item>');
    expect(el.children).toHaveLength(0);
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
    const list = el.querySelector('ol')!;
    expect(el.children).toHaveLength(3);
    expect(list.tagName).toBe('OL');
    expect(list.className).toBe('ink-timeline ink-timeline--time-left');
    const rows = list.querySelectorAll('li.ink-timeline__item');
    expect(rows).toHaveLength(2);
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
    // As above: the rendered body is an id-free clone, the authored item keeps
    // the id, and the document therefore still holds exactly one.
    expect(first.querySelector('#sync')).toBeNull();
    expect(el.querySelector('e-timeline-item #sync')).not.toBeNull();
    expect(el.querySelectorAll('#sync')).toHaveLength(1);
    expect(el.querySelectorAll('e-timeline-item')).toHaveLength(2);
  });

  it('omits the title and body blocks for an item that has neither', () => {
    const el = mount(sample);
    const second = el.querySelectorAll('li.ink-timeline__item')[1]!;
    expect(second.getAttribute('data-variant')).toBe('default');
    expect(second.querySelector('.ink-timeline__title')).toBeNull();
    expect(second.querySelector('.ink-timeline__body')).toBeNull();
    expect(second.querySelector('.ink-timeline__content')!.children).toHaveLength(0);
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
    expect(list.children).toHaveLength(0);
    el.setAttribute('time-position', 'right');
    expect(list.className).toBe('ink-timeline ink-timeline--time-right');
  });

  it('renders items appended after connect', async () => {
    const el = mount(sample);
    const late = document.createElement('e-timeline-item');
    late.setAttribute('time', '13:00');
    el.appendChild(late);
    await flushObserver();
    expect(el.querySelectorAll('li.ink-timeline__item')).toHaveLength(3);
  });

  it('does not rebuild on reconnect', () => {
    const el = mount(sample);
    const list = el.querySelector('ol');
    remount(el);
    expect(el.querySelectorAll('ol')).toHaveLength(1);
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
    expect(el.children).toHaveLength(0);
  });

  it('e-timeline-item on its own is an inert data carrier', () => {
    const el = mount('<e-timeline-item time="08:30">Body</e-timeline-item>');
    expect(el.children).toHaveLength(0);
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
    expect(el.querySelectorAll('.ink-diff')).toHaveLength(1);
    expect(el.querySelector('.ink-diff')).toBe(rootEl);
    expect(el.querySelectorAll('.ink-diff__value')).toHaveLength(2);
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
    expect(inner(el).querySelectorAll('span svg')).toHaveLength(1);
  });

  it('fires e-click carrying the original MouseEvent', () => {
    const el = mount('<e-button>Go</e-button>');
    const seen = listen<{ originalEvent: MouseEvent }>(el, 'e-click');
    inner(el).click();
    expect(seen).toHaveLength(1);
    expect(Object.keys(seen[0]!.detail)).toEqual(['originalEvent']);
    expect(seen[0]!.detail.originalEvent).toBeInstanceOf(MouseEvent);
    expect(seen[0]!.detail.originalEvent.type).toBe('click');
    expect(seen[0]!.bubbles).toBe(true);
  });

  it('suppresses e-click while disabled', () => {
    const el = mount('<e-button disabled>Go</e-button>');
    const seen = listen<{ originalEvent: MouseEvent }>(el, 'e-click');
    inner(el).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen).toHaveLength(0);
    el.removeAttribute('disabled');
    inner(el).click();
    expect(seen).toHaveLength(1);
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
    expect(el.querySelectorAll('button.ink-btn')).toHaveLength(1);
    expect(inner(el)).toBe(btn);
    const seen = listen<{ originalEvent: MouseEvent }>(el, 'e-click');
    btn.click();
    expect(seen).toHaveLength(1);
  });

  it('ignores attribute changes before the inner button exists', () => {
    const el = document.createElement('e-button');
    el.setAttribute('variant', 'primary');
    el.setAttribute('disabled', '');
    expect(el.children).toHaveLength(0);
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
    expect(clicks).toHaveLength(1);
    expect(submits).toHaveLength(1);
    expect(submits[0]!.detail.form).toBe(form);
    expect(el.querySelector('.ink-form-item__label')!.textContent).toBe('Name');
  });
});

/* ===================================================================== *
 * v2.0.0 — maturity gaps closed on already-shipped components
 *
 * Every block below covers behaviour added in v2.0.0. The pre-v2.0.0
 * contract of each component is asserted in its own historical suite
 * (display-deep, data-media-deep, overlays-nav-deep, data-display); these
 * tests deliberately re-assert the *old* path wherever the new feature had
 * to stay opt-in, so a future refactor cannot quietly widen it.
 * ===================================================================== */

/* --------------------------------------------------------------------- *
 * e-card-image — image covers
 * --------------------------------------------------------------------- */

describe('e-card-image image cover (v2.0.0)', () => {
  // 1×1 transparent GIF: loads for real, in-process, with no network.
  const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const cover = (el: HTMLElement): HTMLElement =>
    el.querySelector<HTMLElement>('.ink-card__cover')!;
  const img = (el: HTMLElement): HTMLImageElement | null =>
    el.querySelector<HTMLImageElement>('.ink-card__cover-img');

  it('renders a path-like cover as an <img> with cover-alt', () => {
    const el = mount(
      '<e-card-image cover="/media/produkt.jpg" cover-alt="Produktfoto">B</e-card-image>',
    );
    const image = img(el)!;
    expect(image).not.toBeNull();
    expect(image.getAttribute('src')).toBe('/media/produkt.jpg');
    expect(image.getAttribute('alt')).toBe('Produktfoto');
    expect(image.decoding).toBe('async');
    expect(cover(el).className).toBe('ink-card__cover ink-card__cover--image');
    expect(cover(el).textContent).toBe('');
  });

  it.each([
    ['an absolute https URL', 'https://cdn.example.com/a.jpg'],
    ['a data: image URL', PIXEL],
    ['a blob: URL', 'blob:https://example.com/2f1a'],
    ['a root-relative path', '/a/b.png'],
    ['a ./ relative path', './b.webp'],
    ['a ../ relative path', '../b.avif'],
    ['a bare filename with a known extension', 'cover.SVG'],
    ['an extension followed by a query', 'cover.png?v=2'],
  ])('treats %s as an image URL', (_label, value) => {
    const el = mount(`<e-card-image cover="${value}">B</e-card-image>`);
    expect(img(el)).not.toBeNull();
    expect(cover(el).classList.contains('ink-card__cover--image')).toBe(true);
  });

  it.each([
    ['a plain word', 'Photo'],
    ['a hatch keyword', 'hatch'],
    ['a hatch variant', 'hatch-dense'],
    ['a phrase containing a path-looking word', 'Foto /media/x.jpg'],
    ['markup-looking text', '<b>c</b>'],
    ['an extension inside a sentence', 'Siehe cover.png im Anhang'],
    ['an empty value', ''],
  ])('keeps %s out of image mode', (_label, value) => {
    const el = mount(`<e-card-image cover="${value}">B</e-card-image>`);
    expect(img(el)).toBeNull();
    expect(cover(el).classList.contains('ink-card__cover--image')).toBe(false);
  });

  it('switches between text, hatch and image mode without leaking the previous mode', () => {
    const el = mount('<e-card-image cover="Photo">B</e-card-image>');
    expect(cover(el).textContent).toBe('Photo');

    el.setAttribute('cover', '/a.jpg');
    expect(cover(el).textContent).toBe('');
    expect(img(el)!.getAttribute('src')).toBe('/a.jpg');
    expect(cover(el).className).toBe('ink-card__cover ink-card__cover--image');

    el.setAttribute('cover', 'hatch');
    expect(img(el)).toBeNull();
    expect(cover(el).className).toBe('ink-card__cover ink-card__cover--hatch');
    expect(cover(el).textContent).toBe('');

    el.setAttribute('cover', 'Photo');
    expect(cover(el).textContent).toBe('Photo');
    expect(img(el)).toBeNull();
  });

  it('patches the src in place rather than recreating the <img>', () => {
    const el = mount('<e-card-image cover="/a.jpg">B</e-card-image>');
    const first = img(el)!;
    el.setAttribute('cover', '/b.jpg');
    expect(img(el)).toBe(first);
    expect(first.getAttribute('src')).toBe('/b.jpg');
  });

  it('patches cover-alt on its own without touching the src', () => {
    const el = mount('<e-card-image cover="/a.jpg" cover-alt="Alt A">B</e-card-image>');
    const image = img(el)!;
    el.setAttribute('cover-alt', 'Alt B');
    expect(img(el)).toBe(image);
    expect(image.getAttribute('alt')).toBe('Alt B');
    expect(image.getAttribute('src')).toBe('/a.jpg');
  });

  it('falls back to the hatch pattern and fires e-error when the image fails', () => {
    const el = mount('<e-card-image cover="/missing.jpg" cover-alt="Produktfoto">B</e-card-image>');
    const errors = listen<{ value: string }>(el, 'e-error');
    const image = img(el)!;

    image.dispatchEvent(new Event('error'));

    expect(errors).toHaveLength(1);
    expect(errors[0]!.detail.value).toBe('/missing.jpg');
    expect(image.hidden).toBe(true);
    expect(image.dataset['state']).toBe('error');
    expect(cover(el).className).toBe('ink-card__cover ink-card__cover--hatch');
    expect(el.querySelector('.ink-card__cover-fallback')!.textContent).toBe('Produktfoto');
  });

  it('recovers from a failed cover when a new URL arrives', () => {
    const el = mount('<e-card-image cover="/missing.jpg" cover-alt="A">B</e-card-image>');
    img(el)!.dispatchEvent(new Event('error'));
    expect(el.querySelector('.ink-card__cover-fallback')).not.toBeNull();

    el.setAttribute('cover', '/other.jpg');
    const image = img(el)!;
    expect(image.hidden).toBe(false);
    expect(image.hasAttribute('data-state')).toBe(false);
    expect(el.querySelector('.ink-card__cover-fallback')).toBeNull();
    expect(cover(el).className).toBe('ink-card__cover ink-card__cover--image');
  });

  it('drops the whole cover, image and all, when the attribute is removed', () => {
    const el = mount('<e-card-image cover="/a.jpg">B</e-card-image>');
    el.removeAttribute('cover');
    expect(el.querySelector('.ink-card__cover')).toBeNull();
    expect(img(el)).toBeNull();
  });

  it('keeps the cover first, before the header, in image mode', () => {
    const el = mount('<e-card-image cover="/a.jpg" title="T">B</e-card-image>');
    expect([...el.querySelector('section')!.children].map((c) => c.className)).toEqual([
      'ink-card__cover ink-card__cover--image',
      'ink-card__header',
      'ink-card__body',
    ]);
  });

  it('loads a real data: URI cover', async () => {
    const el = mount(`<e-card-image cover="${PIXEL}" cover-alt="Pixel">B</e-card-image>`);
    const image = img(el)!;
    await image.decode();
    expect(image.naturalWidth).toBe(1);
    expect(cover(el).classList.contains('ink-card__cover--image')).toBe(true);
  });
});

/* --------------------------------------------------------------------- *
 * e-textarea — label / hint / rows / counter
 * --------------------------------------------------------------------- */

describe('e-textarea label, hint, rows and counter (v2.0.0)', () => {
  const ta = (el: HTMLElement): HTMLTextAreaElement => el.querySelector('textarea')!;

  it('renders no label, no hint and no counter by default', () => {
    const el = mount('<e-textarea></e-textarea>');
    expect(el.querySelector('label.ink-label')).toBeNull();
    expect(el.querySelector('.ink-hint')).toBeNull();
    expect(el.querySelector('.ink-textarea__counter')).toBeNull();
    // The pre-v2.0.0 sizing is what an unattributed textarea still gets.
    expect(ta(el).style.minHeight).toBe('96px');
    expect(ta(el).hasAttribute('rows')).toBe(false);
  });

  it('renders label and hint with the same class names e-input uses, and wires the label', () => {
    const el = mount('<e-textarea label="Notiz" hint="Max. 280 Zeichen"></e-textarea>');
    const label = el.querySelector<HTMLLabelElement>('label.ink-label')!;
    expect(label.textContent).toBe('Notiz');
    expect(label.htmlFor).toBe(ta(el).id);
    expect(ta(el).id).not.toBe('');
    expect(el.querySelector('.ink-hint')!.textContent).toBe('Max. 280 Zeichen');
    // label first, textarea second, hint last
    expect([...el.children].map((c) => c.tagName)).toEqual(['LABEL', 'TEXTAREA', 'DIV']);
  });

  it('derives the control id from the host id when there is one', () => {
    const el = mount('<e-textarea id="notes" label="N"></e-textarea>');
    expect(ta(el).id).toBe('notes-control');
    expect(el.querySelector<HTMLLabelElement>('label')!.htmlFor).toBe('notes-control');
  });

  it('adds, patches and removes the label after mount', () => {
    const el = mount('<e-textarea></e-textarea>');
    el.setAttribute('label', 'A');
    const label = el.querySelector<HTMLLabelElement>('label.ink-label')!;
    expect(label.textContent).toBe('A');
    expect(label.htmlFor).toBe(ta(el).id);

    el.setAttribute('label', 'B');
    expect(el.querySelector('label.ink-label')).toBe(label);
    expect(label.textContent).toBe('B');

    el.removeAttribute('label');
    expect(el.querySelector('label.ink-label')).toBeNull();
  });

  it('adds, patches and removes the hint after mount', () => {
    const el = mount('<e-textarea></e-textarea>');
    el.setAttribute('hint', 'A');
    const hint = el.querySelector('.ink-hint')!;
    expect(hint.textContent).toBe('A');
    el.setAttribute('hint', 'B');
    expect(el.querySelector('.ink-hint')).toBe(hint);
    expect(hint.textContent).toBe('B');
    el.removeAttribute('hint');
    expect(el.querySelector('.ink-hint')).toBeNull();
  });

  it('escapes label and hint rather than injecting markup', () => {
    const el = mount(
      '<e-textarea label="<img src=x onerror=alert(1)>" hint="<script>y</script>"></e-textarea>',
    );
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('label.ink-label')!.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(el.querySelector('.ink-hint')!.textContent).toBe('<script>y</script>');
  });

  it('lets rows own the height and hands it back when rows goes away', () => {
    const el = mount('<e-textarea rows="6"></e-textarea>');
    expect(ta(el).rows).toBe(6);
    expect(ta(el).style.minHeight).toBe('');

    el.setAttribute('rows', '10');
    expect(ta(el).rows).toBe(10);

    el.removeAttribute('rows');
    expect(ta(el).hasAttribute('rows')).toBe(false);
    expect(ta(el).style.minHeight).toBe('96px');
  });

  it.each([['0'], ['-3'], ['abc'], ['2.5'], ['']])(
    'ignores the unusable rows value %j and keeps the min-height',
    (raw) => {
      const el = mount(`<e-textarea rows="${raw}"></e-textarea>`);
      expect(ta(el).hasAttribute('rows')).toBe(false);
      expect(ta(el).style.minHeight).toBe('96px');
    },
  );

  it('renders a character counter only while maxlength is set', () => {
    const el = mount('<e-textarea maxlength="10" value="abc"></e-textarea>');
    const counter = el.querySelector('.ink-textarea__counter')!;
    expect(counter.textContent).toBe('3 / 10');
    // between the control and the hint
    expect(counter.previousElementSibling).toBe(ta(el));

    el.setAttribute('maxlength', '20');
    expect(el.querySelector('.ink-textarea__counter')).toBe(counter);
    expect(counter.textContent).toBe('3 / 20');

    el.removeAttribute('maxlength');
    expect(el.querySelector('.ink-textarea__counter')).toBeNull();

    el.setAttribute('maxlength', '5');
    expect(el.querySelector('.ink-textarea__counter')!.textContent).toBe('3 / 5');
  });

  it('updates the counter on input, on the value attribute and on the property', () => {
    const el = mount('<e-textarea maxlength="10"></e-textarea>') as HTMLElement & { value: string };
    const counter = el.querySelector('.ink-textarea__counter')!;
    expect(counter.textContent).toBe('0 / 10');

    ta(el).value = 'abcd';
    ta(el).dispatchEvent(new Event('input', { bubbles: true }));
    expect(counter.textContent).toBe('4 / 10');

    el.setAttribute('value', 'ab');
    expect(counter.textContent).toBe('2 / 10');

    el.value = 'abcdef';
    expect(counter.textContent).toBe('6 / 10');
  });

  it('still round-trips its value with a label, a hint and rows in play', () => {
    const el = mount(
      '<e-textarea name="n" label="L" hint="H" rows="4" value="hallo"></e-textarea>',
    ) as HTMLElement & { value: string };
    expect(el.value).toBe('hallo');
    expect(ta(el).value).toBe('hallo');
  });
});

/* --------------------------------------------------------------------- *
 * e-tabs — programmatic value
 * --------------------------------------------------------------------- */

describe('e-tabs programmatic value (v2.0.0)', () => {
  const markup = (attrs = ''): string => `<e-tabs ${attrs}>
      <e-tab key="a" label="A">Alpha</e-tab>
      <e-tab key="b" label="B">Beta</e-tab>
      <e-tab key="c" label="C">Gamma</e-tab>
    </e-tabs>`;
  const panel = (el: HTMLElement, key: string): HTMLElement =>
    el.querySelector<HTMLElement>(`[data-panel="${key}"]`)!;
  const selected = (el: HTMLElement): string[] =>
    [...el.querySelectorAll<HTMLButtonElement>('.ink-tabs__tab')].map((b) =>
      b.getAttribute('aria-selected')!,
    );

  it('exposes the active key through the value property', () => {
    const el = mount<HTMLElement & { value: string }>(markup());
    expect(el.value).toBe('a');
    el.querySelectorAll<HTMLButtonElement>('.ink-tabs__tab')[2]!.click();
    expect(el.value).toBe('c');
  });

  it('honours an authored value at mount, outranking default-value', () => {
    const el = mount<HTMLElement & { value: string }>(markup('value="c" default-value="b"'));
    expect(el.value).toBe('c');
    expect(selected(el)).toEqual(['false', 'false', 'true']);
    expect(panel(el, 'c').hidden).toBe(false);
  });

  it('switches on a value attribute change without emitting e-change', () => {
    const el = mount<HTMLElement & { value: string }>(markup());
    const changes = listen<{ value: string }>(el, 'e-change');

    el.setAttribute('value', 'b');
    expect(el.value).toBe('b');
    expect(selected(el)).toEqual(['false', 'true', 'false']);
    expect(panel(el, 'a').hidden).toBe(true);
    expect(panel(el, 'b').hidden).toBe(false);
    expect(changes).toEqual([]);
  });

  it('switches on a value property assignment without emitting e-change', () => {
    const el = mount<HTMLElement & { value: string }>(markup());
    const changes = listen<{ value: string }>(el, 'e-change');
    el.value = 'c';
    expect(el.value).toBe('c');
    expect(panel(el, 'c').hidden).toBe(false);
    expect(changes).toEqual([]);
  });

  it('keeps every panel mounted, so nested form state survives a switch', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-tabs>
        <e-tab key="a" label="A"><input id="fa" value="typed"></e-tab>
        <e-tab key="b" label="B">Beta</e-tab>
      </e-tabs>`);
    const field = el.querySelector<HTMLInputElement>('#fa')!;
    field.value = 'edited';

    el.value = 'b';
    el.value = 'a';

    expect(el.querySelector('#fa')).toBe(field);
    expect(field.value).toBe('edited');
  });

  it('moves the tabIndex and the inverted badge with a programmatic switch', () => {
    const el = mount<HTMLElement & { value: string }>(`<e-tabs>
        <e-tab key="a" label="A">Alpha</e-tab>
        <e-tab key="b" label="B" count="3">Beta</e-tab>
      </e-tabs>`);
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('.ink-tabs__tab')];
    el.value = 'b';
    expect(buttons[0]!.tabIndex).toBe(-1);
    expect(buttons[1]!.tabIndex).toBe(0);
    expect(buttons[1]!.querySelector('e-badge')!.hasAttribute('inverted')).toBe(true);
  });

  it('ignores a value naming no tab and keeps the current one', () => {
    const el = mount<HTMLElement & { value: string }>(markup('value="b"'));
    el.value = 'nope';
    expect(el.value).toBe('b');
    expect(panel(el, 'b').hidden).toBe(false);
  });

  it('falls back to the first tab for a value matching no tab at mount', () => {
    const el = mount<HTMLElement & { value: string }>(markup('value="zzz"'));
    expect(el.value).toBe('a');
    expect(selected(el)).toEqual(['true', 'false', 'false']);
  });

  it('stores a value assigned before connection and applies it on mount', () => {
    const host = document.createElement('e-tabs') as HTMLElement & { value: string };
    host.innerHTML = '<e-tab key="a" label="A">Alpha</e-tab><e-tab key="b" label="B">Beta</e-tab>';
    host.value = 'b';
    expect(host.getAttribute('value')).toBe('b');

    const wrap = document.createElement('div');
    document.body.appendChild(wrap);
    mounted.push(wrap);
    wrap.appendChild(host);

    expect(host.value).toBe('b');
    expect(panel(host, 'b').hidden).toBe(false);
  });
});

/* --------------------------------------------------------------------- *
 * e-steps — aria-current and per-step status
 * --------------------------------------------------------------------- */

describe('e-steps aria-current and status (v2.0.0)', () => {
  const items = (el: HTMLElement): HTMLElement[] => [
    ...el.querySelectorAll<HTMLElement>('.ink-steps__item'),
  ];
  const bubblePath = (li: HTMLElement): string | null =>
    li.querySelector('.ink-steps__bubble path')?.getAttribute('d') ?? null;

  it('marks exactly the active step with aria-current="step"', () => {
    const el = mount(`<e-steps current="1">
        <e-step title="Plan"></e-step><e-step title="Build"></e-step><e-step title="Ship"></e-step>
      </e-steps>`);
    expect(items(el).map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null]);
  });

  it('moves aria-current as current changes and drops it when out of range', () => {
    const el = mount(`<e-steps>
        <e-step title="Plan"></e-step><e-step title="Build"></e-step>
      </e-steps>`);
    const li = items(el);
    expect(li.map((x) => x.getAttribute('aria-current'))).toEqual(['step', null]);

    el.setAttribute('current', '1');
    expect(li.map((x) => x.getAttribute('aria-current'))).toEqual([null, 'step']);

    el.setAttribute('current', '99');
    expect(li.map((x) => x.getAttribute('aria-current'))).toEqual([null, null]);
  });

  it('carries a per-step status onto the item and the bubble glyph', () => {
    const el = mount(`<e-steps current="0">
        <e-step title="Plan"></e-step>
        <e-step title="Prüfung" status="error"></e-step>
        <e-step title="Ship" status="warning"></e-step>
      </e-steps>`);
    const li = items(el);
    expect(li.map((x) => x.dataset['status'])).toEqual([undefined, 'error', 'warning']);
    expect(bubblePath(li[1]!)).toBe(ICONS.error);
    expect(bubblePath(li[2]!)).toBe(ICONS.warning);
    // Untouched step keeps its ordinal.
    expect(li[0]!.querySelector('.ink-steps__bubble')!.textContent).toBe('1');
  });

  it('lets a status outrank the done check mark when current moves past it', () => {
    const el = mount(`<e-steps>
        <e-step title="Prüfung" status="error"></e-step><e-step title="Ship"></e-step>
      </e-steps>`);
    const li = items(el);
    el.setAttribute('current', '1');
    expect(li[0]!.dataset['done']).toBe('true');
    expect(bubblePath(li[0]!)).toBe(ICONS.error);
  });

  it('replaces the vertical status label with the step status', () => {
    const el = mount(`<e-steps orientation="vertical" current="1">
        <e-step title="Plan"></e-step>
        <e-step title="Prüfung" status="error"></e-step>
        <e-step title="Ship" status="warning"></e-step>
      </e-steps>`);
    expect([...el.querySelectorAll('.ink-steps__status')].map((s) => s.textContent)).toEqual([
      'DONE',
      'ERROR',
      'WARNING',
    ]);
  });

  it('keeps the status label after a current change repatches the list', () => {
    const el = mount(`<e-steps orientation="vertical">
        <e-step title="Plan"></e-step><e-step title="Prüfung" status="error"></e-step>
      </e-steps>`);
    el.setAttribute('current', '1');
    expect([...el.querySelectorAll('.ink-steps__status')].map((s) => s.textContent)).toEqual([
      'DONE',
      'ERROR',
    ]);
  });

  it.each([['done'], ['nonsense'], ['']])('ignores the unknown status %j', (raw) => {
    const el = mount(`<e-steps><e-step title="Plan" status="${raw}"></e-step></e-steps>`);
    const li = items(el)[0]!;
    expect(li.dataset['status']).toBeUndefined();
    expect(li.querySelector('.ink-steps__bubble')!.textContent).toBe('1');
  });

  it('survives an orientation rebuild without losing the status', () => {
    const el = mount(`<e-steps>
        <e-step title="Prüfung" status="error"></e-step><e-step title="Ship"></e-step>
      </e-steps>`);
    el.setAttribute('orientation', 'vertical');
    expect(items(el)[0]!.dataset['status']).toBe('error');
    expect(bubblePath(items(el)[0]!)).toBe(ICONS.error);
  });
});

/* --------------------------------------------------------------------- *
 * e-title — deterministic ids and anchors
 * --------------------------------------------------------------------- */

describe('e-title auto id and anchor (v2.0.0)', () => {
  const h = (el: HTMLElement): HTMLElement => el.firstElementChild as HTMLElement;

  it('slugs the heading text into an id by default', () => {
    const el = mount('<e-title level="2">Jahresbilanz 2026</e-title>');
    expect(h(el).id).toBe('jahresbilanz-2026');
    expect(h(el).textContent).toBe('Jahresbilanz 2026');
  });

  it.each([
    ['Grüße aus Köln', 'gruesse-aus-koeln'],
    ['Maßnahmen', 'massnahmen'],
    ['Café & Bar', 'cafe-bar'],
    ['  Trim  me  ', 'trim-me'],
    ['A—B', 'a-b'],
    ['2026 Bilanz', 'h-2026-bilanz'],
  ])('slugs %j to %j', (text, slug) => {
    const el = mount(`<e-title>${text}</e-title>`);
    expect(h(el).id).toBe(slug);
    // The slug is always a usable CSS id selector.
    expect(document.querySelector(`#${slug}`)).toBe(h(el));
  });

  it('leaves the heading id-less when the text slugs to nothing', () => {
    for (const text of ['', '   ', '—— ——']) {
      const el = mount(`<e-title>${text}</e-title>`);
      expect(h(el).hasAttribute('id')).toBe(false);
    }
  });

  it('suffixes duplicate slugs in document order', () => {
    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<e-title>Anlagen</e-title><e-title>Anlagen</e-title><e-title>Anlagen</e-title>';
    document.body.appendChild(wrap);
    mounted.push(wrap);
    expect([...wrap.querySelectorAll('h1')].map((x) => x.id)).toEqual([
      'anlagen',
      'anlagen-2',
      'anlagen-3',
    ]);
  });

  it('never generates an id when the author put one on the host', () => {
    const el = mount('<e-title id="mein-anker">Jahresbilanz</e-title>');
    expect(h(el).hasAttribute('id')).toBe(false);
    expect(el.id).toBe('mein-anker');
  });

  it('opts out with auto-id="false" and retracts an id it had generated', () => {
    expect(h(mount('<e-title auto-id="false">Bilanz</e-title>')).hasAttribute('id')).toBe(false);

    const el = mount('<e-title>Bilanz</e-title>');
    expect(h(el).id).toBe('bilanz');
    el.setAttribute('auto-id', 'false');
    expect(h(el).hasAttribute('id')).toBe(false);
    el.setAttribute('auto-id', 'true');
    expect(h(el).id).toBe('bilanz');
  });

  it('carries the id across a level swap', () => {
    const el = mount('<e-title level="2">Jahresbilanz</e-title>');
    expect(h(el).id).toBe('jahresbilanz');
    el.setAttribute('level', '4');
    expect(h(el).tagName).toBe('H4');
    expect(h(el).id).toBe('jahresbilanz');
    expect(el.children).toHaveLength(1);
  });

  it('renders no anchor unless asked', () => {
    const el = mount('<e-title>Bilanz</e-title>');
    expect(el.querySelector('.ink-title__anchor')).toBeNull();
    expect(h(el).textContent).toBe('Bilanz');
  });

  it('appends a self-link inside the heading for anchor', () => {
    const el = mount('<e-title level="2" anchor>Jahresbilanz</e-title>');
    const a = el.querySelector<HTMLAnchorElement>('.ink-title__anchor')!;
    expect(a.parentElement).toBe(h(el));
    expect(a).toBe(h(el).lastElementChild);
    expect(a.getAttribute('href')).toBe('#jahresbilanz');
    expect(a.getAttribute('aria-label')).toBe('Link to this section');
    // still one child of the host: the heading
    expect(el.children).toHaveLength(1);
  });

  it('points the anchor at an author-set host id', () => {
    const el = mount('<e-title id="mein-anker" anchor>Bilanz</e-title>');
    expect(el.querySelector('.ink-title__anchor')!.getAttribute('href')).toBe('#mein-anker');
  });

  it('honours anchor-label and toggles the anchor after mount', () => {
    const el = mount('<e-title>Bilanz</e-title>');
    el.setAttribute('anchor', '');
    const a = el.querySelector<HTMLAnchorElement>('.ink-title__anchor')!;
    el.setAttribute('anchor-label', 'Sprungmarke');
    expect(el.querySelector('.ink-title__anchor')).toBe(a);
    expect(a.getAttribute('aria-label')).toBe('Sprungmarke');

    el.removeAttribute('anchor');
    expect(el.querySelector('.ink-title__anchor')).toBeNull();
  });

  it('excludes the anchor glyph from the slug it feeds back into', () => {
    const el = mount('<e-title anchor>Bilanz</e-title>');
    expect(h(el).id).toBe('bilanz');
    el.setAttribute('level', '3');
    expect(h(el).id).toBe('bilanz');
    expect(el.querySelectorAll('.ink-title__anchor')).toHaveLength(1);
  });

  it('carries the anchor across a level swap and re-points it', () => {
    const el = mount('<e-title level="2" anchor>Bilanz</e-title>');
    el.setAttribute('level', '5');
    const a = el.querySelector<HTMLAnchorElement>('.ink-title__anchor')!;
    expect(h(el).tagName).toBe('H5');
    expect(a.parentElement).toBe(h(el));
    expect(a.getAttribute('href')).toBe('#bilanz');
  });

  it('drops the anchor when there is nothing to point at', () => {
    const el = mount('<e-title auto-id="false" anchor>Bilanz</e-title>');
    expect(el.querySelector('.ink-title__anchor')).toBeNull();
  });
});

/* --------------------------------------------------------------------- *
 * e-text — caption / strike kinds and alignment
 * --------------------------------------------------------------------- */

describe('e-text caption, strike and align (v2.0.0)', () => {
  const wrap = (el: HTMLElement): HTMLElement => el.firstElementChild as HTMLElement;

  it.each([['caption'], ['strike']])('applies the %s kind modifier', (kind) => {
    const el = mount(`<e-text kind="${kind}">X</e-text>`);
    expect(wrap(el).className).toBe(`ink-text ink-text--${kind}`);
  });

  it('swaps between the new kinds and back to body', () => {
    const el = mount('<e-text kind="caption">X</e-text>');
    const w = wrap(el);
    el.setAttribute('kind', 'strike');
    expect(w.className).toBe('ink-text ink-text--strike');
    el.setAttribute('kind', 'body');
    expect(w.className).toBe('ink-text');
  });

  it.each([['start'], ['center'], ['end'], ['justify']])(
    'carries align=%s as data-align without touching the class list',
    (align) => {
      const el = mount(`<e-text kind="caption" align="${align}">X</e-text>`);
      expect(wrap(el).dataset['align']).toBe(align);
      expect(wrap(el).className).toBe('ink-text ink-text--caption');
    },
  );

  it.each([['left'], ['middle'], [''], ['CENTER']])('ignores the unknown align %j', (align) => {
    const el = mount(`<e-text align="${align}">X</e-text>`);
    expect(wrap(el).hasAttribute('data-align')).toBe(false);
  });

  it('adds and removes data-align after mount', () => {
    const el = mount('<e-text>X</e-text>');
    expect(wrap(el).hasAttribute('data-align')).toBe(false);
    el.setAttribute('align', 'center');
    expect(wrap(el).dataset['align']).toBe('center');
    el.setAttribute('align', 'end');
    expect(wrap(el).dataset['align']).toBe('end');
    el.removeAttribute('align');
    expect(wrap(el).hasAttribute('data-align')).toBe(false);
  });

  it('survives a kind change without losing the alignment', () => {
    const el = mount('<e-text align="center" kind="caption">X</e-text>');
    el.setAttribute('kind', 'strike');
    expect(wrap(el).dataset['align']).toBe('center');
    expect(wrap(el).className).toBe('ink-text ink-text--strike');
  });

  it('re-applies the alignment onto a wrapper rebuilt by an as change', () => {
    const el = mount('<e-text as="span" align="justify" kind="caption">X</e-text>');
    el.setAttribute('as', 'p');
    const w = wrap(el);
    expect(w.tagName).toBe('P');
    expect(w.className).toBe('ink-text ink-text--caption');
    expect(w.dataset['align']).toBe('justify');
  });
});

/* --------------------------------------------------------------------- *
 * e-link — target, rel and external
 * --------------------------------------------------------------------- */

describe('e-link target, rel and external (v2.0.0)', () => {
  const a = (el: HTMLElement): HTMLAnchorElement => el.querySelector('a')!;

  it('adds no target, rel or marker by default', () => {
    const el = mount('<e-link href="/a">x</e-link>');
    expect(a(el).hasAttribute('target')).toBe(false);
    expect(a(el).hasAttribute('rel')).toBe(false);
    expect(a(el).hasAttribute('data-external')).toBe(false);
  });

  it('forwards target and auto-applies a safe rel for _blank', () => {
    const el = mount('<e-link href="https://bund.de" target="_blank">x</e-link>');
    expect(a(el).getAttribute('target')).toBe('_blank');
    expect(a(el).getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not invent a rel for a non-_blank target', () => {
    const el = mount('<e-link href="/a" target="_self">x</e-link>');
    expect(a(el).getAttribute('target')).toBe('_self');
    expect(a(el).hasAttribute('rel')).toBe(false);
  });

  it('never overwrites an authored rel', () => {
    const el = mount('<e-link href="/a" target="_blank" rel="author">x</e-link>');
    expect(a(el).getAttribute('rel')).toBe('author');
  });

  it.each([[''], ['   ']])('treats the blank rel %j as unset and still protects _blank', (rel) => {
    const el = mount(`<e-link href="/a" target="_blank" rel="${rel}">x</e-link>`);
    expect(a(el).getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('adds and retracts the safe rel as target changes after mount', () => {
    const el = mount('<e-link href="/a">x</e-link>');
    const anchor = a(el);

    el.setAttribute('target', '_blank');
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');

    el.setAttribute('rel', 'nofollow');
    expect(anchor.getAttribute('rel')).toBe('nofollow');

    el.removeAttribute('rel');
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');

    el.removeAttribute('target');
    expect(anchor.hasAttribute('target')).toBe(false);
    expect(anchor.hasAttribute('rel')).toBe(false);
    // patched in place throughout
    expect(el.querySelector('a')).toBe(anchor);
  });

  it('marks external links with data-external and honours boolAttr semantics', () => {
    const el = mount('<e-link href="/a" external>x</e-link>');
    expect(a(el).hasAttribute('data-external')).toBe(true);
    el.setAttribute('external', 'false');
    expect(a(el).hasAttribute('data-external')).toBe(false);
    el.setAttribute('external', '');
    expect(a(el).hasAttribute('data-external')).toBe(true);
    el.removeAttribute('external');
    expect(a(el).hasAttribute('data-external')).toBe(false);
  });

  it('treats target="" as no target at all', () => {
    const el = mount('<e-link href="/a" target="">x</e-link>');
    expect(a(el).hasAttribute('target')).toBe(false);
  });
});

/* --------------------------------------------------------------------- *
 * e-list — ordered mode
 * --------------------------------------------------------------------- */

describe('e-list ordered mode (v2.0.0)', () => {
  const body = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.ink-list__body')!;
  const root = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.ink-list')!;

  it('keeps a plain div body and no data-ordered by default', () => {
    const el = mount('<e-list><e-list-item title="A"></e-list-item></e-list>');
    expect(body(el).tagName).toBe('DIV');
    expect(root(el).hasAttribute('data-ordered')).toBe(false);
  });

  it('renders the row container as an <ol> for ordered', () => {
    const el = mount(`<e-list ordered header-title="Tagesordnung">
        <e-list-item title="Eröffnung"></e-list-item>
        <e-list-item title="Haushaltssatzung"></e-list-item>
      </e-list>`);
    expect(body(el).tagName).toBe('OL');
    expect(body(el).className).toBe('ink-list__body');
    expect(root(el).hasAttribute('data-ordered')).toBe(true);
    expect(body(el).children).toHaveLength(2);
    expect(el.querySelector('.ink-list__header-title')!.textContent).toBe('Tagesordnung');
  });

  it('swaps the container on toggle and moves the rows across untouched', () => {
    const el = mount(
      '<e-list><e-list-item id="r1" title="A"></e-list-item><e-list-item id="r2" title="B"></e-list-item></e-list>',
    );
    const rows = [...body(el).children];

    el.setAttribute('ordered', '');
    expect(body(el).tagName).toBe('OL');
    expect([...body(el).children]).toEqual(rows);
    expect(root(el).hasAttribute('data-ordered')).toBe(true);

    el.removeAttribute('ordered');
    expect(body(el).tagName).toBe('DIV');
    expect([...body(el).children]).toEqual(rows);
    expect(root(el).hasAttribute('data-ordered')).toBe(false);
  });

  it('follows boolAttr semantics for ordered="false"', () => {
    const el = mount('<e-list ordered="false"><e-list-item title="A"></e-list-item></e-list>');
    expect(body(el).tagName).toBe('DIV');
    el.setAttribute('ordered', 'yes');
    expect(body(el).tagName).toBe('OL');
  });

  it('does not churn the container when ordered is re-set to the same value', () => {
    const el = mount('<e-list ordered><e-list-item title="A"></e-list-item></e-list>');
    const ol = body(el);
    el.setAttribute('ordered', 'ordered');
    expect(body(el)).toBe(ol);
  });

  it('keeps header and footer around the swapped container', () => {
    const el = mount(`<e-list header-title="H">
        <e-list-item title="A"></e-list-item>
        <div slot="footer" id="ft">F</div>
      </e-list>`);
    el.setAttribute('ordered', '');
    const children = [...root(el).children].map((c) => c.className);
    expect(children).toEqual(['ink-list__header', 'ink-list__body', 'ink-list__footer']);
    expect(el.querySelector('.ink-list__footer #ft')).not.toBeNull();
  });

  it('still patches header-title after the container swap', () => {
    const el = mount('<e-list ordered><e-list-item title="A"></e-list-item></e-list>');
    el.setAttribute('header-title', 'Tagesordnung');
    expect(el.querySelector('.ink-list__header-title')!.textContent).toBe('Tagesordnung');
    expect(el.querySelector('.ink-list__header')!.nextElementSibling).toBe(body(el));
  });

  it('leaves split and bordered working in ordered mode', () => {
    const el = mount('<e-list ordered bordered><e-list-item title="A"></e-list-item></e-list>');
    expect(root(el).hasAttribute('data-bordered')).toBe(true);
    expect(root(el).hasAttribute('data-split')).toBe(true);
  });
});

/* --------------------------------------------------------------------- *
 * e-sparkline — configurable threshold guide
 * --------------------------------------------------------------------- */

describe('e-sparkline threshold (v2.0.0)', () => {
  const guide = (el: HTMLElement): SVGLineElement =>
    el.querySelector<SVGLineElement>('.ink-sparkline__guide')!;
  const figure = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.ink-sparkline')!;

  it('keeps the historic mid-line guide when no threshold is set', () => {
    const el = mount('<e-sparkline values="[0,10]"></e-sparkline>');
    expect(guide(el).getAttribute('y1')).toBe('18');
    expect(guide(el).getAttribute('y2')).toBe('18');
    expect(figure(el).hasAttribute('data-threshold')).toBe(false);
    expect(el.getAttribute('aria-label')).toBe('10; rising');
  });

  it('places the guide on the threshold using the same scale as the line', () => {
    // min 0 / max 10 → value 10 maps to y=2, value 0 to y=34, midpoint 5 to y=18.
    const el = mount('<e-sparkline values="[0,10]" min="0" max="10" threshold="10"></e-sparkline>');
    expect(guide(el).getAttribute('y1')).toBe('2.00');
    el.setAttribute('threshold', '0');
    expect(guide(el).getAttribute('y1')).toBe('34.00');
    el.setAttribute('threshold', '5');
    expect(guide(el).getAttribute('y1')).toBe('18.00');
    expect(guide(el).getAttribute('y2')).toBe('18.00');
  });

  it('clamps a threshold outside the plotted range onto the plot edges', () => {
    const el = mount('<e-sparkline values="[0,10]" min="0" max="10" threshold="99"></e-sparkline>');
    expect(guide(el).getAttribute('y1')).toBe('2.00');
    el.setAttribute('threshold', '-99');
    expect(guide(el).getAttribute('y1')).toBe('34.00');
  });

  it.each([
    ['4', 'above'],
    ['10', 'at'],
    ['12', 'below'],
  ])('reports the latest value 10 against threshold %s as %s', (threshold, state) => {
    const el = mount(`<e-sparkline values="[1,10]" threshold="${threshold}"></e-sparkline>`);
    expect(figure(el).getAttribute('data-threshold')).toBe(state);
    expect(el.getAttribute('aria-label')).toBe(`10; rising; ${state} threshold ${threshold}`);
  });

  it('names the label and the threshold together in the accessible summary', () => {
    const el = mount(
      '<e-sparkline label="Kesseldruck" values="[4,6]" threshold="5"></e-sparkline>',
    );
    expect(el.getAttribute('aria-label')).toBe('Kesseldruck: 6; rising; above threshold 5');
  });

  it('leaves the empty state untouched by a threshold', () => {
    const el = mount('<e-sparkline label="Load" values="[]" threshold="5"></e-sparkline>');
    expect(el.getAttribute('aria-label')).toBe('Load: No data');
    expect(figure(el).hasAttribute('data-threshold')).toBe(false);
  });

  it.each([['abc'], ['']])('ignores the unusable threshold %j', (raw) => {
    const el = mount(`<e-sparkline values="[0,10]" threshold="${raw}"></e-sparkline>`);
    expect(guide(el).getAttribute('y1')).toBe('18');
    expect(figure(el).hasAttribute('data-threshold')).toBe(false);
  });

  it('retracts the guide and the state when the threshold is removed', () => {
    const el = mount('<e-sparkline values="[0,10]" min="0" max="10" threshold="10"></e-sparkline>');
    expect(figure(el).getAttribute('data-threshold')).toBe('at');
    el.removeAttribute('threshold');
    expect(guide(el).getAttribute('y1')).toBe('18');
    expect(figure(el).hasAttribute('data-threshold')).toBe(false);
  });

  it('patches the guide in place rather than replacing it', () => {
    const el = mount('<e-sparkline values="[0,10]" threshold="5"></e-sparkline>');
    const g = guide(el);
    el.setAttribute('threshold', '7');
    expect(guide(el)).toBe(g);
  });
});

/* --------------------------------------------------------------------- *
 * e-qrcode — theme colors, label and width
 * --------------------------------------------------------------------- */

describe('e-qrcode theming, label and width (v2.0.0)', () => {
  const svg = (el: HTMLElement): SVGSVGElement =>
    el.querySelector<SVGSVGElement>('.ink-qrcode > svg')!;

  it('paints the modules and the quiet zone from the theme, not from #000/#fff', () => {
    const el = mount('<e-qrcode value="hello"></e-qrcode>');
    expect(svg(el).querySelector('path')!.getAttribute('fill')).toBe('currentColor');
    expect(svg(el).querySelector('rect')!.getAttribute('fill')).toBe('var(--ink-bg, #fff)');
  });

  it('defaults the accessible name to the encoded value', () => {
    const el = mount('<e-qrcode value="hello"></e-qrcode>');
    expect(svg(el).getAttribute('aria-label')).toBe('QR code for hello');
  });

  it('lets label replace the raw value in the accessible name', () => {
    const el = mount(
      '<e-qrcode value="https://amt.example.de/az/2026-0815" label="Vorgang 2026-0815"></e-qrcode>',
    );
    expect(svg(el).getAttribute('aria-label')).toBe('Vorgang 2026-0815');
    expect(svg(el).getAttribute('role')).toBe('img');
  });

  it('patches the label without re-encoding the code', () => {
    const el = mount('<e-qrcode value="hello" label="A"></e-qrcode>');
    const path = svg(el).querySelector('path')!;
    el.setAttribute('label', 'B');
    // The geometry is untouched — only the accessible name moved.
    expect(svg(el).querySelector('path')).toBe(path);
    expect(svg(el).getAttribute('aria-label')).toBe('B');
    el.removeAttribute('label');
    expect(svg(el).getAttribute('aria-label')).toBe('QR code for hello');
  });

  it('treats an empty label as absent', () => {
    const el = mount('<e-qrcode value="hello" label=""></e-qrcode>');
    expect(svg(el).getAttribute('aria-label')).toBe('QR code for hello');
  });

  it('fits the code into width with a whole-pixel module size', () => {
    // "hello" at level M is version 1: 21 modules + 2×2 quiet zone = 25.
    const el = mount('<e-qrcode value="hello" width="180"></e-qrcode>');
    // floor(180 / 25) = 7 → 175px, never wider than the target.
    expect(svg(el).getAttribute('width')).toBe('175');
    expect(svg(el).getAttribute('viewBox')).toBe('0 0 175 175');
  });

  it('lets width override scale and hands control back when it is removed', () => {
    const el = mount('<e-qrcode value="hello" scale="4" width="180"></e-qrcode>');
    expect(svg(el).getAttribute('width')).toBe('175');
    el.removeAttribute('width');
    expect(svg(el).getAttribute('width')).toBe('100');
  });

  it.each([['0'], ['-40'], ['abc'], ['']])(
    'falls back to scale for the unusable width %j',
    (raw) => {
      const el = mount(`<e-qrcode value="hello" scale="4" width="${raw}"></e-qrcode>`);
      expect(svg(el).getAttribute('width')).toBe('100');
    },
  );

  it('never drops below a one-pixel module for an impossibly small width', () => {
    const el = mount('<e-qrcode value="hello" width="4"></e-qrcode>');
    expect(svg(el).getAttribute('width')).toBe('25');
  });

  it('accounts for the quiet zone when fitting to width', () => {
    // border=0 → 21 modules; floor(180/21) = 8 → 168px.
    const el = mount('<e-qrcode value="hello" width="180" border="0"></e-qrcode>');
    expect(svg(el).getAttribute('width')).toBe('168');
  });
});

/* --------------------------------------------------------------------- *
 * e-watermark — theme ink and multi-line content
 * --------------------------------------------------------------------- */

describe('e-watermark ink color and multi-line content (v2.0.0)', () => {
  const layer = (el: HTMLElement): HTMLElement => el.querySelector('.ink-watermark__layer')!;
  const svgOf = (el: HTMLElement): string => {
    const raw = layer(el).style.backgroundImage;
    const match = /^url\("?data:image\/svg\+xml;utf8,(.*?)"?\)$/.exec(raw);
    return match ? decodeURIComponent(match[1]!) : '';
  };
  const lines = (el: HTMLElement): string[] =>
    [...svgOf(el).matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((m) => m[1]!);

  it('resolves the ink color instead of hard-coding #000', () => {
    const el = mount('<e-watermark content="DRAFT"></e-watermark>');
    const svg = svgOf(el);
    expect(svg).not.toContain('fill="#000"');
    expect(/ fill="[^"]+"/.test(svg)).toBe(true);
    // fill-opacity still travels separately.
    expect(svg).toContain('fill-opacity="0.18"');
  });

  it('honours an explicit color attribute and drops back to the theme without it', () => {
    const el = mount('<e-watermark content="DRAFT" color="#336699"></e-watermark>');
    expect(svgOf(el)).toContain('fill="#336699"');
    el.removeAttribute('color');
    expect(svgOf(el)).not.toContain('fill="#336699"');
  });

  it.each([[''], ['   ']])('ignores the blank color %j', (raw) => {
    const el = mount(`<e-watermark content="DRAFT" color="${raw}"></e-watermark>`);
    expect(/ fill="[^"]+"/.test(svgOf(el))).toBe(true);
  });

  it('renders a single line exactly as before', () => {
    const el = mount('<e-watermark content="DRAFT"></e-watermark>');
    expect(lines(el)).toEqual(['DRAFT']);
    expect(svgOf(el)).toContain('>DRAFT<');
  });

  it.each([
    ['a literal \\n escape', 'ENTWURF\\nNICHT ZUR VERÖFFENTLICHUNG'],
    ['a real newline', 'ENTWURF\nNICHT ZUR VERÖFFENTLICHUNG'],
  ])('splits %s into stacked tspans', (_label, content) => {
    const el = mount('<e-watermark></e-watermark>');
    el.setAttribute('content', content);
    expect(lines(el)).toEqual(['ENTWURF', 'NICHT ZUR VERÖFFENTLICHUNG']);
  });

  it('centres the line block on the tile', () => {
    const el = mount('<e-watermark font-size="20"></e-watermark>');
    el.setAttribute('content', 'A\\nB\\nC');
    const dys = [...svgOf(el).matchAll(/dy="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
    // three lines, 25px apart → first lifted by one full step, then +25 each.
    expect(dys).toEqual([-25, 25, 25]);
  });

  it('leaves a single line unshifted', () => {
    const el = mount('<e-watermark content="DRAFT" font-size="20"></e-watermark>');
    expect(svgOf(el)).toContain('dy="0.00"');
  });

  it('trims each line and drops blank ones', () => {
    const el = mount('<e-watermark></e-watermark>');
    el.setAttribute('content', '  ENTWURF  \\n\\n  KOPIE \\n   ');
    expect(lines(el)).toEqual(['ENTWURF', 'KOPIE']);
  });

  it('clears the layer for content that is nothing but separators', () => {
    const el = mount('<e-watermark content="DRAFT"></e-watermark>');
    el.setAttribute('content', '\\n  \\n');
    expect(layer(el).style.backgroundImage).toBe('');
    expect(layer(el).style.backgroundSize).toBe('');
  });

  it('escapes every line rather than emitting markup', () => {
    const el = mount('<e-watermark></e-watermark>');
    el.setAttribute('content', '<script>a</script>\\n<b>c</b>');
    const svg = svgOf(el);
    expect(svg).toContain('&lt;script&gt;a&lt;/script&gt;');
    expect(svg).toContain('&lt;b&gt;c&lt;/b&gt;');
    expect(el.querySelector('script')).toBeNull();
    expect(layer(el).style.backgroundImage).not.toContain('%3Cscript%3E');
  });
});

/* --------------------------------------------------------------------- *
 * e-alert — severity glyphs
 * --------------------------------------------------------------------- */

describe('e-alert severity glyphs (v2.0.0)', () => {
  const iconPath = (el: HTMLElement): string | null =>
    el.querySelector('.ink-alert__icon path')?.getAttribute('d') ?? null;

  it.each([
    ['info', 'info'],
    ['success', 'check'],
    ['warning', 'warning'],
    ['error', 'error'],
  ])('renders variant %s with the %s glyph', (variant, icon) => {
    const el = mount(`<e-alert variant="${variant}">x</e-alert>`);
    expect(iconPath(el)).toBe(ICONS[icon as keyof typeof ICONS]);
  });

  it('no longer borrows bell for warning or close for error', () => {
    expect(iconPath(mount('<e-alert variant="warning">x</e-alert>'))).not.toBe(ICONS.bell);
    expect(iconPath(mount('<e-alert variant="error">x</e-alert>'))).not.toBe(ICONS.close);
    expect(iconPath(mount('<e-alert variant="info">x</e-alert>'))).not.toBe(ICONS.doc);
  });

  it('falls back to the info glyph for an unknown variant', () => {
    expect(iconPath(mount('<e-alert variant="nonsense">x</e-alert>'))).toBe(ICONS.info);
    expect(iconPath(mount('<e-alert>x</e-alert>'))).toBe(ICONS.info);
  });

  it('swaps the glyph when the variant changes after mount', () => {
    const el = mount('<e-alert>x</e-alert>');
    el.setAttribute('variant', 'error');
    expect(iconPath(el)).toBe(ICONS.error);
    el.setAttribute('variant', 'warning');
    expect(iconPath(el)).toBe(ICONS.warning);
    el.removeAttribute('variant');
    expect(iconPath(el)).toBe(ICONS.info);
  });

  it('keeps the dismiss button on the close glyph, which does mean close', () => {
    const el = mount('<e-alert variant="error" closable>x</e-alert>');
    expect(el.querySelector('.ink-alert__close path')!.getAttribute('d')).toBe(ICONS.close);
  });
});
