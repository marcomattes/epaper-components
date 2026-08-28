import { boolAttr, define, intAttr, patchAttr, patchText } from '../../core/dom';
import { hm, parseHM, parseYMD, ymd } from '../../core/date';
import { isCalendarEvents } from '../../core/data';
import { formatDate } from '../../core/format';
import { label, t } from '../../core/i18n';
import type { CalendarEvent, CalendarEventStatus } from '../../core/types';

const DAY_MINUTES = 24 * 60;
const WEEK_DAYS = 7;
const STATUSES: readonly string[] = ['confirmed', 'tentative', 'cancelled'];

/** A block as it is positioned on the track: percentages of the visible window. */
interface AgendaBlock {
  kind: 'event' | 'gap';
  top: number;
  height: number;
  time: string;
  label: string;
  status: CalendarEventStatus | null;
}

/** One rendered column: the `YYYY-MM-DD` key and the day it was derived from. */
interface AgendaColumn {
  key: string;
  day: Date;
}

/** Shared so `Intl` can cache the formatter — a new literal per call cannot. */
const RANGE_START: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
const RANGE_END: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

const pct = (value: number): number => Math.round(value * 100) / 100;

const readStatus = (raw: string | undefined): CalendarEventStatus | null =>
  raw && STATUSES.includes(raw) ? (raw as CalendarEventStatus) : null;

/** Minutes since midnight for `now`, given as an ISO timestamp or `HH:MM`. */
function readNow(raw: string | null): { date: string | null; minutes: number } | null {
  if (!raw) return null;
  const plain = parseHM(raw);
  if (plain !== null) return { date: null, minutes: plain };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return { date: ymd(parsed), minutes: parsed.getHours() * 60 + parsed.getMinutes() };
}

/**
 * @summary Day or week agenda on a proportional time axis, with the gaps between entries shown.
 * @since v1.3.0
 *
 * Entries are `{date, title, start?, end?, status?}` objects — the same
 * {@link CalendarEvent} shape `<e-calendar>` reads, so one dataset feeds both.
 * An entry without `start` is an all-day entry and is listed above the axis;
 * a timed entry is drawn as a block whose height is its actual duration, and
 * the free time between two blocks is labelled rather than left blank.
 *
 * Like `<e-last-updated>`, the component owns no timer: the "now" marker is
 * drawn only when the `now` attribute is set, and moves only when the host
 * updates it from an existing refresh cycle.
 *
 * @attr {string} [date] - Anchor day in `YYYY-MM-DD`. Defaults to the current date.
 * @attr {'day'|'week'} [view='day'] - Single day, or the week containing `date`.
 * @attr {string} [events='[]'] - JSON-encoded array of `{date, title, start?, end?, status?}`.
 * @attr {number} [start-hour=8] - First hour of the visible axis (0–23).
 * @attr {number} [end-hour=18] - Last hour of the visible axis (1–24).
 * @attr {string} [now] - ISO timestamp or `HH:MM` for the "now" marker. Unset hides it.
 * @attr {number} [week-start=1] - First weekday of the week view (0 = Sunday).
 * @attr {number} [min-gap=15] - Shortest free stretch, in minutes, that still gets a label.
 * @attr {boolean} [hide-gaps] - Hides the free-time labels and draws only the entries.
 * @attr {string} [free-label] - Prefix of a free-time label. Defaults to the string table's `freeUntil`.
 * @attr {string} [all-day-label] - Heading of the all-day row. Defaults to the string table's `allDay`.
 * @attr {string} [now-label] - Label of the "now" marker. Defaults to the string table's `now`.
 * @attr {string} [locale] - Formatting locale for the headings. Defaults to the nearest `lang`, then the document language.
 *
 * @example
 * <e-agenda
 *   date="2026-08-28"
 *   now="2026-08-28T11:20:00"
 *   events='[{"date":"2026-08-28","start":"09:00","end":"10:30","title":"Standup"}]'
 * ></e-agenda>
 */
export class EAgenda extends HTMLElement {
  static readonly observedAttributes = [
    'date',
    'view',
    'events',
    'start-hour',
    'end-hour',
    'now',
    'week-start',
    'min-gap',
    'hide-gaps',
    'free-label',
    'all-day-label',
    'now-label',
    'locale',
  ];

  private _wired = false;
  private readonly _eventMap = new Map<string, CalendarEvent[]>();

  /* DOM references */
  private _root: HTMLElement | null = null;
  private _eyebrow: HTMLElement | null = null;
  private _title: HTMLElement | null = null;
  private _allDay: HTMLElement | null = null;
  private _allDayLabel: HTMLElement | null = null;
  private _allDayList: HTMLElement | null = null;
  private _heads: HTMLElement | null = null;
  private _axis: HTMLElement | null = null;
  private _tracks: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this._parseEvents();
    this._build();
    this._render();
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    if (name === 'events') this._parseEvents();
    this._render();
  }

  private _parseEvents(): void {
    let events: CalendarEvent[] = [];
    try {
      const parsed: unknown = JSON.parse(this.getAttribute('events') || '[]');
      if (isCalendarEvents(parsed)) events = parsed;
    } catch {
      events = [];
    }
    this._eventMap.clear();
    for (const event of events) {
      const day = parseYMD(event.date);
      if (!day) continue;
      const key = ymd(day);
      let bucket = this._eventMap.get(key);
      if (!bucket) {
        bucket = [];
        this._eventMap.set(key, bucket);
      }
      bucket.push(event);
    }
  }

  /* --------------------------------------------------------------- model */

  /** Visible time window in minutes since midnight; always non-empty. */
  private _window(): { start: number; end: number } {
    const startHour = Math.max(0, Math.min(23, intAttr(this, 'start-hour', 8)));
    const endHour = Math.max(1, Math.min(24, intAttr(this, 'end-hour', 18)));
    if (endHour <= startHour) return { start: 0, end: DAY_MINUTES };
    return { start: startHour * 60, end: endHour * 60 };
  }

  /**
   * Dates rendered as columns: one for the day view, seven for the week. Each
   * carries its own `Date`, so no render path has to parse the key back — or
   * carry a fallback for a key that cannot be parsed.
   */
  private _columns(): AgendaColumn[] {
    const anchor = parseYMD(this.getAttribute('date')) ?? new Date();
    if (this.getAttribute('view') !== 'week') return [{ key: ymd(anchor), day: anchor }];
    const weekStart = ((intAttr(this, 'week-start', 1) % WEEK_DAYS) + WEEK_DAYS) % WEEK_DAYS;
    const offset = (anchor.getDay() - weekStart + WEEK_DAYS) % WEEK_DAYS;
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset);
    return Array.from({ length: WEEK_DAYS }, (_unused, index) => {
      const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index);
      return { key: ymd(day), day };
    });
  }

  /** All-day entries of one column, in input order. */
  private _allDayFor(key: string): CalendarEvent[] {
    return (this._eventMap.get(key) ?? []).filter((event) => parseHM(event.start) === null);
  }

  /** Positioned blocks of one column: entries first, then the free stretches. */
  private _blocksFor(key: string): AgendaBlock[] {
    const { start: from, end: to } = this._window();
    const span = to - from;
    const timed = (this._eventMap.get(key) ?? [])
      .map((event) => {
        const startMinutes = parseHM(event.start);
        if (startMinutes === null) return null;
        const endMinutes = parseHM(event.end);
        return {
          start: startMinutes,
          end: endMinutes !== null && endMinutes > startMinutes ? endMinutes : startMinutes,
          event,
        };
      })
      .filter((entry): entry is { start: number; end: number; event: CalendarEvent } => !!entry)
      .filter((entry) => entry.end >= from && entry.start <= to)
      .sort((a, b) => a.start - b.start || a.end - b.end);

    const blocks: AgendaBlock[] = [];
    for (const entry of timed) {
      const top = Math.max(from, entry.start);
      const bottom = Math.min(to, Math.max(entry.end, entry.start));
      blocks.push({
        kind: 'event',
        top: pct(((top - from) / span) * 100),
        height: pct(((bottom - top) / span) * 100),
        time: entry.end > entry.start ? `${hm(entry.start)}–${hm(entry.end)}` : hm(entry.start),
        label: entry.event.title,
        status: readStatus(entry.event.status),
      });
    }

    if (boolAttr(this, 'hide-gaps')) return blocks;

    const minGap = Math.max(1, intAttr(this, 'min-gap', 15));
    const freeLabel = label(this, 'free-label', 'freeUntil');
    const gaps: AgendaBlock[] = [];
    let cursor = from;
    const pushGap = (until: number): void => {
      if (until - cursor < minGap) return;
      gaps.push({
        kind: 'gap',
        top: pct(((cursor - from) / span) * 100),
        height: pct(((until - cursor) / span) * 100),
        time: '',
        label: `${freeLabel} ${hm(until)}`,
        status: null,
      });
    };
    for (const entry of timed) {
      pushGap(Math.min(to, Math.max(from, entry.start)));
      cursor = Math.max(cursor, Math.min(to, entry.end));
    }
    pushGap(to);
    // Gaps render behind the entries: same stacking order as the source data,
    // free stretches first so an entry is never covered by its own gap.
    return [...gaps, ...blocks];
  }

  /* ---------------------------------------------------------------- view */

  private _build(): void {
    const root = document.createElement('div');
    root.className = 'ink-agenda';

    const head = document.createElement('div');
    head.className = 'ink-agenda__head';
    const eyebrow = document.createElement('div');
    eyebrow.className = 'ink-agenda__eyebrow';
    const title = document.createElement('div');
    title.className = 'ink-agenda__title';
    head.append(eyebrow, title);
    root.appendChild(head);

    const allDay = document.createElement('div');
    allDay.className = 'ink-agenda__all-day';
    const allDayLabel = document.createElement('div');
    allDayLabel.className = 'ink-agenda__all-day-label';
    const allDayList = document.createElement('ul');
    allDayList.className = 'ink-agenda__all-day-list';
    allDay.append(allDayLabel, allDayList);
    root.appendChild(allDay);

    const heads = document.createElement('div');
    heads.className = 'ink-agenda__col-heads';
    root.appendChild(heads);

    const body = document.createElement('div');
    body.className = 'ink-agenda__body';
    const axis = document.createElement('div');
    axis.className = 'ink-agenda__axis';
    axis.setAttribute('aria-hidden', 'true');
    const tracks = document.createElement('div');
    tracks.className = 'ink-agenda__tracks';
    body.append(axis, tracks);
    root.appendChild(body);

    this._root = root;
    this._eyebrow = eyebrow;
    this._title = title;
    this._allDay = allDay;
    this._allDayLabel = allDayLabel;
    this._allDayList = allDayList;
    this._heads = heads;
    this._axis = axis;
    this._tracks = tracks;
    this.replaceChildren(root);
  }

  private _render(): void {
    if (!this._root || !this._axis || !this._tracks || !this._heads) return;
    const columns = this._columns();
    const week = columns.length > 1;
    const now = readNow(this.getAttribute('now'));

    patchAttr(this._root, 'data-view', week ? 'week' : 'day');
    this._renderHead(columns, week);
    this._renderAllDay(columns, week);
    this._renderAxis();
    this._syncCount(this._heads, columns.length, 'div', 'ink-agenda__col-head');
    this._syncCount(this._tracks, columns.length, 'div', 'ink-agenda__track');

    columns.forEach(({ key, day }, index) => {
      const headCell = this._heads!.children[index] as HTMLElement;
      patchAttr(headCell, 'hidden', week ? null : '');
      patchText(headCell, this._columnHeading(day));
      patchAttr(headCell, 'data-today', now?.date === key ? 'true' : null);

      const track = this._tracks!.children[index] as HTMLElement;
      // Drives the hour rules in CSS: one custom property per track instead
      // of a DOM node per hour.
      const { start, end } = this._window();
      track.style.setProperty('--ink-agenda-hours', String(Math.max(1, (end - start) / 60)));
      patchAttr(track, 'data-date', key);
      patchAttr(track, 'role', 'list');
      patchAttr(track, 'aria-label', formatDate(this, day, { dateStyle: 'full' }));
      this._renderTrack(track, this._blocksFor(key));
      this._renderNow(track, now, key, columns.length === 1);
    });
  }

  private _columnHeading(day: Date): string {
    return `${formatDate(this, day, { weekday: 'short' })} ${day.getDate()}`;
  }

  private _renderHead(columns: AgendaColumn[], week: boolean): void {
    if (!this._eyebrow || !this._title) return;
    const first = columns[0]!.day;
    const last = columns.at(-1)!.day;
    patchText(this._eyebrow, t(this, week ? 'agendaWeek' : 'agendaDay'));
    patchText(
      this._title,
      week
        ? `${formatDate(this, first, RANGE_START)} – ${formatDate(this, last, RANGE_END)}`
        : formatDate(this, first, { dateStyle: 'full' }),
    );
  }

  private _renderAllDay(columns: AgendaColumn[], week: boolean): void {
    if (!this._allDay || !this._allDayLabel || !this._allDayList) return;
    const entries: Array<{ day: Date; event: CalendarEvent }> = [];
    for (const { key, day } of columns) {
      for (const event of this._allDayFor(key)) entries.push({ day, event });
    }
    patchAttr(this._allDay, 'hidden', entries.length ? null : '');
    patchText(this._allDayLabel, label(this, 'all-day-label', 'allDay'));
    this._syncCount(this._allDayList, entries.length, 'li', 'ink-agenda__all-day-item');
    entries.forEach((entry, index) => {
      const item = this._allDayList!.children[index] as HTMLElement;
      const prefix = week ? `${formatDate(this, entry.day, { weekday: 'short' })} · ` : '';
      patchText(item, `${prefix}${entry.event.title}`);
      patchAttr(item, 'data-status', readStatus(entry.event.status));
    });
  }

  private _renderAxis(): void {
    if (!this._axis) return;
    const { start, end } = this._window();
    const span = end - start;
    const hours = Math.floor(span / 60);
    this._syncCount(this._axis, hours + 1, 'div', 'ink-agenda__tick');
    for (let index = 0; index <= hours; index++) {
      const tick = this._axis.children[index] as HTMLElement;
      const minutes = start + index * 60;
      tick.style.top = `${pct(((minutes - start) / span) * 100)}%`;
      patchText(tick, hm(minutes));
    }
  }

  private _renderTrack(track: HTMLElement, blocks: AgendaBlock[]): void {
    // Blocks are positioned children, the marker is the last child: keep the
    // marker out of the count so it is never recycled as a block.
    const marker = track.querySelector<HTMLElement>('.ink-agenda__now');
    const current = [...track.children].filter((child) => child !== marker);
    for (let index = current.length; index > blocks.length; index--) {
      current[index - 1]?.remove();
    }
    blocks.forEach((block, index) => {
      let element = current[index] as HTMLElement | undefined;
      if (!element) {
        element = document.createElement('div');
        const time = document.createElement('span');
        time.className = 'ink-agenda__block-time';
        const label = document.createElement('span');
        label.className = 'ink-agenda__block-label';
        element.append(time, label);
        track.insertBefore(element, marker);
      }
      element.className = block.kind === 'gap' ? 'ink-agenda__gap' : 'ink-agenda__block';
      element.style.top = `${block.top}%`;
      element.style.height = `${block.height}%`;
      patchAttr(element, 'data-status', block.status);
      patchAttr(element, 'role', 'listitem');
      patchAttr(
        element,
        'aria-label',
        [block.time, block.label, block.status].filter(Boolean).join(' '),
      );
      patchText(element.children[0] as HTMLElement, block.time);
      patchText(element.children[1] as HTMLElement, block.label);
    });
  }

  private _renderNow(
    track: HTMLElement,
    now: { date: string | null; minutes: number } | null,
    key: string,
    single: boolean,
  ): void {
    const { start, end } = this._window();
    const applies =
      !!now &&
      (now.date === null ? single : now.date === key) &&
      now.minutes >= start &&
      now.minutes <= end;
    let marker = track.querySelector<HTMLElement>('.ink-agenda__now');
    if (!applies) {
      marker?.remove();
      return;
    }
    if (!marker) {
      marker = document.createElement('div');
      marker.className = 'ink-agenda__now';
      // The track is a list, so every child of it has to be a list item —
      // and "Now 11:20" reads correctly among the day's entries anyway.
      marker.setAttribute('role', 'listitem');
      const label = document.createElement('span');
      label.className = 'ink-agenda__now-label';
      marker.appendChild(label);
      track.appendChild(marker);
    }
    marker.style.top = `${pct(((now!.minutes - start) / (end - start)) * 100)}%`;
    const nowLabel = label(this, 'now-label', 'now');
    patchText(marker.children[0] as HTMLElement, nowLabel);
    patchAttr(marker, 'aria-label', `${nowLabel} ${hm(now!.minutes)}`);
  }

  /** Grow or shrink `parent` to exactly `count` children of the given shape. */
  private _syncCount(parent: HTMLElement, count: number, tag: string, className: string): void {
    while (parent.children.length > count) parent.lastElementChild!.remove();
    while (parent.children.length < count) {
      const child = document.createElement(tag);
      child.className = className;
      parent.appendChild(child);
    }
  }
}

define('e-agenda', EAgenda);
