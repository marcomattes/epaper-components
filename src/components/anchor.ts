import {
  addCleanup,
  define,
  esc,
  numAttr,
  onGlobal,
  patchAttr,
  patchText,
  runCleanups,
} from '../core/dom';

/**
 * @summary In-page navigation that highlights the current section while scrolling.
 *
 * Reads its items from child `<e-anchor-item>` elements at connect time.
 *
 * @attr {number} [offset-top=80] - Pixels from the viewport top where a section is considered active. Reactive.
 *
 * @example
 * <e-anchor>
 *   <e-anchor-item href="#intro" title="Intro"></e-anchor-item>
 *   <e-anchor-item href="#api" title="API" depth="1"></e-anchor-item>
 * </e-anchor>
 */
export class EAnchor extends HTMLElement {
  static observedAttributes = ['offset-top'];

  private _wired = false;
  private _scrollHandler: (() => void) | null = null;
  private _scrollFrame: number | null = null;
  private _items: Array<{ href: string | null; title: string; depth: number }> = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._items = [...this.querySelectorAll('e-anchor-item')].map((it) => ({
        href: it.getAttribute('href'),
        title: it.getAttribute('title') || '',
        depth: numAttr(it, 'depth', 0),
      }));
      this.innerHTML = `
      <nav class="ink-anchor" aria-label="In-page navigation">
        <div class="ink-anchor__title">ON THIS PAGE</div>
        <ul class="ink-anchor__list">
          ${this._items
            .map(
              (it, i) => `
            <li><a class="ink-anchor__link" href="${esc(it.href)}"
                   data-anchor="${i}"
                   style="padding-left:${14 + (it.depth || 0) * 14}px">
              <span class="ink-anchor__marker" aria-hidden="true">  </span>${esc(it.title)}
            </a></li>`,
            )
            .join('')}
        </ul>
      </nav>`;
      this._scrollHandler = this._updateActive;
    }
    this._updateActive();
    onGlobal(this, window, 'scroll', this._requestUpdate, { passive: true });
    addCleanup(this, () => {
      if (this._scrollFrame != null) cancelAnimationFrame(this._scrollFrame);
      this._scrollFrame = null;
    });
  }

  attributeChangedCallback() {
    this._scrollHandler?.();
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  private _requestUpdate = (): void => {
    if (this._scrollFrame != null) return;
    this._scrollFrame = requestAnimationFrame(() => {
      this._scrollFrame = null;
      this._updateActive();
    });
  };

  private _updateActive = (): void => {
    const links = [...this.querySelectorAll<HTMLAnchorElement>('.ink-anchor__link')];
    const offsetTop = Math.max(0, numAttr(this, 'offset-top', 80));
    let active = this._items[0]?.href;
    for (const item of this._items) {
      if (!item.href?.startsWith('#')) continue;
      const target = document.getElementById(item.href.slice(1));
      if (target && target.getBoundingClientRect().top - offsetTop <= 0) active = item.href;
    }
    for (const link of links) {
      const current = link.getAttribute('href') === active;
      patchAttr(link, 'aria-current', current ? 'true' : null);
      const marker = link.querySelector('.ink-anchor__marker');
      if (marker) patchText(marker, current ? '▸ ' : '  ');
    }
  };
}
define('e-anchor', EAnchor);

/**
 * @summary Single navigation entry inside an `<e-anchor>` list.
 *
 * Acts as a data carrier; the parent `<e-anchor>` reads its attributes and renders the actual link.
 *
 * @attr {string} href - Hash or URL the entry points to (e.g. `#section-id`).
 * @attr {string} title - Visible label.
 * @attr {0|1} [depth=0] - Indentation level. `0` is top-level, `1` is nested.
 *
 * @example
 * <e-anchor-item href="#api" title="API" depth="1"></e-anchor-item>
 */
export class EAnchorItem extends HTMLElement {}
define('e-anchor-item', EAnchorItem);
