import { define, esc, patchAttr, patchText } from '../core/dom';
import { iconSvg } from '../core/icons';

/**
 * @summary Empty-state placeholder with optional icon, title, description and action.
 * @since v1.0.1
 *
 * Used when a list, table, or section has no content to display.
 *
 * @attr {string} [icon='doc'] - Icon name from the EPaper icon set.
 * @attr {string} [title='No data'] - Short headline.
 * @attr {string} [description] - Optional supporting text.
 *
 * @slot action - Trailing action area (e.g. a primary button).
 *
 * @example
 * <e-empty title="No invoices" description="Create one to get started.">
 *   <e-button slot="action" variant="primary">Create</e-button>
 * </e-empty>
 */
export class EEmpty extends HTMLElement {
  static readonly observedAttributes = ['icon', 'title', 'description'];

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
    const icon = this.getAttribute('icon') || 'doc';
    const title = this.getAttribute('title') || 'No data';
    const desc = this.getAttribute('description') || '';
    this.innerHTML = `<div class="ink-empty" role="status">
      <div class="ink-empty__icon" aria-hidden="true">${iconSvg(icon, 48)}</div>
      <div class="ink-empty__title">${esc(title)}</div>
      ${desc ? `<div class="ink-empty__desc">${esc(desc)}</div>` : ''}
      <div class="ink-empty__action"></div>
    </div>`;
    this._root = this.firstElementChild as HTMLElement;
    this._iconWrap = this._root.querySelector('.ink-empty__icon');
    this._titleEl = this._root.querySelector('.ink-empty__title');
    this._descEl = this._root.querySelector('.ink-empty__desc');
    this._actionWrap = this._root.querySelector('.ink-empty__action');
    if (action && this._actionWrap) this._actionWrap.appendChild(action);
  }

  attributeChangedCallback(name: string) {
    if (!this._wired || !this._root) return;
    if (name === 'icon' && this._iconWrap) {
      this._iconWrap.innerHTML = iconSvg(this.getAttribute('icon') || 'doc', 48);
    } else if (name === 'title' && this._titleEl) {
      patchText(this._titleEl, this.getAttribute('title') || 'No data');
    } else if (name === 'description') {
      this._syncDescription(this.getAttribute('description') || '');
    }
  }

  /**
   * Create, update or drop the description element to match `desc`. Split out of
   * `attributeChangedCallback` so neither carries the branching of both.
   */
  private _syncDescription(desc: string): void {
    if (!this._root) return;
    if (!desc) {
      this._descEl?.remove();
      this._descEl = null;
    } else if (this._descEl) {
      patchText(this._descEl, desc);
    } else {
      const el = document.createElement('div');
      el.className = 'ink-empty__desc';
      el.textContent = desc;
      if (this._actionWrap) this._root.insertBefore(el, this._actionWrap);
      else this._root.appendChild(el);
      this._descEl = el;
    }
    patchAttr(this._root, 'data-has-desc', desc ? '' : null);
  }
}

define('e-empty', EEmpty);
