import {
  addCleanup,
  define,
  EpaperElement,
  numAttr,
  observeItems,
  onGlobal,
  patchAttr,
  patchText,
  runCleanups,
} from '../../core/dom';
import { t } from '../../core/i18n';

interface AnchorEntry {
  href: string | null;
  title: string;
  depth: number;
}

/**
 * @summary In-page navigation that highlights the current section while scrolling.
 * @since v1.0.1
 *
 * Reads its items from child `<e-anchor-item>` elements and keeps them live:
 * the authored items stay in the light DOM as the source of truth, and a
 * `MutationObserver` re-syncs the rendered list whenever one is added,
 * removed, relabelled or re-pointed. Links keep their DOM identity across a
 * sync — only changed text, `href` and indentation are patched, so the
 * scroll-spy never rebuilds the nav underneath itself.
 *
 * Because the items stay put they would otherwise render twice, so each one is
 * hidden with an inline `display:none` when it is wired. The stable form of
 * that is a `e-anchor-item { display: none; }` rule in `components.css`; the
 * inline style is what guarantees it without one.
 *
 * @attr {number} [offset-top=80] - Pixels from the viewport top where a section is considered active. Reactive.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when scrolling, an item change or a new `offset-top` moves the highlight to a different entry. Not fired for the first highlight after mount. @since v1.3.0
 *
 * @slot - Default slot for `<e-anchor-item>` children.
 *
 * @example
 * <e-anchor>
 *   <e-anchor-item href="#intro" title="Intro"></e-anchor-item>
 *   <e-anchor-item href="#api" title="API" depth="1"></e-anchor-item>
 * </e-anchor>
 */
export class EAnchor extends EpaperElement {
  static readonly observedAttributes = ['offset-top'];

  private _wired = false;
  private _nav: HTMLElement | null = null;
  private _list: HTMLElement | null = null;
  private readonly _links: HTMLAnchorElement[] = [];
  private _scrollHandler: (() => void) | null = null;
  private _scrollFrame: number | null = null;
  private _items: AnchorEntry[] = [];
  private _active: string | null | undefined = undefined;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._build();
      this._scrollHandler = this._updateActive;
    }
    this._sync();
    this._updateActive();
    onGlobal(this, window, 'scroll', this._requestUpdate, { passive: true });
    addCleanup(this, () => {
      if (this._scrollFrame != null) cancelAnimationFrame(this._scrollFrame);
      this._scrollFrame = null;
    });
    observeItems(this, this._sync, {
      attributeFilter: ['href', 'title', 'depth'],
      isOutput: (n) => this._nav?.contains(n) ?? false,
    });
  }

  attributeChangedCallback() {
    this._scrollHandler?.();
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  private _build(): void {
    const nav = document.createElement('nav');
    nav.className = 'ink-anchor';
    nav.setAttribute('aria-label', t(this, 'inPageNavigation'));
    const title = document.createElement('div');
    title.className = 'ink-anchor__title';
    title.textContent = t(this, 'onThisPage');
    const list = document.createElement('ul');
    list.className = 'ink-anchor__list';
    nav.append(title, list);
    this._nav = nav;
    this._list = list;
    this.appendChild(nav);
  }

  /** Authored items, excluding anything inside the rendered nav. */
  private _entries(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-anchor-item')].filter(
      (it) => !this._nav?.contains(it),
    );
  }

  private readonly _sync = (): void => {
    const list = this._list;
    if (!list) return;
    const items = this._entries();

    while (this._links.length > items.length) this._links.pop()!.closest('li')!.remove();
    this._items = items.map((it, i) => {
      if (it.style.display !== 'none') it.style.display = 'none';
      const entry: AnchorEntry = {
        href: it.getAttribute('href'),
        title: it.getAttribute('title') || '',
        depth: numAttr(it, 'depth', 0),
      };
      let link = this._links[i];
      if (!link) {
        const li = document.createElement('li');
        link = document.createElement('a');
        link.className = 'ink-anchor__link';
        const marker = document.createElement('span');
        marker.className = 'ink-anchor__marker';
        marker.setAttribute('aria-hidden', 'true');
        marker.textContent = '  ';
        link.append(marker, document.createTextNode(''));
        li.appendChild(link);
        list.appendChild(li);
        this._links.push(link);
      }
      patchAttr(link, 'href', entry.href ?? '');
      patchAttr(link, 'data-anchor', String(i));
      // `depth` comes from numAttr(), so the padding can only ever be a number.
      const pad = `${14 + (entry.depth || 0) * 14}px`;
      if (link.style.paddingLeft !== pad) link.style.paddingLeft = pad;
      patchText(link.lastChild!, entry.title);
      return entry;
    });

    this._updateActive();
  };

  private readonly _requestUpdate = (): void => {
    if (this._scrollFrame != null) return;
    this._scrollFrame = requestAnimationFrame(() => {
      this._scrollFrame = null;
      this._updateActive();
    });
  };

  /** The last entry whose target has scrolled past the offset line. */
  private _activeHref(): string | null | undefined {
    const offsetTop = Math.max(0, numAttr(this, 'offset-top', 80));
    let active = this._items[0]?.href;
    for (const item of this._items) {
      if (!item.href?.startsWith('#')) continue;
      const target = document.getElementById(item.href.slice(1));
      if (target && target.getBoundingClientRect().top - offsetTop <= 0) active = item.href;
    }
    return active;
  }

  private _paintActive(active: string | null | undefined): void {
    for (const link of this.querySelectorAll<HTMLAnchorElement>('.ink-anchor__link')) {
      const current = link.getAttribute('href') === active;
      patchAttr(link, 'aria-current', current ? 'true' : null);
      const marker = link.querySelector('.ink-anchor__marker');
      if (marker) patchText(marker, current ? '▸ ' : '  ');
    }
  }

  private readonly _updateActive = (): void => {
    const active = this._activeHref();
    this._paintActive(active);
    const previous = this._active;
    this._active = active ?? null;
    // `undefined` means "never painted", so the first highlight after mount is
    // not reported as a change.
    if (previous !== undefined && previous !== this._active && this._active != null) {
      this.dispatchEvent(
        new CustomEvent('e-change', { detail: { value: this._active }, bubbles: true }),
      );
    }
  };
}
define('e-anchor', EAnchor);

/**
 * @summary Single navigation entry inside an `<e-anchor>` list.
 *
 * Acts as a data carrier; the parent `<e-anchor>` reads its attributes,
 * renders the actual link and hides this element. Changing its attributes
 * after mount updates the rendered link.
 *
 * @attr {string} href - Hash or URL the entry points to (e.g. `#section-id`).
 * @attr {string} title - Visible label.
 * @attr {0|1} [depth=0] - Indentation level. `0` is top-level, `1` is nested.
 *
 * @example
 * <e-anchor-item href="#api" title="API" depth="1"></e-anchor-item>
 */
export class EAnchorItem extends EpaperElement {}
define('e-anchor-item', EAnchorItem);
