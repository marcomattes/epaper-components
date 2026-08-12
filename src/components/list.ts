import { boolAttr, define, patchBoolAttr, patchText } from '../core/dom';

/**
 * @summary Structured list with header / footer slots and `<e-list-item>` rows.
 *
 * Different from a native `<ul>` because items are slot-driven (title,
 * description, leading, trailing) and the container owns the framing.
 *
 * @attr {boolean} [bordered] - Renders an outer 2 px border.
 * @attr {boolean} [split=true] - Draws a 2 px divider between rows. Set `split="false"` to disable.
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
 */
export class EList extends HTMLElement {
  static observedAttributes = ['bordered', 'split', 'header-title'];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _headerTitle: HTMLElement | null = null;

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

    const body = document.createElement('div');
    body.className = 'ink-list__body';
    for (const it of items) body.appendChild(it);
    root.appendChild(body);

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
    if (name === 'header-title' && this._headerTitle) {
      patchText(this._headerTitle, this.getAttribute('header-title') || '');
    } else {
      this._sync();
    }
  }

  private _sync(): void {
    if (!this._root) return;
    const bordered = boolAttr(this, 'bordered');
    const split = this.getAttribute('split') !== 'false';
    patchBoolAttr(this._root, 'data-bordered', bordered);
    patchBoolAttr(this._root, 'data-split', split);
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
export class EListItem extends HTMLElement {
  static observedAttributes = ['title', 'description'];

  private _wired = false;
  private _row: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _descEl: HTMLElement | null = null;

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
    if (!this._wired || !this._row) return;
    if (name === 'title') {
      const v = this.getAttribute('title') || '';
      if (v && !this._titleEl) {
        const t = document.createElement('div');
        t.className = 'ink-list__title';
        t.textContent = v;
        const main = this._row.querySelector<HTMLElement>('.ink-list__main');
        if (main) main.insertBefore(t, main.firstChild);
        this._titleEl = t;
      } else if (v && this._titleEl) {
        patchText(this._titleEl, v);
      } else if (!v && this._titleEl) {
        this._titleEl.remove();
        this._titleEl = null;
      }
    } else if (name === 'description') {
      const v = this.getAttribute('description') || '';
      if (v && !this._descEl) {
        const d = document.createElement('div');
        d.className = 'ink-list__desc';
        d.textContent = v;
        const main = this._row.querySelector<HTMLElement>('.ink-list__main');
        if (main) main.appendChild(d);
        this._descEl = d;
      } else if (v && this._descEl) {
        patchText(this._descEl, v);
      } else if (!v && this._descEl) {
        this._descEl.remove();
        this._descEl = null;
      }
    }
  }
}

define('e-list-item', EListItem);
