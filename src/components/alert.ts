import { addCleanup, boolAttr, define, esc, patchAttr, patchText, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';

type Variant = 'info' | 'success' | 'warning' | 'error';

const VARIANT_ICON: Record<Variant, string> = {
  info: 'doc',
  success: 'check',
  warning: 'bell',
  error: 'close',
};

const isVariant = (v: string | null): v is Variant =>
  v === 'info' || v === 'success' || v === 'warning' || v === 'error';

/**
 * `alert` interrupts a screen reader mid-sentence, which is right for a
 * failure and wrong for a passive banner — everything else announces at the
 * next opportunity instead.
 */
const roleFor = (variant: Variant): string => (variant === 'error' ? 'alert' : 'status');

/**
 * @summary Inline status banner for a message attached to a region of the page.
 * @since v1.1.0
 *
 * The static counterpart to a toast: nothing appears or disappears on a timer,
 * because an auto-dismissing message can be missed entirely between two panel
 * refreshes. Severity is carried by an icon, a border weight and — for
 * `error` — a hatch fill, never by color alone, so the banner still reads on a
 * grayscale panel.
 *
 * Use `<e-result>` instead when the message *is* the page rather than a note
 * inside it.
 *
 * @attr {'info'|'success'|'warning'|'error'} [variant='info'] - Severity preset; controls icon and border treatment.
 * @attr {string} [heading] - Bold leading line. Omit for a single-line banner.
 * @attr {boolean} [closable] - Renders a dismiss button.
 * @attr {boolean} [no-icon] - Suppresses the leading status icon.
 *
 * @slot - Body text of the banner.
 * @slot action - Trailing action area (typically one `<e-button>` or `<e-link>`).
 *
 * @fires {CustomEvent<{value: string}>} e-close - Fired when the dismiss button is activated. `value` is the heading, or the banner's text when there is none. The host sets `hidden` on itself; remove it from the DOM if it should not come back.
 *
 * @example
 * <e-alert variant="warning" heading="Battery low" closable>
 *   Connect the charger to keep syncing.
 * </e-alert>
 */
export class EAlert extends HTMLElement {
  static readonly observedAttributes = ['variant', 'heading', 'closable', 'no-icon'];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _iconEl: HTMLElement | null = null;
  private _headingEl: HTMLElement | null = null;
  private _bodyEl: HTMLElement | null = null;
  private _closeBtn: HTMLButtonElement | null = null;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._build();
    }
    const btn = this._closeBtn;
    if (btn) {
      btn.addEventListener('click', this._onClose);
      addCleanup(this, () => btn.removeEventListener('click', this._onClose));
    }
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null) {
    if (!this._wired || old === val || !this._root) return;
    if (name === 'variant') {
      const variant = this._variant();
      this._root.dataset.variant = variant;
      // The live-region role follows severity, so it has to move with it:
      // an info banner promoted to error must start interrupting, and an
      // error demoted to info must stop.
      patchAttr(this._root, 'role', roleFor(variant));
      if (this._iconEl) this._iconEl.innerHTML = iconSvg(VARIANT_ICON[variant], 20);
    } else if (name === 'heading') {
      this._syncHeading(val ?? '');
    } else if (name === 'closable') {
      if (this._closeBtn) this._closeBtn.hidden = !boolAttr(this, 'closable');
    } else if (name === 'no-icon') {
      if (this._iconEl) this._iconEl.hidden = boolAttr(this, 'no-icon');
    }
  }

  private _variant(): Variant {
    const v = this.getAttribute('variant');
    return isVariant(v) ? v : 'info';
  }

  private _build(): void {
    const action = this.querySelector<HTMLElement>('[slot="action"]');
    if (action) action.remove();
    const body = [...this.childNodes];

    const variant = this._variant();
    const heading = this.getAttribute('heading') ?? '';

    const root = document.createElement('div');
    root.className = 'ink-alert';
    root.dataset.variant = variant;
    root.setAttribute('role', roleFor(variant));
    root.innerHTML = `<span class="ink-alert__icon" aria-hidden="true">${iconSvg(VARIANT_ICON[variant], 20)}</span>
      <div class="ink-alert__content">
        <p class="ink-alert__heading">${esc(heading)}</p>
        <div class="ink-alert__body"></div>
      </div>
      <div class="ink-alert__action"></div>
      <button type="button" class="ink-alert__close" aria-label="Dismiss">${iconSvg('close', 16)}</button>`;

    this._iconEl = root.querySelector('.ink-alert__icon');
    this._headingEl = root.querySelector('.ink-alert__heading');
    this._bodyEl = root.querySelector('.ink-alert__body');
    this._closeBtn = root.querySelector('.ink-alert__close');

    for (const node of body) this._bodyEl!.appendChild(node);

    const actionWrap = root.querySelector<HTMLElement>('.ink-alert__action')!;
    if (action) actionWrap.appendChild(action);
    else actionWrap.hidden = true;

    if (this._headingEl) this._headingEl.hidden = heading === '';
    if (this._iconEl) this._iconEl.hidden = boolAttr(this, 'no-icon');
    if (this._closeBtn) this._closeBtn.hidden = !boolAttr(this, 'closable');

    this.replaceChildren(root);
    this._root = root;
  }

  private _syncHeading(heading: string): void {
    if (!this._headingEl) return;
    patchText(this._headingEl, heading);
    this._headingEl.hidden = heading === '';
  }

  private readonly _onClose = (): void => {
    const value = this.getAttribute('heading') || (this._bodyEl?.textContent ?? '').trim();
    this.hidden = true;
    this.dispatchEvent(new CustomEvent('e-close', { detail: { value }, bubbles: true }));
  };
}

define('e-alert', EAlert);
