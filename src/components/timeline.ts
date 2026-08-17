import { define } from '../core/dom';

/**
 * @summary Vertical list of timestamped events with marker bullets.
 * @since v1.0.1
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
      body: [...it.childNodes],
    }));
    const pos = this.getAttribute('time-position') === 'right' ? 'right' : 'left';
    const list = document.createElement('ol');
    list.className = `ink-timeline ink-timeline--time-${pos}`;
    for (const item of items) {
      const row = document.createElement('li');
      row.className = 'ink-timeline__item';
      row.dataset['variant'] = item.variant;
      const time = document.createElement('div');
      time.className = 'ink-timeline__time';
      time.textContent = item.time;
      const rail = document.createElement('div');
      rail.className = 'ink-timeline__rail';
      rail.setAttribute('aria-hidden', 'true');
      const marker = document.createElement('span');
      marker.className = 'ink-timeline__marker';
      rail.appendChild(marker);
      const content = document.createElement('div');
      content.className = 'ink-timeline__content';
      if (item.title) {
        const title = document.createElement('div');
        title.className = 'ink-timeline__title';
        title.textContent = item.title;
        content.appendChild(title);
      }
      if (item.body.length > 0) {
        const body = document.createElement('div');
        body.className = 'ink-timeline__body';
        body.append(...item.body);
        content.appendChild(body);
      }
      row.append(time, rail, content);
      list.appendChild(row);
    }
    this.replaceChildren(list);
    this._list = list;
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
