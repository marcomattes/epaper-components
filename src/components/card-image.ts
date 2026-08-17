import { define, patchClassModifier, patchText, syncEyebrowTitle } from '../core/dom';

/**
 * @summary Card variant with a top cover area and optional footer slot.
 *
 * @attr {string} [title] - Title rendered in the header.
 * @attr {string} [eyebrow] - Small label rendered above the title.
 * @attr {string} [cover] - Cover content. Use `hatch` (or any value starting with `hatch`) for the hatch pattern; otherwise the value is rendered as text.
 *
 * @slot - Default slot for the card body.
 * @slot footer - Footer area rendered below the body.
 *
 * @example
 * <e-card-image eyebrow="GUIDE" title="Setup" cover="hatch">
 *   Lorem ipsum.
 *   <div slot="footer">Updated today</div>
 * </e-card-image>
 */
export class ECardImage extends HTMLElement {
  static readonly observedAttributes = ['title', 'eyebrow', 'cover'];

  private _section: HTMLElement | null = null;
  private _cover: HTMLElement | null = null;
  private _header: HTMLElement | null = null;
  private _eyebrow: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _body: HTMLElement | null = null;
  private _footer: HTMLElement | null = null;
  private _footerSlot: HTMLElement | null = null;

  connectedCallback() {
    if (!this._section) {
      const footer = this.querySelector<HTMLElement>('[slot="footer"]');
      if (footer) footer.remove();
      this._footerSlot = footer;
      const body = document.createElement('div');
      body.className = 'ink-card__body';
      while (this.firstChild) body.appendChild(this.firstChild);
      const section = document.createElement('section');
      section.className = 'ink-card';
      this.appendChild(section);
      this._section = section;
      this._body = body;
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._section) this._render();
  }

  private _render(): void {
    const section = this._section!;
    this._syncCover(section, this.getAttribute('cover'));
    this._syncHeader(section, this.getAttribute('title'), this.getAttribute('eyebrow'));
    if (this._body && this._body.parentElement !== section) section.appendChild(this._body);
    this._syncFooter(section);
  }

  private _syncCover(section: HTMLElement, cover: string | null): void {
    if (cover == null) {
      if (this._cover) {
        this._cover.remove();
        this._cover = null;
      }
      return;
    }
    if (!this._cover) {
      this._cover = document.createElement('div');
      this._cover.classList.add('ink-card__cover');
      section.insertBefore(this._cover, section.firstChild);
    }
    const isHatch = cover === 'hatch' || cover.startsWith('hatch');
    patchClassModifier(this._cover, 'ink-card__cover--', isHatch ? 'hatch' : null);
    patchText(this._cover, isHatch ? '' : cover);
  }

  private _syncHeader(section: HTMLElement, title: string | null, eyebrow: string | null): void {
    const needHeader = !!(title || eyebrow);
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
      const ref = this._cover ? this._cover.nextSibling : section.firstChild;
      section.insertBefore(this._header, ref);
    }
    const left = this._header.firstElementChild as HTMLElement;
    const refs = syncEyebrowTitle(left, eyebrow, title, {
      eyebrow: this._eyebrow,
      titleEl: this._titleEl,
    });
    this._eyebrow = refs.eyebrow;
    this._titleEl = refs.titleEl;
  }

  private _syncFooter(section: HTMLElement): void {
    if (!this._footerSlot) return;
    if (!this._footer) {
      this._footer = document.createElement('footer');
      this._footer.className = 'ink-card__footer';
      this._footer.appendChild(this._footerSlot);
      section.appendChild(this._footer);
    } else if (this._footer.parentElement !== section) {
      section.appendChild(this._footer);
    }
  }
}

define('e-card-image', ECardImage);
