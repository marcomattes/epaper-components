import {
  boolAttr,
  captureWrap,
  define,
  EpaperElement,
  intAttr,
  patchAttr,
  patchText,
} from '../../core/dom';

/**
 * @summary Numeric or dot indicator overlaid on a child element.
 * @since v1.0.1
 *
 * Wraps its children and decorates them with a count chip in the corner.
 *
 * @attr {number} [count=0] - Numeric value to display. `0` hides the indicator unless `dot` is set.
 * @attr {number} [max=99] - Upper bound; values above render as `<max>+`.
 * @attr {boolean} [dot] - Show a small dot instead of the numeric chip.
 *
 * @example
 * <e-badge-count count="12"><e-button>Inbox</e-button></e-badge-count>
 */
export class EBadgeCount extends EpaperElement {
  static readonly observedAttributes = ['count', 'max', 'dot'];

  private _wrap: HTMLElement | null = null;
  private _badge: HTMLElement | null = null;

  connectedCallback() {
    if (!this._wrap) {
      this._wrap = captureWrap(this, 'span');
      this._wrap.classList.add('ink-badge-count');
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._wrap) this._render();
  }

  private _render(): void {
    if (!this._wrap) return;
    const count = Math.max(0, intAttr(this, 'count', 0));
    const max = Math.max(0, intAttr(this, 'max', 99));
    const dot = boolAttr(this, 'dot');
    const display = count > max ? `${max}+` : String(count);
    const wantClass = dot ? 'ink-badge-count__dot' : 'ink-badge-count__num';
    const visible = dot || count > 0;

    if (!visible) {
      if (this._badge) {
        this._badge.remove();
        this._badge = null;
      }
      return;
    }

    if (this._badge?.className !== wantClass) {
      if (this._badge) this._badge.remove();
      this._badge = document.createElement('span');
      this._badge.className = wantClass;
      this._wrap.appendChild(this._badge);
    }
    if (dot) {
      patchAttr(this._badge, 'role', 'status');
      patchAttr(this._badge, 'aria-label', count > 0 ? String(count) : 'Notification');
      patchText(this._badge, '');
    } else {
      patchAttr(this._badge, 'role', null);
      patchAttr(this._badge, 'aria-label', null);
      patchText(this._badge, display);
    }
  }
}

define('e-badge-count', EBadgeCount);
