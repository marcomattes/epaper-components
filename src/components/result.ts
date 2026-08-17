import { define, esc, patchText } from '../core/dom';
import { iconSvg } from '../core/icons';

type Status = 'success' | 'error' | 'warning' | 'info' | '404';

const STATUS_ICON: Record<Status, string> = {
  success: 'check',
  error: 'close',
  warning: 'bell',
  info: 'doc',
  '404': 'search',
};

const isStatus = (s: string | null): s is Status =>
  s === 'success' || s === 'error' || s === 'warning' || s === 'info' || s === '404';

/**
 * @summary Status page block (success / error / 404 / info / warning).
 * @since v1.0.1
 *
 * Use as the body of a confirmation page or an error fallback. Composes an
 * icon, a large title, optional description and a slotted action area.
 *
 * @attr {'success'|'error'|'warning'|'info'|'404'} [status='info'] - Status preset; controls the icon.
 * @attr {string} [title] - Headline.
 * @attr {string} [description] - Supporting text.
 *
 * @slot action - Trailing action area (e.g. one or two buttons).
 *
 * @example
 * <e-result status="success" title="Order placed" description="We sent you a receipt.">
 *   <e-button slot="action" variant="primary">Continue</e-button>
 * </e-result>
 */
export class EResult extends HTMLElement {
  static observedAttributes = ['status', 'title', 'description'];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _iconWrap: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _descEl: HTMLElement | null = null;
  private _actionWrap: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const action = this.querySelector<HTMLElement>('[slot="action"]');
    if (action) action.remove();
    const status = this._status();
    const title = this.getAttribute('title') || '';
    const desc = this.getAttribute('description') || '';
    this.innerHTML = `<section class="ink-result" data-status="${status}" role="status">
      <div class="ink-result__icon" aria-hidden="true">${iconSvg(STATUS_ICON[status], 64)}</div>
      <h2 class="ink-result__title">${esc(title)}</h2>
      ${desc ? `<p class="ink-result__desc">${esc(desc)}</p>` : ''}
      <div class="ink-result__action"></div>
    </section>`;
    this._root = this.firstElementChild as HTMLElement;
    this._iconWrap = this._root.querySelector('.ink-result__icon');
    this._titleEl = this._root.querySelector('.ink-result__title');
    this._descEl = this._root.querySelector('.ink-result__desc');
    this._actionWrap = this._root.querySelector('.ink-result__action');
    if (action && this._actionWrap) this._actionWrap.appendChild(action);
  }

  attributeChangedCallback(name: string) {
    if (!this._wired || !this._root) return;
    if (name === 'status') {
      const status = this._status();
      this._root.setAttribute('data-status', status);
      if (this._iconWrap) this._iconWrap.innerHTML = iconSvg(STATUS_ICON[status], 64);
    } else if (name === 'title' && this._titleEl) {
      patchText(this._titleEl, this.getAttribute('title') || '');
    } else if (name === 'description') {
      const desc = this.getAttribute('description') || '';
      if (desc && !this._descEl) {
        const el = document.createElement('p');
        el.className = 'ink-result__desc';
        el.textContent = desc;
        if (this._actionWrap) this._root.insertBefore(el, this._actionWrap);
        else this._root.appendChild(el);
        this._descEl = el;
      } else if (desc && this._descEl) {
        patchText(this._descEl, desc);
      } else if (!desc && this._descEl) {
        this._descEl.remove();
        this._descEl = null;
      }
    }
  }

  private _status(): Status {
    const s = this.getAttribute('status');
    return isStatus(s) ? s : 'info';
  }
}

define('e-result', EResult);
