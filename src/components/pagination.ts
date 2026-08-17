import { addCleanup, define, intAttr, patchAttr, patchBoolAttr, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';

interface PageCell {
  el: HTMLElement;
  type: 'page' | 'gap';
}

/**
 * @summary Page navigator with previous/next buttons and ellipsized page numbers.
 * @since v1.0.1
 *
 * @attr {number} [current=1] - Current page (1-indexed). Reflected on user navigation.
 * @attr {number} [total=1] - Total number of pages.
 * @attr {number} [sibling-count=1] - Number of sibling pages shown around the current page.
 *
 * @fires {CustomEvent<{value: number}>} e-change - Fired when the user navigates to a different page. `value` is the new 1-indexed page.
 *
 * @example
 * <e-pagination current="3" total="42" sibling-count="1"></e-pagination>
 */
export class EPagination extends HTMLElement {
  static observedAttributes = ['current', 'total', 'sibling-count'];

  private _wired = false;
  private _nav: HTMLElement | null = null;
  private _prevBtn: HTMLButtonElement | null = null;
  private _nextBtn: HTMLButtonElement | null = null;
  private _cells: PageCell[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._build();
    }
    this.addEventListener('click', this._onClick);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback() {
    if (this._wired) this._sync();
  }

  private _onClick = (e: Event): void => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-page]');
    if (!btn || btn.disabled || !this.contains(btn)) return;
    const p = Number(btn.dataset['page']);
    const { current, total } = this._state();
    if (p < 1 || p > total || p === current) return;
    this.setAttribute('current', String(p));
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: p }, bubbles: true }));
  };

  private _pageList(): (number | '…')[] {
    const { current, total, sibling: sib } = this._state();
    const arr: (number | '…')[] = [];
    const totalNumbers = sib * 2 + 5;
    if (total <= totalNumbers) {
      for (let i = 1; i <= total; i++) arr.push(i);
      return arr;
    }
    const left = Math.max(current - sib, 2);
    const right = Math.min(current + sib, total - 1);
    arr.push(1);
    if (left > 2) arr.push('…');
    for (let i = left; i <= right; i++) arr.push(i);
    if (right < total - 1) arr.push('…');
    arr.push(total);
    return arr;
  }

  private _svgFromString(svg: string): Element | null {
    const tpl = document.createElement('template');
    tpl.innerHTML = svg;
    return tpl.content.firstElementChild;
  }

  private _build(): void {
    const { current, total } = this._state();

    const nav = document.createElement('nav');
    nav.className = 'ink-pagination';
    nav.setAttribute('aria-label', 'Pagination');
    this._nav = nav;

    // Prev button
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'ink-pagination__cell';
    prev.dataset['page'] = String(current - 1);
    prev.setAttribute('aria-label', 'Previous');
    prev.disabled = current <= 1;
    const prevIcon = this._svgFromString(iconSvg('chevL', 16));
    if (prevIcon) prev.appendChild(prevIcon);
    this._prevBtn = prev;
    nav.appendChild(prev);

    // Page cells container (fragment-like: cells are direct children of nav)
    this._buildCells(nav, current);

    // Next button
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'ink-pagination__cell';
    next.dataset['page'] = String(current + 1);
    next.setAttribute('aria-label', 'Next');
    next.disabled = current >= total;
    const nextIcon = this._svgFromString(iconSvg('chevR', 16));
    if (nextIcon) next.appendChild(nextIcon);
    this._nextBtn = next;
    nav.appendChild(next);

    this.replaceChildren(nav);
  }

  private _buildCells(parent: HTMLElement, current: number): void {
    this._cells = [];
    const pages = this._pageList();
    for (const p of pages) {
      if (p === '…') {
        const span = document.createElement('span');
        span.className = 'ink-pagination__cell ink-pagination__gap';
        span.textContent = '…';
        parent.insertBefore(span, this._nextBtn);
        this._cells.push({ el: span, type: 'gap' });
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ink-pagination__cell';
        btn.dataset['page'] = String(p);
        btn.textContent = String(p);
        if (p === current) btn.setAttribute('aria-current', 'page');
        parent.insertBefore(btn, this._nextBtn);
        this._cells.push({ el: btn, type: 'page' });
      }
    }
  }

  private _removeCells(): void {
    for (const c of this._cells) c.el.remove();
    this._cells = [];
  }

  private _sync(): void {
    if (!this._nav || !this._prevBtn || !this._nextBtn) return;
    const { current, total } = this._state();

    // Prev/Next
    this._prevBtn.dataset['page'] = String(current - 1);
    patchBoolAttr(this._prevBtn, 'disabled', current <= 1);
    this._nextBtn.dataset['page'] = String(current + 1);
    patchBoolAttr(this._nextBtn, 'disabled', current >= total);

    // Check if the page structure changed (total or sibling-count changed)
    const newPages = this._pageList();
    const oldPages = this._cells.map((c) =>
      c.type === 'gap' ? '…' : Number(c.el.dataset['page']),
    );
    const structureMatch =
      newPages.length === oldPages.length && newPages.every((p, i) => p === oldPages[i]);

    if (!structureMatch) {
      // Rebuild page cells
      this._removeCells();
      this._buildCells(this._nav, current);
    } else {
      // Patch aria-current only
      for (const c of this._cells) {
        if (c.type !== 'page') continue;
        const btn = c.el as HTMLButtonElement;
        const p = Number(btn.dataset['page']);
        patchAttr(btn, 'aria-current', p === current ? 'page' : null);
      }
    }
  }

  private _state(): { current: number; total: number; sibling: number } {
    const total = Math.max(1, Math.min(1_000_000, intAttr(this, 'total', 1)));
    const current = Math.max(1, Math.min(total, intAttr(this, 'current', 1)));
    const sibling = Math.max(0, Math.min(10, intAttr(this, 'sibling-count', 1)));
    return { current, total, sibling };
  }
}

define('e-pagination', EPagination);
