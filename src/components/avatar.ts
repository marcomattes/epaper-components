import {
  clampedNumAttr,
  define,
  intAttr,
  patchAttr,
  patchClassModifier,
  patchText,
} from '../core/dom';

/**
 * @summary User avatar with image or initials fallback.
 * @since v1.0.1
 *
 * @attr {string} [name='?'] - Display name; the first one or two initials are rendered when no image is supplied.
 * @attr {string} [src] - Image URL. When set, replaces the initials.
 * @attr {number} [size=40] - Pixel size of the avatar (width and height).
 * @attr {'square'|'circle'} [shape='square'] - Outline shape.
 *
 * @example
 * <e-avatar name="Ada Lovelace" size="48" shape="circle"></e-avatar>
 */
export class EAvatar extends HTMLElement {
  static observedAttributes = ['name', 'src', 'size', 'shape'];

  private _wrap: HTMLElement | null = null;
  private _failedSrc: string | null = null;

  connectedCallback() {
    if (!this._wrap) {
      const wrap = document.createElement('span');
      wrap.classList.add('ink-avatar');
      wrap.setAttribute('role', 'img');
      this.appendChild(wrap);
      this._wrap = wrap;
    }
    this._render();
  }

  attributeChangedCallback(name: string) {
    if (name === 'src') this._failedSrc = null;
    if (this._wrap) this._render();
  }

  private _render(): void {
    const wrap = this._wrap!;
    const name = this.getAttribute('name') || '?';
    const src = this.getAttribute('src');
    const size = clampedNumAttr(this, 'size', 40, 8, 512);
    const shape = this.getAttribute('shape') === 'circle' ? 'circle' : null;
    patchClassModifier(wrap, 'ink-avatar--', shape);
    patchAttr(wrap, 'aria-label', name);
    const px = `${size}px`;
    const fs = `${Math.max(11, Math.round(size * 0.4))}px`;
    if (wrap.style.width !== px) wrap.style.width = px;
    if (wrap.style.height !== px) wrap.style.height = px;
    if (wrap.style.fontSize !== fs) wrap.style.fontSize = fs;
    if (src && src !== this._failedSrc) {
      let img = wrap.querySelector<HTMLImageElement>('img');
      if (!img) {
        wrap.textContent = '';
        img = document.createElement('img');
        img.alt = '';
        img.addEventListener('error', this._onImageError);
        wrap.appendChild(img);
      }
      patchAttr(img, 'src', src);
    } else {
      const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0].toUpperCase())
        .join('');
      const img = wrap.querySelector('img');
      if (img) wrap.textContent = '';
      patchText(wrap, initials);
    }
  }

  private _onImageError = (): void => {
    this._failedSrc = this.getAttribute('src');
    this._render();
  };
}
define('e-avatar', EAvatar);

/**
 * @summary Stack of avatars with overflow indicator.
 *
 * Reads avatar data from child `<e-avatar-item>` elements at connect time.
 *
 * @attr {number} [max=4] - Maximum visible avatars; remainder collapses into a `+N` chip.
 * @attr {number} [size=36] - Pixel size applied to each avatar.
 *
 * @example
 * <e-avatar-group max="3" size="32">
 *   <e-avatar-item name="Ada"></e-avatar-item>
 *   <e-avatar-item name="Linus"></e-avatar-item>
 * </e-avatar-group>
 */
export class EAvatarGroup extends HTMLElement {
  static observedAttributes = ['max', 'size'];

  private _wired = false;
  private _avatarData: Array<{ name: string; src: string | null }> = [];
  private _group: HTMLElement | null = null;
  private _avatarEls: HTMLElement[] = [];
  private _overflowEl: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this._avatarData = [...this.querySelectorAll('e-avatar-item')].map((a) => ({
      name: a.getAttribute('name') ?? '',
      src: a.getAttribute('src'),
    }));
    this._build();
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    if (name === 'size') this._patchSize();
    else if (name === 'max') this._patchMax();
  }

  private _build(): void {
    const max = Math.max(0, Math.min(this._avatarData.length, intAttr(this, 'max', 4)));
    const size = clampedNumAttr(this, 'size', 36, 8, 512);
    const overflow = this._avatarData.length - max;
    const visible = this._avatarData.slice(0, max);

    const group = document.createElement('div');
    group.className = 'ink-avatar-group';
    this._group = group;
    this._avatarEls = [];
    this._overflowEl = null;

    for (const a of visible) {
      const el = this._makeAvatar(a, size);
      group.appendChild(el);
      this._avatarEls.push(el);
    }

    if (overflow > 0) {
      const chip = this._makeOverflow(overflow, size);
      group.appendChild(chip);
      this._overflowEl = chip;
    }

    this.appendChild(group);
  }

  private _patchSize(): void {
    const size = clampedNumAttr(this, 'size', 36, 8, 512);
    for (const el of this._avatarEls) {
      el.setAttribute('size', String(size));
    }
    if (this._overflowEl) {
      this._overflowEl.style.width = `${size}px`;
      this._overflowEl.style.height = `${size}px`;
    }
  }

  private _patchMax(): void {
    const max = Math.max(0, Math.min(this._avatarData.length, intAttr(this, 'max', 4)));
    const size = clampedNumAttr(this, 'size', 36, 8, 512);
    const group = this._group!;

    // Remove excess avatars from the end.
    while (this._avatarEls.length > max) {
      group.removeChild(this._avatarEls.pop()!);
    }
    // Add missing avatars (insert before overflow chip).
    while (this._avatarEls.length < Math.min(max, this._avatarData.length)) {
      const a = this._avatarData[this._avatarEls.length];
      const el = this._makeAvatar(a, size);
      group.insertBefore(el, this._overflowEl ?? null);
      this._avatarEls.push(el);
    }

    const overflow = this._avatarData.length - max;
    if (overflow > 0) {
      if (!this._overflowEl) {
        const chip = this._makeOverflow(overflow, size);
        group.appendChild(chip);
        this._overflowEl = chip;
      } else {
        patchText(this._overflowEl, `+${overflow}`);
      }
    } else if (this._overflowEl) {
      group.removeChild(this._overflowEl);
      this._overflowEl = null;
    }
  }

  private _makeAvatar(a: { name: string; src: string | null }, size: number): HTMLElement {
    const el = document.createElement('e-avatar');
    el.setAttribute('name', a.name);
    if (a.src) el.setAttribute('src', a.src);
    el.setAttribute('shape', 'circle');
    el.setAttribute('size', String(size));
    return el;
  }

  private _makeOverflow(count: number, size: number): HTMLElement {
    const chip = document.createElement('span');
    chip.className = 'ink-avatar-group__overflow';
    chip.style.width = `${size}px`;
    chip.style.height = `${size}px`;
    chip.textContent = `+${count}`;
    return chip;
  }
}
define('e-avatar-group', EAvatarGroup);

/**
 * @summary Single avatar entry inside an `<e-avatar-group>`.
 *
 * Acts as a data carrier; the parent renders the actual avatar.
 *
 * @attr {string} name - Display name used for initials fallback.
 * @attr {string} [src] - Optional image URL.
 *
 * @example
 * <e-avatar-item name="Ada Lovelace"></e-avatar-item>
 */
export class EAvatarItem extends HTMLElement {}
define('e-avatar-item', EAvatarItem);
