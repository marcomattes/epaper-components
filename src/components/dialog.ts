import {
  addCleanup,
  boolAttr,
  define,
  esc,
  patchAttr,
  patchText,
  randId,
  runCleanups,
} from '../core/dom';
import { iconSvg } from '../core/icons';

type Size = 'small' | 'medium' | 'large' | 'full';

const isSize = (s: string | null): s is Size =>
  s === 'small' || s === 'medium' || s === 'large' || s === 'full';

/*
 * Page scroll is a single resource, so the lock is shared rather than tracked
 * per dialog. With one counter per instance, closing the first of two open
 * dialogs would restore scrolling underneath the second, and the second would
 * then restore the value it captured while already locked — leaving the page
 * frozen for good. Only the last dialog out puts the original value back.
 */
let scrollLockCount = 0;
let scrollLockPrev = '';

function lockPageScroll(): void {
  if (scrollLockCount === 0) scrollLockPrev = document.documentElement.style.overflow;
  scrollLockCount += 1;
  document.documentElement.style.overflow = 'hidden';
}

function unlockPageScroll(): void {
  if (scrollLockCount === 0) return;
  scrollLockCount -= 1;
  if (scrollLockCount === 0) document.documentElement.style.overflow = scrollLockPrev;
}

/** Why the dialog closed. Carried on `e-close` so hosts can tell apart intents. */
export type DialogCloseReason = 'close-button' | 'escape' | 'backdrop' | 'api';

/**
 * @summary Modal dialog built on the native `<dialog>` element.
 * @since v1.1.0
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
  static readonly observedAttributes = ['open', 'heading', 'size', 'no-close', 'aria-label'];

  private _wired = false;
  private _dialog: HTMLDialogElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _closeBtn: HTMLButtonElement | null = null;
  private _headerEl: HTMLElement | null = null;
  private _titleId = '';
  private _reason: DialogCloseReason = 'api';
  /** Whether this instance currently holds a share of the shared scroll lock. */
  private _holdsScrollLock = false;
  /** Whether the native element is in the top layer, as opposed to merely open. */
  private _modal = false;
  /** Native `close` events to swallow because we caused them ourselves. */
  private _suppressNativeClose = 0;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._build();
    }
    this._bind();
    this._restoreOpenState();
  }

  disconnectedCallback() {
    // Removing a modal `<dialog>` runs the browser's cleanup steps: it leaves
    // the top layer and loses its modal state, but keeps its `open` attribute.
    // Record that so a later reinsert knows the difference between "still
    // modal" and "open but inert-less".
    this._modal = false;
    this._unlockScroll();
    runCleanups(this);
  }

  /**
   * Bring the native element back in line with the `open` attribute on
   * connect.
   *
   * Three cases: never opened (normal path, emits `e-open`); still modal from
   * before (nothing to do); or open-but-no-longer-modal after a detach, where
   * the equality check in `_syncOpen` would skip `showModal()` and hand back a
   * dialog with no focus trapping and no inertness behind it. That last case
   * re-enters the top layer without emitting a close/open pair, because from
   * the outside the dialog never closed.
   */
  private _restoreOpenState(): void {
    const dialog = this._dialog;
    if (!dialog || !boolAttr(this, 'open')) return;
    if (this._modal) return;

    if (dialog.open) {
      this._suppressNativeClose += 1;
      dialog.close();
      dialog.showModal();
      this._modal = true;
      this._lockScroll();
      return;
    }

    this._syncOpen(true);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null) {
    if (!this._wired || old === val) return;
    if (name === 'open') {
      this._syncOpen(val !== null && val !== 'false');
    } else if (name === 'heading') {
      if (this._titleEl) patchText(this._titleEl, val ?? '');
      this._syncHeaderVisibility();
      this._syncLabel();
    } else if (name === 'size') {
      this._dialog?.setAttribute('data-size', this._size());
    } else if (name === 'no-close') {
      this._syncHeaderVisibility();
    } else if (name === 'aria-label') {
      this._syncLabel();
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
    this._titleId = titleId;

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
    this._syncLabel();
  }

  /**
   * Give the native `<dialog>` an accessible name.
   *
   * `aria-labelledby` may only point at the title while there *is* one —
   * aiming it at an empty `<h2>` produces an unnamed modal. `aria-label` on
   * this custom element does not reach the nested `<dialog>`, so a
   * host-authored one is forwarded explicitly.
   */
  private _syncLabel(): void {
    const dialog = this._dialog;
    if (!dialog || !this._titleId) return;
    const heading = this.getAttribute('heading') ?? '';
    const hostLabel = (this.getAttribute('aria-label') ?? '').trim();
    patchAttr(dialog, 'aria-labelledby', heading ? this._titleId : null);
    patchAttr(dialog, 'aria-label', heading ? null : hostLabel || null);
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
    this._modal = false;
    if (this._suppressNativeClose > 0) {
      this._suppressNativeClose -= 1;
      return;
    }
    this.removeAttribute('open');
  };

  private _syncOpen(open: boolean): void {
    const dialog = this._dialog;
    if (!dialog || !this.isConnected) return;

    // The native element may already be in the target state — `Escape` closes
    // it before we mirror the change onto the attribute. Skip the call but
    // still run the side effects, so `e-close` fires exactly once either way.
    if (open !== dialog.open) {
      if (open) {
        dialog.showModal();
        this._modal = true;
      } else {
        dialog.close();
        this._modal = false;
      }
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
    if (this._holdsScrollLock) return;
    this._holdsScrollLock = true;
    lockPageScroll();
  }

  private _unlockScroll(): void {
    if (!this._holdsScrollLock) return;
    this._holdsScrollLock = false;
    unlockPageScroll();
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
