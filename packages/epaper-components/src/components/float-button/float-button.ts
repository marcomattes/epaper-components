import { define, EpaperElement, observeItems, patchAttr, runCleanups } from '../../core/dom';
import { iconSvg } from '../../core/icons';

/**
 * Both elements here build their subtree once on first connect and never
 * rebuild it — a re-connect must not throw the rendered buttons away. Only
 * `_build` differs between them.
 */
abstract class BuildOnce extends EpaperElement {
  protected _wired = false;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._build();
    }
    // Runs on every connect, not only the first: anything registered through
    // the cleanup registry was torn down by the last disconnect.
    this._connected();
  }

  protected abstract _build(): void;

  /** Optional per-connect wiring for subclasses that observe or listen. */
  protected _connected(): void {}
}

/**
 * @summary Standalone floating action button.
 * @since v1.0.1
 *
 * @attr {string} [icon='plus'] - Icon name rendered inside the button.
 * @attr {string} [label] - Accessible label. Falls back to the icon name whenever it is absent or empty, so the button always has a name.
 * @attr {boolean} [primary=true] - Primary visual treatment. Set `primary="false"` for the secondary variant.
 *
 * @example
 * <e-float-button icon="plus" label="Add"></e-float-button>
 */
export class EFloatButton extends BuildOnce {
  static readonly observedAttributes = ['icon', 'label', 'primary'];

  private _btn: HTMLButtonElement | null = null;
  private _icon = '';

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    const btn = this._btn!;

    if (name === 'primary') {
      btn.classList.toggle('ink-fab--secondary', !this._isPrimary());
      return;
    }

    const icon = this.getAttribute('icon') || 'plus';
    if (name === 'icon' && icon !== this._icon) {
      this._icon = icon;
      // Icon SVG swap is unavoidable; update only the button's content, not the host.
      btn.innerHTML = iconSvg(icon, 24);
    }
    // Both `icon` and `label` feed the accessible name, so it is re-resolved
    // whenever either changes — including when the glyph itself is unchanged.
    patchAttr(btn, 'aria-label', this.getAttribute('label') || icon);
  }

  /** Primary is the default treatment: absent or anything but `"false"` counts as primary. */
  private _isPrimary(): boolean {
    return !this.hasAttribute('primary') || this.getAttribute('primary') !== 'false';
  }

  protected _build(): void {
    const icon = this.getAttribute('icon') || 'plus';
    const label = this.getAttribute('label');
    const primary = this._isPrimary();
    this._icon = icon;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ink-fab' + (primary ? '' : ' ink-fab--secondary');
    btn.setAttribute('aria-label', label || icon);
    btn.innerHTML = iconSvg(icon, 24);
    this._btn = btn;
    this.replaceChildren(btn);
  }
}
define('e-float-button', EFloatButton);

/**
 * @summary Cluster of floating action buttons rendered from `<e-fab-item>` children.
 * @since v1.0.1
 *
 * @attr {'horizontal'|'vertical'} [orientation='vertical'] - Stacking direction.
 * @fires {CustomEvent<{index: number, value: string}>} e-select - Fired when a group action is activated.
 *
 * @example
 * <e-float-button-group orientation="horizontal">
 *   <e-fab-item icon="plus" label="Add"></e-fab-item>
 *   <e-fab-item icon="trash" label="Delete"></e-fab-item>
 * </e-float-button-group>
 */
export class EFloatButtonGroup extends BuildOnce {
  static readonly observedAttributes = ['orientation'];

  private _group: HTMLElement | null = null;

  attributeChangedCallback() {
    if (!this._wired) return;
    const horiz = this.getAttribute('orientation') === 'horizontal';
    this._group!.classList.toggle('ink-fab-group--horizontal', horiz);
  }

  protected override _connected(): void {
    // The items are read from the light DOM, so they have to stay watched:
    // reading them once at connect froze the group, and a host adding an
    // action later had to re-mount the whole element to see it.
    observeItems(this, this._sync, {
      attributeFilter: ['icon', 'label', 'value'],
      isOutput: (n) => this._group?.contains(n) ?? false,
    });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  /** Authored items, excluding anything inside the rendered group. */
  private _items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-fab-item')].filter(
      (item) => !this._group?.contains(item),
    );
  }

  private readonly _sync = (): void => {
    const group = this._group;
    if (!group) return;
    const items = this._items();
    const buttons = [...group.querySelectorAll<HTMLButtonElement>('button')];

    while (buttons.length > items.length) buttons.pop()!.remove();

    items.forEach((item, index) => {
      if (item.style.display !== 'none') item.style.display = 'none';
      const icon = item.getAttribute('icon') || 'plus';
      const label = item.getAttribute('label');
      const value = item.getAttribute('value') || label || '';
      let btn = buttons[index];
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        group.appendChild(btn);
      }
      patchAttr(btn, 'aria-label', label || icon);
      patchAttr(btn, 'data-index', String(index));
      patchAttr(btn, 'data-value', value);
      if (btn.dataset['icon'] !== icon) {
        btn.dataset['icon'] = icon;
        btn.innerHTML = iconSvg(icon, 22);
      }
    });
  };

  protected _build(): void {
    const horiz = this.getAttribute('orientation') === 'horizontal';

    const group = document.createElement('div');
    group.className = 'ink-fab-group' + (horiz ? ' ink-fab-group--horizontal' : '');

    this._group = group;
    this.appendChild(group);
    this._sync();
    group.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button[data-index]');
      if (!button) return;
      this.dispatchEvent(
        new CustomEvent('e-select', {
          detail: { index: Number(button.dataset['index']), value: button.dataset['value'] ?? '' },
          bubbles: true,
        }),
      );
    });
  }
}
define('e-float-button-group', EFloatButtonGroup);

/**
 * @summary Single action entry inside an `<e-float-button-group>`.
 * @since v1.0.1
 *
 * Acts as a data carrier; the parent renders the actual button.
 *
 * @attr {string} [icon='plus'] - Icon name.
 * @attr {string} [label] - Accessible label.
 * @attr {string} [value] - Value emitted by the parent group's `e-select` event.
 *
 * @example
 * <e-fab-item icon="plus" label="Add"></e-fab-item>
 */
export class EFabItem extends EpaperElement {}
define('e-fab-item', EFabItem);
