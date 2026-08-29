import {
  addCleanup,
  define,
  EpaperElement,
  intAttr,
  patchAttr,
  removeCleanup,
  runCleanups,
} from '../../core/dom';
import { slugifyTitle, uniqueSlugId } from '../../core/slug';
// `<e-toc>` renders itself as an `<e-anchor>` (see the class doc). A
// consumer importing only `@marcomattes/epaper-components/toc` still needs
// that element defined, so it is registered as a side effect here rather
// than left to whoever also happens to import `/anchor`.
import '../anchor/anchor';

/**
 * @summary Auto-generated table of contents, mirrored into an `<e-anchor>`.
 * @since v1.3.0
 *
 * Scans `for`'s heading elements between `min-level` and `max-level` — plain
 * `<h2>`/`<h3>` inside an `<e-prose>` document as much as an `<e-title>`'s
 * rendered heading — and keeps an internal `<e-anchor>` mirrored to them: one
 * `<e-anchor-item>` per heading, in document order. That reuses `<e-anchor>`
 * for everything past the scan itself — the nav chrome, the scroll-spy, the
 * `e-change` event — instead of a second implementation of it here.
 *
 * A heading without an `id` gets one, using the same slug `<e-title>`'s
 * `auto-id` derives (`core/slug.ts`), so a raw `<h2>` inside `<e-prose>`
 * becomes a valid jump target without the author hand-writing one.
 *
 * The scanned root is watched with a `MutationObserver` so headings added,
 * removed or retitled after mount stay reflected — the same reactive
 * contract `observeItems` gives a component watching its own children, just
 * pointed at an external root instead of the host itself, which is why this
 * wires the observer by hand rather than calling that helper directly.
 *
 * @attr {string} [for] - Id of the element whose headings are listed. Defaults to the whole document.
 * @attr {1|2|3|4|5|6} [min-level=2] - Lowest heading level included.
 * @attr {1|2|3|4|5|6} [max-level=3] - Highest heading level included. Headings above `min-level`
 *   render as a single nested `e-anchor-item` depth, regardless of how many levels apart.
 *
 * @example
 * <e-toc for="article"></e-toc>
 * <article id="article">
 *   <h2>Background</h2>
 *   <h2>Findings</h2>
 *   <h3>Method</h3>
 * </article>
 */
export class EToc extends EpaperElement {
  static readonly observedAttributes = ['for', 'min-level', 'max-level'];

  private _wired = false;
  private _anchor: HTMLElement | null = null;
  private readonly _items: HTMLElement[] = [];
  private _teardownObserver: (() => void) | null = null;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._anchor = document.createElement('e-anchor');
      this.appendChild(this._anchor);
    }
    this._sync();
    this._observeRoot();
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    if (name === 'for') this._observeRoot();
    this._sync();
  }

  disconnectedCallback() {
    runCleanups(this);
    this._teardownObserver = null;
  }

  /**
   * The element to scan. `for` pointing at a missing id scans an empty,
   * detached fragment rather than silently falling back to the whole
   * document — a typo should render an empty TOC, not a surprising one.
   */
  private _root(): ParentNode {
    const forId = this.getAttribute('for');
    if (forId != null) return document.getElementById(forId) ?? document.createDocumentFragment();
    return document;
  }

  private _levelRange(): [number, number] {
    const min = Math.min(Math.max(intAttr(this, 'min-level', 2), 1), 6);
    const max = Math.min(Math.max(intAttr(this, 'max-level', 3), 1), 6);
    return min <= max ? [min, max] : [max, min];
  }

  private _headings(): HTMLElement[] {
    const [min, max] = this._levelRange();
    const selector = Array.from({ length: max - min + 1 }, (_, i) => `h${min + i}`).join(',');
    return [...this._root().querySelectorAll<HTMLElement>(selector)].filter(
      (h) => !this.contains(h),
    );
  }

  /** Assigns a slug id when the heading has none, reusing `<e-title>`'s auto-id logic. */
  private _ensureId(h: HTMLElement): string {
    if (h.id) return h.id;
    const slug = slugifyTitle(h.textContent ?? '');
    if (!slug) return '';
    const id = uniqueSlugId(slug, (owner) => owner === h);
    h.id = id;
    return id;
  }

  private readonly _sync = (): void => {
    const anchor = this._anchor;
    if (!anchor) return;
    const [min] = this._levelRange();
    const headings = this._headings();

    while (this._items.length > headings.length) this._items.pop()!.remove();
    headings.forEach((h, i) => {
      const id = this._ensureId(h);
      const level = Number(h.tagName.slice(1));
      let item = this._items[i];
      if (!item) {
        item = document.createElement('e-anchor-item');
        anchor.appendChild(item);
        this._items[i] = item;
      }
      patchAttr(item, 'href', id ? `#${id}` : null);
      patchAttr(item, 'title', h.textContent ?? '');
      patchAttr(item, 'depth', level === min ? '0' : '1');
    });
  };

  /** Re-points the `MutationObserver` at the current scan root, coalescing bursts per microtask. */
  private _observeRoot(): void {
    if (this._teardownObserver) {
      removeCleanup(this, this._teardownObserver);
      this._teardownObserver();
      this._teardownObserver = null;
    }
    const root = this._root();
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        observer.takeRecords();
        this._sync();
      });
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    const teardown = (): void => observer.disconnect();
    this._teardownObserver = teardown;
    addCleanup(this, teardown);
  }
}

define('e-toc', EToc);
