import {
  addCleanup,
  define,
  intAttr,
  patchAttr,
  patchBoolAttr,
  patchText,
  runCleanups,
} from '../../core/dom';
import { iconSvg } from '../../core/icons';
import { formatDate, monthLabel, weekdayLabels } from '../../core/format';
import { parseYMD, ymd } from '../../core/date';
import type { CalendarEvent } from '../../core/types';
import { isCalendarEvents } from '../../core/data';

const DAYS_PER_WEEK = 7;
const CELL_COUNT = 42;

/**
 * @summary Month-grid calendar with selectable day cells and inline event chips.
 * @since v1.0.1
 *
 * The grid is always six weeks of seven days; `week-start` only rotates which
 * weekday sits in the first column, which is the difference between a US and
 * a European wall calendar. Weekday and month names come from `Intl` for the
 * resolved locale.
 *
 * @attr {string} [value] - Currently selected day in `YYYY-MM-DD` format.
 * @attr {string} [events='[]'] - JSON-encoded array of `{date, title}` event objects.
 * @attr {number} [week-start=0] - First column's weekday: 0 = Sunday, 1 = Monday. (since v1.3.0)
 * @attr {string} [eyebrow='CALENDAR · {year}'] - Template above the month name. `{month}` inserts the short localized month, `{year}` the year. (since v1.3.0)
 * @attr {string} [locale] - BCP-47 tag for the weekday, month and day-cell names. Falls back to the nearest `lang`, then the document language. (since v1.3.0)
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user picks a day. `value` is `YYYY-MM-DD`.
 * @fires {CustomEvent<{year: number, month: number}>} e-month-change - Fired after the visible month moved, by the header buttons or by arrow keys crossing a boundary. `month` is zero-based, like `Date#getMonth`. (since v1.3.0)
 *
 * @example
 * <e-calendar value="2025-04-26" events='[{"date":"2025-04-30","title":"Release"}]'></e-calendar>
 * @example
 * <e-calendar locale="de" week-start="1" eyebrow="KALENDER · {year}"></e-calendar>
 */
export class ECalendar extends HTMLElement {
  static readonly observedAttributes = ['value', 'events', 'week-start', 'eyebrow', 'locale'];

  private _wired = false;
  private _view = { y: 2026, m: 0 };
  private _value = '';
  private _events: CalendarEvent[] = [];
  private readonly _eventMap = new Map<string, CalendarEvent[]>();

  /* DOM references */
  private _titleEyebrow: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _dowEls: HTMLElement[] = [];
  private _cells: HTMLButtonElement[] = [];
  private _dayNums: HTMLElement[] = [];
  private _eventContainers: HTMLElement[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const rawValue = this.getAttribute('value') || '';
      this._value = parseYMD(rawValue) ? rawValue : '';
      this._parseEvents();

      const today = new Date();
      const initial = parseYMD(this._value) || today;
      this._view = { y: initial.getFullYear(), m: initial.getMonth() };

      this._build();
      this._patchGrid();
    }

    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
    addCleanup(this, () => this.removeEventListener('keydown', this._onKeydown));
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    if (name === 'events') {
      this._parseEvents();
    } else if (name === 'value') {
      const rawValue = this.getAttribute('value') || '';
      this._value = parseYMD(rawValue) ? rawValue : '';
    }
    this._patchGrid();
  }

  /** First column's weekday, 0 = Sunday. */
  private _weekStart(): number {
    return Math.max(0, Math.min(6, intAttr(this, 'week-start', 0)));
  }

  private _parseEvents(): void {
    try {
      const parsed: unknown = JSON.parse(this.getAttribute('events') || '[]');
      this._events = isCalendarEvents(parsed) ? parsed : [];
    } catch {
      this._events = [];
    }
    this._eventMap.clear();
    for (const ev of this._events) {
      const d = parseYMD(ev.date);
      if (!d) continue;
      const key = ymd(d);
      let arr = this._eventMap.get(key);
      if (!arr) {
        arr = [];
        this._eventMap.set(key, arr);
      }
      arr.push(ev);
    }
  }

  private readonly _onClick = (e: Event): void => {
    const target = e.target as Element;

    const stepBtn = target.closest<HTMLElement>('[data-step]');
    if (stepBtn) {
      const dl = Number(stepBtn.dataset['step']);
      let m = this._view.m + dl;
      let y = this._view.y;
      if (m < 0) {
        m = 11;
        y -= 1;
      }
      if (m > 11) {
        m = 0;
        y += 1;
      }
      this._setView(y, m);
      return;
    }

    const cell = target.closest<HTMLButtonElement>('button.ink-calendar__cell');
    if (cell && !cell.disabled) {
      const d = Number(cell.dataset['day']);
      const value = ymd(new Date(this._view.y, this._view.m, d));
      this.setAttribute('value', value);
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value }, bubbles: true }));
    }
  };

  private readonly _onKeydown = (e: KeyboardEvent): void => {
    const cell = (e.target as Element).closest<HTMLButtonElement>('.ink-calendar__cell');
    if (!cell || cell.disabled || !this.contains(cell)) return;
    const day = Number(cell.dataset['day']);
    let delta: number;
    if (e.key === 'ArrowLeft') delta = -1;
    else if (e.key === 'ArrowRight') delta = 1;
    else if (e.key === 'ArrowUp') delta = -7;
    else if (e.key === 'ArrowDown') delta = 7;
    else if (e.key === 'Home' || e.key === 'End') delta = 0;
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cell.click();
      return;
    } else return;
    e.preventDefault();
    if (e.key === 'Home' || e.key === 'End') {
      const cellIndex = this._cells.indexOf(cell);
      const weekday = cellIndex % 7;
      delta = e.key === 'Home' ? -weekday : 6 - weekday;
    }
    const target = new Date(this._view.y, this._view.m, day + delta);
    this._setView(target.getFullYear(), target.getMonth());
    const next = this._cells.find(
      (candidate) => !candidate.disabled && Number(candidate.dataset['day']) === target.getDate(),
    );
    for (const candidate of this._cells) candidate.tabIndex = candidate === next ? 0 : -1;
    next?.focus();
  };

  /**
   * Moves the visible month, repaints, and only then announces the change —
   * a host reloading that month's events reads a grid that already matches
   * the event detail.
   */
  private _setView(y: number, m: number): void {
    const moved = this._view.y !== y || this._view.m !== m;
    this._view = { y, m };
    this._patchGrid();
    if (!moved) return;
    this.dispatchEvent(
      new CustomEvent('e-month-change', { detail: { year: y, month: m }, bubbles: true }),
    );
  }

  private _svgEl(svg: string): Element | null {
    const tpl = document.createElement('template');
    tpl.innerHTML = svg;
    return tpl.content.firstElementChild;
  }

  private _build(): void {
    const root = document.createElement('div');
    root.className = 'ink-calendar';

    /* Header */
    const head = document.createElement('div');
    head.className = 'ink-calendar__head';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'ink-icon-btn ink-icon-btn--lg';
    prevBtn.dataset['step'] = '-1';
    prevBtn.setAttribute('aria-label', 'Previous month');
    const prevIcon = this._svgEl(iconSvg('chevL', 16));
    if (prevIcon) prevBtn.appendChild(prevIcon);
    head.appendChild(prevBtn);

    const titleWrap = document.createElement('div');
    const eyebrow = document.createElement('div');
    eyebrow.className = 'ink-calendar__title-eyebrow';
    this._titleEyebrow = eyebrow;
    titleWrap.appendChild(eyebrow);

    const titleEl = document.createElement('div');
    titleEl.className = 'ink-calendar__title';
    this._titleEl = titleEl;
    titleWrap.appendChild(titleEl);
    head.appendChild(titleWrap);

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'ink-icon-btn ink-icon-btn--lg';
    nextBtn.dataset['step'] = '1';
    nextBtn.setAttribute('aria-label', 'Next month');
    const nextIcon = this._svgEl(iconSvg('chevR', 16));
    if (nextIcon) nextBtn.appendChild(nextIcon);
    head.appendChild(nextBtn);
    root.appendChild(head);

    /* Grid */
    const grid = document.createElement('div');
    grid.className = 'ink-calendar__grid';
    grid.setAttribute('role', 'grid');

    const headerRow = document.createElement('div');
    headerRow.className = 'ink-calendar__row';
    headerRow.setAttribute('role', 'row');
    this._dowEls = [];
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
      const dow = document.createElement('div');
      dow.className = 'ink-calendar__dow';
      dow.setAttribute('role', 'columnheader');
      headerRow.appendChild(dow);
      this._dowEls.push(dow);
    }
    grid.appendChild(headerRow);

    this._cells = [];
    this._dayNums = [];
    this._eventContainers = [];

    for (let row = 0; row < CELL_COUNT / DAYS_PER_WEEK; row++) {
      const weekRow = document.createElement('div');
      weekRow.className = 'ink-calendar__row';
      weekRow.setAttribute('role', 'row');
      for (let col = 0; col < DAYS_PER_WEEK; col++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ink-calendar__cell';
        btn.setAttribute('role', 'gridcell');
        btn.tabIndex = -1;

        const dayNum = document.createElement('div');
        dayNum.className = 'ink-calendar__day-num';
        btn.appendChild(dayNum);

        const evContainer = document.createElement('div');
        evContainer.className = 'ink-calendar__events';
        btn.appendChild(evContainer);

        weekRow.appendChild(btn);
        this._cells.push(btn);
        this._dayNums.push(dayNum);
        this._eventContainers.push(evContainer);
      }
      grid.appendChild(weekRow);
    }

    root.appendChild(grid);
    this.replaceChildren(root);
  }

  /**
   * Eyebrow text above the month name. The default keeps the wording the
   * component shipped with; a template replaces it wholesale so a German
   * board can read "KALENDER · 2026" without a fork.
   */
  private _eyebrow(y: number, m: number): string {
    const template = this.getAttribute('eyebrow');
    if (template == null) return `CALENDAR · ${y}`;
    return template
      .replaceAll('{month}', monthLabel(this, m, y, 'short'))
      .replaceAll('{year}', String(y));
  }

  private _patchGrid(): void {
    const { y, m } = this._view;
    const weekStart = this._weekStart();

    /* Titles */
    if (this._titleEyebrow) patchText(this._titleEyebrow, this._eyebrow(y, m));
    if (this._titleEl) patchText(this._titleEl, monthLabel(this, m, y, 'long'));

    /* Column headers */
    const dowLabels = weekdayLabels(this, weekStart, 'short');
    for (let i = 0; i < this._dowEls.length; i++) {
      patchText(this._dowEls[i], dowLabels[i] ?? '');
    }

    /* Cells */
    const firstDow = (new Date(y, m, 1).getDay() - weekStart + DAYS_PER_WEEK) % DAYS_PER_WEEK;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const sel = parseYMD(this._value);
    const today = new Date();

    for (let i = 0; i < CELL_COUNT; i++) {
      const btn = this._cells[i];
      const dayNum = this._dayNums[i];
      const evContainer = this._eventContainers[i];
      const d = i - firstDow + 1;

      if (d < 1 || d > daysInMonth) {
        /* Empty cell — shown as inert div-like */
        patchText(dayNum, '');
        patchBoolAttr(btn, 'disabled', true);
        delete btn.dataset['day'];
        patchAttr(btn, 'aria-selected', null);
        patchAttr(btn, 'aria-hidden', null);
        patchAttr(btn, 'aria-label', 'Outside current month');
        patchAttr(btn, 'data-today', null);
        evContainer.textContent = '';
      } else {
        patchText(dayNum, String(d));
        patchBoolAttr(btn, 'disabled', false);
        btn.dataset['day'] = String(d);
        patchAttr(btn, 'aria-hidden', null);

        const isSel = sel?.getFullYear() === y && sel.getMonth() === m && sel.getDate() === d;
        patchAttr(btn, 'aria-selected', String(!!isSel));

        const isToday =
          today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
        patchAttr(btn, 'data-today', String(isToday));
        patchAttr(btn, 'aria-label', formatDate(this, new Date(y, m, d), {}));

        /* Events — O(1) lookup from memoized map */
        const key = ymd(new Date(y, m, d));
        const evs = this._eventMap.get(key) || [];
        this._patchEvents(evContainer, evs);
      }
    }
    const selectedCell = this._cells.find((cell) => cell.getAttribute('aria-selected') === 'true');
    const todayCell = this._cells.find((cell) => cell.dataset['today'] === 'true');
    const tabStop = selectedCell ?? todayCell ?? this._cells.find((cell) => !cell.disabled);
    for (const cell of this._cells) cell.tabIndex = cell === tabStop ? 0 : -1;
  }

  private _patchEvents(container: HTMLElement, evs: CalendarEvent[]): void {
    /* Rebuild event chips only — these are tiny and change rarely */
    const shown = evs.slice(0, 2);
    const overflow = evs.length > 2 ? evs.length - 2 : 0;
    const needed = shown.length + (overflow ? 1 : 0);
    const current = container.children.length;

    /* Fast path: nothing changed */
    if (needed === 0 && current === 0) return;

    /* Rebuild — event chip DOM is trivial (span text only) */
    if (needed !== current || this._needsEventUpdate(container, shown, overflow)) {
      container.textContent = '';
      for (const ev of shown) {
        const span = document.createElement('span');
        span.className = 'ink-calendar__event';
        span.textContent = ev.title;
        container.appendChild(span);
      }
      if (overflow) {
        const more = document.createElement('span');
        more.className = 'ink-calendar__more';
        more.textContent = `+${overflow}`;
        container.appendChild(more);
      }
    }
  }

  private _needsEventUpdate(
    container: HTMLElement,
    shown: CalendarEvent[],
    overflow: number,
  ): boolean {
    const children = container.children;
    for (let i = 0; i < shown.length; i++) {
      if (children[i]?.textContent !== shown[i].title) return true;
    }
    if (overflow && children[shown.length]?.textContent !== `+${overflow}`) return true;
    return false;
  }
}

define('e-calendar', ECalendar);
