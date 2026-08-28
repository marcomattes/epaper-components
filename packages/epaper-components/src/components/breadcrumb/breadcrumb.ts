import { define, observeItems, patchAttr, patchText, runCleanups } from '../../core/dom';

/** What a slot in the rendered trail is: a link, a plain span, the current page, or a separator. */
type CrumbKind = 'link' | 'span' | 'current' | 'sep';

interface CrumbSlot {
  kind: CrumbKind;
  text: string;
  href?: string;
}

/** Classify an already-rendered node so a sync can reuse it in place. */
function kindOf(el: Element): CrumbKind {
  if (el.tagName === 'A') return 'link';
  if (el.hasAttribute('aria-hidden')) return 'sep';
  if (el.classList.contains('ink-breadcrumb__current')) return 'current';
  return 'span';
}

/**
 * @summary Hierarchical navigation trail rendered from `<e-breadcrumb-item>` children.
 * @since v1.0.1
 *
 * The authored items stay in the light DOM as the source of truth and a
 * `MutationObserver` re-syncs the rendered `<nav>` whenever one is added,
 * removed, relabelled or re-pointed. Nodes that keep their role (link, plain
 * span, current page, separator) keep their DOM identity — only text and
 * `href` are patched.
 *
 * Because the items stay put they would otherwise render twice, so each one is
 * hidden with an inline `display:none` when it is first wired. The stable form
 * of that is a `e-breadcrumb-item { display: none; }` rule in
 * `components.css`; the inline style is what guarantees it without one.
 *
 * @attr {string} [separator='/'] - Glyph rendered between entries.
 *
 * @slot - Default slot for `<e-breadcrumb-item>` children.
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

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const nav = document.createElement('nav');
      nav.className = 'ink-breadcrumb';
      nav.setAttribute('aria-label', 'Breadcrumb');
      this._nav = nav;
      this.appendChild(nav);
    }
    this._sync();
    observeItems(this, this._sync, {
      attributeFilter: ['href', 'title'],
      isOutput: (n) => this._nav?.contains(n) ?? false,
    });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback() {
    if (!this._wired) return;
    // Only `separator` is observed — patch the separator spans in place.
    const sep = this.getAttribute('separator') || '/';
    for (const span of this._nav!.querySelectorAll<HTMLElement>(':scope > span[aria-hidden]')) {
      patchText(span, sep);
    }
  }

  /** Authored items, excluding anything inside the rendered trail. */
  private _items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-breadcrumb-item')].filter(
      (it) => !this._nav?.contains(it),
    );
  }

  private readonly _sync = (): void => {
    const nav = this._nav;
    if (!nav) return;
    const items = this._items();
    const sep = this.getAttribute('separator') || '/';

    const slots: CrumbSlot[] = [];
    items.forEach((it, i) => {
      if (it.style.display !== 'none') it.style.display = 'none';
      const last = i === items.length - 1;
      const href = it.getAttribute('href');
      const text = it.getAttribute('title') || it.textContent || '';
      if (href && !last) slots.push({ kind: 'link', text, href });
      else slots.push({ kind: last ? 'current' : 'span', text });
      if (!last) slots.push({ kind: 'sep', text: sep });
    });

    slots.forEach((slot, i) => {
      const cur = nav.children[i];
      if (cur && kindOf(cur) === slot.kind) {
        EBreadcrumb._patchSlot(cur, slot);
        return;
      }
      const node = EBreadcrumb._makeSlot(slot);
      if (cur) cur.replaceWith(node);
      else nav.appendChild(node);
    });
    while (nav.children.length > slots.length) nav.lastElementChild!.remove();
  };

  private static _makeSlot(slot: CrumbSlot): HTMLElement {
    if (slot.kind === 'link') {
      const a = document.createElement('a');
      EBreadcrumb._patchSlot(a, slot);
      return a;
    }
    const span = document.createElement('span');
    if (slot.kind === 'current') {
      span.className = 'ink-breadcrumb__current';
      span.setAttribute('aria-current', 'page');
    } else if (slot.kind === 'sep') {
      span.setAttribute('aria-hidden', 'true');
    }
    EBreadcrumb._patchSlot(span, slot);
    return span;
  }

  private static _patchSlot(el: Element, slot: CrumbSlot): void {
    if (slot.kind === 'link') patchAttr(el, 'href', slot.href ?? '');
    patchText(el, slot.text);
  }
}
define('e-breadcrumb', EBreadcrumb);

/**
 * @summary Single trail entry inside an `<e-breadcrumb>`.
 *
 * Acts as a data carrier; the parent renders the actual link or current page
 * marker and hides this element. Changing its attributes or text after mount
 * updates the rendered trail.
 *
 * @attr {string} [href] - Optional link target. The last item should omit `href` so it renders as the current page.
 * @attr {string} title - Visible label. Falls back to text content when omitted.
 *
 * @example
 * <e-breadcrumb-item href="#" title="Library"></e-breadcrumb-item>
 */
export class EBreadcrumbItem extends HTMLElement {}
define('e-breadcrumb-item', EBreadcrumbItem);
