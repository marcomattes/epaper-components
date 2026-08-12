// Component tests for the Data-Display group:
// e-tag, e-chip, e-empty, e-skeleton, e-progress, e-result, e-list, e-table.
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(async () => {
  await import('../tag');
  await import('../chip');
  await import('../empty');
  await import('../skeleton');
  await import('../progress');
  await import('../result');
  await import('../list');
  await import('../table');
});

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
    expect(el.querySelectorAll('.ink-skeleton__line').length).toBe(4);
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
    expect(segs.length).toBe(5);
    expect(el.querySelectorAll('.ink-progress__seg[data-on]').length).toBe(3);
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
    expect(items.length).toBe(2);
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
    expect(ths.length).toBe(2);
    expect(ths[0].textContent).toContain('Name');
    expect(ths[1].textContent).toContain('Role');
  });

  it('renders one row per data entry, with cells in column order', () => {
    const el = mount(`<e-table columns='${COLS}' data='${ROWS}'></e-table>`);
    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
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
