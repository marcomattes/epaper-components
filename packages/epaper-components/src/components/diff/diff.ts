import { define, patchAttr, patchText } from '../../core/dom';

/**
 * @summary Side-by-side previous and current values with a non-color change cue.
 * @since v1.1.0
 *
 * Both states remain visible so a reader never has to infer meaning from
 * color, opacity or transient animation.
 *
 * @attr {string} [before] - Previous value.
 * @attr {string} [after] - Current value.
 * @attr {string} [label] - Accessible comparison label.
 * @attr {string} [before-label='Previous'] - Heading for the previous value.
 * @attr {string} [after-label='Current'] - Heading for the current value.
 * @attr {'inline'|'stacked'} [layout='inline'] - Comparison layout.
 * @attr {string} [empty-text='—'] - Placeholder for a missing value.
 *
 * @example
 * <e-diff label="Firmware" before="1.8.4" after="1.9.0"></e-diff>
 */
export class EDiff extends HTMLElement {
  static readonly observedAttributes = [
    'before',
    'after',
    'label',
    'before-label',
    'after-label',
    'layout',
    'empty-text',
  ];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _beforeLabel: HTMLElement | null = null;
  private _beforeValue: HTMLElement | null = null;
  private _afterLabel: HTMLElement | null = null;
  private _afterValue: HTMLElement | null = null;
  private _cue: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this.innerHTML = `<div class="ink-diff">
      <div class="ink-diff__state ink-diff__state--before">
        <div class="ink-diff__label"></div>
        <div class="ink-diff__value"></div>
      </div>
      <div class="ink-diff__cue"></div>
      <div class="ink-diff__state ink-diff__state--after">
        <div class="ink-diff__label"></div>
        <div class="ink-diff__value"></div>
      </div>
    </div>`;
    this._root = this.firstElementChild as HTMLElement;
    const states = this._root.querySelectorAll<HTMLElement>('.ink-diff__state');
    this._beforeLabel = states[0]?.querySelector<HTMLElement>('.ink-diff__label') ?? null;
    this._beforeValue = states[0]?.querySelector<HTMLElement>('.ink-diff__value') ?? null;
    this._afterLabel = states[1]?.querySelector<HTMLElement>('.ink-diff__label') ?? null;
    this._afterValue = states[1]?.querySelector<HTMLElement>('.ink-diff__value') ?? null;
    this._cue = this._root.querySelector('.ink-diff__cue');
    this._patch();
  }

  attributeChangedCallback() {
    if (this._wired) this._patch();
  }

  private _patch(): void {
    if (
      !this._root ||
      !this._beforeLabel ||
      !this._beforeValue ||
      !this._afterLabel ||
      !this._afterValue ||
      !this._cue
    )
      return;
    const before = this.getAttribute('before') || '';
    const after = this.getAttribute('after') || '';
    const empty = this.getAttribute('empty-text') || '—';
    const label = this.getAttribute('label') || 'Value comparison';
    const changed = before !== after;
    const layout = this.getAttribute('layout') === 'stacked' ? 'stacked' : 'inline';

    patchAttr(this, 'role', 'group');
    patchAttr(this, 'aria-label', `${label}: ${changed ? 'changed' : 'unchanged'}`);
    patchAttr(this._root, 'data-changed', changed ? 'true' : 'false');
    patchAttr(this._root, 'data-layout', layout);
    patchText(this._beforeLabel, this.getAttribute('before-label') || 'Previous');
    patchText(this._beforeValue, before || empty);
    patchText(this._afterLabel, this.getAttribute('after-label') || 'Current');
    patchText(this._afterValue, after || empty);
    patchText(this._cue, changed ? '→ Changed' : '= Unchanged');
  }
}

define('e-diff', EDiff);
