// Behavioural tests for the data/media group:
// e-calendar, e-agenda, e-table, e-segmented, e-qrcode, e-barcode,
// e-avatar (+ group), e-image, e-steps, e-pagination, e-sparkline,
// e-statistic, e-change-marker and e-last-updated.
//
// Every observed attribute is set before mount *and* mutated afterwards
// (add -> change -> remove), every interaction handler is driven, and every
// malformed-input branch is fed real garbage.
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(async () => {
  await import('../calendar/calendar');
  await import('../agenda/agenda');
  await import('../table/table');
  await import('../segmented/segmented');
  await import('../qrcode/qrcode');
  await import('../barcode/barcode');
  await import('../avatar/avatar');
  await import('../image/image');
  await import('../steps/steps');
  await import('../pagination/pagination');
  await import('../sparkline/sparkline');
  await import('../statistic/statistic');
  await import('../change-marker/change-marker');
  await import('../last-updated/last-updated');
});

/** Lets queued microtasks and browser-fired image events run. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const mount = <T extends HTMLElement = HTMLElement>(html: string): T => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild as T;
};

const key = (el: Element, k: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
};

/** Collects every `detail` of `type` dispatched from `el`. */
const collect = <T>(el: Element, type: string): T[] => {
  const out: T[] = [];
  el.addEventListener(type, (e) => out.push((e as CustomEvent<T>).detail));
  return out;
};

/* ========================================================================= *
 * e-calendar
 * ========================================================================= */

describe('e-calendar', () => {
  const cells = (el: HTMLElement): HTMLButtonElement[] => [
    ...el.querySelectorAll<HTMLButtonElement>('button.ink-calendar__cell'),
  ];
  const cellFor = (el: HTMLElement, day: number): HTMLButtonElement =>
    cells(el).find((c) => c.dataset['day'] === String(day))!;

  it('renders 42 cells, a header and the selected day for a valid value', () => {
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    expect(cells(el)).toHaveLength(42);
    expect(el.querySelector('.ink-calendar__title-eyebrow')!.textContent).toBe('CALENDAR · 2026');
    expect(el.querySelector('.ink-calendar__title')!.textContent).toBe('April');
    expect(el.querySelectorAll('.ink-calendar__dow')).toHaveLength(7);

    // April 2026 starts on a Wednesday → index 3 holds day 1.
    const all = cells(el);
    expect(all[2].disabled).toBe(true);
    expect(all[2].getAttribute('aria-label')).toBe('Outside current month');
    expect(all[3].dataset['day']).toBe('1');
    expect(all[3].disabled).toBe(false);

    const sel = cellFor(el, 15);
    expect(sel.getAttribute('aria-selected')).toBe('true');
    expect(sel.tabIndex).toBe(0);
    expect(all.filter((c) => c.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    expect(all.filter((c) => c.tabIndex === 0)).toHaveLength(1);
    // 30 days in April 2026 → cells 33..41 are outside the month.
    expect(all[33].disabled).toBe(true);
    expect(all[32].dataset['day']).toBe('30');
  });

  it('ignores a malformed value and falls back to the current month', () => {
    const el = mount(`<e-calendar value="not-a-date"></e-calendar>`);
    const all = cells(el);
    expect(all.filter((c) => c.getAttribute('aria-selected') === 'true')).toHaveLength(0);
    const todayCells = all.filter((c) => c.dataset['today'] === 'true');
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0].tabIndex).toBe(0);
  });

  it('uses lang for the month name, falling back to the document language', () => {
    const de = mount(`<e-calendar lang="de" value="2026-01-15"></e-calendar>`);
    const en = mount(`<e-calendar lang="en" value="2026-01-15"></e-calendar>`);
    expect(de.querySelector('.ink-calendar__title')!.textContent).toBe('Januar');
    expect(en.querySelector('.ink-calendar__title')!.textContent).toBe('January');
  });

  it('renders event chips, an overflow chip and skips events with a bad date', () => {
    const events = JSON.stringify([
      { date: '2026-04-10', title: 'Ship' },
      { date: '2026-04-11', title: 'One' },
      { date: '2026-04-11', title: 'Two' },
      { date: '2026-04-11', title: 'Three' },
      { date: '2026-04-11', title: 'Four' },
      { date: 'nonsense', title: 'Dropped' },
      { date: '2026-02-30', title: 'Impossible' },
    ]);
    const el = mount(`<e-calendar value="2026-04-15" events='${events}'></e-calendar>`);
    const ten = cellFor(el, 10).querySelector('.ink-calendar__events')!;
    expect([...ten.children].map((c) => c.textContent)).toEqual(['Ship']);
    const eleven = cellFor(el, 11).querySelector('.ink-calendar__events')!;
    expect([...eleven.children].map((c) => c.textContent)).toEqual(['One', 'Two', '+2']);
    expect(eleven.lastElementChild!.className).toBe('ink-calendar__more');
    expect(el.textContent).not.toContain('Dropped');
    expect(el.textContent).not.toContain('Impossible');
  });

  it('escapes event titles supplied through the attribute', () => {
    const events = JSON.stringify([{ date: '2026-04-10', title: '<img src=x onerror=1>' }]);
    const el = mount(`<e-calendar value="2026-04-15" events='${events}'></e-calendar>`);
    const chip = cellFor(el, 10).querySelector('.ink-calendar__event')!;
    expect(chip.querySelector('img')).toBeNull();
    expect(chip.textContent).toBe('<img src=x onerror=1>');
  });

  it.each([
    ['invalid JSON', '{'],
    ['a JSON scalar', '"nope"'],
    ['wrongly shaped entries', '[1,2,3]'],
    ['objects without title', '[{"date":"2026-04-10"}]'],
  ])('degrades to an empty event view for %s', (_label, raw) => {
    const el = mount(`<e-calendar value="2026-04-15" events='${raw}'></e-calendar>`);
    expect(el.querySelectorAll('.ink-calendar__event')).toHaveLength(0);
    expect(el.querySelectorAll('.ink-calendar__more')).toHaveLength(0);
    expect(cells(el)).toHaveLength(42);
  });

  it('patches event chips when the events attribute is added, changed and removed', () => {
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    expect(el.querySelectorAll('.ink-calendar__event')).toHaveLength(0);

    el.setAttribute('events', JSON.stringify([{ date: '2026-04-10', title: 'A' }]));
    const container = cellFor(el, 10).querySelector('.ink-calendar__events')!;
    expect([...container.children].map((c) => c.textContent)).toEqual(['A']);

    // Same chip count, different text → the container is rebuilt in place.
    el.setAttribute('events', JSON.stringify([{ date: '2026-04-10', title: 'B' }]));
    expect([...container.children].map((c) => c.textContent)).toEqual(['B']);

    // Same chip count again, but the overflow label changes.
    el.setAttribute(
      'events',
      JSON.stringify([
        { date: '2026-04-10', title: 'B' },
        { date: '2026-04-10', title: 'C' },
        { date: '2026-04-10', title: 'D' },
      ]),
    );
    expect([...container.children].map((c) => c.textContent)).toEqual(['B', 'C', '+1']);
    el.setAttribute(
      'events',
      JSON.stringify([
        { date: '2026-04-10', title: 'B' },
        { date: '2026-04-10', title: 'C' },
        { date: '2026-04-10', title: 'D' },
        { date: '2026-04-10', title: 'E' },
      ]),
    );
    expect([...container.children].map((c) => c.textContent)).toEqual(['B', 'C', '+2']);

    el.removeAttribute('events');
    expect(container.children).toHaveLength(0);
    expect(el.querySelectorAll('.ink-calendar__event')).toHaveLength(0);
  });

  it('moves the selection when the value attribute is added, changed and removed', () => {
    const el = mount(`<e-calendar value="2026-04-01"></e-calendar>`);
    expect(cellFor(el, 1).getAttribute('aria-selected')).toBe('true');

    el.removeAttribute('value');
    expect(cells(el).filter((c) => c.getAttribute('aria-selected') === 'true')).toHaveLength(0);

    el.setAttribute('value', '2026-04-15');
    expect(cellFor(el, 15).getAttribute('aria-selected')).toBe('true');
    expect(el.querySelector('.ink-calendar__title')!.textContent).toBe('April');

    el.setAttribute('value', '2026-04-16');
    expect(cellFor(el, 15).getAttribute('aria-selected')).toBe('false');
    expect(cellFor(el, 16).getAttribute('aria-selected')).toBe('true');
    expect(cellFor(el, 16).tabIndex).toBe(0);

    // Invalid replacement clears the selection but keeps the visible month.
    el.setAttribute('value', '2026-13-45');
    expect(cells(el).filter((c) => c.getAttribute('aria-selected') === 'true')).toHaveLength(0);
    expect(el.querySelector('.ink-calendar__title')!.textContent).toBe('April');
  });

  it('keeps the visible month when the value jumps to another month', () => {
    // The view only follows `value` at connect time; later changes just move
    // (or clear) the selection inside the month already on screen.
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    el.setAttribute('value', '2026-09-02');
    expect(el.querySelector('.ink-calendar__title')!.textContent).toBe('April');
    expect(cells(el).filter((c) => c.getAttribute('aria-selected') === 'true')).toHaveLength(0);
  });

  it('steps months with the header buttons and wraps across year boundaries', () => {
    const el = mount(`<e-calendar value="2026-01-15"></e-calendar>`);
    const prev = el.querySelector<HTMLButtonElement>('[data-step="-1"]')!;
    const next = el.querySelector<HTMLButtonElement>('[data-step="1"]')!;
    const title = el.querySelector('.ink-calendar__title')!;
    const eyebrow = el.querySelector('.ink-calendar__title-eyebrow')!;
    expect(prev.getAttribute('aria-label')).toBe('Previous month');
    expect(next.getAttribute('aria-label')).toBe('Next month');

    prev.click();
    expect(title.textContent).toBe('December');
    expect(eyebrow.textContent).toBe('CALENDAR · 2025');

    next.click();
    expect(title.textContent).toBe('January');
    expect(eyebrow.textContent).toBe('CALENDAR · 2026');

    for (let i = 0; i < 11; i++) next.click();
    expect(title.textContent).toBe('December');
    next.click();
    expect(title.textContent).toBe('January');
    expect(eyebrow.textContent).toBe('CALENDAR · 2027');
  });

  it('emits e-change with the clicked day and reflects it on the value attribute', () => {
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    const details = collect<{ value: string }>(el, 'e-change');
    cellFor(el, 7).click();
    expect(details).toEqual([{ value: '2026-04-07' }]);
    expect(el.getAttribute('value')).toBe('2026-04-07');
    expect(cellFor(el, 7).getAttribute('aria-selected')).toBe('true');
  });

  it('ignores clicks on out-of-month cells and on the grid chrome', () => {
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    const details = collect<{ value: string }>(el, 'e-change');
    const outside = cells(el)[0];
    expect(outside.disabled).toBe(true);
    outside.click();
    el.querySelector<HTMLElement>('.ink-calendar__dow')!.click();
    expect(details).toEqual([]);
    expect(el.getAttribute('value')).toBe('2026-04-15');
  });

  it('navigates the grid with the arrow keys and moves focus', () => {
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    key(cellFor(el, 15), 'ArrowRight');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('16');
    key(cellFor(el, 16), 'ArrowDown');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('23');
    key(cellFor(el, 23), 'ArrowUp');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('16');
    key(cellFor(el, 16), 'ArrowLeft');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('15');
    const focused = document.activeElement as HTMLButtonElement;
    expect(focused.tabIndex).toBe(0);
    expect(cells(el).filter((c) => c.tabIndex === 0)).toHaveLength(1);
  });

  it('crosses the month boundary with the arrow keys', () => {
    const el = mount(`<e-calendar value="2026-04-01"></e-calendar>`);
    key(cellFor(el, 1), 'ArrowLeft');
    expect(el.querySelector('.ink-calendar__title')!.textContent).toBe('March');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('31');

    const el2 = mount(`<e-calendar value="2026-04-30"></e-calendar>`);
    key(cellFor(el2, 30), 'ArrowRight');
    expect(el2.querySelector('.ink-calendar__title')!.textContent).toBe('May');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('1');
  });

  it('jumps to the start and end of the week with Home and End', () => {
    // 15 April 2026 is a Wednesday → Sunday is the 12th, Saturday the 18th.
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    key(cellFor(el, 15), 'Home');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('12');
    key(cellFor(el, 12), 'End');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('18');
  });

  it('selects the focused day with Enter and Space and ignores other keys', () => {
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    const details = collect<{ value: string }>(el, 'e-change');

    key(cellFor(el, 20), 'Enter');
    expect(details).toEqual([{ value: '2026-04-20' }]);
    key(cellFor(el, 21), ' ');
    expect(details).toEqual([{ value: '2026-04-20' }, { value: '2026-04-21' }]);

    key(cellFor(el, 22), 'a');
    key(cellFor(el, 22), 'Escape');
    el.querySelector<HTMLElement>('.ink-calendar__dow')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(details).toHaveLength(2);
    expect(el.getAttribute('value')).toBe('2026-04-21');
  });

  it('ignores keyboard events on disabled cells', () => {
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    const before = el.querySelector('.ink-calendar__title')!.textContent;
    key(cells(el)[0], 'ArrowRight');
    expect(el.querySelector('.ink-calendar__title')!.textContent).toBe(before);
  });

  it('keeps working after a disconnect/reconnect cycle without rebuilding', () => {
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    const grid = el.querySelector('.ink-calendar__grid')!;
    const parent = el.parentElement!;
    el.remove();
    // Listeners are gone while detached.
    const detachedDetails = collect<{ value: string }>(el, 'e-change');
    cellFor(el, 9).click();
    expect(detachedDetails).toEqual([]);

    parent.appendChild(el);
    expect(el.querySelector('.ink-calendar__grid')).toBe(grid);
    cellFor(el, 9).click();
    expect(detachedDetails).toEqual([{ value: '2026-04-09' }]);
  });
});

/* ========================================================================= *
 * e-table
 * ========================================================================= */

describe('e-table', () => {
  const COLS = JSON.stringify([
    { key: 'name', title: 'Name', sortable: true },
    { key: 'role', title: 'Role', align: 'right', width: '120px' },
    { key: 'age', title: 'Age', align: 'center' },
  ]);
  const ROWS = JSON.stringify([
    { name: 'Anna', role: 'Editor', age: 31 },
    { name: 'Ben', role: 'Admin', age: 44 },
  ]);

  it('renders header cells with alignment, width and a sort button', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}'></e-table>`);
    const ths = [...el.querySelectorAll('th')];
    expect(ths.map((t) => t.dataset['key'])).toEqual(['name', 'role', 'age']);
    expect(ths.map((t) => t.style.textAlign)).toEqual(['left', 'right', 'center']);
    expect(ths[1].style.width).toBe('120px');
    expect(ths[0].getAttribute('aria-sort')).toBe('none');
    expect(ths[1].querySelector('button')).toBeNull();
    expect(ths[1].textContent).toBe('Role');
    const icon = ths[0].querySelector<HTMLElement>('.ink-table__sort-icon')!;
    expect(icon.style.opacity).toBe('0.5');
    expect(icon.querySelector('path')!.getAttribute('d')).toBe('M12 19V5M6 11l6-6 6 6');
  });

  it('drops malformed column entries and falls back to the key as title', () => {
    const cols = JSON.stringify([
      1,
      'x',
      null,
      ['a'],
      { title: 'no key' },
      { key: '' },
      { key: 'a' },
      { key: 'b', title: 'B', align: 'nonsense', width: 12 },
    ]);
    const el = mount(`<e-table columns='${cols}' data='[]'></e-table>`);
    const ths = [...el.querySelectorAll('th')];
    expect(ths).toHaveLength(2);
    expect(ths.map((t) => t.textContent)).toEqual(['a', 'B']);
    expect(ths[1].style.textAlign).toBe('left');
    expect(ths[1].style.width).toBe('');
  });

  it.each([
    ['invalid JSON', 'not json'],
    ['a JSON object', '{"a":1}'],
    ['a JSON scalar', '7'],
  ])('degrades to an empty table for %s', (_label, raw) => {
    const el = mount(`<e-table columns='${raw}' data='${raw}'></e-table>`);
    expect(el.querySelectorAll('th')).toHaveLength(0);
    const empty = el.querySelector<HTMLTableCellElement>('.ink-table__empty')!;
    expect(empty.textContent).toBe('No data');
    // colSpan is set to 0 (no columns) and the IDL attribute clamps it to 1.
    expect(empty.colSpan).toBe(1);
  });

  it('filters non-object rows and renders null cells as empty text', () => {
    const rows = JSON.stringify([1, 'x', null, { name: 'Anna' }, { name: null, role: 'Admin' }]);
    const el = mount(`<e-table columns='${COLS}' data='${rows}'></e-table>`);
    const bodyRows = [...el.querySelectorAll('tbody tr')];
    expect(bodyRows).toHaveLength(2);
    expect([...bodyRows[0].querySelectorAll('td')].map((td) => td.textContent)).toEqual([
      'Anna',
      '',
      '',
    ]);
    expect([...bodyRows[1].querySelectorAll('td')].map((td) => td.textContent)).toEqual([
      '',
      'Admin',
      '',
    ]);
  });

  it('uses empty-text and reacts when it changes', () => {
    const el = mount(`<e-table columns='${COLS}' data='[]' empty-text="Nothing here"></e-table>`);
    const empty = el.querySelector<HTMLTableCellElement>('.ink-table__empty')!;
    expect(empty.textContent).toBe('Nothing here');
    expect(empty.colSpan).toBe(3);
    el.setAttribute('empty-text', 'Still nothing');
    expect(el.querySelector('.ink-table__empty')!.textContent).toBe('Still nothing');
    el.removeAttribute('empty-text');
    expect(el.querySelector('.ink-table__empty')!.textContent).toBe('No data');
  });

  it('escapes column titles and cell values supplied through attributes', () => {
    const cols = JSON.stringify([{ key: 'a', title: '<b>bold</b>' }]);
    const rows = JSON.stringify([{ a: '<img src=x onerror=alert(1)>' }]);
    const el = mount(`<e-table columns='${cols}' data='${rows}'></e-table>`);
    const th = el.querySelector('th')!;
    expect(th.querySelector('b')).toBeNull();
    expect(th.textContent).toBe('<b>bold</b>');
    const td = el.querySelector('tbody td')!;
    expect(td.querySelector('img')).toBeNull();
    expect(td.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('cycles the sort direction none → asc → desc → none without reordering rows', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}'></e-table>`);
    const details = collect<{ key: string; direction: string }>(el, 'e-sort');
    const btn = el.querySelector<HTMLButtonElement>('[data-sort-key="name"]')!;
    const th = btn.closest('th')!;
    const icon = th.querySelector<HTMLElement>('.ink-table__sort-icon')!;
    const names = (): string[] =>
      [...el.querySelectorAll('tbody tr')].map((r) => r.querySelector('td')!.textContent!);

    expect(names()).toEqual(['Anna', 'Ben']);

    btn.click();
    expect(el.getAttribute('sort')).toBe('name:asc');
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    expect(icon.querySelector('path')!.getAttribute('d')).toBe('M6 15l6-6 6 6');
    expect(icon.style.opacity).toBe('');

    btn.click();
    expect(el.getAttribute('sort')).toBe('name:desc');
    expect(th.getAttribute('aria-sort')).toBe('descending');
    expect(icon.querySelector('path')!.getAttribute('d')).toBe('M6 9l6 6 6-6');

    btn.click();
    expect(el.hasAttribute('sort')).toBe(false);
    expect(th.getAttribute('aria-sort')).toBe('none');
    expect(icon.style.opacity).toBe('0.5');

    expect(details).toEqual([
      { key: 'name', direction: 'asc' },
      { key: 'name', direction: 'desc' },
      { key: 'name', direction: 'none' },
    ]);
    // Sort is advisory: the component never re-orders the rows itself.
    expect(names()).toEqual(['Anna', 'Ben']);
  });

  it('restarts at asc when a different column is sorted', () => {
    const cols = JSON.stringify([
      { key: 'name', title: 'Name', sortable: true },
      { key: 'role', title: 'Role', sortable: true },
    ]);
    const el = mount(`<e-table columns='${cols}' data='${ROWS}' sort="name:desc"></e-table>`);
    expect(
      el.querySelector('[data-sort-key="name"]')!.closest('th')!.getAttribute('aria-sort'),
    ).toBe('descending');
    const details = collect<{ key: string; direction: string }>(el, 'e-sort');
    el.querySelector<HTMLButtonElement>('[data-sort-key="role"]')!.click();
    expect(details).toEqual([{ key: 'role', direction: 'asc' }]);
    expect(el.getAttribute('sort')).toBe('role:asc');
    expect(
      el.querySelector('[data-sort-key="name"]')!.closest('th')!.getAttribute('aria-sort'),
    ).toBe('none');
    expect(
      el.querySelector('[data-sort-key="role"]')!.closest('th')!.getAttribute('aria-sort'),
    ).toBe('ascending');
  });

  it.each([
    ['no separator', 'name'],
    ['an unknown direction', 'name:sideways'],
    ['an empty string', ''],
  ])('treats a sort value with %s as unsorted', (_label, raw) => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}' sort="${raw}"></e-table>`);
    const th = el.querySelector('[data-sort-key="name"]')!.closest('th')!;
    expect(th.getAttribute('aria-sort')).toBe('none');
    el.setAttribute('sort', 'name:asc');
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    el.setAttribute('sort', raw === '' ? 'x' : '');
    expect(th.getAttribute('aria-sort')).toBe('none');
  });

  it('ignores clicks that are not on a sort button', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}'></e-table>`);
    const details = collect<{ key: string }>(el, 'e-sort');
    el.querySelector<HTMLElement>('tbody td')!.click();
    el.querySelectorAll('th')[1].click();
    expect(details).toEqual([]);
    expect(el.hasAttribute('sort')).toBe(false);
  });

  it('selects every row from the header checkbox and clears it again', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}' selectable></e-table>`);
    const details = collect<{ value: number[] }>(el, 'e-select');
    const headerCb = el.querySelector<HTMLInputElement>('thead .ink-table__cb')!;
    expect(headerCb.getAttribute('aria-label')).toBe('Select all rows');
    const rowCbs = [...el.querySelectorAll<HTMLInputElement>('tbody .ink-table__cb')];
    expect(rowCbs.map((cb) => cb.getAttribute('aria-label'))).toEqual([
      'Select row 1',
      'Select row 2',
    ]);

    headerCb.checked = true;
    headerCb.dispatchEvent(new Event('change', { bubbles: true }));
    expect(details).toEqual([{ value: [0, 1] }]);
    expect(el.getAttribute('selected')).toBe('0,1');
    expect(rowCbs.every((cb) => cb.checked)).toBe(true);
    expect([...el.querySelectorAll('tbody tr')].every((r) => r.hasAttribute('data-selected'))).toBe(
      true,
    );
    expect(headerCb.indeterminate).toBe(false);

    headerCb.checked = false;
    headerCb.dispatchEvent(new Event('change', { bubbles: true }));
    expect(details[1]).toEqual({ value: [] });
    expect(el.hasAttribute('selected')).toBe(false);
    expect(rowCbs.some((cb) => cb.checked)).toBe(false);
  });

  it('toggles a single row and marks the header checkbox indeterminate', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}' selectable></e-table>`);
    const details = collect<{ value: number[] }>(el, 'e-select');
    const headerCb = el.querySelector<HTMLInputElement>('thead .ink-table__cb')!;
    const rowCbs = [...el.querySelectorAll<HTMLInputElement>('tbody .ink-table__cb')];

    rowCbs[1].checked = true;
    rowCbs[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(details).toEqual([{ value: [1] }]);
    expect(el.getAttribute('selected')).toBe('1');
    expect(headerCb.indeterminate).toBe(true);
    expect(headerCb.checked).toBe(false);
    expect(el.querySelectorAll('tbody tr')[1].hasAttribute('data-selected')).toBe(true);
    expect(el.querySelectorAll('tbody tr')[0].hasAttribute('data-selected')).toBe(false);

    rowCbs[0].checked = true;
    rowCbs[0].dispatchEvent(new Event('change', { bubbles: true }));
    expect(details[1]).toEqual({ value: [0, 1] });
    expect(headerCb.indeterminate).toBe(false);
    expect(headerCb.checked).toBe(true);

    rowCbs[1].checked = false;
    rowCbs[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(details[2]).toEqual({ value: [0] });
    expect(el.getAttribute('selected')).toBe('0');
  });

  it('ignores change events from non-checkbox targets', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}' selectable></e-table>`);
    const details = collect<{ value: number[] }>(el, 'e-select');
    const text = document.createElement('input');
    text.type = 'text';
    el.appendChild(text);
    text.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    expect(details).toEqual([]);
    expect(el.hasAttribute('selected')).toBe(false);
  });

  it('reads the selected attribute and rejects out-of-range or non-integer indices', () => {
    const el = mount(
      `<e-table columns='${COLS}' data='${ROWS}' selectable selected=" 1 , , abc, -1, 99, 1.5, 0"></e-table>`,
    );
    const rowCbs = [...el.querySelectorAll<HTMLInputElement>('tbody .ink-table__cb')];
    expect(rowCbs.map((cb) => cb.checked)).toEqual([true, true]);

    el.setAttribute('selected', '1');
    expect(rowCbs.map((cb) => cb.checked)).toEqual([false, true]);
    expect(el.querySelectorAll('tbody tr')[0].hasAttribute('data-selected')).toBe(false);

    el.removeAttribute('selected');
    expect(rowCbs.map((cb) => cb.checked)).toEqual([false, false]);
    expect(el.querySelector<HTMLInputElement>('thead .ink-table__cb')!.indeterminate).toBe(false);
  });

  it('drops selection indices that no longer exist after the data shrinks', () => {
    const el = mount(
      `<e-table columns='${COLS}' data='${ROWS}' selectable selected="0,1"></e-table>`,
    );
    expect(el.querySelectorAll('tbody tr[data-selected]')).toHaveLength(2);
    el.setAttribute('data', JSON.stringify([{ name: 'Anna' }]));
    expect(el.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(el.querySelector<HTMLInputElement>('tbody .ink-table__cb')!.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>('thead .ink-table__cb')!.checked).toBe(true);
  });

  it('rebuilds when columns, data or selectable change after mount', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}'></e-table>`);
    expect(el.querySelectorAll('thead th')).toHaveLength(3);
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);

    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: 'Name' }]));
    expect(el.querySelectorAll('thead th')).toHaveLength(1);

    el.setAttribute('selectable', '');
    expect(el.querySelectorAll('thead th')).toHaveLength(2);
    expect(el.querySelector('thead .ink-table__check')).not.toBeNull();

    el.removeAttribute('selectable');
    expect(el.querySelectorAll('thead th')).toHaveLength(1);
    expect(el.querySelector('thead .ink-table__check')).toBeNull();

    el.setAttribute('data', '[]');
    expect(el.querySelector('.ink-table__empty')!.textContent).toBe('No data');
  });

  it('drops its listeners on disconnect and restores them on reconnect', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}'></e-table>`);
    const parent = el.parentElement!;
    const details = collect<{ key: string }>(el, 'e-sort');
    el.remove();
    el.querySelector<HTMLButtonElement>('[data-sort-key="name"]')!.click();
    expect(details).toEqual([]);
    parent.appendChild(el);
    el.querySelector<HTMLButtonElement>('[data-sort-key="name"]')!.click();
    expect(details).toEqual([{ key: 'name', direction: 'asc' }]);
  });
});

/* ========================================================================= *
 * e-segmented
 * ========================================================================= */

describe('e-segmented', () => {
  const THREE = `<e-segmented value="b">
      <e-segment value="a" label="Alpha"></e-segment>
      <e-segment value="b" label="Beta"></e-segment>
      <e-segment value="c" label="Gamma"></e-segment>
    </e-segmented>`;
  const btns = (el: HTMLElement): HTMLButtonElement[] => [
    ...el.querySelectorAll<HTMLButtonElement>('.ink-segmented__btn'),
  ];

  it('builds one radio button per segment and marks the selected one', () => {
    const el = mount(THREE);
    const container = el.querySelector('.ink-segmented')!;
    expect(container.getAttribute('role')).toBe('radiogroup');
    const all = btns(el);
    expect(all.map((b) => b.textContent)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(all.map((b) => b.getAttribute('role'))).toEqual(['radio', 'radio', 'radio']);
    expect(all.map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(all.map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    expect(all.map((b) => b.dataset['value'])).toEqual(['a', 'b', 'c']);
  });

  it('falls back to text content for the label and to an empty value', () => {
    const el = mount(`<e-segmented>
        <e-segment value="a">From text</e-segment>
        <e-segment label="No value"></e-segment>
        <e-segment></e-segment>
      </e-segmented>`);
    const all = btns(el);
    expect(all.map((b) => b.textContent)).toEqual(['From text', 'No value', '']);
    expect(all.map((b) => b.dataset['value'])).toEqual(['a', '', '']);
    expect(all.map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'false', 'false']);
  });

  it('escapes labels supplied through the attribute', () => {
    const el = mount(`<e-segmented>
        <e-segment value="a" label="<img src=x onerror=1>"></e-segment>
      </e-segmented>`);
    const btn = btns(el)[0];
    expect(btn.querySelector('img')).toBeNull();
    expect(btn.textContent).toBe('<img src=x onerror=1>');
  });

  it('emits e-change on click and reflects the value attribute', () => {
    const el = mount(THREE);
    const details = collect<{ value: string }>(el, 'e-change');
    btns(el)[2].click();
    expect(details).toEqual([{ value: 'c' }]);
    expect(el.getAttribute('value')).toBe('c');
    expect(btns(el).map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
    expect(btns(el).map((b) => b.tabIndex)).toEqual([-1, -1, 0]);
  });

  it('does not re-emit when the already selected segment is clicked', () => {
    const el = mount(THREE);
    const details = collect<{ value: string }>(el, 'e-change');
    btns(el)[1].click();
    expect(details).toEqual([]);
    expect(el.getAttribute('value')).toBe('b');
  });

  it('ignores clicks outside the segment buttons', () => {
    const el = mount(THREE);
    const details = collect<{ value: string }>(el, 'e-change');
    el.querySelector<HTMLElement>('.ink-segmented')!.click();
    expect(details).toEqual([]);
  });

  it.each([
    ['ArrowRight', 'c'],
    ['ArrowDown', 'c'],
    ['ArrowLeft', 'a'],
    ['ArrowUp', 'a'],
    ['Home', 'a'],
    ['End', 'c'],
  ])('%s moves the selection to %s', (k, expected) => {
    const el = mount(THREE);
    const details = collect<{ value: string }>(el, 'e-change');
    key(btns(el)[1], k);
    expect(details).toEqual([{ value: expected }]);
    expect(el.getAttribute('value')).toBe(expected);
    expect(document.activeElement).toBe(btns(el).find((b) => b.dataset['value'] === expected));
  });

  it('wraps around at both ends of the row', () => {
    const el = mount(THREE);
    el.setAttribute('value', 'c');
    key(btns(el)[2], 'ArrowRight');
    expect(el.getAttribute('value')).toBe('a');
    key(btns(el)[0], 'ArrowLeft');
    expect(el.getAttribute('value')).toBe('c');
  });

  it('ignores unhandled keys and keydowns outside a button', () => {
    const el = mount(THREE);
    const details = collect<{ value: string }>(el, 'e-change');
    key(btns(el)[1], 'a');
    key(btns(el)[1], 'Tab');
    key(el.querySelector('.ink-segmented')!, 'ArrowRight');
    expect(details).toEqual([]);
    expect(el.getAttribute('value')).toBe('b');
  });

  it('keeps a single segment selected when the arrow keys wrap onto itself', () => {
    const el = mount(`<e-segmented value="only">
        <e-segment value="only" label="Only"></e-segment>
      </e-segmented>`);
    const details = collect<{ value: string }>(el, 'e-change');
    key(btns(el)[0], 'ArrowRight');
    expect(details).toEqual([]);
    expect(document.activeElement).toBe(btns(el)[0]);
  });

  it('syncs the selection when the value attribute is added, changed and removed', () => {
    const el = mount(`<e-segmented>
        <e-segment value="a" label="Alpha"></e-segment>
        <e-segment value="b" label="Beta"></e-segment>
      </e-segmented>`);
    expect(btns(el).map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'false']);

    el.setAttribute('value', 'a');
    expect(btns(el).map((b) => b.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    expect(btns(el).map((b) => b.tabIndex)).toEqual([0, -1]);

    el.setAttribute('value', 'b');
    expect(btns(el).map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'true']);

    el.setAttribute('value', 'nope');
    expect(btns(el).map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'false']);
    expect(btns(el).map((b) => b.tabIndex)).toEqual([-1, -1]);

    el.removeAttribute('value');
    expect(btns(el).map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'false']);
  });

  it('drops its listeners on disconnect and restores them on reconnect', () => {
    const el = mount(THREE);
    const parent = el.parentElement!;
    const details = collect<{ value: string }>(el, 'e-change');
    el.remove();
    btns(el)[0].click();
    expect(details).toEqual([]);
    parent.appendChild(el);
    btns(el)[0].click();
    expect(details).toEqual([{ value: 'a' }]);
  });
});

/* ========================================================================= *
 * e-steps
 * ========================================================================= */

describe('e-steps', () => {
  const THREE = (attrs: string): string => `<e-steps ${attrs}>
      <e-step title="Plan" description="Outline scope"></e-step>
      <e-step title="Build"></e-step>
      <e-step title="Ship"></e-step>
    </e-steps>`;
  const items = (el: HTMLElement): HTMLElement[] => [
    ...el.querySelectorAll<HTMLElement>('.ink-steps__item'),
  ];

  it('renders a horizontal list with bubbles, titles and descriptions', () => {
    const el = mount(THREE('current="1"'));
    const ol = el.querySelector('ol')!;
    expect(ol.className).toBe('ink-steps ink-steps--horizontal');
    expect(ol.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    const li = items(el);
    expect(li.map((x) => x.dataset['done'])).toEqual(['true', 'false', 'false']);
    expect(li.map((x) => x.dataset['active'])).toEqual(['false', 'true', 'false']);
    expect(
      li[0].querySelector('.ink-steps__bubble')!.querySelector('path')!.getAttribute('d'),
    ).toBe('M4 12.5l5 5L20 6');
    expect(li[1].querySelector('.ink-steps__bubble')!.textContent).toBe('2');
    expect(el.querySelectorAll('.ink-steps__status')).toHaveLength(0);
    expect([...el.querySelectorAll('.ink-steps__title')].map((t) => t.textContent)).toEqual([
      'Plan',
      'Build',
      'Ship',
    ]);
    const descs = [...el.querySelectorAll('.ink-steps__desc')];
    expect(descs).toHaveLength(1);
    expect(descs[0].textContent).toBe('Outline scope');
  });

  it('renders a vertical list with status labels and no grid template', () => {
    const el = mount(THREE('current="1" orientation="vertical"'));
    const ol = el.querySelector('ol')!;
    expect(ol.className).toBe('ink-steps');
    expect(ol.style.gridTemplateColumns).toBe('');
    expect([...el.querySelectorAll('.ink-steps__status')].map((s) => s.textContent)).toEqual([
      'DONE',
      'IN PROGRESS',
      'PENDING',
    ]);
    const title = el.querySelector<HTMLElement>('.ink-steps__title')!;
    expect(title.style.fontSize).toBe('var(--ink-text-body)');
    expect(title.style.marginTop).toBe('2px');
    const desc = el.querySelector<HTMLElement>('.ink-steps__desc')!;
    expect(desc.style.fontSize).toBe('var(--ink-text-small)');
    expect(desc.style.marginTop).toBe('4px');
  });

  it('patches data attributes and bubbles when current changes', () => {
    const el = mount(THREE(''));
    const li = items(el);
    const bubbles = li.map((x) => x.querySelector('.ink-steps__bubble')!);
    expect(li.map((x) => x.dataset['active'])).toEqual(['true', 'false', 'false']);
    expect(bubbles.map((b) => b.textContent)).toEqual(['1', '2', '3']);

    el.setAttribute('current', '2');
    expect(items(el)).toEqual(li); // patched in place, never rebuilt
    expect(li.map((x) => x.dataset['done'])).toEqual(['true', 'true', 'false']);
    expect(li.map((x) => x.dataset['active'])).toEqual(['false', 'false', 'true']);
    expect(bubbles[0].querySelector('path')).not.toBeNull();
    expect(bubbles[2].textContent).toBe('3');

    el.setAttribute('current', '0');
    expect(li.map((x) => x.dataset['done'])).toEqual(['false', 'false', 'false']);
    expect(bubbles.map((b) => b.textContent)).toEqual(['1', '2', '3']);

    el.removeAttribute('current');
    expect(li.map((x) => x.dataset['active'])).toEqual(['true', 'false', 'false']);
  });

  it('patches the vertical status labels when current changes', () => {
    const el = mount(THREE('orientation="vertical"'));
    const statuses = [...el.querySelectorAll('.ink-steps__status')];
    expect(statuses.map((s) => s.textContent)).toEqual(['IN PROGRESS', 'PENDING', 'PENDING']);
    el.setAttribute('current', '2');
    expect(statuses.map((s) => s.textContent)).toEqual(['DONE', 'DONE', 'IN PROGRESS']);
  });

  it.each([
    ['a non-numeric value', 'abc'],
    ['an empty value', ''],
  ])('falls back to step 0 for current with %s', (_label, raw) => {
    const el = mount(THREE(`current="${raw}"`));
    expect(items(el).map((x) => x.dataset['active'])).toEqual(['true', 'false', 'false']);
  });

  it('marks every step done for an out-of-range current', () => {
    const el = mount(THREE('current="99"'));
    expect(items(el).map((x) => x.dataset['done'])).toEqual(['true', 'true', 'true']);
    expect(items(el).map((x) => x.dataset['active'])).toEqual(['false', 'false', 'false']);
  });

  it('leaves nothing done or active for a negative current', () => {
    const el = mount(THREE('current="-1"'));
    expect(items(el).map((x) => x.dataset['done'])).toEqual(['false', 'false', 'false']);
    expect(items(el).map((x) => x.dataset['active'])).toEqual(['false', 'false', 'false']);
  });

  it('accepts a fractional current: earlier steps are done, none is active', () => {
    const el = mount(THREE('current="1.5"'));
    expect(items(el).map((x) => x.dataset['done'])).toEqual(['true', 'true', 'false']);
    expect(items(el).map((x) => x.dataset['active'])).toEqual(['false', 'false', 'false']);
    el.setAttribute('current', '2.5');
    expect(items(el).map((x) => x.dataset['done'])).toEqual(['true', 'true', 'true']);
    expect(items(el).map((x) => x.dataset['active'])).toEqual(['false', 'false', 'false']);
  });

  it('consumes the authored e-step children', () => {
    const el = mount(THREE('current="1"'));
    expect(el.querySelectorAll('e-step')).toHaveLength(0);
    expect(el.children).toHaveLength(1);
    expect(el.firstElementChild!.tagName).toBe('OL');
  });

  it('rebuilds only when the orientation actually changes', () => {
    const el = mount(THREE('current="1"'));
    const firstOl = el.querySelector('ol')!;

    // Same effective orientation → patch, not rebuild.
    el.setAttribute('orientation', 'horizontal');
    expect(el.querySelector('ol')).toBe(firstOl);
    expect(el.querySelectorAll('.ink-steps__status')).toHaveLength(0);

    el.setAttribute('orientation', 'vertical');
    const verticalOl = el.querySelector('ol')!;
    expect(verticalOl).not.toBe(firstOl);
    expect(el.querySelectorAll('.ink-steps__status')).toHaveLength(3);

    el.removeAttribute('orientation');
    expect(el.querySelector('ol')).not.toBe(verticalOl);
    expect(el.querySelector('ol')!.className).toBe('ink-steps ink-steps--horizontal');
    expect(el.querySelectorAll('.ink-steps__status')).toHaveLength(0);
  });

  it('rebuilds again for every unrecognised orientation value', () => {
    // `_orientation` stores the normalised value, so a raw value that is
    // neither 'horizontal' nor 'vertical' never matches and always rebuilds.
    const el = mount(THREE('current="1"'));
    const first = el.querySelector('ol')!;

    el.setAttribute('orientation', 'Horizontal');
    const second = el.querySelector('ol')!;
    expect(second).not.toBe(first);
    expect(second.className).toBe('ink-steps ink-steps--horizontal');
    expect(el.querySelectorAll('.ink-steps__status')).toHaveLength(0);

    el.setAttribute('orientation', 'bogus');
    const third = el.querySelector('ol')!;
    expect(third).not.toBe(second);
    expect(third.className).toBe('ink-steps ink-steps--horizontal');
  });

  it('renders steps without a title as empty and escapes attribute text', () => {
    const el = mount(`<e-steps>
        <e-step></e-step>
        <e-step title="<b>x</b>" description="<i>y</i>"></e-step>
      </e-steps>`);
    const titles = [...el.querySelectorAll('.ink-steps__title')];
    expect(titles[0].textContent).toBe('');
    expect(titles[1].textContent).toBe('<b>x</b>');
    expect(titles[1].querySelector('b')).toBeNull();
    expect(el.querySelector('.ink-steps__desc')!.textContent).toBe('<i>y</i>');
  });

  it('renders an empty list when there are no e-step children', () => {
    const el = mount(`<e-steps current="1"></e-steps>`);
    // `repeat(0,1fr)` is invalid CSS, so the declaration is dropped entirely.
    expect(el.querySelector('ol')!.style.gridTemplateColumns).toBe('');
    expect(el.querySelector('ol')!.children).toHaveLength(0);
    el.setAttribute('current', '2');
    expect(el.querySelector('ol')!.children).toHaveLength(0);
  });

  it('does not rebuild on reconnect', () => {
    const el = mount(THREE('current="1"'));
    const ol = el.querySelector('ol')!;
    const parent = el.parentElement!;
    el.remove();
    parent.appendChild(el);
    expect(el.querySelector('ol')).toBe(ol);
  });
});

/* ========================================================================= *
 * e-avatar / e-avatar-group
 * ========================================================================= */

describe('e-avatar', () => {
  const wrapOf = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.ink-avatar')!;

  it.each([
    ['Ada Lovelace', 'AL'],
    ['Ada', 'A'],
    ['  ada   lovelace  hopper ', 'AL'],
    ['   ', ''],
  ])('renders initials for name %j', (name, initials) => {
    const el = mount(`<e-avatar name="${name}"></e-avatar>`);
    expect(wrapOf(el).textContent).toBe(initials);
    expect(wrapOf(el).getAttribute('aria-label')).toBe(name);
    expect(wrapOf(el).getAttribute('role')).toBe('img');
  });

  it('falls back to ? when no name is given', () => {
    const el = mount(`<e-avatar></e-avatar>`);
    expect(wrapOf(el).textContent).toBe('?');
    expect(wrapOf(el).getAttribute('aria-label')).toBe('?');
  });

  it.each([
    ['', 40, '16px'],
    ['48', 48, '19px'],
    ['4', 8, '11px'],
    ['9999', 512, '205px'],
    ['abc', 40, '16px'],
  ])('clamps size=%j to %ipx', (raw, px, fontSize) => {
    const el = mount(`<e-avatar name="Ada" size="${raw}"></e-avatar>`);
    expect(wrapOf(el).style.width).toBe(`${px}px`);
    expect(wrapOf(el).style.height).toBe(`${px}px`);
    expect(wrapOf(el).style.fontSize).toBe(fontSize);
  });

  it('applies and removes the circle shape modifier', () => {
    const el = mount(`<e-avatar name="Ada" shape="circle"></e-avatar>`);
    expect(wrapOf(el).classList.contains('ink-avatar--circle')).toBe(true);
    el.setAttribute('shape', 'square');
    expect(wrapOf(el).classList.contains('ink-avatar--circle')).toBe(false);
    expect(wrapOf(el).classList.contains('ink-avatar')).toBe(true);
    el.setAttribute('shape', 'circle');
    expect(wrapOf(el).classList.contains('ink-avatar--circle')).toBe(true);
    el.removeAttribute('shape');
    expect(wrapOf(el).classList.contains('ink-avatar--circle')).toBe(false);
  });

  it('renders an img for src and reuses it when src changes', () => {
    const a = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const b =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const el = mount(`<e-avatar name="Ada" src="${a}"></e-avatar>`);
    const img = wrapOf(el).querySelector('img')!;
    expect(img.getAttribute('src')).toBe(a);
    expect(img.alt).toBe('');
    expect(wrapOf(el).textContent).toBe('');

    el.setAttribute('src', b);
    expect(wrapOf(el).querySelector('img')).toBe(img);
    expect(img.getAttribute('src')).toBe(b);

    el.setAttribute('name', 'Grace Hopper');
    expect(wrapOf(el).querySelector('img')).toBe(img);
    expect(wrapOf(el).getAttribute('aria-label')).toBe('Grace Hopper');
  });

  it('falls back to initials when the image errors and recovers on a new src', () => {
    const broken = 'data:image/png;base64,QUJD';
    const el = mount(`<e-avatar name="Ada Lovelace" src="${broken}"></e-avatar>`);
    const img = wrapOf(el).querySelector('img')!;
    img.dispatchEvent(new Event('error'));
    expect(wrapOf(el).querySelector('img')).toBeNull();
    expect(wrapOf(el).textContent).toBe('AL');

    // The same failing src stays suppressed across unrelated re-renders.
    el.setAttribute('size', '64');
    expect(wrapOf(el).querySelector('img')).toBeNull();

    const good = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    el.setAttribute('src', good);
    expect(wrapOf(el).querySelector('img')!.getAttribute('src')).toBe(good);
    expect(wrapOf(el).textContent).toBe('');
  });

  it('drops the image again when src is removed', () => {
    const a = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const el = mount(`<e-avatar name="Ada Lovelace" src="${a}"></e-avatar>`);
    expect(wrapOf(el).querySelector('img')).not.toBeNull();
    el.removeAttribute('src');
    expect(wrapOf(el).querySelector('img')).toBeNull();
    expect(wrapOf(el).textContent).toBe('AL');
  });

  it('tolerates attribute changes before it is connected', () => {
    const el = document.createElement('e-avatar');
    el.setAttribute('name', 'Ada');
    el.setAttribute('src', 'x');
    expect(el.querySelector('.ink-avatar')).toBeNull();
    document.body.appendChild(el);
    expect(el.querySelector('.ink-avatar')).not.toBeNull();
    el.remove();
  });
});

describe('e-avatar-group', () => {
  const GROUP = (attrs: string): string => `<e-avatar-group ${attrs}>
      <e-avatar-item name="Ada"></e-avatar-item>
      <e-avatar-item name="Linus"></e-avatar-item>
      <e-avatar-item name="Grace"></e-avatar-item>
      <e-avatar-item name="Alan"></e-avatar-item>
      <e-avatar-item name="Edsger"></e-avatar-item>
    </e-avatar-group>`;
  const avatars = (el: HTMLElement): HTMLElement[] => [
    ...el.querySelectorAll<HTMLElement>('.ink-avatar-group > e-avatar'),
  ];
  const overflow = (el: HTMLElement): HTMLElement | null =>
    el.querySelector<HTMLElement>('.ink-avatar-group__overflow');

  it('renders up to max avatars plus an overflow chip', () => {
    const el = mount(GROUP('max="2" size="32"'));
    expect(avatars(el)).toHaveLength(2);
    expect(avatars(el).map((a) => a.getAttribute('name'))).toEqual(['Ada', 'Linus']);
    expect(avatars(el).every((a) => a.getAttribute('shape') === 'circle')).toBe(true);
    expect(avatars(el).every((a) => a.getAttribute('size') === '32')).toBe(true);
    const chip = overflow(el)!;
    expect(chip.textContent).toBe('+3');
    expect(chip.style.width).toBe('32px');
    expect(chip.style.height).toBe('32px');
  });

  it('uses the default max of 4 and omits the chip when nothing overflows', () => {
    const el = mount(GROUP(''));
    expect(avatars(el)).toHaveLength(4);
    expect(overflow(el)!.textContent).toBe('+1');
    const el2 = mount(GROUP('max="9"'));
    expect(avatars(el2)).toHaveLength(5);
    expect(overflow(el2)).toBeNull();
  });

  it('forwards src from the item to the rendered avatar', () => {
    const png = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const el = mount(`<e-avatar-group>
        <e-avatar-item name="Ada" src="${png}"></e-avatar-item>
        <e-avatar-item></e-avatar-item>
      </e-avatar-group>`);
    const rendered = avatars(el);
    expect(rendered[0].getAttribute('src')).toBe(png);
    expect(rendered[1].hasAttribute('src')).toBe(false);
    expect(rendered[1].getAttribute('name')).toBe('');
  });

  it('patches every avatar and the chip when size changes', () => {
    const el = mount(GROUP('max="2" size="32"'));
    const first = avatars(el)[0];
    el.setAttribute('size', '64');
    expect(avatars(el)[0]).toBe(first);
    expect(avatars(el).every((a) => a.getAttribute('size') === '64')).toBe(true);
    expect(first.querySelector<HTMLElement>('.ink-avatar')!.style.width).toBe('64px');
    expect(overflow(el)!.style.width).toBe('64px');
    expect(overflow(el)!.style.height).toBe('64px');

    el.setAttribute('size', '4'); // clamped to the 8px floor
    expect(avatars(el).every((a) => a.getAttribute('size') === '8')).toBe(true);
    expect(overflow(el)!.style.width).toBe('8px');
  });

  it('adds, removes and re-creates avatars and the chip when max changes', () => {
    const el = mount(GROUP('max="2" size="32"'));
    const [first, second] = avatars(el);

    el.setAttribute('max', '4');
    expect(avatars(el)).toHaveLength(4);
    expect(avatars(el)[0]).toBe(first);
    expect(avatars(el)[1]).toBe(second);
    expect(avatars(el).map((a) => a.getAttribute('name'))).toEqual([
      'Ada',
      'Linus',
      'Grace',
      'Alan',
    ]);
    expect(overflow(el)!.textContent).toBe('+1');
    // The chip always stays last.
    expect(el.querySelector('.ink-avatar-group')!.lastElementChild).toBe(overflow(el));

    el.setAttribute('max', '5');
    expect(avatars(el)).toHaveLength(5);
    expect(overflow(el)).toBeNull();

    el.setAttribute('max', '1');
    expect(avatars(el)).toHaveLength(1);
    expect(overflow(el)!.textContent).toBe('+4');

    el.setAttribute('max', '0');
    expect(avatars(el)).toHaveLength(0);
    expect(overflow(el)!.textContent).toBe('+5');
  });

  it.each([
    ['abc', 4],
    ['2.5', 4],
    ['-3', 0],
  ])('treats max=%j as %i visible avatars', (raw, visible) => {
    const el = mount(GROUP(`max="${raw}"`));
    expect(avatars(el)).toHaveLength(visible);
    expect(overflow(el)!.textContent).toBe(`+${5 - visible}`);
  });

  it('tolerates attribute changes before it is connected and does not rebuild on reconnect', () => {
    const el = document.createElement('e-avatar-group');
    el.setAttribute('max', '2');
    expect(el.querySelector('.ink-avatar-group')).toBeNull();
    document.body.appendChild(el);
    const group = el.querySelector('.ink-avatar-group')!;
    el.remove();
    document.body.appendChild(el);
    expect(el.querySelectorAll('.ink-avatar-group')).toHaveLength(1);
    expect(el.querySelector('.ink-avatar-group')).toBe(group);
    el.remove();
  });
});

/* ========================================================================= *
 * e-image
 * ========================================================================= */

describe('e-image', () => {
  const PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const BROKEN = 'data:image/png;base64,QUJD';
  const imgOf = (el: HTMLElement): HTMLImageElement =>
    el.querySelector<HTMLImageElement>('.ink-image__img')!;

  it('renders a figure with the image and forwards the layout attributes', () => {
    const el = mount(
      `<e-image src="${PNG}" alt="Cover" width="120" height="80" fit="contain" lazy></e-image>`,
    );
    expect(el.querySelector('figure')!.className).toBe('ink-image');
    const img = imgOf(el);
    expect(img.getAttribute('src')).toBe(PNG);
    expect(img.getAttribute('alt')).toBe('Cover');
    expect(img.getAttribute('width')).toBe('120');
    expect(img.getAttribute('height')).toBe('80');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.style.objectFit).toBe('contain');
    expect(el.querySelector('.ink-image__placeholder')).toBeNull();
  });

  it.each([
    ['cover', 'cover'],
    ['fill', 'fill'],
    ['none', 'none'],
    ['bogus', 'cover'],
    ['', 'cover'],
  ])('maps fit=%j to object-fit %s', (raw, expected) => {
    const el = mount(`<e-image src="${PNG}" fit="${raw}"></e-image>`);
    expect(imgOf(el).style.objectFit).toBe(expected);
  });

  it('toggles lazy, width and height when the attributes are removed', () => {
    const el = mount(`<e-image src="${PNG}" lazy width="10" height="20"></e-image>`);
    const img = imgOf(el);
    el.removeAttribute('lazy');
    el.removeAttribute('width');
    el.removeAttribute('height');
    expect(img.hasAttribute('loading')).toBe(false);
    expect(img.hasAttribute('width')).toBe(false);
    expect(img.hasAttribute('height')).toBe(false);
    el.setAttribute('lazy', 'false'); // boolAttr treats "false" as off
    expect(img.hasAttribute('loading')).toBe(false);
    el.setAttribute('lazy', '');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('adds, updates and removes the caption element', () => {
    const el = mount(`<e-image src="${PNG}"></e-image>`);
    expect(el.querySelector('figcaption')).toBeNull();
    el.setAttribute('caption', 'Issue #42');
    const cap = el.querySelector('figcaption')!;
    expect(cap.className).toBe('ink-image__caption');
    expect(cap.textContent).toBe('Issue #42');
    el.setAttribute('caption', 'Issue #43');
    expect(el.querySelector('figcaption')).toBe(cap);
    expect(cap.textContent).toBe('Issue #43');
    el.removeAttribute('caption');
    expect(el.querySelector('figcaption')).toBeNull();
  });

  it('escapes caption and alt text supplied through attributes', () => {
    const el = mount(`<e-image caption="<b>x</b>" alt="<i>y</i>"></e-image>`);
    expect(el.querySelector('figcaption')!.querySelector('b')).toBeNull();
    expect(el.querySelector('figcaption')!.textContent).toBe('<b>x</b>');
    const label = el.querySelector('.ink-image__placeholder span')!;
    expect(label.querySelector('i')).toBeNull();
    expect(label.textContent).toBe('<i>y</i>');
  });

  it('renders the placeholder and reports it exactly once when there is no src', async () => {
    const el = mount(`<e-image alt="Missing cover"></e-image>`);
    const details = collect<{ value: string }>(el, 'e-load');
    const ph = el.querySelector('.ink-image__placeholder')!;
    expect(ph.getAttribute('aria-hidden')).toBe('true');
    expect(ph.querySelector('span')!.textContent).toBe('Missing cover');
    expect(imgOf(el).hasAttribute('hidden')).toBe(true);

    await settle();
    expect(details).toEqual([{ value: 'placeholder' }]);

    // A second render without src reuses the label span and stays silent.
    el.setAttribute('alt', 'Still missing');
    expect(el.querySelector('.ink-image__placeholder')).toBe(ph);
    expect(ph.querySelector('span')!.textContent).toBe('Still missing');
    await settle();
    expect(details).toEqual([{ value: 'placeholder' }]);
  });

  it('labels the placeholder "No image" when there is no alt text', () => {
    const el = mount(`<e-image></e-image>`);
    expect(el.querySelector('.ink-image__placeholder span')!.textContent).toBe('No image');
  });

  it('skips the placeholder report when a src arrives before the microtask runs', async () => {
    const el = mount(`<e-image></e-image>`);
    const details = collect<{ value: string }>(el, 'e-load');
    el.setAttribute('src', PNG);
    expect(el.querySelector('.ink-image__placeholder')).toBeNull();
    expect(imgOf(el).hasAttribute('hidden')).toBe(false);
    await settle();
    expect(details.map((d) => d.value)).not.toContain('placeholder');
  });

  it('removes the placeholder and reports a load once src is added', () => {
    const el = mount(`<e-image></e-image>`);
    const details = collect<{ value: string }>(el, 'e-load');
    el.setAttribute('src', GIF);
    imgOf(el).dispatchEvent(new Event('load'));
    expect(imgOf(el).getAttribute('data-state')).toBe('loaded');
    expect(el.querySelector('.ink-image__placeholder')).toBeNull();
    expect(details).toEqual([{ value: 'src' }]);
  });

  it('reports e-error and shows the placeholder when there is no fallback', () => {
    const el = mount(`<e-image src="${BROKEN}" alt="Broken"></e-image>`);
    const errors = collect<{ value: string }>(el, 'e-error');
    imgOf(el).dispatchEvent(new Event('error'));
    expect(imgOf(el).getAttribute('data-state')).toBe('error');
    expect(imgOf(el).hasAttribute('hidden')).toBe(true);
    expect(el.querySelector('.ink-image__placeholder')).not.toBeNull();
    expect(errors).toEqual([{ value: BROKEN }]);
  });

  it('swaps to the fallback on the first error and only reports on the second', () => {
    const el = mount(`<e-image src="${BROKEN}" fallback="${GIF}"></e-image>`);
    const errors = collect<{ value: string }>(el, 'e-error');
    const loads = collect<{ value: string }>(el, 'e-load');
    const img = imgOf(el);

    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe(GIF);
    expect(errors).toEqual([]);
    expect(el.querySelector('.ink-image__placeholder')).toBeNull();

    img.dispatchEvent(new Event('load'));
    expect(loads).toEqual([{ value: 'fallback' }]);

    img.dispatchEvent(new Event('error'));
    expect(errors).toEqual([{ value: GIF }]);
    expect(el.querySelector('.ink-image__placeholder')).not.toBeNull();
  });

  it('retries with a fallback added after the image already failed', () => {
    const el = mount(`<e-image src="${BROKEN}"></e-image>`);
    const img = imgOf(el);
    img.dispatchEvent(new Event('error'));
    expect(img.getAttribute('data-state')).toBe('error');
    expect(el.querySelector('.ink-image__placeholder')).not.toBeNull();

    el.setAttribute('fallback', GIF);
    expect(img.getAttribute('src')).toBe(GIF);
    expect(img.hasAttribute('hidden')).toBe(false);
    expect(img.hasAttribute('data-state')).toBe(false);
    expect(el.querySelector('.ink-image__placeholder')).toBeNull();
  });

  it('does not retry a fallback while the image is still healthy', () => {
    const el = mount(`<e-image src="${PNG}"></e-image>`);
    const img = imgOf(el);
    el.setAttribute('fallback', GIF);
    expect(img.getAttribute('src')).toBe(PNG);
  });

  it('resets the error state when a brand new src is assigned', () => {
    const el = mount(`<e-image src="${BROKEN}"></e-image>`);
    const img = imgOf(el);
    img.dispatchEvent(new Event('error'));
    expect(img.hasAttribute('hidden')).toBe(true);

    el.setAttribute('src', GIF);
    expect(img.getAttribute('src')).toBe(GIF);
    expect(img.hasAttribute('hidden')).toBe(false);
    expect(img.hasAttribute('data-state')).toBe(false);
    expect(el.querySelector('.ink-image__placeholder')).toBeNull();
  });

  it('falls back to the placeholder when src is removed', () => {
    const el = mount(`<e-image src="${PNG}" alt="Cover"></e-image>`);
    el.removeAttribute('src');
    expect(imgOf(el).hasAttribute('src')).toBe(false);
    expect(imgOf(el).hasAttribute('hidden')).toBe(true);
    expect(el.querySelector('.ink-image__placeholder span')!.textContent).toBe('Cover');
  });

  it('keeps the placeholder above the caption in the figure', () => {
    const el = mount(`<e-image caption="Cap"></e-image>`);
    const children = [...el.querySelector('figure')!.children].map((c) => c.tagName.toLowerCase());
    expect(children).toEqual(['img', 'div', 'figcaption']);
  });

  it('tolerates attribute changes before it is connected and does not rebuild on reconnect', () => {
    const el = document.createElement('e-image');
    el.setAttribute('src', PNG);
    expect(el.querySelector('figure')).toBeNull();
    document.body.appendChild(el);
    const fig = el.querySelector('figure')!;
    el.remove();
    document.body.appendChild(el);
    expect(el.querySelector('figure')).toBe(fig);
    el.remove();
  });
});

/* ========================================================================= *
 * e-pagination
 * ========================================================================= */

describe('e-pagination', () => {
  const cellsOf = (el: HTMLElement): string[] =>
    [...el.querySelectorAll('.ink-pagination__cell')].map((c) =>
      c.classList.contains('ink-pagination__gap') ? '…' : (c as HTMLElement).dataset['page'] || '?',
    );
  const pageBtn = (el: HTMLElement, p: number): HTMLButtonElement =>
    [...el.querySelectorAll<HTMLButtonElement>('button[data-page]')].find(
      (b) => b.dataset['page'] === String(p) && b.textContent === String(p),
    )!;

  it('renders every page when the total fits without ellipses', () => {
    const el = mount(`<e-pagination total="5" current="3"></e-pagination>`);
    expect(el.querySelector('nav')!.getAttribute('aria-label')).toBe('Pagination');
    expect(cellsOf(el)).toEqual(['2', '1', '2', '3', '4', '5', '4']);
    expect(pageBtn(el, 3).getAttribute('aria-current')).toBe('page');
    expect(el.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('ellipsizes long page lists on both sides', () => {
    const el = mount(`<e-pagination total="20" current="10"></e-pagination>`);
    expect(cellsOf(el)).toEqual(['9', '1', '…', '9', '10', '11', '…', '20', '11']);
    expect(el.querySelectorAll('.ink-pagination__gap')).toHaveLength(2);
    expect(el.querySelector('.ink-pagination__gap')!.textContent).toBe('…');
  });

  it('disables prev on the first page and next on the last', () => {
    const first = mount(`<e-pagination total="3" current="1"></e-pagination>`);
    const prev = first.querySelector<HTMLButtonElement>('[aria-label="Previous"]')!;
    const next = first.querySelector<HTMLButtonElement>('[aria-label="Next"]')!;
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    expect(prev.querySelector('path')!.getAttribute('d')).toBe('M15 6l-6 6 6 6');
    expect(next.querySelector('path')!.getAttribute('d')).toBe('M9 6l6 6-6 6');

    const last = mount(`<e-pagination total="3" current="3"></e-pagination>`);
    expect(last.querySelector<HTMLButtonElement>('[aria-label="Previous"]')!.disabled).toBe(false);
    expect(last.querySelector<HTMLButtonElement>('[aria-label="Next"]')!.disabled).toBe(true);
  });

  it('emits e-change and reflects current when a page is clicked', () => {
    const el = mount(`<e-pagination total="10" current="1"></e-pagination>`);
    const details = collect<{ value: number }>(el, 'e-change');
    el.querySelector<HTMLButtonElement>('[aria-label="Next"]')!.click();
    expect(details).toEqual([{ value: 2 }]);
    expect(el.getAttribute('current')).toBe('2');
    expect(pageBtn(el, 2).getAttribute('aria-current')).toBe('page');

    el.querySelector<HTMLButtonElement>('[aria-label="Previous"]')!.click();
    expect(details[1]).toEqual({ value: 1 });
    expect(el.getAttribute('current')).toBe('1');

    pageBtn(el, 10).click();
    expect(details[2]).toEqual({ value: 10 });
    expect(el.getAttribute('current')).toBe('10');
  });

  it('ignores clicks on the current page, the gaps and disabled buttons', () => {
    const el = mount(`<e-pagination total="20" current="1"></e-pagination>`);
    const details = collect<{ value: number }>(el, 'e-change');
    pageBtn(el, 1).click();
    el.querySelector<HTMLElement>('.ink-pagination__gap')!.click();
    el.querySelector<HTMLButtonElement>('[aria-label="Previous"]')!.click();
    el.querySelector<HTMLElement>('nav')!.click();
    expect(details).toEqual([]);
    expect(el.getAttribute('current')).toBe('1');
  });

  it('patches aria-current in place when the structure is unchanged', () => {
    const el = mount(`<e-pagination total="5" current="1"></e-pagination>`);
    const cells = [...el.querySelectorAll('.ink-pagination__cell')];
    el.setAttribute('current', '4');
    expect([...el.querySelectorAll('.ink-pagination__cell')]).toEqual(cells);
    expect(pageBtn(el, 4).getAttribute('aria-current')).toBe('page');
    expect(pageBtn(el, 1).hasAttribute('aria-current')).toBe(false);
  });

  it('skips gap cells when patching aria-current', () => {
    // current is clamped to 20 in both states, so the cell structure is stable.
    const el = mount(`<e-pagination total="20" current="25"></e-pagination>`);
    expect(cellsOf(el)).toEqual(['19', '1', '…', '19', '20', '21']);
    const cells = [...el.querySelectorAll('.ink-pagination__cell')];
    el.setAttribute('current', '30');
    expect([...el.querySelectorAll('.ink-pagination__cell')]).toEqual(cells);
    expect(pageBtn(el, 20).getAttribute('aria-current')).toBe('page');
    expect(el.querySelector('.ink-pagination__gap')!.hasAttribute('aria-current')).toBe(false);
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Next"]')!.disabled).toBe(true);
  });

  it('rebuilds the cells when total or sibling-count change', () => {
    const el = mount(`<e-pagination total="5" current="3"></e-pagination>`);
    expect(cellsOf(el)).toEqual(['2', '1', '2', '3', '4', '5', '4']);

    el.setAttribute('total', '20');
    expect(cellsOf(el)).toEqual(['2', '1', '2', '3', '4', '…', '20', '4']);

    el.setAttribute('sibling-count', '0');
    expect(cellsOf(el)).toEqual(['2', '1', '…', '3', '…', '20', '4']);

    el.setAttribute('sibling-count', '3');
    expect(cellsOf(el)).toEqual(['2', '1', '2', '3', '4', '5', '6', '…', '20', '4']);

    el.removeAttribute('total');
    expect(cellsOf(el)).toEqual(['0', '1', '2']);
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Previous"]')!.disabled).toBe(true);
  });

  it.each([
    ['total="0"', ['0', '1', '2']],
    ['total="abc"', ['0', '1', '2']],
    ['total="1.5"', ['0', '1', '2']],
    ['total="4" current="-2"', ['0', '1', '2', '3', '4', '2']],
    ['total="4" current="99"', ['3', '1', '2', '3', '4', '5']],
    ['total="8" sibling-count="-4"', ['0', '1', '…', '8', '2']],
    ['total="8" sibling-count="99"', ['0', '1', '2', '3', '4', '5', '6', '7', '8', '2']],
  ])('clamps %s', (attrs, expected) => {
    const el = mount(`<e-pagination ${attrs}></e-pagination>`);
    expect(cellsOf(el)).toEqual(expected);
  });

  it('caps an absurd total at one million pages', () => {
    const el = mount(`<e-pagination total="999999999" current="1"></e-pagination>`);
    expect(cellsOf(el)).toEqual(['0', '1', '2', '…', '1000000', '2']);
  });

  it('drops its click listener on disconnect and restores it on reconnect', () => {
    const el = mount(`<e-pagination total="5" current="1"></e-pagination>`);
    const parent = el.parentElement!;
    const details = collect<{ value: number }>(el, 'e-change');
    el.remove();
    pageBtn(el, 3).click();
    expect(details).toEqual([]);
    parent.appendChild(el);
    pageBtn(el, 3).click();
    expect(details).toEqual([{ value: 3 }]);
  });
});

/* ========================================================================= *
 * e-sparkline
 * ========================================================================= */

describe('e-sparkline', () => {
  const line = (el: HTMLElement): SVGPolylineElement =>
    el.querySelector<SVGPolylineElement>('.ink-sparkline__line')!;
  const dot = (el: HTMLElement): SVGCircleElement =>
    el.querySelector<SVGCircleElement>('.ink-sparkline__last')!;
  const root = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.ink-sparkline')!;

  it('plots the series and describes the trend', () => {
    const el = mount(`<e-sparkline label="Requests" values="[0,10]"></e-sparkline>`);
    expect(line(el).getAttribute('points')).toBe('2.00,34.00 98.00,2.00');
    expect(dot(el).getAttribute('cx')).toBe('98.00');
    expect(dot(el).getAttribute('cy')).toBe('2.00');
    expect(root(el).getAttribute('data-trend')).toBe('up');
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Requests: 10; rising');
    expect(el.querySelector('.ink-sparkline__label')!.textContent).toBe('Requests');
    expect(el.querySelector('.ink-sparkline__value')!.textContent).toBe('10');
    expect(el.querySelector('.ink-sparkline__trend')!.textContent).toBe('▲ Rising');
    expect(el.querySelector('.ink-sparkline__empty')!.hasAttribute('hidden')).toBe(true);
    expect(el.querySelector('svg')!.hasAttribute('hidden')).toBe(false);
  });

  it.each([
    ['[10,0]', 'down', '▼ Falling', 'falling'],
    ['[5,9,5]', 'flat', '— Flat', 'flat'],
    ['[5]', 'flat', '— Flat', 'flat'],
  ])('reports values %s as %s', (values, trend, text, aria) => {
    const el = mount(`<e-sparkline values="${values}"></e-sparkline>`);
    expect(root(el).getAttribute('data-trend')).toBe(trend);
    expect(el.querySelector('.ink-sparkline__trend')!.textContent).toBe(text);
    expect(el.getAttribute('aria-label')).toContain(`; ${aria}`);
  });

  it('centres a single point horizontally', () => {
    const el = mount(`<e-sparkline values="[7]"></e-sparkline>`);
    expect(line(el).getAttribute('points')).toBe('50.00,34.00');
    expect(dot(el).getAttribute('cx')).toBe('50.00');
  });

  it.each([
    ['no attribute', ''],
    ['invalid JSON', 'values="[1,"'],
    ['a JSON scalar', 'values="5"'],
    ['a JSON object', `values='{"a":1}'`],
    ['an empty array', 'values="[]"'],
  ])('shows the empty state for %s', (_label, attr) => {
    const el = mount(`<e-sparkline label="Load" ${attr}></e-sparkline>`);
    expect(line(el).getAttribute('points')).toBe('');
    expect(el.querySelector('.ink-sparkline__empty')!.hasAttribute('hidden')).toBe(false);
    expect(el.querySelector('.ink-sparkline__empty')!.textContent).toBe('No data');
    expect(el.querySelector('svg')!.hasAttribute('hidden')).toBe(true);
    expect(dot(el).hasAttribute('hidden')).toBe(true);
    expect(dot(el).hasAttribute('cx')).toBe(false);
    expect(el.getAttribute('aria-label')).toBe('Load: No data');
    expect(el.querySelector('.ink-sparkline__value')!.textContent).toBe('');
  });

  it('drops non-finite entries from the series', () => {
    const el = mount(`<e-sparkline values='[0,"a",null,true,10]'></e-sparkline>`);
    expect(line(el).getAttribute('points')).toBe('2.00,34.00 98.00,2.00');
  });

  it('caps the series at 256 points', () => {
    const values = JSON.stringify(Array.from({ length: 300 }, (_v, i) => i));
    const el = mount(`<e-sparkline values='${values}'></e-sparkline>`);
    expect(line(el).getAttribute('points')!.split(' ')).toHaveLength(256);
    expect(el.querySelector('.ink-sparkline__value')!.textContent).toBe('255');
  });

  it('clamps values to an explicit min and max', () => {
    const el = mount(`<e-sparkline values="[-5,20]" min="0" max="10"></e-sparkline>`);
    expect(line(el).getAttribute('points')).toBe('2.00,34.00 98.00,2.00');
    el.removeAttribute('min');
    el.removeAttribute('max');
    // Without bounds the data range spans -5..20, so both ends still hit the edges.
    expect(line(el).getAttribute('points')).toBe('2.00,34.00 98.00,2.00');
  });

  it('widens the range by one when max is not above min', () => {
    const el = mount(`<e-sparkline values="[10,10]" min="10" max="5"></e-sparkline>`);
    expect(line(el).getAttribute('points')).toBe('2.00,34.00 98.00,34.00');
    expect(root(el).getAttribute('data-trend')).toBe('flat');
  });

  it('toggles the label and the caption', () => {
    const el = mount(`<e-sparkline values="[1,2]"></e-sparkline>`);
    const labelEl = el.querySelector('.ink-sparkline__label')!;
    const caption = el.querySelector('.ink-sparkline__caption')!;
    expect(labelEl.hasAttribute('hidden')).toBe(true);
    expect(el.getAttribute('aria-label')).toBe('2; rising');

    el.setAttribute('label', 'Load');
    expect(labelEl.hasAttribute('hidden')).toBe(false);
    expect(labelEl.textContent).toBe('Load');
    expect(el.getAttribute('aria-label')).toBe('Load: 2; rising');

    el.setAttribute('hide-caption', '');
    expect(caption.hasAttribute('hidden')).toBe(true);
    el.removeAttribute('hide-caption');
    expect(caption.hasAttribute('hidden')).toBe(false);

    el.removeAttribute('label');
    expect(labelEl.hasAttribute('hidden')).toBe(true);
    expect(labelEl.textContent).toBe('');
  });

  it('repatches the same nodes when values change', () => {
    const el = mount(`<e-sparkline values="[1,2]"></e-sparkline>`);
    const svgLine = line(el);
    el.setAttribute('values', '[9,1]');
    expect(line(el)).toBe(svgLine);
    expect(root(el).getAttribute('data-trend')).toBe('down');
    el.removeAttribute('values');
    expect(line(el)).toBe(svgLine);
    expect(svgLine.getAttribute('points')).toBe('');
    expect(root(el).getAttribute('data-trend')).toBe('flat');
  });

  it('tolerates attribute changes before it is connected and does not rebuild on reconnect', () => {
    const el = document.createElement('e-sparkline');
    el.setAttribute('values', '[1,2]');
    expect(el.querySelector('.ink-sparkline')).toBeNull();
    document.body.appendChild(el);
    const figure = el.querySelector('.ink-sparkline')!;
    el.remove();
    document.body.appendChild(el);
    expect(el.querySelector('.ink-sparkline')).toBe(figure);
    el.remove();
  });
});

/* ========================================================================= *
 * e-statistic
 * ========================================================================= */

describe('e-statistic', () => {
  const part = (el: HTMLElement, name: string): HTMLElement =>
    el.querySelector<HTMLElement>(`.ink-statistic__${name}`)!;

  it('renders label, value and trend with the right a11y wiring', () => {
    const el = mount(
      `<e-statistic label="Revenue" value="12480" prefix="$" suffix="/mo" trend="up" delta="8.4%"></e-statistic>`,
    );
    expect(el.getAttribute('role')).toBe('group');
    expect(part(el, 'label').textContent).toBe('Revenue');
    expect(part(el, 'prefix').textContent).toBe('$');
    expect(part(el, 'value').textContent).toBe('12480');
    expect(part(el, 'suffix').textContent).toBe('/mo');
    const trend = part(el, 'trend');
    expect(trend.hasAttribute('hidden')).toBe(false);
    expect(trend.getAttribute('data-trend')).toBe('up');
    expect(part(el, 'arrow').textContent).toBe('▲');
    expect(part(el, 'delta').textContent).toBe('8.4%');
    expect(el.querySelector('.sr-only')!.textContent).toBe('increased by');
  });

  it('renders an empty value when the attribute is absent', () => {
    const el = mount(`<e-statistic label="Users"></e-statistic>`);
    expect(part(el, 'value').textContent).toBe('');
    expect(part(el, 'prefix').hasAttribute('hidden')).toBe(true);
    expect(part(el, 'suffix').hasAttribute('hidden')).toBe(true);
    expect(part(el, 'trend').hasAttribute('hidden')).toBe(true);
  });

  it.each([
    ['3.14159', '2', '3.14'],
    ['3.14159', '0', '3'],
    ['3.14159', '-5', '3'],
    ['2', '3', '2.000'],
    ['-2.5', '1', '-2.5'],
    ['N/A', '2', 'N/A'],
    ['', '2', ''],
    ['  ', '2', '  '],
  ])('formats value=%j with precision=%j as %j', (value, precision, expected) => {
    const el = mount(`<e-statistic value="${value}" precision="${precision}"></e-statistic>`);
    expect(part(el, 'value').textContent).toBe(expected);
  });

  it('leaves the value untouched without a precision attribute', () => {
    const el = mount(`<e-statistic value="3.14159"></e-statistic>`);
    expect(part(el, 'value').textContent).toBe('3.14159');
    el.setAttribute('precision', '3');
    expect(part(el, 'value').textContent).toBe('3.142');
    el.removeAttribute('precision');
    expect(part(el, 'value').textContent).toBe('3.14159');
  });

  it.each([
    ['up', '▲', 'increased by'],
    ['down', '▼', 'decreased by'],
    ['flat', '—', 'unchanged'],
    ['sideways', '—', 'unchanged'],
  ])('renders trend=%s as %s', (trend, arrow, a11y) => {
    const el = mount(`<e-statistic value="1" trend="${trend}" delta="2"></e-statistic>`);
    expect(part(el, 'arrow').textContent).toBe(arrow);
    expect(el.querySelector('.sr-only')!.textContent).toBe(a11y);
    const dir = trend === 'up' || trend === 'down' ? trend : 'flat';
    expect(part(el, 'trend').getAttribute('data-trend')).toBe(dir);
  });

  it('shows the trend row for a delta without a trend and hides it again', () => {
    const el = mount(`<e-statistic value="1" delta="+3"></e-statistic>`);
    const trend = part(el, 'trend');
    expect(trend.hasAttribute('hidden')).toBe(false);
    expect(trend.getAttribute('data-trend')).toBe('flat');
    expect(part(el, 'delta').textContent).toBe('+3');

    el.removeAttribute('delta');
    expect(trend.hasAttribute('hidden')).toBe(true);

    el.setAttribute('trend', 'down');
    expect(trend.hasAttribute('hidden')).toBe(false);
    expect(part(el, 'delta').textContent).toBe('');
    el.removeAttribute('trend');
    expect(trend.hasAttribute('hidden')).toBe(true);
  });

  it('toggles label, prefix and suffix visibility as the attributes change', () => {
    const el = mount(`<e-statistic value="1"></e-statistic>`);
    expect(part(el, 'label').hasAttribute('hidden')).toBe(true);
    el.setAttribute('label', 'Users');
    el.setAttribute('prefix', '$');
    el.setAttribute('suffix', '%');
    expect(part(el, 'label').hasAttribute('hidden')).toBe(false);
    expect(part(el, 'prefix').hasAttribute('hidden')).toBe(false);
    expect(part(el, 'suffix').hasAttribute('hidden')).toBe(false);
    el.setAttribute('label', '');
    el.removeAttribute('prefix');
    el.removeAttribute('suffix');
    expect(part(el, 'label').hasAttribute('hidden')).toBe(true);
    expect(part(el, 'prefix').hasAttribute('hidden')).toBe(true);
    expect(part(el, 'suffix').hasAttribute('hidden')).toBe(true);
  });

  it('escapes attribute-supplied text', () => {
    const el = mount(
      `<e-statistic label="<b>L</b>" value="<img src=x>" delta="<i>d</i>"></e-statistic>`,
    );
    expect(part(el, 'label').querySelector('b')).toBeNull();
    expect(part(el, 'label').textContent).toBe('<b>L</b>');
    expect(part(el, 'value').querySelector('img')).toBeNull();
    expect(part(el, 'value').textContent).toBe('<img src=x>');
    expect(part(el, 'delta').textContent).toBe('<i>d</i>');
  });

  it('tolerates attribute changes before it is connected and does not rebuild on reconnect', () => {
    const el = document.createElement('e-statistic');
    el.setAttribute('value', '1');
    expect(el.querySelector('.ink-statistic')).toBeNull();
    document.body.appendChild(el);
    const root = el.querySelector('.ink-statistic')!;
    el.remove();
    document.body.appendChild(el);
    expect(el.querySelector('.ink-statistic')).toBe(root);
    el.remove();
  });
});

/* ========================================================================= *
 * e-change-marker
 * ========================================================================= */

describe('e-change-marker', () => {
  const root = (el: HTMLElement): HTMLElement =>
    el.querySelector<HTMLElement>('.ink-change-marker')!;
  const cue = (el: HTMLElement): HTMLElement =>
    el.querySelector<HTMLElement>('.ink-change-marker__cue')!;
  const value = (el: HTMLElement): HTMLElement =>
    el.querySelector<HTMLElement>('.ink-change-marker__value')!;

  it('marks an increase with the delta and composes the aria-label', () => {
    const el = mount(
      `<e-change-marker label="Temperature" previous="21.8" value="22.4" suffix=" °C" precision="1"></e-change-marker>`,
    );
    expect(root(el).getAttribute('data-change')).toBe('up');
    expect(value(el).textContent).toBe('22.4 °C');
    expect(cue(el).textContent).toBe('▲ Increased by 0.6 °C');
    expect(el.getAttribute('role')).toBe('group');
    expect(el.hasAttribute('aria-live')).toBe(false);
    expect(el.getAttribute('aria-label')).toBe('Temperature: 22.4 °C; ▲ Increased by 0.6 °C');
  });

  it('marks a decrease', () => {
    const el = mount(`<e-change-marker previous="10" value="8"></e-change-marker>`);
    expect(root(el).getAttribute('data-change')).toBe('down');
    expect(cue(el).textContent).toBe('▼ Decreased by 2');
  });

  it('treats a missing previous value as unchanged', () => {
    const el = mount(`<e-change-marker value="42"></e-change-marker>`);
    expect(root(el).getAttribute('data-change')).toBe('unchanged');
    expect(cue(el).textContent).toBe('');
    expect(cue(el).hasAttribute('hidden')).toBe(true);
    expect(el.getAttribute('aria-label')).toBe('42; unchanged');
  });

  it('suppresses numeric changes within the tolerance', () => {
    const el = mount(
      `<e-change-marker previous="10" value="10.4" tolerance="0.5"></e-change-marker>`,
    );
    expect(root(el).getAttribute('data-change')).toBe('unchanged');
    el.setAttribute('tolerance', '0.1');
    expect(root(el).getAttribute('data-change')).toBe('up');
    expect(cue(el).textContent).toBe('▲ Increased by 0.40000000000000036');
    el.setAttribute('precision', '1');
    expect(cue(el).textContent).toBe('▲ Increased by 0.4');
    el.setAttribute('tolerance', 'abc'); // falls back to 0
    expect(root(el).getAttribute('data-change')).toBe('up');
  });

  it.each([
    ['Standby', 'Active', 'changed'],
    ['Active', 'Active', 'unchanged'],
    ['', 'Active', 'changed'],
    ['12', 'n/a', 'changed'],
  ])('compares non-numeric %j → %j as %s', (previous, current, expected) => {
    const el = mount(
      `<e-change-marker previous="${previous}" value="${current}"></e-change-marker>`,
    );
    expect(root(el).getAttribute('data-change')).toBe(expected);
    if (expected === 'changed') expect(cue(el).textContent).toBe('≠ Changed');
  });

  it('adds the previous value to the cue when show-previous is set', () => {
    const el = mount(
      `<e-change-marker prefix="$" suffix=" USD" previous="10" value="12" show-previous precision="2"></e-change-marker>`,
    );
    expect(value(el).textContent).toBe('$12.00 USD');
    expect(cue(el).textContent).toBe('▲ Increased by 2.00 USD from $10.00 USD');

    el.setAttribute('value', 'text');
    expect(root(el).getAttribute('data-change')).toBe('changed');
    expect(cue(el).textContent).toBe('≠ Changed from $10.00 USD');

    el.removeAttribute('show-previous');
    expect(cue(el).textContent).toBe('≠ Changed');
  });

  it('switches between the polite status role and the plain group role', () => {
    const el = mount(`<e-change-marker value="1" announce></e-change-marker>`);
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
    el.removeAttribute('announce');
    expect(el.getAttribute('role')).toBe('group');
    expect(el.hasAttribute('aria-live')).toBe(false);
    el.setAttribute('announce', '');
    expect(el.getAttribute('role')).toBe('status');
  });

  it('toggles the label and reacts to every attribute mutation in place', () => {
    const el = mount(`<e-change-marker value="1"></e-change-marker>`);
    const labelEl = el.querySelector('.ink-change-marker__label')!;
    const valueEl = value(el);
    expect(labelEl.hasAttribute('hidden')).toBe(true);

    el.setAttribute('label', 'Load');
    expect(labelEl.hasAttribute('hidden')).toBe(false);
    expect(labelEl.textContent).toBe('Load');

    el.setAttribute('previous', '3');
    expect(root(el).getAttribute('data-change')).toBe('down');
    el.setAttribute('prefix', '~');
    el.setAttribute('suffix', 'k');
    expect(valueEl.textContent).toBe('~1k');
    expect(value(el)).toBe(valueEl); // patched, never replaced

    el.removeAttribute('previous');
    expect(root(el).getAttribute('data-change')).toBe('unchanged');
    el.removeAttribute('label');
    expect(labelEl.hasAttribute('hidden')).toBe(true);
  });

  it('renders an empty value when the attribute is missing and escapes attribute text', () => {
    const el = mount(`<e-change-marker label="<b>x</b>"></e-change-marker>`);
    expect(value(el).textContent).toBe('');
    expect(el.querySelector('.ink-change-marker__label')!.querySelector('b')).toBeNull();
    expect(el.querySelector('.ink-change-marker__label')!.textContent).toBe('<b>x</b>');
  });

  it('tolerates attribute changes before it is connected and does not rebuild on reconnect', () => {
    const el = document.createElement('e-change-marker');
    el.setAttribute('value', '1');
    expect(el.querySelector('.ink-change-marker')).toBeNull();
    document.body.appendChild(el);
    const built = el.querySelector('.ink-change-marker')!;
    el.remove();
    document.body.appendChild(el);
    expect(el.querySelector('.ink-change-marker')).toBe(built);
    el.remove();
  });
});

/* ========================================================================= *
 * e-last-updated
 * ========================================================================= */

describe('e-last-updated', () => {
  const BASE = '2026-08-17T14:00:00Z';
  const at = (offsetSeconds: number): string =>
    new Date(Date.parse(BASE) + offsetSeconds * 1000).toISOString();
  const relative = (el: HTMLElement): string =>
    el.querySelector('.ink-last-updated__relative')!.textContent!;
  const freshness = (el: HTMLElement): string =>
    el.querySelector('.ink-last-updated')!.getAttribute('data-freshness')!;

  it.each([
    [0, 'just now'],
    [59, 'just now'],
    [60, '1 minute ago'],
    [119, '1 minute ago'],
    [120, '2 minutes ago'],
    [3599, '59 minutes ago'],
    [3600, '1 hour ago'],
    [7200, '2 hours ago'],
    [86399, '23 hours ago'],
    [86400, '1 day ago'],
    [172800, '2 days ago'],
  ])('renders an age of %is as %j', (age, expected) => {
    const el = mount(
      `<e-last-updated datetime="${BASE}" now="${at(age)}" expired-after="999999"></e-last-updated>`,
    );
    expect(relative(el)).toBe(expected);
  });

  it.each([
    [-1, 'in less than a minute'],
    [-59, 'in less than a minute'],
    [-60, 'in 1 minute'],
    [-7200, 'in 2 hours'],
    [-172800, 'in 2 days'],
  ])('renders a future offset of %is as %j', (age, expected) => {
    const el = mount(`<e-last-updated datetime="${BASE}" now="${at(age)}"></e-last-updated>`);
    expect(relative(el)).toBe(expected);
    expect(freshness(el)).toBe('fresh');
  });

  it.each([
    [100, 'fresh', '✓', 'Fresh'],
    [400, 'stale', '!', 'Stale'],
    [4000, 'expired', '×', 'Expired'],
  ])('classifies an age of %is as %s', (age, state, symbol, stateLabel) => {
    const el = mount(`<e-last-updated datetime="${BASE}" now="${at(age)}"></e-last-updated>`);
    expect(freshness(el)).toBe(state);
    expect(el.querySelector('.ink-last-updated__cue')!.textContent).toBe(symbol);
    expect(el.querySelector('.ink-last-updated__state')!.textContent).toBe(stateLabel);
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-label')).toBe(`Updated: ${relative(el)}; ${stateLabel}`);
  });

  it('honours custom thresholds and never lets expired fall below stale', () => {
    const el = mount(
      `<e-last-updated datetime="${BASE}" now="${at(500)}" stale-after="600" expired-after="100"></e-last-updated>`,
    );
    expect(freshness(el)).toBe('fresh');
    el.setAttribute('stale-after', '100');
    expect(freshness(el)).toBe('expired');
    el.setAttribute('expired-after', '900');
    expect(freshness(el)).toBe('stale');
    el.setAttribute('stale-after', '-50'); // clamped to 0
    expect(freshness(el)).toBe('stale');
    el.removeAttribute('stale-after');
    el.removeAttribute('expired-after');
    expect(freshness(el)).toBe('stale');
  });

  it.each([['not-a-date'], ['']])('reports an unknown state for datetime=%j', (raw) => {
    const el = mount(`<e-last-updated datetime="${raw}" now="${BASE}"></e-last-updated>`);
    expect(freshness(el)).toBe('invalid');
    expect(relative(el)).toBe('Unknown time');
    expect(el.querySelector('.ink-last-updated__cue')!.textContent).toBe('?');
    expect(el.querySelector('.ink-last-updated__state')!.textContent).toBe('Unknown');
    expect(el.querySelector('.ink-last-updated__relative')!.hasAttribute('datetime')).toBe(false);
  });

  it('reports an unknown state for an unparsable now', () => {
    const el = mount(`<e-last-updated datetime="${BASE}" now="whenever"></e-last-updated>`);
    expect(freshness(el)).toBe('invalid');
    expect(relative(el)).toBe('Unknown time');
  });

  it('shows the absolute timestamp only when asked', () => {
    const el = mount(
      `<e-last-updated datetime="${BASE}" now="${at(60)}" locale="en-GB"></e-last-updated>`,
    );
    const abs = el.querySelector<HTMLTimeElement>('.ink-last-updated__absolute')!;
    expect(abs.hasAttribute('hidden')).toBe(true);
    expect(abs.textContent).toBe('');

    el.setAttribute('show-absolute', '');
    expect(abs.hasAttribute('hidden')).toBe(false);
    expect(abs.textContent).toBe(new Date(Date.parse(BASE)).toLocaleString('en-GB'));
    expect(abs.getAttribute('datetime')).toBe(BASE);

    el.removeAttribute('locale');
    expect(abs.textContent).toBe(new Date(Date.parse(BASE)).toLocaleString('en'));

    el.removeAttribute('show-absolute');
    expect(abs.hasAttribute('hidden')).toBe(true);
  });

  it('falls back to the ISO string when the locale is not usable', () => {
    const el = mount(
      `<e-last-updated datetime="${BASE}" now="${at(60)}" locale="not a locale" show-absolute></e-last-updated>`,
    );
    expect(el.querySelector('.ink-last-updated__absolute')!.textContent).toBe(
      new Date(Date.parse(BASE)).toISOString(),
    );
  });

  it('uses the system clock when no now attribute is present', () => {
    const el = mount(
      `<e-last-updated datetime="${new Date(Date.now() - 120_000).toISOString()}"></e-last-updated>`,
    );
    expect(relative(el)).toBe('2 minutes ago');
    expect(freshness(el)).toBe('fresh');
  });

  it('supports a custom label and recomputes through the public refresh()', () => {
    const el = mount<HTMLElement & { refresh(): void }>(
      `<e-last-updated datetime="${BASE}" now="${at(60)}" label="Synced"></e-last-updated>`,
    );
    expect(el.querySelector('.ink-last-updated__label')!.textContent).toBe('Synced');
    expect(el.getAttribute('aria-label')).toBe('Synced: 1 minute ago; Fresh');

    el.setAttribute('now', at(7200));
    expect(relative(el)).toBe('2 hours ago');
    el.refresh();
    expect(relative(el)).toBe('2 hours ago');
    expect(freshness(el)).toBe('expired');

    el.removeAttribute('label');
    expect(el.querySelector('.ink-last-updated__label')!.textContent).toBe('Updated');
  });

  it('refresh() is a no-op before the element is connected', () => {
    const el = document.createElement('e-last-updated') as HTMLElement & { refresh(): void };
    el.setAttribute('datetime', BASE);
    el.refresh();
    expect(el.querySelector('.ink-last-updated')).toBeNull();
    document.body.appendChild(el);
    const built = el.querySelector('.ink-last-updated')!;
    el.remove();
    document.body.appendChild(el);
    expect(el.querySelector('.ink-last-updated')).toBe(built);
    el.remove();
  });
});

/* ========================================================================= *
 * e-qrcode
 * ========================================================================= */

describe('e-qrcode', () => {
  const svgOf = (el: HTMLElement): SVGSVGElement =>
    el.querySelector<SVGSVGElement>('.ink-qrcode > svg')!;

  it('renders an inline SVG with an accessible label', () => {
    const el = mount(`<e-qrcode value="hello"></e-qrcode>`);
    const svg = svgOf(el);
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('QR code for hello');
    // "hello" fits in version 1 at level M → 21 modules + 2×2 quiet zone, ×4.
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(svg.getAttribute('width')).toBe('100');
    expect(svg.getAttribute('height')).toBe('100');
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
    expect(svg.querySelector('rect')!.getAttribute('fill')).toBe('#fff');
    expect(svg.querySelector('path')!.getAttribute('fill')).toBe('#000');
    expect(svg.querySelector('path')!.getAttribute('d')!.length).toBeGreaterThan(0);
  });

  it('renders the empty state without a value and recovers when one arrives', () => {
    const el = mount(`<e-qrcode></e-qrcode>`);
    const empty = el.querySelector('.ink-qrcode__empty')!;
    expect(empty.getAttribute('role')).toBe('img');
    expect(empty.getAttribute('aria-label')).toBe('Empty QR code');
    expect(empty.textContent).toBe('—');

    // An empty-string value renders the same markup and is not re-written.
    el.setAttribute('value', '');
    expect(el.querySelector('.ink-qrcode__empty')).toBe(empty);

    el.setAttribute('value', 'ok');
    expect(el.querySelector('.ink-qrcode__empty')).toBeNull();
    expect(svgOf(el).getAttribute('aria-label')).toBe('QR code for ok');

    el.removeAttribute('value');
    expect(el.querySelector('.ink-qrcode__empty')!.textContent).toBe('—');
  });

  // Exactly 30 bytes — long enough that every error-correction level picks a
  // different QR version (L→v2, M/Q→v3, H→v4).
  const URL30 = 'https://epaper.example.com/abc';

  it.each([
    ['L', 116],
    ['M', 132],
    ['Q', 132],
    ['H', 148],
    ['h', 148],
    ['z', 132],
    ['', 132],
  ])('encodes at error-correction level %j', (level, dim) => {
    const el = mount(`<e-qrcode value="${URL30}" level="${level}"></e-qrcode>`);
    expect(svgOf(el).getAttribute('viewBox')).toBe(`0 0 ${dim} ${dim}`);
    expect(svgOf(el).getAttribute('width')).toBe(String(dim));
  });

  it('re-encodes when only the level changes', () => {
    const el = mount(`<e-qrcode value="${URL30}" level="L"></e-qrcode>`);
    const low = svgOf(el).querySelector('path')!.getAttribute('d');
    el.setAttribute('level', 'H');
    expect(svgOf(el).getAttribute('viewBox')).toBe('0 0 148 148');
    expect(svgOf(el).querySelector('path')!.getAttribute('d')).not.toBe(low);
    el.removeAttribute('level');
    expect(svgOf(el).getAttribute('viewBox')).toBe('0 0 132 132');
  });

  it.each([
    ['scale="1"', 25],
    ['scale="0"', 25],
    ['scale="-4"', 25],
    ['scale="8"', 200],
    ['scale="1000"', 1600],
    ['scale="abc"', 100],
    ['scale="2.5"', 100],
    ['border="0"', 84],
    ['border="-5"', 84],
    ['border="6"', 132],
    ['border="1000"', 596],
  ])('clamps %s to a %ipx canvas', (attr, dim) => {
    const el = mount(`<e-qrcode value="hello" ${attr}></e-qrcode>`);
    expect(svgOf(el).getAttribute('viewBox')).toBe(`0 0 ${dim} ${dim}`);
  });

  it('re-renders on value, scale and border changes', () => {
    const el = mount(`<e-qrcode value="hello"></e-qrcode>`);
    const first = svgOf(el).querySelector('path')!.getAttribute('d');
    expect(svgOf(el).getAttribute('viewBox')).toBe('0 0 100 100');

    el.setAttribute('scale', '8');
    expect(svgOf(el).getAttribute('viewBox')).toBe('0 0 200 200');

    el.setAttribute('border', '4');
    expect(svgOf(el).getAttribute('viewBox')).toBe('0 0 232 232');

    el.setAttribute('value', 'different');
    expect(svgOf(el).getAttribute('aria-label')).toBe('QR code for different');
    expect(svgOf(el).querySelector('path')!.getAttribute('d')).not.toBe(first);

    el.removeAttribute('scale');
    el.removeAttribute('border');
    expect(svgOf(el).getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('leaves the DOM untouched when a re-render produces identical markup', () => {
    const el = mount(`<e-qrcode value="hello" scale="4"></e-qrcode>`);
    const svg = svgOf(el);
    el.setAttribute('scale', '8');
    expect(svgOf(el)).not.toBe(svg);
    const bigger = svgOf(el);

    el.setAttribute('scale', '8.5'); // non-integer → falls back to the default 4
    expect(svgOf(el)).not.toBe(bigger);
    expect(svgOf(el).getAttribute('viewBox')).toBe('0 0 100 100');

    // Also resolves to 4, so the serialised SVG is byte-identical and the
    // component skips the innerHTML write entirely.
    const reverted = svgOf(el);
    el.setAttribute('scale', 'nonsense');
    expect(svgOf(el)).toBe(reverted);
  });

  it('escapes the value inside the accessible label', () => {
    const el = mount(`<e-qrcode value="&lt;img src=x onerror=1&gt;"></e-qrcode>`);
    const svg = svgOf(el);
    expect(svg.getAttribute('aria-label')).toBe('QR code for <img src=x onerror=1>');
    expect(el.querySelector('img')).toBeNull();
  });

  it('encodes a payload large enough to need a high version with alignment data', () => {
    // 800 bytes at level H selects version 32 (145 modules).
    const el = mount(`<e-qrcode value="${'a'.repeat(800)}" level="H" scale="1"></e-qrcode>`);
    const svg = svgOf(el);
    expect(svg.getAttribute('viewBox')).toBe('0 0 149 149');
    expect(svg.getAttribute('aria-label')).toBe(`QR code for ${'a'.repeat(800)}`);
  });

  it('renders a readable error when the payload does not fit any version', () => {
    const el = mount(`<e-qrcode value="${'a'.repeat(1500)}" level="H"></e-qrcode>`);
    const err = el.querySelector('.ink-qrcode__error')!;
    expect(err.getAttribute('role')).toBe('img');
    expect(err.getAttribute('aria-label')).toBe('QR code error');
    expect(err.textContent).toBe('Data too long for QR code');
    expect(el.querySelector('svg')).toBeNull();

    // The identical failure is not re-written…
    el.setAttribute('scale', '8');
    expect(el.querySelector('.ink-qrcode__error')).toBe(err);
    // …and a valid value recovers.
    el.setAttribute('value', 'short');
    expect(el.querySelector('.ink-qrcode__error')).toBeNull();
    expect(svgOf(el).getAttribute('aria-label')).toBe('QR code for short');
  });

  it('does not rebuild on reconnect', () => {
    const el = mount(`<e-qrcode value="hello"></e-qrcode>`);
    const wrap = el.querySelector('.ink-qrcode')!;
    const parent = el.parentElement!;
    el.remove();
    parent.appendChild(el);
    expect(el.querySelectorAll('.ink-qrcode')).toHaveLength(1);
    expect(el.querySelector('.ink-qrcode')).toBe(wrap);
  });
});

/* ========================================================================= *
 * e-calendar · month announcements
 * ========================================================================= */

describe('e-calendar month change', () => {
  const step = (el: HTMLElement, direction: number): void =>
    el.querySelector<HTMLButtonElement>(`[data-step="${direction}"]`)!.click();

  it('announces the displayed month when a stepper is used', () => {
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    const seen = collect<{ value: string; year: number; month: number }>(el, 'e-month-change');
    step(el, 1);
    expect(seen).toEqual([{ value: '2026-05', year: 2026, month: 5 }]);
    expect(el.querySelector('.ink-calendar__title')!.textContent).toBe('May');
    step(el, -1);
    step(el, -1);
    expect(seen.map((d) => d.value)).toEqual(['2026-05', '2026-04', '2026-03']);
  });

  it('announces a year rollover in both directions', () => {
    const el = mount(`<e-calendar value="2026-12-15"></e-calendar>`);
    const seen = collect<{ value: string; year: number; month: number }>(el, 'e-month-change');
    step(el, 1);
    expect(seen[0]).toEqual({ value: '2027-01', year: 2027, month: 1 });
    step(el, -1);
    expect(seen[1]).toEqual({ value: '2026-12', year: 2026, month: 12 });
  });

  it('announces a month crossed by keyboard navigation, and only then', () => {
    const el = mount(`<e-calendar value="2026-04-01"></e-calendar>`);
    const cell = el.querySelector<HTMLButtonElement>('[data-day="1"]')!;
    cell.focus();
    const seen = collect<{ value: string }>(el, 'e-month-change');
    key(cell, 'ArrowRight');
    // Still inside April — nothing to load.
    expect(seen).toHaveLength(0);
    key(el.querySelector<HTMLButtonElement>('[data-day="2"]')!, 'ArrowUp');
    expect(seen.map((d) => d.value)).toEqual(['2026-03']);
  });

  it('bubbles, so a host can listen on an ancestor', () => {
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    const seen = collect<{ value: string }>(el.parentElement!, 'e-month-change');
    step(el, 1);
    expect(seen.map((d) => d.value)).toEqual(['2026-05']);
  });

  it('does not announce anything when only the selection changes', () => {
    const el = mount(`<e-calendar value="2026-04-15"></e-calendar>`);
    const seen = collect<{ value: string }>(el, 'e-month-change');
    el.querySelector<HTMLButtonElement>('[data-day="20"]')!.click();
    expect(seen).toHaveLength(0);
    expect(el.getAttribute('value')).toBe('2026-04-20');
  });
});

/* ========================================================================= *
 * e-agenda
 * ========================================================================= */

describe('e-agenda', () => {
  const day = [
    { date: '2026-08-28', start: '09:00', end: '10:30', title: 'Standup', status: 'confirmed' },
    { date: '2026-08-28', start: '14:00', end: '15:00', title: 'Review', status: 'tentative' },
    { date: '2026-08-28', title: 'Company offsite' },
  ];
  const mountAgenda = (attrs: string, events: unknown[] = day): HTMLElement =>
    mount(`<e-agenda ${attrs} events='${JSON.stringify(events)}'></e-agenda>`);
  const blocks = (el: HTMLElement): HTMLElement[] => [
    ...el.querySelectorAll<HTMLElement>('.ink-agenda__block'),
  ];
  const gaps = (el: HTMLElement): HTMLElement[] => [
    ...el.querySelectorAll<HTMLElement>('.ink-agenda__gap'),
  ];
  const text = (el: Element, selector: string): string =>
    el.querySelector(selector)!.textContent ?? '';

  it('places timed entries proportionally inside the visible window', () => {
    const el = mountAgenda('date="2026-08-28" start-hour="8" end-hour="18"');
    const [standup, review] = blocks(el);
    // 09:00 is one of ten visible hours past 08:00; 90 minutes is 15% of them.
    expect(standup.style.top).toBe('10%');
    expect(standup.style.height).toBe('15%');
    expect(review.style.top).toBe('60%');
    expect(review.style.height).toBe('10%');
    expect(text(standup, '.ink-agenda__block-time')).toBe('09:00–10:30');
    expect(text(standup, '.ink-agenda__block-label')).toBe('Standup');
    expect(standup.dataset['status']).toBe('confirmed');
    expect(review.dataset['status']).toBe('tentative');
    expect(standup.getAttribute('aria-label')).toBe('09:00–10:30 Standup confirmed');
  });

  it('labels the free stretches between entries', () => {
    const el = mountAgenda('date="2026-08-28" start-hour="8" end-hour="18"');
    expect(gaps(el).map((g) => text(g, '.ink-agenda__block-label'))).toEqual([
      'Free until 09:00',
      'Free until 14:00',
      'Free until 18:00',
    ]);
    expect(gaps(el)[1].style.top).toBe('25%');
    expect(gaps(el)[1].style.height).toBe('35%');
  });

  it('suppresses gaps shorter than min-gap, and all of them on demand', () => {
    // The only free stretch is 10:30–14:00 (210 min); a 240-minute floor
    // would hide that one too.
    const el = mountAgenda('date="2026-08-28" start-hour="9" end-hour="15" min-gap="120"');
    expect(gaps(el).map((g) => text(g, '.ink-agenda__block-label'))).toEqual(['Free until 14:00']);
    el.setAttribute('hide-gaps', '');
    expect(gaps(el)).toHaveLength(0);
    expect(blocks(el)).toHaveLength(2);
  });

  it('lists an entry without a start time as all-day', () => {
    const el = mountAgenda('date="2026-08-28"');
    const allDay = el.querySelector('.ink-agenda__all-day')!;
    expect(allDay.hasAttribute('hidden')).toBe(false);
    expect(text(allDay, '.ink-agenda__all-day-item')).toBe('Company offsite');
    expect(blocks(el)).toHaveLength(2);
  });

  it('hides the all-day row when nothing is all-day', () => {
    const el = mountAgenda('date="2026-08-28"', [
      { date: '2026-08-28', start: '09:00', end: '10:00', title: 'Only timed' },
    ]);
    expect(el.querySelector('.ink-agenda__all-day')!.hasAttribute('hidden')).toBe(true);
  });

  it('renders one track for a day and seven for a week', () => {
    const el = mountAgenda('date="2026-08-28" view="day"');
    expect(el.querySelectorAll('.ink-agenda__track')).toHaveLength(1);
    expect(
      [...el.querySelectorAll('.ink-agenda__col-head')].every((h) => h.hasAttribute('hidden')),
    ).toBe(true);

    el.setAttribute('view', 'week');
    const tracks = [...el.querySelectorAll<HTMLElement>('.ink-agenda__track')];
    expect(tracks).toHaveLength(7);
    // 2026-08-28 is a Friday; the week starts on Monday by default.
    expect(tracks.map((t) => t.dataset['date'])[0]).toBe('2026-08-24');
    expect(tracks[6].dataset['date']).toBe('2026-08-30');
    expect(el.querySelector('.ink-agenda__col-head')!.hasAttribute('hidden')).toBe(false);
    expect(el.querySelector('.ink-agenda__eyebrow')!.textContent).toBe('AGENDA · WEEK');

    el.setAttribute('week-start', '0');
    expect(el.querySelector<HTMLElement>('.ink-agenda__track')!.dataset['date']).toBe('2026-08-23');
  });

  it('draws the now marker only in the matching column', () => {
    const el = mountAgenda('date="2026-08-28" view="week" now="2026-08-28T13:00:00"');
    const markers = [...el.querySelectorAll<HTMLElement>('.ink-agenda__now')];
    expect(markers).toHaveLength(1);
    expect(markers[0].parentElement!.dataset['date']).toBe('2026-08-28');
    expect(markers[0].style.top).toBe('50%');
    expect(markers[0].querySelector('.ink-agenda__now-label')!.textContent).toBe('Now');
  });

  it('accepts a bare HH:MM now in the day view and drops it outside the window', () => {
    const el = mountAgenda('date="2026-08-28" now="13:00"');
    expect(el.querySelectorAll('.ink-agenda__now')).toHaveLength(1);
    el.setAttribute('now', '03:00');
    expect(el.querySelectorAll('.ink-agenda__now')).toHaveLength(0);
    el.setAttribute('now', 'not-a-time');
    expect(el.querySelectorAll('.ink-agenda__now')).toHaveLength(0);
    el.removeAttribute('now');
    expect(el.querySelectorAll('.ink-agenda__now')).toHaveLength(0);
  });

  it('owns no timer: the marker moves only when `now` is rewritten', async () => {
    const el = mountAgenda('date="2026-08-28" now="10:00"');
    const before = el.querySelector<HTMLElement>('.ink-agenda__now')!.style.top;
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(el.querySelector<HTMLElement>('.ink-agenda__now')!.style.top).toBe(before);
    el.setAttribute('now', '15:00');
    expect(el.querySelector<HTMLElement>('.ink-agenda__now')!.style.top).not.toBe(before);
  });

  it('prints one axis tick per visible hour', () => {
    const el = mountAgenda('date="2026-08-28" start-hour="8" end-hour="12"');
    const ticks = [...el.querySelectorAll('.ink-agenda__tick')].map((t) => t.textContent);
    expect(ticks).toEqual(['08:00', '09:00', '10:00', '11:00', '12:00']);
    el.setAttribute('end-hour', '10');
    expect(el.querySelectorAll('.ink-agenda__tick')).toHaveLength(3);
  });

  it('falls back to the whole day when the window is inverted', () => {
    const el = mountAgenda('date="2026-08-28" start-hour="18" end-hour="8"');
    expect(el.querySelectorAll('.ink-agenda__tick')).toHaveLength(25);
  });

  it('clips an entry that starts before or ends after the window', () => {
    const el = mountAgenda('date="2026-08-28" start-hour="10" end-hour="12"', [
      { date: '2026-08-28', start: '08:00', end: '11:00', title: 'Early' },
      { date: '2026-08-28', start: '11:30', end: '16:00', title: 'Late' },
      { date: '2026-08-28', start: '20:00', end: '21:00', title: 'Outside' },
    ]);
    const [early, late] = blocks(el);
    expect(blocks(el)).toHaveLength(2);
    expect(early.style.top).toBe('0%');
    expect(early.style.height).toBe('50%');
    expect(late.style.top).toBe('75%');
    expect(late.style.height).toBe('25%');
  });

  it('treats a missing or inverted end time as a point in time', () => {
    const el = mountAgenda('date="2026-08-28" start-hour="8" end-hour="18" hide-gaps', [
      { date: '2026-08-28', start: '09:00', title: 'Point' },
      { date: '2026-08-28', start: '10:00', end: '09:00', title: 'Inverted' },
    ]);
    expect(blocks(el).map((b) => text(b, '.ink-agenda__block-time'))).toEqual(['09:00', '10:00']);
    expect(blocks(el)[0].style.height).toBe('0%');
  });

  it('reacts to new event data and to a new date', () => {
    const el = mountAgenda('date="2026-08-28" start-hour="8" end-hour="18"');
    expect(blocks(el)).toHaveLength(2);
    el.setAttribute('date', '2026-08-29');
    expect(blocks(el)).toHaveLength(0);
    el.setAttribute(
      'events',
      JSON.stringify([{ date: '2026-08-29', start: '09:00', end: '10:00', title: 'Next day' }]),
    );
    expect(blocks(el).map((b) => text(b, '.ink-agenda__block-label'))).toEqual(['Next day']);
  });

  it.each([
    ['invalid JSON', '{'],
    ['a JSON scalar', '"nope"'],
    ['entries without a title', '[{"date":"2026-08-28"}]'],
    ['a non-string start', '[{"date":"2026-08-28","title":"X","start":9}]'],
  ])('ignores %s', (_label, events) => {
    const el = mount(`<e-agenda date="2026-08-28" events='${events}'></e-agenda>`);
    expect(blocks(el)).toHaveLength(0);
    expect(el.querySelector('.ink-agenda__all-day')!.hasAttribute('hidden')).toBe(true);
  });

  it('ignores an unfamiliar status instead of dropping the entry', () => {
    const el = mountAgenda('date="2026-08-28"', [
      { date: '2026-08-28', start: '09:00', end: '10:00', title: 'Odd', status: 'nonsense' },
    ]);
    expect(blocks(el)).toHaveLength(1);
    expect(blocks(el)[0].dataset['status']).toBeUndefined();
  });

  it('escapes titles and labels coming from attributes', () => {
    const el = mountAgenda('date="2026-08-28" free-label="<svg onload=alert(1)>"', [
      { date: '2026-08-28', start: '09:00', end: '10:00', title: '<img src=x onerror=alert(1)>' },
      { date: '2026-08-28', title: '<script>alert(1)</script>' },
    ]);
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('svg[onload]')).toBeNull();
    expect(text(el, '.ink-agenda__block .ink-agenda__block-label')).toBe(
      '<img src=x onerror=alert(1)>',
    );
    expect(text(el, '.ink-agenda__gap .ink-agenda__block-label')).toBe(
      '<svg onload=alert(1)> 09:00',
    );
  });

  it('honours the locale for its headings', () => {
    const de = mountAgenda('date="2026-08-28" locale="de-DE"');
    const en = mountAgenda('date="2026-08-28" locale="en-GB"');
    expect(de.querySelector('.ink-agenda__title')!.textContent).toContain('Freitag');
    expect(en.querySelector('.ink-agenda__title')!.textContent).toContain('Friday');
  });

  it('falls back to today when the date attribute is missing or malformed', () => {
    const el = mount(`<e-agenda></e-agenda>`);
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(el.querySelector<HTMLElement>('.ink-agenda__track')!.dataset['date']).toBe(expected);
    el.setAttribute('date', 'nonsense');
    expect(el.querySelector<HTMLElement>('.ink-agenda__track')!.dataset['date']).toBe(expected);
  });
});

/* ========================================================================= *
 * e-barcode
 * ========================================================================= */

describe('e-barcode', () => {
  const svg = (el: HTMLElement): SVGSVGElement | null => el.querySelector('svg');
  const bars = (el: HTMLElement): string => svg(el)!.querySelector('path')!.getAttribute('d')!;

  it('renders an EAN-13 as a crisp 1-bit SVG', () => {
    const el = mount(`<e-barcode value="4006381333931"></e-barcode>`);
    const image = svg(el)!;
    expect(image.getAttribute('shape-rendering')).toBe('crispEdges');
    expect(image.getAttribute('role')).toBe('img');
    expect(image.getAttribute('aria-label')).toBe('EAN13 barcode 4006381333931');
    // 95 modules plus two 10-module quiet zones, at 2px each.
    expect(image.getAttribute('width')).toBe('230');
    expect(image.getAttribute('height')).toBe('80');
    expect(image.querySelector('rect')!.getAttribute('fill')).toBe('#fff');
    expect(image.querySelector('path')!.getAttribute('fill')).toBe('#000');
  });

  it('computes a missing check digit and rejects a wrong one', () => {
    const twelve = mount(`<e-barcode value="03600029145"></e-barcode>`);
    // 11 digits: auto-detected as UPC-A, whose twelfth digit is derived.
    expect(svg(twelve)!.getAttribute('aria-label')).toBe('UPCA barcode 036000291452');
    const ean = mount(`<e-barcode value="400638133393" format="ean13"></e-barcode>`);
    expect(svg(ean)!.getAttribute('aria-label')).toBe('EAN13 barcode 4006381333931');
    // Same symbol either way: the check digit is derived, not invented.
    expect(bars(ean)).toBe(bars(mount(`<e-barcode value="4006381333931"></e-barcode>`)));

    const wrong = mount(`<e-barcode value="4006381333930" format="ean13"></e-barcode>`);
    expect(svg(wrong)).toBeNull();
    expect(wrong.querySelector('.ink-barcode__error')!.textContent).toBe(
      'Check digit is 0, expected 1.',
    );
  });

  it('encodes EAN-8 and UPC-A at their own module counts', () => {
    const ean8 = mount(`<e-barcode value="96385074" module-width="1" quiet-zone="0"></e-barcode>`);
    expect(svg(ean8)!.getAttribute('width')).toBe('67');
    const upc = mount(
      `<e-barcode value="036000291452" module-width="1" quiet-zone="0"></e-barcode>`,
    );
    expect(svg(upc)!.getAttribute('width')).toBe('95');
    expect(svg(upc)!.getAttribute('aria-label')).toContain('UPCA');
  });

  it('encodes text as Code 128 and numbers in its compact mode', () => {
    const text = mount(`<e-barcode value="EPAPER-42" module-width="1" quiet-zone="0"></e-barcode>`);
    expect(svg(text)!.getAttribute('aria-label')).toBe('CODE128 barcode EPAPER-42');
    // Start + 9 data + check = 11 symbols of 11 modules, plus a 13-module stop.
    expect(svg(text)!.getAttribute('width')).toBe('134');
    // Code C packs two digits per symbol, so the even-length numeric payload
    // is far shorter than the same digits in Code B would be.
    const digits = mount(
      `<e-barcode value="12345678" format="code128" module-width="1" quiet-zone="0"></e-barcode>`,
    );
    expect(svg(digits)!.getAttribute('width')).toBe('79');
  });

  it('reports the values it cannot encode', () => {
    const short = mount(`<e-barcode value="123" format="ean13"></e-barcode>`);
    expect(short.querySelector('.ink-barcode__error')!.textContent).toBe(
      'EAN13 needs 12 or 13 digits.',
    );
    const letters = mount(`<e-barcode value="ABC" format="ean8"></e-barcode>`);
    expect(letters.querySelector('.ink-barcode__error')!.textContent).toBe(
      'EAN8 accepts digits only.',
    );
    const nonAscii = mount(`<e-barcode value="Grüße" format="code128"></e-barcode>`);
    expect(nonAscii.querySelector('.ink-barcode__error')!.textContent).toContain(
      'Code 128 cannot encode',
    );
  });

  it('shows a placeholder for an empty value', () => {
    const el = mount(`<e-barcode></e-barcode>`);
    expect(el.querySelector('.ink-barcode__empty')!.textContent).toBe('—');
    el.setAttribute('value', '96385074');
    expect(svg(el)).not.toBeNull();
    el.setAttribute('value', '');
    expect(el.querySelector('.ink-barcode__empty')).not.toBeNull();
  });

  it('prints a grouped human-readable line only when asked', () => {
    const el = mount(`<e-barcode value="4006381333931"></e-barcode>`);
    const line = el.querySelector('.ink-barcode__text')!;
    expect(line.hasAttribute('hidden')).toBe(true);
    el.setAttribute('show-text', '');
    expect(line.textContent).toBe('4 006381 333931');
    el.setAttribute('value', '96385074');
    expect(line.textContent).toBe('9638 5074');
    el.setAttribute('value', '036000291452');
    expect(line.textContent).toBe('0 36000 29145 2');
    el.setAttribute('value', 'EPAPER-42');
    expect(line.textContent).toBe('EPAPER-42');
    el.removeAttribute('show-text');
    expect(line.hasAttribute('hidden')).toBe(true);
  });

  it('clamps geometry attributes', () => {
    const el = mount(
      `<e-barcode value="96385074" height="0" module-width="99" quiet-zone="-4"></e-barcode>`,
    );
    expect(svg(el)!.getAttribute('height')).toBe('8');
    // 67 modules at the 16px cap, with no quiet zone.
    expect(svg(el)!.getAttribute('width')).toBe('1072');
  });

  it('escapes an error message built from the value', () => {
    const el = mount(`<e-barcode value="<img src=x onerror=alert(1)>" format="ean8"></e-barcode>`);
    expect(el.querySelector('img')).toBeNull();
  });
});
