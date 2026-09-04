import {
  addCleanup,
  boolAttr,
  cloneItemBody,
  define,
  EpaperElement,
  observeItems,
  patchAttr,
  patchText,
  runCleanups,
} from '../../core/dom';

/** The rendered parts of one panel, kept so a re-sync patches instead of rebuilds. */
interface PanelParts {
  details: HTMLDetailsElement;
  summary: HTMLElement;
  heading: HTMLElement;
  body: HTMLElement;
  item: HTMLElement;
  /** Last body markup copied across, so an unchanged body is never re-cloned. */
  bodySignature: string | null;
}

/**
 * @summary Stack of expandable sections built on native `<details>`/`<summary>`.
 * @since v1.1.0
 *
 * Reads its panels from child `<e-collapse-panel>` elements, which stay in the
 * light DOM (hidden) as the component's source of truth, so a panel added,
 * retitled or removed after mount renders without re-mounting the collapse.
 * Expanding a section mutates one `open` attribute, so the EPDC repaints only
 * the section that changed instead of reflowing the page — which is what makes
 * a collapse a better fit than a scrolling wall of text on e-paper.
 *
 * Disclosure state lives on the native element, so keyboard support, the
 * accessible name and find-in-page all come from the browser.
 *
 * @attr {boolean} [accordion] - Allows only one open panel at a time; opening one closes the rest.
 * @attr {string} [default-open] - Comma-separated panel keys open on first render. A panel's own `open` attribute has the same effect.
 *
 * @slot - Default slot for `<e-collapse-panel>` children.
 *
 * @fires {CustomEvent<{value: string[]}>} e-change - Fired when a panel opens or closes. `value` lists the keys of every open panel, in document order.
 *
 * @example
 * <e-collapse accordion default-open="shipping">
 *   <e-collapse-panel key="shipping" heading="Shipping">Ships in 2 days.</e-collapse-panel>
 *   <e-collapse-panel key="returns" heading="Returns">30 days, no questions.</e-collapse-panel>
 * </e-collapse>
 */
export class ECollapse extends EpaperElement {
  static readonly observedAttributes = ['accordion'];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private readonly _panels = new Map<string, HTMLDetailsElement>();
  private readonly _parts = new Map<string, PanelParts>();
  /** Panels the current sync created, so their initial state stays silent. */
  private _syncing = false;
  /**
   * Panels whose next `toggle` we caused ourselves. `toggle` is dispatched
   * asynchronously, so a synchronous "am I syncing" flag would already be back
   * to false by the time the event lands — the closes an accordion performs
   * would then be reported as if the user had made them.
   */
  private readonly _suppressed = new Set<HTMLDetailsElement>();

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._build();
    }
    this._bind();
    observeItems(this, this._sync, {
      // `true`, not a name list: a panel body can hold anything, and an edit
      // worth re-rendering can land on any attribute inside it.
      attributeFilter: true,
      isOutput: (n) => this._root?.contains(n) ?? false,
    });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null) {
    if (!this._wired || old === val) return;
    // Switching into accordion mode collapses everything but the first open
    // panel, so the rendered state always matches the declared mode.
    if (name === 'accordion' && boolAttr(this, 'accordion')) {
      let seen = false;
      for (const details of this._panels.values()) {
        if (!details.open) continue;
        if (seen) this._setOpen(details, false);
        seen = true;
      }
    }
  }

  /** Change a panel's state without reporting it back as a user action. */
  private _setOpen(details: HTMLDetailsElement, open: boolean): void {
    if (details.open === open) return;
    this._suppressed.add(details);
    details.open = open;
  }

  /** Keys of the currently open panels, in document order. */
  get value(): string[] {
    return [...this._panels.entries()].filter(([, d]) => d.open).map(([key]) => key);
  }

  /**
   * Open exactly the given keys, closing every other panel. Emits nothing.
   *
   * In `accordion` mode only the first key that matches a panel is opened —
   * the public API must not be able to produce a state the mode forbids and
   * that no user interaction could have reached.
   */
  set value(keys: string[]) {
    const accordion = boolAttr(this, 'accordion');
    const wanted = new Set(keys);
    let openTaken = false;
    for (const [key, details] of this._panels) {
      const open = wanted.has(key) && !(accordion && openTaken);
      if (open) openTaken = true;
      this._setOpen(details, open);
    }
  }

  /** Authored panels, excluding anything inside the rendered output. */
  private _items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-collapse-panel')].filter(
      (item) => !this._root?.contains(item),
    );
  }

  private _build(): void {
    const root = document.createElement('div');
    root.className = 'ink-collapse';
    this.appendChild(root);
    this._root = root;
    this._sync();
  }

  /**
   * Bring the rendered panels in line with the authored ones.
   *
   * Keyed by the panel's `key`, so an edit patches the `<details>` that is
   * already on screen — the open/closed state, and any focus inside it,
   * survive. Only a panel that has genuinely appeared or disappeared changes
   * the DOM structure.
   */
  private readonly _sync = (): void => {
    const root = this._root;
    if (!root) return;
    this._syncing = true;
    const accordion = boolAttr(this, 'accordion');
    const defaultOpen = new Set(
      (this.getAttribute('default-open') || '').split(',').filter(Boolean),
    );
    const items = this._items();
    const seen = new Set<string>();
    let openTaken = [...this._panels.values()].some((details) => details.open);

    items.forEach((item, index) => {
      if (item.style.display !== 'none') item.style.display = 'none';
      const key = item.getAttribute('key') || `panel-${index + 1}`;
      if (seen.has(key)) return;
      seen.add(key);
      const heading = item.getAttribute('heading') || '';
      const disabled = item.hasAttribute('disabled');

      let parts = this._parts.get(key);
      const created = !parts;
      if (!parts) {
        parts = ECollapse._makePanel(key);
        parts.details.addEventListener('toggle', this._onToggle);
        addCleanup(this, () => parts!.details.removeEventListener('toggle', this._onToggle));
        this._parts.set(key, parts);
        this._panels.set(key, parts.details);
      }
      parts.item = item;

      patchText(parts.heading, heading);
      patchAttr(parts.summary, 'aria-disabled', disabled ? 'true' : null);
      patchAttr(parts.details, 'data-disabled', disabled ? '' : null);
      // The body is cloned rather than moved: the carrier stays the source of
      // truth and has to keep its own content to re-sync from.
      if (parts.bodySignature !== item.innerHTML) {
        parts.bodySignature = item.innerHTML;
        cloneItemBody(item, parts.body);
      }

      // In accordion mode more than one declared-open panel is a
      // contradiction; the first one wins rather than rendering a state the
      // mode forbids.
      if (created) {
        const open = (defaultOpen.has(key) || item.hasAttribute('open')) && !disabled;
        if (open && !(accordion && openTaken)) {
          this._setOpen(parts.details, true);
          openTaken = true;
        }
      }

      const current = root.children[index] ?? null;
      if (current !== parts.details) root.insertBefore(parts.details, current);
    });

    for (const [key, parts] of this._parts) {
      if (seen.has(key)) continue;
      parts.details.remove();
      this._parts.delete(key);
      this._panels.delete(key);
    }
    this._syncing = false;
  };

  private static _makePanel(key: string): PanelParts {
    const details = document.createElement('details');
    details.className = 'ink-collapse__panel';
    details.dataset['key'] = key;

    const summary = document.createElement('summary');
    summary.className = 'ink-collapse__summary';

    const marker = document.createElement('span');
    marker.className = 'ink-collapse__marker';
    marker.setAttribute('aria-hidden', 'true');

    const heading = document.createElement('span');
    heading.className = 'ink-collapse__heading';

    summary.append(marker, heading);
    details.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'ink-collapse__body';
    details.appendChild(body);

    return { details, summary, heading, body, item: details, bodySignature: null };
  }

  private _bind(): void {
    const root = this._root;
    if (!root) return;
    root.addEventListener('click', this._onClick);
    addCleanup(this, () => root.removeEventListener('click', this._onClick));

    // `toggle` does not bubble, so each panel needs its own listener. Panels
    // created by a later sync get theirs there.
    for (const details of this._panels.values()) {
      details.addEventListener('toggle', this._onToggle);
      addCleanup(this, () => details.removeEventListener('toggle', this._onToggle));
    }
  }

  /** A `<summary>` has no disabled state of its own — cancel the default. */
  private readonly _onClick = (e: MouseEvent): void => {
    const summary = (e.target as Element).closest<HTMLElement>('.ink-collapse__summary');
    if (summary?.getAttribute('aria-disabled') === 'true') e.preventDefault();
  };

  private readonly _onToggle = (e: Event): void => {
    const details = e.target as HTMLDetailsElement;
    if (this._suppressed.delete(details) || this._syncing) return;

    if (details.open && boolAttr(this, 'accordion')) {
      for (const other of this._panels.values()) {
        if (other !== details) this._setOpen(other, false);
      }
    }

    this.dispatchEvent(
      new CustomEvent('e-change', { detail: { value: this.value }, bubbles: true }),
    );
  };
}

define('e-collapse', ECollapse);

/**
 * @summary Single section inside an `<e-collapse>`.
 * @since v1.1.0
 *
 * Acts as a data carrier; the parent renders the actual `<details>` panel and
 * clones this element's children into the panel body. The carrier stays in the
 * light DOM, hidden, so later edits to it re-render the panel.
 *
 * @attr {string} [key] - Identifier reported in `e-change` and matched by the parent's `default-open`. Defaults to the 1-based panel position.
 * @attr {string} [heading] - Summary line, always visible.
 * @attr {boolean} [open] - Renders the panel expanded on first render.
 * @attr {boolean} [disabled] - Prevents the panel from being toggled.
 *
 * @slot - Default slot for the panel body.
 *
 * @example
 * <e-collapse-panel key="returns" heading="Returns">30 days.</e-collapse-panel>
 */
export class ECollapsePanel extends EpaperElement {}

define('e-collapse-panel', ECollapsePanel);
