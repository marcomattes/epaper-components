import { define, patchText } from '../core/dom';

/**
 * @summary Hierarchical navigation trail rendered from `<e-breadcrumb-item>` children.
 * @since v1.0.1
 *
 * @attr {string} [separator='/'] - Glyph rendered between entries.
 *
 * @example
 * <e-breadcrumb separator="/">
 *   <e-breadcrumb-item href="#" title="Library"></e-breadcrumb-item>
 *   <e-breadcrumb-item title="Current"></e-breadcrumb-item>
 * </e-breadcrumb>
 */
export class EBreadcrumb extends HTMLElement {
  static readonly observedAttributes = ['separator'];

  private _wired = false;
  private _nav: HTMLElement | null = null;
  private _items: Array<{ href: string | null; title: string }> = [];

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    // Snapshot item data before innerHTML wipes the children.
    this._items = [...this.querySelectorAll('e-breadcrumb-item')].map((it) => ({
      href: it.getAttribute('href'),
      title: it.getAttribute('title') || it.textContent || '',
    }));
    this._build();
  }

  attributeChangedCallback() {
    if (!this._wired) return;
    // Only `separator` is observed — patch the separator spans in place.
    const sep = this.getAttribute('separator') || '/';
    for (const span of this._nav!.querySelectorAll<HTMLElement>(':scope > span[aria-hidden]')) {
      patchText(span, sep);
    }
  }

  private _build(): void {
    const sep = this.getAttribute('separator') || '/';
    const nav = document.createElement('nav');
    nav.className = 'ink-breadcrumb';
    nav.setAttribute('aria-label', 'Breadcrumb');

    this._items.forEach((it, i) => {
      const last = i === this._items.length - 1;
      if (it.href && !last) {
        const a = document.createElement('a');
        a.href = it.href;
        a.textContent = it.title;
        nav.appendChild(a);
      } else {
        const span = document.createElement('span');
        if (last) {
          span.className = 'ink-breadcrumb__current';
          span.setAttribute('aria-current', 'page');
        }
        span.textContent = it.title;
        nav.appendChild(span);
      }
      if (!last) {
        const sepSpan = document.createElement('span');
        sepSpan.setAttribute('aria-hidden', 'true');
        sepSpan.textContent = sep;
        nav.appendChild(sepSpan);
      }
    });

    this._nav = nav;
    this.replaceChildren(nav);
  }
}
define('e-breadcrumb', EBreadcrumb);

/**
 * @summary Single trail entry inside an `<e-breadcrumb>`.
 *
 * Acts as a data carrier; the parent renders the actual link or current page marker.
 *
 * @attr {string} [href] - Optional link target. The last item should omit `href` so it renders as the current page.
 * @attr {string} title - Visible label. Falls back to text content when omitted.
 *
 * @example
 * <e-breadcrumb-item href="#" title="Library"></e-breadcrumb-item>
 */
export class EBreadcrumbItem extends HTMLElement {}
define('e-breadcrumb-item', EBreadcrumbItem);
