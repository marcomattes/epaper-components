import { boolAttr, define, EpaperElement, intAttr, patchAttr, patchText } from '../../core/dom';
import { isEventLogEntries } from '../../core/data';
import type { EventLogEntry, EventLogSeverity } from '../../core/types';
import { formatDate } from '../../core/format';
import { t } from '../../core/i18n';
import type { LocaleStrings } from '../../core/i18n';

const SEVERITY_META: Record<
  EventLogSeverity,
  { cue: string; key: keyof LocaleStrings; rank: number }
> = {
  info: { cue: 'i', key: 'severityInfo', rank: 0 },
  warning: { cue: '!', key: 'severityWarning', rank: 1 },
  error: { cue: '×', key: 'severityError', rank: 2 },
  critical: { cue: '‼', key: 'severityCritical', rank: 3 },
};

/** Shared so `Intl` can cache the formatter — a new literal per row cannot. */
const TIME_ONLY: Intl.DateTimeFormatOptions = { timeStyle: 'medium' };
const DATE_TIME: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'medium' };

const severityOf = (raw: string | undefined): EventLogSeverity =>
  raw && Object.hasOwn(SEVERITY_META, raw) ? (raw as EventLogSeverity) : 'info';

const timestampOf = (ts: string): number => {
  const parsed = Date.parse(ts);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

/**
 * Newest-or-oldest-first comparator.
 *
 * An unparseable timestamp sorts last rather than "equal to everything":
 * returning 0 for it made the comparator intransitive, so a single bad row
 * could leave the rest of the log out of order.
 */
function byTimestamp(a: EventLogEntry, b: EventLogEntry, direction: number): number {
  const left = timestampOf(a.ts);
  const right = timestampOf(b.ts);
  if (Number.isNaN(left) && Number.isNaN(right)) return 0;
  if (Number.isNaN(left)) return 1;
  if (Number.isNaN(right)) return -1;
  return (left - right) * direction;
}

/**
 * @summary Append-only event and alarm list that inserts new rows instead of re-rendering the log.
 * @since v2.0.0
 *
 * Rows are keyed by `id`. A row that is already on screen keeps its DOM node
 * when the data changes — only the fields that actually differ are patched,
 * and a newly arrived event is inserted as a single node. On an e-paper panel
 * that is the difference between a partial refresh of one row and a full-page
 * GC16 flash of the whole list, which is why this replaces the
 * `<e-timeline>` / `<e-list>` / `<e-table>` workarounds for live logs.
 *
 * @attr {string} [data='[]'] - JSON-encoded array of `{id, ts, message, severity?, source?, acknowledged?}`.
 * @attr {number} [max-items=50] - Rows kept. Entries beyond it are dropped from the tail of the display order.
 * @attr {'newest'|'oldest'} [order='newest'] - Sort direction of the `ts` field.
 * @attr {'time'|'datetime'} [time-format='time'] - Whether a row shows the time alone or the full timestamp.
 * @attr {boolean} [hide-source] - Hides the source column.
 * @attr {string} [locale] - Formatting locale for the timestamps. Defaults to the nearest `lang`, then the document language.
 * @attr {string} [empty-text] - Text shown while the log is empty. Defaults to the string table's `noEvents`.
 *
 * @example
 * <e-event-log
 *   max-items="20"
 *   data='[{"id":"a1","ts":"2026-08-28T09:12:00Z","severity":"warning","source":"LINE-2","message":"Torque out of range"}]'
 * ></e-event-log>
 */
export class EEventLog extends EpaperElement {
  static readonly observedAttributes = [
    'data',
    'max-items',
    'order',
    'time-format',
    'hide-source',
    'locale',
    'empty-text',
  ];

  private _wired = false;
  /** Everything the host has handed in, before ordering and trimming. */
  private _all: EventLogEntry[] = [];
  /** The subset actually rendered, in display order. */
  private _entries: EventLogEntry[] = [];
  private readonly _rows = new Map<string, HTMLElement>();
  private _list: HTMLElement | null = null;
  private _empty: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const root = document.createElement('div');
    root.className = 'ink-event-log';
    const list = document.createElement('ol');
    list.className = 'ink-event-log__list';
    list.setAttribute('aria-live', 'polite');
    const empty = document.createElement('p');
    empty.className = 'ink-event-log__empty';
    root.append(list, empty);
    this._list = list;
    this._empty = empty;
    this.replaceChildren(root);
    this._sync(this._readData());
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    if (name === 'data') this._sync(this._readData());
    else this._paint();
  }

  /** The rows currently held, in display order. */
  get entries(): EventLogEntry[] {
    return this._entries.map((entry) => ({ ...entry }));
  }

  /**
   * Merge new rows into the log. An entry whose `id` is already present
   * replaces that row in place; every other entry is inserted as a new node,
   * leaving the rest of the list untouched.
   *
   * Named `appendEntries` rather than `append`, which `HTMLElement` already
   * defines with an incompatible signature.
   */
  appendEntries(entries: EventLogEntry | EventLogEntry[]): void {
    const incoming = Array.isArray(entries) ? entries : [entries];
    if (!isEventLogEntries(incoming)) return;
    const merged = [...this._all];
    for (const entry of incoming) {
      const index = merged.findIndex((candidate) => candidate.id === entry.id);
      if (index === -1) merged.push(entry);
      else merged[index] = entry;
    }
    this._sync(merged);
  }

  /** Mark one row acknowledged. Returns `false` when no row carries that id. */
  acknowledge(id: string): boolean {
    const entry = this._all.find((candidate) => candidate.id === id);
    if (!entry || entry.acknowledged) return !!entry;
    entry.acknowledged = true;
    const row = this._rows.get(id);
    if (row) this._patchRow(row, entry);
    return true;
  }

  /** Drop every row. */
  clear(): void {
    this._sync([]);
  }

  private _readData(): EventLogEntry[] {
    try {
      const parsed: unknown = JSON.parse(this.getAttribute('data') || '[]');
      return isEventLogEntries(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Take a new set of rows. The full set is kept: `max-items` decides how much
   * is rendered, not how much is remembered, so raising it — or reversing the
   * order — brings the trimmed-off rows back instead of losing them.
   */
  private _sync(next: EventLogEntry[]): void {
    // Copy: `acknowledge()` writes to the held entry, and a component must
    // not mutate the objects its host handed it.
    this._all = next.map((entry) => ({ ...entry }));
    this._paint();
  }

  /**
   * Deduplicate by `id`, sort, then trim.
   *
   * Rows are keyed by `id`, so two entries sharing one would map to the same
   * `<li>`: the log reported more entries than it rendered and the second
   * silently overwrote the first.
   */
  private static _order(
    entries: EventLogEntry[],
    direction: number,
    maxItems: number,
  ): EventLogEntry[] {
    const unique = new Map<string, EventLogEntry>();
    for (const entry of entries) if (!unique.has(entry.id)) unique.set(entry.id, entry);
    return [...unique.values()].sort((a, b) => byTimestamp(a, b, direction)).slice(0, maxItems);
  }

  /** Sort, trim, then reconcile the rendered rows against the result. */
  private _paint(): void {
    if (!this._list || !this._empty) return;
    const direction = this.getAttribute('order') === 'oldest' ? 1 : -1;
    const maxItems = Math.max(1, intAttr(this, 'max-items', 50));
    const ordered = EEventLog._order(this._all, direction, maxItems);
    this._entries = ordered;

    const keep = new Set(ordered.map((entry) => entry.id));
    for (const [id, row] of this._rows) {
      if (!keep.has(id)) {
        row.remove();
        this._rows.delete(id);
      }
    }

    let previous: HTMLElement | null = null;
    for (const entry of ordered) {
      let row = this._rows.get(entry.id);
      if (!row) {
        row = this._buildRow();
        this._rows.set(entry.id, row);
      }
      this._patchRow(row, entry);
      // Insert only when the row is not already in the right place: moving a
      // node that is already correct would dirty the whole list.
      const expected: Element | null = previous
        ? previous.nextElementSibling
        : this._list.firstElementChild;
      if (expected !== row) this._list.insertBefore(row, expected);
      previous = row;
    }

    patchText(this._empty, this.getAttribute('empty-text') || t(this, 'noEvents'));
    patchAttr(this._empty, 'hidden', ordered.length ? '' : null);
    patchAttr(this._list, 'hidden', ordered.length ? null : '');
  }

  private _buildRow(): HTMLElement {
    const row = document.createElement('li');
    row.className = 'ink-event-log__row';
    for (const [tag, className] of [
      ['span', 'ink-event-log__cue'],
      ['time', 'ink-event-log__time'],
      ['span', 'ink-event-log__source'],
      ['span', 'ink-event-log__message'],
      ['span', 'ink-event-log__ack'],
    ] as const) {
      const cell = document.createElement(tag);
      cell.className = className;
      row.appendChild(cell);
    }
    row.children[0].setAttribute('aria-hidden', 'true');
    return row;
  }

  private _patchRow(row: HTMLElement, entry: EventLogEntry): void {
    const severity = severityOf(entry.severity);
    const meta = SEVERITY_META[severity];
    const source = entry.source ?? '';
    const showSource = !!source && !boolAttr(this, 'hide-source');
    const acknowledged = entry.acknowledged === true;

    patchAttr(row, 'data-severity', severity);
    patchAttr(row, 'data-acknowledged', acknowledged ? 'true' : null);
    patchAttr(row, 'data-id', entry.id);

    patchText(row.children[0] as HTMLElement, meta.cue);
    const time = row.children[1] as HTMLTimeElement;
    patchText(time, this._formatTime(entry.ts));
    patchAttr(time, 'datetime', entry.ts);
    // An empty cell keeps its grid column rather than being hidden: a
    // `display: none` child would drop out of the grid and slide every
    // following cell one column to the left, breaking the row alignment.
    patchText(row.children[2] as HTMLElement, showSource ? source : '');
    patchText(row.children[3] as HTMLElement, entry.message);
    patchText(row.children[4] as HTMLElement, acknowledged ? t(this, 'acknowledged') : '');
    patchAttr(
      row,
      'aria-label',
      [t(this, meta.key), this._formatTime(entry.ts), showSource ? source : '', entry.message]
        .filter(Boolean)
        .join(' · '),
    );
  }

  /** An unparsable timestamp is printed verbatim: it is the operator's data. */
  private _formatTime(ts: string): string {
    const parsed = timestampOf(ts);
    if (Number.isNaN(parsed)) return ts;
    const options = this.getAttribute('time-format') === 'datetime' ? DATE_TIME : TIME_ONLY;
    return formatDate(this, parsed, options);
  }
}

define('e-event-log', EEventLog);
