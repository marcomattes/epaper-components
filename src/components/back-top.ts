import { addCleanup, define, esc, numAttr, onGlobal, patchAttr, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';

/**
 * @summary Floating button that scrolls the window (or a target) to the top.
 *
 * Hidden until the scroll position passes `visibility-height`. Click triggers
 * `window.scrollTo({ top: 0 })`. Position defaults to bottom-right but can
 * be overridden through CSS variables `--ink-back-top-bottom` and
 * `--ink-back-top-right`.
 *
 * @attr {number} [visibility-height=400] - Pixels of scroll required before the button appears.
 * @attr {string} [label='Back to top'] - Accessible label on the button.
 * @attr {string} [target] - CSS selector for a scroll container; defaults to `window`.
 *
 * @fires {CustomEvent<{value: number}>} e-click - Fired after the scroll-to-top is requested. `value` is the scroll position when the button was pressed.
 *
 * @example
 * <e-back-top visibility-height="200"></e-back-top>
 */
export class EBackTop extends HTMLElement {
  static readonly observedAttributes = ['visibility-height', 'label', 'target'];

  private _wired = false;
  private _btn: HTMLButtonElement | null = null;
  private _scrollTarget: HTMLElement | Window = window;
  private _removeScrollListener: (() => void) | null = null;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const label = this.getAttribute('label') || 'Back to top';
      this.innerHTML = `<button type="button" class="ink-back-top" hidden aria-label="${esc(label)}">
      ${iconSvg('arrowU', 22)}
    </button>`;
      this._btn = this.firstElementChild as HTMLButtonElement;
    }
    this._btn?.addEventListener('click', this._onClick);
    addCleanup(this, () => this._btn?.removeEventListener('click', this._onClick));
    this._resolveTarget();
    this._bindScrollTarget();
    this._update();
  }

  attributeChangedCallback(name: string) {
    if (!this._btn) return;
    if (name === 'label') {
      patchAttr(this._btn, 'aria-label', this.getAttribute('label') || 'Back to top');
    } else if (name === 'target') {
      this._resolveTarget();
      if (this.isConnected) this._bindScrollTarget();
      this._update();
    } else if (name === 'visibility-height') {
      this._update();
    }
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  private _resolveTarget(): void {
    const sel = this.getAttribute('target');
    if (sel) {
      try {
        this._scrollTarget = document.querySelector<HTMLElement>(sel) || window;
      } catch {
        this._scrollTarget = window;
      }
    } else {
      this._scrollTarget = window;
    }
  }

  private _bindScrollTarget(): void {
    this._removeScrollListener?.();
    const target = this._scrollTarget;
    if (target === window) {
      this._removeScrollListener = onGlobal(this, window, 'scroll', this._update, {
        passive: true,
      });
    } else {
      target.addEventListener('scroll', this._update, { passive: true });
      const remove = (): void => target.removeEventListener('scroll', this._update);
      addCleanup(this, remove);
      this._removeScrollListener = remove;
    }
  }

  private _onClick = (): void => {
    const y = this._scrollY();
    if (this._scrollTarget === window) window.scrollTo({ top: 0 });
    else (this._scrollTarget as HTMLElement).scrollTop = 0;
    this.dispatchEvent(
      new CustomEvent('e-click', {
        detail: { value: y },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _scrollY(): number {
    const t = this._scrollTarget;
    return t === window ? window.scrollY : (t as HTMLElement).scrollTop;
  }

  private _update = (): void => {
    if (!this._btn) return;
    const threshold = Math.max(0, numAttr(this, 'visibility-height', 400));
    const visible = this._scrollY() >= threshold;
    patchAttr(this._btn, 'hidden', visible ? null : '');
  };
}
define('e-back-top', EBackTop);
