import { define, esc, numAttr, onGlobal, patchAttr, runCleanups } from '../core/dom';
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
  static observedAttributes = ['visibility-height', 'label', 'target'];

  private _wired = false;
  private _btn: HTMLButtonElement | null = null;
  private _scrollTarget: HTMLElement | Window = window;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const label = this.getAttribute('label') || 'Back to top';
    this.innerHTML = `<button type="button" class="ink-back-top" hidden aria-label="${esc(label)}">
      ${iconSvg('arrowU', 22)}
    </button>`;
    this._btn = this.firstElementChild as HTMLButtonElement;
    this._btn.addEventListener('click', () => {
      const y = this._scrollY();
      const t = this._scrollTarget;
      if (t === window) window.scrollTo({ top: 0 });
      else (t as HTMLElement).scrollTop = 0;
      this.dispatchEvent(
        new CustomEvent('e-click', {
          detail: { value: y },
          bubbles: true,
          composed: true,
        }),
      );
    });
    this._resolveTarget();
    this._update();
    if (this._scrollTarget === window) {
      onGlobal(this, window, 'scroll', this._update, { passive: true });
    } else {
      const el = this._scrollTarget as HTMLElement;
      const handler = this._update;
      el.addEventListener('scroll', handler, { passive: true });
      // Register removal under the cleanup registry.
      onGlobal(this, window, 'beforeunload', () => el.removeEventListener('scroll', handler));
    }
  }

  attributeChangedCallback(name: string) {
    if (!this._btn) return;
    if (name === 'label') {
      patchAttr(this._btn, 'aria-label', this.getAttribute('label') || 'Back to top');
    } else if (name === 'target') {
      this._resolveTarget();
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
      const el = document.querySelector<HTMLElement>(sel);
      this._scrollTarget = el || window;
    } else {
      this._scrollTarget = window;
    }
  }

  private _scrollY(): number {
    const t = this._scrollTarget;
    return t === window ? window.scrollY : (t as HTMLElement).scrollTop;
  }

  private _update = (): void => {
    if (!this._btn) return;
    const threshold = numAttr(this, 'visibility-height', 400);
    const visible = this._scrollY() >= threshold;
    patchAttr(this._btn, 'hidden', visible ? null : '');
  };
}
define('e-back-top', EBackTop);
