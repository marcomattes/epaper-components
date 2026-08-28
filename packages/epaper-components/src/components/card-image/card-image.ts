import {
  define,
  EpaperElement,
  patchAttr,
  patchClassModifier,
  patchText,
  syncEyebrowTitle,
} from '../../core/dom';

/** Values reserved by the hatch pattern since v1.0.1. */
const isHatchCover = (v: string): boolean => v.startsWith('hatch');

/* A `cover` is read as an image URL only when it unambiguously looks like one.
 * The attribute predates the image mode and has always rendered plain words
 * ("Photo", "Ausgabe 42") as literal cover text, so the detection is
 * deliberately narrow: a known URL scheme, a path-looking prefix, or a known
 * image extension. Anything else — including markup-looking text and any value
 * containing whitespace — keeps its v1.0.1 meaning. */
const IMAGE_SCHEME = /^(?:https?:\/\/|data:image\/|blob:)/i;
const IMAGE_PATH = /^\.{0,2}\//;
const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|avif|svg|bmp|ico)(?:[?#]|$)/i;

const isImageCover = (v: string): boolean => {
  const s = v.trim();
  if (!s || isHatchCover(s) || /\s/.test(s)) return false;
  return IMAGE_SCHEME.test(s) || IMAGE_PATH.test(s) || IMAGE_EXT.test(s);
};

/**
 * @summary Card variant with a top cover area and optional footer slot.
 * @since v1.0.1
 *
 * The `cover` attribute has three modes, resolved in this order:
 *
 * 1. **Hatch** — `hatch`, or any value starting with `hatch`, paints the
 *    dithered cover pattern.
 * 2. **Image** — a value that unambiguously reads as an image URL (`https://…`,
 *    `data:image/…`, `blob:…`, a `/`-, `./`- or `../`-rooted path, or a known
 *    image extension) renders an `<img>` filling the cover. A value containing
 *    whitespace is never treated as a URL.
 * 3. **Text** — everything else is rendered as literal cover text, exactly as
 *    before v1.3.0.
 *
 * When the image fails to load the cover falls back to the hatch pattern and
 * shows `cover-alt` as text, mirroring `<e-image>`'s placeholder behaviour.
 *
 * @attr {string} [title] - Title rendered in the header.
 * @attr {string} [eyebrow] - Small label rendered above the title.
 * @attr {string} [cover] - Cover content: a hatch keyword, an image URL, or literal text. See above.
 * @attr {string} [cover-alt] - Alternative text for an image cover. Also shown as the fallback label when the image fails. @since v1.3.0
 *
 * @fires {CustomEvent<{value: string}>} e-error - Fired when an image cover fails to load. `value` is the URL that failed. @since v1.3.0
 *
 * @slot - Default slot for the card body.
 * @slot footer - Footer area rendered below the body.
 *
 * @example
 * <e-card-image eyebrow="GUIDE" title="Setup" cover="hatch">
 *   Lorem ipsum.
 *   <div slot="footer">Updated today</div>
 * </e-card-image>
 *
 * @example
 * <e-card-image cover="/media/produkt.jpg" cover-alt="Produktfoto" title="Regalmodul">
 *   Ab Lager verfügbar.
 * </e-card-image>
 */
export class ECardImage extends EpaperElement {
  static readonly observedAttributes = ['title', 'eyebrow', 'cover', 'cover-alt'];

  private _section: HTMLElement | null = null;
  private _cover: HTMLElement | null = null;
  private _coverImg: HTMLImageElement | null = null;
  private _coverFallback: HTMLElement | null = null;
  private _coverFailed = false;
  private _requestedCover = '';
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
        this._teardownImage();
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
    if (isImageCover(cover)) {
      this._syncImageCover(this._cover, cover);
      return;
    }
    this._teardownImage();
    const isHatch = isHatchCover(cover);
    patchClassModifier(this._cover, 'ink-card__cover--', isHatch ? 'hatch' : null);
    patchText(this._cover, isHatch ? '' : cover);
  }

  /** Image mode: one `<img>` child, swapped to the hatch fallback on error. */
  private _syncImageCover(cover: HTMLElement, url: string): void {
    if (!this._coverImg) {
      // Drop any literal cover text left behind by the previous mode before
      // the image goes in — `patchText` later on would not see a difference.
      cover.textContent = '';
      const img = document.createElement('img');
      img.className = 'ink-card__cover-img';
      img.decoding = 'async';
      img.addEventListener('error', this._onCoverError);
      cover.appendChild(img);
      this._coverImg = img;
    }
    if (url !== this._requestedCover) {
      this._requestedCover = url;
      this._coverFailed = false;
      this._removeFallback();
      patchAttr(this._coverImg, 'hidden', null);
      patchAttr(this._coverImg, 'data-state', null);
      patchAttr(this._coverImg, 'src', url);
    }
    const alt = this.getAttribute('cover-alt') ?? '';
    patchAttr(this._coverImg, 'alt', alt);
    if (this._coverFailed) {
      this._ensureFallback(alt);
      patchClassModifier(cover, 'ink-card__cover--', 'hatch');
    } else {
      patchClassModifier(cover, 'ink-card__cover--', 'image');
    }
  }

  private readonly _onCoverError = (): void => {
    if (!this._coverImg || !this._cover) return;
    this._coverFailed = true;
    patchAttr(this._coverImg, 'data-state', 'error');
    patchAttr(this._coverImg, 'hidden', '');
    this._ensureFallback(this.getAttribute('cover-alt') ?? '');
    patchClassModifier(this._cover, 'ink-card__cover--', 'hatch');
    this.dispatchEvent(
      new CustomEvent('e-error', {
        detail: { value: this._requestedCover },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _ensureFallback(label: string): void {
    if (!this._cover) return;
    if (!this._coverFallback) {
      const span = document.createElement('span');
      span.className = 'ink-card__cover-fallback';
      this._cover.appendChild(span);
      this._coverFallback = span;
    }
    patchText(this._coverFallback, label);
  }

  private _removeFallback(): void {
    if (!this._coverFallback) return;
    this._coverFallback.remove();
    this._coverFallback = null;
  }

  private _teardownImage(): void {
    this._removeFallback();
    if (!this._coverImg) return;
    this._coverImg.removeEventListener('error', this._onCoverError);
    this._coverImg.remove();
    this._coverImg = null;
    this._coverFailed = false;
    this._requestedCover = '';
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
