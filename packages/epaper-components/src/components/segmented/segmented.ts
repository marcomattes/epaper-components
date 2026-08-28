import {
  addCleanup,
  define,
  EpaperElement,
  observeItems,
  patchAttr,
  patchText,
  runCleanups,
} from '../../core/dom';

/**
 * @summary Single-select toggle row built from `<e-segment>` children.
 * @since v1.0.1
 *
 * The authored `<e-segment>` children stay in the light DOM as the source of
 * truth and a `MutationObserver` re-syncs the rendered row whenever one is
 * added, removed, relabelled or re-valued. Buttons keep their DOM identity
 * across a sync — only changed labels and attributes are patched.
 *
 * Because the segments stay put they would otherwise render twice, so each one
 * is hidden with an inline `display:none` when it is wired. The stable form of
 * that is a `e-segment { display: none; }` rule in `components.css` (it is
 * currently listed among the `display: inline-flex` primitives); the inline
 * style is what guarantees it without one.
 *
 * @attr {string} [value] - Currently selected segment value. Reactive.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user picks a different segment.
 *
 * @slot - Default slot for `<e-segment>` children.
 *
 * @example
 * <e-segmented value="a">
 *   <e-segment value="a" label="A"></e-segment>
 *   <e-segment value="b" label="B"></e-segment>
 * </e-segmented>
 */
export class ESegmented extends EpaperElement {
  static readonly observedAttributes = ['value'];

  private _wired = false;
  private _container: HTMLElement | null = null;
  private readonly _buttons: HTMLButtonElement[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const container = document.createElement('div');
      container.className = 'ink-segmented';
      container.setAttribute('role', 'radiogroup');
      this._container = container;
      this.appendChild(container);
    }
    this._sync();
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
    addCleanup(this, () => this.removeEventListener('keydown', this._onKeydown));
    observeItems(this, this._sync, {
      attributeFilter: ['value', 'label'],
      isOutput: (n) => this._container?.contains(n) ?? false,
    });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback() {
    if (this._wired) this._syncSelection();
  }

  private readonly _onClick = (e: Event): void => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('.ink-segmented__btn');
    if (!btn || !this.contains(btn)) return;
    this._selectButton(btn);
  };

  private readonly _onKeydown = (e: KeyboardEvent): void => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('.ink-segmented__btn');
    if (!btn || !this.contains(btn)) return;
    const index = this._buttons.indexOf(btn);
    let next: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % this._buttons.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (index - 1 + this._buttons.length) % this._buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = this._buttons.length - 1;
    else return;
    e.preventDefault();
    const nextButton = this._buttons[next];
    if (!nextButton) return;
    this._selectButton(nextButton);
    nextButton.focus();
  };

  private _selectButton(btn: HTMLButtonElement): void {
    const v = btn.dataset['value'] ?? '';
    if (v === this.getAttribute('value')) return;
    this.setAttribute('value', v);
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
  }

  /** Authored segments, excluding anything inside the rendered row. */
  private _segments(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-segment')].filter(
      (s) => !this._container?.contains(s),
    );
  }

  private readonly _sync = (): void => {
    const container = this._container;
    if (!container) return;
    const segments = this._segments();

    while (this._buttons.length > segments.length) this._buttons.pop()!.remove();
    segments.forEach((s, i) => {
      if (s.style.display !== 'none') s.style.display = 'none';
      const value = s.getAttribute('value') ?? '';
      const label = s.getAttribute('label') || s.textContent || '';
      let btn = this._buttons[i];
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ink-segmented__btn';
        btn.setAttribute('role', 'radio');
        container.appendChild(btn);
        this._buttons.push(btn);
      }
      patchAttr(btn, 'data-value', value);
      patchText(btn, label);
    });

    this._syncSelection();
  };

  private _syncSelection(): void {
    const value = this.getAttribute('value');
    for (const btn of this._buttons) {
      patchAttr(btn, 'aria-checked', btn.dataset['value'] === value ? 'true' : 'false');
      btn.tabIndex = btn.dataset['value'] === value ? 0 : -1;
    }
  }
}
define('e-segmented', ESegmented);

/**
 * @summary Single segment entry inside an `<e-segmented>`.
 *
 * Acts as a data carrier; the parent renders the actual button and hides this
 * element. Changing its attributes or text after mount updates the row.
 *
 * @attr {string} value - Value contributed when this segment is active.
 * @attr {string} [label] - Visible label. Falls back to text content.
 */
export class ESegment extends EpaperElement {}
define('e-segment', ESegment);
