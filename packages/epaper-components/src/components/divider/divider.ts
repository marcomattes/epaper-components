import { define, EpaperElement, patchAttr, patchText } from '../../core/dom';

/**
 * @summary Visual separator with optional label and orientation.
 * @since v1.0.1
 *
 * @attr {'solid'|'dashed'} [variant='solid'] - Line style.
 * @attr {'horizontal'|'vertical'} [orientation='horizontal'] - Layout direction.
 * @attr {string} [label] - Inline label rendered centered on the line (horizontal only).
 *
 * @example
 * <e-divider variant="dashed" label="OR"></e-divider>
 */
export class EDivider extends EpaperElement {
  static readonly observedAttributes = ['variant', 'orientation', 'label'];

  private _wired = false;
  private _inner: Element | null = null;
  private _mode: 'vertical' | 'labeled' | 'plain' | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this._build();
  }

  attributeChangedCallback() {
    if (this._wired) this._update();
  }

  private _getMode(): 'vertical' | 'labeled' | 'plain' {
    if ((this.getAttribute('orientation') ?? 'horizontal') === 'vertical') return 'vertical';
    if (this.getAttribute('label') != null) return 'labeled';
    return 'plain';
  }

  private _build(): void {
    const mode = this._getMode();
    this._mode = mode;
    const dashed = (this.getAttribute('variant') ?? 'solid') === 'dashed';
    const label = this.getAttribute('label') ?? '';

    if (mode === 'vertical') {
      const el = document.createElement('span');
      el.className = 'ink-divider--vertical' + (dashed ? ' ink-divider--dashed' : '');
      el.setAttribute('aria-hidden', 'true');
      this._inner = el;
    } else if (mode === 'labeled') {
      const el = document.createElement('div');
      el.className = 'ink-divider--labeled';
      el.setAttribute('role', 'separator');
      el.setAttribute('aria-label', label);
      el.textContent = label;
      this._inner = el;
    } else {
      const el = document.createElement('hr');
      el.className = 'ink-divider' + (dashed ? ' ink-divider--dashed' : '');
      this._inner = el;
    }
    this.replaceChildren(this._inner);
  }

  private _update(): void {
    const mode = this._getMode();
    if (mode !== this._mode) {
      // Orientation or label presence changed — element type must change.
      this._build();
      return;
    }

    const dashed = (this.getAttribute('variant') ?? 'solid') === 'dashed';
    const label = this.getAttribute('label') ?? '';
    const el = this._inner!;

    if (mode === 'vertical' || mode === 'plain') {
      el.classList.toggle('ink-divider--dashed', dashed);
    } else {
      patchText(el, label);
      patchAttr(el, 'aria-label', label);
    }
  }
}

define('e-divider', EDivider);
