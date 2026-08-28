import { define, numAttr, patchAttr } from '../../core/dom';
import { iconSvg } from '../../core/icons';

/** Per-step outcome overriding the plain done/active progression. */
type StepStatus = 'error' | 'warning';

const isStepStatus = (v: string | null): v is StepStatus => v === 'error' || v === 'warning';

const STATUS_ICON: Record<StepStatus, string> = { error: 'error', warning: 'warning' };
const STATUS_LABEL: Record<StepStatus, string> = { error: 'ERROR', warning: 'WARNING' };

function stepStatusLabel(done: boolean, active: boolean, status: StepStatus | null): string {
  if (status) return STATUS_LABEL[status];
  if (done) return 'DONE';
  return active ? 'IN PROGRESS' : 'PENDING';
}

/** Bubble content: a status glyph outranks the check mark, which outranks the ordinal. */
function stepBubble(index: number, done: boolean, status: StepStatus | null): string {
  if (status) return iconSvg(STATUS_ICON[status], 14);
  return done ? iconSvg('check', 14) : String(index + 1);
}

interface StepItem {
  title: string;
  desc: string;
  status: StepStatus | null;
}

/**
 * @summary Numbered or check-marked step list rendered from `<e-step>` children.
 * @since v1.0.1
 *
 * The active step carries `aria-current="step"`, so assistive technology can
 * report where in the sequence the reader is without inferring it from styling.
 *
 * @attr {number} [current=0] - Index of the active step (0-based). Reactive.
 * @attr {'horizontal'|'vertical'} [orientation='horizontal'] - Layout direction. Reactive.
 *
 * @example
 * <e-steps current="1">
 *   <e-step title="Plan" description="Outline scope"></e-step>
 *   <e-step title="Build" status="error" description="Prüfsumme fehlgeschlagen"></e-step>
 *   <e-step title="Ship"></e-step>
 * </e-steps>
 */
export class ESteps extends HTMLElement {
  static readonly observedAttributes = ['current', 'orientation'];

  private _wired = false;
  private _items: StepItem[] = [];
  private _stepEls: Array<{
    li: HTMLElement;
    bubble: HTMLElement;
    statusEl: HTMLElement | null;
  }> = [];
  private _orientation: string | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this._items = [...this.querySelectorAll('e-step')].map((s) => {
      const status = s.getAttribute('status');
      return {
        title: s.getAttribute('title') || '',
        desc: s.getAttribute('description') || '',
        status: isStepStatus(status) ? status : null,
      };
    });
    this._build();
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    const orient = this.getAttribute('orientation') ?? 'horizontal';
    if (name === 'orientation' && orient !== this._orientation) {
      this._build();
      return;
    }
    this._patchCurrent();
  }

  private _build(): void {
    const current = numAttr(this, 'current', 0);
    const horiz = this.getAttribute('orientation') !== 'vertical';
    this._orientation = horiz ? 'horizontal' : 'vertical';
    this._stepEls = [];

    const ol = document.createElement('ol');
    ol.className = horiz ? 'ink-steps ink-steps--horizontal' : 'ink-steps';
    ol.style.gridTemplateColumns = horiz ? `repeat(${this._items.length},1fr)` : '';

    for (let i = 0; i < this._items.length; i++) {
      const stepEl = this._buildStepItem(this._items[i], i, current, horiz);
      ol.appendChild(stepEl.li);
      this._stepEls.push(stepEl);
    }

    this.replaceChildren(ol);
  }

  private _buildStepItem(
    it: StepItem,
    i: number,
    current: number,
    horiz: boolean,
  ): { li: HTMLElement; bubble: HTMLElement; statusEl: HTMLElement | null } {
    const done = i < current;
    const active = i === current;

    const li = document.createElement('li');
    li.className = 'ink-steps__item';
    li.dataset.done = String(done);
    li.dataset.active = String(active);
    if (it.status) li.dataset.status = it.status;
    if (active) li.setAttribute('aria-current', 'step');

    const bubble = document.createElement('div');
    bubble.className = 'ink-steps__bubble';
    bubble.setAttribute('aria-hidden', 'true');
    bubble.innerHTML = stepBubble(i, done, it.status);
    li.appendChild(bubble);

    const body = document.createElement('div');
    body.style.flex = '1';

    let statusEl: HTMLElement | null = null;
    if (!horiz) {
      statusEl = document.createElement('div');
      statusEl.className = 'ink-steps__status';
      statusEl.textContent = stepStatusLabel(done, active, it.status);
      body.appendChild(statusEl);
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'ink-steps__title';
    if (!horiz) {
      titleEl.style.fontSize = 'var(--ink-text-body)';
      titleEl.style.marginTop = '2px';
    }
    titleEl.textContent = it.title;
    body.appendChild(titleEl);

    if (it.desc) {
      const descEl = document.createElement('div');
      descEl.className = 'ink-steps__desc';
      if (!horiz) {
        descEl.style.fontSize = 'var(--ink-text-small)';
        descEl.style.marginTop = '4px';
      }
      descEl.textContent = it.desc;
      body.appendChild(descEl);
    }

    li.appendChild(body);
    return { li, bubble, statusEl };
  }

  private _patchCurrent(): void {
    const current = numAttr(this, 'current', 0);
    for (let i = 0; i < this._stepEls.length; i++) {
      const { li, bubble, statusEl } = this._stepEls[i];
      const status = this._items[i]?.status ?? null;
      const done = i < current;
      const active = i === current;
      patchAttr(li, 'data-done', String(done));
      patchAttr(li, 'data-active', String(active));
      patchAttr(li, 'aria-current', active ? 'step' : null);
      const bubbleContent = stepBubble(i, done, status);
      if (bubble.innerHTML !== bubbleContent) bubble.innerHTML = bubbleContent;
      if (statusEl) {
        statusEl.textContent = stepStatusLabel(done, active, status);
      }
    }
  }
}
define('e-steps', ESteps);

/**
 * @summary Single step entry inside an `<e-steps>`.
 *
 * The parent consumes and discards these elements at connect time, so every
 * attribute here is read once, as a snapshot — `title` and `description`
 * have always behaved that way and `status` follows the same contract.
 *
 * @attr {string} title - Step title.
 * @attr {string} [description] - Optional secondary line below the title.
 * @attr {'error'|'warning'} [status] - Marks the step's outcome. Renders the matching glyph in the bubble instead of the ordinal or check mark, sets `data-status` on the item, and replaces the vertical status label. Unknown values are ignored. @since v1.3.0
 *
 * @example
 * <e-step title="Prüfung" status="error" description="Prüfsumme fehlgeschlagen"></e-step>
 */
export class EStep extends HTMLElement {}
define('e-step', EStep);
