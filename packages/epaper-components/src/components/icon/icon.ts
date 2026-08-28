import { define, EpaperElement, numAttr } from '../../core/dom';
import { hasIcon, iconSvg } from '../../core/icons';

/**
 * @summary Inline SVG icon resolved by name from the built-in icon set.
 * @since v1.0.1
 *
 * @attr {string} name - Icon identifier. Must be an own key of the `ICONS` registry; anything else (including inherited `Object.prototype` names such as `toString`) renders nothing.
 * @attr {number} [size=20] - Pixel size (width and height). Fractions are kept; values below 1 are clamped to 1.
 * @attr {string} [label] - Accessible label. Without a label the icon is treated as decorative.
 *
 * @example
 * <e-icon name="plus" size="24" label="Add"></e-icon>
 */
export class EIcon extends EpaperElement {
  static readonly observedAttributes = ['name', 'size', 'label'];

  connectedCallback() {
    this._render();
  }
  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  private _render(): void {
    const name = this.getAttribute('name');
    const size = Math.max(1, numAttr(this, 'size', 20));
    const label = this.getAttribute('label');
    if (!name || !hasIcon(name)) {
      this.innerHTML = '';
      this.style.display = '';
      this.style.lineHeight = '';
      return;
    }
    this.innerHTML = iconSvg(name, size, label);
    this.style.display = 'inline-flex';
    this.style.lineHeight = '0';
  }
}

define('e-icon', EIcon);
