import { define, esc, numAttr, onGlobal, runCleanups } from '../core/dom';

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
  private _items: Array<{ href: string | null; title: string; depth: number }> = [];

  connectedCallback() {
    if (this._wired) return;
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
    const links = [...this.querySelectorAll('.ink-anchor__link')] as HTMLAnchorElement[];
    const updateActive = () => {
      const offsetTop = numAttr(this, 'offset-top', 80);
      let active = this._items[0]?.href;
      for (const it of this._items) {
        if (!it.href) continue;
        const el = document.querySelector(it.href);
        if (!el) continue;
        if (el.getBoundingClientRect().top - offsetTop <= 0) active = it.href;
      }
      for (const a of links) {
        const on = a.getAttribute('href') === active;
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
        const marker = a.querySelector('.ink-anchor__marker');
        if (marker) marker.textContent = on ? '▸ ' : '  ';
      }
    };
    this._scrollHandler = updateActive;
    updateActive();
    onGlobal(this, window, 'scroll', updateActive, { passive: true });
  }

  attributeChangedCallback() {
    if (this._scrollHandler) this._scrollHandler();
  }

  disconnectedCallback() {
    runCleanups(this);
  }
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
