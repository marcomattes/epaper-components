import { addCleanup, boolAttr, define, runCleanups } from '../../core/dom';

interface PanelDef {
  key: string;
  heading: string;
  disabled: boolean;
  open: boolean;
  body: ChildNode[];
}

/**
 * @summary Stack of expandable sections built on native `<details>`/`<summary>`.
 * @since v1.1.0
 *
 * Reads its panels from child `<e-collapse-panel>` elements at connect time.
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
export class ECollapse extends HTMLElement {
  static readonly observedAttributes = ['accordion'];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private readonly _panels = new Map<string, HTMLDetailsElement>();
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

  private _build(): void {
    const accordion = boolAttr(this, 'accordion');
    const defaultOpen = new Set(
      (this.getAttribute('default-open') || '').split(',').filter(Boolean),
    );

    const defs: PanelDef[] = [...this.querySelectorAll('e-collapse-panel')].map((el, i) => {
      const key = el.getAttribute('key') || `panel-${i + 1}`;
      return {
        key,
        heading: el.getAttribute('heading') || '',
        disabled: el.hasAttribute('disabled'),
        open: defaultOpen.has(key) || el.hasAttribute('open'),
        body: [...el.childNodes],
      };
    });

    const root = document.createElement('div');
    root.className = 'ink-collapse';

    let openTaken = false;
    for (const def of defs) {
      const details = document.createElement('details');
      details.className = 'ink-collapse__panel';
      details.dataset['key'] = def.key;
      // In accordion mode more than one declared-open panel is a contradiction;
      // the first one wins rather than rendering a state the mode forbids.
      // Opening a panel queues a `toggle` even while the element is still
      // detached, so the initial state has to be suppressed too — otherwise
      // every declared-open panel would report an `e-change` nobody caused.
      if (def.open && !def.disabled && !(accordion && openTaken)) {
        this._setOpen(details, true);
        openTaken = true;
      }

      const summary = document.createElement('summary');
      summary.className = 'ink-collapse__summary';
      if (def.disabled) {
        summary.setAttribute('aria-disabled', 'true');
        details.dataset['disabled'] = '';
      }

      const marker = document.createElement('span');
      marker.className = 'ink-collapse__marker';
      marker.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'ink-collapse__heading';
      label.textContent = def.heading;

      summary.append(marker, label);
      details.appendChild(summary);

      const body = document.createElement('div');
      body.className = 'ink-collapse__body';
      body.append(...def.body);
      details.appendChild(body);

      root.appendChild(details);
      this._panels.set(def.key, details);
    }

    this.replaceChildren(root);
    this._root = root;
  }

  private _bind(): void {
    const root = this._root;
    if (!root) return;
    root.addEventListener('click', this._onClick);
    addCleanup(this, () => root.removeEventListener('click', this._onClick));

    // `toggle` does not bubble, so each panel needs its own listener.
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
    if (this._suppressed.delete(details)) return;

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
 *
 * Acts as a data carrier; the parent renders the actual `<details>` panel and
 * adopts this element's children as the panel body.
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
export class ECollapsePanel extends HTMLElement {}

define('e-collapse-panel', ECollapsePanel);
