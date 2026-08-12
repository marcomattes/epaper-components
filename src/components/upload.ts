import { boolAttr, define, esc } from '../core/dom';
import { iconSvg } from '../core/icons';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary Drop-zone file picker with live file list and per-file removal.
 *
 * Form-associated: holds real `File` objects and submits them through
 * `ElementInternals.setFormValue`. In multi-file mode each file is appended
 * to a `FormData` under `name`; in single-file mode the lone `File` is
 * submitted directly.
 *
 * @attr {string} [accept] - Comma-separated MIME types or extensions forwarded to the underlying file input.
 * @attr {boolean} [multiple] - Accept more than one file. When absent, picking a new file replaces the prior one.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {string} [max-size] - Maximum size per file in bytes. Files exceeding the limit are rejected and the control is marked invalid.
 * @attr {string} [max-files] - Maximum number of files allowed in multi-file mode.
 *
 * @fires {CustomEvent<{files: File[]}>} e-change - Fired whenever the selected file list changes (add or remove).
 *
 * @example
 * <e-upload accept=".pdf,.png" multiple name="docs"></e-upload>
 */
export class EUpload extends BaseFormControl<File[]> {
  static observedAttributes = ['accept', 'multiple'];

  private _wired = false;
  private _hint: HTMLElement | null = null;
  private _input: HTMLInputElement | null = null;
  private _list: HTMLElement | null = null;
  protected override _value: File[] = [];

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const accept = this.getAttribute('accept') || '';
    const multiple = boolAttr(this, 'multiple');
    this._value = [];
    this.innerHTML = `
      <div>
        <div class="ink-upload" tabindex="0">
          ${iconSvg('upload', 28)}
          <div class="ink-upload__title">Drop files here or click to upload</div>
          <div class="ink-upload__hint">${accept ? `ACCEPTS · ${esc(accept.toUpperCase())}` : 'ANY FILE TYPE'}</div>
          <input type="file" ${accept ? `accept="${esc(accept)}"` : ''} ${multiple ? 'multiple' : ''} style="display:none"/>
        </div>
        <ul class="ink-upload__list" hidden></ul>
      </div>`;
    const drop = this.querySelector<HTMLElement>('.ink-upload')!;
    const input = this.querySelector<HTMLInputElement>('input[type="file"]')!;
    const list = this.querySelector<HTMLElement>('.ink-upload__list')!;
    this._hint = this.querySelector<HTMLElement>('.ink-upload__hint');
    this._input = input;
    this._list = list;
    this._syncFormValue();

    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      // Only set once to avoid redundant mutation on every dragover tick.
      if (drop.dataset['drag'] !== 'true') drop.dataset['drag'] = 'true';
    });
    drop.addEventListener('dragleave', () => {
      drop.dataset['drag'] = 'false';
    });
    drop.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      drop.dataset['drag'] = 'false';
      if (e.dataTransfer?.files) this._handleFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) this._handleFiles(files);
    });
    list.addEventListener('click', (e) => {
      const rm = (e.target as Element).closest<HTMLElement>('[data-remove]');
      if (!rm) return;
      const idx = Number(rm.dataset['remove']);
      this._value.splice(idx, 1);
      rm.closest('li')!.remove();
      this._rebuildIndices();
      if (this._value.length === 0) list.hidden = true;
      this._syncFormValue();
      this._emitChange();
    });
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._input || !this._hint) return;
    if (name === 'accept') {
      const accept = v || '';
      if (accept) this._input.setAttribute('accept', accept);
      else this._input.removeAttribute('accept');
      this._hint.textContent = accept ? `ACCEPTS · ${accept.toUpperCase()}` : 'ANY FILE TYPE';
    } else if (name === 'multiple') {
      if (boolAttr(this, 'multiple')) this._input.setAttribute('multiple', '');
      else this._input.removeAttribute('multiple');
    }
  }

  override formResetCallback(): void {
    this._value = [];
    if (this._input) this._input.value = '';
    this._rebuildList();
    this._syncFormValue();
    this.internals.setValidity({});
  }

  override get value(): File[] {
    return this._value;
  }
  override set value(v: File[]) {
    this._value = Array.isArray(v) ? [...v] : [];
    this._rebuildList();
    this._syncFormValue();
  }

  protected serialize(v: File[]): FormData | File | null {
    const files = v ?? [];
    const name = this.getAttribute('name');
    const multiple = boolAttr(this, 'multiple');
    if (files.length === 0) return null;
    if (!multiple) return files[0] ?? null;
    if (!name) return null;
    const fd = new FormData();
    for (const f of files) fd.append(name, f, f.name);
    return fd;
  }

  /** `parse` is unused for File-valued controls; default-value cannot encode binaries. */
  protected parse(_s: string): File[] {
    return [];
  }

  protected override parseFormData(fd: FormData): File[] {
    const name = this.getAttribute('name');
    const out: File[] = [];
    if (!name) return out;
    for (const v of fd.getAll(name)) {
      if (v instanceof File) out.push(v);
    }
    return out;
  }

  protected override parseFile(file: File): File[] {
    return [file];
  }

  private _handleFiles(fl: FileList): void {
    const incoming = [...fl];
    const multiple = boolAttr(this, 'multiple');
    const next = multiple ? this._value.concat(incoming) : incoming.slice(0, 1);
    if (!this._validate(next)) return;

    if (!multiple) {
      // Single-file mode: replace entire list.
      this._value = next;
      this._rebuildList();
    } else {
      // Multi-file mode: append only the new files.
      const startIdx = this._value.length;
      this._value = next;
      this._list!.hidden = false;
      for (let i = startIdx; i < this._value.length; i++) {
        this._list!.appendChild(this._buildFileEl(this._value[i], i));
      }
    }

    this._syncFormValue();
    this._emitChange();
  }

  private _validate(files: File[]): boolean {
    const maxSize = Number(this.getAttribute('max-size'));
    const maxFiles = Number(this.getAttribute('max-files'));
    if (Number.isFinite(maxSize) && maxSize > 0) {
      const tooBig = files.find((f) => f.size > maxSize);
      if (tooBig) {
        this.internals.setValidity(
          { customError: true },
          `File "${tooBig.name}" exceeds maximum size of ${maxSize} bytes.`,
          this._input ?? undefined,
        );
        return false;
      }
    }
    if (Number.isFinite(maxFiles) && maxFiles > 0 && files.length > maxFiles) {
      this.internals.setValidity(
        { customError: true },
        `At most ${maxFiles} file(s) allowed.`,
        this._input ?? undefined,
      );
      return false;
    }
    this.internals.setValidity({});
    return true;
  }

  /** Full list rebuild — only called on reset or programmatic value assignment. */
  private _rebuildList(): void {
    if (!this._list) return;
    this._list.hidden = this._value.length === 0;
    this._list.replaceChildren();
    for (let i = 0; i < this._value.length; i++) {
      this._list.appendChild(this._buildFileEl(this._value[i], i));
    }
  }

  private _buildFileEl(f: File, idx: number): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'ink-upload__file';

    const docIcon = document.createElement('span');
    docIcon.innerHTML = iconSvg('doc', 16);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ink-upload__file-name';
    nameSpan.textContent = f.name;

    const sizeSpan = document.createElement('span');
    sizeSpan.textContent = `${Math.ceil((f.size || 0) / 1024)} KB`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ink-icon-btn';
    removeBtn.dataset['remove'] = String(idx);
    removeBtn.style.width = '24px';
    removeBtn.style.height = '24px';
    removeBtn.setAttribute('aria-label', 'Remove');
    removeBtn.innerHTML = iconSvg('close', 12);

    li.appendChild(docIcon);
    li.appendChild(nameSpan);
    li.appendChild(sizeSpan);
    li.appendChild(removeBtn);
    return li;
  }

  /** After a file is removed, update the remaining `data-remove` indices. */
  private _rebuildIndices(): void {
    let i = 0;
    for (const li of this._list!.children) {
      const btn = li.querySelector<HTMLElement>('[data-remove]');
      if (btn) btn.dataset['remove'] = String(i++);
    }
  }

  private _syncFormValue(): void {
    this.internals.setFormValue(this.serialize(this._value));
  }

  private _emitChange(): void {
    this.dispatchEvent(
      new CustomEvent('e-change', { detail: { files: this._value }, bubbles: true }),
    );
  }
}

define('e-upload', EUpload);
