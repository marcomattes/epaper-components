import { boolAttr, define, EpaperElement, patchBoolAttr, patchText } from '../../core/dom';

/**
 * @summary Structured list with header / footer slots and `<e-list-item>` rows.
 * @since v1.0.1
 *
 * Different from a native `<ul>` because items are slot-driven (title,
 * description, leading, trailing) and the container owns the framing.
 *
 * @attr {boolean} [bordered] - Renders an outer 2 px border.
 * @attr {boolean} [split=true] - Draws a 2 px divider between rows. Set `split="false"` to disable.
 * @attr {boolean} [ordered] - Renders the row container as an `<ol>` and numbers the rows, for a
 *   list whose sequence carries meaning (numbered Bekanntmachungspunkte, procedure steps). Rows keep
 *   their `<e-list-item>` identity, so the numbering comes from a CSS counter rather than from
 *   native `<li>` markers. Toggling it after mount swaps the container and moves the existing rows
 *   across untouched. @since v1.3.0
 * @attr {string} [header-title] - Optional header text rendered above the rows.
 *
 * @slot - Default slot for `<e-list-item>` children.
 * @slot header - Custom header content (replaces `header-title`).
 * @slot footer - Footer area.
 *
 * @example
 * <e-list bordered>
 *   <e-list-item title="Annual report" description="Finance · 2026"></e-list-item>
 *   <e-list-item title="Sustainability"></e-list-item>
 * </e-list>
 *
 * @example
 * <e-list ordered header-title="Tagesordnung">
 *   <e-list-item title="Eröffnung"></e-list-item>
 *   <e-list-item title="Haushaltssatzung 2026"></e-list-item>
 * </e-list>
 */
export class EList extends EpaperElement {
  static readonly observedAttributes = ['bordered', 'split', 'ordered', 'header-title'];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _body: HTMLElement | null = null;
  private _headerTitle: HTMLElement | null = null;
  private _header: HTMLElement | null = null;
  private _customHeader = false;
  private _ordered = false;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;

    const headerSlot = this.querySelector<HTMLElement>('[slot="header"]');
    const footerSlot = this.querySelector<HTMLElement>('[slot="footer"]');
    if (headerSlot) headerSlot.remove();
    if (footerSlot) footerSlot.remove();

    const items = [...this.children];

    const root = document.createElement('div');
    root.className = 'ink-list';
    root.setAttribute('role', 'list');

    const headerTitle = this.getAttribute('header-title') || '';
    if (headerSlot || headerTitle) {
      const header = document.createElement('div');
      header.className = 'ink-list__header';
      this._header = header;
      this._customHeader = !!headerSlot;
      if (headerSlot) {
        header.appendChild(headerSlot);
      } else {
        const t = document.createElement('div');
        t.className = 'ink-list__header-title';
        t.textContent = headerTitle;
        header.appendChild(t);
        this._headerTitle = t;
      }
      root.appendChild(header);
    }

    this._ordered = boolAttr(this, 'ordered');
    const body = document.createElement(this._ordered ? 'ol' : 'div');
    body.className = 'ink-list__body';
    for (const it of items) body.appendChild(it);
    root.appendChild(body);
    this._body = body;

    if (footerSlot) {
      const footer = document.createElement('div');
      footer.className = 'ink-list__footer';
      footer.appendChild(footerSlot);
      root.appendChild(footer);
    }

    this.replaceChildren(root);
    this._root = root;
    this._sync();
  }

  attributeChangedCallback(name: string) {
    if (!this._wired || !this._root) return;
    if (name === 'header-title') this._syncHeaderTitle();
    else this._sync();
  }

  private _sync(): void {
    if (!this._root) return;
    const bordered = boolAttr(this, 'bordered');
    const split = this.getAttribute('split') !== 'false';
    patchBoolAttr(this._root, 'data-bordered', bordered);
    patchBoolAttr(this._root, 'data-split', split);
    this._syncOrdered();
  }

  /**
   * `ordered` decides the container element, so a change has to swap it. The
   * rows themselves are moved over, never recreated: their DOM identity — and
   * with it any state living inside a row — survives the toggle.
   */
  private _syncOrdered(): void {
    const ordered = boolAttr(this, 'ordered');
    patchBoolAttr(this._root!, 'data-ordered', ordered);
    if (ordered === this._ordered || !this._body) return;
    this._ordered = ordered;
    const next = document.createElement(ordered ? 'ol' : 'div');
    next.className = this._body.className;
    while (this._body.firstChild) next.appendChild(this._body.firstChild);
    this._body.replaceWith(next);
    this._body = next;
  }

  private _syncHeaderTitle(): void {
    if (!this._root || this._customHeader) return;
    const value = this.getAttribute('header-title') || '';
    if (value && !this._header) {
      const header = document.createElement('div');
      header.className = 'ink-list__header';
      const title = document.createElement('div');
      title.className = 'ink-list__header-title';
      title.textContent = value;
      header.appendChild(title);
      const body = this._root.querySelector('.ink-list__body');
      this._root.insertBefore(header, body);
      this._header = header;
      this._headerTitle = title;
    } else if (!value && this._header) {
      this._header.remove();
      this._header = null;
      this._headerTitle = null;
    } else if (this._headerTitle) {
      patchText(this._headerTitle, value);
    }
  }
}

define('e-list', EList);

/**
 * @summary Single row inside an `<e-list>`.
 *
 * @attr {string} [title] - Primary text.
 * @attr {string} [description] - Secondary text shown below the title.
 *
 * @slot - Default slot for custom row content (replaces `title`/`description`).
 * @slot leading - Element rendered before the text (icon, avatar).
 * @slot trailing - Element rendered after the text (action, badge).
 */
export class EListItem extends EpaperElement {
  static readonly observedAttributes = ['title', 'description'];

  private _wired = false;
  private _row: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _descEl: HTMLElement | null = null;
  private _customContent = false;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const leading = this.querySelector<HTMLElement>('[slot="leading"]');
    const trailing = this.querySelector<HTMLElement>('[slot="trailing"]');
    if (leading) leading.remove();
    if (trailing) trailing.remove();

    const title = this.getAttribute('title') || '';
    const desc = this.getAttribute('description') || '';
    const hasSlot = [...this.childNodes].some(
      (n) =>
        n.nodeType === Node.ELEMENT_NODE ||
        (n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim() !== ''),
    );
    this._customContent = hasSlot;

    this.setAttribute('role', 'listitem');
    const row = document.createElement('div');
    row.className = 'ink-list__item';

    if (leading) {
      const wrap = document.createElement('div');
      wrap.className = 'ink-list__leading';
      wrap.appendChild(leading);
      row.appendChild(wrap);
    }

    const main = document.createElement('div');
    main.className = 'ink-list__main';
    if (hasSlot) {
      while (this.firstChild) main.appendChild(this.firstChild);
    } else {
      if (title) {
        const t = document.createElement('div');
        t.className = 'ink-list__title';
        t.textContent = title;
        main.appendChild(t);
        this._titleEl = t;
      }
      if (desc) {
        const d = document.createElement('div');
        d.className = 'ink-list__desc';
        d.textContent = desc;
        main.appendChild(d);
        this._descEl = d;
      }
    }
    row.appendChild(main);

    if (trailing) {
      const wrap = document.createElement('div');
      wrap.className = 'ink-list__trailing';
      wrap.appendChild(trailing);
      row.appendChild(wrap);
    }

    this.appendChild(row);
    this._row = row;
  }

  attributeChangedCallback(name: string) {
    if (!this._wired || !this._row || this._customContent) return;
    if (name === 'title') {
      this._titleEl = this._syncOptionalText(
        'title',
        this._titleEl,
        'ink-list__title',
        (main, el) => main.insertBefore(el, main.firstChild),
      );
    } else if (name === 'description') {
      this._descEl = this._syncOptionalText(
        'description',
        this._descEl,
        'ink-list__desc',
        (main, el) => main.appendChild(el),
      );
    }
  }

  /** Creates, updates or removes an optional title/description child, keeping both attributes' handling identical. */
  private _syncOptionalText(
    attr: string,
    existing: HTMLElement | null,
    className: string,
    insert: (main: HTMLElement, el: HTMLElement) => void,
  ): HTMLElement | null {
    const v = this.getAttribute(attr) || '';
    if (v && !existing) {
      const el = document.createElement('div');
      el.className = className;
      el.textContent = v;
      const main = this._row!.querySelector<HTMLElement>('.ink-list__main');
      if (main) insert(main, el);
      return el;
    }
    if (v && existing) {
      patchText(existing, v);
      return existing;
    }
    if (!v && existing) {
      existing.remove();
      return null;
    }
    return existing;
  }
}

define('e-list-item', EListItem);
