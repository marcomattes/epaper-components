import { define, intAttr, patchAttr, patchText } from '../../core/dom';

/** The built-in status vocabulary. `statuses` can add to it at runtime. */
export type StatusBoardStatus = 'ok' | 'warning' | 'critical' | 'offline' | 'neutral';

/** Symbol and text label rendered as a cell's status cue. */
export interface StatusMeta {
  symbol: string;
  label: string;
}

export interface StatusBoardItem {
  key: string;
  label: string;
  value: string | number;
  /** A built-in {@link StatusBoardStatus} or a key declared via `statuses`. */
  status?: string;
  detail?: string;
}

interface StatusCell {
  root: HTMLElement;
  label: HTMLElement;
  value: HTMLElement;
  cue: HTMLElement;
  detail: HTMLElement;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const statusFrom = (value: unknown, known: ReadonlySet<string>): string =>
  typeof value === 'string' && value !== 'neutral' && known.has(value) ? value : 'neutral';

/** Validates and normalizes one raw entry, deduping its key against `keys`. */
function parseStatusItem(
  entry: unknown,
  index: number,
  keys: Set<string>,
  known: ReadonlySet<string>,
): StatusBoardItem | null {
  if (!isRecord(entry)) return null;
  const value = entry['value'];
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const label = typeof entry['label'] === 'string' ? entry['label'] : '';
  const requestedKey =
    typeof entry['key'] === 'string' && entry['key'] ? entry['key'] : String(index);
  const key = keys.has(requestedKey) ? `${requestedKey}-${index}` : requestedKey;
  keys.add(key);
  const item: StatusBoardItem = { key, label, value, status: statusFrom(entry['status'], known) };
  if (typeof entry['detail'] === 'string') item.detail = entry['detail'];
  return item;
}

const dataFrom = (raw: string | null, known: ReadonlySet<string>): StatusBoardItem[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const keys = new Set<string>();
    const items: StatusBoardItem[] = [];
    for (const [index, entry] of parsed.entries()) {
      const item = parseStatusItem(entry, index, keys, known);
      if (item) items.push(item);
    }
    return items.slice(0, 100);
  } catch {
    return [];
  }
};

const STATUS_META: Record<StatusBoardStatus, StatusMeta> = {
  ok: { symbol: '✓', label: 'OK' },
  warning: { symbol: '!', label: 'Warning' },
  critical: { symbol: '×', label: 'Critical' },
  offline: { symbol: '○', label: 'Offline' },
  neutral: { symbol: '—', label: 'Neutral' },
};

/**
 * Merge the author's `statuses` map over the built-ins. A board tracking room
 * occupancy or stock needs "free"/"busy" or "in stock"/"sold out"; bending
 * those onto `ok`/`warning`/`critical` made the cue read wrong. Entries with a
 * missing or non-string `symbol`/`label` are skipped rather than rendering
 * `undefined`, and the five built-ins can be relabelled but not removed.
 */
function metaFrom(raw: string | null): Record<string, StatusMeta> {
  if (!raw) return STATUS_META;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return STATUS_META;
    const merged: Record<string, StatusMeta> = { ...STATUS_META };
    for (const [key, value] of Object.entries(parsed)) {
      if (!key || !isRecord(value)) continue;
      const { symbol, label } = value;
      if (typeof symbol !== 'string' || typeof label !== 'string') continue;
      merged[key] = { symbol, label };
    }
    return merged;
  } catch {
    return STATUS_META;
  }
}

/**
 * @summary Stable KPI matrix with text-and-pattern status cues.
 * @since v1.1.0
 *
 * Items are keyed so value-only updates retain each cell's DOM identity and
 * keep e-paper dirty rectangles bounded to the metrics that changed.
 *
 * @attr {string} data - JSON array of `{key, label, value, status?, detail?}` items.
 * @attr {string} [statuses] - JSON map of extra status keys to `{symbol, label}`, merged over the built-in `ok`/`warning`/`critical`/`offline`/`neutral`.
 * @attr {string} [label='Status board'] - Accessible board label and optional heading.
 * @attr {number} [columns=3] - Grid columns (1..6).
 * @attr {string} [empty-text='No metrics'] - Message shown for an empty data set.
 * @attr {boolean} [hide-label] - Hides the visible board heading while retaining its accessible label.
 *
 * @example
 * <e-status-board data='[{"key":"queue","label":"Queue","value":12,"status":"warning"}]'></e-status-board>
 * @example
 * <e-status-board
 *   statuses='{"free":{"symbol":"○","label":"Frei"},"busy":{"symbol":"●","label":"Belegt"}}'
 *   data='[{"key":"r1","label":"Raum 1","value":"09:00","status":"busy"}]'></e-status-board>
 */
export class EStatusBoard extends HTMLElement {
  static readonly observedAttributes = [
    'data',
    'statuses',
    'label',
    'columns',
    'empty-text',
    'hide-label',
  ];

  private _wired = false;
  private _heading: HTMLElement | null = null;
  private _grid: HTMLElement | null = null;
  private _empty: HTMLElement | null = null;
  private readonly _cells = new Map<string, StatusCell>();

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this.innerHTML = `<section class="ink-status-board">
      <h3 class="ink-status-board__heading"></h3>
      <div class="ink-status-board__grid" role="list"></div>
      <div class="ink-status-board__empty"></div>
    </section>`;
    this._heading = this.querySelector('.ink-status-board__heading');
    this._grid = this.querySelector('.ink-status-board__grid');
    this._empty = this.querySelector('.ink-status-board__empty');
    this._patch();
  }

  attributeChangedCallback() {
    if (this._wired) this._patch();
  }

  private _makeCell(key: string): StatusCell {
    const root = document.createElement('div');
    root.className = 'ink-status-board__cell';
    root.dataset['key'] = key;
    root.setAttribute('role', 'listitem');
    const label = document.createElement('div');
    label.className = 'ink-status-board__label';
    const value = document.createElement('div');
    value.className = 'ink-status-board__value';
    const cue = document.createElement('div');
    cue.className = 'ink-status-board__cue';
    const detail = document.createElement('div');
    detail.className = 'ink-status-board__detail';
    root.append(label, value, cue, detail);
    return { root, label, value, cue, detail };
  }

  private _patchCell(
    cell: StatusCell,
    item: StatusBoardItem,
    meta: Record<string, StatusMeta>,
  ): void {
    const status = item.status ?? 'neutral';
    const cue = meta[status] ?? STATUS_META.neutral;
    patchAttr(cell.root, 'data-status', status);
    patchText(cell.label, item.label);
    patchText(cell.value, String(item.value));
    patchText(cell.cue, `${cue.symbol} ${cue.label}`);
    patchText(cell.detail, item.detail ?? '');
    patchAttr(cell.detail, 'hidden', item.detail ? null : '');
    const detailSuffix = item.detail ? `; ${item.detail}` : '';
    patchAttr(cell.root, 'aria-label', `${item.label}: ${item.value}; ${cue.label}${detailSuffix}`);
  }

  private _patch(): void {
    if (!this._heading || !this._grid || !this._empty) return;
    const meta = metaFrom(this.getAttribute('statuses'));
    const items = dataFrom(this.getAttribute('data'), new Set(Object.keys(meta)));
    const label = this.getAttribute('label') || 'Status board';
    const columns = Math.max(1, Math.min(6, intAttr(this, 'columns', 3)));
    const liveKeys = new Set(items.map((item) => item.key));

    patchAttr(this, 'role', 'region');
    patchAttr(this, 'aria-label', label);
    patchText(this._heading, label);
    patchAttr(this._heading, 'hidden', this.hasAttribute('hide-label') ? '' : null);
    if (this._grid.style.getPropertyValue('--ink-status-columns') !== String(columns)) {
      this._grid.style.setProperty('--ink-status-columns', String(columns));
    }

    for (const [key, cell] of this._cells) {
      if (!liveKeys.has(key)) {
        cell.root.remove();
        this._cells.delete(key);
      }
    }
    for (const [index, item] of items.entries()) {
      let cell = this._cells.get(item.key);
      if (!cell) {
        cell = this._makeCell(item.key);
        this._cells.set(item.key, cell);
      }
      this._patchCell(cell, item, meta);
      const current = this._grid.children[index] ?? null;
      if (current !== cell.root) this._grid.insertBefore(cell.root, current);
    }

    patchAttr(this._grid, 'hidden', items.length ? null : '');
    patchText(this._empty, this.getAttribute('empty-text') || 'No metrics');
    patchAttr(this._empty, 'hidden', items.length ? '' : null);
  }
}

define('e-status-board', EStatusBoard);
