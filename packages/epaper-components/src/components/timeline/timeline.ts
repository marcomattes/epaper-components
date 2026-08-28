import {
  cloneItemBody,
  define,
  observeItems,
  patchAttr,
  patchText,
  runCleanups,
} from '../../core/dom';

/** Rendered row plus the cached body key that decides when to re-clone. */
interface TimelineRow {
  li: HTMLElement;
  time: HTMLElement;
  content: HTMLElement;
  title: HTMLElement | null;
  body: HTMLElement | null;
  bodyKey: string;
}

/**
 * @summary Vertical list of timestamped events with marker bullets.
 * @since v1.0.1
 *
 * Reads its entries from child `<e-timeline-item>` elements and keeps them
 * live: the authored items stay in the light DOM as the source of truth, and
 * a `MutationObserver` re-syncs the rendered `<ol>` whenever one is added,
 * removed, retitled or re-timed. Rows keep their DOM identity across a sync —
 * only the text and attributes that actually changed are patched.
 *
 * Because the items stay put they would otherwise render twice, so each one
 * is hidden with an inline `display:none` when it is first wired. The stable
 * form of that is a `e-timeline-item { display: none; }` rule in
 * `components.css`; the inline style is what guarantees it without one.
 *
 * Items are rendered as `<li>` rows with a marker, time label, title and
 * default-slot body. The body is a *clone* of the item's child nodes, re-cloned
 * only when the item's own markup changes. Layout is fully static — there are
 * no animations.
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
  static readonly observedAttributes = ['time-position'];

  private _wired = false;
  private _list: HTMLElement | null = null;
  private _rows = new WeakMap<Element, TimelineRow>();
  private _keys: HTMLElement[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const pos = this.getAttribute('time-position') === 'right' ? 'right' : 'left';
      const list = document.createElement('ol');
      list.className = `ink-timeline ink-timeline--time-${pos}`;
      this._list = list;
      this.appendChild(list);
    }
    this._sync();
    observeItems(this, this._sync, {
      attributeFilter: ['time', 'title', 'variant'],
      isOutput: (n) => this._list?.contains(n) ?? false,
    });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback() {
    if (!this._list) return;
    const pos = this.getAttribute('time-position') === 'right' ? 'right' : 'left';
    this._list.classList.remove('ink-timeline--time-left', 'ink-timeline--time-right');
    this._list.classList.add(`ink-timeline--time-${pos}`);
  }

  /** Authored items, excluding anything cloned into the rendered list. */
  private _items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-timeline-item')].filter(
      (it) => !this._list?.contains(it),
    );
  }

  private readonly _sync = (): void => {
    const list = this._list;
    if (!list) return;
    const items = this._items();

    // Drop rows whose item is gone before positioning the survivors.
    for (const stale of this._keys) {
      if (items.includes(stale)) continue;
      this._rows.get(stale)?.li.remove();
      this._rows.delete(stale);
    }
    this._keys = items;

    items.forEach((item, i) => {
      if (item.style.display !== 'none') item.style.display = 'none';
      let row = this._rows.get(item);
      if (!row) {
        row = ETimeline._makeRow();
        this._rows.set(item, row);
      }
      ETimeline._patchRow(row, item);
      if (list.children[i] !== row.li) list.insertBefore(row.li, list.children[i] ?? null);
    });
  };

  private static _makeRow(): TimelineRow {
    const li = document.createElement('li');
    li.className = 'ink-timeline__item';
    const time = document.createElement('div');
    time.className = 'ink-timeline__time';
    const rail = document.createElement('div');
    rail.className = 'ink-timeline__rail';
    rail.setAttribute('aria-hidden', 'true');
    const marker = document.createElement('span');
    marker.className = 'ink-timeline__marker';
    rail.appendChild(marker);
    const content = document.createElement('div');
    content.className = 'ink-timeline__content';
    li.append(time, rail, content);
    return { li, time, content, title: null, body: null, bodyKey: '' };
  }

  private static _patchRow(row: TimelineRow, item: HTMLElement): void {
    patchAttr(row.li, 'data-variant', item.getAttribute('variant') || 'default');
    patchText(row.time, item.getAttribute('time') || '');

    const title = item.getAttribute('title') || '';
    if (title) {
      if (!row.title) {
        row.title = document.createElement('div');
        row.title.className = 'ink-timeline__title';
        row.content.insertBefore(row.title, row.content.firstChild);
      }
      patchText(row.title, title);
    } else if (row.title) {
      row.title.remove();
      row.title = null;
    }

    const key = item.innerHTML;
    if (item.childNodes.length > 0) {
      if (!row.body) {
        row.body = document.createElement('div');
        row.body.className = 'ink-timeline__body';
        row.content.appendChild(row.body);
        row.bodyKey = '';
      }
      // The authored nodes stay with the item, so the row renders a clone and
      // only re-clones when the item's own markup actually changed.
      if (row.bodyKey !== key) {
        cloneItemBody(item, row.body);
        row.bodyKey = key;
      }
    } else if (row.body) {
      row.body.remove();
      row.body = null;
      row.bodyKey = '';
    }
  }
}
define('e-timeline', ETimeline);

/**
 * @summary Single entry inside an `<e-timeline>`.
 *
 * Acts as a data carrier; the parent timeline renders the actual row and hides
 * this element. The default slot is rendered as the entry body and may contain
 * HTML; editing it after mount updates the rendered row.
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
