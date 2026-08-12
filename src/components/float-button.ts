import { define, patchAttr } from '../core/dom';
import { iconSvg } from '../core/icons';

/**
 * @summary Standalone floating action button.
 *
 * @attr {string} [icon='plus'] - Icon name rendered inside the button.
 * @attr {string} [label] - Accessible label. Falls back to the icon name.
 * @attr {boolean} [primary=true] - Primary visual treatment. Set `primary="false"` for the secondary variant.
 *
 * @example
 * <e-float-button icon="plus" label="Add"></e-float-button>
 */
export class EFloatButton extends HTMLElement {
  static observedAttributes = ['icon', 'label', 'primary'];

  private _wired = false;
  private _btn: HTMLButtonElement | null = null;
  private _icon = '';

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this._build();
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    const icon = this.getAttribute('icon') || 'plus';
    const label = this.getAttribute('label');
    const primary = !this.hasAttribute('primary') ? true : this.getAttribute('primary') !== 'false';
    const btn = this._btn!;

    if (name === 'icon' && icon !== this._icon) {
      this._icon = icon;
      // Icon SVG swap is unavoidable; update only the button's content, not the host.
      btn.innerHTML = iconSvg(icon, 24);
      patchAttr(btn, 'aria-label', label || icon);
    } else if (name === 'label') {
      patchAttr(btn, 'aria-label', label || icon);
    } else if (name === 'primary') {
      btn.classList.toggle('ink-fab--secondary', !primary);
    }
  }

  private _build(): void {
    const icon = this.getAttribute('icon') || 'plus';
    const label = this.getAttribute('label');
    const primary = !this.hasAttribute('primary') ? true : this.getAttribute('primary') !== 'false';
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
export class EFloatButtonGroup extends HTMLElement {
  static observedAttributes = ['orientation'];

  private _wired = false;
  private _group: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this._build();
  }

  attributeChangedCallback() {
    if (!this._wired) return;
    const horiz = this.getAttribute('orientation') === 'horizontal';
    this._group!.classList.toggle('ink-fab-group--horizontal', horiz);
  }

  private _build(): void {
    const horiz = this.getAttribute('orientation') === 'horizontal';
    const items = [...this.querySelectorAll('e-fab-item')].map((it) => ({
      icon: it.getAttribute('icon') || 'plus',
      label: it.getAttribute('label'),
      value: it.getAttribute('value') || it.getAttribute('label') || '',
    }));

    const group = document.createElement('div');
    group.className = 'ink-fab-group' + (horiz ? ' ink-fab-group--horizontal' : '');
    for (const it of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', it.label || it.icon);
      btn.dataset['index'] = String(group.children.length);
      btn.dataset['value'] = it.value;
      btn.innerHTML = iconSvg(it.icon, 22);
      group.appendChild(btn);
    }

    this._group = group;
    this.appendChild(group);
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
export class EFabItem extends HTMLElement {}
define('e-fab-item', EFabItem);
