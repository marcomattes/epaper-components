import { define, syncEyebrowTitle } from '../core/dom';

/**
 * @summary Container with optional eyebrow, title and action area.
 *
 * @attr {string} [title] - Title rendered in the header.
 * @attr {string} [eyebrow] - Small label rendered above the title.
 *
 * @slot - Default slot for the card body.
 * @slot action - Trailing element rendered in the header (e.g. a button).
 *
 * @example
 * <e-card eyebrow="PROJECT" title="Atlas">
 *   <e-button slot="action">Open</e-button>
 *   Body content here.
 * </e-card>
 */
export class ECard extends HTMLElement {
  static readonly observedAttributes = ['title', 'eyebrow'];

  private _section: HTMLElement | null = null;
  private _header: HTMLElement | null = null;
  private _eyebrow: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _action: HTMLElement | null = null;
  private _body: HTMLElement | null = null;

  connectedCallback() {
    if (!this._section) {
      const action = this.querySelector<HTMLElement>('[slot="action"]');
      if (action) action.remove();
      const body = document.createElement('div');
      body.className = 'ink-card__body';
      while (this.firstChild) body.appendChild(this.firstChild);
      const section = document.createElement('section');
      section.className = 'ink-card';
      this.appendChild(section);
      this._section = section;
      this._body = body;
      this._action = action;
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._section) this._render();
  }

  private _render(): void {
    const section = this._section!;
    this._syncHeader(section, this.getAttribute('title'), this.getAttribute('eyebrow'));
    if (this._body && this._body.parentElement !== section) section.appendChild(this._body);
  }

  private _syncHeader(section: HTMLElement, title: string | null, eyebrow: string | null): void {
    const needHeader = !!(title || eyebrow || this._action);
    if (!needHeader) {
      if (this._header) {
        this._header.remove();
        this._header = null;
        this._eyebrow = null;
        this._titleEl = null;
      }
      return;
    }
    if (!this._header) {
      this._header = document.createElement('header');
      this._header.className = 'ink-card__header';
      const left = document.createElement('div');
      this._header.appendChild(left);
      section.insertBefore(this._header, section.firstChild);
    }
    const left = this._header.firstElementChild as HTMLElement;
    const refs = syncEyebrowTitle(left, eyebrow, title, {
      eyebrow: this._eyebrow,
      titleEl: this._titleEl,
    });
    this._eyebrow = refs.eyebrow;
    this._titleEl = refs.titleEl;
    if (this._action && this._action.parentElement !== this._header) {
      this._header.appendChild(this._action);
    }
  }
}

define('e-card', ECard);
