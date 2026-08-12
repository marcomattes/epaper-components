import { addCleanup, define, numAttr, onGlobal, runCleanups } from '../core/dom';

/**
 * @summary Two-pane resizable splitter with mouse and keyboard support.
 *
 * @attr {'horizontal'|'vertical'} [orientation='horizontal'] - Layout direction. Horizontal places panes side by side; vertical stacks them.
 * @attr {number} [initial=50] - Initial size of pane `a` as a percentage.
 * @attr {number} [min=15] - Minimum percentage for pane `a`.
 * @attr {number} [max=85] - Maximum percentage for pane `a`.
 *
 * @slot a - Content for the first pane.
 * @slot b - Content for the second pane.
 *
 * @example
 * <e-splitter orientation="horizontal" initial="60">
 *   <div slot="a">Left</div>
 *   <div slot="b">Right</div>
 * </e-splitter>
 */
export class ESplitter extends HTMLElement {
  private _wired = false;
  private _pa: HTMLElement | null = null;
  private _pb: HTMLElement | null = null;
  private _handle: HTMLElement | null = null;
  private _wrap: HTMLElement | null = null;
  private _pct = 50;
  private _isH = true;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const orient = this.getAttribute('orientation') || 'horizontal';
    const isH = orient === 'horizontal';
    const initial = numAttr(this, 'initial', 50);
    const min = numAttr(this, 'min', 15);
    const max = numAttr(this, 'max', 85);
    const a = this.querySelector('[slot="a"]');
    const b = this.querySelector('[slot="b"]');
    const aHtml = a ? a.outerHTML : '';
    const bHtml = b ? b.outerHTML : '';
    this.innerHTML = `
      <div class="ink-splitter${isH ? '' : ' ink-splitter--vertical'}">
        <div class="ink-splitter__pane" data-pane="a">${aHtml}</div>
        <div class="ink-splitter__handle" role="separator"
             aria-orientation="${isH ? 'vertical' : 'horizontal'}"
             aria-valuenow="${initial}" tabindex="0"></div>
        <div class="ink-splitter__pane" data-pane="b">${bHtml}</div>
      </div>`;
    this._pa = this.querySelector('[data-pane="a"]');
    this._pb = this.querySelector('[data-pane="b"]');
    this._handle = this.querySelector('.ink-splitter__handle');
    this._wrap = this.firstElementChild as HTMLElement;
    this._pct = initial;
    this._isH = isH;
    this._setPct(initial);

    let dragging = false;
    const onMove = (e: MouseEvent) => {
      if (!dragging || !this._wrap) return;
      const r = this._wrap.getBoundingClientRect();
      const raw = isH
        ? ((e.clientX - r.left) / r.width) * 100
        : ((e.clientY - r.top) / r.height) * 100;
      const c = Math.round(Math.max(min, Math.min(max, raw)));
      this._setPct(c);
    };
    const onUp = () => {
      dragging = false;
    };
    const onDown = (e: MouseEvent) => {
      dragging = true;
      e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      const step = 2;
      if (isH && e.key === 'ArrowLeft') this._setPct(Math.max(min, this._pct - step));
      if (isH && e.key === 'ArrowRight') this._setPct(Math.min(max, this._pct + step));
      if (!isH && e.key === 'ArrowUp') this._setPct(Math.max(min, this._pct - step));
      if (!isH && e.key === 'ArrowDown') this._setPct(Math.min(max, this._pct + step));
    };
    this._handle!.addEventListener('mousedown', onDown);
    this._handle!.addEventListener('keydown', onKey);
    addCleanup(this, () => this._handle?.removeEventListener('mousedown', onDown));
    addCleanup(this, () => this._handle?.removeEventListener('keydown', onKey));
    onGlobal(this, window, 'mousemove', onMove);
    onGlobal(this, window, 'mouseup', onUp);
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  private _setPct(p: number): void {
    this._pct = p;
    const dim = this._isH ? 'width' : 'height';
    if (this._pa) this._pa.style[dim] = `${p}%`;
    if (this._pb) this._pb.style[dim] = `${100 - p}%`;
    this._handle?.setAttribute('aria-valuenow', String(p));
  }
}

define('e-splitter', ESplitter);
