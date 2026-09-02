import {
  define,
  EpaperElement,
  numAttr,
  observeItems,
  patchAttr,
  patchText,
  runCleanups,
} from '../../core/dom';
import { iconSvg } from '../../core/icons';
import { t } from '../../core/i18n';

/** Per-step outcome overriding the plain done/active progression. */
type StepStatus = 'error' | 'warning';

const isStepStatus = (v: string | null): v is StepStatus => v === 'error' || v === 'warning';

const STATUS_ICON: Record<StepStatus, string> = { error: 'error', warning: 'warning' };

/**
 * The vertical status line's word for a step. `error`/`warning` route through
 * the locale string table (`severityError`/`severityWarning`) and are
 * upper-cased to match the existing English defaults ("ERROR"/"WARNING")
 * exactly, so this only replaces the hard-coded literal — it does not change
 * what renders. `DONE`/`IN PROGRESS`/`PENDING` have no string-table entry of
 * their own and stay literal, same as before.
 */
function stepStatusLabel(
  host: Element,
  done: boolean,
  active: boolean,
  status: StepStatus | null,
): string {
  if (status === 'error') return t(host, 'severityError').toUpperCase();
  if (status === 'warning') return t(host, 'severityWarning').toUpperCase();
  if (done) return t(host, 'stepDone').toUpperCase();
  return t(host, active ? 'stepInProgress' : 'stepPending').toUpperCase();
}

/** Bubble content: a status glyph outranks the check mark, which outranks the ordinal. */
function stepBubble(index: number, done: boolean, status: StepStatus | null): string {
  if (status) return iconSvg(STATUS_ICON[status], 14);
  return done ? iconSvg('check', 14) : String(index + 1);
}

/** Rendered `<li>` plus the parts that get patched, and the optional parts that get created/removed. */
interface StepRow {
  li: HTMLElement;
  bubble: HTMLElement;
  bubbleKey: string;
  body: HTMLElement;
  statusEl: HTMLElement | null;
  titleEl: HTMLElement;
  descEl: HTMLElement | null;
}

/**
 * @summary Numbered or check-marked step list rendered from `<e-step>` children.
 * @since v1.0.1
 *
 * Reads its entries from child `<e-step>` elements and keeps them live: the
 * authored items stay in the light DOM as the source of truth, and a
 * `MutationObserver` re-syncs the rendered `<ol>` whenever one is added,
 * removed, reordered, or has its `title`, `description` or `status` changed.
 * Rows keep their DOM identity by position — `current` is itself a position,
 * so a step's row is "whichever item is at this index" rather than a fixed
 * identity, the same convention `e-segmented` uses for its buttons.
 *
 * Because the items stay put they would otherwise render twice, so each one is
 * hidden with an inline `display:none` when it is first wired. `components.css` carries the
 * `e-step { display: none; }` rule that states it; the inline style is what
 * holds even where that stylesheet is not loaded.
 *
 * The active step carries `aria-current="step"`, so assistive technology can
 * report where in the sequence the reader is without inferring it from styling.
 *
 * @attr {number} [current=0] - Index of the active step (0-based). Reactive.
 * @attr {'horizontal'|'vertical'} [orientation='horizontal'] - Layout direction. Reactive.
 *
 * @slot - Default slot for `<e-step>` children.
 *
 * @example
 * <e-steps current="1">
 *   <e-step title="Plan" description="Outline scope"></e-step>
 *   <e-step title="Build" status="error" description="Prüfsumme fehlgeschlagen"></e-step>
 *   <e-step title="Ship"></e-step>
 * </e-steps>
 */
export class ESteps extends EpaperElement {
  static readonly observedAttributes = ['current', 'orientation'];

  private _wired = false;
  private _ol: HTMLElement | null = null;
  private _orientation: string | null = null;
  private _rows: StepRow[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._build();
    } else {
      this._sync();
    }
    observeItems(this, this._sync, {
      attributeFilter: ['title', 'description', 'status'],
      isOutput: (n) => this._ol?.contains(n) ?? false,
    });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    const orient = this.getAttribute('orientation') ?? 'horizontal';
    if (name === 'orientation' && orient !== this._orientation) {
      this._build();
      return;
    }
    this._sync();
  }

  /** Authored items, excluding anything inside the rendered list. */
  private _items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-step')].filter(
      (it) => !this._ol?.contains(it),
    );
  }

  /** Full rebuild of the rendered `<ol>` — used once at mount and whenever `orientation` flips. */
  private _build(): void {
    const horiz = this.getAttribute('orientation') !== 'vertical';
    this._orientation = horiz ? 'horizontal' : 'vertical';
    const ol = document.createElement('ol');
    ol.className = horiz ? 'ink-steps ink-steps--horizontal' : 'ink-steps';
    if (this._ol) this._ol.replaceWith(ol);
    else this.appendChild(ol);
    this._ol = ol;
    this._rows = [];
    this._sync();
  }

  private readonly _sync = (): void => {
    const ol = this._ol;
    if (!ol) return;
    const items = this._items();
    const horiz = this._orientation !== 'vertical';
    const current = numAttr(this, 'current', 0);

    ol.style.gridTemplateColumns = horiz ? `repeat(${items.length},1fr)` : '';

    while (this._rows.length > items.length) this._rows.pop()!.li.remove();

    items.forEach((item, i) => {
      if (item.style.display !== 'none') item.style.display = 'none';
      const statusAttr = item.getAttribute('status');
      const status = isStepStatus(statusAttr) ? statusAttr : null;
      const title = item.getAttribute('title') || '';
      const desc = item.getAttribute('description') || '';

      let row = this._rows[i];
      if (!row) {
        row = ESteps._makeRow(horiz);
        ol.appendChild(row.li);
        this._rows.push(row);
      }
      this._patchRow(row, i, current, horiz, { title, desc, status });
    });
  };

  private static _makeRow(horiz: boolean): StepRow {
    const li = document.createElement('li');
    li.className = 'ink-steps__item';

    const bubble = document.createElement('div');
    bubble.className = 'ink-steps__bubble';
    bubble.setAttribute('aria-hidden', 'true');
    li.appendChild(bubble);

    const body = document.createElement('div');
    body.style.flex = '1';

    let statusEl: HTMLElement | null = null;
    if (!horiz) {
      statusEl = document.createElement('div');
      statusEl.className = 'ink-steps__status';
      body.appendChild(statusEl);
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'ink-steps__title';
    if (!horiz) {
      titleEl.style.fontSize = 'var(--ink-text-body)';
      titleEl.style.marginTop = '2px';
    }
    body.appendChild(titleEl);

    li.appendChild(body);
    return { li, bubble, bubbleKey: '', body, statusEl, titleEl, descEl: null };
  }

  private _patchRow(
    row: StepRow,
    i: number,
    current: number,
    horiz: boolean,
    it: { title: string; desc: string; status: StepStatus | null },
  ): void {
    const done = i < current;
    const active = i === current;

    patchAttr(row.li, 'data-done', String(done));
    patchAttr(row.li, 'data-active', String(active));
    patchAttr(row.li, 'aria-current', active ? 'step' : null);
    patchAttr(row.li, 'data-status', it.status);

    const bubbleContent = stepBubble(i, done, it.status);
    if (row.bubbleKey !== bubbleContent) {
      row.bubble.innerHTML = bubbleContent;
      row.bubbleKey = bubbleContent;
    }

    if (row.statusEl) patchText(row.statusEl, stepStatusLabel(this, done, active, it.status));

    patchText(row.titleEl, it.title);

    if (it.desc) {
      if (!row.descEl) {
        row.descEl = document.createElement('div');
        row.descEl.className = 'ink-steps__desc';
        if (!horiz) {
          row.descEl.style.fontSize = 'var(--ink-text-small)';
          row.descEl.style.marginTop = '4px';
        }
        row.body.appendChild(row.descEl);
      }
      patchText(row.descEl, it.desc);
    } else if (row.descEl) {
      row.descEl.remove();
      row.descEl = null;
    }
  }
}
define('e-steps', ESteps);

/**
 * @summary Single step entry inside an `<e-steps>`.
 *
 * Acts as a data carrier; the parent renders the actual list item and hides
 * this element. Changing its attributes after mount updates the rendered
 * step — including moving `status` on or off it.
 *
 * @attr {string} title - Step title.
 * @attr {string} [description] - Optional secondary line below the title.
 * @attr {'error'|'warning'} [status] - Marks the step's outcome. Renders the matching glyph in the bubble instead of the ordinal or check mark, sets `data-status` on the item, and replaces the vertical status label. Unknown values are ignored. @since v2.0.0
 *
 * @example
 * <e-step title="Prüfung" status="error" description="Prüfsumme fehlgeschlagen"></e-step>
 */
export class EStep extends EpaperElement {}
define('e-step', EStep);
