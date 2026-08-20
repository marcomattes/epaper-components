import { boolAttr, define, patchAttr, patchText } from '../core/dom';

/**
 * @summary Image with fallback, native lazy-loading and optional caption.
 * @since v1.0.1
 *
 * Renders a `<figure>` wrapping an `<img>` (and an optional
 * `<figcaption>`). When loading fails, the element swaps to the `fallback`
 * image; if no fallback is provided, an inline placeholder pattern is
 * rendered instead. `lazy` enables native `loading="lazy"`, which is the
 * right choice on e-paper because it avoids speculative network fetches
 * that would otherwise force a full refresh on render.
 *
 * @attr {string} src - Image source URL.
 * @attr {string} [alt] - Alternative text. Required for non-decorative images.
 * @attr {string} [fallback] - URL to load if `src` fails.
 * @attr {string} [caption] - Optional caption rendered below the image.
 * @attr {boolean} [lazy] - Sets `loading="lazy"` on the underlying `<img>`.
 * @attr {string} [width] - Forwarded to the underlying `<img>`.
 * @attr {string} [height] - Forwarded to the underlying `<img>`.
 * @attr {'cover'|'contain'|'fill'|'none'} [fit='cover'] - CSS object-fit value.
 *
 * @fires {CustomEvent<{value: 'src'|'fallback'|'placeholder'}>} e-load - Fires when an image source successfully renders.
 * @fires {CustomEvent<{value: string}>} e-error - Fires when both `src` and `fallback` fail. `value` is the source URL that ultimately failed.
 *
 * @example
 * <e-image src="/cover.jpg" alt="Cover" fallback="/cover.svg" caption="Issue #42"></e-image>
 */
export class EImage extends HTMLElement {
  static readonly observedAttributes = [
    'src',
    'alt',
    'fallback',
    'caption',
    'lazy',
    'width',
    'height',
    'fit',
  ];

  private _wired = false;
  private _figure: HTMLElement | null = null;
  private _img: HTMLImageElement | null = null;
  private _placeholder: HTMLElement | null = null;
  private _caption: HTMLElement | null = null;
  private _triedFallback = false;
  private _requestedSrc = '';
  private _fallbackSrc = '';
  private _placeholderReported = false;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const fig = document.createElement('figure');
    fig.className = 'ink-image';
    const img = document.createElement('img');
    img.className = 'ink-image__img';
    img.addEventListener('load', this._onLoad);
    img.addEventListener('error', this._onError);
    fig.appendChild(img);
    this.replaceChildren(fig);
    this._figure = fig;
    this._img = img;
    this._render();
  }

  attributeChangedCallback() {
    if (this._wired) this._render();
  }

  private _ensurePlaceholder(): void {
    if (!this._figure) return;
    if (!this._placeholder) {
      const ph = document.createElement('div');
      ph.className = 'ink-image__placeholder';
      ph.setAttribute('aria-hidden', 'true');
      this._figure.insertBefore(ph, this._caption || null);
      this._placeholder = ph;
    }
  }

  private _removePlaceholder(): void {
    if (this._placeholder) {
      this._placeholder.remove();
      this._placeholder = null;
    }
  }

  private readonly _onLoad = (): void => {
    if (!this._img) return;
    patchAttr(this._img, 'data-state', 'loaded');
    this._removePlaceholder();
    const using = this._triedFallback ? 'fallback' : 'src';
    this.dispatchEvent(
      new CustomEvent('e-load', {
        detail: { value: using },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private readonly _onError = (): void => {
    if (!this._img) return;
    const fallback = this.getAttribute('fallback');
    if (fallback && !this._triedFallback) {
      this._triedFallback = true;
      this._img.src = fallback;
      return;
    }
    // Final failure — render the inline placeholder pattern.
    patchAttr(this._img, 'data-state', 'error');
    patchAttr(this._img, 'hidden', '');
    this._ensurePlaceholder();
    this.dispatchEvent(
      new CustomEvent('e-error', {
        detail: { value: this._img.src },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _render(): void {
    if (!this._figure || !this._img) return;
    const src = this.getAttribute('src') || '';
    const alt = this.getAttribute('alt') || '';
    const lazy = boolAttr(this, 'lazy');
    const width = this.getAttribute('width');
    const height = this.getAttribute('height');
    const caption = this.getAttribute('caption') || '';
    const fit = this.getAttribute('fit') || 'cover';
    const fallback = this.getAttribute('fallback') || '';

    if (src !== this._requestedSrc) {
      this._requestedSrc = src;
      this._triedFallback = false;
      this._placeholderReported = false;
      this._removePlaceholder();
      patchAttr(this._img, 'hidden', null);
      this._img.removeAttribute('data-state');
      patchAttr(this._img, 'src', src || null);
    }
    if (fallback !== this._fallbackSrc) {
      this._fallbackSrc = fallback;
      if (fallback && this._img.getAttribute('data-state') === 'error' && src) {
        this._triedFallback = true;
        this._removePlaceholder();
        patchAttr(this._img, 'hidden', null);
        patchAttr(this._img, 'data-state', null);
        patchAttr(this._img, 'src', fallback);
      }
    }
    patchAttr(this._img, 'alt', alt);
    patchAttr(this._img, 'loading', lazy ? 'lazy' : null);
    patchAttr(this._img, 'decoding', 'async');
    patchAttr(this._img, 'width', width);
    patchAttr(this._img, 'height', height);
    this._img.style.objectFit = ['cover', 'contain', 'fill', 'none'].includes(fit) ? fit : 'cover';

    if (caption) {
      if (!this._caption) {
        this._caption = document.createElement('figcaption');
        this._caption.className = 'ink-image__caption';
        this._figure.appendChild(this._caption);
      }
      patchText(this._caption, caption);
    } else if (this._caption) {
      this._caption.remove();
      this._caption = null;
    }

    if (!src) {
      patchAttr(this._img, 'hidden', '');
      this._ensurePlaceholder();
      if (this._placeholder) {
        let label = this._placeholder.querySelector<HTMLElement>('span');
        if (!label) {
          label = document.createElement('span');
          this._placeholder.appendChild(label);
        }
        patchText(label, alt || 'No image');
      }
      if (!this._placeholderReported) {
        this._placeholderReported = true;
        queueMicrotask(() => {
          if (!this.isConnected || this.getAttribute('src')) return;
          this.dispatchEvent(
            new CustomEvent('e-load', {
              detail: { value: 'placeholder' },
              bubbles: true,
              composed: true,
            }),
          );
        });
      }
    }
  }
}
define('e-image', EImage);
