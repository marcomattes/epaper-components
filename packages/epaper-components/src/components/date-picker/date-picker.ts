import {
  addCleanup,
  define,
  intAttr,
  onGlobal,
  patchAttr,
  patchBoolAttr,
  patchText,
  randId,
  runCleanups,
} from '../../core/dom';
import { iconSvg } from '../../core/icons';
import { parseYMD, ymd } from '../../core/date';
import { formatDate, monthLabel, weekdayLabels } from '../../core/format';
import { t } from '../../core/i18n';
import { BaseFormControl } from '../../core/base-form-control';

const DAYS_PER_WEEK = 7;
const CELL_COUNT = 42;

/**
 * @summary Single-day picker with a popover month grid.
 * @since v1.0.1
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * @attr {string} [value] - Selected day in `YYYY-MM-DD` format.
 * @attr {string} [placeholder='YYYY-MM-DD'] - Trigger placeholder when no value is set.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [disabled] - Disables interaction: the trigger leaves the tab flow, the calendar
 *   popover cannot open (and closes if it is open) and no day can be picked. Presence alone
 *   disables, per the HTML spec for form-associated elements — `disabled="false"` still disables.
 *   Also applied by a surrounding `<fieldset disabled>`.
 * @attr {boolean} [required] - Requires a selected date.
 * @attr {string} [required-message] - Message reported when no required date is selected.
 * @attr {string} [locale] - BCP-47 tag for the weekday, month and day-cell names. Falls back to the
 *   nearest `lang`, then the document language. @since v2.0.0
 * @attr {number} [week-start=0] - First column's weekday: 0 = Sunday, 1 = Monday. @since v2.0.0
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when a day is picked. `value` is `YYYY-MM-DD`.
 *
 * @example
 * <e-date-picker value="2025-04-26"></e-date-picker>
 */
export class EDatePicker extends BaseFormControl {
  static readonly observedAttributes = [
    'value',
    'placeholder',
    'disabled',
    'required',
    'required-message',
    'locale',
    'week-start',
  ];

  private _wired = false;
  private _view = { y: 2026, m: 0 };

  /* DOM references */
  private _triggerSpan: HTMLSpanElement | null = null;
  private _trigger: HTMLButtonElement | null = null;
  private _placeholderSpan: HTMLSpanElement | null = null;
  private _pop: HTMLElement | null = null;
  private _navTitle: HTMLElement | null = null;
  private _cells: HTMLButtonElement[] = [];
  private _dowCells: HTMLElement[] = [];
  private _placeholderHtml = '';

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._placeholderHtml = this.getAttribute('placeholder') || 'YYYY-MM-DD';
      const rawValue = this.getAttribute('value') || '';
      const value = parseYMD(rawValue) ? rawValue : '';
      this._value = value;
      this.internals.setFormValue(value);

      const today = new Date();
      const initial = parseYMD(value) || today;
      this._view = { y: initial.getFullYear(), m: initial.getMonth() };

      this._build();
      this._patchGrid();
      this._syncValidity();
    }

    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
    addCleanup(this, () => this.removeEventListener('keydown', this._onKeydown));

    onGlobal(this, document, 'mousedown', (e) => {
      if (!this.contains(e.target as Node)) this._setOpen(false);
    });
    this.addEventListener('focusout', this._onFocusOut);
    addCleanup(this, () => this.removeEventListener('focusout', this._onFocusOut));
    onGlobal(this, document, 'keydown', (e) => {
      if (
        e.key === 'Escape' &&
        this._pop &&
        !this._pop.hidden &&
        this.contains(document.activeElement)
      ) {
        this._setOpen(false);
        this._trigger?.focus();
      }
    });

    this._applyDisabled();
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  /**
   * Effective disabled state. Presence alone disables — the HTML spec, not the
   * library's `x="false"` convention, governs `disabled` on a form-associated
   * element, and that is what the browser reports through `formDisabledCallback`.
   */
  private get _disabled(): boolean {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  /** Forward the effective disabled state to the trigger and close the popover. */
  private _applyDisabled(): void {
    if (!this._trigger) return;
    const disabled = this._disabled;
    this._trigger.disabled = disabled;
    patchAttr(this._trigger, 'aria-disabled', disabled ? 'true' : null);
    // A calendar left open would still take clicks behind a dead trigger.
    if (disabled) this._setOpen(false);
  }

  protected override formDisabledChanged(): void {
    this._applyDisabled();
  }

  private readonly _onClick = (e: Event): void => {
    if (this._disabled) return;
    const target = e.target as Element;

    /* Trigger toggle */
    if (target.closest('[data-trigger]')) {
      const open = !!this._pop?.hidden;
      this._setOpen(open);
      if (open) this._focusInitialCell();
      return;
    }

    /* Month step */
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
      this._view = { y, m };
      this._patchGrid();
      return;
    }

    /* Day cell */
    const cell = target.closest<HTMLButtonElement>('.ink-datepicker__cell');
    if (cell && !cell.disabled) {
      const d = Number(cell.dataset['day']);
      const value = ymd(new Date(this._view.y, this._view.m, d));
      this.setAttribute('value', value);
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value }, bubbles: true }));
      this._setOpen(false);
      this._trigger?.focus();
    }
  };

  private readonly _onKeydown = (e: Event): void => {
    if (this._disabled) return;
    const ke = e as KeyboardEvent;
    const target = ke.target as Element;

    if (this._handleTriggerKeydown(ke, target)) return;

    /* Inside grid */
    const cell = target.closest<HTMLButtonElement>('.ink-datepicker__cell');
    if (!cell || !this._pop || this._pop.hidden) return;

    const focusables = this._cells.filter((b) => !b.disabled);
    if (!focusables.includes(cell)) return;

    this._handleGridKeydown(ke, cell);
  };

  /** Trigger: ArrowDown / Enter / Space opens popover. Returns whether the key targeted the trigger. */
  private _handleTriggerKeydown(ke: KeyboardEvent, target: Element): boolean {
    if (!target.closest('[data-trigger]') || !this._pop) return false;
    if (ke.key === 'ArrowDown' || ke.key === 'Enter' || ke.key === ' ') {
      ke.preventDefault();
      this._setOpen(true);
      this._focusInitialCell();
    }
    return true;
  }

  /** Keyboard navigation once focus is inside the grid. */
  private _handleGridKeydown(ke: KeyboardEvent, cell: HTMLButtonElement): void {
    switch (ke.key) {
      case 'ArrowLeft':
        ke.preventDefault();
        this._moveFocusBy(cell, -1);
        break;
      case 'ArrowRight':
        ke.preventDefault();
        this._moveFocusBy(cell, 1);
        break;
      case 'ArrowUp':
        ke.preventDefault();
        this._moveFocusBy(cell, -7);
        break;
      case 'ArrowDown':
        ke.preventDefault();
        this._moveFocusBy(cell, 7);
        break;
      case 'PageUp':
        ke.preventDefault();
        this._pageMonth(-1);
        break;
      case 'PageDown':
        ke.preventDefault();
        this._pageMonth(1);
        break;
      case 'Home':
        ke.preventDefault();
        this._moveFocusBy(cell, -(this._cells.indexOf(cell) % 7));
        break;
      case 'End':
        ke.preventDefault();
        this._moveFocusBy(cell, 6 - (this._cells.indexOf(cell) % 7));
        break;
      case 'Enter':
      case ' ':
        ke.preventDefault();
        cell.click();
        break;
    }
  }

  /** Move grid focus `delta` days from `cell`, paging the month view if needed. */
  private _moveFocusBy(cell: HTMLButtonElement, delta: number): void {
    const dayNum = Number(cell.dataset['day']);
    const target = new Date(this._view.y, this._view.m, dayNum + delta);
    this._view = { y: target.getFullYear(), m: target.getMonth() };
    this._patchGrid();
    const newCell = this._cells.find(
      (b) => Number(b.dataset['day']) === target.getDate() && !b.disabled,
    );
    newCell?.focus();
  }

  /** Step the view by `delta` months (PageUp/PageDown) and refocus. */
  private _pageMonth(delta: number): void {
    let m = this._view.m + delta;
    let y = this._view.y;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    this._view = { y, m };
    this._patchGrid();
    this._focusInitialCell();
  }

  private _focusInitialCell(): void {
    const sel = parseYMD(this._value);
    let target: HTMLButtonElement | undefined;
    if (sel?.getFullYear() === this._view.y && sel.getMonth() === this._view.m) {
      target = this._cells.find((b) => Number(b.dataset['day']) === sel.getDate() && !b.disabled);
    }
    if (!target) {
      const today = new Date();
      if (today.getFullYear() === this._view.y && today.getMonth() === this._view.m) {
        target = this._cells.find(
          (b) => Number(b.dataset['day']) === today.getDate() && !b.disabled,
        );
      }
    }
    target ??= this._cells.find((b) => !b.disabled);
    for (const cell of this._cells) cell.tabIndex = cell === target ? 0 : -1;
    target?.focus();
  }

  /**
   * Close on the way out of the component.
   *
   * Without this, tabbing past an open overlay left it on screen with no way
   * to dismiss it from the keyboard: the Escape handler above only fires while
   * focus is still inside. The decision is deferred by a microtask because not
   * every `focusout` is the user leaving — removing a focused element fires one
   * too, and at that moment the host still reports `isConnected`.
   */
  private readonly _onFocusOut = (e: FocusEvent): void => {
    const next = e.relatedTarget as Node | null;
    if (this._pop?.hidden !== false || (next && this.contains(next))) return;
    queueMicrotask(() => {
      if (!this.isConnected || this._pop?.hidden !== false) return;
      if (this.contains(this.ownerDocument.activeElement)) return;
      this._setOpen(false);
    });
  };

  private _setOpen(open: boolean): void {
    if (!this._pop || !this._trigger) return;
    if (open && this._disabled) return;
    this._pop.hidden = !open;
    patchAttr(this._trigger, 'aria-expanded', String(open));
  }

  private _svgEl(svg: string): Element | null {
    const tpl = document.createElement('template');
    tpl.innerHTML = svg;
    return tpl.content.firstElementChild;
  }

  private _build(): void {
    const root = document.createElement('div');
    root.className = 'ink-datepicker';

    /* Trigger */
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ink-datepicker__trigger';
    trigger.dataset['trigger'] = '';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    this._trigger = trigger;
    const triggerSpan = document.createElement('span');
    this._triggerSpan = triggerSpan;
    // Pre-build placeholder sub-span once; toggled in/out by _patchTrigger.
    const phSpan = document.createElement('span');
    phSpan.style.fontFamily = 'var(--ink-sans)';
    phSpan.style.fontWeight = '400';
    phSpan.textContent = this._placeholderHtml;
    this._placeholderSpan = phSpan;
    trigger.appendChild(triggerSpan);
    const icon = this._svgEl(iconSvg('doc', 18));
    if (icon) trigger.appendChild(icon);
    root.appendChild(trigger);
    this._patchTrigger();

    /* Pop */
    const pop = document.createElement('div');
    pop.className = 'ink-datepicker__pop';
    pop.hidden = true;
    pop.id = randId('ink-datepicker-dialog');
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Choose date');
    trigger.setAttribute('aria-controls', pop.id);
    this._pop = pop;

    /* Nav */
    const nav = document.createElement('div');
    nav.className = 'ink-datepicker__nav';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'ink-icon-btn';
    prevBtn.dataset['step'] = '-1';
    prevBtn.setAttribute('aria-label', t(this, 'previousMonth'));
    const prevIcon = this._svgEl(iconSvg('chevL', 16));
    if (prevIcon) prevBtn.appendChild(prevIcon);
    nav.appendChild(prevBtn);

    const navTitle = document.createElement('div');
    navTitle.className = 'ink-datepicker__nav-title';
    this._navTitle = navTitle;
    nav.appendChild(navTitle);

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'ink-icon-btn';
    nextBtn.dataset['step'] = '1';
    nextBtn.setAttribute('aria-label', t(this, 'nextMonth'));
    const nextIcon = this._svgEl(iconSvg('chevR', 16));
    if (nextIcon) nextBtn.appendChild(nextIcon);
    nav.appendChild(nextBtn);
    pop.appendChild(nav);

    /* Grid */
    const grid = document.createElement('div');
    grid.className = 'ink-datepicker__grid';
    grid.setAttribute('role', 'grid');

    const headerRow = document.createElement('div');
    headerRow.className = 'ink-datepicker__row';
    headerRow.setAttribute('role', 'row');
    this._dowCells = [];
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
      const dow = document.createElement('div');
      dow.className = 'ink-datepicker__dow';
      dow.setAttribute('role', 'columnheader');
      headerRow.appendChild(dow);
      this._dowCells.push(dow);
    }
    grid.appendChild(headerRow);

    this._cells = [];
    for (let row = 0; row < CELL_COUNT / DAYS_PER_WEEK; row++) {
      const weekRow = document.createElement('div');
      weekRow.className = 'ink-datepicker__row';
      weekRow.setAttribute('role', 'row');
      for (let col = 0; col < DAYS_PER_WEEK; col++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ink-datepicker__cell';
        btn.setAttribute('role', 'gridcell');
        btn.tabIndex = -1;
        weekRow.appendChild(btn);
        this._cells.push(btn);
      }
      grid.appendChild(weekRow);
    }

    pop.appendChild(grid);
    root.appendChild(pop);
    this.replaceChildren(root);
  }

  private _patchTrigger(): void {
    if (!this._triggerSpan || !this._placeholderSpan) return;
    if (this._value) {
      // Switch to plain text — removes placeholder span if present.
      if (this._triggerSpan.firstChild !== this._placeholderSpan) {
        patchText(this._triggerSpan, this._value);
      } else {
        this._triggerSpan.textContent = this._value;
      }
    } else if (this._triggerSpan.firstChild !== this._placeholderSpan) {
      // Show the cached placeholder span — no innerHTML reassignment.
      this._triggerSpan.textContent = '';
      this._triggerSpan.appendChild(this._placeholderSpan);
    }
  }

  /** First column's weekday, clamped like `<e-calendar>`'s. */
  private _weekStart(): number {
    return Math.max(0, Math.min(6, intAttr(this, 'week-start', 0)));
  }

  private _patchGrid(): void {
    const { y, m } = this._view;
    const weekStart = this._weekStart();

    /* Column headers */
    const labels = weekdayLabels(this, weekStart);
    this._dowCells.forEach((cell, i) => patchText(cell, labels[i] ?? ''));

    /* Nav title */
    if (this._navTitle) patchText(this._navTitle, `${monthLabel(this, m, y, 'long')} ${y}`);

    /* Compute cells */
    const firstDow = (new Date(y, m, 1).getDay() - weekStart + DAYS_PER_WEEK) % DAYS_PER_WEEK;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const sel = parseYMD(this._value);
    const today = new Date();

    for (let i = 0; i < CELL_COUNT; i++) {
      const btn = this._cells[i];
      const dayNum = i - firstDow + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        /* Empty cell */
        patchText(btn, '');
        patchBoolAttr(btn, 'disabled', true);
        delete btn.dataset['day'];
        patchAttr(btn, 'aria-selected', null);
        patchAttr(btn, 'aria-label', null);
        patchAttr(btn, 'data-today', null);
      } else {
        patchText(btn, String(dayNum));
        patchBoolAttr(btn, 'disabled', false);
        btn.dataset['day'] = String(dayNum);
        const isSel = sel?.getFullYear() === y && sel.getMonth() === m && sel.getDate() === dayNum;
        patchAttr(btn, 'aria-selected', String(!!isSel));
        const isToday =
          today.getFullYear() === y && today.getMonth() === m && today.getDate() === dayNum;
        patchAttr(btn, 'data-today', String(isToday));
        // `{}` rather than the helper's `dateStyle: 'medium'` default: this is
        // the numeric form `toLocaleDateString()` produced before, and it is
        // what the shipped suites pin.
        patchAttr(btn, 'aria-label', formatDate(this, new Date(y, m, dayNum), {}));
      }
    }

    const selectedCell = this._cells.find((cell) => cell.getAttribute('aria-selected') === 'true');
    const todayCell = this._cells.find((cell) => cell.dataset['today'] === 'true');
    const tabStop = selectedCell ?? todayCell ?? this._cells.find((cell) => !cell.disabled);
    for (const cell of this._cells) cell.tabIndex = cell === tabStop ? 0 : -1;
  }

  protected serialize(v: string): string {
    return v ?? '';
  }
  protected parse(s: string): string {
    return s;
  }

  attributeChangedCallback(name: string, _old: string | null, val: string | null) {
    if (!this._wired) return;
    if (name === 'placeholder') {
      this._placeholderHtml = val || 'YYYY-MM-DD';
      if (this._placeholderSpan) patchText(this._placeholderSpan, this._placeholderHtml);
      this._patchTrigger();
    } else if (name === 'value') {
      this._applyValue(val ?? '');
    } else if (name === 'disabled') {
      this._applyDisabled();
    } else if (name === 'required' || name === 'required-message') {
      this._syncValidity();
    }
  }

  override get value(): string {
    return this._value;
  }
  override set value(v: string) {
    this.setAttribute('value', v ?? '');
  }

  private _applyValue(value: string): void {
    const parsed = parseYMD(value);
    const normalized = parsed ? value : '';
    this._value = normalized;
    this.internals.setFormValue(normalized);
    if (parsed) this._view = { y: parsed.getFullYear(), m: parsed.getMonth() };
    this._patchTrigger();
    this._patchGrid();
    this._syncValidity();
  }

  private _syncValidity(): void {
    this._trigger?.setAttribute('aria-required', String(this.hasAttribute('required')));
    this.applyRequiredValidity(!!this._value, this._trigger ?? undefined, t(this, 'requiredDate'));
  }
}

define('e-date-picker', EDatePicker);

export { pad2 } from '../../core/date';
