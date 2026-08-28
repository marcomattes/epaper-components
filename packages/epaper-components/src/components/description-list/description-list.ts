import {
  boolAttr,
  cloneItemBody,
  define,
  intAttr,
  observeItems,
  patchText,
  runCleanups,
} from '../../core/dom';

/** Rendered dt/dd pair plus the cached detail key that decides re-cloning. */
interface DescPair {
  pair: HTMLElement;
  term: HTMLElement;
  detail: HTMLElement;
  detailKey: string;
}

/**
 * @summary Key/value list rendered as a semantic `<dl>` grid.
 * @since v1.0.1
 *
 * Reads entries from child `<e-desc-item>` elements and keeps them live: the
 * authored items stay in the light DOM as the source of truth, and a
 * `MutationObserver` re-syncs the rendered `<dl>` whenever an item is added,
 * removed, or has its `term` or detail content changed. Pairs keep their DOM
 * identity across a sync — only what actually changed is patched.
 *
 * Because the items stay put they would otherwise render twice, so each one is
 * hidden with an inline `display:none` when it is first wired. The stable form
 * of that is a `e-desc-item { display: none; }` rule in `components.css`; the
 * inline style is what guarantees it without one.
 *
 * Each item contributes a term/detail pair; the detail is a *clone* of the
 * item's child nodes, re-cloned only when the item's own markup changes. The
 * grid wraps after `columns` pairs and supports horizontal (term beside
 * detail) or vertical (term above detail) layout.
 *
 * @attr {1|2|3|4} [columns=1] - Number of pairs per row.
 * @attr {'horizontal'|'vertical'} [layout='horizontal'] - Term placement relative to the detail.
 * @attr {boolean} [bordered] - Adds a 2px border and divider lines between pairs. `bordered="false"` counts as off.
 *
 * @slot - Default slot for `<e-desc-item>` children.
 *
 * @example
 * <e-description-list columns="2" bordered>
 *   <e-desc-item term="Status">Shipped</e-desc-item>
 *   <e-desc-item term="Tracking">EP-2048-AX</e-desc-item>
 * </e-description-list>
 */
export class EDescriptionList extends HTMLElement {
  static readonly observedAttributes = ['columns', 'layout', 'bordered'];

  private _wired = false;
  private _dl: HTMLElement | null = null;
  private readonly _pairs = new WeakMap<Element, DescPair>();
  private _keys: HTMLElement[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const dl = document.createElement('dl');
      this._dl = dl;
      this._applyAttrs();
      this.appendChild(dl);
    }
    this._sync();
    observeItems(this, this._sync, {
      // `true` rather than `['term']`: an attribute edit inside the item's
      // slotted detail markup (e.g. an `<a href>`) must also re-clone it, and
      // that can land on any attribute of any descendant, not just `term`.
      attributeFilter: true,
      isOutput: (n) => this._dl?.contains(n) ?? false,
    });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback() {
    if (!this._dl) return;
    this._applyAttrs();
  }

  private _applyAttrs(): void {
    const dl = this._dl!;
    const cols = Math.min(4, Math.max(1, intAttr(this, 'columns', 1)));
    const layout = this.getAttribute('layout') === 'vertical' ? 'vertical' : 'horizontal';
    const bordered = boolAttr(this, 'bordered');
    dl.className =
      `ink-desc-list ink-desc-list--${layout}` + (bordered ? ' ink-desc-list--bordered' : '');
    dl.style.gridTemplateColumns = `repeat(${cols},minmax(0,1fr))`;
  }

  /** Authored items, excluding anything cloned into the rendered list. */
  private _items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-desc-item')].filter(
      (it) => !this._dl?.contains(it),
    );
  }

  private readonly _sync = (): void => {
    const dl = this._dl;
    if (!dl) return;
    const items = this._items();

    for (const stale of this._keys) {
      if (items.includes(stale)) continue;
      this._pairs.get(stale)?.pair.remove();
      this._pairs.delete(stale);
    }
    this._keys = items;

    items.forEach((item, i) => {
      if (item.style.display !== 'none') item.style.display = 'none';
      let entry = this._pairs.get(item);
      if (!entry) {
        entry = EDescriptionList._makePair();
        this._pairs.set(item, entry);
      }
      EDescriptionList._patchPair(entry, item);
      if (dl.children[i] !== entry.pair) dl.insertBefore(entry.pair, dl.children[i] ?? null);
    });
  };

  private static _makePair(): DescPair {
    const pair = document.createElement('div');
    pair.className = 'ink-desc-list__pair';
    const term = document.createElement('dt');
    term.className = 'ink-desc-list__term';
    const detail = document.createElement('dd');
    detail.className = 'ink-desc-list__detail';
    pair.append(term, detail);
    return { pair, term, detail, detailKey: '' };
  }

  private static _patchPair(entry: DescPair, item: HTMLElement): void {
    patchText(entry.term, item.getAttribute('term') || '');
    // The authored nodes stay with the item, so the pair renders a clone and
    // only re-clones when the item's own markup actually changed.
    const key = item.innerHTML;
    if (entry.detailKey === key) return;
    cloneItemBody(item, entry.detail);
    entry.detailKey = key;
  }
}
define('e-description-list', EDescriptionList);

/**
 * @summary Single key/value pair inside an `<e-description-list>`.
 *
 * Acts as a data carrier; the parent renders the actual `<dt>`/`<dd>` and hides
 * this element. The default slot is rendered as the detail and may contain
 * HTML; editing it after mount updates the rendered pair.
 *
 * @attr {string} term - The label rendered as `<dt>`.
 *
 * @example
 * <e-desc-item term="Status">Shipped</e-desc-item>
 */
export class EDescItem extends HTMLElement {}
define('e-desc-item', EDescItem);
