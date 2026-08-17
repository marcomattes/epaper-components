import { define, intAttr, patchAttr, patchText } from '../core/dom';

export type StatusBoardStatus = 'ok' | 'warning' | 'critical' | 'offline' | 'neutral';

export interface StatusBoardItem {
  key: string;
  label: string;
  value: string | number;
  status?: StatusBoardStatus;
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

const statusFrom = (value: unknown): StatusBoardStatus => {
  if (value === 'ok' || value === 'warning' || value === 'critical' || value === 'offline') {
    return value;
  }
  return 'neutral';
};

const dataFrom = (raw: string | null): StatusBoardItem[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: StatusBoardItem[] = [];
    const keys = new Set<string>();
    for (const [index, entry] of parsed.entries()) {
      if (!isRecord(entry)) continue;
      const label = typeof entry['label'] === 'string' ? entry['label'] : '';
      const value = entry['value'];
      if (typeof value !== 'string' && typeof value !== 'number') continue;
      const requestedKey =
        typeof entry['key'] === 'string' && entry['key'] ? entry['key'] : String(index);
      const key = keys.has(requestedKey) ? `${requestedKey}-${index}` : requestedKey;
      keys.add(key);
      const item: StatusBoardItem = { key, label, value, status: statusFrom(entry['status']) };
      if (typeof entry['detail'] === 'string') item.detail = entry['detail'];
      items.push(item);
    }
    return items.slice(0, 100);
  } catch {
    return [];
  }
};

const STATUS_META: Record<StatusBoardStatus, { symbol: string; label: string }> = {
  ok: { symbol: '✓', label: 'OK' },
  warning: { symbol: '!', label: 'Warning' },
  critical: { symbol: '×', label: 'Critical' },
  offline: { symbol: '○', label: 'Offline' },
  neutral: { symbol: '—', label: 'Neutral' },
};

/**
 * @summary Stable KPI matrix with text-and-pattern status cues.
 * @since v1.1.0
 *
 * Items are keyed so value-only updates retain each cell's DOM identity and
 * keep e-paper dirty rectangles bounded to the metrics that changed.
 *
 * @attr {string} data - JSON array of `{key, label, value, status?, detail?}` items.
 * @attr {string} [label='Status board'] - Accessible board label and optional heading.
 * @attr {number} [columns=3] - Grid columns (1..6).
 * @attr {string} [empty-text='No metrics'] - Message shown for an empty data set.
 * @attr {boolean} [hide-label] - Hides the visible board heading while retaining its accessible label.
 *
 * @example
 * <e-status-board data='[{"key":"queue","label":"Queue","value":12,"status":"warning"}]'></e-status-board>
 */
export class EStatusBoard extends HTMLElement {
  static observedAttributes = ['data', 'label', 'columns', 'empty-text', 'hide-label'];

  private _wired = false;
  private _heading: HTMLElement | null = null;
  private _grid: HTMLElement | null = null;
  private _empty: HTMLElement | null = null;
  private _cells = new Map<string, StatusCell>();

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

  private _patchCell(cell: StatusCell, item: StatusBoardItem): void {
    const status = item.status ?? 'neutral';
    const meta = STATUS_META[status];
    patchAttr(cell.root, 'data-status', status);
    patchText(cell.label, item.label);
    patchText(cell.value, String(item.value));
    patchText(cell.cue, `${meta.symbol} ${meta.label}`);
    patchText(cell.detail, item.detail ?? '');
    patchAttr(cell.detail, 'hidden', item.detail ? null : '');
    patchAttr(
      cell.root,
      'aria-label',
      `${item.label}: ${item.value}; ${meta.label}${item.detail ? `; ${item.detail}` : ''}`,
    );
  }

  private _patch(): void {
    if (!this._heading || !this._grid || !this._empty) return;
    const items = dataFrom(this.getAttribute('data'));
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
      this._patchCell(cell, item);
      const current = this._grid.children[index] ?? null;
      if (current !== cell.root) this._grid.insertBefore(cell.root, current);
    }

    patchAttr(this._grid, 'hidden', items.length ? null : '');
    patchText(this._empty, this.getAttribute('empty-text') || 'No metrics');
    patchAttr(this._empty, 'hidden', items.length ? '' : null);
  }
}

define('e-status-board', EStatusBoard);
