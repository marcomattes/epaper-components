import { addCleanup, boolAttr, define, patchAttr, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';

interface ColumnDef {
  key: string;
  title: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

type Row = Record<string, unknown>;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const sanitizeColumns = (raw: unknown): ColumnDef[] => {
  if (!Array.isArray(raw)) return [];
  const out: ColumnDef[] = [];
  for (const c of raw) {
    if (!isObject(c)) continue;
    const key = typeof c['key'] === 'string' ? c['key'] : '';
    const title = typeof c['title'] === 'string' ? c['title'] : key;
    if (!key) continue;
    const align =
      c['align'] === 'right' || c['align'] === 'center'
        ? (c['align'] as 'right' | 'center')
        : 'left';
    const def: ColumnDef = {
      key,
      title,
      sortable: c['sortable'] === true,
      align,
    };
    if (typeof c['width'] === 'string') def.width = c['width'];
    out.push(def);
  }
  return out;
};

const sanitizeRows = (raw: unknown): Row[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isObject) as Row[];
};

const parseJson = <T>(s: string | null, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

type SortDir = 'asc' | 'desc' | 'none';

const SORT_ARIA: Record<SortDir, 'ascending' | 'descending' | 'none'> = {
  asc: 'ascending',
  desc: 'descending',
  none: 'none',
};

const SORT_ICON: Record<SortDir, string> = { asc: 'chevU', desc: 'chevD', none: 'arrowU' };

/** Cell text for an arbitrary JSON value — objects/arrays get JSON.stringify instead of "[object Object]". */
function cellText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    // JSON.stringify only throws for a circular reference or a BigInt — never
    // for a primitive, which the checks above already ruled out.
    return Array.isArray(v) ? '[array]' : '[object]';
  }
}

/**
 * @summary Data grid with header, optional sort and row-selection.
 * @since v1.0.1
 *
 * Sort is **static**: clicking the header toggles `none → asc → desc → none`
 * and emits `e-sort`. The component never re-orders rows itself — owners
 * decide whether to re-fetch or sort client-side. This keeps e-paper
 * refreshes deterministic.
 *
 * @attr {string} columns - JSON array of column definitions: `[{key, title, sortable?, align?, width?}]`.
 * @attr {string} data - JSON array of row objects keyed by `column.key`.
 * @attr {boolean} [selectable] - Renders a leading column of row checkboxes.
 * @attr {string} [selected] - Comma-separated row indices (0-based) that appear selected.
 * @attr {string} [sort] - Current sort indicator as `key:asc` or `key:desc`. Reflects on header click.
 * @attr {string} [empty-text='No data'] - Caption for the empty state.
 *
 * @fires {CustomEvent<{key: string, direction: 'asc'|'desc'|'none'}>} e-sort - Header sort button clicked.
 * @fires {CustomEvent<{value: number[]}>} e-select - Row selection changed. `value` is the new list of selected indices.
 *
 * @example
 * <e-table
 *   columns='[{"key":"name","title":"Name","sortable":true},{"key":"role","title":"Role"}]'
 *   data='[{"name":"Anna","role":"Editor"},{"name":"Ben","role":"Admin"}]'
 *   selectable></e-table>
 */
export class ETable extends HTMLElement {
  static readonly observedAttributes = [
    'columns',
    'data',
    'selectable',
    'selected',
    'sort',
    'empty-text',
  ];

  private _wired = false;
  private _columns: ColumnDef[] = [];
  private _rows: Row[] = [];
  private _selected = new Set<number>();

  /* Cached DOM refs — null when table has not been built yet. */
  private _table: HTMLTableElement | null = null;
  private _headerCb: HTMLInputElement | null = null;
  private _sortBtns = new Map<string, HTMLButtonElement>();
  private _sortIcons = new Map<string, HTMLElement>();
  private _rowEls: HTMLTableRowElement[] = [];
  private _rowCbs: HTMLInputElement[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._readData();
      this._readSelected();
      this._build();
    }
    this.addEventListener('click', this._onClick);
    this.addEventListener('change', this._onChange);
    addCleanup(this, () => {
      this.removeEventListener('click', this._onClick);
      this.removeEventListener('change', this._onChange);
    });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    if (name === 'sort') {
      this._patchSort();
      return;
    }
    if (name === 'selected') {
      this._readSelected();
      this._patchSelected();
      return;
    }
    // data / columns / selectable / empty-text → rebuild the whole table.
    this._readData();
    this._readSelected();
    this._build();
  }

  private _readData(): void {
    this._columns = sanitizeColumns(parseJson(this.getAttribute('columns'), []));
    this._rows = sanitizeRows(parseJson(this.getAttribute('data'), []));
  }

  private _readSelected(): void {
    const raw = this.getAttribute('selected') || '';
    const set = new Set<number>();
    for (const part of raw.split(',')) {
      const trimmed = part.trim();
      if (trimmed === '') continue;
      const n = Number(trimmed);
      if (Number.isInteger(n) && n >= 0 && n < this._rows.length) set.add(n);
    }
    this._selected = set;
  }

  private _writeSelected(): void {
    const list = [...this._selected].sort((a, b) => a - b);
    if (list.length === 0) patchAttr(this, 'selected', null);
    else patchAttr(this, 'selected', list.join(','));
  }

  private _currentSort(): { key: string; dir: 'asc' | 'desc' } | null {
    const raw = this.getAttribute('sort');
    if (!raw) return null;
    const idx = raw.indexOf(':');
    if (idx < 0) return null;
    const key = raw.slice(0, idx);
    const dir = raw.slice(idx + 1);
    if (dir !== 'asc' && dir !== 'desc') return null;
    return { key, dir };
  }

  private readonly _onClick = (e: Event): void => {
    const sortBtn = (e.target as Element).closest<HTMLButtonElement>('[data-sort-key]');
    if (sortBtn && this.contains(sortBtn)) {
      const key = sortBtn.dataset['sortKey'] || '';
      const cur = this._currentSort();
      let next: SortDir;
      if (cur?.key !== key) next = 'asc';
      else if (cur.dir === 'asc') next = 'desc';
      else next = 'none';
      if (next === 'none') patchAttr(this, 'sort', null);
      else patchAttr(this, 'sort', `${key}:${next}`);
      this.dispatchEvent(
        new CustomEvent('e-sort', { detail: { key, direction: next }, bubbles: true }),
      );
    }
  };

  private readonly _onChange = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
    if (!this.contains(target)) return;
    const idxRaw = target.dataset['rowIndex'];
    if (idxRaw == null) {
      if (target.checked) {
        for (let i = 0; i < this._rows.length; i++) this._selected.add(i);
      } else {
        this._selected.clear();
      }
    } else {
      const idx = Number(idxRaw);
      if (target.checked) this._selected.add(idx);
      else this._selected.delete(idx);
    }
    // Update selected attribute (triggers attributeChangedCallback → _patchSelected).
    // Do NOT call _build/_render directly to avoid double-rebuild.
    this._writeSelected();
    this.dispatchEvent(
      new CustomEvent('e-select', {
        detail: { value: [...this._selected].sort((a, b) => a - b) },
        bubbles: true,
      }),
    );
  };

  /** Surgical: only touches the two affected sort buttons' aria-sort + icon. */
  private _patchSort(): void {
    if (!this._table) return;
    const sort = this._currentSort();
    for (const [key, btn] of this._sortBtns) {
      const dir: SortDir = sort?.key === key ? sort.dir : 'none';
      this._patchSortButton(key, btn, dir);
    }
  }

  private _patchSortButton(key: string, btn: HTMLButtonElement, dir: SortDir): void {
    btn.closest('th')?.setAttribute('aria-sort', SORT_ARIA[dir]);
    const icon = this._sortIcons.get(key);
    if (!icon) return;
    icon.innerHTML = iconSvg(SORT_ICON[dir], 12);
    icon.style.opacity = dir === 'none' ? '0.5' : '';
  }

  /** Surgical: only toggles data-selected + checkbox state on affected rows. */
  private _patchSelected(): void {
    if (!this._table) return;
    const allSelected = this._rows.length > 0 && this._selected.size === this._rows.length;
    const someSelected = this._selected.size > 0 && !allSelected;
    if (this._headerCb) {
      this._headerCb.checked = allSelected;
      this._headerCb.indeterminate = someSelected;
    }
    for (let i = 0; i < this._rowEls.length; i++) {
      const sel = this._selected.has(i);
      if (sel) this._rowEls[i].dataset.selected = '';
      else delete this._rowEls[i].dataset.selected;
      if (this._rowCbs[i]) this._rowCbs[i].checked = sel;
    }
  }

  private _buildHeaderCheckboxCell(
    allSelected: boolean,
    someSelected: boolean,
  ): HTMLTableCellElement {
    const th = document.createElement('th');
    th.className = 'ink-table__check';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'ink-table__cb';
    cb.setAttribute('aria-label', 'Select all rows');
    cb.checked = allSelected;
    cb.indeterminate = someSelected;
    th.appendChild(cb);
    this._headerCb = cb;
    return th;
  }

  private _buildHeaderCell(
    col: ColumnDef,
    sort: { key: string; dir: 'asc' | 'desc' } | null,
  ): HTMLTableCellElement {
    const th = document.createElement('th');
    th.dataset['key'] = col.key;
    th.style.textAlign = col.align || 'left';
    if (col.width) th.style.width = col.width;
    if (!col.sortable) {
      th.textContent = col.title;
      return th;
    }

    const dir: SortDir = sort?.key === col.key ? sort.dir : 'none';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ink-table__sort';
    btn.dataset['sortKey'] = col.key;
    th.setAttribute('aria-sort', SORT_ARIA[dir]);
    const label = document.createElement('span');
    label.textContent = col.title;
    btn.appendChild(label);
    const icon = document.createElement('span');
    icon.className = 'ink-table__sort-icon';
    icon.innerHTML = iconSvg(SORT_ICON[dir], 12);
    if (dir === 'none') icon.style.opacity = '0.5';
    btn.appendChild(icon);
    th.appendChild(btn);
    this._sortBtns.set(col.key, btn);
    this._sortIcons.set(col.key, icon);
    return th;
  }

  private _buildEmptyRow(colCount: number, emptyText: string): HTMLTableRowElement {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.className = 'ink-table__empty';
    td.colSpan = colCount;
    td.textContent = emptyText;
    tr.appendChild(td);
    return tr;
  }

  private _buildDataRow(row: Row, index: number, selectable: boolean): HTMLTableRowElement {
    const tr = document.createElement('tr');
    if (this._selected.has(index)) tr.dataset.selected = '';
    if (selectable) {
      const td = document.createElement('td');
      td.className = 'ink-table__check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'ink-table__cb';
      cb.dataset['rowIndex'] = String(index);
      cb.setAttribute('aria-label', `Select row ${index + 1}`);
      cb.checked = this._selected.has(index);
      td.appendChild(cb);
      tr.appendChild(td);
      this._rowCbs.push(cb);
    }
    for (const col of this._columns) {
      const td = document.createElement('td');
      td.style.textAlign = col.align || 'left';
      td.textContent = cellText(row[col.key]);
      tr.appendChild(td);
    }
    return tr;
  }

  /** Full rebuild — called on data / columns / selectable / empty-text changes. */
  private _build(): void {
    const selectable = boolAttr(this, 'selectable');
    const sort = this._currentSort();
    const allSelected = this._rows.length > 0 && this._selected.size === this._rows.length;
    const someSelected = this._selected.size > 0 && !allSelected;
    const emptyText = this.getAttribute('empty-text') || 'No data';

    this._sortBtns = new Map();
    this._sortIcons = new Map();
    this._rowEls = [];
    this._rowCbs = [];
    this._headerCb = null;

    const table = document.createElement('table');
    table.className = 'ink-table';

    // Header
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    if (selectable) {
      headRow.appendChild(this._buildHeaderCheckboxCell(allSelected, someSelected));
    }
    for (const col of this._columns) {
      headRow.appendChild(this._buildHeaderCell(col, sort));
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    if (this._rows.length === 0) {
      tbody.appendChild(
        this._buildEmptyRow(this._columns.length + (selectable ? 1 : 0), emptyText),
      );
    } else {
      this._rows.forEach((row, i) => {
        const tr = this._buildDataRow(row, i, selectable);
        tbody.appendChild(tr);
        this._rowEls.push(tr);
      });
    }
    table.appendChild(tbody);

    this._table = table;
    this.replaceChildren(table);
  }
}

define('e-table', ETable);
