// Component tests for the Data-Display group:
// e-tag, e-chip, e-empty, e-skeleton, e-progress, e-result, e-list, e-table,
// e-alert, e-collapse, e-tree, e-meter, e-sparkline, e-status-board,
// e-change-marker, e-last-updated and e-diff.
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(async () => {
  await import('../tag/tag');
  await import('../chip/chip');
  await import('../empty/empty');
  await import('../skeleton/skeleton');
  await import('../progress/progress');
  await import('../result/result');
  await import('../list/list');
  await import('../table/table');
  await import('../alert/alert');
  await import('../collapse/collapse');
  await import('../tree/tree');
  await import('../meter/meter');
  await import('../sparkline/sparkline');
  await import('../status-board/status-board');
  await import('../change-marker/change-marker');
  await import('../last-updated/last-updated');
  await import('../diff/diff');
});

/** `<details>` dispatches `toggle` as a queued task, never synchronously. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const mount = <T extends HTMLElement = HTMLElement>(html: string): T => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild as T;
};

describe('e-tag', () => {
  it('renders the label inside .ink-tag', () => {
    const el = mount(`<e-tag>Draft</e-tag>`);
    const span = el.querySelector('.ink-tag')!;
    expect(span).not.toBeNull();
    expect(span.textContent).toContain('Draft');
  });

  it('renders a close button when closable and fires e-close on click', () => {
    const el = mount(`<e-tag closable>Marketing</e-tag>`);
    const btn = el.querySelector<HTMLButtonElement>('.ink-tag__close')!;
    expect(btn).not.toBeNull();
    let fired = 0;
    let detail: { value: string } | null = null;
    el.addEventListener('e-close', (e) => {
      fired++;
      detail = (e as CustomEvent<{ value: string }>).detail;
    });
    btn.click();
    expect(fired).toBe(1);
    expect(detail!.value).toBe('Marketing');
  });

  it('disabled close button does not fire e-close', () => {
    const el = mount(`<e-tag closable disabled>X</e-tag>`);
    let fired = 0;
    el.addEventListener('e-close', () => fired++);
    el.querySelector<HTMLButtonElement>('.ink-tag__close')!.click();
    expect(fired).toBe(0);
  });

  it('removing the closable attribute removes the close button', () => {
    const el = mount(`<e-tag closable>X</e-tag>`);
    expect(el.querySelector('.ink-tag__close')).not.toBeNull();
    el.removeAttribute('closable');
    expect(el.querySelector('.ink-tag__close')).toBeNull();
  });
});

describe('e-chip', () => {
  it('toggles selected and fires e-change on click', () => {
    const el = mount(`<e-chip>Today</e-chip>`);
    const btn = el.querySelector<HTMLButtonElement>('button.ink-chip')!;
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    let detail: { value: boolean } | null = null;
    el.addEventListener('e-change', (e) => {
      detail = (e as CustomEvent<{ value: boolean }>).detail;
    });
    btn.click();
    expect(el.hasAttribute('selected')).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(detail!.value).toBe(true);
    btn.click();
    expect(el.hasAttribute('selected')).toBe(false);
    expect(detail!.value).toBe(false);
  });

  it('disabled chip does not toggle on click', () => {
    const el = mount(`<e-chip disabled>X</e-chip>`);
    const btn = el.querySelector<HTMLButtonElement>('button.ink-chip')!;
    btn.click();
    expect(el.hasAttribute('selected')).toBe(false);
  });

  it('reflects external selected attribute change to aria-pressed', () => {
    const el = mount(`<e-chip>X</e-chip>`);
    const btn = el.querySelector<HTMLButtonElement>('button.ink-chip')!;
    el.setAttribute('selected', '');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('e-empty', () => {
  it('renders icon, title, description', () => {
    const el = mount(`<e-empty title="Nothing here" description="Add an item."></e-empty>`);
    expect(el.querySelector('.ink-empty__title')!.textContent).toBe('Nothing here');
    expect(el.querySelector('.ink-empty__desc')!.textContent).toBe('Add an item.');
    expect(el.querySelector('.ink-empty__icon svg')).not.toBeNull();
  });

  it('places slot="action" content into the action area', () => {
    const el = mount(`<e-empty title="X"><e-button slot="action">Go</e-button></e-empty>`);
    const action = el.querySelector('.ink-empty__action')!;
    expect(action.querySelector('e-button')).not.toBeNull();
  });

  it('escapes title and description (XSS)', () => {
    const el = mount(
      `<e-empty title="<img src=x onerror=alert(1)>" description="<script>x</script>"></e-empty>`,
    );
    expect(el.querySelector('img[onerror]')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
  });

  it('reactively updates title via attribute change', () => {
    const el = mount(`<e-empty title="A"></e-empty>`);
    el.setAttribute('title', 'B');
    expect(el.querySelector('.ink-empty__title')!.textContent).toBe('B');
  });
});

describe('e-skeleton', () => {
  it('renders one block by default', () => {
    const el = mount(`<e-skeleton></e-skeleton>`);
    expect(el.querySelector('.ink-skeleton__block')).not.toBeNull();
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.getAttribute('role')).toBe('status');
  });

  it('renders N text lines when shape="text"', () => {
    const el = mount(`<e-skeleton shape="text" lines="4"></e-skeleton>`);
    expect(el.querySelectorAll('.ink-skeleton__line')).toHaveLength(4);
  });

  it('renders a circle variant', () => {
    const el = mount(`<e-skeleton shape="circle"></e-skeleton>`);
    expect(el.querySelector('.ink-skeleton.ink-skeleton--circle')).not.toBeNull();
  });

  it('respects width/height inline styles on the block', () => {
    const el = mount(`<e-skeleton width="200px" height="40px"></e-skeleton>`);
    const block = el.querySelector<HTMLElement>('.ink-skeleton__block')!;
    expect(block.style.width).toBe('200px');
    expect(block.style.height).toBe('40px');
  });
});

describe('e-progress', () => {
  it('exposes progressbar role with aria-valuenow', () => {
    const el = mount(`<e-progress value="42"></e-progress>`);
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-valuenow')).toBe('42');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
  });

  it('linear variant renders a fill with the right percentage', () => {
    const el = mount(`<e-progress value="25" max="100"></e-progress>`);
    const fill = el.querySelector<HTMLElement>('.ink-progress__fill')!;
    expect(fill.style.width).toBe('25%');
  });

  it('steps variant renders N segments and fills the right amount', () => {
    const el = mount(`<e-progress value="3" max="5" variant="steps" steps="5"></e-progress>`);
    const segs = el.querySelectorAll('.ink-progress__seg');
    expect(segs).toHaveLength(5);
    expect(el.querySelectorAll('.ink-progress__seg[data-on]')).toHaveLength(3);
  });

  it('clamps value to max in aria and fill', () => {
    const el = mount(`<e-progress value="200" max="100"></e-progress>`);
    expect(el.getAttribute('aria-valuenow')).toBe('100');
    const fill = el.querySelector<HTMLElement>('.ink-progress__fill')!;
    expect(fill.style.width).toBe('100%');
  });

  it('hide-label suppresses the visible caption but keeps aria-label', () => {
    const el = mount(`<e-progress value="20" label="Up" hide-label></e-progress>`);
    expect(el.querySelector('.ink-progress__label')).toBeNull();
    expect(el.getAttribute('aria-label')).toBe('Up');
  });

  it('reactively updates value', () => {
    const el = mount(`<e-progress value="10"></e-progress>`);
    el.setAttribute('value', '80');
    const fill = el.querySelector<HTMLElement>('.ink-progress__fill')!;
    expect(fill.style.width).toBe('80%');
  });
});

describe('e-result', () => {
  it('renders the right icon based on status', () => {
    const el = mount(`<e-result status="success" title="Done"></e-result>`);
    expect(el.querySelector('.ink-result')!.getAttribute('data-status')).toBe('success');
    expect(el.querySelector('.ink-result__icon svg')).not.toBeNull();
  });

  it('falls back to status="info" for unknown values', () => {
    const el = mount(`<e-result status="bogus" title="X"></e-result>`);
    expect(el.querySelector('.ink-result')!.getAttribute('data-status')).toBe('info');
  });

  it('escapes title and description', () => {
    const el = mount(
      `<e-result status="error" title='<img src=x onerror=alert(1)>' description='<script>x</script>'></e-result>`,
    );
    expect(el.querySelector('img[onerror]')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
  });

  it('places slot="action" content into the action area', () => {
    const el = mount(
      `<e-result status="404" title="X"><e-button slot="action">Home</e-button></e-result>`,
    );
    expect(el.querySelector('.ink-result__action e-button')).not.toBeNull();
  });

  it('reactively swaps status icon container data attribute', () => {
    const el = mount(`<e-result status="info" title="X"></e-result>`);
    el.setAttribute('status', 'error');
    expect(el.querySelector('.ink-result')!.getAttribute('data-status')).toBe('error');
  });
});

describe('e-list', () => {
  it('renders items as listitem rows', () => {
    const el = mount(
      `<e-list bordered>
        <e-list-item title="A" description="d1"></e-list-item>
        <e-list-item title="B"></e-list-item>
      </e-list>`,
    );
    const items = el.querySelectorAll('e-list-item');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('role')).toBe('listitem');
    expect(el.querySelector('.ink-list')!.getAttribute('role')).toBe('list');
  });

  it('renders title and description per item', () => {
    const el = mount(
      `<e-list><e-list-item title="Hello" description="World"></e-list-item></e-list>`,
    );
    expect(el.querySelector('.ink-list__title')!.textContent).toBe('Hello');
    expect(el.querySelector('.ink-list__desc')!.textContent).toBe('World');
  });

  it('escapes title and description (XSS)', () => {
    const el = mount(
      `<e-list><e-list-item title="<img src=x onerror=alert(1)>" description="<script>x</script>"></e-list-item></e-list>`,
    );
    expect(el.querySelector('img[onerror]')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
  });

  it('renders header-title text', () => {
    const el = mount(
      `<e-list bordered header-title="Files"><e-list-item title="A"></e-list-item></e-list>`,
    );
    expect(el.querySelector('.ink-list__header-title')!.textContent).toBe('Files');
  });

  it('moves leading and trailing slot children into wrappers', () => {
    const el = mount(
      `<e-list>
        <e-list-item title="Anna">
          <e-badge slot="leading">A</e-badge>
          <e-tag slot="trailing">Owner</e-tag>
        </e-list-item>
      </e-list>`,
    );
    expect(el.querySelector('.ink-list__leading e-badge')).not.toBeNull();
    expect(el.querySelector('.ink-list__trailing e-tag')).not.toBeNull();
  });
});

describe('e-table', () => {
  const COLS = JSON.stringify([
    { key: 'name', title: 'Name', sortable: true },
    { key: 'role', title: 'Role' },
  ]);
  const ROWS = JSON.stringify([
    { name: 'Anna', role: 'Editor' },
    { name: 'Ben', role: 'Admin' },
    { name: 'Clara', role: 'Reviewer' },
  ]);

  it('renders a header with the given columns', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}'></e-table>`);
    const ths = el.querySelectorAll('thead th');
    expect(ths).toHaveLength(2);
    expect(ths[0].textContent).toContain('Name');
    expect(ths[1].textContent).toContain('Role');
  });

  it('renders one row per data entry, with cells in column order', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}'></e-table>`);
    const rows = el.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    const firstCells = rows[0].querySelectorAll('td');
    expect(firstCells[0].textContent).toBe('Anna');
    expect(firstCells[1].textContent).toBe('Editor');
  });

  it('shows the empty state when data is []', () => {
    const el = mount(`<e-table columns='${COLS}' data='[]' empty-text="Nothing"></e-table>`);
    expect(el.querySelector('.ink-table__empty')!.textContent).toBe('Nothing');
  });

  it('renders cell content via textContent (no XSS)', () => {
    const evil = JSON.stringify([{ name: '<img src=x onerror=alert(1)>', role: 'X' }]);
    const el = mount(`<e-table columns='${COLS}' data='${evil}'></e-table>`);
    expect(el.querySelector('img[onerror]')).toBeNull();
  });

  it('cycles sort direction none → asc → desc → none and emits e-sort', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}'></e-table>`);
    let last: { key: string; direction: string } | null = null;
    let count = 0;
    el.addEventListener('e-sort', (e) => {
      count++;
      last = (e as CustomEvent<{ key: string; direction: string }>).detail;
    });
    const btn = el.querySelector<HTMLButtonElement>('[data-sort-key="name"]')!;
    btn.click();
    expect(el.getAttribute('sort')).toBe('name:asc');
    expect(last!.direction).toBe('asc');
    el.querySelector<HTMLButtonElement>('[data-sort-key="name"]')!.click();
    expect(el.getAttribute('sort')).toBe('name:desc');
    el.querySelector<HTMLButtonElement>('[data-sort-key="name"]')!.click();
    expect(el.hasAttribute('sort')).toBe(false);
    expect(count).toBe(3);
  });

  it('updates aria-sort on sort change', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}'></e-table>`);
    const btn = el.querySelector<HTMLButtonElement>('[data-sort-key="name"]')!;
    btn.click();
    const th = el.querySelector<HTMLElement>('thead th[data-key="name"]')!;
    expect(th.getAttribute('aria-sort')).toBe('ascending');
  });

  it('selectable adds a leading checkbox column and tracks selection', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}' selectable></e-table>`);
    const headerCb = el.querySelector<HTMLInputElement>('thead .ink-table__cb')!;
    expect(headerCb).not.toBeNull();

    let detail: { value: number[] } | null = null;
    el.addEventListener('e-select', (e) => {
      detail = (e as CustomEvent<{ value: number[] }>).detail;
    });
    const rowCb = el.querySelector<HTMLInputElement>('tbody .ink-table__cb[data-row-index="1"]')!;
    rowCb.checked = true;
    rowCb.dispatchEvent(new Event('change', { bubbles: true }));
    expect(detail!.value).toEqual([1]);
    expect(el.getAttribute('selected')).toBe('1');
  });

  it('selectable: header checkbox toggles all rows', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}' selectable></e-table>`);
    const getHeaderCb = () => el.querySelector<HTMLInputElement>('thead .ink-table__cb')!;
    let headerCb = getHeaderCb();
    headerCb.checked = true;
    headerCb.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.getAttribute('selected')).toBe('0,1,2');
    // The render rebuilt the DOM — re-query the freshly created header checkbox.
    headerCb = getHeaderCb();
    headerCb.checked = false;
    headerCb.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.hasAttribute('selected')).toBe(false);
  });

  it('non-sortable columns do not render a sort button', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}'></e-table>`);
    expect(el.querySelector('[data-sort-key="role"]')).toBeNull();
    expect(el.querySelector('[data-sort-key="name"]')).not.toBeNull();
  });

  it('handles invalid JSON gracefully (no rows)', () => {
    const el = mount(`<e-table columns='not json' data='also not'></e-table>`);
    expect(el.querySelector('thead th')).toBeNull();
    expect(el.querySelector('.ink-table__empty')).not.toBeNull();
  });
});

describe('e-table keyed row diffing', () => {
  const KCOLS = JSON.stringify([
    { key: 'id', title: 'ID' },
    { key: 'name', title: 'Name' },
    { key: 'role', title: 'Role' },
  ]);
  const row = (id: string, name: string, role: string) => ({ id, name, role });
  const KROWS = JSON.stringify([row('a', 'Anna', 'Editor'), row('b', 'Ben', 'Admin')]);

  const keyed = (data: unknown[]): string => JSON.stringify(data);
  const bodyRows = (el: HTMLElement) => [...el.querySelectorAll('tbody tr')];

  it('keeps every row node and patches only the cell whose value changed', () => {
    const el = mount(`<e-table row-key="id" columns='${KCOLS}' data='${KROWS}'></e-table>`);
    const table = el.querySelector('table')!;
    const before = bodyRows(el);
    const cells = [...before[0].querySelectorAll('td')];

    el.setAttribute('data', keyed([row('a', 'Anna', 'Lead'), row('b', 'Ben', 'Admin')]));

    // Same <table>, same <tr>s, same <td>s — nothing was recreated.
    expect(el.querySelector('table')).toBe(table);
    expect(bodyRows(el)).toEqual(before);
    expect([...before[0].querySelectorAll('td')]).toEqual(cells);
    expect(cells[2].textContent).toBe('Lead');
    expect(cells[1].textContent).toBe('Anna');
  });

  it('moves re-ordered rows with insertBefore instead of recreating them', () => {
    const el = mount(`<e-table row-key="id" columns='${KCOLS}' data='${KROWS}'></e-table>`);
    const [anna, ben] = bodyRows(el);

    el.setAttribute('data', keyed([row('b', 'Ben', 'Admin'), row('a', 'Anna', 'Editor')]));

    expect(bodyRows(el)).toEqual([ben, anna]);
  });

  it('removes dropped rows and creates only the genuinely new ones', () => {
    const el = mount(`<e-table row-key="id" columns='${KCOLS}' data='${KROWS}'></e-table>`);
    const [anna, ben] = bodyRows(el);

    el.setAttribute('data', keyed([row('b', 'Ben', 'Admin'), row('c', 'Clara', 'Reviewer')]));
    const after = bodyRows(el);
    expect(after[0]).toBe(ben);
    expect(after).toHaveLength(2);
    expect(after[1]).not.toBe(anna);
    expect(after[1].querySelector('td')!.textContent).toBe('c');
    expect(anna.isConnected).toBe(false);
  });

  it('diffs by row index when row-key is absent', () => {
    const el = mount(`<e-table columns='${KCOLS}' data='${KROWS}'></e-table>`);
    const before = bodyRows(el);
    el.setAttribute('data', keyed([row('a', 'Anna', 'Editor'), row('b', 'Ben', 'Owner')]));
    expect(bodyRows(el)).toEqual(before);
    expect([...before[1].querySelectorAll('td')][2].textContent).toBe('Owner');
  });

  it('disambiguates duplicate row-key values instead of collapsing the rows', () => {
    const el = mount(
      `<e-table row-key="id" columns='${KCOLS}' data='${keyed([row('a', 'Anna', 'Editor'), row('a', 'Ada', 'Admin')])}'></e-table>`,
    );
    const rows = bodyRows(el);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => [...r.querySelectorAll('td')][1].textContent)).toEqual(['Anna', 'Ada']);
  });

  it('swaps between the row set and the empty state without rebuilding the table', () => {
    const el = mount(`<e-table row-key="id" columns='${KCOLS}' data='${KROWS}'></e-table>`);
    const table = el.querySelector('table')!;

    el.setAttribute('data', '[]');
    expect(el.querySelector('table')).toBe(table);
    expect(bodyRows(el)).toHaveLength(1);
    expect(el.querySelector('.ink-table__empty')!.textContent).toBe('No data');

    el.setAttribute('empty-text', 'Nothing');
    expect(el.querySelector('.ink-table__empty')!.textContent).toBe('Nothing');

    el.setAttribute('data', KROWS);
    expect(el.querySelector('table')).toBe(table);
    expect(el.querySelector('.ink-table__empty')).toBeNull();
    expect(bodyRows(el)).toHaveLength(2);
  });

  it('re-indexes checkboxes when rows are re-ordered so selection stays correct', () => {
    const el = mount(
      `<e-table row-key="id" selectable columns='${KCOLS}' data='${KROWS}'></e-table>`,
    );
    const [anna] = bodyRows(el);
    el.setAttribute('data', keyed([row('b', 'Ben', 'Admin'), row('a', 'Anna', 'Editor')]));

    const annaCb = anna.querySelector<HTMLInputElement>('.ink-table__cb')!;
    expect(annaCb.dataset['rowIndex']).toBe('1');
    expect(annaCb.getAttribute('aria-label')).toBe('Select row 2');

    let detail: { value: number[] } | null = null;
    el.addEventListener('e-select', (e) => {
      detail = (e as CustomEvent<{ value: number[] }>).detail;
    });
    annaCb.checked = true;
    annaCb.dispatchEvent(new Event('change', { bubbles: true }));
    expect(detail!.value).toEqual([1]);
    expect(anna.hasAttribute('data-selected')).toBe(true);
  });

  it('still rebuilds when columns change', () => {
    const el = mount(`<e-table row-key="id" columns='${KCOLS}' data='${KROWS}'></e-table>`);
    const before = bodyRows(el);
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: 'Name' }]));
    expect(el.querySelectorAll('thead th')).toHaveLength(1);
    expect(bodyRows(el)[0]).not.toBe(before[0]);
    expect(bodyRows(el)[0].querySelectorAll('td')).toHaveLength(1);
  });
});

describe('e-table cell formatting, status and chrome', () => {
  const rows = JSON.stringify([{ amount: 1299.5, ratio: 1234.5, due: '2026-04-09' }]);
  const cells = (el: HTMLElement) => [...el.querySelectorAll<HTMLTableCellElement>('tbody td')];

  it('formats number, currency and date cells through the resolved locale', () => {
    const cols = JSON.stringify([
      { key: 'ratio', title: 'Ratio', format: 'number', precision: 2 },
      { key: 'amount', title: 'Amount', format: 'currency', currency: 'EUR' },
      { key: 'due', title: 'Due', format: 'date' },
    ]);
    const el = mount(`<e-table locale="de-DE" columns='${cols}' data='${rows}'></e-table>`);
    const [ratio, amount, due] = cells(el);
    expect(ratio.textContent).toBe('1.234,50');
    expect(amount.textContent).toContain('1.299,50');
    expect(amount.textContent).toContain('€');
    expect(due.textContent).toBe(
      new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date('2026-04-09')),
    );
  });

  it('leaves cells without a format as the raw string', () => {
    const cols = JSON.stringify([{ key: 'amount', title: 'Amount' }]);
    const el = mount(`<e-table locale="de-DE" columns='${cols}' data='${rows}'></e-table>`);
    expect(cells(el)[0].textContent).toBe('1299.5');
  });

  it('falls back to the raw string when a value cannot be formatted', () => {
    const cols = JSON.stringify([
      { key: 'a', title: 'A', format: 'number' },
      { key: 'b', title: 'B', format: 'date' },
      { key: 'c', title: 'C', format: 'currency' },
    ]);
    const data = JSON.stringify([{ a: 'n/a', b: 'someday', c: 12 }]);
    const el = mount(`<e-table locale="de-DE" columns='${cols}' data='${data}'></e-table>`);
    const [a, b, c] = cells(el);
    expect(a.textContent).toBe('n/a');
    expect(b.textContent).toBe('someday');
    // No `currency` code given → falls back to a plain localized number.
    expect(c.textContent).toBe('12');
  });

  it('mirrors a status column onto data-status without ever rendering markup', () => {
    const cols = JSON.stringify([
      { key: 'line', title: 'Line' },
      { key: 'state', title: 'State', type: 'status' },
    ]);
    const data = JSON.stringify([
      { line: 'L1', state: 'warning' },
      { line: 'L2', state: '<b onclick="x()">boom</b>' },
    ]);
    const el = mount(`<e-table columns='${cols}' data='${data}'></e-table>`);
    const [, first, , second] = cells(el);

    expect(first.className).toBe('ink-table__status');
    expect(first.getAttribute('data-status')).toBe('warning');
    expect(first.textContent).toBe('warning');
    // Unknown values degrade to the neutral token; the text is left untouched.
    expect(second.getAttribute('data-status')).toBe('neutral');
    expect(second.textContent).toBe('<b onclick="x()">boom</b>');
    expect(second.querySelector('b')).toBeNull();

    el.setAttribute('data', JSON.stringify([{ line: 'L1', state: 'critical' }]));
    expect(cells(el)[1]).toBe(first);
    expect(first.getAttribute('data-status')).toBe('critical');
  });

  it('renders a semantic caption and adds, updates and removes it in place', () => {
    const cols = JSON.stringify([{ key: 'line', title: 'Line' }]);
    const el = mount(`<e-table caption="Line throughput" columns='${cols}' data='[]'></e-table>`);
    const table = el.querySelector('table')!;
    const caption = el.querySelector('caption')!;
    expect(caption).toBe(table.firstElementChild);
    expect(caption.textContent).toBe('Line throughput');

    el.setAttribute('caption', 'Line throughput (day)');
    expect(el.querySelector('caption')).toBe(caption);
    expect(caption.textContent).toBe('Line throughput (day)');

    el.removeAttribute('caption');
    expect(el.querySelector('caption')).toBeNull();

    el.setAttribute('caption', 'Back');
    expect(el.querySelector('caption')!.textContent).toBe('Back');
    expect(el.querySelector('caption')).toBe(el.querySelector('table')!.firstElementChild);
  });

  it('hands max-height to CSS as a custom property and leaves sticky-header alone', () => {
    const cols = JSON.stringify([{ key: 'line', title: 'Line' }]);
    const el = mount(
      `<e-table sticky-header max-height="320px" columns='${cols}' data='[]'></e-table>`,
    );
    expect(el.style.getPropertyValue('--ink-table-max-height')).toBe('320px');
    expect(el.hasAttribute('sticky-header')).toBe(true);

    el.setAttribute('max-height', '200px');
    expect(el.style.getPropertyValue('--ink-table-max-height')).toBe('200px');

    el.removeAttribute('max-height');
    expect(el.style.getPropertyValue('--ink-table-max-height')).toBe('');
  });
});

describe('global listener cleanup (data-display)', () => {
  it('e-table cleans up its click and change listeners on disconnect', () => {
    const el = document.createElement('e-table');
    el.setAttribute('columns', '[{"key":"a","title":"A"}]');
    el.setAttribute('data', '[{"a":"1"}]');
    document.body.appendChild(el);

    let removedClick = 0;
    let removedChange = 0;
    const origRemove = el.removeEventListener;
    el.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      if (args[0] === 'click') removedClick++;
      if (args[0] === 'change') removedChange++;
      return origRemove.apply(this, args);
    };
    el.remove();
    el.removeEventListener = origRemove;
    expect(removedClick).toBeGreaterThanOrEqual(1);
    expect(removedChange).toBeGreaterThanOrEqual(1);
  });

  it('e-tag cleans up its close-button listener on disconnect', () => {
    const el = document.createElement('e-tag');
    el.setAttribute('closable', '');
    el.textContent = 'X';
    document.body.appendChild(el);
    const btn = el.querySelector<HTMLButtonElement>('.ink-tag__close')!;
    let removed = 0;
    const origRemove = btn.removeEventListener;
    btn.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      if (args[0] === 'click') removed++;
      return origRemove.apply(this, args);
    };
    el.remove();
    btn.removeEventListener = origRemove;
    expect(removed).toBeGreaterThanOrEqual(1);
  });
});

describe('e-alert', () => {
  it('renders icon, heading and body', () => {
    const el = mount(`<e-alert variant="warning" heading="Battery low">Plug in.</e-alert>`);
    const root = el.querySelector('.ink-alert')!;
    expect(root.getAttribute('data-variant')).toBe('warning');
    expect(el.querySelector('.ink-alert__heading')!.textContent).toBe('Battery low');
    expect(el.querySelector('.ink-alert__body')!.textContent).toContain('Plug in.');
    expect(el.querySelector('.ink-alert__icon svg')).not.toBeNull();
  });

  it('hides the heading when none is given', () => {
    const el = mount(`<e-alert>Body only.</e-alert>`);
    expect(el.querySelector<HTMLElement>('.ink-alert__heading')!.hidden).toBe(true);
  });

  it('uses role=alert only for the error variant', () => {
    expect(
      mount(`<e-alert variant="error"></e-alert>`)
        .querySelector('.ink-alert')!
        .getAttribute('role'),
    ).toBe('alert');
    expect(
      mount(`<e-alert variant="info"></e-alert>`).querySelector('.ink-alert')!.getAttribute('role'),
    ).toBe('status');
  });

  it('hides itself and fires e-close when dismissed', () => {
    const el = mount(`<e-alert heading="Sync paused" closable>Body</e-alert>`);
    const btn = el.querySelector<HTMLButtonElement>('.ink-alert__close')!;
    expect(btn.hidden).toBe(false);
    let detail: { value: string } | null = null;
    el.addEventListener('e-close', (e) => {
      detail = (e as CustomEvent<{ value: string }>).detail;
    });
    btn.click();
    expect(detail).toEqual({ value: 'Sync paused' });
    expect(el.hidden).toBe(true);
  });

  it('keeps the close button hidden unless closable', () => {
    const el = mount(`<e-alert heading="x"></e-alert>`);
    expect(el.querySelector<HTMLButtonElement>('.ink-alert__close')!.hidden).toBe(true);
  });

  it('moves slotted action content into the action area', () => {
    const el = mount(`<e-alert heading="x"><span slot="action" id="act">Retry</span></e-alert>`);
    expect(el.querySelector('.ink-alert__action #act')).not.toBeNull();
  });
});

describe('e-collapse', () => {
  const markup = (attrs = '') => `<e-collapse ${attrs}>
      <e-collapse-panel key="a" heading="A">Body A</e-collapse-panel>
      <e-collapse-panel key="b" heading="B">Body B</e-collapse-panel>
    </e-collapse>`;

  it('renders one details per panel and adopts the body', () => {
    const el = mount(markup());
    const panels = el.querySelectorAll('details');
    expect(panels).toHaveLength(2);
    expect(panels[0]!.querySelector('.ink-collapse__heading')!.textContent).toBe('A');
    expect(panels[0]!.querySelector('.ink-collapse__body')!.textContent).toContain('Body A');
  });

  it('opens the panels named by default-open', () => {
    const el = mount(markup('default-open="b"'));
    const panels = el.querySelectorAll('details');
    expect(panels[0]!.open).toBe(false);
    expect(panels[1]!.open).toBe(true);
  });

  it('reports open keys through e-change', async () => {
    const el = mount(markup());
    const seen: string[][] = [];
    el.addEventListener('e-change', (e) => {
      seen.push((e as CustomEvent<{ value: string[] }>).detail.value);
    });
    el.querySelector('details')!.querySelector('summary')!.click();
    await settle();
    expect(seen).toEqual([['a']]);
  });

  it('closes the other panels in accordion mode without a second e-change', async () => {
    const el = mount(markup('accordion default-open="a"'));
    const seen: string[][] = [];
    el.addEventListener('e-change', (e) => {
      seen.push((e as CustomEvent<{ value: string[] }>).detail.value);
    });
    const panels = el.querySelectorAll('details');
    panels[1]!.querySelector('summary')!.click();
    await settle();
    expect(panels[1]!.open).toBe(true);
    expect(panels[0]!.open).toBe(false);
    // The close the accordion performs itself must not be reported as a change.
    expect(seen).toEqual([['b']]);
  });

  it('keeps only the first declared-open panel in accordion mode', () => {
    const el = mount(markup('accordion default-open="a,b"'));
    const panels = el.querySelectorAll('details');
    expect(panels[0]!.open).toBe(true);
    expect(panels[1]!.open).toBe(false);
  });

  it('does not emit when the value property drives the panels', async () => {
    const el = mount<HTMLElement & { value: string[] }>(markup());
    let fired = 0;
    el.addEventListener('e-change', () => {
      fired++;
    });
    el.value = ['b'];
    await settle();
    expect(el.value).toEqual(['b']);
    expect(fired).toBe(0);
  });

  it('keeps accordion exclusivity when the value property is used', async () => {
    const el = mount<HTMLElement & { value: string[] }>(markup('accordion'));
    el.value = ['a', 'b'];
    await settle();
    // The public API must not reach a state no user interaction could.
    expect(el.value).toEqual(['a']);
  });

  it('refuses to toggle a disabled panel', () => {
    const el = mount(`<e-collapse>
        <e-collapse-panel key="a" heading="A" disabled>Body</e-collapse-panel>
      </e-collapse>`);
    const details = el.querySelector('details')!;
    details.querySelector('summary')!.click();
    expect(details.open).toBe(false);
  });

  it('exposes and accepts open keys via the value property', () => {
    const el = mount<HTMLElement & { value: string[] }>(markup('default-open="a"'));
    expect(el.value).toEqual(['a']);
    el.value = ['b'];
    expect(el.value).toEqual(['b']);
  });
});

describe('e-tree', () => {
  const DATA = JSON.stringify([
    {
      value: 'p',
      label: 'Parent',
      children: [
        { value: 'c1', label: 'C1' },
        { value: 'c2', label: 'C2' },
      ],
    },
    { value: 'leaf', label: 'Leaf' },
  ]);

  it('renders a treeitem per node and expands the defaults', () => {
    const el = mount(`<e-tree data='${DATA}' default-expanded="p"></e-tree>`);
    expect(el.querySelector('[role="tree"]')).not.toBeNull();
    expect(el.querySelector('[data-value="c1"]')).not.toBeNull();
  });

  it('materialises children only when the node is expanded', () => {
    const el = mount(`<e-tree data='${DATA}'></e-tree>`);
    expect(el.querySelector('[data-value="c1"]')).toBeNull();
    el.querySelector<HTMLElement>('[data-expand="p"]')!.click();
    expect(el.querySelector('[data-value="c1"]')).not.toBeNull();
  });

  it('fires e-expand with the new state', () => {
    const el = mount(`<e-tree data='${DATA}'></e-tree>`);
    let detail: { value: string; expanded: boolean } | null = null;
    el.addEventListener('e-expand', (e) => {
      detail = (e as CustomEvent<{ value: string; expanded: boolean }>).detail;
    });
    el.querySelector<HTMLElement>('[data-expand="p"]')!.click();
    expect(detail).toEqual({ value: 'p', expanded: true });
  });

  it('marks the activated row when selectable', () => {
    const el = mount(`<e-tree selectable data='${DATA}' default-expanded="p"></e-tree>`);
    el.querySelector<HTMLElement>('[data-value="c1"]')!.click();
    expect(el.getAttribute('value')).toBe('c1');
    expect(el.querySelector('[data-value="c1"]')!.getAttribute('aria-selected')).toBe('true');
  });

  it('does not mark rows when neither selectable nor checkable', () => {
    const el = mount(`<e-tree data='${DATA}' default-expanded="p"></e-tree>`);
    const row = el.querySelector('[data-value="c1"]')!;
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(row.hasAttribute('aria-selected')).toBe(false);
    expect(el.hasAttribute('value')).toBe(false);
  });

  it('cascades a check down the subtree', () => {
    const el = mount(`<e-tree checkable data='${DATA}' default-expanded="p"></e-tree>`);
    let detail: { value: string[] } | null = null;
    el.addEventListener('e-check', (e) => {
      detail = (e as CustomEvent<{ value: string[] }>).detail;
    });
    el.querySelector<HTMLElement>('[data-value="p"]')!.click();
    expect(detail).toEqual({ value: ['p', 'c1', 'c2'] });
    expect(el.querySelector('[data-value="c1"]')!.getAttribute('aria-checked')).toBe('true');
  });

  it('reports a partially checked parent as mixed', () => {
    const el = mount(`<e-tree checkable data='${DATA}' default-expanded="p"></e-tree>`);
    el.querySelector<HTMLElement>('[data-value="c1"]')!.click();
    expect(el.querySelector('[data-value="p"]')!.getAttribute('aria-checked')).toBe('mixed');
    expect(el.querySelector('[data-value="c2"]')!.getAttribute('aria-checked')).toBe('false');
  });

  it('promotes the parent once every child is checked', () => {
    const el = mount(`<e-tree checkable data='${DATA}' default-expanded="p"></e-tree>`);
    el.querySelector<HTMLElement>('[data-value="c1"]')!.click();
    el.querySelector<HTMLElement>('[data-value="c2"]')!.click();
    expect(el.querySelector('[data-value="p"]')!.getAttribute('aria-checked')).toBe('true');
  });

  it('seeds the checked set from the attribute, cascading down', () => {
    const el = mount(`<e-tree checkable data='${DATA}' checked="p" default-expanded="p"></e-tree>`);
    expect(el.querySelector('[data-value="c2"]')!.getAttribute('aria-checked')).toBe('true');
  });

  it('falls back to an empty tree and fires e-error on bad JSON', () => {
    const wrap = document.createElement('div');
    document.body.appendChild(wrap);
    const el = document.createElement('e-tree');
    let detail: { error: Error; source: string } | null = null;
    el.addEventListener('e-error', (e) => {
      detail = (e as CustomEvent<{ error: Error; source: string }>).detail;
    });
    el.setAttribute('data', '{not json');
    wrap.appendChild(el);
    expect(detail).not.toBeNull();
    expect(detail!.source).toBe('data');
    expect(el.querySelectorAll('.ink-tree__row')).toHaveLength(0);
  });

  it('keeps exactly one visible tabbable row when a selected child is revealed', () => {
    // The selected node starts inside a collapsed branch, so at render time
    // the fallback row owns the tab stop. Expanding must hand it over rather
    // than produce a second one.
    const el = mount(`<e-tree selectable data='${DATA}' value="c1"></e-tree>`);
    const tabbable = () =>
      [...el.querySelectorAll<HTMLElement>('.ink-tree__row')].filter((r) => r.tabIndex === 0);
    expect(tabbable()).toHaveLength(1);

    el.querySelector<HTMLElement>('[data-expand="p"]')!.click();
    expect(tabbable()).toHaveLength(1);
    expect(tabbable()[0]!.dataset['value']).toBe('c1');
  });

  it('never strands the tab stop inside a collapsed branch', () => {
    const el = mount(`<e-tree data='${DATA}' default-expanded="p"></e-tree>`);
    const visibleTabbable = () =>
      [...el.querySelectorAll<HTMLElement>('.ink-tree__row')].filter(
        (r) => r.tabIndex === 0 && r.closest('ul[hidden]') === null,
      );

    el.querySelector<HTMLElement>('[data-value="c2"]')!.focus();
    expect(visibleTabbable()).toHaveLength(1);

    // Collapsing the parent hides the focused row; the stop moves to the parent.
    el.querySelector<HTMLElement>('[data-expand="p"]')!.click();
    const stops = visibleTabbable();
    expect(stops).toHaveLength(1);
    expect(stops[0]!.dataset['value']).toBe('p');
  });
});

describe('e-meter', () => {
  it('renders a discrete accessible measurement', () => {
    const el = mount(`<e-meter label="Battery" value="72" unit="%" segments="10"></e-meter>`);
    expect(el.getAttribute('role')).toBe('meter');
    expect(el.getAttribute('aria-valuenow')).toBe('72');
    expect(el.getAttribute('aria-valuetext')).toBe('72%');
    expect(el.querySelectorAll('.ink-meter__segment')).toHaveLength(10);
    expect(el.querySelectorAll('.ink-meter__segment[data-on]')).toHaveLength(7);
  });

  it('clamps the visual and semantic value to the configured range', () => {
    const el = mount(`<e-meter min="10" max="20" value="50" segments="5"></e-meter>`);
    expect(el.getAttribute('aria-valuenow')).toBe('20');
    expect(el.getAttribute('aria-label')).toBe('Meter');
    expect(el.querySelectorAll('.ink-meter__segment[data-on]')).toHaveLength(5);
  });

  it('updates value and threshold band without replacing segments', () => {
    const el = mount(`<e-meter value="10" low="20" high="80"></e-meter>`);
    const first = el.querySelector('.ink-meter__segment');
    expect(el.querySelector('.ink-meter')!.getAttribute('data-band')).toBe('low');
    el.setAttribute('value', '90');
    expect(el.querySelector('.ink-meter')!.getAttribute('data-band')).toBe('high');
    expect(el.querySelector('.ink-meter__segment')).toBe(first);
  });

  it('renders labels as text', () => {
    const el = mount(`<e-meter></e-meter>`);
    el.setAttribute('label', '<img src=x onerror=alert(1)>');
    expect(el.querySelector('img')).toBeNull();
  });
});

describe('e-sparkline', () => {
  it('plots finite values and exposes the trend as text', () => {
    const el = mount(`<e-sparkline label="Requests" values="[1,3,2,5]"></e-sparkline>`);
    expect(el.getAttribute('role')).toBe('img');
    expect(el.querySelector('.ink-sparkline')!.getAttribute('data-trend')).toBe('up');
    expect(el.querySelector('.ink-sparkline__trend')!.textContent).toContain('Rising');
    expect(el.querySelector('.ink-sparkline__line')!.getAttribute('points')).not.toBe('');
  });

  it('preserves the SVG line when values change', () => {
    const el = mount(`<e-sparkline values="[1,2,3]"></e-sparkline>`);
    const line = el.querySelector('.ink-sparkline__line');
    el.setAttribute('values', '[3,2,1]');
    expect(el.querySelector('.ink-sparkline__line')).toBe(line);
    expect(el.querySelector('.ink-sparkline')!.getAttribute('data-trend')).toBe('down');
  });

  it('falls back to an explicit empty state for invalid JSON', () => {
    const el = mount(`<e-sparkline values="not-json"></e-sparkline>`);
    expect(el.querySelector('.ink-sparkline__empty')!.hasAttribute('hidden')).toBe(false);
    expect(el.getAttribute('aria-label')).toContain('No data');
  });

  it('renders labels as text', () => {
    const el = mount(`<e-sparkline values="[1]"></e-sparkline>`);
    el.setAttribute('label', '<script>alert(1)</script>');
    expect(el.querySelector('script')).toBeNull();
  });
});

describe('e-status-board', () => {
  const DATA = JSON.stringify([
    { key: 'queue', label: 'Queue', value: 12, status: 'warning', detail: '3 delayed' },
    { key: 'workers', label: 'Workers', value: '8 / 8', status: 'ok' },
  ]);

  it('renders keyed KPI cells with visible status words', () => {
    const el = mount(`<e-status-board data='${DATA}' columns="2"></e-status-board>`);
    expect(el.getAttribute('role')).toBe('region');
    expect(el.querySelectorAll('[role="listitem"]')).toHaveLength(2);
    expect(el.querySelector('[data-key="queue"] .ink-status-board__cue')!.textContent).toContain(
      'Warning',
    );
  });

  it('patches a keyed value without replacing its cell', () => {
    const el = mount(`<e-status-board data='${DATA}'></e-status-board>`);
    const queue = el.querySelector('[data-key="queue"]');
    const next = JSON.stringify([
      { key: 'queue', label: 'Queue', value: 9, status: 'ok' },
      { key: 'workers', label: 'Workers', value: '8 / 8', status: 'ok' },
    ]);
    el.setAttribute('data', next);
    expect(el.querySelector('[data-key="queue"]')).toBe(queue);
    expect(queue!.querySelector('.ink-status-board__value')!.textContent).toBe('9');
    expect(queue!.getAttribute('data-status')).toBe('ok');
  });

  it('shows an empty state for malformed data', () => {
    const el = mount(`<e-status-board data="bad" empty-text="No signals"></e-status-board>`);
    expect(el.querySelector('.ink-status-board__empty')!.textContent).toBe('No signals');
    expect(el.querySelector('.ink-status-board__grid')!.hasAttribute('hidden')).toBe(true);
  });

  it('renders data content as text', () => {
    const el = mount(`<e-status-board></e-status-board>`);
    el.setAttribute(
      'data',
      JSON.stringify([{ key: 'x', label: '<img src=x>', value: '<script>x</script>' }]),
    );
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
  });
});

describe('e-change-marker', () => {
  it('marks numeric increases with a delta', () => {
    const el = mount(
      `<e-change-marker label="Temperature" previous="21.8" value="22.4" suffix=" °C" precision="1"></e-change-marker>`,
    );
    expect(el.querySelector('.ink-change-marker')!.getAttribute('data-change')).toBe('up');
    expect(el.querySelector('.ink-change-marker__cue')!.textContent).toContain(
      'Increased by 0.6 °C',
    );
  });

  it('suppresses changes inside the numeric tolerance', () => {
    const el = mount(
      `<e-change-marker previous="10" value="10.4" tolerance="0.5"></e-change-marker>`,
    );
    expect(el.querySelector('.ink-change-marker')!.getAttribute('data-change')).toBe('unchanged');
    expect(el.querySelector('.ink-change-marker__cue')!.hasAttribute('hidden')).toBe(true);
  });

  it('marks text changes and retains the value node on updates', () => {
    const el = mount(
      `<e-change-marker label="Mode" previous="Standby" value="Active"></e-change-marker>`,
    );
    const value = el.querySelector('.ink-change-marker__value');
    expect(el.querySelector('.ink-change-marker')!.getAttribute('data-change')).toBe('changed');
    el.setAttribute('value', 'Standby');
    expect(el.querySelector('.ink-change-marker__value')).toBe(value);
    expect(el.querySelector('.ink-change-marker')!.getAttribute('data-change')).toBe('unchanged');
  });
});

describe('e-last-updated', () => {
  it('computes a deterministic relative age and fresh state', () => {
    const el = mount(
      `<e-last-updated datetime="2026-08-17T14:00:00Z" now="2026-08-17T14:03:00Z"></e-last-updated>`,
    );
    expect(el.querySelector('.ink-last-updated')!.getAttribute('data-freshness')).toBe('fresh');
    expect(el.querySelector('.ink-last-updated__relative')!.textContent).toBe('3 minutes ago');
  });

  it('moves through stale and expired thresholds when now changes', () => {
    const el = mount(
      `<e-last-updated datetime="2026-08-17T14:00:00Z" now="2026-08-17T14:02:00Z" stale-after="60" expired-after="300"></e-last-updated>`,
    );
    const root = el.querySelector('.ink-last-updated')!;
    expect(root.getAttribute('data-freshness')).toBe('stale');
    el.setAttribute('now', '2026-08-17T14:06:00Z');
    expect(root.getAttribute('data-freshness')).toBe('expired');
  });

  it('renders invalid timestamps as unknown', () => {
    const el = mount(`<e-last-updated datetime="not-a-date"></e-last-updated>`);
    expect(el.querySelector('.ink-last-updated')!.getAttribute('data-freshness')).toBe('invalid');
    expect(el.querySelector('.ink-last-updated__relative')!.textContent).toBe('Unknown time');
  });
});

describe('e-diff', () => {
  it('keeps previous and current values visible with a changed cue', () => {
    const el = mount(`<e-diff label="Firmware" before="1.8.4" after="1.9.0"></e-diff>`);
    expect(el.querySelector('.ink-diff')!.getAttribute('data-changed')).toBe('true');
    expect(el.querySelector('.ink-diff__state--before .ink-diff__value')!.textContent).toBe(
      '1.8.4',
    );
    expect(el.querySelector('.ink-diff__state--after .ink-diff__value')!.textContent).toBe('1.9.0');
  });

  it('patches to unchanged without replacing the current value node', () => {
    const el = mount(`<e-diff before="A" after="B"></e-diff>`);
    const current = el.querySelector('.ink-diff__state--after .ink-diff__value');
    el.setAttribute('after', 'A');
    expect(el.querySelector('.ink-diff__state--after .ink-diff__value')).toBe(current);
    expect(el.querySelector('.ink-diff')!.getAttribute('data-changed')).toBe('false');
    expect(el.querySelector('.ink-diff__cue')!.textContent).toBe('= Unchanged');
  });

  it('renders compared values as text', () => {
    const el = mount(`<e-diff></e-diff>`);
    el.setAttribute('after', '<img src=x onerror=alert(1)>');
    expect(el.querySelector('img')).toBeNull();
  });
});
