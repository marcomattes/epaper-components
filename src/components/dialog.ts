import { addCleanup, boolAttr, define, esc, patchText, randId, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';

type Size = 'small' | 'medium' | 'large' | 'full';

const isSize = (s: string | null): s is Size =>
  s === 'small' || s === 'medium' || s === 'large' || s === 'full';

/** Why the dialog closed. Carried on `e-close` so hosts can tell apart intents. */
export type DialogCloseReason = 'close-button' | 'escape' | 'backdrop' | 'api';

/**
 * @summary Modal dialog built on the native `<dialog>` element.
 *
 * Opens through `showModal()`, so focus trapping, `Escape` handling, the top
 * layer and inertness of the page behind it come from the browser rather than
 * from library code. A modal is a deliberate context switch, which is the one
 * place where a full-panel refresh is appropriate on e-paper: the backdrop is
 * a flat hatch fill (`--ink-hatch-cover`), never a translucent wash, because
 * partial tones dither unpredictably between refreshes.
 *
 * @attr {boolean} [open] - Reflects and controls visibility. Setting it opens the dialog, removing it closes.
 * @attr {string} [heading] - Title rendered in the dialog header and wired up as its accessible name.
 * @attr {'small'|'medium'|'large'|'full'} [size='medium'] - Width preset. `full` fills the viewport, which suits small panels.
 * @attr {boolean} [no-close] - Hides the header close button.
 * @attr {boolean} [static] - Prevents dismissal via `Escape` or a backdrop click. Use for a decision the user must make.
 *
 * @slot - Dialog body.
 * @slot footer - Trailing action area (typically one or two `<e-button>`s).
 *
 * @fires {CustomEvent<{value: boolean}>} e-open - Fired after the dialog opened. `value` is always `true`.
 * @fires {CustomEvent<{value: boolean, reason: DialogCloseReason}>} e-close - Fired after the dialog closed. `value` is always `false`; `reason` says what dismissed it.
 *
 * @example
 * <e-dialog heading="Delete file?" size="small">
 *   <e-text>This cannot be undone.</e-text>
 *   <e-button slot="footer" data-close>Cancel</e-button>
 *   <e-button slot="footer" variant="primary">Delete</e-button>
 * </e-dialog>
 */
export class EDialog extends HTMLElement {
  static observedAttributes = ['open', 'heading', 'size', 'no-close'];

  private _wired = false;
  private _dialog: HTMLDialogElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _closeBtn: HTMLButtonElement | null = null;
  private _headerEl: HTMLElement | null = null;
  private _reason: DialogCloseReason = 'api';
  private _prevOverflow: string | null = null;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._build();
    }
    this._bind();
    if (boolAttr(this, 'open')) this._syncOpen(true);
  }

  disconnectedCallback() {
    this._unlockScroll();
    runCleanups(this);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null) {
    if (!this._wired || old === val) return;
    if (name === 'open') {
      this._syncOpen(val !== null && val !== 'false');
    } else if (name === 'heading') {
      if (this._titleEl) patchText(this._titleEl, val ?? '');
      this._syncHeaderVisibility();
    } else if (name === 'size') {
      this._dialog?.setAttribute('data-size', this._size());
    } else if (name === 'no-close') {
      this._syncHeaderVisibility();
    }
  }

  /** Open the dialog. Equivalent to setting the `open` attribute. */
  show(): void {
    this.setAttribute('open', '');
  }

  /** Close the dialog. Equivalent to removing the `open` attribute. */
  close(reason: DialogCloseReason = 'api'): void {
    this._reason = reason;
    this.removeAttribute('open');
  }

  private _size(): Size {
    const s = this.getAttribute('size');
    return isSize(s) ? s : 'medium';
  }

  private _build(): void {
    // Capture authored content before the wrapper replaces our children.
    const footer = [...this.querySelectorAll<HTMLElement>('[slot="footer"]')];
    for (const el of footer) el.remove();
    const body = [...this.childNodes];

    const heading = this.getAttribute('heading') ?? '';
    const titleId = randId('ink-dialog-title');

    const dialog = document.createElement('dialog');
    dialog.className = 'ink-dialog';
    dialog.setAttribute('data-size', this._size());
    dialog.innerHTML = `<header class="ink-dialog__header">
        <h2 class="ink-dialog__title" id="${esc(titleId)}">${esc(heading)}</h2>
        <button type="button" class="ink-dialog__close" aria-label="Close">${iconSvg('close', 18)}</button>
      </header>
      <div class="ink-dialog__body"></div>
      <footer class="ink-dialog__footer"></footer>`;
    dialog.setAttribute('aria-labelledby', titleId);

    const bodyEl = dialog.querySelector<HTMLElement>('.ink-dialog__body')!;
    for (const node of body) bodyEl.appendChild(node);
    const footerEl = dialog.querySelector<HTMLElement>('.ink-dialog__footer')!;
    for (const el of footer) footerEl.appendChild(el);
    footerEl.hidden = footer.length === 0;

    this.replaceChildren(dialog);
    this._dialog = dialog;
    this._headerEl = dialog.querySelector('.ink-dialog__header');
    this._titleEl = dialog.querySelector('.ink-dialog__title');
    this._closeBtn = dialog.querySelector('.ink-dialog__close');
    this._syncHeaderVisibility();
  }

  private _bind(): void {
    const dialog = this._dialog;
    if (!dialog) return;

    dialog.addEventListener('cancel', this._onCancel);
    dialog.addEventListener('close', this._onNativeClose);
    dialog.addEventListener('click', this._onClick);
    addCleanup(this, () => {
      dialog.removeEventListener('cancel', this._onCancel);
      dialog.removeEventListener('close', this._onNativeClose);
      dialog.removeEventListener('click', this._onClick);
    });
  }

  /** `Escape` reaches the native element as `cancel`; veto it when static. */
  private _onCancel = (e: Event): void => {
    if (boolAttr(this, 'static')) {
      e.preventDefault();
      return;
    }
    this._reason = 'escape';
  };

  private _onClick = (e: MouseEvent): void => {
    const dialog = this._dialog;
    if (!dialog) return;
    const target = e.target as Element;
    if (this._closeBtn && target.closest('.ink-dialog__close')) {
      this.close('close-button');
      return;
    }
    // Any descendant marked `data-close` dismisses — lets consumers wire a
    // Cancel button without writing a listener.
    if (target.closest('[data-close]')) {
      this.close('close-button');
      return;
    }
    // A backdrop click reports the dialog itself as the target, but so does a
    // click on the dialog's own padding — compare against the border box so
    // only genuine outside clicks dismiss.
    if (e.target === dialog && !boolAttr(this, 'static')) {
      const r = dialog.getBoundingClientRect();
      const outside =
        e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      // A synthetic click() carries 0/0 coordinates; treat that as a no-op
      // rather than as a dismissal at the viewport origin.
      if (outside && (e.clientX !== 0 || e.clientY !== 0)) this.close('backdrop');
    }
  };

  /**
   * Mirror a close the browser performed (Escape, `<form method="dialog">`)
   * onto the attribute. `close` is dispatched asynchronously, so this also
   * runs after a close we initiated ourselves — by then the attribute is
   * already gone and removing it again is a no-op that fires nothing.
   */
  private _onNativeClose = (): void => {
    this.removeAttribute('open');
  };

  private _syncOpen(open: boolean): void {
    const dialog = this._dialog;
    if (!dialog || !this.isConnected) return;

    // The native element may already be in the target state — `Escape` closes
    // it before we mirror the change onto the attribute. Skip the call but
    // still run the side effects, so `e-close` fires exactly once either way.
    if (open !== dialog.open) {
      if (open) dialog.showModal();
      else dialog.close();
    }

    if (open) this._lockScroll();
    else this._unlockScroll();

    if (open) {
      this._reason = 'api';
      this.dispatchEvent(new CustomEvent('e-open', { detail: { value: true }, bubbles: true }));
    } else {
      const reason = this._reason;
      this._reason = 'api';
      this.dispatchEvent(
        new CustomEvent('e-close', { detail: { value: false, reason }, bubbles: true }),
      );
    }
  }

  /**
   * Freeze the page behind the modal. Scrolling underneath would repaint a
   * region the user cannot see, which on e-paper costs a refresh for nothing.
   */
  private _lockScroll(): void {
    if (this._prevOverflow !== null) return;
    this._prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }

  private _unlockScroll(): void {
    if (this._prevOverflow === null) return;
    document.documentElement.style.overflow = this._prevOverflow;
    this._prevOverflow = null;
  }

  /** Hide the header entirely when it would carry neither title nor button. */
  private _syncHeaderVisibility(): void {
    const showClose = !boolAttr(this, 'no-close');
    if (this._closeBtn) this._closeBtn.hidden = !showClose;
    if (this._headerEl) {
      this._headerEl.hidden = !showClose && !(this.getAttribute('heading') ?? '');
    }
  }
}

define('e-dialog', EDialog);
