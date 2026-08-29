import {
  addCleanup,
  clampedNumAttr,
  define,
  EpaperElement,
  onGlobal,
  patchAttr,
  runCleanups,
} from '../../core/dom';

/**
 * @summary Two-pane resizable splitter with mouse and keyboard support.
 * @since v1.0.1
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
export class ESplitter extends EpaperElement {
  static readonly observedAttributes = ['orientation', 'initial', 'min', 'max'];

  private _wired = false;
  private _pa: HTMLElement | null = null;
  private _pb: HTMLElement | null = null;
  private _handle: HTMLElement | null = null;
  private _wrap: HTMLElement | null = null;
  private _pct = 50;
  private _isH = true;
  private _dragging = false;
  private _moveFrame: number | null = null;
  private _pendingPct: number | null = null;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._build();
    }
    this._handle?.addEventListener('mousedown', this._onDown);
    this._handle?.addEventListener('keydown', this._onKeydown);
    addCleanup(this, () => this._handle?.removeEventListener('mousedown', this._onDown));
    addCleanup(this, () => this._handle?.removeEventListener('keydown', this._onKeydown));
    onGlobal(this, window, 'mousemove', this._onMove);
    onGlobal(this, window, 'mouseup', this._onUp);
    addCleanup(this, () => {
      if (this._moveFrame != null) cancelAnimationFrame(this._moveFrame);
      this._moveFrame = null;
      this._pendingPct = null;
    });
  }

  disconnectedCallback() {
    this._dragging = false;
    runCleanups(this);
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    if (name === 'orientation') this._applyOrientation();
    else if (name === 'initial') this._setPct(clampedNumAttr(this, 'initial', 50, 0, 100));
    else {
      const { min, max } = this._bounds();
      if (this._handle) {
        patchAttr(this._handle, 'aria-valuemin', String(min));
        patchAttr(this._handle, 'aria-valuemax', String(max));
      }
      this._setPct(this._pct);
    }
  }

  private _build(): void {
    const first = this.querySelector<HTMLElement>('[slot="a"]');
    const second = this.querySelector<HTMLElement>('[slot="b"]');
    const wrap = document.createElement('div');
    wrap.className = 'ink-splitter';

    const paneA = document.createElement('div');
    paneA.className = 'ink-splitter__pane';
    paneA.dataset['pane'] = 'a';
    if (first) paneA.appendChild(first);

    const handle = document.createElement('div');
    handle.className = 'ink-splitter__handle';
    handle.setAttribute('role', 'separator');
    handle.tabIndex = 0;

    const paneB = document.createElement('div');
    paneB.className = 'ink-splitter__pane';
    paneB.dataset['pane'] = 'b';
    if (second) paneB.appendChild(second);

    wrap.append(paneA, handle, paneB);
    this.replaceChildren(wrap);
    this._wrap = wrap;
    this._pa = paneA;
    this._pb = paneB;
    this._handle = handle;
    this._applyOrientation();
    const { min, max } = this._bounds();
    patchAttr(handle, 'aria-valuemin', String(min));
    patchAttr(handle, 'aria-valuemax', String(max));
    this._setPct(clampedNumAttr(this, 'initial', 50, min, max));
  }

  private _bounds(): { min: number; max: number } {
    const a = clampedNumAttr(this, 'min', 15, 0, 100);
    const b = clampedNumAttr(this, 'max', 85, 0, 100);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  private _applyOrientation(): void {
    this._isH = this.getAttribute('orientation') !== 'vertical';
    this._wrap?.classList.toggle('ink-splitter--vertical', !this._isH);
    if (this._handle) {
      patchAttr(this._handle, 'aria-orientation', this._isH ? 'vertical' : 'horizontal');
    }
    if (this._pa) {
      this._pa.style.width = '';
      this._pa.style.height = '';
    }
    if (this._pb) {
      this._pb.style.width = '';
      this._pb.style.height = '';
    }
    this._setPct(this._pct);
  }

  private readonly _onDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this._dragging = true;
    e.preventDefault();
  };

  private readonly _onMove = (e: MouseEvent): void => {
    if (!this._dragging || !this._wrap) return;
    const rect = this._wrap.getBoundingClientRect();
    if ((this._isH && rect.width === 0) || (!this._isH && rect.height === 0)) return;
    const raw = this._isH
      ? ((e.clientX - rect.left) / rect.width) * 100
      : ((e.clientY - rect.top) / rect.height) * 100;
    this._pendingPct = raw;
    if (this._moveFrame != null) return;
    this._moveFrame = requestAnimationFrame(() => {
      this._moveFrame = null;
      if (this._pendingPct != null) this._setPct(Math.round(this._pendingPct));
      this._pendingPct = null;
    });
  };

  private readonly _onUp = (): void => {
    this._dragging = false;
  };

  private readonly _onKeydown = (e: KeyboardEvent): void => {
    const decrement = this._isH ? e.key === 'ArrowLeft' : e.key === 'ArrowUp';
    const increment = this._isH ? e.key === 'ArrowRight' : e.key === 'ArrowDown';
    if (!decrement && !increment) return;
    e.preventDefault();
    this._setPct(this._pct + (increment ? 2 : -2));
  };

  private _setPct(p: number): void {
    const { min, max } = this._bounds();
    this._pct = Math.max(min, Math.min(max, p));
    const dim = this._isH ? 'width' : 'height';
    if (this._pa) this._pa.style[dim] = `${this._pct}%`;
    if (this._pb) this._pb.style[dim] = `${100 - this._pct}%`;
    if (this._handle) patchAttr(this._handle, 'aria-valuenow', String(this._pct));
  }
}

define('e-splitter', ESplitter);
