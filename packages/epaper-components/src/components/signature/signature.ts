import { boolAttr, define, intAttr, patchAttr, patchText, randId } from '../../core/dom';
import { BaseFormControl } from '../../core/base-form-control';
import { label as i18nLabel, t } from '../../core/i18n';

/** `''` for a nullish assignment — a `set` accessor cannot take a default. */
const nonNull = (value: string): string => value ?? '';

/** Decode a `data:image/png;base64,...` URL into the bytes of a PNG file. */
function dataUrlToFile(dataUrl: string, name: string): File | null {
  const comma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || comma === -1) return null;
  try {
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], name, { type: 'image/png' });
  } catch {
    return null;
  }
}

/**
 * @summary Handwritten signature captured on a canvas and submitted as a PNG file.
 * @since v1.3.0
 *
 * Form-associated: the drawn signature is submitted as a `File`, so a
 * `<form>` posts it as `multipart/form-data` exactly like an `<input
 * type="file">` would, and `formStateRestoreCallback` puts a restored file
 * back on the canvas.
 *
 * The pad draws pure black on pure white with a square-capped stroke — an
 * anti-aliased pen would dither into grey on the next partial refresh — and
 * the whole capture is one repaint of one element, not of the page.
 *
 * @attr {number} [width=480] - Canvas backing width in pixels.
 * @attr {number} [height=180] - Canvas backing height in pixels.
 * @attr {number} [pen-width=3] - Stroke width in canvas pixels.
 * @attr {string} [label] - Label rendered above the pad.
 * @attr {string} [hint] - Helper text rendered below the pad.
 * @attr {string} [clear-label] - Text of the clear button. Defaults to the string table's `clear`.
 * @attr {string} [fallback-text] - Shown instead of the pad when the browser has no 2D canvas. Defaults to the string table's `signatureUnavailable`.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [readonly] - Shows the current signature without accepting input.
 * @attr {boolean} [disabled] - Disables interaction. Presence alone disables.
 * @attr {boolean} [required] - Requires a signature before the form validates.
 * @attr {string} [required-message] - Message reported when `required` is not satisfied.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when a stroke ends or the pad is cleared. `value` is a PNG data URL, or `''` when empty.
 *
 * @example
 * <e-signature name="signature" label="Sign here" required></e-signature>
 */
export class ESignature extends BaseFormControl {
  static readonly observedAttributes = [
    'width',
    'height',
    'pen-width',
    'label',
    'hint',
    'clear-label',
    'fallback-text',
    'readonly',
    'disabled',
    'required',
    'required-message',
  ];

  private _wired = false;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _labelEl: HTMLElement | null = null;
  private _hintEl: HTMLElement | null = null;
  private _clearBtn: HTMLButtonElement | null = null;
  private _fallback: HTMLElement | null = null;
  private _drawing = false;
  private _dirty = false;
  private _restored: File | null = null;
  private _restoredUrl = '';

  disconnectedCallback() {
    // A BFCache-restored file holds a blob URL alive for the page's whole
    // lifetime otherwise — nothing else revokes it once the element is gone.
    this._dropRestored();
  }

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const root = document.createElement('div');
    root.className = 'ink-signature';

    const labelEl = document.createElement('div');
    labelEl.className = 'ink-label';
    const pad = document.createElement('div');
    pad.className = 'ink-signature__pad';
    const canvas = document.createElement('canvas');
    canvas.className = 'ink-signature__canvas';
    canvas.id = this.id ? `${this.id}-canvas` : randId('e-sig');
    const baseline = document.createElement('span');
    baseline.className = 'ink-signature__baseline';
    baseline.setAttribute('aria-hidden', 'true');
    const fallback = document.createElement('p');
    fallback.className = 'ink-signature__fallback';
    pad.append(canvas, baseline, fallback);

    const actions = document.createElement('div');
    actions.className = 'ink-signature__actions';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'ink-btn';
    actions.appendChild(clearBtn);
    const hintEl = document.createElement('div');
    hintEl.className = 'ink-hint';

    root.append(labelEl, pad, actions, hintEl);
    this._labelEl = labelEl;
    this._canvas = canvas;
    this._clearBtn = clearBtn;
    this._hintEl = hintEl;
    this._fallback = fallback;
    this.replaceChildren(root);

    this._ctx = canvas.getContext('2d');
    this._syncCanvas();
    this._syncTexts();
    this._paintSurface();
    this._syncValidity();

    // Pointer listeners live on the canvas, so they are collected with the
    // element; pointer capture keeps a stroke alive outside its bounds
    // without a document-level listener.
    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerUp);
    clearBtn.addEventListener('click', () => this.clear());
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    if (name === 'width' || name === 'height') {
      this._syncCanvas();
      this._paintSurface();
      // Resizing the backing store wipes it — the held value goes with it.
      if (this._dirty) this._setValue('', false);
      return;
    }
    if (name === 'pen-width') {
      // Re-applies ctx.lineWidth only — no resize, so the drawn strokes stay.
      this._paintSurface();
      return;
    }
    if (name === 'label' || name === 'hint' || name === 'clear-label' || name === 'fallback-text') {
      this._syncTexts();
      return;
    }
    this._syncEnabled();
    this._syncValidity();
  }

  override get value(): string {
    return this._value;
  }
  override set value(v: string) {
    // A setter parameter cannot carry a default, so the nullish guard reads
    // the value through a helper rather than re-assigning the parameter.
    const next = nonNull(v);
    // `formStateRestoreCallback` assigns the object URL `parseFile` just
    // created, so only a *different* value invalidates the restored file.
    if (next !== this._restoredUrl) this._dropRestored();
    if (!next) {
      this._clearSurface();
      this._setValue('', false);
      return;
    }
    this._value = next;
    this._dirty = true;
    this.internals.setFormValue(this.serialize(next));
    this._syncValidity();
    this._drawImage(next);
  }

  /** Wipe the pad and clear the value. Fires `e-change` when something was drawn. */
  clear(): void {
    const had = this._dirty;
    this._dropRestored();
    this._clearSurface();
    this._setValue('', had);
  }

  /** True while the pad holds a signature. */
  get empty(): boolean {
    return !this._dirty;
  }

  protected serialize(v: string): File | null {
    if (!v) return null;
    const fileName = `${this.getAttribute('name') || 'signature'}.png`;
    // A value restored from a File is not a data URL — hand back the file the
    // browser gave us rather than trying to re-encode an object URL.
    if (this._restored && v === this._restoredUrl) return this._restored;
    return dataUrlToFile(v, fileName);
  }

  protected parse(s: string): string {
    return s;
  }

  protected override parseFile(file: File): string {
    this._dropRestored();
    this._restored = file;
    this._restoredUrl = URL.createObjectURL(file);
    return this._restoredUrl;
  }

  /** Release the restored file and the object URL that stood in for it. */
  private _dropRestored(): void {
    if (this._restoredUrl) URL.revokeObjectURL(this._restoredUrl);
    this._restored = null;
    this._restoredUrl = '';
  }

  protected override resetValue(): void {
    this.clear();
  }

  protected override formDisabledChanged(): void {
    this._syncEnabled();
  }

  private _interactive(): boolean {
    return (
      !!this._ctx &&
      !boolAttr(this, 'readonly') &&
      !this.hasAttribute('disabled') &&
      !this._formDisabled
    );
  }

  private readonly _onPointerDown = (e: PointerEvent): void => {
    if (!this._interactive() || !this._canvas) return;
    e.preventDefault();
    this._drawing = true;
    this._canvas.setPointerCapture(e.pointerId);
    const { x, y } = this._point(e);
    this._ctx!.beginPath();
    this._ctx!.moveTo(x, y);
    // A tap with no movement still leaves a mark, as a pen would.
    this._ctx!.lineTo(x, y);
    this._ctx!.stroke();
    this._dirty = true;
  };

  private readonly _onPointerMove = (e: PointerEvent): void => {
    if (!this._drawing || !this._ctx) return;
    e.preventDefault();
    const { x, y } = this._point(e);
    this._ctx.lineTo(x, y);
    this._ctx.stroke();
  };

  private readonly _onPointerUp = (e: PointerEvent): void => {
    if (!this._drawing) return;
    this._drawing = false;
    if (this._canvas?.hasPointerCapture(e.pointerId)) {
      this._canvas.releasePointerCapture(e.pointerId);
    }
    this._setValue(this._readCanvas(), true);
  };

  private _point(e: PointerEvent): { x: number; y: number } {
    const canvas = this._canvas!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  private _readCanvas(): string {
    if (!this._canvas || !this._dirty) return '';
    try {
      return this._canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  private _setValue(next: string, notify: boolean): void {
    this._value = next;
    if (!next) this._dirty = false;
    this.internals.setFormValue(this.serialize(next));
    this._syncValidity();
    if (notify) {
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: next }, bubbles: true }));
    }
  }

  private _drawImage(source: string): void {
    if (!this._ctx || !this._canvas) return;
    const image = new Image();
    image.onload = () => {
      this._clearSurface();
      this._ctx!.drawImage(image, 0, 0, this._canvas!.width, this._canvas!.height);
      this._dirty = true;
    };
    image.src = source;
  }

  private _clearSurface(): void {
    if (!this._ctx || !this._canvas) return;
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._dirty = false;
  }

  private _syncCanvas(): void {
    if (!this._canvas) return;
    this._canvas.width = Math.max(64, Math.min(2048, intAttr(this, 'width', 480)));
    this._canvas.height = Math.max(48, Math.min(1024, intAttr(this, 'height', 180)));
    this._paintSurface();
  }

  /** Re-apply the stroke settings; a resize resets the whole 2D context. */
  private _paintSurface(): void {
    if (!this._ctx) return;
    this._ctx.lineWidth = Math.max(1, Math.min(24, intAttr(this, 'pen-width', 3)));
    this._ctx.lineCap = 'round';
    this._ctx.lineJoin = 'round';
    this._ctx.strokeStyle = '#000';
  }

  // Same two wired entry points as the rest of the sync helpers, so the refs
  // this touches are always in place.
  private _syncTexts(): void {
    const label = this.getAttribute('label') || '';
    patchText(this._labelEl!, label);
    patchAttr(this._labelEl!, 'hidden', label ? null : '');
    const hint = this.getAttribute('hint') || '';
    patchText(this._hintEl!, hint);
    patchAttr(this._hintEl!, 'hidden', hint ? null : '');
    patchText(this._clearBtn!, i18nLabel(this, 'clear-label', 'clear'));
    patchAttr(this._canvas!, 'role', 'img');
    patchAttr(
      this._canvas!,
      'aria-label',
      label || this.getAttribute('aria-label') || t(this, 'signaturePad'),
    );

    const fallback = i18nLabel(this, 'fallback-text', 'signatureUnavailable');
    patchText(this._fallback!, fallback);
    const usable = !!this._ctx;
    patchAttr(this._fallback!, 'hidden', usable ? '' : null);
    patchAttr(this._canvas!, 'hidden', usable ? null : '');
    this._syncEnabled();
  }

  private _syncEnabled(): void {
    if (!this._clearBtn || !this._canvas) return;
    const interactive = this._interactive();
    this._clearBtn.disabled = !interactive;
    // Disabled gets the same hatch every other control carries (components.css's
    // aria-disabled hatch list); readonly still shows a signature, so it gets a
    // distinct border cue instead of hatching over the drawn ink.
    patchAttr(
      this._canvas,
      'aria-disabled',
      this.hasAttribute('disabled') || this._formDisabled ? 'true' : null,
    );
    patchAttr(this, 'data-readonly', boolAttr(this, 'readonly') ? 'true' : null);
  }

  private _syncValidity(): void {
    this.applyRequiredValidity(!!this._value, this._canvas ?? undefined, t(this, 'required'));
  }
}

define('e-signature', ESignature);
