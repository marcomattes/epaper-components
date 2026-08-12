import {
  addCleanup,
  define,
  onGlobal,
  patchAttr,
  patchBoolAttr,
  patchText,
  randId,
  runCleanups,
} from '../core/dom';
import { iconSvg } from '../core/icons';
import { pad2, parseYMD, ymd } from '../core/date';
import { BaseFormControl } from '../core/base-form-control';

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL_COUNT = 42;

/**
 * @summary Single-day picker with a popover month grid.
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * @attr {string} [value] - Selected day in `YYYY-MM-DD` format.
 * @attr {string} [placeholder='YYYY-MM-DD'] - Trigger placeholder when no value is set.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when a day is picked. `value` is `YYYY-MM-DD`.
 *
 * @example
 * <e-date-picker value="2025-04-26"></e-date-picker>
 */
export class EDatePicker extends BaseFormControl {
  static observedAttributes = ['value', 'placeholder'];

  private _wired = false;
  private _view = { y: 2026, m: 0 };

  /* DOM references */
  private _triggerSpan: HTMLSpanElement | null = null;
  private _trigger: HTMLButtonElement | null = null;
  private _placeholderSpan: HTMLSpanElement | null = null;
  private _pop: HTMLElement | null = null;
  private _navTitle: HTMLElement | null = null;
  private _cells: HTMLButtonElement[] = [];
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
    }

    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
    addCleanup(this, () => this.removeEventListener('keydown', this._onKeydown));

    onGlobal(this, document, 'mousedown', (e) => {
      if (!this.contains(e.target as Node)) this._setOpen(false);
    });
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
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  private _onClick = (e: Event): void => {
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

  private _onKeydown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const target = ke.target as Element;

    /* Trigger: ArrowDown / Enter / Space opens popover */
    if (target.closest('[data-trigger]') && this._pop) {
      if (ke.key === 'ArrowDown' || ke.key === 'Enter' || ke.key === ' ') {
        ke.preventDefault();
        this._setOpen(true);
        this._focusInitialCell();
      }
      return;
    }

    /* Inside grid */
    const cell = target.closest<HTMLButtonElement>('.ink-datepicker__cell');
    if (!cell || !this._pop || this._pop.hidden) return;

    const focusables = this._cells.filter((b) => !b.disabled);
    const idx = focusables.indexOf(cell);
    if (idx < 0) return;

    const moveBy = (delta: number): void => {
      const dayNum = Number(cell.dataset['day']);
      const target = new Date(this._view.y, this._view.m, dayNum + delta);
      this._view = { y: target.getFullYear(), m: target.getMonth() };
      this._patchGrid();
      const newCell = this._cells.find(
        (b) => Number(b.dataset['day']) === target.getDate() && !b.disabled,
      );
      newCell?.focus();
    };

    if (ke.key === 'ArrowLeft') {
      ke.preventDefault();
      moveBy(-1);
    } else if (ke.key === 'ArrowRight') {
      ke.preventDefault();
      moveBy(1);
    } else if (ke.key === 'ArrowUp') {
      ke.preventDefault();
      moveBy(-7);
    } else if (ke.key === 'ArrowDown') {
      ke.preventDefault();
      moveBy(7);
    } else if (ke.key === 'PageUp') {
      ke.preventDefault();
      let m = this._view.m - 1;
      let y = this._view.y;
      if (m < 0) {
        m = 11;
        y -= 1;
      }
      this._view = { y, m };
      this._patchGrid();
      this._focusInitialCell();
    } else if (ke.key === 'PageDown') {
      ke.preventDefault();
      let m = this._view.m + 1;
      let y = this._view.y;
      if (m > 11) {
        m = 0;
        y += 1;
      }
      this._view = { y, m };
      this._patchGrid();
      this._focusInitialCell();
    } else if (ke.key === 'Home') {
      ke.preventDefault();
      moveBy(-(this._cells.indexOf(cell) % 7));
    } else if (ke.key === 'End') {
      ke.preventDefault();
      moveBy(6 - (this._cells.indexOf(cell) % 7));
    } else if (ke.key === 'Enter' || ke.key === ' ') {
      ke.preventDefault();
      cell.click();
    }
  };

  private _focusInitialCell(): void {
    const sel = parseYMD(this._value);
    let target: HTMLButtonElement | undefined;
    if (sel && sel.getFullYear() === this._view.y && sel.getMonth() === this._view.m) {
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
    if (!target) target = this._cells.find((b) => !b.disabled);
    for (const cell of this._cells) cell.tabIndex = cell === target ? 0 : -1;
    target?.focus();
  }

  private _setOpen(open: boolean): void {
    if (!this._pop || !this._trigger) return;
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
    prevBtn.setAttribute('aria-label', 'Previous month');
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
    nextBtn.setAttribute('aria-label', 'Next month');
    const nextIcon = this._svgEl(iconSvg('chevR', 16));
    if (nextIcon) nextBtn.appendChild(nextIcon);
    nav.appendChild(nextBtn);
    pop.appendChild(nav);

    /* Grid */
    const grid = document.createElement('div');
    grid.className = 'ink-datepicker__grid';
    grid.setAttribute('role', 'grid');

    for (const d of DOW_LABELS) {
      const dow = document.createElement('div');
      dow.className = 'ink-datepicker__dow';
      dow.setAttribute('role', 'columnheader');
      dow.textContent = d;
      grid.appendChild(dow);
    }

    this._cells = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ink-datepicker__cell';
      btn.setAttribute('role', 'gridcell');
      btn.tabIndex = -1;
      grid.appendChild(btn);
      this._cells.push(btn);
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
    } else {
      // Show the cached placeholder span — no innerHTML reassignment.
      if (this._triggerSpan.firstChild !== this._placeholderSpan) {
        this._triggerSpan.textContent = '';
        this._triggerSpan.appendChild(this._placeholderSpan);
      }
    }
  }

  private _patchGrid(): void {
    const { y, m } = this._view;

    /* Nav title */
    const locale = this.lang || document.documentElement.lang || undefined;
    const monthName = new Date(y, m, 1).toLocaleString(locale, { month: 'long' });
    if (this._navTitle) patchText(this._navTitle, `${monthName} ${y}`);

    /* Compute cells */
    const firstDow = new Date(y, m, 1).getDay();
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
        btn.removeAttribute('data-day');
        patchAttr(btn, 'aria-selected', null);
        patchAttr(btn, 'aria-label', null);
        patchAttr(btn, 'data-today', null);
      } else {
        patchText(btn, String(dayNum));
        patchBoolAttr(btn, 'disabled', false);
        btn.dataset['day'] = String(dayNum);
        const isSel =
          sel && sel.getFullYear() === y && sel.getMonth() === m && sel.getDate() === dayNum;
        patchAttr(btn, 'aria-selected', String(!!isSel));
        const isToday =
          today.getFullYear() === y && today.getMonth() === m && today.getDate() === dayNum;
        patchAttr(btn, 'data-today', String(isToday));
        const locale = this.lang || document.documentElement.lang || undefined;
        patchAttr(btn, 'aria-label', new Date(y, m, dayNum).toLocaleDateString(locale));
      }
    }

    const selectedCell = this._cells.find((cell) => cell.getAttribute('aria-selected') === 'true');
    const todayCell = this._cells.find((cell) => cell.getAttribute('data-today') === 'true');
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
    }
  }

  override get value(): string {
    return this._value;
  }
  override set value(v: string) {
    this.setAttribute('value', v ?? '');
  }

  override formResetCallback(): void {
    const dflt = this.getAttribute('default-value') ?? '';
    this.setAttribute('value', dflt);
  }

  private _applyValue(value: string): void {
    const parsed = parseYMD(value);
    const normalized = parsed ? value : '';
    this._value = normalized;
    this.internals.setFormValue(normalized);
    if (parsed) this._view = { y: parsed.getFullYear(), m: parsed.getMonth() };
    this._patchTrigger();
    this._patchGrid();
  }
}

define('e-date-picker', EDatePicker);

export { pad2 };
