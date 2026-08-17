import { define, numAttr } from '../core/dom';
import { ICONS, iconSvg } from '../core/icons';

/**
 * @summary Inline SVG icon resolved by name from the built-in icon set.
 * @since v1.0.1
 *
 * @attr {string} name - Icon identifier (must exist in the `ICONS` registry).
 * @attr {number} [size=20] - Pixel size (width and height).
 * @attr {string} [label] - Accessible label. Without a label the icon is treated as decorative.
 *
 * @example
 * <e-icon name="plus" size="24" label="Add"></e-icon>
 */
export class EIcon extends HTMLElement {
  static observedAttributes = ['name', 'size', 'label'];

  connectedCallback() {
    this._render();
  }
  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  private _render(): void {
    const name = this.getAttribute('name');
    const size = numAttr(this, 'size', 20);
    const label = this.getAttribute('label');
    if (!name || !(name in ICONS)) {
      this.innerHTML = '';
      return;
    }
    this.innerHTML = iconSvg(name, size, label);
    this.style.display = 'inline-flex';
    this.style.lineHeight = '0';
  }
}

define('e-icon', EIcon);
