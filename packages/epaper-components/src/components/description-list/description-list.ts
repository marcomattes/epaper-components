import { boolAttr, define, intAttr } from '../../core/dom';

/**
 * @summary Key/value list rendered as a semantic `<dl>` grid.
 * @since v1.0.1
 *
 * Reads entries from child `<e-desc-item>` elements at connect time. Each
 * item contributes a term/detail pair. The grid wraps after `columns`
 * pairs and supports horizontal (term beside detail) or vertical (term
 * above detail) layout.
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

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const items = [...this.querySelectorAll('e-desc-item')].map((it) => ({
      term: it.getAttribute('term') || '',
      detail: [...it.childNodes],
    }));
    const cols = Math.min(4, Math.max(1, intAttr(this, 'columns', 1)));
    const layout = this.getAttribute('layout') === 'vertical' ? 'vertical' : 'horizontal';
    const bordered = boolAttr(this, 'bordered');
    const dl = document.createElement('dl');
    dl.className = `ink-desc-list ink-desc-list--${layout}${bordered ? ' ink-desc-list--bordered' : ''}`;
    dl.style.gridTemplateColumns = `repeat(${cols},minmax(0,1fr))`;
    for (const item of items) {
      const pair = document.createElement('div');
      pair.className = 'ink-desc-list__pair';
      const term = document.createElement('dt');
      term.className = 'ink-desc-list__term';
      term.textContent = item.term;
      const detail = document.createElement('dd');
      detail.className = 'ink-desc-list__detail';
      detail.append(...item.detail);
      pair.append(term, detail);
      dl.appendChild(pair);
    }
    this.replaceChildren(dl);
    this._dl = dl;
  }

  attributeChangedCallback() {
    if (!this._dl) return;
    const cols = Math.min(4, Math.max(1, intAttr(this, 'columns', 1)));
    const layout = this.getAttribute('layout') === 'vertical' ? 'vertical' : 'horizontal';
    const bordered = boolAttr(this, 'bordered');
    this._dl.className =
      `ink-desc-list ink-desc-list--${layout}` + (bordered ? ' ink-desc-list--bordered' : '');
    this._dl.style.gridTemplateColumns = `repeat(${cols},minmax(0,1fr))`;
  }
}
define('e-description-list', EDescriptionList);

/**
 * @summary Single key/value pair inside an `<e-description-list>`.
 *
 * Acts as a data carrier; the parent renders the actual `<dt>`/`<dd>`. The
 * default slot is rendered as the detail and may contain HTML.
 *
 * @attr {string} term - The label rendered as `<dt>`.
 *
 * @example
 * <e-desc-item term="Status">Shipped</e-desc-item>
 */
export class EDescItem extends HTMLElement {}
define('e-desc-item', EDescItem);
