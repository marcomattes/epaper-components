import {
  addCleanup,
  boolAttr,
  define,
  EpaperElement,
  patchAttr,
  patchBoolAttr,
  patchText,
  runCleanups,
} from '../../core/dom';
import { formatDate, formatNumber, type NumberFormatOptions } from '../../core/format';
import { iconSvg } from '../../core/icons';
import { label as labelOf, t } from '../../core/i18n';

type CellFormat = 'number' | 'currency' | 'date';

interface ColumnDef {
  key: string;
  title: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
  /** Renders the cell value through `core/format`; omit for the raw string. */
  format?: CellFormat;
  /** ISO 4217 code, required for `format: 'currency'`. */
  currency?: string;
  /** Fixed fraction digits for `format: 'number' | 'currency'`. */
  precision?: number;
  /** `'status'` mirrors the cell value onto `data-status` for a CSS-only cue. */
  type?: 'status';
}

type Row = Record<string, unknown>;

/** One rendered row, kept across `data` updates and addressed by its row key. */
interface RowEntry {
  tr: HTMLTableRowElement;
  cb: HTMLInputElement | null;
  cells: HTMLTableCellElement[];
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Status vocabulary, deliberately identical to `e-status-board` so a table
 * cell and a KPI cell carry the same token — and the same CSS cue.
 */
type CellStatus = 'ok' | 'warning' | 'critical' | 'offline' | 'neutral';

const statusToken = (v: unknown): CellStatus => {
  const t = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (t === 'ok' || t === 'warning' || t === 'critical' || t === 'offline') return t;
  return 'neutral';
};

/**
 * Copy the optional presentation fields across, each only when it is actually
 * well-formed. Split out of `sanitizeColumn` so neither half carries the whole
 * validation chain on its own.
 */
const applyColumnOptions = (def: ColumnDef, c: Record<string, unknown>): void => {
  if (typeof c['width'] === 'string') def.width = c['width'];
  const format = c['format'];
  if (format === 'number' || format === 'currency' || format === 'date') def.format = format;
  if (typeof c['currency'] === 'string' && c['currency'] !== '') def.currency = c['currency'];
  const precision = c['precision'];
  if (typeof precision === 'number' && Number.isInteger(precision) && precision >= 0) {
    def.precision = Math.min(20, precision);
  }
  if (c['type'] === 'status') def.type = 'status';
};

/** One column definition, or `null` when the entry is unusable. */
const sanitizeColumn = (c: unknown): ColumnDef | null => {
  if (!isObject(c)) return null;
  const key = typeof c['key'] === 'string' ? c['key'] : '';
  if (!key) return null;
  const align =
    c['align'] === 'right' || c['align'] === 'center' ? (c['align'] as 'right' | 'center') : 'left';
  const def: ColumnDef = {
    key,
    title: typeof c['title'] === 'string' ? c['title'] : key,
    sortable: c['sortable'] === true,
    align,
  };
  applyColumnOptions(def, c);
  return def;
};

const sanitizeColumns = (raw: unknown): ColumnDef[] =>
  Array.isArray(raw)
    ? raw.map((c) => sanitizeColumn(c)).filter((c): c is ColumnDef => c !== null)
    : [];

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

/** Coerce a JSON cell value to a finite number, or NaN when it is not one. */
function cellNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return Number.NaN;
}

/**
 * @summary Data grid with header, optional sort, row-selection and keyed row diffing.
 * @since v1.0.1
 *
 * Sort is **static**: clicking the header toggles `none → asc → desc → none`
 * and emits `e-sort`. The component never re-orders rows itself — owners
 * decide whether to re-fetch or sort client-side. This keeps e-paper
 * refreshes deterministic.
 *
 * ### Row diffing
 *
 * A `data` change never rebuilds the table. Rows are matched by key —
 * `row-key` names the column that carries a stable identity, and without it
 * the row index is the key. Matched rows keep their `<tr>`, their cells are
 * patched with `patchText`/`patchAttr`, new rows are inserted, dropped rows
 * removed, and re-ordered rows moved with `insertBefore` rather than
 * recreated. Only a `columns`, `selectable` or `row-key` change — structural
 * and rare — rebuilds the table, because those alter the cell grid itself.
 * The point is the polling case: a panel re-reading `data` every few seconds
 * repaints the cells that actually changed instead of flashing a full GC16.
 *
 * ### Cell status
 *
 * A column may declare `type: 'status'`. Its value is written to the `<td>`
 * as a `data-status` token (`ok | warning | critical | offline | neutral`)
 * while the cell text stays the author's own wording. This was chosen over a
 * row-level `_status` field because the reported gap is per-cell — an
 * industrial dashboard flags one metric in a row, not the whole row — and
 * over any markup-bearing option because rendering HTML from `data` would be
 * an XSS vector. The visual cue is supplied entirely by `components.css`
 * keyed on `[data-status]`; nothing is interpolated into the DOM as markup.
 *
 * @attr {string} columns - JSON array of column definitions: `[{key, title, sortable?, align?, width?, format?, currency?, precision?, type?}]`.
 * @attr {string} data - JSON array of row objects keyed by `column.key`.
 * @attr {string} [row-key] - Column key whose value identifies a row across `data` updates. Defaults to the row index.
 * @attr {boolean} [selectable] - Renders a leading column of row checkboxes.
 * @attr {string} [selected] - Comma-separated row indices (0-based) that appear selected.
 * @attr {string} [sort] - Current sort indicator as `key:asc` or `key:desc`. Reflects on header click.
 * @attr {string} [empty-text='No data'] - Caption for the empty state.
 * @attr {string} [caption] - Renders a semantic `<caption>` as the table's accessible name.
 * @attr {boolean} [sticky-header] - Pins the header row while the body scrolls. Needs `max-height`. CSS-only.
 * @attr {string} [max-height] - Any CSS length; makes the host scroll vertically at that height.
 *
 * @fires {CustomEvent<{key: string, direction: 'asc'|'desc'|'none'}>} e-sort - Header sort button clicked.
 * @fires {CustomEvent<{value: number[]}>} e-select - Row selection changed. `value` is the new list of selected indices.
 *
 * @example
 * <e-table
 *   columns='[{"key":"name","title":"Name","sortable":true},{"key":"role","title":"Role"}]'
 *   data='[{"name":"Anna","role":"Editor"},{"name":"Ben","role":"Admin"}]'
 *   selectable></e-table>
 *
 * @example
 * <e-table
 *   caption="Line throughput"
 *   row-key="id"
 *   sticky-header
 *   max-height="320px"
 *   columns='[{"key":"id","title":"ID"},{"key":"state","title":"State","type":"status"},{"key":"cost","title":"Cost","format":"currency","currency":"EUR","align":"right"}]'
 *   data='[{"id":"L1","state":"warning","cost":1299.5}]'></e-table>
 */
export class ETable extends EpaperElement {
  static readonly observedAttributes = [
    'columns',
    'data',
    'row-key',
    'selectable',
    'selected',
    'sort',
    'empty-text',
    'caption',
    'max-height',
  ];

  private _wired = false;
  private _columns: ColumnDef[] = [];
  private _rows: Row[] = [];
  private _selected = new Set<number>();

  /* Cached DOM refs — null when table has not been built yet. */
  private _table: HTMLTableElement | null = null;
  private _tbody: HTMLTableSectionElement | null = null;
  private _caption: HTMLTableCaptionElement | null = null;
  private _emptyRow: HTMLTableRowElement | null = null;
  private _headerCb: HTMLInputElement | null = null;
  private _sortBtns = new Map<string, HTMLButtonElement>();
  private _sortIcons = new Map<string, HTMLElement>();
  /** Live rows by row key — the identity map that makes updates surgical. */
  private _rowEntries = new Map<string, RowEntry>();
  private _rowEls: HTMLTableRowElement[] = [];
  private _rowCbs: HTMLInputElement[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._readColumns();
      this._readRows();
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
    if (name === 'caption') {
      this._patchCaption();
      return;
    }
    if (name === 'max-height') {
      this._patchLayout();
      return;
    }
    if (name === 'data' || name === 'empty-text') {
      // The hot path: diff rows in place, never replace the subtree.
      this._readRows();
      this._readSelected();
      this._syncRows();
      this._patchSelected();
      return;
    }
    // columns / selectable / row-key change the cell grid itself → rebuild.
    this._readColumns();
    this._readRows();
    this._readSelected();
    this._build();
  }

  private _readColumns(): void {
    this._columns = sanitizeColumns(parseJson(this.getAttribute('columns'), []));
  }

  private _readRows(): void {
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
      patchBoolAttr(this._rowEls[i], 'data-selected', sel);
      const cb = this._rowCbs[i];
      if (cb && cb.checked !== sel) cb.checked = sel;
    }
  }

  /** Renders/updates/removes the semantic `<caption>` in place. */
  private _patchCaption(): void {
    if (!this._table) return;
    const text = this.getAttribute('caption');
    if (text != null && text !== '') {
      if (!this._caption) {
        const cap = document.createElement('caption');
        cap.className = 'ink-table__caption';
        this._table.insertBefore(cap, this._table.firstChild);
        this._caption = cap;
      }
      patchText(this._caption, text);
    } else if (this._caption) {
      this._caption.remove();
      this._caption = null;
    }
  }

  /**
   * `max-height` is handed to CSS as a custom property; the scroll box and the
   * sticky header itself live entirely in `components.css`.
   */
  private _patchLayout(): void {
    const raw = (this.getAttribute('max-height') || '').trim();
    const cur = this.style.getPropertyValue('--ink-table-max-height');
    if (raw !== '') {
      if (cur !== raw) this.style.setProperty('--ink-table-max-height', raw);
    } else if (cur !== '') {
      this.style.removeProperty('--ink-table-max-height');
    }
  }

  private _buildHeaderCheckboxCell(): HTMLTableCellElement {
    const th = document.createElement('th');
    th.className = 'ink-table__check';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'ink-table__cb';
    cb.setAttribute('aria-label', t(this, 'selectAllRows'));
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

  /** Stable identity per row: the `row-key` column value, else the index. */
  private _rowKeys(): string[] {
    const keyCol = this.getAttribute('row-key');
    const seen = new Set<string>();
    const keys: string[] = [];
    for (let i = 0; i < this._rows.length; i++) {
      let key = `i:${i}`;
      if (keyCol) {
        const v = this._rows[i][keyCol];
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          key = `k:${String(v)}`;
        }
      }
      // A duplicate key would collapse two rows onto one `<tr>`; disambiguate,
      // re-checking the disambiguated form itself — an authored value can
      // collide with it (e.g. keys "a" and "a#2" both present), so keep
      // bumping the suffix until it lands on something nothing else has used.
      if (seen.has(key)) {
        let suffix = i;
        let candidate = `${key}#${suffix}`;
        while (seen.has(candidate)) {
          suffix++;
          candidate = `${key}#${suffix}`;
        }
        key = candidate;
      }
      seen.add(key);
      keys.push(key);
    }
    return keys;
  }

  /** Formats one cell. Without `format` the raw string is returned unchanged. */
  private _cellValue(col: ColumnDef, raw: unknown): string {
    const text = cellText(raw);
    if (!col.format || text === '') return text;
    if (col.format === 'date') {
      if (typeof raw !== 'string' && typeof raw !== 'number') return text;
      return formatDate(this, raw) || text;
    }
    const num = cellNumber(raw);
    if (!Number.isFinite(num)) return text;
    const opts: NumberFormatOptions = {};
    if (col.format === 'currency' && col.currency) opts.currency = col.currency;
    if (col.precision != null) opts.precision = col.precision;
    return formatNumber(this, num, opts) || text;
  }

  /** Creates the DOM for one row. Cell *content* is filled by `_patchRow`. */
  private _makeRow(selectable: boolean): RowEntry {
    const tr = document.createElement('tr');
    let cb: HTMLInputElement | null = null;
    if (selectable) {
      const td = document.createElement('td');
      td.className = 'ink-table__check';
      cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'ink-table__cb';
      td.appendChild(cb);
      tr.appendChild(td);
    }
    const cells: HTMLTableCellElement[] = [];
    for (const col of this._columns) {
      const td = document.createElement('td');
      td.style.textAlign = col.align || 'left';
      if (col.type === 'status') td.className = 'ink-table__status';
      tr.appendChild(td);
      cells.push(td);
    }
    return { tr, cb, cells };
  }

  /** Surgical: patches only the cells whose rendered value actually changed. */
  private _patchRow(entry: RowEntry, row: Row, index: number): void {
    if (entry.cb) {
      patchAttr(entry.cb, 'data-row-index', String(index));
      patchAttr(entry.cb, 'aria-label', t(this, 'selectRow', { index: index + 1 }));
    }
    for (let c = 0; c < this._columns.length; c++) {
      const col = this._columns[c];
      const td = entry.cells[c];
      const raw = row[col.key];
      if (col.type === 'status') patchAttr(td, 'data-status', statusToken(raw));
      patchText(td, this._cellValue(col, raw));
    }
  }

  /** Creates the empty-state row once, then only patches its text/colspan. */
  private _syncEmptyRow(selectable: boolean): void {
    const tbody = this._tbody;
    if (!tbody) return;
    if (!this._emptyRow) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.className = 'ink-table__empty';
      tr.appendChild(td);
      tbody.appendChild(tr);
      this._emptyRow = tr;
    }
    const td = this._emptyRow.firstElementChild as HTMLTableCellElement;
    // colSpan is clamped to >= 1 by the IDL, so a column-less table shows 1.
    const span = Math.max(1, this._columns.length + (selectable ? 1 : 0));
    if (td.colSpan !== span) td.colSpan = span;
    patchText(td, labelOf(this, 'empty-text', 'noData'));
  }

  /**
   * Keyed diff of `_rows` against the live `<tr>` set. Matched rows keep their
   * nodes, missing rows are removed, new rows created, and order is repaired
   * with `insertBefore` — no `replaceChildren` on the update path.
   */
  private _syncRows(): void {
    const tbody = this._tbody;
    if (!tbody) return;
    const selectable = boolAttr(this, 'selectable');
    const keys = this._rowKeys();
    const live = new Set(keys);

    for (const [key, entry] of this._rowEntries) {
      if (!live.has(key)) {
        entry.tr.remove();
        this._rowEntries.delete(key);
      }
    }

    this._rowEls = [];
    this._rowCbs = [];

    if (this._rows.length === 0) {
      this._syncEmptyRow(selectable);
      return;
    }
    if (this._emptyRow) {
      this._emptyRow.remove();
      this._emptyRow = null;
    }

    for (let i = 0; i < this._rows.length; i++) {
      const key = keys[i];
      let entry = this._rowEntries.get(key);
      if (!entry) {
        entry = this._makeRow(selectable);
        this._rowEntries.set(key, entry);
      }
      this._patchRow(entry, this._rows[i], i);
      const current = tbody.children[i] ?? null;
      if (current !== entry.tr) tbody.insertBefore(entry.tr, current);
      this._rowEls.push(entry.tr);
      if (entry.cb) this._rowCbs.push(entry.cb);
    }
  }

  /** Full rebuild — only for columns / selectable / row-key and first render. */
  private _build(): void {
    const selectable = boolAttr(this, 'selectable');
    const sort = this._currentSort();

    this._sortBtns = new Map();
    this._sortIcons = new Map();
    this._rowEntries = new Map();
    this._rowEls = [];
    this._rowCbs = [];
    this._headerCb = null;
    this._caption = null;
    this._emptyRow = null;

    const table = document.createElement('table');
    table.className = 'ink-table';

    // Header
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    if (selectable) headRow.appendChild(this._buildHeaderCheckboxCell());
    for (const col of this._columns) {
      headRow.appendChild(this._buildHeaderCell(col, sort));
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Body — populated through the same keyed path the update path uses.
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    this._table = table;
    this._tbody = tbody;
    this._patchCaption();
    this._syncRows();
    this._patchSelected();
    this._patchLayout();
    this.replaceChildren(table);
  }
}

define('e-table', ETable);
