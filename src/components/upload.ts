import { addCleanup, boolAttr, define, esc, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary Drop-zone file picker with live file list and per-file removal.
 * @since v1.0.1
 *
 * Form-associated: holds real `File` objects and submits them through
 * `ElementInternals.setFormValue`. In multi-file mode each file is appended
 * to a `FormData` under `name`; in single-file mode the lone `File` is
 * submitted directly.
 *
 * @attr {string} [accept] - Comma-separated MIME types or extensions forwarded to the underlying file input.
 * @attr {boolean} [multiple] - Accept more than one file. When absent, picking a new file replaces the prior one; removing the attribute while several files are held keeps the first and fires `e-change`.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {string} [max-size] - Maximum size per file in bytes. Files exceeding the limit are rejected and the control is marked invalid.
 * @attr {string} [max-files] - Maximum number of files allowed in multi-file mode.
 * @attr {boolean} [required] - Requires at least one selected file.
 * @attr {string} [required-message] - Message reported when no required file is selected.
 *
 * @fires {CustomEvent<{files: File[]}>} e-change - Fired whenever the selected file list changes (add, remove, or truncation by `multiple`). `detail.files` is a snapshot, not the live list.
 *
 * @example
 * <e-upload accept=".pdf,.png" multiple name="docs"></e-upload>
 */
export class EUpload extends BaseFormControl<File[]> {
  static readonly observedAttributes = [
    'accept',
    'multiple',
    'max-size',
    'max-files',
    'required',
    'required-message',
  ];

  private _wired = false;
  private _hint: HTMLElement | null = null;
  private _input: HTMLInputElement | null = null;
  private _list: HTMLElement | null = null;
  private _drop: HTMLElement | null = null;
  protected override _value: File[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const accept = this.getAttribute('accept') || '';
      const multiple = boolAttr(this, 'multiple');
      this.innerHTML = `
      <div>
        <div class="ink-upload" role="button" tabindex="0" aria-label="Choose files">
          ${iconSvg('upload', 28)}
          <div class="ink-upload__title">Drop files here or click to upload</div>
          <div class="ink-upload__hint">${accept ? `ACCEPTS · ${esc(accept.toUpperCase())}` : 'ANY FILE TYPE'}</div>
          <input type="file" ${accept ? `accept="${esc(accept)}"` : ''} ${multiple ? 'multiple' : ''} style="display:none"/>
        </div>
        <ul class="ink-upload__list" hidden></ul>
      </div>`;
      this._drop = this.querySelector<HTMLElement>('.ink-upload');
      this._input = this.querySelector<HTMLInputElement>('input[type="file"]');
      this._list = this.querySelector<HTMLElement>('.ink-upload__list');
      this._hint = this.querySelector<HTMLElement>('.ink-upload__hint');
      this._rebuildList();
    }
    this._syncFormValue();
    this._validate(this._value);
    this._drop?.addEventListener('click', this._onDropClick);
    this._drop?.addEventListener('keydown', this._onDropKeydown);
    this._drop?.addEventListener('dragover', this._onDragOver);
    this._drop?.addEventListener('dragleave', this._onDragLeave);
    this._drop?.addEventListener('drop', this._onDrop);
    this._input?.addEventListener('change', this._onInputChange);
    this._list?.addEventListener('click', this._onListClick);
    addCleanup(this, () => {
      this._drop?.removeEventListener('click', this._onDropClick);
      this._drop?.removeEventListener('keydown', this._onDropKeydown);
      this._drop?.removeEventListener('dragover', this._onDragOver);
      this._drop?.removeEventListener('dragleave', this._onDragLeave);
      this._drop?.removeEventListener('drop', this._onDrop);
      this._input?.removeEventListener('change', this._onInputChange);
      this._list?.removeEventListener('click', this._onListClick);
    });
  }

  disconnectedCallback() {
    runCleanups(this);
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
      else {
        this._input.removeAttribute('multiple');
        // Dropping to single-file mode discards the surplus files, which is a
        // value change like any other and is announced as one.
        if (this._value.length > 1) {
          this._value = this._value.slice(0, 1);
          this._rebuildList();
          this._syncFormValue();
          this._emitChange();
        }
      }
    } else {
      this._validate(this._value);
    }
  }

  protected override resetValue(): void {
    this._value = [];
    if (this._input) this._input.value = '';
    this._rebuildList();
    this._syncFormValue();
    this._validate(this._value);
  }

  /** A copy of the held files: mutating it never reaches the rendered list. */
  override get value(): File[] {
    return [...this._value];
  }
  override set value(v: File[]) {
    const incoming = Array.isArray(v) ? [...v] : [];
    // Single-file mode keeps at most one file, so only that one is validated.
    const next = boolAttr(this, 'multiple') ? incoming : incoming.slice(0, 1);
    if (!this._validate(next)) return;
    this._value = next;
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
          this._drop ?? this._input ?? undefined,
        );
        return false;
      }
    }
    if (Number.isFinite(maxFiles) && maxFiles > 0 && files.length > maxFiles) {
      this.internals.setValidity(
        { customError: true },
        `At most ${maxFiles} file(s) allowed.`,
        this._drop ?? this._input ?? undefined,
      );
      return false;
    }
    this.applyRequiredValidity(
      files.length > 0,
      this._drop ?? this._input ?? undefined,
      'Please select a file.',
    );
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

  /** Emits `e-change` with a snapshot of the held files. */
  private _emitChange(): void {
    this.dispatchEvent(
      new CustomEvent('e-change', { detail: { files: [...this._value] }, bubbles: true }),
    );
  }

  private readonly _onDropClick = (e: Event): void => {
    if (e.target !== this._input) this._input?.click();
  };

  private readonly _onDropKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    this._input?.click();
  };

  private readonly _onDragOver = (e: DragEvent): void => {
    e.preventDefault();
    if (this._drop?.dataset['drag'] !== 'true' && this._drop) this._drop.dataset['drag'] = 'true';
  };

  private readonly _onDragLeave = (): void => {
    if (this._drop) this._drop.dataset['drag'] = 'false';
  };

  private readonly _onDrop = (e: DragEvent): void => {
    e.preventDefault();
    if (this._drop) this._drop.dataset['drag'] = 'false';
    if (e.dataTransfer?.files) this._handleFiles(e.dataTransfer.files);
  };

  private readonly _onInputChange = (): void => {
    if (this._input?.files) this._handleFiles(this._input.files);
  };

  private readonly _onListClick = (e: Event): void => {
    const remove = (e.target as Element).closest<HTMLElement>('[data-remove]');
    if (!remove || !this._list?.contains(remove)) return;
    const index = Number(remove.dataset['remove']);
    this._value.splice(index, 1);
    remove.closest('li')?.remove();
    this._rebuildIndices();
    if (this._value.length === 0) this._list.hidden = true;
    this._syncFormValue();
    this._validate(this._value);
    this._emitChange();
  };
}

define('e-upload', EUpload);
