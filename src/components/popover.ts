import {
  addCleanup,
  boolAttr,
  define,
  esc,
  onGlobal,
  patchAttr,
  patchText,
  randId,
  runCleanups,
} from '../core/dom';
import './button';

/**
 * Shared trigger/panel plumbing for the two click-driven overlays in this file.
 *
 * Positioning is CSS-only (an absolutely positioned panel inside a relative
 * root), matching `<e-dropdown>`. The Popover API and CSS anchor positioning
 * would both be a better fit, but they land well above this library's support
 * floor, and a polyfill would cost more than the four rules this replaces.
 *
 * The panel is non-modal by design: e-paper has no hover, so an overlay is
 * always a deliberate tap, and trapping focus for what is effectively a
 * tooltip-with-buttons would be more disruptive than the overlay itself.
 */
class Popup {
  readonly root: HTMLElement;
  readonly panel: HTMLElement;
  private readonly _triggerWrap: HTMLElement;

  constructor(
    private readonly host: HTMLElement,
    opts: { rootClass: string; panelClass: string; role: 'dialog' | 'alertdialog' },
  ) {
    const trigger = host.querySelector<HTMLElement>('[slot="trigger"]') ?? Popup._defaultTrigger();
    trigger.remove();

    this.root = document.createElement('div');
    this.root.className = opts.rootClass;

    this._triggerWrap = document.createElement('span');
    this._triggerWrap.dataset['trigger'] = '';
    this._triggerWrap.appendChild(trigger);

    this.panel = document.createElement('div');
    this.panel.id = randId(opts.panelClass);
    this.panel.className = opts.panelClass;
    this.panel.setAttribute('role', opts.role);
    this.panel.hidden = true;

    this.root.append(this._triggerWrap, this.panel);
  }

  private static _defaultTrigger(): HTMLElement {
    const btn = document.createElement('e-button');
    btn.textContent = 'Open';
    return btn;
  }

  /** The focusable control inside the trigger slot, if there is one. */
  control(): HTMLElement | null {
    return this._triggerWrap.querySelector<HTMLElement>('button, [role="button"], a[href]');
  }

  /**
   * Wire ARIA once the panel's accessible name is known.
   *
   * An empty label *removes* the attribute rather than leaving the previous
   * one in place: clearing a heading has to clear the announcement with it,
   * otherwise the panel keeps a name its content no longer has. A panel with
   * no name of its own falls back to the trigger's, which is the closest
   * honest description available.
   */
  describe(label: string): void {
    const control = this.control();
    control?.setAttribute('aria-haspopup', 'dialog');
    control?.setAttribute('aria-expanded', String(!this.panel.hidden));
    control?.setAttribute('aria-controls', this.panel.id);
    patchAttr(this.panel, 'aria-label', label || (control?.textContent ?? '').trim() || null);
  }

  get open(): boolean {
    return !this.panel.hidden;
  }

  /** Show or hide the panel and keep the trigger's ARIA state in step. */
  setOpen(open: boolean): void {
    this.panel.hidden = !open;
    this.control()?.setAttribute('aria-expanded', String(open));
  }

  /** Move focus to the first focusable element inside the panel. */
  focusPanel(): void {
    this.panel
      .querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      ?.focus();
  }

  focusTrigger(): void {
    this.control()?.focus();
  }

  /**
   * Attach the open/dismiss handlers. Both callbacks *request* a state change
   * rather than applying one: the host's `open` attribute stays the single
   * source of truth and drives the panel from `attributeChangedCallback`.
   */
  bindDismiss(
    onRequestClose: (reason: 'trigger' | 'outside' | 'escape') => void,
    onRequestOpen: () => void,
  ): void {
    const onTriggerClick = (): void => {
      if (this.open) onRequestClose('trigger');
      else onRequestOpen();
    };
    const control = this._triggerWrap;
    control.addEventListener('click', onTriggerClick);
    addCleanup(this.host, () => control.removeEventListener('click', onTriggerClick));

    onGlobal(this.host, document, 'mousedown', (e) => {
      if (this.open && !this.host.contains(e.target as Node)) onRequestClose('outside');
    });
    onGlobal(this.host, document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.open) {
        onRequestClose('escape');
        this.focusTrigger();
      }
    });
  }
}

/**
 * @summary Click-triggered overlay panel anchored to its trigger.
 * @since v1.1.0
 *
 * The counterpart to a tooltip for hardware that has no hover: capacitive
 * e-paper digitizers report contact, not proximity, so anything that would be
 * revealed on hover has to be revealed on tap instead. Content is arbitrary,
 * which is what separates this from `<e-dropdown>` (a list of commands).
 *
 * The panel is non-modal and does not trap focus. Reach for `<e-dialog>` when
 * the user must deal with the content before continuing.
 *
 * @attr {'left'|'right'} [align='left'] - Horizontal alignment relative to the trigger.
 * @attr {'bottom'|'top'} [placement='bottom'] - Side of the trigger the panel opens on.
 * @attr {string} [heading] - Title rendered above the content and used as the panel's accessible name.
 * @attr {boolean} [open] - Reflects and controls visibility.
 *
 * @slot trigger - Element that opens the panel (typically an `<e-button>`).
 * @slot - Panel content.
 *
 * @fires {CustomEvent<{value: boolean}>} e-open - Fired after the panel opened. `value` is always `true`.
 * @fires {CustomEvent<{value: boolean}>} e-close - Fired after the panel closed. `value` is always `false`.
 *
 * @example
 * <e-popover heading="Sync status" align="right">
 *   <e-button slot="trigger">Details</e-button>
 *   <e-text>Last sync 3 minutes ago.</e-text>
 * </e-popover>
 */
export class EPopover extends HTMLElement {
  static observedAttributes = ['align', 'placement', 'heading', 'open'];

  private _wired = false;
  private _popup: Popup | null = null;
  private _headingEl: HTMLElement | null = null;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._build();
    }
    this._popup?.bindDismiss(
      () => this.removeAttribute('open'),
      () => this.setAttribute('open', ''),
    );
    if (boolAttr(this, 'open')) this._syncOpen(true);
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null) {
    if (!this._wired || old === val || !this._popup) return;
    if (name === 'open') {
      this._syncOpen(val !== null && val !== 'false');
    } else if (name === 'heading') {
      const heading = val ?? '';
      if (this._headingEl) {
        patchText(this._headingEl, heading);
        this._headingEl.hidden = heading === '';
      }
      this._popup.describe(heading);
    } else {
      this._syncPlacement();
    }
  }

  /** Open the panel. Equivalent to setting the `open` attribute. */
  show(): void {
    this.setAttribute('open', '');
  }

  /** Close the panel. Equivalent to removing the `open` attribute. */
  close(): void {
    this.removeAttribute('open');
  }

  private _build(): void {
    const content = [...this.childNodes].filter(
      (n) => !(n instanceof Element && n.getAttribute('slot') === 'trigger'),
    );
    const heading = this.getAttribute('heading') ?? '';

    const popup = new Popup(this, {
      rootClass: 'ink-popover',
      panelClass: 'ink-popover__panel',
      role: 'dialog',
    });
    popup.panel.innerHTML = `<p class="ink-popover__heading">${esc(heading)}</p>
      <div class="ink-popover__body"></div>`;
    const headingEl = popup.panel.querySelector<HTMLElement>('.ink-popover__heading')!;
    headingEl.hidden = heading === '';
    const body = popup.panel.querySelector<HTMLElement>('.ink-popover__body')!;
    for (const node of content) body.appendChild(node);

    this.replaceChildren(popup.root);
    this._popup = popup;
    this._headingEl = headingEl;
    this._syncPlacement();
    popup.describe(heading);
  }

  private _syncPlacement(): void {
    const panel = this._popup?.panel;
    if (!panel) return;
    panel.classList.toggle(
      'ink-popover__panel--align-right',
      this.getAttribute('align') === 'right',
    );
    panel.classList.toggle('ink-popover__panel--top', this.getAttribute('placement') === 'top');
  }

  private _syncOpen(open: boolean): void {
    const popup = this._popup;
    if (!popup || popup.open === open) return;
    popup.setOpen(open);
    this.dispatchEvent(
      new CustomEvent(open ? 'e-open' : 'e-close', { detail: { value: open }, bubbles: true }),
    );
  }
}

define('e-popover', EPopover);

/**
 * @summary Inline confirmation bubble anchored to the control that triggers it.
 *
 * A lighter alternative to `<e-dialog>` for a single destructive action: no
 * backdrop, no full-panel refresh, just a small dirty rectangle next to the
 * button. That matters on e-paper, where undo is expensive enough that
 * confirming a delete is worth more than it is on a desktop, but a full modal
 * flash for a one-line question is not.
 *
 * @attr {string} [message] - The question. Rendered as the bubble's body and accessible name.
 * @attr {string} [confirm-label='OK'] - Label of the confirming button.
 * @attr {string} [cancel-label='Cancel'] - Label of the dismissing button.
 * @attr {'left'|'right'} [align='left'] - Horizontal alignment relative to the trigger.
 * @attr {'bottom'|'top'} [placement='bottom'] - Side of the trigger the bubble opens on.
 * @attr {boolean} [open] - Reflects and controls visibility.
 *
 * @slot trigger - Element that opens the bubble (typically an `<e-button>`).
 *
 * @fires {CustomEvent<{value: boolean}>} e-confirm - Fired when the confirming button is activated. `value` is always `true`.
 * @fires {CustomEvent<{value: boolean}>} e-cancel - Fired when the bubble is dismissed by the cancel button, `Escape` or an outside click. `value` is always `false`.
 *
 * @example
 * <e-popconfirm message="Delete this file?" confirm-label="Delete">
 *   <e-button slot="trigger">Delete</e-button>
 * </e-popconfirm>
 */
export class EPopconfirm extends HTMLElement {
  static observedAttributes = [
    'message',
    'confirm-label',
    'cancel-label',
    'align',
    'placement',
    'open',
  ];

  private _wired = false;
  private _popup: Popup | null = null;
  private _messageEl: HTMLElement | null = null;
  private _confirmBtn: HTMLElement | null = null;
  private _cancelBtn: HTMLElement | null = null;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._build();
    }
    this._popup?.bindDismiss(
      () => this._resolve(false),
      () => this.setAttribute('open', ''),
    );

    const panel = this._popup?.panel;
    if (panel) {
      panel.addEventListener('click', this._onPanelClick);
      addCleanup(this, () => panel.removeEventListener('click', this._onPanelClick));
    }
    if (boolAttr(this, 'open')) this._syncOpen(true);
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null) {
    if (!this._wired || old === val || !this._popup) return;
    if (name === 'open') {
      this._syncOpen(val !== null && val !== 'false');
    } else if (name === 'message') {
      const message = val ?? '';
      if (this._messageEl) patchText(this._messageEl, message);
      this._popup.describe(message);
    } else if (name === 'confirm-label') {
      if (this._confirmBtn) patchText(this._confirmBtn, val || 'OK');
    } else if (name === 'cancel-label') {
      if (this._cancelBtn) patchText(this._cancelBtn, val || 'Cancel');
    } else {
      this._syncPlacement();
    }
  }

  /** Open the bubble. Equivalent to setting the `open` attribute. */
  show(): void {
    this.setAttribute('open', '');
  }

  /** Close the bubble without emitting `e-cancel`. */
  close(): void {
    this.removeAttribute('open');
  }

  private _build(): void {
    const message = this.getAttribute('message') ?? '';
    const confirmLabel = this.getAttribute('confirm-label') || 'OK';
    const cancelLabel = this.getAttribute('cancel-label') || 'Cancel';

    const popup = new Popup(this, {
      rootClass: 'ink-popconfirm',
      panelClass: 'ink-popconfirm__panel',
      role: 'alertdialog',
    });
    // Cancel comes first so the safe choice is the first focus stop. The
    // labels live in their own spans because `<e-button>` moves its children
    // into an inner `<button>` — patching the host's text would destroy it.
    popup.panel.innerHTML = `<p class="ink-popconfirm__message">${esc(message)}</p>
      <div class="ink-popconfirm__actions">
        <e-button data-action="cancel"><span class="ink-popconfirm__cancel">${esc(cancelLabel)}</span></e-button>
        <e-button data-action="confirm" variant="primary"><span class="ink-popconfirm__confirm">${esc(confirmLabel)}</span></e-button>
      </div>`;

    this.replaceChildren(popup.root);
    this._popup = popup;
    this._messageEl = popup.panel.querySelector('.ink-popconfirm__message');
    this._cancelBtn = popup.panel.querySelector('.ink-popconfirm__cancel');
    this._confirmBtn = popup.panel.querySelector('.ink-popconfirm__confirm');
    this._syncPlacement();
    popup.describe(message);
  }

  private _syncPlacement(): void {
    const panel = this._popup?.panel;
    if (!panel) return;
    panel.classList.toggle(
      'ink-popconfirm__panel--align-right',
      this.getAttribute('align') === 'right',
    );
    panel.classList.toggle('ink-popconfirm__panel--top', this.getAttribute('placement') === 'top');
  }

  private _onPanelClick = (e: Event): void => {
    const action = (e.target as Element).closest<HTMLElement>('[data-action]');
    if (!action) return;
    this._resolve(action.dataset['action'] === 'confirm');
  };

  /** Close the bubble and report the outcome exactly once. */
  private _resolve(confirmed: boolean): void {
    const popup = this._popup;
    if (!popup?.open) return;

    // Opening moved focus into the panel, so closing has to move it back:
    // hiding the focused subtree otherwise drops the keyboard user on
    // `<body>` with no way back to where they were. `Escape` gets this from
    // the global key handler; the buttons need it here.
    const restoreFocus = popup.panel.contains(document.activeElement);

    this.removeAttribute('open');
    if (restoreFocus) popup.focusTrigger();

    this.dispatchEvent(
      new CustomEvent(confirmed ? 'e-confirm' : 'e-cancel', {
        detail: { value: confirmed },
        bubbles: true,
      }),
    );
  }

  private _syncOpen(open: boolean): void {
    const popup = this._popup;
    if (!popup || popup.open === open) return;
    popup.setOpen(open);
    if (open) popup.focusPanel();
  }
}

define('e-popconfirm', EPopconfirm);
