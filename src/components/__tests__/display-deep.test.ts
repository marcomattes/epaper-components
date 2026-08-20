// Behavioural tests for the display group: e-list / e-list-item, e-skeleton,
// e-result, e-empty, e-progress, e-alert, e-divider, e-text, e-title,
// e-meter and e-status-board.
//
// Each block drives the full add -> change -> remove triad for every
// observed attribute and asserts the resulting DOM at each step, plus the
// clamping, fallback and escaping edge cases.
import { describe, it, expect, beforeAll } from 'vitest';
import { ICONS } from '../../core/icons';

beforeAll(async () => {
  await import('../list');
  await import('../skeleton');
  await import('../result');
  await import('../empty');
  await import('../progress');
  await import('../alert');
  await import('../divider');
  await import('../text');
  await import('../title');
  await import('../meter');
  await import('../status-board');
});

const mount = <T extends HTMLElement = HTMLElement>(html: string): T => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild as T;
};

/** Detach and re-attach so `connectedCallback` runs a second time. */
const remount = (el: HTMLElement): void => {
  const parent = el.parentElement!;
  el.remove();
  parent.appendChild(el);
};

/** `d` of the single icon path inside `selector`, or null when no icon rendered. */
const iconPath = (host: Element, selector: string): string | null =>
  host.querySelector(`${selector} svg path`)?.getAttribute('d') ?? null;

const widths = (els: NodeListOf<HTMLElement>): string[] => [...els].map((e) => e.style.width);

/* ===================================================================== *
 * e-list
 * ===================================================================== */

describe('e-list', () => {
  it('wraps children in a role=list root with a body and split on by default', () => {
    const el = mount(`<e-list><e-list-item title="A"></e-list-item></e-list>`);
    const root = el.querySelector<HTMLElement>('.ink-list')!;
    expect(root.getAttribute('role')).toBe('list');
    expect(root.hasAttribute('data-split')).toBe(true);
    expect(root.getAttribute('data-split')).toBe('');
    expect(root.hasAttribute('data-bordered')).toBe(false);
    expect(root.querySelector('.ink-list__body > e-list-item')).not.toBeNull();
    expect(el.querySelector('.ink-list__header')).toBeNull();
    expect(el.querySelector('.ink-list__footer')).toBeNull();
  });

  it('reflects bordered on mount and drops it for bordered="false"', () => {
    expect(
      mount(`<e-list bordered></e-list>`).querySelector('.ink-list')!.getAttribute('data-bordered'),
    ).toBe('');
    expect(
      mount(`<e-list bordered="false"></e-list>`)
        .querySelector('.ink-list')!
        .hasAttribute('data-bordered'),
    ).toBe(false);
  });

  it('adds and removes data-bordered when the attribute is toggled after mount', () => {
    const el = mount(`<e-list></e-list>`);
    const root = el.querySelector<HTMLElement>('.ink-list')!;
    el.setAttribute('bordered', '');
    expect(root.hasAttribute('data-bordered')).toBe(true);
    el.setAttribute('bordered', 'false');
    expect(root.hasAttribute('data-bordered')).toBe(false);
    el.setAttribute('bordered', 'yes');
    expect(root.hasAttribute('data-bordered')).toBe(true);
    el.removeAttribute('bordered');
    expect(root.hasAttribute('data-bordered')).toBe(false);
  });

  it('only split="false" turns the divider off', () => {
    const el = mount(`<e-list split="false"></e-list>`);
    const root = el.querySelector<HTMLElement>('.ink-list')!;
    expect(root.hasAttribute('data-split')).toBe(false);
    el.setAttribute('split', 'true');
    expect(root.hasAttribute('data-split')).toBe(true);
    el.setAttribute('split', '');
    expect(root.hasAttribute('data-split')).toBe(true);
    el.setAttribute('split', 'false');
    expect(root.hasAttribute('data-split')).toBe(false);
    el.removeAttribute('split');
    expect(root.hasAttribute('data-split')).toBe(true);
  });

  it('renders header-title into a header above the body', () => {
    const el = mount(`<e-list header-title="Documents"></e-list>`);
    const root = el.querySelector<HTMLElement>('.ink-list')!;
    expect(root.firstElementChild!.className).toBe('ink-list__header');
    expect(root.querySelector('.ink-list__header-title')!.textContent).toBe('Documents');
  });

  it('treats an empty header-title as absent', () => {
    const el = mount(`<e-list header-title=""></e-list>`);
    expect(el.querySelector('.ink-list__header')).toBeNull();
  });

  it('creates, patches and removes the header when header-title changes after mount', () => {
    const el = mount(`<e-list><e-list-item title="A"></e-list-item></e-list>`);
    const root = el.querySelector<HTMLElement>('.ink-list')!;
    expect(root.querySelector('.ink-list__header')).toBeNull();

    // create
    el.setAttribute('header-title', 'Inbox');
    const header = root.querySelector<HTMLElement>('.ink-list__header')!;
    expect(root.firstElementChild).toBe(header);
    expect(root.children[1]!.className).toBe('ink-list__body');
    const titleEl = header.querySelector<HTMLElement>('.ink-list__header-title')!;
    expect(titleEl.textContent).toBe('Inbox');

    // patch in place — the same node keeps its identity
    el.setAttribute('header-title', 'Archive');
    expect(root.querySelector('.ink-list__header-title')).toBe(titleEl);
    expect(titleEl.textContent).toBe('Archive');

    // remove
    el.removeAttribute('header-title');
    expect(root.querySelector('.ink-list__header')).toBeNull();
    expect(root.firstElementChild!.className).toBe('ink-list__body');

    // and re-create once more
    el.setAttribute('header-title', 'Trash');
    expect(root.querySelector('.ink-list__header-title')!.textContent).toBe('Trash');
  });

  it('setting header-title to "" removes the header, and again is a no-op', () => {
    const el = mount(`<e-list header-title="X"></e-list>`);
    const root = el.querySelector<HTMLElement>('.ink-list')!;
    el.setAttribute('header-title', '');
    expect(root.querySelector('.ink-list__header')).toBeNull();
    el.setAttribute('header-title', '');
    expect(root.querySelector('.ink-list__header')).toBeNull();
  });

  it('escapes header-title supplied markup as text', () => {
    const el = mount(`<e-list header-title="<img src=x onerror=boom>"></e-list>`);
    const titleEl = el.querySelector<HTMLElement>('.ink-list__header-title')!;
    expect(titleEl.textContent).toBe('<img src=x onerror=boom>');
    expect(titleEl.querySelector('img')).toBeNull();
    el.setAttribute('header-title', '<b>bold</b>');
    expect(titleEl.textContent).toBe('<b>bold</b>');
    expect(titleEl.querySelector('b')).toBeNull();
  });

  it('a slot="header" element wins over header-title and freezes it', () => {
    const el = mount(
      `<e-list header-title="Ignored"><div slot="header" id="ch">Custom</div><e-list-item title="A"></e-list-item></e-list>`,
    );
    const header = el.querySelector<HTMLElement>('.ink-list__header')!;
    expect(header.querySelector('#ch')!.textContent).toBe('Custom');
    expect(header.querySelector('.ink-list__header-title')).toBeNull();

    el.setAttribute('header-title', 'Still ignored');
    expect(el.querySelector('.ink-list__header-title')).toBeNull();
    el.removeAttribute('header-title');
    expect(el.querySelector('.ink-list__header')).toBe(header);
  });

  it('moves a slot="footer" element into .ink-list__footer after the body', () => {
    const el = mount(
      `<e-list><e-list-item title="A"></e-list-item><div slot="footer" id="fo">Foot</div></e-list>`,
    );
    const root = el.querySelector<HTMLElement>('.ink-list')!;
    const footer = root.lastElementChild as HTMLElement;
    expect(footer.className).toBe('ink-list__footer');
    expect(footer.querySelector('#fo')!.textContent).toBe('Foot');
    expect(root.querySelector('.ink-list__body > #fo')).toBeNull();
  });

  it('ignores attribute changes made before connection', () => {
    const el = document.createElement('e-list');
    el.setAttribute('bordered', '');
    el.setAttribute('header-title', 'Later');
    expect(el.querySelector('.ink-list')).toBeNull();
    document.body.appendChild(el);
    const root = el.querySelector<HTMLElement>('.ink-list')!;
    expect(root.getAttribute('data-bordered')).toBe('');
    expect(root.querySelector('.ink-list__header-title')!.textContent).toBe('Later');
  });

  it('does not rebuild on re-connection', () => {
    const el = mount(`<e-list header-title="Keep"><e-list-item title="A"></e-list-item></e-list>`);
    const root = el.querySelector<HTMLElement>('.ink-list')!;
    remount(el);
    expect(el.querySelector('.ink-list')).toBe(root);
    expect(el.querySelectorAll('.ink-list').length).toBe(1);
    expect(root.querySelector('.ink-list__header-title')!.textContent).toBe('Keep');
  });
});

/* ===================================================================== *
 * e-list-item
 * ===================================================================== */

describe('e-list-item', () => {
  it('renders title and description inside .ink-list__main', () => {
    const el = mount(`<e-list-item title="Report" description="Finance"></e-list-item>`);
    expect(el.getAttribute('role')).toBe('listitem');
    const main = el.querySelector<HTMLElement>('.ink-list__item > .ink-list__main')!;
    expect(main.children.length).toBe(2);
    expect(main.querySelector('.ink-list__title')!.textContent).toBe('Report');
    expect(main.querySelector('.ink-list__desc')!.textContent).toBe('Finance');
  });

  it('renders no title/desc nodes when neither attribute is set', () => {
    const el = mount(`<e-list-item></e-list-item>`);
    expect(el.querySelector<HTMLElement>('.ink-list__main')!.children.length).toBe(0);
  });

  it('wraps slot="leading" and slot="trailing" around the main column', () => {
    const el = mount(
      `<e-list-item title="T"><span slot="leading" id="ld">L</span><span slot="trailing" id="tr">R</span></e-list-item>`,
    );
    const row = el.querySelector<HTMLElement>('.ink-list__item')!;
    expect([...row.children].map((c) => c.className)).toEqual([
      'ink-list__leading',
      'ink-list__main',
      'ink-list__trailing',
    ]);
    expect(row.querySelector('.ink-list__leading > #ld')!.textContent).toBe('L');
    expect(row.querySelector('.ink-list__trailing > #tr')!.textContent).toBe('R');
  });

  it('creates, patches and removes the title element as the attribute changes', () => {
    const el = mount(`<e-list-item description="Sub"></e-list-item>`);
    const main = el.querySelector<HTMLElement>('.ink-list__main')!;
    expect(main.querySelector('.ink-list__title')).toBeNull();

    el.setAttribute('title', 'Head');
    const titleEl = main.querySelector<HTMLElement>('.ink-list__title')!;
    // inserted at the front, ahead of the existing description
    expect([...main.children].map((c) => c.className)).toEqual([
      'ink-list__title',
      'ink-list__desc',
    ]);
    expect(titleEl.textContent).toBe('Head');

    el.setAttribute('title', 'Head 2');
    expect(main.querySelector('.ink-list__title')).toBe(titleEl);
    expect(titleEl.textContent).toBe('Head 2');

    el.setAttribute('title', '');
    expect(main.querySelector('.ink-list__title')).toBeNull();
    expect(main.children.length).toBe(1);

    el.removeAttribute('title');
    expect(main.querySelector('.ink-list__title')).toBeNull();
  });

  it('creates, patches and removes the description element as the attribute changes', () => {
    const el = mount(`<e-list-item title="Head"></e-list-item>`);
    const main = el.querySelector<HTMLElement>('.ink-list__main')!;
    expect(main.querySelector('.ink-list__desc')).toBeNull();

    el.setAttribute('description', 'Sub');
    const descEl = main.querySelector<HTMLElement>('.ink-list__desc')!;
    expect([...main.children].map((c) => c.className)).toEqual([
      'ink-list__title',
      'ink-list__desc',
    ]);
    expect(descEl.textContent).toBe('Sub');

    el.setAttribute('description', 'Sub 2');
    expect(main.querySelector('.ink-list__desc')).toBe(descEl);
    expect(descEl.textContent).toBe('Sub 2');

    el.removeAttribute('description');
    expect(main.querySelector('.ink-list__desc')).toBeNull();
    expect(main.children.length).toBe(1);
  });

  it('escapes attribute-supplied markup in title and description', () => {
    const el = mount(
      `<e-list-item title="<script>x</script>" description="<img src=x onerror=boom>"></e-list-item>`,
    );
    const titleEl = el.querySelector<HTMLElement>('.ink-list__title')!;
    const descEl = el.querySelector<HTMLElement>('.ink-list__desc')!;
    expect(titleEl.textContent).toBe('<script>x</script>');
    expect(titleEl.querySelector('script')).toBeNull();
    expect(descEl.textContent).toBe('<img src=x onerror=boom>');
    expect(descEl.querySelector('img')).toBeNull();
  });

  it('slotted default content wins and freezes title/description', () => {
    const el = mount(`<e-list-item title="Ignored"><strong id="cc">Custom</strong></e-list-item>`);
    const main = el.querySelector<HTMLElement>('.ink-list__main')!;
    expect(main.querySelector('#cc')!.textContent).toBe('Custom');
    expect(main.querySelector('.ink-list__title')).toBeNull();

    el.setAttribute('title', 'Nope');
    el.setAttribute('description', 'Nope');
    expect(main.querySelector('.ink-list__title')).toBeNull();
    expect(main.querySelector('.ink-list__desc')).toBeNull();
  });

  it('treats a non-empty text child as custom content but ignores whitespace', () => {
    const withText = mount(`<e-list-item title="Ignored">Raw</e-list-item>`);
    expect(withText.querySelector('.ink-list__title')).toBeNull();
    expect(withText.querySelector('.ink-list__main')!.textContent).toBe('Raw');

    const whitespaceOnly = mount(`<e-list-item title="Used">\n  </e-list-item>`);
    expect(whitespaceOnly.querySelector('.ink-list__title')!.textContent).toBe('Used');
  });

  it('ignores attribute changes before connection and does not rebuild on re-connection', () => {
    const el = document.createElement('e-list-item');
    el.setAttribute('title', 'Pre');
    expect(el.querySelector('.ink-list__item')).toBeNull();
    document.body.appendChild(el);
    const row = el.querySelector<HTMLElement>('.ink-list__item')!;
    expect(row.querySelector('.ink-list__title')!.textContent).toBe('Pre');
    remount(el);
    expect(el.querySelectorAll('.ink-list__item').length).toBe(1);
    expect(el.querySelector('.ink-list__item')).toBe(row);
  });
});

/* ===================================================================== *
 * e-skeleton
 * ===================================================================== */

describe('e-skeleton', () => {
  it('defaults to a block shape with status semantics', () => {
    const el = mount(`<e-skeleton></e-skeleton>`);
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-busy')).toBe('true');
    const wrap = el.querySelector<HTMLElement>('.ink-skeleton')!;
    expect(wrap.className).toBe('ink-skeleton ink-skeleton--block');
    expect(wrap.getAttribute('aria-hidden')).toBe('true');
    expect(wrap.querySelectorAll('.ink-skeleton__block').length).toBe(1);
    expect(wrap.querySelectorAll('.ink-skeleton__line').length).toBe(0);
  });

  it('renders a circle shape through the block branch', () => {
    const el = mount(`<e-skeleton shape="circle" width="3rem" height="3rem"></e-skeleton>`);
    const wrap = el.querySelector<HTMLElement>('.ink-skeleton')!;
    expect(wrap.className).toBe('ink-skeleton ink-skeleton--circle');
    const block = wrap.querySelector<HTMLElement>('.ink-skeleton__block')!;
    expect(block.style.width).toBe('3rem');
    expect(block.style.height).toBe('3rem');
  });

  it('renders an unknown shape through the block branch too', () => {
    const el = mount(`<e-skeleton shape="pill"></e-skeleton>`);
    expect(el.querySelector('.ink-skeleton')!.className).toBe('ink-skeleton ink-skeleton--pill');
    expect(el.querySelector('.ink-skeleton__block')).not.toBeNull();
  });

  it('gives the last of several text lines a 60% width', () => {
    const el = mount(
      `<e-skeleton shape="text" lines="3" width="12rem" height="0.75rem"></e-skeleton>`,
    );
    const lines = el.querySelectorAll<HTMLElement>('.ink-skeleton__line');
    expect(lines.length).toBe(3);
    expect(widths(lines)).toEqual(['12rem', '12rem', '60%']);
    expect([...lines].map((l) => l.style.height)).toEqual(['0.75rem', '0.75rem', '0.75rem']);
  });

  it('a single text line uses the configured width, not 60%', () => {
    const el = mount(`<e-skeleton shape="text" lines="1" width="9rem"></e-skeleton>`);
    const lines = el.querySelectorAll<HTMLElement>('.ink-skeleton__line');
    expect(lines.length).toBe(1);
    expect(lines[0]!.style.width).toBe('9rem');
  });

  it('grows and shrinks the line list in place when lines changes', () => {
    const el = mount(
      `<e-skeleton shape="text" lines="3" width="12rem" height="0.75rem"></e-skeleton>`,
    );
    const wrap = el.querySelector<HTMLElement>('.ink-skeleton')!;
    const firstLine = wrap.querySelector<HTMLElement>('.ink-skeleton__line')!;

    el.setAttribute('lines', '5');
    let lines = el.querySelectorAll<HTMLElement>('.ink-skeleton__line');
    expect(lines.length).toBe(5);
    expect(widths(lines)).toEqual(['12rem', '12rem', '12rem', '12rem', '60%']);
    expect([...lines].every((l) => l.style.height === '0.75rem')).toBe(true);
    // the wrapper and the pre-existing lines keep their identity
    expect(el.querySelector('.ink-skeleton')).toBe(wrap);
    expect(lines[0]).toBe(firstLine);

    el.setAttribute('lines', '1');
    lines = el.querySelectorAll<HTMLElement>('.ink-skeleton__line');
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe(firstLine);
    expect(lines[0]!.style.width).toBe('12rem');

    el.removeAttribute('width');
    expect(firstLine.style.width).toBe('');
    el.removeAttribute('height');
    expect(firstLine.style.height).toBe('');
  });

  it('clamps lines to 1..100 and falls back for invalid input', () => {
    const count = (html: string): number =>
      mount(html).querySelectorAll('.ink-skeleton__line').length;
    expect(count(`<e-skeleton shape="text" lines="0"></e-skeleton>`)).toBe(1);
    expect(count(`<e-skeleton shape="text" lines="-4"></e-skeleton>`)).toBe(1);
    expect(count(`<e-skeleton shape="text" lines="1000"></e-skeleton>`)).toBe(100);
    expect(count(`<e-skeleton shape="text" lines="abc"></e-skeleton>`)).toBe(1);
    expect(count(`<e-skeleton shape="text" lines="2.5"></e-skeleton>`)).toBe(1);
    expect(count(`<e-skeleton shape="text" lines=""></e-skeleton>`)).toBe(1);
  });

  it('rebuilds only when the shape actually changes, and patches otherwise', () => {
    const el = mount(`<e-skeleton shape="text" lines="2"></e-skeleton>`);
    expect(el.querySelectorAll('.ink-skeleton__line').length).toBe(2);

    el.setAttribute('shape', 'block');
    const wrap = el.querySelector<HTMLElement>('.ink-skeleton')!;
    expect(wrap.className).toBe('ink-skeleton ink-skeleton--block');
    expect(el.querySelectorAll('.ink-skeleton__line').length).toBe(0);
    const block = wrap.querySelector<HTMLElement>('.ink-skeleton__block')!;

    // same shape re-asserted → patch path, no rebuild
    el.setAttribute('shape', 'block');
    expect(el.querySelector('.ink-skeleton')).toBe(wrap);
    expect(el.querySelector('.ink-skeleton__block')).toBe(block);

    el.setAttribute('width', '5rem');
    expect(block.style.width).toBe('5rem');
    el.setAttribute('height', '2rem');
    expect(block.style.height).toBe('2rem');
    el.removeAttribute('width');
    expect(block.style.width).toBe('');

    // an empty shape falls back to "block", which is already the shape
    el.setAttribute('shape', '');
    expect(el.querySelector('.ink-skeleton')).toBe(wrap);

    el.setAttribute('shape', 'circle');
    expect(el.querySelector('.ink-skeleton')!.className).toBe('ink-skeleton ink-skeleton--circle');
    el.removeAttribute('shape');
    expect(el.querySelector('.ink-skeleton')!.className).toBe('ink-skeleton ink-skeleton--block');
  });

  it('ignores attribute changes before connection and does not rebuild on re-connection', () => {
    const el = document.createElement('e-skeleton');
    el.setAttribute('shape', 'text');
    el.setAttribute('lines', '4');
    expect(el.querySelector('.ink-skeleton')).toBeNull();
    document.body.appendChild(el);
    expect(el.querySelectorAll('.ink-skeleton__line').length).toBe(4);
    const wrap = el.querySelector<HTMLElement>('.ink-skeleton')!;
    remount(el);
    expect(el.querySelectorAll('.ink-skeleton').length).toBe(1);
    expect(el.querySelector('.ink-skeleton')).toBe(wrap);
  });
});

/* ===================================================================== *
 * e-result
 * ===================================================================== */

describe('e-result', () => {
  it('defaults to the info status with the doc icon', () => {
    const el = mount(`<e-result title="Heads up"></e-result>`);
    const root = el.querySelector<HTMLElement>('.ink-result')!;
    expect(root.dataset['status']).toBe('info');
    expect(root.getAttribute('role')).toBe('status');
    expect(iconPath(root, '.ink-result__icon')).toBe(ICONS.doc);
    expect(
      root.querySelector('.ink-result__icon')!.querySelector('svg')!.getAttribute('width'),
    ).toBe('64');
    expect(root.querySelector('.ink-result__title')!.textContent).toBe('Heads up');
    expect(root.querySelector('.ink-result__desc')).toBeNull();
  });

  it('maps every status preset to its icon', () => {
    const cases: Array<[string, string]> = [
      ['success', ICONS.check],
      ['error', ICONS.close],
      ['warning', ICONS.bell],
      ['info', ICONS.doc],
      ['404', ICONS.search],
    ];
    for (const [status, path] of cases) {
      const el = mount(`<e-result status="${status}" title="T"></e-result>`);
      expect(el.querySelector<HTMLElement>('.ink-result')!.dataset['status']).toBe(status);
      expect(iconPath(el, '.ink-result__icon')).toBe(path);
    }
  });

  it('falls back to info for an unknown status, before and after mount', () => {
    const el = mount(`<e-result status="bogus" title="T"></e-result>`);
    const root = el.querySelector<HTMLElement>('.ink-result')!;
    expect(root.dataset['status']).toBe('info');
    expect(iconPath(root, '.ink-result__icon')).toBe(ICONS.doc);

    el.setAttribute('status', 'error');
    expect(root.dataset['status']).toBe('error');
    expect(iconPath(root, '.ink-result__icon')).toBe(ICONS.close);

    el.setAttribute('status', 'nope');
    expect(root.dataset['status']).toBe('info');
    expect(iconPath(root, '.ink-result__icon')).toBe(ICONS.doc);

    el.removeAttribute('status');
    expect(root.dataset['status']).toBe('info');
  });

  it('patches the title in place', () => {
    const el = mount(`<e-result title="Before"></e-result>`);
    const titleEl = el.querySelector<HTMLElement>('.ink-result__title')!;
    el.setAttribute('title', 'After');
    expect(el.querySelector('.ink-result__title')).toBe(titleEl);
    expect(titleEl.textContent).toBe('After');
    el.removeAttribute('title');
    expect(titleEl.textContent).toBe('');
  });

  it('creates, patches and removes the description', () => {
    const el = mount(`<e-result title="T"><e-button slot="action">Go</e-button></e-result>`);
    const root = el.querySelector<HTMLElement>('.ink-result')!;
    expect(root.querySelector('.ink-result__desc')).toBeNull();

    el.setAttribute('description', 'We sent a receipt.');
    const descEl = root.querySelector<HTMLElement>('.ink-result__desc')!;
    expect(descEl.tagName).toBe('P');
    expect(descEl.textContent).toBe('We sent a receipt.');
    // inserted before the action wrapper, i.e. last-but-one
    expect(descEl.nextElementSibling!.className).toBe('ink-result__action');

    el.setAttribute('description', 'Updated.');
    expect(root.querySelector('.ink-result__desc')).toBe(descEl);
    expect(descEl.textContent).toBe('Updated.');

    el.setAttribute('description', '');
    expect(root.querySelector('.ink-result__desc')).toBeNull();

    // removing again with nothing to remove is a no-op
    el.removeAttribute('description');
    expect(root.querySelector('.ink-result__desc')).toBeNull();
  });

  it('renders a description supplied at mount time', () => {
    const el = mount(`<e-result title="T" description="D"></e-result>`);
    const descEl = el.querySelector<HTMLElement>('.ink-result__desc')!;
    expect(descEl.textContent).toBe('D');
    el.setAttribute('description', 'D2');
    expect(el.querySelector('.ink-result__desc')).toBe(descEl);
    expect(descEl.textContent).toBe('D2');
  });

  it('moves a slot="action" element into .ink-result__action', () => {
    const el = mount(`<e-result title="T"><span slot="action" id="ra">Act</span></e-result>`);
    const wrapEl = el.querySelector<HTMLElement>('.ink-result__action')!;
    expect(wrapEl.querySelector('#ra')!.textContent).toBe('Act');
    expect(wrapEl.children.length).toBe(1);
  });

  it('escapes attribute-supplied markup in title and description', () => {
    const el = mount(
      `<e-result title="<script>t</script>" description="<img src=x onerror=boom>"></e-result>`,
    );
    const titleEl = el.querySelector<HTMLElement>('.ink-result__title')!;
    const descEl = el.querySelector<HTMLElement>('.ink-result__desc')!;
    expect(titleEl.textContent).toBe('<script>t</script>');
    expect(titleEl.querySelector('script')).toBeNull();
    expect(descEl.textContent).toBe('<img src=x onerror=boom>');
    expect(descEl.querySelector('img')).toBeNull();
  });

  it('ignores attribute changes before connection and does not rebuild on re-connection', () => {
    const el = document.createElement('e-result');
    el.setAttribute('status', 'success');
    el.setAttribute('title', 'Pre');
    expect(el.querySelector('.ink-result')).toBeNull();
    document.body.appendChild(el);
    const root = el.querySelector<HTMLElement>('.ink-result')!;
    expect(root.dataset['status']).toBe('success');
    remount(el);
    expect(el.querySelectorAll('.ink-result').length).toBe(1);
    expect(el.querySelector('.ink-result')).toBe(root);
  });
});

/* ===================================================================== *
 * e-empty
 * ===================================================================== */

describe('e-empty', () => {
  it('renders the default icon and title', () => {
    const el = mount(`<e-empty></e-empty>`);
    const root = el.querySelector<HTMLElement>('.ink-empty')!;
    expect(root.getAttribute('role')).toBe('status');
    expect(iconPath(root, '.ink-empty__icon')).toBe(ICONS.doc);
    expect(root.querySelector('.ink-empty__icon svg')!.getAttribute('width')).toBe('48');
    expect(root.querySelector('.ink-empty__title')!.textContent).toBe('No data');
    expect(root.querySelector('.ink-empty__desc')).toBeNull();
    expect(root.hasAttribute('data-has-desc')).toBe(false);
  });

  it('swaps the icon when the icon attribute changes and empties it for an unknown name', () => {
    const el = mount(`<e-empty icon="folder"></e-empty>`);
    const iconWrap = el.querySelector<HTMLElement>('.ink-empty__icon')!;
    expect(iconPath(el, '.ink-empty__icon')).toBe(ICONS.folder);

    el.setAttribute('icon', 'search');
    expect(el.querySelector('.ink-empty__icon')).toBe(iconWrap);
    expect(iconPath(el, '.ink-empty__icon')).toBe(ICONS.search);

    el.setAttribute('icon', 'not-an-icon');
    expect(iconWrap.innerHTML).toBe('');

    el.removeAttribute('icon');
    expect(iconPath(el, '.ink-empty__icon')).toBe(ICONS.doc);
  });

  it('patches the title and restores the default when cleared', () => {
    const el = mount(`<e-empty title="No invoices"></e-empty>`);
    const titleEl = el.querySelector<HTMLElement>('.ink-empty__title')!;
    expect(titleEl.textContent).toBe('No invoices');
    el.setAttribute('title', 'No receipts');
    expect(el.querySelector('.ink-empty__title')).toBe(titleEl);
    expect(titleEl.textContent).toBe('No receipts');
    el.setAttribute('title', '');
    expect(titleEl.textContent).toBe('No data');
    el.removeAttribute('title');
    expect(titleEl.textContent).toBe('No data');
  });

  it('creates, patches and removes the description and tracks data-has-desc', () => {
    const el = mount(`<e-empty><span slot="action" id="ea">Create</span></e-empty>`);
    const root = el.querySelector<HTMLElement>('.ink-empty')!;
    expect(root.querySelector('.ink-empty__desc')).toBeNull();
    expect(root.querySelector('.ink-empty__action > #ea')).not.toBeNull();

    el.setAttribute('description', 'Create one to get started.');
    const descEl = root.querySelector<HTMLElement>('.ink-empty__desc')!;
    expect(descEl.textContent).toBe('Create one to get started.');
    expect(descEl.nextElementSibling!.className).toBe('ink-empty__action');
    expect(root.getAttribute('data-has-desc')).toBe('');

    el.setAttribute('description', 'Second');
    expect(root.querySelector('.ink-empty__desc')).toBe(descEl);
    expect(descEl.textContent).toBe('Second');
    expect(root.getAttribute('data-has-desc')).toBe('');

    el.removeAttribute('description');
    expect(root.querySelector('.ink-empty__desc')).toBeNull();
    expect(root.hasAttribute('data-has-desc')).toBe(false);

    // clearing again with no description element present
    el.setAttribute('description', '');
    expect(root.querySelector('.ink-empty__desc')).toBeNull();
    expect(root.hasAttribute('data-has-desc')).toBe(false);
  });

  it('keeps a mount-time description and can still remove it', () => {
    const el = mount(`<e-empty description="Nothing here"></e-empty>`);
    const root = el.querySelector<HTMLElement>('.ink-empty')!;
    const descEl = root.querySelector<HTMLElement>('.ink-empty__desc')!;
    expect(descEl.textContent).toBe('Nothing here');
    // data-has-desc is only written by the patch path, never by the initial render
    expect(root.hasAttribute('data-has-desc')).toBe(false);
    el.setAttribute('description', '');
    expect(root.querySelector('.ink-empty__desc')).toBeNull();
  });

  it('escapes attribute-supplied markup in title and description', () => {
    const el = mount(
      `<e-empty title="<script>a</script>" description="<img src=x onerror=boom>"></e-empty>`,
    );
    const titleEl = el.querySelector<HTMLElement>('.ink-empty__title')!;
    const descEl = el.querySelector<HTMLElement>('.ink-empty__desc')!;
    expect(titleEl.textContent).toBe('<script>a</script>');
    expect(titleEl.querySelector('script')).toBeNull();
    expect(descEl.textContent).toBe('<img src=x onerror=boom>');
    expect(descEl.querySelector('img')).toBeNull();

    el.setAttribute('description', '<b>x</b>');
    expect(el.querySelector('.ink-empty__desc')!.textContent).toBe('<b>x</b>');
    expect(el.querySelector('.ink-empty__desc')!.querySelector('b')).toBeNull();
  });

  it('ignores attribute changes before connection and does not rebuild on re-connection', () => {
    const el = document.createElement('e-empty');
    el.setAttribute('title', 'Pre');
    expect(el.querySelector('.ink-empty')).toBeNull();
    document.body.appendChild(el);
    const root = el.querySelector<HTMLElement>('.ink-empty')!;
    expect(root.querySelector('.ink-empty__title')!.textContent).toBe('Pre');
    remount(el);
    expect(el.querySelectorAll('.ink-empty').length).toBe(1);
    expect(el.querySelector('.ink-empty')).toBe(root);
  });
});

/* ===================================================================== *
 * e-progress
 * ===================================================================== */

describe('e-progress', () => {
  it('renders a linear bar with progressbar semantics by default', () => {
    const el = mount(`<e-progress value="42"></e-progress>`);
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
    expect(el.getAttribute('aria-valuenow')).toBe('42');
    expect(el.hasAttribute('aria-label')).toBe(false);
    const wrap = el.querySelector<HTMLElement>('.ink-progress')!;
    expect(wrap.className).toBe('ink-progress ink-progress--linear');
    expect(
      wrap.querySelector<HTMLElement>('.ink-progress__track > .ink-progress__fill')!.style.width,
    ).toBe('42%');
    expect(wrap.querySelector('.ink-progress__label')).toBeNull();
  });

  it('rounds the percentage and clamps out-of-range values', () => {
    const pct = (html: string): string =>
      mount(html).querySelector<HTMLElement>('.ink-progress__fill')!.style.width;
    expect(pct(`<e-progress value="1" max="3"></e-progress>`)).toBe('33%');
    expect(pct(`<e-progress value="2" max="3"></e-progress>`)).toBe('67%');
    expect(pct(`<e-progress value="150" max="100"></e-progress>`)).toBe('100%');
    expect(pct(`<e-progress value="-10"></e-progress>`)).toBe('0%');
    expect(pct(`<e-progress value="abc"></e-progress>`)).toBe('0%');
    expect(pct(`<e-progress value=""></e-progress>`)).toBe('0%');
    // max is floored at 1, so value=1 saturates the bar
    expect(pct(`<e-progress value="1" max="0"></e-progress>`)).toBe('100%');
  });

  it('clamps the reported aria values as well', () => {
    const over = mount(`<e-progress value="150" max="100"></e-progress>`);
    expect(over.getAttribute('aria-valuenow')).toBe('100');
    const under = mount(`<e-progress value="-10"></e-progress>`);
    expect(under.getAttribute('aria-valuenow')).toBe('0');
    const noMax = mount(`<e-progress value="1" max="0"></e-progress>`);
    expect(noMax.getAttribute('aria-valuemax')).toBe('1');
  });

  it('patches the fill width and aria as value/max change', () => {
    const el = mount(`<e-progress value="10"></e-progress>`);
    const fill = el.querySelector<HTMLElement>('.ink-progress__fill')!;
    el.setAttribute('value', '80');
    expect(fill.style.width).toBe('80%');
    expect(el.getAttribute('aria-valuenow')).toBe('80');
    el.setAttribute('max', '200');
    expect(fill.style.width).toBe('40%');
    expect(el.getAttribute('aria-valuemax')).toBe('200');
    el.removeAttribute('value');
    expect(fill.style.width).toBe('0%');
    expect(el.getAttribute('aria-valuenow')).toBe('0');
    // the same fill node is reused throughout
    expect(el.querySelector('.ink-progress__fill')).toBe(fill);
  });

  it('creates, patches and removes the caption as label / hide-label change', () => {
    const el = mount(`<e-progress value="25"></e-progress>`);
    const wrap = el.querySelector<HTMLElement>('.ink-progress')!;
    expect(wrap.querySelector('.ink-progress__label')).toBeNull();

    el.setAttribute('label', 'Sync');
    const cap = wrap.querySelector<HTMLElement>('.ink-progress__label')!;
    expect(cap.textContent).toBe('Sync · 25%');
    expect(el.getAttribute('aria-label')).toBe('Sync');

    el.setAttribute('value', '50');
    expect(wrap.querySelector('.ink-progress__label')).toBe(cap);
    expect(cap.textContent).toBe('Sync · 50%');

    el.setAttribute('hide-label', '');
    expect(wrap.querySelector('.ink-progress__label')).toBeNull();
    expect(el.getAttribute('aria-label')).toBe('Sync');

    el.removeAttribute('hide-label');
    expect(wrap.querySelector('.ink-progress__label')!.textContent).toBe('Sync · 50%');

    el.removeAttribute('label');
    expect(wrap.querySelector('.ink-progress__label')).toBeNull();
    expect(el.hasAttribute('aria-label')).toBe(false);
  });

  it('hide-label is presence-based, so hide-label="false" still hides', () => {
    const el = mount(`<e-progress value="5" label="L" hide-label="false"></e-progress>`);
    expect(el.querySelector('.ink-progress__label')).toBeNull();
    expect(el.getAttribute('aria-label')).toBe('L');
  });

  it('renders discrete segments for variant="steps"', () => {
    const el = mount(`<e-progress variant="steps" steps="4" value="50"></e-progress>`);
    const wrap = el.querySelector<HTMLElement>('.ink-progress')!;
    expect(wrap.className).toBe('ink-progress ink-progress--steps');
    const segs = wrap.querySelectorAll<HTMLElement>('.ink-progress__steps > .ink-progress__seg');
    expect(segs.length).toBe(4);
    expect(wrap.querySelectorAll('.ink-progress__seg[data-on]').length).toBe(2);
    expect(wrap.querySelector('.ink-progress__fill')).toBeNull();
  });

  it('grows and shrinks the segment list and repaints the filled ones', () => {
    const el = mount(`<e-progress variant="steps" steps="4" value="50"></e-progress>`);
    const grid = el.querySelector<HTMLElement>('.ink-progress__steps')!;
    const firstSeg = grid.querySelector<HTMLElement>('.ink-progress__seg')!;

    el.setAttribute('value', '100');
    expect(grid.querySelectorAll('.ink-progress__seg[data-on]').length).toBe(4);

    el.setAttribute('steps', '6');
    expect(grid.querySelectorAll('.ink-progress__seg').length).toBe(6);
    expect(grid.querySelectorAll('.ink-progress__seg[data-on]').length).toBe(6);
    expect(grid.querySelector('.ink-progress__seg')).toBe(firstSeg);

    el.setAttribute('steps', '2');
    expect(grid.querySelectorAll('.ink-progress__seg').length).toBe(2);

    el.setAttribute('value', '0');
    expect(grid.querySelectorAll('.ink-progress__seg[data-on]').length).toBe(0);
  });

  it('clamps steps to 1..1000 and falls back for invalid input', () => {
    const count = (html: string): number =>
      mount(html).querySelectorAll('.ink-progress__seg').length;
    expect(count(`<e-progress variant="steps" steps="0"></e-progress>`)).toBe(1);
    expect(count(`<e-progress variant="steps" steps="-3"></e-progress>`)).toBe(1);
    expect(count(`<e-progress variant="steps" steps="abc"></e-progress>`)).toBe(5);
    expect(count(`<e-progress variant="steps" steps="2.5"></e-progress>`)).toBe(5);
    expect(count(`<e-progress variant="steps"></e-progress>`)).toBe(5);
  });

  it('rebuilds when the variant changes and patches when it does not', () => {
    const el = mount(`<e-progress value="100" label="L"></e-progress>`);
    expect(el.querySelector('.ink-progress__fill')).not.toBeNull();

    el.setAttribute('variant', 'steps');
    expect(el.querySelector('.ink-progress__fill')).toBeNull();
    expect(el.querySelectorAll('.ink-progress__seg').length).toBe(5);
    expect(el.querySelector('.ink-progress__label')!.textContent).toBe('L · 100%');
    const grid = el.querySelector<HTMLElement>('.ink-progress__steps')!;

    // same variant re-asserted → patch path, grid identity preserved
    el.setAttribute('variant', 'steps');
    expect(el.querySelector('.ink-progress__steps')).toBe(grid);

    el.setAttribute('variant', 'linear');
    expect(el.querySelector('.ink-progress__steps')).toBeNull();
    expect(el.querySelector<HTMLElement>('.ink-progress__fill')!.style.width).toBe('100%');

    // an unknown variant is treated as linear, so this is a no-op rebuild-wise
    const fill = el.querySelector<HTMLElement>('.ink-progress__fill')!;
    el.setAttribute('variant', 'bogus');
    expect(el.querySelector('.ink-progress__fill')).toBe(fill);

    el.removeAttribute('variant');
    expect(el.querySelector('.ink-progress__fill')).toBe(fill);
  });

  it('ignores a steps change while linear', () => {
    const el = mount(`<e-progress value="50"></e-progress>`);
    el.setAttribute('steps', '8');
    expect(el.querySelectorAll('.ink-progress__seg').length).toBe(0);
    expect(el.querySelector<HTMLElement>('.ink-progress__fill')!.style.width).toBe('50%');
  });

  it('ignores attribute changes before connection and does not rebuild on re-connection', () => {
    const el = document.createElement('e-progress');
    el.setAttribute('value', '30');
    expect(el.querySelector('.ink-progress')).toBeNull();
    document.body.appendChild(el);
    const wrap = el.querySelector<HTMLElement>('.ink-progress')!;
    expect(el.querySelector<HTMLElement>('.ink-progress__fill')!.style.width).toBe('30%');
    remount(el);
    expect(el.querySelectorAll('.ink-progress').length).toBe(1);
    expect(el.querySelector('.ink-progress')).toBe(wrap);
  });
});

/* ===================================================================== *
 * e-alert
 * ===================================================================== */

describe('e-alert', () => {
  it('renders an info banner with a status live region by default', () => {
    const el = mount(`<e-alert>Body text</e-alert>`);
    const root = el.querySelector<HTMLElement>('.ink-alert')!;
    expect(root.dataset['variant']).toBe('info');
    expect(root.getAttribute('role')).toBe('status');
    expect(iconPath(root, '.ink-alert__icon')).toBe(ICONS.doc);
    expect(root.querySelector('.ink-alert__icon svg')!.getAttribute('width')).toBe('20');
    expect(root.querySelector('.ink-alert__body')!.textContent).toBe('Body text');
    expect(root.querySelector<HTMLElement>('.ink-alert__heading')!.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('.ink-alert__close')!.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('.ink-alert__action')!.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('.ink-alert__icon')!.hidden).toBe(false);
  });

  it('uses role=alert only for the error variant', () => {
    expect(
      mount(`<e-alert variant="error">x</e-alert>`)
        .querySelector('.ink-alert')!
        .getAttribute('role'),
    ).toBe('alert');
    for (const variant of ['info', 'success', 'warning']) {
      expect(
        mount(`<e-alert variant="${variant}">x</e-alert>`)
          .querySelector('.ink-alert')!
          .getAttribute('role'),
      ).toBe('status');
    }
  });

  it('maps every variant to its icon and falls back to info', () => {
    const cases: Array<[string, string]> = [
      ['info', ICONS.doc],
      ['success', ICONS.check],
      ['warning', ICONS.bell],
      ['error', ICONS.close],
      ['nonsense', ICONS.doc],
    ];
    for (const [variant, path] of cases) {
      const el = mount(`<e-alert variant="${variant}">x</e-alert>`);
      expect(iconPath(el, '.ink-alert__icon')).toBe(path);
    }
    expect(
      mount(`<e-alert variant="nonsense">x</e-alert>`).querySelector<HTMLElement>('.ink-alert')!
        .dataset['variant'],
    ).toBe('info');
  });

  it('moves the live-region role and the icon when the variant changes', () => {
    const el = mount(`<e-alert>x</e-alert>`);
    const root = el.querySelector<HTMLElement>('.ink-alert')!;
    const icon = root.querySelector<HTMLElement>('.ink-alert__icon')!;

    el.setAttribute('variant', 'error');
    expect(root.dataset['variant']).toBe('error');
    expect(root.getAttribute('role')).toBe('alert');
    expect(iconPath(root, '.ink-alert__icon')).toBe(ICONS.close);

    el.setAttribute('variant', 'success');
    expect(root.getAttribute('role')).toBe('status');
    expect(iconPath(root, '.ink-alert__icon')).toBe(ICONS.check);

    el.removeAttribute('variant');
    expect(root.dataset['variant']).toBe('info');
    expect(root.getAttribute('role')).toBe('status');
    expect(root.querySelector('.ink-alert__icon')).toBe(icon);
  });

  it('skips the work entirely when an attribute is re-set to its current value', () => {
    const el = mount(`<e-alert variant="error">x</e-alert>`);
    const icon = el.querySelector<HTMLElement>('.ink-alert__icon')!;
    icon.innerHTML = '<b class="probe"></b>';

    el.setAttribute('variant', 'error'); // old === val → early return
    expect(icon.querySelector('.probe')).not.toBeNull();

    el.setAttribute('variant', 'success'); // real change → icon re-rendered
    expect(icon.querySelector('.probe')).toBeNull();
  });

  it('creates, patches and hides the heading', () => {
    const el = mount(`<e-alert>Body</e-alert>`);
    const heading = el.querySelector<HTMLElement>('.ink-alert__heading')!;
    expect(heading.hidden).toBe(true);
    expect(heading.textContent).toBe('');

    el.setAttribute('heading', 'Battery low');
    expect(heading.hidden).toBe(false);
    expect(heading.textContent).toBe('Battery low');

    el.setAttribute('heading', 'Battery critical');
    expect(el.querySelector('.ink-alert__heading')).toBe(heading);
    expect(heading.textContent).toBe('Battery critical');

    el.setAttribute('heading', '');
    expect(heading.hidden).toBe(true);
    expect(heading.textContent).toBe('');

    el.setAttribute('heading', 'Back');
    expect(heading.hidden).toBe(false);
    el.removeAttribute('heading');
    expect(heading.hidden).toBe(true);
    expect(heading.textContent).toBe('');
  });

  it('escapes a heading supplied as markup', () => {
    const el = mount(`<e-alert heading="<img src=x onerror=boom>">Body</e-alert>`);
    const heading = el.querySelector<HTMLElement>('.ink-alert__heading')!;
    expect(heading.textContent).toBe('<img src=x onerror=boom>');
    expect(heading.querySelector('img')).toBeNull();
    el.setAttribute('heading', '<script>y</script>');
    expect(heading.textContent).toBe('<script>y</script>');
    expect(heading.querySelector('script')).toBeNull();
  });

  it('shows and hides the dismiss button as closable changes', () => {
    const el = mount(`<e-alert>Body</e-alert>`);
    const btn = el.querySelector<HTMLButtonElement>('.ink-alert__close')!;
    expect(btn.hidden).toBe(true);
    expect(btn.getAttribute('aria-label')).toBe('Dismiss');
    expect(btn.type).toBe('button');

    el.setAttribute('closable', '');
    expect(btn.hidden).toBe(false);
    el.setAttribute('closable', 'false'); // boolAttr treats "false" as off
    expect(btn.hidden).toBe(true);
    el.setAttribute('closable', 'closable');
    expect(btn.hidden).toBe(false);
    el.removeAttribute('closable');
    expect(btn.hidden).toBe(true);
  });

  it('shows and hides the status icon as no-icon changes', () => {
    const el = mount(`<e-alert no-icon>Body</e-alert>`);
    const icon = el.querySelector<HTMLElement>('.ink-alert__icon')!;
    expect(icon.hidden).toBe(true);
    el.removeAttribute('no-icon');
    expect(icon.hidden).toBe(false);
    el.setAttribute('no-icon', '');
    expect(icon.hidden).toBe(true);
    el.setAttribute('no-icon', 'false');
    expect(icon.hidden).toBe(false);
  });

  it('fires e-close with the heading as detail.value and hides the host', () => {
    const el = mount(`<e-alert heading="Battery low" closable>Connect the charger.</e-alert>`);
    const details: Array<{ value: string }> = [];
    let bubbled = 0;
    el.addEventListener('e-close', (e) =>
      details.push((e as CustomEvent<{ value: string }>).detail),
    );
    document.body.addEventListener('e-close', () => bubbled++, { once: true });

    el.querySelector<HTMLButtonElement>('.ink-alert__close')!.click();

    expect(details.length).toBe(1);
    expect(details[0]).toEqual({ value: 'Battery low' });
    expect(bubbled).toBe(1);
    expect(el.hidden).toBe(true);
  });

  it('falls back to the trimmed body text when there is no heading', () => {
    const el = mount(`<e-alert closable>   Disk almost full   </e-alert>`);
    let detail: { value: string } | null = null;
    el.addEventListener('e-close', (e) => {
      detail = (e as CustomEvent<{ value: string }>).detail;
    });
    el.querySelector<HTMLButtonElement>('.ink-alert__close')!.click();
    expect(detail).toEqual({ value: 'Disk almost full' });
  });

  it('moves a slot="action" element into the action wrapper and unhides it', () => {
    const el = mount(`<e-alert>Body<span slot="action" id="aa">Act</span></e-alert>`);
    const actionWrap = el.querySelector<HTMLElement>('.ink-alert__action')!;
    expect(actionWrap.hidden).toBe(false);
    expect(actionWrap.querySelector('#aa')!.textContent).toBe('Act');
    // the action element must not leak into the body slot
    expect(el.querySelector('.ink-alert__body')!.textContent).toBe('Body');
  });

  it('re-wires the dismiss listener exactly once across a disconnect/reconnect', () => {
    const el = mount(`<e-alert heading="H" closable>Body</e-alert>`);
    const root = el.querySelector<HTMLElement>('.ink-alert')!;
    remount(el);
    expect(el.querySelectorAll('.ink-alert').length).toBe(1);
    expect(el.querySelector('.ink-alert')).toBe(root);

    let fired = 0;
    el.addEventListener('e-close', () => fired++);
    el.querySelector<HTMLButtonElement>('.ink-alert__close')!.click();
    expect(fired).toBe(1);
  });

  it('stops firing e-close once disconnected', () => {
    const el = mount(`<e-alert heading="H" closable>Body</e-alert>`);
    const btn = el.querySelector<HTMLButtonElement>('.ink-alert__close')!;
    let fired = 0;
    el.addEventListener('e-close', () => fired++);
    el.remove();
    btn.click();
    expect(fired).toBe(0);
  });

  it('ignores attribute changes before connection', () => {
    const el = document.createElement('e-alert');
    el.setAttribute('variant', 'warning');
    el.setAttribute('heading', 'Pre');
    expect(el.querySelector('.ink-alert')).toBeNull();
    document.body.appendChild(el);
    const root = el.querySelector<HTMLElement>('.ink-alert')!;
    expect(root.dataset['variant']).toBe('warning');
    expect(root.querySelector<HTMLElement>('.ink-alert__heading')!.textContent).toBe('Pre');
    expect(iconPath(root, '.ink-alert__icon')).toBe(ICONS.bell);
  });
});

/* ===================================================================== *
 * e-divider
 * ===================================================================== */

describe('e-divider', () => {
  it('renders a plain <hr> by default', () => {
    const el = mount(`<e-divider></e-divider>`);
    const hr = el.firstElementChild as HTMLElement;
    expect(hr.tagName).toBe('HR');
    expect(hr.className).toBe('ink-divider');
    expect(el.children.length).toBe(1);
  });

  it('renders a dashed <hr> for variant="dashed"', () => {
    const el = mount(`<e-divider variant="dashed"></e-divider>`);
    expect((el.firstElementChild as HTMLElement).className).toBe('ink-divider ink-divider--dashed');
  });

  it('renders a decorative span for orientation="vertical"', () => {
    const el = mount(`<e-divider orientation="vertical"></e-divider>`);
    const span = el.firstElementChild as HTMLElement;
    expect(span.tagName).toBe('SPAN');
    expect(span.className).toBe('ink-divider--vertical');
    expect(span.getAttribute('aria-hidden')).toBe('true');

    const dashed = mount(`<e-divider orientation="vertical" variant="dashed"></e-divider>`);
    expect((dashed.firstElementChild as HTMLElement).className).toBe(
      'ink-divider--vertical ink-divider--dashed',
    );
  });

  it('renders a labeled separator when a label attribute is present', () => {
    const el = mount(`<e-divider label="OR"></e-divider>`);
    const div = el.firstElementChild as HTMLElement;
    expect(div.tagName).toBe('DIV');
    expect(div.className).toBe('ink-divider--labeled');
    expect(div.getAttribute('role')).toBe('separator');
    expect(div.getAttribute('aria-label')).toBe('OR');
    expect(div.textContent).toBe('OR');
  });

  it('an empty label attribute still selects the labeled mode', () => {
    const el = mount(`<e-divider label=""></e-divider>`);
    const div = el.firstElementChild as HTMLElement;
    expect(div.className).toBe('ink-divider--labeled');
    expect(div.textContent).toBe('');
  });

  it('vertical beats label when both are set', () => {
    const el = mount(`<e-divider orientation="vertical" label="OR"></e-divider>`);
    const span = el.firstElementChild as HTMLElement;
    expect(span.tagName).toBe('SPAN');
    expect(span.textContent).toBe('');
  });

  it('toggles the dashed class in place while the mode is unchanged', () => {
    const el = mount(`<e-divider></e-divider>`);
    const hr = el.firstElementChild as HTMLElement;
    el.setAttribute('variant', 'dashed');
    expect(el.firstElementChild).toBe(hr);
    expect(hr.className).toBe('ink-divider ink-divider--dashed');
    el.setAttribute('variant', 'solid');
    expect(hr.className).toBe('ink-divider');
    el.setAttribute('variant', 'dashed');
    el.removeAttribute('variant');
    expect(el.firstElementChild).toBe(hr);
    expect(hr.className).toBe('ink-divider');
  });

  it('toggles the dashed class in place on a vertical divider', () => {
    const el = mount(`<e-divider orientation="vertical"></e-divider>`);
    const span = el.firstElementChild as HTMLElement;
    el.setAttribute('variant', 'dashed');
    expect(el.firstElementChild).toBe(span);
    expect(span.className).toBe('ink-divider--vertical ink-divider--dashed');
    el.removeAttribute('variant');
    expect(span.className).toBe('ink-divider--vertical');
  });

  it('patches the label text in place while the mode is unchanged', () => {
    const el = mount(`<e-divider label="OR"></e-divider>`);
    const div = el.firstElementChild as HTMLElement;
    el.setAttribute('label', 'AND');
    expect(el.firstElementChild).toBe(div);
    expect(div.textContent).toBe('AND');
    expect(div.getAttribute('aria-label')).toBe('AND');
    // variant is deliberately inert in labeled mode (the rules are ::before/::after)
    el.setAttribute('variant', 'dashed');
    expect(div.className).toBe('ink-divider--labeled');
  });

  it('rebuilds the element when the mode changes in either direction', () => {
    const el = mount(`<e-divider></e-divider>`);
    expect((el.firstElementChild as HTMLElement).tagName).toBe('HR');

    el.setAttribute('label', 'OR');
    expect((el.firstElementChild as HTMLElement).tagName).toBe('DIV');
    expect(el.children.length).toBe(1);

    el.setAttribute('orientation', 'vertical');
    expect((el.firstElementChild as HTMLElement).tagName).toBe('SPAN');

    el.setAttribute('orientation', 'horizontal');
    expect((el.firstElementChild as HTMLElement).tagName).toBe('DIV');

    el.removeAttribute('label');
    expect((el.firstElementChild as HTMLElement).tagName).toBe('HR');
    expect(el.children.length).toBe(1);
  });

  it('renders label markup as text', () => {
    const el = mount(`<e-divider label="<b>x</b>"></e-divider>`);
    const div = el.firstElementChild as HTMLElement;
    expect(div.textContent).toBe('<b>x</b>');
    expect(div.querySelector('b')).toBeNull();
    // NOTE: esc() is applied to a DOM-API attribute value here, so the escaped
    // entity text — not the raw label — ends up as the accessible name.
    expect(div.getAttribute('aria-label')).toBe('&lt;b&gt;x&lt;/b&gt;');
    el.setAttribute('label', 'A & B');
    expect(div.textContent).toBe('A & B');
    expect(div.getAttribute('aria-label')).toBe('A &amp; B');
  });

  it('ignores attribute changes before connection and does not rebuild on re-connection', () => {
    const el = document.createElement('e-divider');
    el.setAttribute('label', 'Pre');
    expect(el.children.length).toBe(0);
    document.body.appendChild(el);
    const div = el.firstElementChild as HTMLElement;
    expect(div.textContent).toBe('Pre');
    remount(el);
    expect(el.children.length).toBe(1);
    expect(el.firstElementChild).toBe(div);
  });
});

/* ===================================================================== *
 * e-text
 * ===================================================================== */

describe('e-text', () => {
  it('wraps children in a span.ink-text by default', () => {
    const el = mount(`<e-text>Hello</e-text>`);
    const wrap = el.firstElementChild as HTMLElement;
    expect(wrap.tagName).toBe('SPAN');
    expect(wrap.className).toBe('ink-text');
    expect(wrap.textContent).toBe('Hello');
  });

  it('applies a kind modifier and drops it again for kind="body"', () => {
    const el = mount(`<e-text kind="label">SECTION</e-text>`);
    const wrap = el.firstElementChild as HTMLElement;
    expect(wrap.classList.contains('ink-text')).toBe(true);
    expect(wrap.classList.contains('ink-text--label')).toBe(true);

    el.setAttribute('kind', 'mono');
    expect(wrap.classList.contains('ink-text--mono')).toBe(true);
    expect(wrap.classList.contains('ink-text--label')).toBe(false);

    el.setAttribute('kind', 'body');
    expect(wrap.className).toBe('ink-text');

    el.setAttribute('kind', 'small');
    expect(wrap.className).toBe('ink-text ink-text--small');
    el.removeAttribute('kind');
    expect(wrap.className).toBe('ink-text');
  });

  it('honours the as attribute on mount', () => {
    const el = mount(`<e-text as="p">Paragraph</e-text>`);
    const wrap = el.firstElementChild as HTMLElement;
    expect(wrap.tagName).toBe('P');
    expect(wrap.className).toBe('ink-text');
  });

  it('rebuilds the wrapper when as changes and carries the children over', () => {
    const el = mount(`<e-text as="p" kind="label"><b id="tk">Keep</b></e-text>`);
    const first = el.firstElementChild as HTMLElement;
    const child = el.querySelector('#tk')!;

    el.setAttribute('as', 'div');
    const second = el.firstElementChild as HTMLElement;
    expect(second.tagName).toBe('DIV');
    expect(second).not.toBe(first);
    expect(el.children.length).toBe(1);
    expect(second.querySelector('#tk')).toBe(child);
    // BUG: the rebuilt wrapper never re-adds the `ink-text` base class, so only
    // the kind modifier survives an `as` change.
    expect(second.className).toBe('ink-text--label');

    // same value → no rebuild
    el.setAttribute('as', 'div');
    expect(el.firstElementChild).toBe(second);

    el.removeAttribute('as');
    const third = el.firstElementChild as HTMLElement;
    expect(third.tagName).toBe('SPAN');
    expect(third.querySelector('#tk')).toBe(child);
  });

  it('renders escaped markup children as text', () => {
    const el = mount(`<e-text>&lt;script&gt;alert(1)&lt;/script&gt;</e-text>`);
    const wrap = el.firstElementChild as HTMLElement;
    expect(wrap.textContent).toBe('<script>alert(1)</script>');
    expect(wrap.querySelector('script')).toBeNull();
  });

  it('does not double-wrap on re-connection', () => {
    const el = mount(`<e-text kind="small">Once</e-text>`);
    const wrap = el.firstElementChild as HTMLElement;
    remount(el);
    expect(el.children.length).toBe(1);
    expect(el.firstElementChild).toBe(wrap);
    expect(wrap.className).toBe('ink-text ink-text--small');
    expect(wrap.textContent).toBe('Once');
  });

  it('ignores attribute changes before connection', () => {
    const el = document.createElement('e-text');
    el.textContent = 'Pre';
    el.setAttribute('kind', 'mono');
    el.setAttribute('as', 'p');
    expect(el.children.length).toBe(0);
    document.body.appendChild(el);
    const wrap = el.firstElementChild as HTMLElement;
    expect(wrap.tagName).toBe('P');
    expect(wrap.className).toBe('ink-text ink-text--mono');
    expect(wrap.textContent).toBe('Pre');
  });
});

/* ===================================================================== *
 * e-title
 * ===================================================================== */

describe('e-title', () => {
  it('renders an <h1> by default and moves the children in', () => {
    const el = mount(`<e-title>Heading</e-title>`);
    const h = el.firstElementChild as HTMLElement;
    expect(h.tagName).toBe('H1');
    expect(h.className).toBe('ink-title ink-title--1');
    expect(h.textContent).toBe('Heading');
    expect(el.children.length).toBe(1);
  });

  it('renders each level 1..6', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const el = mount(`<e-title level="${level}">H</e-title>`);
      const h = el.firstElementChild as HTMLElement;
      expect(h.tagName).toBe(`H${level}`);
      expect(h.className).toBe(`ink-title ink-title--${level}`);
    }
  });

  it('clamps out-of-range levels and falls back for invalid input', () => {
    const tag = (attr: string): string =>
      (mount(`<e-title level="${attr}">H</e-title>`).firstElementChild as HTMLElement).tagName;
    expect(tag('0')).toBe('H1');
    expect(tag('-3')).toBe('H1');
    expect(tag('9')).toBe('H6');
    expect(tag('abc')).toBe('H1');
    expect(tag('')).toBe('H1');
    expect(tag(' ')).toBe('H1');
  });

  it('swaps the heading element when level changes and keeps the children', () => {
    const el = mount(`<e-title level="2"><em id="tt">Section</em></e-title>`);
    const first = el.firstElementChild as HTMLElement;
    const child = el.querySelector('#tt')!;
    expect(first.tagName).toBe('H2');

    el.setAttribute('level', '4');
    const second = el.firstElementChild as HTMLElement;
    expect(second.tagName).toBe('H4');
    expect(second.className).toBe('ink-title ink-title--4');
    expect(second).not.toBe(first);
    expect(el.children.length).toBe(1);
    expect(second.querySelector('#tt')).toBe(child);

    // same effective level → no swap
    el.setAttribute('level', '4');
    expect(el.firstElementChild).toBe(second);
    el.setAttribute('level', '99'); // clamps back to 6 → swap
    expect((el.firstElementChild as HTMLElement).tagName).toBe('H6');

    el.removeAttribute('level');
    const last = el.firstElementChild as HTMLElement;
    expect(last.tagName).toBe('H1');
    expect(last.querySelector('#tt')).toBe(child);
  });

  it('renders escaped markup children as text', () => {
    const el = mount(`<e-title level="3">&lt;script&gt;x&lt;/script&gt;</e-title>`);
    const h = el.firstElementChild as HTMLElement;
    expect(h.textContent).toBe('<script>x</script>');
    expect(h.querySelector('script')).toBeNull();
  });

  it('renders an empty heading when there are no children', () => {
    const el = mount(`<e-title level="5"></e-title>`);
    const h = el.firstElementChild as HTMLElement;
    expect(h.tagName).toBe('H5');
    expect(h.textContent).toBe('');
  });

  it('a fractional level produces a non-heading element', () => {
    // BUG: `level` is read with numAttr(), not intAttr(), so a fraction is
    // clamped but never rounded and reaches document.createElement() verbatim.
    const el = mount(`<e-title level="3.5">H</e-title>`);
    const h = el.firstElementChild as HTMLElement;
    expect(h.tagName).toBe('H3.5');
    expect(h.className).toBe('ink-title ink-title--3.5');
  });

  it('ignores attribute changes before connection and does not re-wrap on re-connection', () => {
    const el = document.createElement('e-title');
    el.textContent = 'Pre';
    el.setAttribute('level', '3');
    expect(el.children.length).toBe(0);
    document.body.appendChild(el);
    const h = el.firstElementChild as HTMLElement;
    expect(h.tagName).toBe('H3');
    remount(el);
    expect(el.children.length).toBe(1);
    expect(el.firstElementChild).toBe(h);
  });
});

/* ===================================================================== *
 * e-meter
 * ===================================================================== */

describe('e-meter', () => {
  const on = (el: Element): number => el.querySelectorAll('.ink-meter__segment[data-on]').length;

  it('renders meter semantics with ten segments by default', () => {
    const el = mount(`<e-meter label="Battery" value="72" unit="%"></e-meter>`);
    expect(el.getAttribute('role')).toBe('meter');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
    expect(el.getAttribute('aria-valuenow')).toBe('72');
    expect(el.getAttribute('aria-valuetext')).toBe('72%');
    expect(el.getAttribute('aria-label')).toBe('Battery');
    const root = el.querySelector<HTMLElement>('.ink-meter')!;
    expect(root.getAttribute('data-band')).toBe('normal');
    expect(root.querySelector('.ink-meter__label')!.textContent).toBe('Battery');
    expect(root.querySelector('.ink-meter__reading')!.textContent).toBe('72%');
    expect(root.querySelector('.ink-meter__band')!.textContent).toBe('In range');
    expect(root.querySelector('.ink-meter__scale')!.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelectorAll('.ink-meter__segment').length).toBe(10);
    expect(on(root)).toBe(7);
  });

  it('hides the label element and uses a generic accessible name without a label', () => {
    const el = mount(`<e-meter value="10"></e-meter>`);
    expect(el.getAttribute('aria-label')).toBe('Meter');
    const labelEl = el.querySelector<HTMLElement>('.ink-meter__label')!;
    expect(labelEl.hasAttribute('hidden')).toBe(true);
    expect(labelEl.textContent).toBe('');

    el.setAttribute('label', 'Signal');
    expect(labelEl.hasAttribute('hidden')).toBe(false);
    expect(labelEl.textContent).toBe('Signal');
    expect(el.getAttribute('aria-label')).toBe('Signal');

    el.setAttribute('label', 'Noise');
    expect(labelEl.textContent).toBe('Noise');
    el.removeAttribute('label');
    expect(labelEl.hasAttribute('hidden')).toBe(true);
    expect(el.getAttribute('aria-label')).toBe('Meter');
  });

  it('hides the reading for hide-value and restores it', () => {
    const el = mount(`<e-meter value="30" hide-value></e-meter>`);
    const reading = el.querySelector<HTMLElement>('.ink-meter__reading')!;
    expect(reading.hasAttribute('hidden')).toBe(true);
    expect(reading.textContent).toBe('30');
    el.removeAttribute('hide-value');
    expect(reading.hasAttribute('hidden')).toBe(false);
    el.setAttribute('hide-value', '');
    expect(reading.hasAttribute('hidden')).toBe(true);
  });

  it('clamps the value into [min, max] and repairs an inverted range', () => {
    const over = mount(`<e-meter value="150"></e-meter>`);
    expect(over.getAttribute('aria-valuenow')).toBe('100');
    expect(over.querySelector('.ink-meter__reading')!.textContent).toBe('100');

    const under = mount(`<e-meter value="-20"></e-meter>`);
    expect(under.getAttribute('aria-valuenow')).toBe('0');

    const inverted = mount(`<e-meter min="10" max="5" value="99"></e-meter>`);
    expect(inverted.getAttribute('aria-valuemin')).toBe('10');
    expect(inverted.getAttribute('aria-valuemax')).toBe('11');
    expect(inverted.getAttribute('aria-valuenow')).toBe('11');

    // value defaults to min, and non-numeric input falls back to it too
    const defaulted = mount(`<e-meter min="5"></e-meter>`);
    expect(defaulted.getAttribute('aria-valuenow')).toBe('5');
    const invalid = mount(`<e-meter min="5" value="abc"></e-meter>`);
    expect(invalid.getAttribute('aria-valuenow')).toBe('5');
  });

  it('lights no segment at the bottom of the range and at least one just above it', () => {
    const bottom = mount(`<e-meter min="0" max="100" value="0" segments="10"></e-meter>`);
    expect(on(bottom)).toBe(0);
    const barely = mount(`<e-meter min="0" max="100" value="1" segments="10"></e-meter>`);
    expect(on(barely)).toBe(1);
    const full = mount(`<e-meter min="0" max="100" value="100" segments="10"></e-meter>`);
    expect(on(full)).toBe(10);
  });

  it('reports the low / normal / high band', () => {
    const low = mount(`<e-meter value="10" low="20" high="90"></e-meter>`);
    expect(low.querySelector<HTMLElement>('.ink-meter')!.getAttribute('data-band')).toBe('low');
    expect(low.querySelector('.ink-meter__band')!.textContent).toBe('Low');

    const high = mount(`<e-meter value="95" low="20" high="90"></e-meter>`);
    expect(high.querySelector<HTMLElement>('.ink-meter')!.getAttribute('data-band')).toBe('high');
    expect(high.querySelector('.ink-meter__band')!.textContent).toBe('High');

    const mid = mount(`<e-meter value="50" low="20" high="90"></e-meter>`);
    expect(mid.querySelector<HTMLElement>('.ink-meter')!.getAttribute('data-band')).toBe('normal');

    // exactly on a threshold is still "normal" (strict < / >)
    const onLow = mount(`<e-meter value="20" low="20"></e-meter>`);
    expect(onLow.querySelector<HTMLElement>('.ink-meter')!.getAttribute('data-band')).toBe(
      'normal',
    );

    // no thresholds at all
    const none = mount(`<e-meter value="0"></e-meter>`);
    expect(none.querySelector<HTMLElement>('.ink-meter')!.getAttribute('data-band')).toBe('normal');
  });

  it('moves between bands when value or thresholds change after mount', () => {
    const el = mount(`<e-meter value="50" low="20" high="90"></e-meter>`);
    const root = el.querySelector<HTMLElement>('.ink-meter')!;
    const bandEl = root.querySelector<HTMLElement>('.ink-meter__band')!;

    el.setAttribute('value', '5');
    expect(root.getAttribute('data-band')).toBe('low');
    expect(bandEl.textContent).toBe('Low');

    el.setAttribute('low', '1');
    expect(root.getAttribute('data-band')).toBe('normal');
    expect(bandEl.textContent).toBe('In range');

    el.setAttribute('high', '3');
    expect(root.getAttribute('data-band')).toBe('high');

    el.removeAttribute('high');
    el.removeAttribute('low');
    expect(root.getAttribute('data-band')).toBe('normal');
    // the same band node is patched throughout
    expect(root.querySelector('.ink-meter__band')).toBe(bandEl);
  });

  it('a non-numeric threshold defaults to the value itself and never trips', () => {
    const el = mount(`<e-meter value="50" low="abc" high="abc"></e-meter>`);
    expect(el.querySelector<HTMLElement>('.ink-meter')!.getAttribute('data-band')).toBe('normal');
  });

  it('grows and shrinks the segment scale', () => {
    const el = mount(`<e-meter value="100" segments="10"></e-meter>`);
    const scale = el.querySelector<HTMLElement>('.ink-meter__scale')!;
    const firstSeg = scale.querySelector<HTMLElement>('.ink-meter__segment')!;
    expect(scale.children.length).toBe(10);

    el.setAttribute('segments', '20');
    expect(scale.children.length).toBe(20);
    expect(scale.firstElementChild).toBe(firstSeg);
    expect(on(scale)).toBe(20);

    el.setAttribute('segments', '3');
    expect(scale.children.length).toBe(3);
    expect(scale.firstElementChild).toBe(firstSeg);
    expect(on(scale)).toBe(3);

    el.setAttribute('value', '0');
    expect(on(scale)).toBe(0);
  });

  it('clamps segments to 1..100 and falls back for invalid input', () => {
    const count = (html: string): number =>
      mount(html).querySelectorAll('.ink-meter__segment').length;
    expect(count(`<e-meter segments="0"></e-meter>`)).toBe(1);
    expect(count(`<e-meter segments="-5"></e-meter>`)).toBe(1);
    expect(count(`<e-meter segments="1000"></e-meter>`)).toBe(100);
    expect(count(`<e-meter segments="abc"></e-meter>`)).toBe(10);
    expect(count(`<e-meter segments="2.5"></e-meter>`)).toBe(10);
  });

  it('appends the unit to both the reading and aria-valuetext, and drops it again', () => {
    const el = mount(`<e-meter value="42"></e-meter>`);
    const reading = el.querySelector<HTMLElement>('.ink-meter__reading')!;
    expect(reading.textContent).toBe('42');
    expect(el.getAttribute('aria-valuetext')).toBe('42');

    el.setAttribute('unit', ' kWh');
    expect(reading.textContent).toBe('42 kWh');
    expect(el.getAttribute('aria-valuetext')).toBe('42 kWh');

    el.setAttribute('unit', '%');
    expect(reading.textContent).toBe('42%');
    el.removeAttribute('unit');
    expect(reading.textContent).toBe('42');
  });

  it('re-reads min and max after mount', () => {
    const el = mount(`<e-meter value="5" min="0" max="10" segments="10"></e-meter>`);
    expect(on(el)).toBe(5);
    el.setAttribute('max', '20');
    expect(el.getAttribute('aria-valuemax')).toBe('20');
    expect(on(el)).toBe(3);
    el.setAttribute('min', '4');
    expect(el.getAttribute('aria-valuemin')).toBe('4');
    expect(on(el)).toBe(1);
  });

  it('renders label and unit markup as text', () => {
    const el = mount(`<e-meter value="1" label="<b>L</b>" unit="<i>u</i>"></e-meter>`);
    const labelEl = el.querySelector<HTMLElement>('.ink-meter__label')!;
    expect(labelEl.textContent).toBe('<b>L</b>');
    expect(labelEl.querySelector('b')).toBeNull();
    const reading = el.querySelector<HTMLElement>('.ink-meter__reading')!;
    expect(reading.textContent).toBe('1<i>u</i>');
    expect(reading.querySelector('i')).toBeNull();
  });

  it('ignores attribute changes before connection and does not rebuild on re-connection', () => {
    const el = document.createElement('e-meter');
    el.setAttribute('value', '25');
    expect(el.querySelector('.ink-meter')).toBeNull();
    document.body.appendChild(el);
    const root = el.querySelector<HTMLElement>('.ink-meter')!;
    expect(el.getAttribute('aria-valuenow')).toBe('25');
    remount(el);
    expect(el.querySelectorAll('.ink-meter').length).toBe(1);
    expect(el.querySelector('.ink-meter')).toBe(root);
  });
});

/* ===================================================================== *
 * e-status-board
 * ===================================================================== */

describe('e-status-board', () => {
  const cells = (el: Element): HTMLElement[] => [
    ...el.querySelectorAll<HTMLElement>('.ink-status-board__cell'),
  ];

  it('renders the empty state with no data attribute', () => {
    const el = mount(`<e-status-board></e-status-board>`);
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Status board');
    const heading = el.querySelector<HTMLElement>('.ink-status-board__heading')!;
    expect(heading.textContent).toBe('Status board');
    expect(heading.hasAttribute('hidden')).toBe(false);
    const grid = el.querySelector<HTMLElement>('.ink-status-board__grid')!;
    expect(grid.getAttribute('role')).toBe('list');
    expect(grid.hasAttribute('hidden')).toBe(true);
    const empty = el.querySelector<HTMLElement>('.ink-status-board__empty')!;
    expect(empty.hasAttribute('hidden')).toBe(false);
    expect(empty.textContent).toBe('No metrics');
    expect(grid.style.getPropertyValue('--ink-status-columns')).toBe('3');
  });

  it('renders one keyed cell per item with its status cue', () => {
    const el = mount(
      `<e-status-board data='[{"key":"queue","label":"Queue","value":12,"status":"warning","detail":"3 stalled"}]'></e-status-board>`,
    );
    const [cell] = cells(el);
    expect(cell!.dataset['key']).toBe('queue');
    expect(cell!.getAttribute('role')).toBe('listitem');
    expect(cell!.getAttribute('data-status')).toBe('warning');
    expect(cell!.querySelector('.ink-status-board__label')!.textContent).toBe('Queue');
    expect(cell!.querySelector('.ink-status-board__value')!.textContent).toBe('12');
    expect(cell!.querySelector('.ink-status-board__cue')!.textContent).toBe('! Warning');
    const detail = cell!.querySelector<HTMLElement>('.ink-status-board__detail')!;
    expect(detail.textContent).toBe('3 stalled');
    expect(detail.hasAttribute('hidden')).toBe(false);
    expect(cell!.getAttribute('aria-label')).toBe('Queue: 12; Warning; 3 stalled');
    expect(el.querySelector<HTMLElement>('.ink-status-board__grid')!.hasAttribute('hidden')).toBe(
      false,
    );
    expect(el.querySelector<HTMLElement>('.ink-status-board__empty')!.hasAttribute('hidden')).toBe(
      true,
    );
  });

  it('maps every status to its symbol and label, defaulting to neutral', () => {
    const data = JSON.stringify([
      { key: 'a', label: 'A', value: 1, status: 'ok' },
      { key: 'b', label: 'B', value: 2, status: 'warning' },
      { key: 'c', label: 'C', value: 3, status: 'critical' },
      { key: 'd', label: 'D', value: 4, status: 'offline' },
      { key: 'e', label: 'E', value: 5, status: 'nonsense' },
      { key: 'f', label: 'F', value: 6 },
    ]);
    const el = mount(`<e-status-board></e-status-board>`);
    el.setAttribute('data', data);
    expect(cells(el).map((c) => c.getAttribute('data-status'))).toEqual([
      'ok',
      'warning',
      'critical',
      'offline',
      'neutral',
      'neutral',
    ]);
    expect(cells(el).map((c) => c.querySelector('.ink-status-board__cue')!.textContent)).toEqual([
      '✓ OK',
      '! Warning',
      '× Critical',
      '○ Offline',
      '— Neutral',
      '— Neutral',
    ]);
  });

  it('hides the detail line when the item has none', () => {
    const el = mount(
      `<e-status-board data='[{"key":"a","label":"A","value":1}]'></e-status-board>`,
    );
    const detail = el.querySelector<HTMLElement>('.ink-status-board__detail')!;
    expect(detail.hasAttribute('hidden')).toBe(true);
    expect(detail.textContent).toBe('');
    expect(el.querySelector('.ink-status-board__cell')!.getAttribute('aria-label')).toBe(
      'A: 1; Neutral',
    );
  });

  it('skips malformed entries and synthesises missing keys and labels', () => {
    const data = JSON.stringify([
      null,
      5,
      'x',
      [],
      { label: 'no value' },
      { label: 'object value', value: {} },
      { label: 3, value: 1 },
      { key: '', label: 'K', value: 2 },
    ]);
    const el = mount(`<e-status-board></e-status-board>`);
    el.setAttribute('data', data);
    const rendered = cells(el);
    expect(rendered.length).toBe(2);
    expect(rendered.map((c) => c.dataset['key'])).toEqual(['6', '7']);
    expect(rendered[0]!.querySelector('.ink-status-board__label')!.textContent).toBe('');
    expect(rendered[1]!.querySelector('.ink-status-board__label')!.textContent).toBe('K');
  });

  it('de-duplicates repeated keys by suffixing the index', () => {
    const el = mount(`<e-status-board></e-status-board>`);
    el.setAttribute(
      'data',
      JSON.stringify([
        { key: 'a', label: 'First', value: 1 },
        { key: 'a', label: 'Second', value: 2 },
      ]),
    );
    expect(cells(el).map((c) => c.dataset['key'])).toEqual(['a', 'a-1']);
    expect(cells(el).map((c) => c.querySelector('.ink-status-board__value')!.textContent)).toEqual([
      '1',
      '2',
    ]);
  });

  it('caps the board at 100 items', () => {
    const el = mount(`<e-status-board></e-status-board>`);
    el.setAttribute(
      'data',
      JSON.stringify(
        Array.from({ length: 120 }, (_, i) => ({ key: `k${i}`, label: `L${i}`, value: i })),
      ),
    );
    expect(cells(el).length).toBe(100);
  });

  it('falls back to the empty state for invalid JSON and non-array payloads', () => {
    const el = mount(
      `<e-status-board data='[{"key":"a","label":"A","value":1}]'></e-status-board>`,
    );
    expect(cells(el).length).toBe(1);

    el.setAttribute('data', '{not json');
    expect(cells(el).length).toBe(0);
    expect(el.querySelector<HTMLElement>('.ink-status-board__grid')!.hasAttribute('hidden')).toBe(
      true,
    );

    el.setAttribute('data', '{"a":1}');
    expect(cells(el).length).toBe(0);

    el.setAttribute('data', '');
    expect(cells(el).length).toBe(0);
    expect(el.querySelector<HTMLElement>('.ink-status-board__empty')!.hasAttribute('hidden')).toBe(
      false,
    );
  });

  it('keeps cell identity for value-only updates and drops cells that disappear', () => {
    const el = mount(`<e-status-board></e-status-board>`);
    el.setAttribute(
      'data',
      JSON.stringify([
        { key: 'a', label: 'A', value: 1, status: 'ok' },
        { key: 'b', label: 'B', value: 2, status: 'ok' },
      ]),
    );
    const [cellA, cellB] = cells(el);

    el.setAttribute(
      'data',
      JSON.stringify([
        { key: 'a', label: 'A', value: 9, status: 'critical', detail: 'now failing' },
        { key: 'b', label: 'B', value: 2, status: 'ok' },
      ]),
    );
    expect(cells(el)[0]).toBe(cellA);
    expect(cells(el)[1]).toBe(cellB);
    expect(cellA!.querySelector('.ink-status-board__value')!.textContent).toBe('9');
    expect(cellA!.getAttribute('data-status')).toBe('critical');
    expect(
      cellA!.querySelector<HTMLElement>('.ink-status-board__detail')!.hasAttribute('hidden'),
    ).toBe(false);

    el.setAttribute('data', JSON.stringify([{ key: 'a', label: 'A', value: 9 }]));
    expect(cells(el)).toEqual([cellA]);
    expect(cellB!.isConnected).toBe(false);
  });

  it('reorders existing cells in place', () => {
    const el = mount(`<e-status-board></e-status-board>`);
    el.setAttribute(
      'data',
      JSON.stringify([
        { key: 'a', label: 'A', value: 1 },
        { key: 'b', label: 'B', value: 2 },
        { key: 'c', label: 'C', value: 3 },
      ]),
    );
    const [cellA, cellB, cellC] = cells(el);

    el.setAttribute(
      'data',
      JSON.stringify([
        { key: 'c', label: 'C', value: 3 },
        { key: 'a', label: 'A', value: 1 },
        { key: 'b', label: 'B', value: 2 },
      ]),
    );
    expect(cells(el)).toEqual([cellC, cellA, cellB]);
    expect(cells(el).map((c) => c.dataset['key'])).toEqual(['c', 'a', 'b']);
  });

  it('patches the label, the heading visibility and the column count', () => {
    const el = mount(`<e-status-board label="Fleet" columns="4"></e-status-board>`);
    const heading = el.querySelector<HTMLElement>('.ink-status-board__heading')!;
    const grid = el.querySelector<HTMLElement>('.ink-status-board__grid')!;
    expect(heading.textContent).toBe('Fleet');
    expect(el.getAttribute('aria-label')).toBe('Fleet');
    expect(grid.style.getPropertyValue('--ink-status-columns')).toBe('4');

    el.setAttribute('label', 'Fleet II');
    expect(heading.textContent).toBe('Fleet II');
    expect(el.getAttribute('aria-label')).toBe('Fleet II');

    el.removeAttribute('label');
    expect(heading.textContent).toBe('Status board');
    expect(el.getAttribute('aria-label')).toBe('Status board');

    el.setAttribute('hide-label', '');
    expect(heading.hasAttribute('hidden')).toBe(true);
    expect(el.getAttribute('aria-label')).toBe('Status board');
    el.removeAttribute('hide-label');
    expect(heading.hasAttribute('hidden')).toBe(false);

    el.setAttribute('columns', '2');
    expect(grid.style.getPropertyValue('--ink-status-columns')).toBe('2');
    el.setAttribute('columns', '2'); // unchanged → no re-write
    expect(grid.style.getPropertyValue('--ink-status-columns')).toBe('2');
  });

  it('clamps columns to 1..6 and falls back for invalid input', () => {
    const cols = (html: string): string =>
      mount(html)
        .querySelector<HTMLElement>('.ink-status-board__grid')!
        .style.getPropertyValue('--ink-status-columns');
    expect(cols(`<e-status-board columns="0"></e-status-board>`)).toBe('1');
    expect(cols(`<e-status-board columns="-2"></e-status-board>`)).toBe('1');
    expect(cols(`<e-status-board columns="9"></e-status-board>`)).toBe('6');
    expect(cols(`<e-status-board columns="abc"></e-status-board>`)).toBe('3');
    expect(cols(`<e-status-board columns="2.5"></e-status-board>`)).toBe('3');
  });

  it('patches the empty-text message', () => {
    const el = mount(`<e-status-board empty-text="Nothing reported"></e-status-board>`);
    const empty = el.querySelector<HTMLElement>('.ink-status-board__empty')!;
    expect(empty.textContent).toBe('Nothing reported');
    el.setAttribute('empty-text', 'All quiet');
    expect(empty.textContent).toBe('All quiet');
    el.removeAttribute('empty-text');
    expect(empty.textContent).toBe('No metrics');
  });

  it('renders data-supplied markup as text', () => {
    const el = mount(`<e-status-board></e-status-board>`);
    el.setAttribute(
      'data',
      JSON.stringify([
        { key: 'a', label: '<img src=x onerror=boom>', value: '<b>1</b>', detail: '<i>d</i>' },
      ]),
    );
    const [cell] = cells(el);
    expect(cell!.querySelector('.ink-status-board__label')!.textContent).toBe(
      '<img src=x onerror=boom>',
    );
    expect(cell!.querySelector('img')).toBeNull();
    expect(cell!.querySelector('.ink-status-board__value')!.textContent).toBe('<b>1</b>');
    expect(cell!.querySelector('b')).toBeNull();
    expect(cell!.querySelector('i')).toBeNull();
  });

  it('ignores attribute changes before connection and does not rebuild on re-connection', () => {
    const el = document.createElement('e-status-board');
    el.setAttribute('label', 'Pre');
    expect(el.querySelector('.ink-status-board')).toBeNull();
    document.body.appendChild(el);
    const section = el.querySelector<HTMLElement>('.ink-status-board')!;
    expect(el.getAttribute('aria-label')).toBe('Pre');
    remount(el);
    expect(el.querySelectorAll('.ink-status-board').length).toBe(1);
    expect(el.querySelector('.ink-status-board')).toBe(section);
  });
});
