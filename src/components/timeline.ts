import { define, esc } from '../core/dom';

/**
 * @summary Vertical list of timestamped events with marker bullets.
 *
 * Reads its entries from child `<e-timeline-item>` elements at connect time.
 * Items are rendered as `<li>` rows with a marker, time label, title and
 * default-slot body. Layout is fully static — there are no animations.
 *
 * @attr {'left'|'right'} [time-position='left'] - Side of the rail where the timestamp is rendered.
 *
 * @slot - Default slot for `<e-timeline-item>` children.
 *
 * @example
 * <e-timeline>
 *   <e-timeline-item time="08:30" title="Stand-up">Daily sync.</e-timeline-item>
 *   <e-timeline-item time="11:00" title="Review">Design review with Marco.</e-timeline-item>
 * </e-timeline>
 */
export class ETimeline extends HTMLElement {
  static observedAttributes = ['time-position'];

  private _wired = false;
  private _list: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const items = [...this.querySelectorAll('e-timeline-item')].map((it) => ({
      time: it.getAttribute('time') || '',
      title: it.getAttribute('title') || '',
      variant: it.getAttribute('variant') || 'default',
      body: (it.innerHTML || '').trim(),
    }));
    const pos = this.getAttribute('time-position') === 'right' ? 'right' : 'left';
    this.innerHTML = `<ol class="ink-timeline ink-timeline--time-${pos}">${items
      .map(
        (it) => `<li class="ink-timeline__item" data-variant="${esc(it.variant)}">
            <div class="ink-timeline__time">${esc(it.time)}</div>
            <div class="ink-timeline__rail" aria-hidden="true">
              <span class="ink-timeline__marker"></span>
            </div>
            <div class="ink-timeline__content">
              ${it.title ? `<div class="ink-timeline__title">${esc(it.title)}</div>` : ''}
              ${it.body ? `<div class="ink-timeline__body">${it.body}</div>` : ''}
            </div>
          </li>`,
      )
      .join('')}</ol>`;
    this._list = this.firstElementChild as HTMLElement;
  }

  attributeChangedCallback() {
    if (!this._list) return;
    const pos = this.getAttribute('time-position') === 'right' ? 'right' : 'left';
    this._list.classList.remove('ink-timeline--time-left', 'ink-timeline--time-right');
    this._list.classList.add(`ink-timeline--time-${pos}`);
  }
}
define('e-timeline', ETimeline);

/**
 * @summary Single entry inside an `<e-timeline>`.
 *
 * Acts as a data carrier; the parent timeline renders the actual row. The
 * default slot is rendered as the entry body and may contain HTML.
 *
 * @attr {string} [time] - Timestamp shown in the gutter.
 * @attr {string} [title] - Bold heading for the entry.
 * @attr {'default'|'done'|'pending'} [variant='default'] - Visual treatment of the marker bullet.
 *
 * @example
 * <e-timeline-item time="11:00" title="Review" variant="done">Approved.</e-timeline-item>
 */
export class ETimelineItem extends HTMLElement {}
define('e-timeline-item', ETimelineItem);
