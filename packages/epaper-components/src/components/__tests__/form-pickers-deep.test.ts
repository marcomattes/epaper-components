// Behavioural tests for the picker/form-control family.
//
// Each component is driven across its whole surface: attributes set before
// *and* mutated after mount, popup open/close, roving focus, form
// participation and the malformed-input degradation paths.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

import { ICONS } from '../../core/icons';
import type { ECascader } from '../cascader';
import type { EDatePicker } from '../date-picker';
import type { EInputNumber } from '../input-number';
import type { ESelect } from '../select';
import type { ETimePicker } from '../time-picker';
import type { ETree } from '../tree';
import type { ETreeSelect } from '../tree-select';
import type { EUpload } from '../upload';

beforeAll(async () => {
  await import('../upload');
  await import('../select');
  await import('../input-number');
  await import('../cascader');
  await import('../date-picker');
  await import('../time-picker');
  await import('../tree-select');
  await import('../tree');
});

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

const mounted: HTMLElement[] = [];

const mount = <T extends HTMLElement = HTMLElement>(html: string): T => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  mounted.push(wrap);
  return wrap.firstElementChild as T;
};

// Every one of these components registers document-level `mousedown` /
// `keydown` listeners through `onGlobal`. Removing the host runs
// `disconnectedCallback` → `runCleanups`, so nothing survives into the next
// test; anything left focused is dropped back to <body> at the same time.
afterEach(() => {
  for (const wrap of mounted.splice(0)) wrap.remove();
  document.documentElement.removeAttribute('lang');
});

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** Collect the `detail` of every `type` event fired on `el`, in order. */
const listen = <D>(el: EventTarget, type: string): D[] => {
  const seen: D[] = [];
  el.addEventListener(type, (e: Event) => {
    seen.push((e as CustomEvent<D>).detail);
  });
  return seen;
};

const press = (target: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(ev);
  return ev;
};

const pressActive = (key: string, init: KeyboardEventInit = {}): KeyboardEvent =>
  press(document.activeElement as Element, key, init);

const clickOutside = (): void => {
  document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
};

const escapeOnDocument = (): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

/**
 * `serialize()` / `parse()` are `protected` on `BaseFormControl`, and the
 * pickers below override the `value` setter so the base class never calls
 * `serialize()` for them. Reaching the wire format therefore needs a typed
 * structural cast rather than an inheritance trick.
 */
interface WireFormat<T> {
  serialize(v: T): string | FormData | File | null;
  parse(s: string): T;
}
const wire = <T>(el: HTMLElement): WireFormat<T> => el as unknown as WireFormat<T>;

const dataTransferWith = (...files: File[]): DataTransfer => {
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  return dt;
};

const fileOf = (name: string, bytes: number, type = 'text/plain'): File =>
  new File([new Uint8Array(bytes)], name, { type });

/* ------------------------------------------------------------------ *
 * e-upload
 * ------------------------------------------------------------------ */

const dropZone = (el: EUpload): HTMLElement => el.querySelector<HTMLElement>('.ink-upload')!;
const fileInput = (el: EUpload): HTMLInputElement =>
  el.querySelector<HTMLInputElement>('input[type="file"]')!;
const fileList = (el: EUpload): HTMLElement => el.querySelector<HTMLElement>('.ink-upload__list')!;
const fileNames = (el: EUpload): string[] =>
  [...fileList(el).querySelectorAll('.ink-upload__file-name')].map((n) => n.textContent ?? '');

const selectFiles = (el: EUpload, ...files: File[]): void => {
  const input = fileInput(el);
  input.files = dataTransferWith(...files).files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const dropOn = (el: EUpload, ...files: File[]): void => {
  dropZone(el).dispatchEvent(
    new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransferWith(...files),
    }),
  );
};

describe('e-upload · initial render', () => {
  it('renders an accessible drop zone with no accept filter by default', () => {
    const el = mount<EUpload>(`<e-upload></e-upload>`);
    const drop = dropZone(el);
    expect(drop.getAttribute('role')).toBe('button');
    expect(drop.tabIndex).toBe(0);
    expect(drop.getAttribute('aria-label')).toBe('Choose files');
    expect(drop.querySelector('svg path')!.getAttribute('d')).toBe(ICONS.upload);
    expect(el.querySelector('.ink-upload__title')!.textContent).toBe(
      'Drop files here or click to upload',
    );
    expect(el.querySelector('.ink-upload__hint')!.textContent).toBe('ANY FILE TYPE');
    expect(fileInput(el).hasAttribute('accept')).toBe(false);
    expect(fileInput(el).multiple).toBe(false);
    expect(fileList(el).hidden).toBe(true);
    expect(el.value).toEqual([]);
  });

  it('forwards accept and multiple set before mount', () => {
    const el = mount<EUpload>(`<e-upload accept=".pdf,.png" multiple></e-upload>`);
    expect(el.querySelector('.ink-upload__hint')!.textContent).toBe('ACCEPTS · .PDF,.PNG');
    expect(fileInput(el).getAttribute('accept')).toBe('.pdf,.png');
    expect(fileInput(el).multiple).toBe(true);
  });

  it('treats multiple="false" as absent', () => {
    const el = mount<EUpload>(`<e-upload multiple="false"></e-upload>`);
    expect(fileInput(el).multiple).toBe(false);
  });
});

describe('e-upload · attribute mutation after mount', () => {
  it('patches accept and the hint in both directions', () => {
    const el = mount<EUpload>(`<e-upload></e-upload>`);
    el.setAttribute('accept', '.txt');
    expect(fileInput(el).getAttribute('accept')).toBe('.txt');
    expect(el.querySelector('.ink-upload__hint')!.textContent).toBe('ACCEPTS · .TXT');

    el.setAttribute('accept', '');
    expect(fileInput(el).hasAttribute('accept')).toBe(false);
    expect(el.querySelector('.ink-upload__hint')!.textContent).toBe('ANY FILE TYPE');

    el.setAttribute('accept', 'image/*');
    el.removeAttribute('accept');
    expect(fileInput(el).hasAttribute('accept')).toBe(false);
    expect(el.querySelector('.ink-upload__hint')!.textContent).toBe('ANY FILE TYPE');
  });

  it('adding multiple sets the input flag, removing it truncates the list and emits', () => {
    const el = mount<EUpload>(`<e-upload name="f"></e-upload>`);
    el.setAttribute('multiple', '');
    expect(fileInput(el).multiple).toBe(true);

    dropOn(el, fileOf('a.txt', 1), fileOf('b.txt', 1));
    expect(fileNames(el)).toEqual(['a.txt', 'b.txt']);

    const detail = listen<{ files: File[] }>(el, 'e-change');
    el.removeAttribute('multiple');
    expect(fileInput(el).multiple).toBe(false);
    expect(el.value.map((f) => f.name)).toEqual(['a.txt']);
    expect(fileNames(el)).toEqual(['a.txt']);
    // The dropped file is gone from the submitted value, so listeners hear it.
    expect(detail.map((d) => d.files.map((f) => f.name))).toEqual([['a.txt']]);
  });

  it('removing multiple with a single file leaves the list untouched and stays silent', () => {
    const el = mount<EUpload>(`<e-upload multiple></e-upload>`);
    dropOn(el, fileOf('only.txt', 1));
    const detail = listen<{ files: File[] }>(el, 'e-change');
    el.removeAttribute('multiple');
    expect(fileNames(el)).toEqual(['only.txt']);
    expect(detail).toEqual([]);
  });

  it('ignores attribute changes made before the element is wired', () => {
    const el = document.createElement('e-upload') as EUpload;
    el.setAttribute('accept', '.zip');
    el.setAttribute('multiple', '');
    expect(el.querySelector('input')).toBeNull();

    document.body.appendChild(el);
    mounted.push(el);
    expect(fileInput(el).getAttribute('accept')).toBe('.zip');
    expect(fileInput(el).multiple).toBe(true);
  });
});

describe('e-upload · file selection', () => {
  it('renders one row per file with name, rounded size and a remove button', () => {
    const el = mount<EUpload>(`<e-upload multiple name="f"></e-upload>`);
    const detail = listen<{ files: File[] }>(el, 'e-change');

    selectFiles(el, fileOf('a.txt', 1024), fileOf('empty.txt', 0));

    expect(detail).toHaveLength(1);
    expect(detail[0]!.files.map((f) => f.name)).toEqual(['a.txt', 'empty.txt']);
    expect(fileList(el).hidden).toBe(false);

    const rows = [...fileList(el).querySelectorAll<HTMLLIElement>('li')];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.className).toBe('ink-upload__file');
    expect(rows[0]!.querySelector('svg path')!.getAttribute('d')).toBe(ICONS.doc);
    expect(rows[0]!.querySelector('.ink-upload__file-name')!.textContent).toBe('a.txt');
    expect(rows[0]!.children[2]!.textContent).toBe('1 KB');
    expect(rows[1]!.children[2]!.textContent).toBe('0 KB');

    const remove = rows[0]!.querySelector<HTMLButtonElement>('[data-remove]')!;
    expect(remove.className).toBe('ink-icon-btn');
    expect(remove.type).toBe('button');
    expect(remove.getAttribute('aria-label')).toBe('Remove');
    expect(remove.style.width).toBe('24px');
    expect(remove.style.height).toBe('24px');
    expect(remove.querySelector('svg path')!.getAttribute('d')).toBe(ICONS.close);
    expect(
      [...fileList(el).querySelectorAll('[data-remove]')].map((b) => b.getAttribute('data-remove')),
    ).toEqual(['0', '1']);
  });

  it('appends rather than rebuilds in multi-file mode', () => {
    const el = mount<EUpload>(`<e-upload multiple name="f"></e-upload>`);
    selectFiles(el, fileOf('a.txt', 1));
    const firstRow = fileList(el).firstElementChild;

    selectFiles(el, fileOf('b.txt', 1));
    expect(fileNames(el)).toEqual(['a.txt', 'b.txt']);
    // The already-mounted row keeps its identity: no full list rebuild.
    expect(fileList(el).firstElementChild).toBe(firstRow);
  });

  it('replaces the previous file in single-file mode', () => {
    const el = mount<EUpload>(`<e-upload name="f"></e-upload>`);
    selectFiles(el, fileOf('a.txt', 1));
    selectFiles(el, fileOf('b.txt', 1), fileOf('c.txt', 1));
    expect(el.value.map((f) => f.name)).toEqual(['b.txt']);
    expect(fileNames(el)).toEqual(['b.txt']);
  });

  it('removes a file, re-indexes the survivors and hides the empty list', () => {
    const el = mount<EUpload>(`<e-upload multiple name="f"></e-upload>`);
    selectFiles(el, fileOf('a.txt', 1), fileOf('b.txt', 1), fileOf('c.txt', 1));
    const detail = listen<{ files: File[] }>(el, 'e-change');

    fileList(el).querySelector<HTMLButtonElement>('[data-remove="0"]')!.click();
    expect(detail).toHaveLength(1);
    expect(detail[0]!.files.map((f) => f.name)).toEqual(['b.txt', 'c.txt']);
    expect(fileNames(el)).toEqual(['b.txt', 'c.txt']);
    expect(
      [...fileList(el).querySelectorAll('[data-remove]')].map((b) => b.getAttribute('data-remove')),
    ).toEqual(['0', '1']);

    fileList(el).querySelector<HTMLButtonElement>('[data-remove="1"]')!.click();
    fileList(el).querySelector<HTMLButtonElement>('[data-remove="0"]')!.click();
    expect(el.value).toEqual([]);
    expect(fileList(el).hidden).toBe(true);
    expect(detail).toHaveLength(3);
  });

  it('ignores list clicks that miss a remove button', () => {
    const el = mount<EUpload>(`<e-upload multiple name="f"></e-upload>`);
    selectFiles(el, fileOf('a.txt', 1));
    const detail = listen<{ files: File[] }>(el, 'e-change');

    fileList(el).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fileList(el)
      .querySelector('.ink-upload__file-name')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(detail).toEqual([]);
    expect(fileNames(el)).toEqual(['a.txt']);
  });
});

describe('e-upload · drag and drop', () => {
  it('flags the drop zone on dragover and clears it on dragleave', () => {
    const el = mount<EUpload>(`<e-upload></e-upload>`);
    const drop = dropZone(el);
    expect(drop.dataset['drag']).toBeUndefined();

    const over = new DragEvent('dragover', { bubbles: true, cancelable: true });
    drop.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    expect(drop.dataset['drag']).toBe('true');

    // A second dragover is a no-op — the flag is already set.
    drop.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true }));
    expect(drop.dataset['drag']).toBe('true');

    drop.dispatchEvent(new DragEvent('dragleave', { bubbles: true }));
    expect(drop.dataset['drag']).toBe('false');
  });

  it('accepts dropped files and clears the drag flag', () => {
    const el = mount<EUpload>(`<e-upload multiple name="f"></e-upload>`);
    const detail = listen<{ files: File[] }>(el, 'e-change');
    dropZone(el).dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true }));

    const drop = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransferWith(fileOf('x.txt', 1)),
    });
    dropZone(el).dispatchEvent(drop);

    expect(drop.defaultPrevented).toBe(true);
    expect(dropZone(el).dataset['drag']).toBe('false');
    expect(detail[0]!.files.map((f) => f.name)).toEqual(['x.txt']);
  });

  it('tolerates a drop with no dataTransfer', () => {
    const el = mount<EUpload>(`<e-upload></e-upload>`);
    const detail = listen<{ files: File[] }>(el, 'e-change');
    dropZone(el).dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true }));
    expect(detail).toEqual([]);
    expect(dropZone(el).dataset['drag']).toBe('false');
  });
});

describe('e-upload · drop-zone activation', () => {
  it('proxies clicks to the hidden input but never re-enters from the input itself', () => {
    const el = mount<EUpload>(`<e-upload></e-upload>`);
    const input = fileInput(el);
    let clicks = 0;
    input.click = (): void => {
      clicks += 1;
    };

    dropZone(el).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clicks).toBe(1);

    input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clicks).toBe(1);
  });

  it('opens the picker on Enter and Space only', () => {
    const el = mount<EUpload>(`<e-upload></e-upload>`);
    const input = fileInput(el);
    let clicks = 0;
    input.click = (): void => {
      clicks += 1;
    };

    const enter = press(dropZone(el), 'Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(clicks).toBe(1);

    press(dropZone(el), ' ');
    expect(clicks).toBe(2);

    const tab = press(dropZone(el), 'Tab');
    expect(tab.defaultPrevented).toBe(false);
    expect(clicks).toBe(2);
  });
});

describe('e-upload · constraints', () => {
  it('rejects a file over max-size and reports the byte limit', () => {
    const el = mount<EUpload>(`<e-upload max-size="10" name="f"></e-upload>`);
    const detail = listen<{ files: File[] }>(el, 'e-change');

    dropOn(el, fileOf('huge.bin', 64));
    expect(el.value).toEqual([]);
    expect(detail).toEqual([]);
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('File "huge.bin" exceeds maximum size of 10 bytes.');

    dropOn(el, fileOf('tiny.bin', 4));
    expect(el.value.map((f) => f.name)).toEqual(['tiny.bin']);
    expect(el.checkValidity()).toBe(true);
  });

  it('ignores a non-numeric or non-positive max-size', () => {
    const el = mount<EUpload>(`<e-upload max-size="not-a-number"></e-upload>`);
    dropOn(el, fileOf('a.bin', 4096));
    expect(el.value).toHaveLength(1);

    el.setAttribute('max-size', '0');
    dropOn(el, fileOf('b.bin', 4096));
    expect(el.value.map((f) => f.name)).toEqual(['b.bin']);
    expect(el.checkValidity()).toBe(true);
  });

  it('rejects more files than max-files allows', () => {
    const el = mount<EUpload>(`<e-upload multiple max-files="2" name="f"></e-upload>`);
    dropOn(el, fileOf('a.txt', 1), fileOf('b.txt', 1), fileOf('c.txt', 1));
    expect(el.value).toEqual([]);
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('At most 2 file(s) allowed.');

    dropOn(el, fileOf('a.txt', 1), fileOf('b.txt', 1));
    expect(fileNames(el)).toEqual(['a.txt', 'b.txt']);
    expect(el.checkValidity()).toBe(true);
  });

  it('reports the default required message and clears it once a file arrives', () => {
    const el = mount<EUpload>(`<e-upload required name="f"></e-upload>`);
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('Please select a file.');
    expect(el.validity.valueMissing).toBe(true);

    dropOn(el, fileOf('a.txt', 1));
    expect(el.checkValidity()).toBe(true);
    expect(el.validationMessage).toBe('');
  });

  it('honours required-message and re-validates when required is toggled', () => {
    const el = mount<EUpload>(`<e-upload name="f"></e-upload>`);
    expect(el.checkValidity()).toBe(true);

    el.setAttribute('required', '');
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('Please select a file.');

    el.setAttribute('required-message', 'Attach the invoice.');
    expect(el.validationMessage).toBe('Attach the invoice.');

    el.removeAttribute('required');
    expect(el.checkValidity()).toBe(true);
  });

  it('surfaces the violation on the drop zone only after an interaction', () => {
    const el = mount<EUpload>(`<e-upload required name="f"></e-upload>`);
    expect(dropZone(el).hasAttribute('aria-invalid')).toBe(false);

    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(dropZone(el).getAttribute('aria-invalid')).toBe('true');

    dropOn(el, fileOf('a.txt', 1));
    expect(dropZone(el).hasAttribute('aria-invalid')).toBe(false);
  });
});

describe('e-upload · programmatic value', () => {
  it('assigns, clamps to one file without multiple and coerces non-arrays', () => {
    const el = mount<EUpload>(`<e-upload name="f"></e-upload>`);
    el.value = [fileOf('a.txt', 1), fileOf('b.txt', 1)];
    expect(el.value.map((f) => f.name)).toEqual(['a.txt']);
    expect(fileNames(el)).toEqual(['a.txt']);

    (el as unknown as { value: unknown }).value = null;
    expect(el.value).toEqual([]);
    expect(fileList(el).hidden).toBe(true);
  });

  it('refuses an assignment that violates max-size', () => {
    const el = mount<EUpload>(`<e-upload max-size="8" multiple name="f"></e-upload>`);
    el.value = [fileOf('ok.bin', 4)];
    el.value = [fileOf('bad.bin', 99)];
    expect(el.value.map((f) => f.name)).toEqual(['ok.bin']);
    expect(el.checkValidity()).toBe(false);
  });

  it('validates only the file it keeps in single-file mode', () => {
    const el = mount<EUpload>(`<e-upload max-files="1" name="f"></e-upload>`);
    el.value = [fileOf('a.txt', 1), fileOf('b.txt', 1)];
    expect(el.value.map((f) => f.name)).toEqual(['a.txt']);
    expect(fileNames(el)).toEqual(['a.txt']);
    expect(el.checkValidity()).toBe(true);
  });

  it('hands out a copy, so mutating it cannot desynchronise the rendered list', () => {
    const el = mount<EUpload>(`<e-upload multiple name="f"></e-upload>`);
    const detail = listen<{ files: File[] }>(el, 'e-change');
    selectFiles(el, fileOf('a.txt', 1), fileOf('b.txt', 1));

    el.value.length = 0;
    detail[0]!.files.push(fileOf('ghost.txt', 1));

    expect(el.value.map((f) => f.name)).toEqual(['a.txt', 'b.txt']);
    expect(fileNames(el)).toEqual(['a.txt', 'b.txt']);
  });
});

describe('e-upload · form participation', () => {
  it('appends every file under name in multi-file mode', () => {
    const form = mount<HTMLFormElement>(`<form><e-upload name="docs" multiple></e-upload></form>`);
    const el = form.querySelector<EUpload>('e-upload')!;
    selectFiles(el, fileOf('a.txt', 1), fileOf('b.txt', 1));

    const got = new FormData(form).getAll('docs');
    expect(got).toHaveLength(2);
    expect((got[0] as File).name).toBe('a.txt');
    expect((got[1] as File).name).toBe('b.txt');
  });

  it('submits the lone File directly in single-file mode', () => {
    const form = mount<HTMLFormElement>(`<form><e-upload name="doc"></e-upload></form>`);
    const el = form.querySelector<EUpload>('e-upload')!;
    selectFiles(el, fileOf('single.txt', 3));

    const got = new FormData(form).get('doc');
    expect(got).toBeInstanceOf(File);
    expect((got as File).name).toBe('single.txt');
  });

  it('submits nothing in multi-file mode without a name', () => {
    const form = mount<HTMLFormElement>(`<form><e-upload multiple></e-upload></form>`);
    const el = form.querySelector<EUpload>('e-upload')!;
    selectFiles(el, fileOf('a.txt', 1));
    expect([...new FormData(form).keys()]).toEqual([]);
    expect(el.value).toHaveLength(1);
  });

  it('resets to an empty list and clears the native input', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-upload name="docs" multiple required></e-upload></form>`,
    );
    const el = form.querySelector<EUpload>('e-upload')!;
    selectFiles(el, fileOf('a.txt', 1));
    expect(fileInput(el).files).toHaveLength(1);

    form.reset();
    expect(el.value).toEqual([]);
    expect(fileInput(el).value).toBe('');
    expect(fileList(el).hidden).toBe(true);
    expect(fileList(el).children).toHaveLength(0);
    expect(new FormData(form).get('docs')).toBeNull();
    expect(el.checkValidity()).toBe(false);
  });

  it('restores multi-file state from FormData', () => {
    const el = mount<EUpload>(`<e-upload name="docs" multiple></e-upload>`);
    const fd = new FormData();
    fd.append('docs', fileOf('r1.txt', 1), 'r1.txt');
    fd.append('docs', fileOf('r2.txt', 1), 'r2.txt');
    fd.append('other', 'ignored');

    el.formStateRestoreCallback(fd);
    expect(el.value.map((f) => f.name)).toEqual(['r1.txt', 'r2.txt']);
    expect(fileNames(el)).toEqual(['r1.txt', 'r2.txt']);
  });

  it('restores nothing from FormData when the control has no name', () => {
    const el = mount<EUpload>(`<e-upload multiple></e-upload>`);
    const fd = new FormData();
    fd.append('docs', fileOf('r1.txt', 1), 'r1.txt');
    el.formStateRestoreCallback(fd);
    expect(el.value).toEqual([]);
  });

  it('restores a single File and ignores a string state', () => {
    const el = mount<EUpload>(`<e-upload name="doc"></e-upload>`);
    el.formStateRestoreCallback(fileOf('restored.txt', 2));
    expect(el.value.map((f) => f.name)).toEqual(['restored.txt']);

    el.formStateRestoreCallback('a.txt,b.txt');
    expect(el.value).toEqual([]);

    el.formStateRestoreCallback(null);
    expect(el.value).toEqual([]);
  });

  it('exposes name, form and willValidate from the base control', () => {
    const form = mount<HTMLFormElement>(`<form><e-upload name="docs"></e-upload></form>`);
    const el = form.querySelector<EUpload>('e-upload')!;
    expect(el.name).toBe('docs');
    expect(el.form).toBe(form);
    expect(el.willValidate).toBe(true);

    el.name = 'renamed';
    expect(el.getAttribute('name')).toBe('renamed');
  });

  it('accepts a fieldset disabling it through formDisabledCallback', () => {
    const el = mount<EUpload>(`<e-upload name="docs"></e-upload>`);
    el.formDisabledCallback(true);
    el.formDisabledCallback(false);
    expect(el.value).toEqual([]);
  });

  it('re-wires its listeners after a disconnect/reconnect cycle', () => {
    const el = mount<EUpload>(`<e-upload multiple name="f"></e-upload>`);
    selectFiles(el, fileOf('a.txt', 1));
    const host = el.parentElement!;

    el.remove();
    dropOn(el, fileOf('while-detached.txt', 1));
    expect(el.value.map((f) => f.name)).toEqual(['a.txt']);

    host.appendChild(el);
    dropOn(el, fileOf('b.txt', 1));
    expect(el.value.map((f) => f.name)).toEqual(['a.txt', 'b.txt']);
  });
});

/* ------------------------------------------------------------------ *
 * e-select
 * ------------------------------------------------------------------ */

const FRUITS = `
  <e-option value="a" label="Apples"></e-option>
  <e-option value="b" label="Bananas"></e-option>
  <e-option value="c" label="Cherries"></e-option>
`;

const selTrigger = (el: ESelect): HTMLButtonElement =>
  el.querySelector<HTMLButtonElement>('.ink-select__trigger')!;
const selMenu = (el: ESelect): HTMLElement => el.querySelector<HTMLElement>('.ink-select__menu')!;
const selOptions = (el: ESelect): HTMLElement[] => [
  ...el.querySelectorAll<HTMLElement>('.ink-select__option'),
];
const selLabel = (el: ESelect): string => el.querySelector('[data-current]')!.textContent ?? '';
const chevron = (el: ESelect): string | null =>
  selTrigger(el).querySelector('svg path')!.getAttribute('d');

describe('e-select · initial render', () => {
  it('wires the listbox relationship and marks the selected option', () => {
    const el = mount<ESelect>(`<e-select value="b">${FRUITS}</e-select>`);
    const trigger = selTrigger(el);
    const menu = selMenu(el);

    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
    expect(menu.getAttribute('role')).toBe('listbox');
    expect(menu.hidden).toBe(true);
    expect(selLabel(el)).toBe('Bananas');
    expect(chevron(el)).toBe(ICONS.chevD);

    const opts = selOptions(el);
    expect(opts.map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(opts.map((o) => o.tabIndex)).toEqual([-1, 0, -1]);
    expect(opts.map((o) => o.dataset['value'])).toEqual(['a', 'b', 'c']);
    expect(opts[1]!.querySelector('svg path')!.getAttribute('d')).toBe(ICONS.check);
    expect(opts[0]!.querySelector('svg')).toBeNull();
    expect(el.value).toBe('b');
  });

  it('shows the default placeholder when nothing matches', () => {
    const el = mount<ESelect>(`<e-select value="zz">${FRUITS}</e-select>`);
    expect(selLabel(el)).toBe('Select…');
    expect(selOptions(el).map((o) => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'false',
    ]);
    expect(selOptions(el).map((o) => o.tabIndex)).toEqual([-1, -1, -1]);
  });

  it('honours a custom placeholder', () => {
    const el = mount<ESelect>(`<e-select placeholder="Pick a fruit">${FRUITS}</e-select>`);
    expect(selLabel(el)).toBe('Pick a fruit');
  });

  it('falls back from an empty label attribute to the option text', () => {
    const el = mount<ESelect>(
      `<e-select value="c"><e-option value="c" label="">Cherries</e-option><e-option value="d"></e-option></e-select>`,
    );
    expect(selOptions(el)[0]!.textContent!.trim()).toBe('Cherries');
    expect(selOptions(el)[1]!.textContent!.trim()).toBe('');
    expect(selLabel(el)).toBe('Cherries');
  });

  it('stays on the placeholder when an option has no value and the select is unset', () => {
    const el = mount<ESelect>(`<e-select><e-option label="Any"></e-option></e-select>`);
    expect(selOptions(el)[0]!.getAttribute('data-value')).toBe('');
    expect(selOptions(el)[0]!.getAttribute('aria-selected')).toBe('false');
    expect(selOptions(el)[0]!.querySelector('svg')).toBeNull();
    expect(selOptions(el)[0]!.tabIndex).toBe(-1);
    expect(selLabel(el)).toBe('Select…');
    expect(el.value).toBe('');
  });

  it('selects an empty-valued option when value="" is set deliberately', () => {
    const el = mount<ESelect>(
      `<e-select value=""><e-option value="" label="Any"></e-option></e-select>`,
    );
    expect(selOptions(el)[0]!.getAttribute('aria-selected')).toBe('true');
    expect(selLabel(el)).toBe('Any');
    expect(el.value).toBe('');
  });

  it('commits an empty-valued option that the user picks', () => {
    const el = mount<ESelect>(`<e-select><e-option label="Any"></e-option></e-select>`);
    const detail = listen<{ value: string }>(el, 'e-change');

    selOptions(el)[0]!.click();
    expect(detail).toEqual([{ value: '' }]);
    expect(el.getAttribute('value')).toBe('');
    expect(selOptions(el)[0]!.getAttribute('aria-selected')).toBe('true');
    expect(selLabel(el)).toBe('Any');
  });
});

describe('e-select · pointer interaction', () => {
  it('toggles the popup and flips the chevron', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    selTrigger(el).click();
    expect(selMenu(el).hidden).toBe(false);
    expect(selTrigger(el).getAttribute('aria-expanded')).toBe('true');
    expect(chevron(el)).toBe(ICONS.chevU);

    selTrigger(el).click();
    expect(selMenu(el).hidden).toBe(true);
    expect(selTrigger(el).getAttribute('aria-expanded')).toBe('false');
    expect(chevron(el)).toBe(ICONS.chevD);
  });

  it('selects an option, patches only the two affected rows and returns focus', () => {
    const el = mount<ESelect>(`<e-select value="a">${FRUITS}</e-select>`);
    const detail = listen<{ value: string }>(el, 'e-change');
    selTrigger(el).click();

    selOptions(el)[2]!.click();

    expect(detail).toEqual([{ value: 'c' }]);
    expect(el.getAttribute('value')).toBe('c');
    expect(el.value).toBe('c');
    expect(selLabel(el)).toBe('Cherries');
    expect(selMenu(el).hidden).toBe(true);
    expect(document.activeElement).toBe(selTrigger(el));

    const opts = selOptions(el);
    expect(opts.map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true']);
    expect(opts.map((o) => o.tabIndex)).toEqual([-1, -1, 0]);
    expect(opts[0]!.querySelector('svg')).toBeNull();
    expect(opts[2]!.querySelector('svg path')!.getAttribute('d')).toBe(ICONS.check);
  });

  it('ignores clicks inside the menu that miss an option', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    const detail = listen<{ value: string }>(el, 'e-change');
    selTrigger(el).click();
    selMenu(el).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(detail).toEqual([]);
    expect(selMenu(el).hidden).toBe(false);
  });

  it('closes on an outside mousedown but not on one inside', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    selTrigger(el).click();

    selMenu(el).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(selMenu(el).hidden).toBe(false);

    clickOutside();
    expect(selMenu(el).hidden).toBe(true);
    expect(selTrigger(el).getAttribute('aria-expanded')).toBe('false');
  });
});

describe('e-select · keyboard interaction', () => {
  it('opens downward onto the first option and upward onto the last', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    const down = press(selTrigger(el), 'ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    expect(selMenu(el).hidden).toBe(false);
    expect(document.activeElement).toBe(selOptions(el)[0]);

    selTrigger(el).click();
    press(selTrigger(el), 'ArrowUp');
    expect(document.activeElement).toBe(selOptions(el)[2]);
  });

  it('opens onto the currently selected option', () => {
    const el = mount<ESelect>(`<e-select value="b">${FRUITS}</e-select>`);
    press(selTrigger(el), 'ArrowDown');
    expect(document.activeElement).toBe(selOptions(el)[1]);
    expect(selOptions(el).map((o) => o.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('walks the list with ArrowDown/ArrowUp/Home/End and wraps at both ends', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    press(selTrigger(el), 'ArrowDown');
    const opts = selOptions(el);

    pressActive('ArrowDown');
    expect(document.activeElement).toBe(opts[1]);
    pressActive('End');
    expect(document.activeElement).toBe(opts[2]);
    pressActive('ArrowDown');
    expect(document.activeElement).toBe(opts[0]);
    pressActive('ArrowUp');
    expect(document.activeElement).toBe(opts[2]);
    pressActive('Home');
    expect(document.activeElement).toBe(opts[0]);
    expect(opts.map((o) => o.tabIndex)).toEqual([0, -1, -1]);
  });

  it('commits the focused option on Enter and on Space', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    const detail = listen<{ value: string }>(el, 'e-change');

    press(selTrigger(el), 'ArrowDown');
    pressActive('ArrowDown');
    const enter = pressActive('Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(detail).toEqual([{ value: 'b' }]);
    expect(selMenu(el).hidden).toBe(true);

    press(selTrigger(el), 'ArrowDown');
    pressActive('End');
    pressActive(' ');
    expect(detail).toEqual([{ value: 'b' }, { value: 'c' }]);
    expect(el.value).toBe('c');
  });

  it('ignores Enter in the menu when focus is not on an option', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    const detail = listen<{ value: string }>(el, 'e-change');
    selTrigger(el).click();
    selTrigger(el).focus();

    const enter = press(selMenu(el), 'Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(detail).toEqual([]);
    expect(selMenu(el).hidden).toBe(false);
  });

  it('ignores menu keys while the menu is closed', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    expect(selMenu(el).hidden).toBe(true);
    press(selMenu(el), 'ArrowDown');
    expect(el.contains(document.activeElement)).toBe(false);
    expect(selOptions(el).map((o) => o.tabIndex)).toEqual([-1, -1, -1]);
  });

  it('type-ahead on the trigger selects and cycles through same-letter options', () => {
    const el = mount<ESelect>(
      `<e-select><e-option value="a1" label="Apples"></e-option><e-option value="a2" label="Apricots"></e-option><e-option value="b" label="Bananas"></e-option></e-select>`,
    );
    const detail = listen<{ value: string }>(el, 'e-change');

    const first = press(selTrigger(el), 'a');
    expect(first.defaultPrevented).toBe(true);
    expect(el.value).toBe('a1');

    press(selTrigger(el), 'a');
    expect(el.value).toBe('a2');

    press(selTrigger(el), 'a');
    expect(el.value).toBe('a1');
    expect(detail).toEqual([{ value: 'a1' }, { value: 'a2' }, { value: 'a1' }]);
  });

  it('leaves the value alone for an unmatched letter, Space or a modified key', () => {
    const el = mount<ESelect>(`<e-select value="a">${FRUITS}</e-select>`);
    const detail = listen<{ value: string }>(el, 'e-change');

    const miss = press(selTrigger(el), 'z');
    expect(miss.defaultPrevented).toBe(false);

    press(selTrigger(el), ' ');
    press(selTrigger(el), 'b', { ctrlKey: true });
    press(selTrigger(el), 'b', { altKey: true });
    press(selTrigger(el), 'b', { metaKey: true });
    press(selTrigger(el), 'ArrowRight');

    expect(detail).toEqual([]);
    expect(el.value).toBe('a');
  });

  it('type-ahead inside the menu moves focus without committing', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    const detail = listen<{ value: string }>(el, 'e-change');
    press(selTrigger(el), 'ArrowDown');

    const hit = pressActive('c');
    expect(hit.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(selOptions(el)[2]);
    expect(detail).toEqual([]);

    const miss = pressActive('z');
    expect(miss.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(selOptions(el)[2]);
  });

  it('closes on Escape and restores focus to the trigger', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    press(selTrigger(el), 'ArrowDown');
    expect(selMenu(el).hidden).toBe(false);

    escapeOnDocument();
    expect(selMenu(el).hidden).toBe(true);
    expect(document.activeElement).toBe(selTrigger(el));

    // Escape with the popup already closed is inert.
    escapeOnDocument();
    expect(selMenu(el).hidden).toBe(true);
  });

  it('survives an empty option list', () => {
    const el = mount<ESelect>(`<e-select placeholder="Nothing"></e-select>`);
    expect(selOptions(el)).toEqual([]);
    press(selTrigger(el), 'ArrowDown');
    expect(selMenu(el).hidden).toBe(false);
    expect(el.contains(document.activeElement)).toBe(false);

    press(selTrigger(el), 'q');
    expect(el.value).toBe('');
    expect(selLabel(el)).toBe('Nothing');
  });
});

describe('e-select · attribute mutation after mount', () => {
  it('repaints the placeholder only while nothing is selected', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    el.setAttribute('placeholder', 'Choose…');
    expect(selLabel(el)).toBe('Choose…');

    el.removeAttribute('placeholder');
    expect(selLabel(el)).toBe('Select…');

    // An empty attribute means "no placeholder of my own" both at mount and
    // afterwards, so it restores the default rather than blanking the label.
    el.setAttribute('placeholder', 'Choose…');
    el.setAttribute('placeholder', '');
    expect(selLabel(el)).toBe('Select…');

    el.value = 'a';
    el.setAttribute('placeholder', 'Ignored while selected');
    expect(selLabel(el)).toBe('Apples');
  });

  it('moves the selection marker when value changes and clears it for an unknown value', () => {
    const el = mount<ESelect>(`<e-select value="a">${FRUITS}</e-select>`);
    el.setAttribute('value', 'c');
    expect(selOptions(el).map((o) => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'true',
    ]);

    el.setAttribute('value', 'nope');
    expect(selOptions(el).map((o) => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'false',
    ]);
    expect(selLabel(el)).toBe('Select…');
    expect(el.value).toBe('nope');

    el.removeAttribute('value');
    expect(el.value).toBe('');
  });

  it('tracks the presence of the value attribute, not just its text', () => {
    const el = mount<ESelect>(
      `<e-select><e-option value="" label="Any"></e-option><e-option value="a" label="Apples"></e-option></e-select>`,
    );
    expect(selLabel(el)).toBe('Select…');

    el.setAttribute('value', '');
    expect(selOptions(el)[0]!.getAttribute('aria-selected')).toBe('true');
    expect(selLabel(el)).toBe('Any');

    el.removeAttribute('value');
    expect(selOptions(el)[0]!.getAttribute('aria-selected')).toBe('false');
    expect(selLabel(el)).toBe('Select…');
    expect(el.value).toBe('');
  });

  it('short-circuits a redundant value write', () => {
    const el = mount<ESelect>(`<e-select value="b">${FRUITS}</e-select>`);
    const marker = selOptions(el)[1]!.querySelector('svg');
    el.setAttribute('value', 'b');
    expect(selOptions(el)[1]!.querySelector('svg')).toBe(marker);
    expect(selLabel(el)).toBe('Bananas');
  });

  it('ignores attribute writes before the element is wired', () => {
    const el = document.createElement('e-select') as ESelect;
    el.setAttribute('value', 'b');
    el.setAttribute('placeholder', 'Later');
    expect(el.children).toHaveLength(0);

    el.innerHTML = FRUITS;
    document.body.appendChild(el);
    mounted.push(el);
    expect(selLabel(el)).toBe('Bananas');
  });
});

describe('e-select · validity and form participation', () => {
  it('mirrors required onto the trigger and reports a custom message', () => {
    const el = mount<ESelect>(`<e-select required>${FRUITS}</e-select>`);
    expect(selTrigger(el).getAttribute('aria-required')).toBe('true');
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('Please select an option.');
    expect(el.validity.valueMissing).toBe(true);

    el.setAttribute('required-message', 'A fruit is required.');
    expect(el.validationMessage).toBe('A fruit is required.');

    el.value = 'a';
    expect(el.checkValidity()).toBe(true);

    el.removeAttribute('required');
    expect(selTrigger(el).getAttribute('aria-required')).toBe('false');
  });

  it('paints aria-invalid on the trigger only after reportValidity', () => {
    const el = mount<ESelect>(`<e-select required>${FRUITS}</e-select>`);
    expect(selTrigger(el).hasAttribute('aria-invalid')).toBe(false);
    expect(el.reportValidity()).toBe(false);
    expect(selTrigger(el).getAttribute('aria-invalid')).toBe('true');
  });

  it('round-trips through FormData and resets to default-value', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-select name="fruit" value="b" default-value="c">${FRUITS}</e-select></form>`,
    );
    const el = form.querySelector<ESelect>('e-select')!;
    expect(new FormData(form).get('fruit')).toBe('b');

    form.reset();
    expect(el.value).toBe('c');
    expect(selLabel(el)).toBe('Cherries');
    expect(new FormData(form).get('fruit')).toBe('c');
  });

  it('resets to the empty value when no default-value is given', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-select name="fruit" value="b">${FRUITS}</e-select></form>`,
    );
    const el = form.querySelector<ESelect>('e-select')!;
    form.reset();
    expect(el.value).toBe('');
    expect(selLabel(el)).toBe('Select…');
    expect(new FormData(form).get('fruit')).toBe('');
  });

  it('restores a string state and rejects FormData/File states', () => {
    const el = mount<ESelect>(`<e-select name="fruit">${FRUITS}</e-select>`);
    el.formStateRestoreCallback('c');
    expect(el.value).toBe('c');
    expect(selLabel(el)).toBe('Cherries');

    expect(() => el.formStateRestoreCallback(new FormData())).toThrow(
      /ESelect: parseFormData\(\) not implemented/,
    );
    expect(() => el.formStateRestoreCallback(new File([], 'x.txt'))).toThrow(
      /ESelect: parseFile\(\) not implemented/,
    );
  });

  it('serializes and parses the value as a plain string', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    const w = wire<string>(el);
    expect(w.serialize('b')).toBe('b');
    expect(w.serialize(null as unknown as string)).toBe('');
    expect(w.parse('c')).toBe('c');
  });

  it('drops its document listeners when disconnected', () => {
    const el = mount<ESelect>(`<e-select>${FRUITS}</e-select>`);
    selTrigger(el).click();
    const host = el.parentElement!;
    el.remove();

    clickOutside();
    expect(selMenu(el).hidden).toBe(false);

    host.appendChild(el);
    clickOutside();
    expect(selMenu(el).hidden).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * e-input-number
 * ------------------------------------------------------------------ */

const numInput = (el: EInputNumber): HTMLInputElement => el.querySelector('input')!;
const stepper = (el: EInputNumber, dir: '1' | '-1'): HTMLButtonElement =>
  el.querySelector<HTMLButtonElement>(`[data-step="${dir}"]`)!;

describe('e-input-number · initial render', () => {
  it('projects value, bounds, step and aria-label onto the native input', () => {
    const el = mount<EInputNumber>(
      `<e-input-number value="3" min="0" max="10" step="2" aria-label="Quantity"></e-input-number>`,
    );
    const input = numInput(el);
    expect(input.className).toBe('ink-number__input');
    expect(input.type).toBe('number');
    expect(input.value).toBe('3');
    expect(input.getAttribute('min')).toBe('0');
    expect(input.getAttribute('max')).toBe('10');
    expect(input.step).toBe('2');
    expect(input.getAttribute('aria-label')).toBe('Quantity');
    expect(el.value).toBe('3');

    expect(stepper(el, '-1').getAttribute('aria-label')).toBe('Decrement');
    expect(stepper(el, '-1').querySelector('svg path')!.getAttribute('d')).toBe(ICONS.minus);
    expect(stepper(el, '1').getAttribute('aria-label')).toBe('Increment');
    expect(stepper(el, '1').querySelector('svg path')!.getAttribute('d')).toBe(ICONS.plus);
  });

  it('falls back to default-value and drops unusable min/max/step', () => {
    const el = mount<EInputNumber>(
      `<e-input-number default-value="5" min="abc" max="" step="0"></e-input-number>`,
    );
    const input = numInput(el);
    expect(input.value).toBe('5');
    expect(input.hasAttribute('min')).toBe(false);
    expect(input.hasAttribute('max')).toBe(false);
    expect(input.step).toBe('1');
  });

  it('omits aria-label when the host has none', () => {
    const el = mount<EInputNumber>(`<e-input-number></e-input-number>`);
    expect(numInput(el).hasAttribute('aria-label')).toBe(false);
    expect(numInput(el).value).toBe('');
  });
});

describe('e-input-number · stepping', () => {
  it('increments and decrements, mirroring into the attribute and FormData', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-input-number name="n" value="3" step="1"></e-input-number></form>`,
    );
    const el = form.querySelector<EInputNumber>('e-input-number')!;
    const detail = listen<{ value: number }>(el, 'e-change');

    stepper(el, '1').click();
    expect(el.value).toBe('4');
    expect(el.getAttribute('value')).toBe('4');
    expect(new FormData(form).get('n')).toBe('4');
    expect(detail).toEqual([{ value: 4 }]);

    stepper(el, '-1').click();
    expect(el.value).toBe('3');
    expect(detail).toEqual([{ value: 4 }, { value: 3 }]);
  });

  it('clamps at max and at min', () => {
    const el = mount<EInputNumber>(
      `<e-input-number value="10" min="0" max="10" step="1"></e-input-number>`,
    );
    stepper(el, '1').click();
    expect(el.value).toBe('10');

    el.value = '0';
    stepper(el, '-1').click();
    expect(el.value).toBe('0');
  });

  it('honours a fractional step', () => {
    const el = mount<EInputNumber>(`<e-input-number value="1" step="0.5"></e-input-number>`);
    stepper(el, '1').click();
    expect(el.value).toBe('1.5');
  });

  it('steps up from an empty value', () => {
    const el = mount<EInputNumber>(`<e-input-number step="1" min="0"></e-input-number>`);
    stepper(el, '1').click();
    expect(el.value).toBe('1');
  });

  it('ignores clicks that miss a stepper', () => {
    const el = mount<EInputNumber>(`<e-input-number value="3"></e-input-number>`);
    const detail = listen<{ value: number }>(el, 'e-change');
    el.querySelector('.ink-number')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(detail).toEqual([]);
    expect(el.value).toBe('3');
  });

  it('repeats while held and stops on mouseup', () => {
    vi.useFakeTimers();
    try {
      const el = mount<EInputNumber>(`<e-input-number value="0" step="1"></e-input-number>`);
      stepper(el, '1').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(el.value).toBe('0');

      vi.advanceTimersByTime(400);
      expect(el.value).toBe('0');

      vi.advanceTimersByTime(200);
      expect(el.value).toBe('1');

      vi.advanceTimersByTime(400);
      expect(el.value).toBe('3');

      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      vi.advanceTimersByTime(1000);
      expect(el.value).toBe('3');
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels a pending repeat when the pointer leaves before it starts', () => {
    vi.useFakeTimers();
    try {
      const el = mount<EInputNumber>(`<e-input-number value="0" step="1"></e-input-number>`);
      stepper(el, '-1').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      vi.advanceTimersByTime(200);
      el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      vi.advanceTimersByTime(2000);
      expect(el.value).toBe('0');
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores a mousedown that misses a stepper and a stray touchend', () => {
    vi.useFakeTimers();
    try {
      const el = mount<EInputNumber>(`<e-input-number value="4" step="1"></e-input-number>`);
      numInput(el).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      el.dispatchEvent(new Event('touchend', { bubbles: true }));
      el.dispatchEvent(new Event('touchcancel', { bubbles: true }));
      vi.advanceTimersByTime(2000);
      expect(el.value).toBe('4');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('e-input-number · native input events', () => {
  it('tracks input without emitting, then emits on change', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-input-number name="n" value="1"></e-input-number></form>`,
    );
    const el = form.querySelector<EInputNumber>('e-input-number')!;
    const detail = listen<{ value: number }>(el, 'e-change');

    numInput(el).value = '42';
    numInput(el).dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.value).toBe('42');
    expect(new FormData(form).get('n')).toBe('42');
    expect(detail).toEqual([]);

    numInput(el).dispatchEvent(new Event('change', { bubbles: true }));
    expect(detail).toEqual([{ value: 42 }]);
    expect(el.getAttribute('value')).toBe('42');
  });
});

describe('e-input-number · attribute mutation after mount', () => {
  it('patches value, min, max and step in both directions', () => {
    const el = mount<EInputNumber>(`<e-input-number value="3"></e-input-number>`);
    const input = numInput(el);

    el.setAttribute('value', '8');
    expect(input.value).toBe('8');
    expect(el.value).toBe('8');

    el.setAttribute('min', '2');
    expect(input.getAttribute('min')).toBe('2');
    el.setAttribute('min', 'nope');
    expect(input.hasAttribute('min')).toBe(false);
    el.setAttribute('min', '1');
    el.removeAttribute('min');
    expect(input.hasAttribute('min')).toBe(false);

    el.setAttribute('max', '9');
    expect(input.getAttribute('max')).toBe('9');
    el.setAttribute('max', '');
    expect(input.hasAttribute('max')).toBe(false);

    el.setAttribute('step', '5');
    expect(input.step).toBe('5');
    el.setAttribute('step', '-3');
    expect(input.step).toBe('1');
    el.removeAttribute('step');
    expect(input.step).toBe('1');

    el.removeAttribute('value');
    expect(input.value).toBe('');
  });

  it('patches aria-label in both directions', () => {
    const el = mount<EInputNumber>(`<e-input-number aria-label="Count"></e-input-number>`);
    el.setAttribute('aria-label', 'Amount');
    expect(numInput(el).getAttribute('aria-label')).toBe('Amount');
    el.removeAttribute('aria-label');
    expect(numInput(el).hasAttribute('aria-label')).toBe(false);
  });

  it('ignores attribute writes before the element is wired', () => {
    const el = document.createElement('e-input-number') as EInputNumber;
    el.setAttribute('value', '7');
    el.setAttribute('min', '1');
    expect(el.querySelector('input')).toBeNull();

    document.body.appendChild(el);
    mounted.push(el);
    expect(numInput(el).value).toBe('7');
    expect(numInput(el).getAttribute('min')).toBe('1');
  });
});

describe('e-input-number · validity', () => {
  it('uses required-message and flags aria-invalid on the native input', () => {
    const el = mount<EInputNumber>(
      `<e-input-number required required-message="Enter a quantity."></e-input-number>`,
    );
    expect(numInput(el).required).toBe(true);
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('Enter a quantity.');
    expect(numInput(el).getAttribute('aria-invalid')).toBe('true');

    el.value = '5';
    expect(el.checkValidity()).toBe(true);
    expect(numInput(el).hasAttribute('aria-invalid')).toBe(false);
  });

  it('falls back to the native valueMissing message without required-message', () => {
    const el = mount<EInputNumber>(`<e-input-number></e-input-number>`);
    el.setAttribute('required', '');
    expect(numInput(el).required).toBe(true);
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe(numInput(el).validationMessage);

    el.removeAttribute('required');
    expect(numInput(el).required).toBe(false);
    expect(el.checkValidity()).toBe(true);
  });

  it('mirrors rangeUnderflow, rangeOverflow and stepMismatch from the native input', () => {
    const under = mount<EInputNumber>(`<e-input-number value="1" min="5"></e-input-number>`);
    expect(under.validity.rangeUnderflow).toBe(true);
    expect(under.checkValidity()).toBe(false);
    expect(under.validationMessage).toBe(numInput(under).validationMessage);

    const over = mount<EInputNumber>(`<e-input-number value="99" max="5"></e-input-number>`);
    expect(over.validity.rangeOverflow).toBe(true);

    const mismatch = mount<EInputNumber>(
      `<e-input-number value="3" min="0" step="2"></e-input-number>`,
    );
    expect(mismatch.validity.stepMismatch).toBe(true);
  });
});

describe('e-input-number · form participation', () => {
  it('resets to default-value and restores form state', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-input-number name="n" value="9" default-value="2"></e-input-number></form>`,
    );
    const el = form.querySelector<EInputNumber>('e-input-number')!;
    expect(new FormData(form).get('n')).toBe('9');

    form.reset();
    expect(el.value).toBe('2');
    expect(numInput(el).value).toBe('2');

    el.formStateRestoreCallback('6');
    expect(el.value).toBe('6');
    expect(new FormData(form).get('n')).toBe('6');
  });

  it('coerces a null assignment to the empty value', () => {
    const el = mount<EInputNumber>(`<e-input-number value="3"></e-input-number>`);
    (el as unknown as { value: unknown }).value = null;
    expect(el.getAttribute('value')).toBe('');
    expect(numInput(el).value).toBe('');
  });

  it('serializes and parses as a plain string', () => {
    const el = mount<EInputNumber>(`<e-input-number></e-input-number>`);
    const w = wire<string>(el);
    expect(w.serialize('12')).toBe('12');
    expect(w.serialize(null as unknown as string)).toBe('');
    expect(w.parse('12')).toBe('12');
  });
});

/* ------------------------------------------------------------------ *
 * e-cascader
 * ------------------------------------------------------------------ */

const GEO = JSON.stringify([
  {
    value: 'eu',
    label: 'Europe',
    children: [
      { value: 'de', label: 'Germany' },
      { value: 'fr', label: 'France' },
    ],
  },
  { value: 'as', label: 'Asia', children: [{ value: 'jp', label: 'Japan' }] },
  { value: 'an', label: 'Antarctica' },
]);

const cascaderMarkup = (attrs = ''): string => `<e-cascader data='${GEO}' ${attrs}></e-cascader>`;

const casTrigger = (el: ECascader): HTMLButtonElement =>
  el.querySelector<HTMLButtonElement>('[data-trigger]')!;
const casMenu = (el: ECascader): HTMLElement =>
  el.querySelector<HTMLElement>('.ink-cascader__menu')!;
const casCols = (el: ECascader): HTMLElement[] => [
  ...el.querySelectorAll<HTMLElement>('.ink-cascader__col'),
];
const casItems = (el: ECascader, level: number): HTMLElement[] => [
  ...casCols(el)[level]!.querySelectorAll<HTMLElement>('.ink-cascader__item'),
];
const casChain = (el: ECascader): string[] =>
  [...casTrigger(el).firstElementChild!.children].map((c) => c.textContent ?? '');

describe('e-cascader · initial render', () => {
  it('builds one column per resolved path level and paints the trigger chain', () => {
    const el = mount<ECascader>(cascaderMarkup(`value="eu,de"`));
    expect(casTrigger(el).getAttribute('aria-haspopup')).toBe('listbox');
    expect(casTrigger(el).getAttribute('aria-expanded')).toBe('false');
    expect(casMenu(el).hidden).toBe(true);
    expect(casChain(el)).toEqual(['Europe', '/', 'Germany']);
    expect(el.value).toBe('eu,de');

    const cols = casCols(el);
    expect(cols).toHaveLength(2);
    expect(cols[0]!.getAttribute('role')).toBe('listbox');
    expect(cols[0]!.getAttribute('aria-label')).toBe('Select… level 1');
    expect(cols[1]!.getAttribute('aria-label')).toBe('Select… level 2');

    const roots = casItems(el, 0);
    expect(roots.map((i) => i.dataset['value'])).toEqual(['eu', 'as', 'an']);
    expect(roots.map((i) => i.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(roots.map((i) => i.dataset['level'])).toEqual(['0', '0', '0']);
    expect(roots.map((i) => i.tabIndex)).toEqual([-1, -1, -1]);
    expect(roots[0]!.getAttribute('role')).toBe('option');
    expect(roots[0]!.querySelector('svg path')!.getAttribute('d')).toBe(ICONS.chevR);
    expect(roots[2]!.querySelector('svg')).toBeNull();

    expect(casItems(el, 1).map((i) => i.textContent)).toEqual(['Germany', 'France']);
  });

  it('renders the placeholder span when nothing is selected', () => {
    const el = mount<ECascader>(cascaderMarkup(`placeholder="Region"`));
    const span = casTrigger(el).firstElementChild!.firstElementChild as HTMLElement;
    expect(span.textContent).toBe('Region');
    expect(span.style.fontWeight).toBe('400');
    expect(casCols(el)).toHaveLength(1);
    expect(casItems(el, 0).every((i) => i.getAttribute('aria-selected') === 'false')).toBe(true);
  });

  it('stops the trigger chain at the first unknown segment', () => {
    const el = mount<ECascader>(cascaderMarkup(`value="eu,zz"`));
    expect(casChain(el)).toEqual(['Europe']);
    expect(casCols(el)).toHaveLength(2);
  });

  it('reads the legacy options attribute when data is absent', () => {
    const el = mount<ECascader>(`<e-cascader options='${GEO}' value="as,jp"></e-cascader>`);
    expect(casChain(el)).toEqual(['Asia', '/', 'Japan']);
  });

  it('degrades to an empty menu and reports malformed JSON', () => {
    const errors = listen<{ error: Error; source: string }>(document, 'e-error');
    const el = mount<ECascader>(`<e-cascader data='{oops'></e-cascader>`);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.source).toBe('data');
    expect(errors[0]!.error).toBeInstanceOf(SyntaxError);
    expect(casCols(el)).toHaveLength(1);
    expect(casItems(el, 0)).toEqual([]);
    expect(casChain(el)).toEqual(['Select…']);
  });

  it('rejects well-formed JSON that is not a node list', () => {
    const errors = listen<{ error: Error; source: string }>(document, 'e-error');
    const el = mount<ECascader>(`<e-cascader options='[{"id":1}]'></e-cascader>`);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.source).toBe('options');
    expect(errors[0]!.error.message).toBe('Expected an array of cascader options.');
    expect(casItems(el, 0)).toEqual([]);
  });
});

describe('e-cascader · pointer interaction', () => {
  it('opens the menu and focuses the deepest column', () => {
    const el = mount<ECascader>(cascaderMarkup(`value="eu,de"`));
    casTrigger(el).click();
    expect(casMenu(el).hidden).toBe(false);
    expect(casTrigger(el).getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(casItems(el, 1)[0]);

    casTrigger(el).click();
    expect(casMenu(el).hidden).toBe(true);
    expect(casTrigger(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens onto the first item when the deepest column has no selection', () => {
    const el = mount<ECascader>(cascaderMarkup());
    casTrigger(el).click();
    expect(document.activeElement).toBe(casItems(el, 0)[0]);
  });

  it('does not move focus when the column is empty', () => {
    const el = mount<ECascader>(`<e-cascader data='[]'></e-cascader>`);
    casTrigger(el).click();
    expect(casMenu(el).hidden).toBe(false);
    expect(el.contains(document.activeElement)).toBe(false);
  });

  it('drills into a branch without closing or emitting', () => {
    const el = mount<ECascader>(cascaderMarkup());
    const detail = listen<{ value: string[] }>(el, 'e-change');
    casTrigger(el).click();

    casItems(el, 0)[0]!.click();
    expect(detail).toEqual([]);
    expect(casMenu(el).hidden).toBe(false);
    expect(casCols(el)).toHaveLength(2);
    expect(casChain(el)).toEqual(['Europe']);
    expect(casItems(el, 0).map((i) => i.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(el.getAttribute('value')).toBeNull();
  });

  it('commits a leaf, emits the whole path and closes', () => {
    const el = mount<ECascader>(cascaderMarkup());
    const detail = listen<{ value: string[] }>(el, 'e-change');
    casTrigger(el).click();
    casItems(el, 0)[0]!.click();
    casItems(el, 1)[1]!.click();

    expect(detail).toEqual([{ value: ['eu', 'fr'] }]);
    expect(el.getAttribute('value')).toBe('eu,fr');
    expect(el.value).toBe('eu,fr');
    expect(casChain(el)).toEqual(['Europe', '/', 'France']);
    expect(casMenu(el).hidden).toBe(true);
    expect(casTrigger(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('commits a top-level leaf as a one-segment path', () => {
    const el = mount<ECascader>(cascaderMarkup(`value="eu,de"`));
    const detail = listen<{ value: string[] }>(el, 'e-change');
    casTrigger(el).click();
    casItems(el, 0)[2]!.click();

    expect(detail).toEqual([{ value: ['an'] }]);
    expect(el.value).toBe('an');
    expect(casCols(el)).toHaveLength(1);
    expect(casChain(el)).toEqual(['Antarctica']);
  });

  it('ignores menu clicks that miss an item', () => {
    const el = mount<ECascader>(cascaderMarkup());
    const detail = listen<{ value: string[] }>(el, 'e-change');
    casTrigger(el).click();
    casMenu(el).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(detail).toEqual([]);
    expect(casMenu(el).hidden).toBe(false);
  });

  it('closes on an outside mousedown', () => {
    const el = mount<ECascader>(cascaderMarkup());
    casTrigger(el).click();
    casMenu(el).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(casMenu(el).hidden).toBe(false);

    clickOutside();
    expect(casMenu(el).hidden).toBe(true);
    expect(casTrigger(el).getAttribute('aria-expanded')).toBe('false');
  });
});

describe('e-cascader · keyboard interaction', () => {
  it('opens on ArrowDown, Enter and Space', () => {
    for (const key of ['ArrowDown', 'Enter', ' ']) {
      const el = mount<ECascader>(cascaderMarkup());
      const ev = press(casTrigger(el), key);
      expect(ev.defaultPrevented).toBe(true);
      expect(casMenu(el).hidden).toBe(false);
      expect(document.activeElement).toBe(casItems(el, 0)[0]);
    }
  });

  it('leaves the menu open when the trigger key repeats', () => {
    const el = mount<ECascader>(cascaderMarkup());
    press(casTrigger(el), 'ArrowDown');
    press(casTrigger(el), 'Enter');
    expect(casMenu(el).hidden).toBe(false);
  });

  it('ignores unrelated trigger keys', () => {
    const el = mount<ECascader>(cascaderMarkup());
    const ev = press(casTrigger(el), 'ArrowUp');
    expect(ev.defaultPrevented).toBe(false);
    expect(casMenu(el).hidden).toBe(true);
  });

  it('wraps within a column with ArrowDown/ArrowUp and jumps with Home/End', () => {
    const el = mount<ECascader>(cascaderMarkup());
    casTrigger(el).click();
    const items = casItems(el, 0);

    pressActive('ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    pressActive('End');
    expect(document.activeElement).toBe(items[2]);
    pressActive('ArrowDown');
    expect(document.activeElement).toBe(items[0]);
    pressActive('ArrowUp');
    expect(document.activeElement).toBe(items[2]);
    pressActive('Home');
    expect(document.activeElement).toBe(items[0]);
  });

  it('moves right into a child column and left back out', () => {
    const el = mount<ECascader>(cascaderMarkup());
    casTrigger(el).click();

    const right = pressActive('ArrowRight');
    expect(right.defaultPrevented).toBe(true);
    expect(casCols(el)).toHaveLength(2);
    expect(document.activeElement).toBe(casItems(el, 1)[0]);
    expect(casChain(el)).toEqual(['Europe']);

    pressActive('ArrowLeft');
    expect(document.activeElement).toBe(casItems(el, 0)[0]);

    // ArrowLeft at the root column has nowhere to go.
    pressActive('ArrowLeft');
    expect(document.activeElement).toBe(casItems(el, 0)[0]);
  });

  it('ignores ArrowRight on a leaf', () => {
    const el = mount<ECascader>(cascaderMarkup());
    casTrigger(el).click();
    casItems(el, 0)[2]!.focus();
    pressActive('ArrowRight');
    expect(casCols(el)).toHaveLength(1);
    expect(document.activeElement).toBe(casItems(el, 0)[2]);
  });

  it('activates the focused item with Enter and with Space', () => {
    const el = mount<ECascader>(cascaderMarkup());
    const detail = listen<{ value: string[] }>(el, 'e-change');
    casTrigger(el).click();
    pressActive('ArrowRight');
    pressActive('Enter');
    expect(detail).toEqual([{ value: ['eu', 'de'] }]);

    casTrigger(el).click();
    casItems(el, 0)[2]!.focus();
    pressActive(' ');
    expect(detail).toEqual([{ value: ['eu', 'de'] }, { value: ['an'] }]);
  });

  it('ignores keys outside an item and items pointing at a missing column', () => {
    const el = mount<ECascader>(cascaderMarkup());
    casTrigger(el).click();
    press(casMenu(el), 'ArrowDown');
    expect(el.contains(document.activeElement)).toBe(true);

    const item = casItems(el, 0)[0]!;
    item.focus();
    item.dataset['level'] = '9';
    pressActive('ArrowDown');
    expect(document.activeElement).toBe(item);
  });

  it('closes on Escape and restores focus to the trigger', () => {
    const el = mount<ECascader>(cascaderMarkup());
    casTrigger(el).click();
    escapeOnDocument();
    expect(casMenu(el).hidden).toBe(true);
    expect(casTrigger(el).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(casTrigger(el));

    escapeOnDocument();
    expect(casMenu(el).hidden).toBe(true);
  });
});

describe('e-cascader · attribute mutation after mount', () => {
  it('reuses an unchanged column and rebuilds only the ones that differ', () => {
    const el = mount<ECascader>(
      `<e-cascader data='[{"value":"a","label":"A","children":[{"value":"a1","label":"A1"}]},{"value":"b","label":"B","children":[{"value":"b1","label":"B1"}]}]' value="a"></e-cascader>`,
    );
    const rootCol = casCols(el)[0];
    expect(casItems(el, 1).map((i) => i.textContent)).toEqual(['A1']);

    el.setAttribute('value', 'b');
    expect(casCols(el)[0]).toBe(rootCol);
    expect(casItems(el, 0).map((i) => i.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    expect(casItems(el, 1).map((i) => i.textContent)).toEqual(['B1']);
  });

  it('drops surplus columns when the path shortens', () => {
    const el = mount<ECascader>(cascaderMarkup(`value="eu,de"`));
    expect(casCols(el)).toHaveLength(2);
    el.setAttribute('value', '');
    expect(casCols(el)).toHaveLength(1);
    expect(casChain(el)).toEqual(['Select…']);
    expect(el.value).toBe('');
  });

  it('rebuilds from a replacement data attribute', () => {
    const el = mount<ECascader>(cascaderMarkup(`value="eu,de"`));
    el.setAttribute('data', '[{"value":"x","label":"Xanadu"}]');
    expect(casItems(el, 0).map((i) => i.textContent)).toEqual(['Xanadu']);
    expect(casCols(el)).toHaveLength(1);
    expect(casChain(el)).toEqual(['Select…']);
  });

  it('falls back to an empty tree when data becomes malformed', () => {
    const el = mount<ECascader>(cascaderMarkup(`value="eu,de"`));
    const errors = listen<{ error: Error; source: string }>(el, 'e-error');
    el.setAttribute('data', 'not json');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.source).toBe('data');
    expect(casItems(el, 0)).toEqual([]);
  });

  it('repaints the trigger and column labels when the placeholder changes', () => {
    const el = mount<ECascader>(cascaderMarkup());
    el.setAttribute('placeholder', 'Where?');
    expect(casChain(el)).toEqual(['Where?']);

    el.setAttribute('value', 'an');
    expect(casChain(el)).toEqual(['Antarctica']);
    el.setAttribute('placeholder', 'Ignored');
    expect(casChain(el)).toEqual(['Antarctica']);
  });

  it('short-circuits an unchanged attribute write', () => {
    const el = mount<ECascader>(cascaderMarkup(`value="eu,de"`));
    const col = casCols(el)[1];
    el.setAttribute('value', 'eu,de');
    expect(casCols(el)[1]).toBe(col);
  });

  it('ignores attribute writes before the element is wired', () => {
    const el = document.createElement('e-cascader') as ECascader;
    el.setAttribute('data', GEO);
    el.setAttribute('value', 'as,jp');
    expect(el.children).toHaveLength(0);

    document.body.appendChild(el);
    mounted.push(el);
    expect(casChain(el)).toEqual(['Asia', '/', 'Japan']);
  });
});

describe('e-cascader · validity and form participation', () => {
  it('mirrors required onto the trigger and honours required-message', () => {
    const el = mount<ECascader>(cascaderMarkup(`required`));
    expect(casTrigger(el).getAttribute('aria-required')).toBe('true');
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('Please select an option.');

    el.setAttribute('required-message', 'Pick a region.');
    expect(el.validationMessage).toBe('Pick a region.');

    el.value = 'an';
    expect(el.checkValidity()).toBe(true);

    el.removeAttribute('required');
    expect(casTrigger(el).getAttribute('aria-required')).toBe('false');
  });

  it('submits the comma-joined path and resets to default-value', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-cascader name="region" data='${GEO}' value="eu,de" default-value="as,jp"></e-cascader></form>`,
    );
    const el = form.querySelector<ECascader>('e-cascader')!;
    expect(new FormData(form).get('region')).toBe('eu,de');

    form.reset();
    expect(el.value).toBe('as,jp');
    expect(casChain(el)).toEqual(['Asia', '/', 'Japan']);
    expect(new FormData(form).get('region')).toBe('as,jp');
  });

  it('restores a path from form state', () => {
    const el = mount<ECascader>(cascaderMarkup(`name="region"`));
    el.formStateRestoreCallback('eu,fr');
    expect(el.value).toBe('eu,fr');
    expect(casChain(el)).toEqual(['Europe', '/', 'France']);
  });

  it('serializes and parses the path as a plain string', () => {
    const el = mount<ECascader>(cascaderMarkup());
    const w = wire<string>(el);
    expect(w.serialize('eu,de')).toBe('eu,de');
    expect(w.serialize(null as unknown as string)).toBe('');
    expect(w.parse('eu,de')).toBe('eu,de');
  });

  it('drops its document listeners when disconnected', () => {
    const el = mount<ECascader>(cascaderMarkup());
    const host = el.parentElement!;
    casTrigger(el).click();
    el.remove();

    clickOutside();
    expect(casMenu(el).hidden).toBe(false);

    host.appendChild(el);
    clickOutside();
    expect(casMenu(el).hidden).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * e-date-picker
 * ------------------------------------------------------------------ */

const dpTrigger = (el: EDatePicker): HTMLButtonElement =>
  el.querySelector<HTMLButtonElement>('[data-trigger]')!;
const dpPop = (el: EDatePicker): HTMLElement =>
  el.querySelector<HTMLElement>('.ink-datepicker__pop')!;
const dpTitle = (el: EDatePicker): string =>
  el.querySelector<HTMLElement>('.ink-datepicker__nav-title')!.textContent ?? '';
const dpCells = (el: EDatePicker): HTMLButtonElement[] => [
  ...el.querySelectorAll<HTMLButtonElement>('.ink-datepicker__cell'),
];
const dpCell = (el: EDatePicker, day: number): HTMLButtonElement =>
  dpCells(el).find((c) => c.dataset['day'] === String(day))!;
const monthLabel = (y: number, m: number, locale?: string): string =>
  `${new Date(y, m, 1).toLocaleString(locale, { month: 'long' })} ${y}`;
const activeDay = (): string | null => document.activeElement!.getAttribute('data-day');

describe('e-date-picker · initial render', () => {
  it('renders a labelled dialog, a full 6×7 grid and the selected day', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    const trigger = dpTrigger(el);
    const pop = dpPop(el);

    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(pop.id);
    expect(pop.getAttribute('role')).toBe('dialog');
    expect(pop.getAttribute('aria-label')).toBe('Choose date');
    expect(pop.hidden).toBe(true);

    expect(trigger.firstElementChild!.textContent).toBe('2026-01-15');
    expect(el.value).toBe('2026-01-15');
    expect(dpTitle(el)).toBe(monthLabel(2026, 0));
    expect([...el.querySelectorAll('.ink-datepicker__dow')].map((d) => d.textContent)).toEqual([
      'S',
      'M',
      'T',
      'W',
      'T',
      'F',
      'S',
    ]);
    expect(dpCells(el)).toHaveLength(42);

    const selected = dpCell(el, 15);
    expect(selected.getAttribute('aria-selected')).toBe('true');
    expect(selected.getAttribute('role')).toBe('gridcell');
    expect(selected.getAttribute('aria-label')).toBe(new Date(2026, 0, 15).toLocaleDateString());
    expect(dpCells(el).filter((c) => c.tabIndex === 0)).toEqual([selected]);

    // January 2026 starts on a Thursday, so the first four cells are padding.
    const padding = dpCells(el).filter((c) => c.disabled);
    expect(padding.length).toBe(42 - 31);
    expect(padding[0]!.textContent).toBe('');
    expect(padding[0]!.hasAttribute('aria-selected')).toBe(false);
    expect(padding[0]!.hasAttribute('aria-label')).toBe(false);
    expect(padding[0]!.dataset['day']).toBeUndefined();
  });

  it('shows the placeholder span when no value is set', () => {
    const el = mount<EDatePicker>(`<e-date-picker></e-date-picker>`);
    const span = dpTrigger(el).firstElementChild!.firstElementChild as HTMLElement;
    expect(span.textContent).toBe('YYYY-MM-DD');
    expect(span.style.fontWeight).toBe('400');
    expect(el.value).toBe('');
  });

  it('honours a custom placeholder', () => {
    const el = mount<EDatePicker>(`<e-date-picker placeholder="Pick a day"></e-date-picker>`);
    expect(dpTrigger(el).firstElementChild!.textContent).toBe('Pick a day');
  });

  it('discards a malformed value and falls back to the current month', () => {
    const today = new Date();
    for (const bad of ['2026-13-01', '2026-02-30', 'yesterday', '2026-1-5']) {
      const el = mount<EDatePicker>(`<e-date-picker value="${bad}"></e-date-picker>`);
      expect(el.value).toBe('');
      expect(dpTrigger(el).firstElementChild!.textContent).toBe('YYYY-MM-DD');
      expect(dpTitle(el)).toBe(monthLabel(today.getFullYear(), today.getMonth()));
    }
  });

  it('marks today with data-today in the current month', () => {
    const el = mount<EDatePicker>(`<e-date-picker></e-date-picker>`);
    const today = new Date();
    expect(dpCell(el, today.getDate()).dataset['today']).toBe('true');
    expect(dpCells(el).filter((c) => c.dataset['today'] === 'true')).toHaveLength(1);
    expect(dpCells(el).filter((c) => c.tabIndex === 0)).toEqual([dpCell(el, today.getDate())]);
  });

  it('formats the nav title with the host lang', () => {
    const el = mount<EDatePicker>(`<e-date-picker lang="de" value="2026-01-15"></e-date-picker>`);
    expect(dpTitle(el)).toBe(monthLabel(2026, 0, 'de'));
    expect(dpCell(el, 15).getAttribute('aria-label')).toBe(
      new Date(2026, 0, 15).toLocaleDateString('de'),
    );
  });

  it('falls back to the document lang', () => {
    document.documentElement.lang = 'fr';
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    expect(dpTitle(el)).toBe(monthLabel(2026, 0, 'fr'));
  });
});

describe('e-date-picker · pointer interaction', () => {
  it('toggles the popover and focuses the selected day', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    dpTrigger(el).click();
    expect(dpPop(el).hidden).toBe(false);
    expect(dpTrigger(el).getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(dpCell(el, 15));

    dpTrigger(el).click();
    expect(dpPop(el).hidden).toBe(true);
    expect(dpTrigger(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('focuses today when the view has no selection', () => {
    const el = mount<EDatePicker>(`<e-date-picker></e-date-picker>`);
    dpTrigger(el).click();
    expect(activeDay()).toBe(String(new Date().getDate()));
  });

  it('falls back to the first day of a month that holds neither', () => {
    const el = mount<EDatePicker>(`<e-date-picker></e-date-picker>`);
    dpTrigger(el).click();
    pressActive('PageUp');
    expect(activeDay()).toBe('1');
  });

  it('steps months with the nav buttons, wrapping both year boundaries', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    dpTrigger(el).click();
    const prev = el.querySelector<HTMLButtonElement>('[data-step="-1"]')!;
    const next = el.querySelector<HTMLButtonElement>('[data-step="1"]')!;
    expect(prev.getAttribute('aria-label')).toBe('Previous month');
    expect(next.getAttribute('aria-label')).toBe('Next month');
    expect(prev.querySelector('svg path')!.getAttribute('d')).toBe(ICONS.chevL);
    expect(next.querySelector('svg path')!.getAttribute('d')).toBe(ICONS.chevR);

    prev.click();
    expect(dpTitle(el)).toBe(monthLabel(2025, 11));
    next.click();
    expect(dpTitle(el)).toBe(monthLabel(2026, 0));

    for (let i = 0; i < 12; i++) next.click();
    expect(dpTitle(el)).toBe(monthLabel(2027, 0));
    expect(el.value).toBe('2026-01-15');
  });

  it('commits a clicked day, emits, closes and restores focus', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    const detail = listen<{ value: string }>(el, 'e-change');
    dpTrigger(el).click();

    dpCell(el, 3).click();
    expect(detail).toEqual([{ value: '2026-01-03' }]);
    expect(el.getAttribute('value')).toBe('2026-01-03');
    expect(el.value).toBe('2026-01-03');
    expect(dpTrigger(el).firstElementChild!.textContent).toBe('2026-01-03');
    expect(dpCell(el, 3).getAttribute('aria-selected')).toBe('true');
    expect(dpCell(el, 15).getAttribute('aria-selected')).toBe('false');
    expect(dpPop(el).hidden).toBe(true);
    expect(document.activeElement).toBe(dpTrigger(el));
  });

  it('ignores clicks on disabled padding cells and on the popover chrome', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    const detail = listen<{ value: string }>(el, 'e-change');
    dpTrigger(el).click();

    dpCells(el)
      .find((c) => c.disabled)!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    dpPop(el).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(detail).toEqual([]);
    expect(dpPop(el).hidden).toBe(false);
  });

  it('closes on an outside mousedown', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    dpTrigger(el).click();
    dpPop(el).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(dpPop(el).hidden).toBe(false);

    clickOutside();
    expect(dpPop(el).hidden).toBe(true);
  });
});

describe('e-date-picker · keyboard interaction', () => {
  it('opens on ArrowDown, Enter and Space and ignores other keys', () => {
    for (const key of ['ArrowDown', 'Enter', ' ']) {
      const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
      const ev = press(dpTrigger(el), key);
      expect(ev.defaultPrevented).toBe(true);
      expect(dpPop(el).hidden).toBe(false);
      expect(activeDay()).toBe('15');
    }

    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    const ev = press(dpTrigger(el), 'Escape');
    expect(ev.defaultPrevented).toBe(false);
    expect(dpPop(el).hidden).toBe(true);
  });

  it('walks days and weeks, paging the view across month boundaries', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-31"></e-date-picker>`);
    dpTrigger(el).click();
    expect(activeDay()).toBe('31');

    pressActive('ArrowRight');
    expect(dpTitle(el)).toBe(monthLabel(2026, 1));
    expect(activeDay()).toBe('1');

    pressActive('ArrowLeft');
    expect(dpTitle(el)).toBe(monthLabel(2026, 0));
    expect(activeDay()).toBe('31');

    pressActive('ArrowUp');
    expect(activeDay()).toBe('24');

    pressActive('ArrowDown');
    expect(activeDay()).toBe('31');
  });

  it('moves to the ends of the week row with Home and End', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    dpTrigger(el).click();
    const column = (): number =>
      dpCells(el).indexOf(document.activeElement as HTMLButtonElement) % 7;

    pressActive('Home');
    expect(column()).toBe(0);
    expect(activeDay()).toBe('11');

    pressActive('End');
    expect(column()).toBe(6);
    expect(activeDay()).toBe('17');
  });

  it('pages whole months with PageUp and PageDown', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    dpTrigger(el).click();

    pressActive('PageUp');
    expect(dpTitle(el)).toBe(monthLabel(2025, 11));
    pressActive('PageDown');
    expect(dpTitle(el)).toBe(monthLabel(2026, 0));
    expect(activeDay()).toBe('15');
  });

  it('commits the focused day with Enter and with Space', () => {
    const enterEl = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    const enterDetail = listen<{ value: string }>(enterEl, 'e-change');
    dpTrigger(enterEl).click();
    pressActive('Enter');
    expect(enterDetail).toEqual([{ value: '2026-01-15' }]);

    const spaceEl = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    const spaceDetail = listen<{ value: string }>(spaceEl, 'e-change');
    dpTrigger(spaceEl).click();
    pressActive('ArrowRight');
    pressActive(' ');
    expect(spaceDetail).toEqual([{ value: '2026-01-16' }]);
  });

  it('ignores grid keys while the popover is closed and on padding cells', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    expect(dpPop(el).hidden).toBe(true);
    press(dpCell(el, 15), 'ArrowRight');
    expect(dpTitle(el)).toBe(monthLabel(2026, 0));

    dpTrigger(el).click();
    press(
      dpCells(el).find((c) => c.disabled)!,
      'ArrowRight',
    );
    expect(activeDay()).toBe('15');
  });

  it('closes on Escape and restores focus to the trigger', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    dpTrigger(el).click();
    escapeOnDocument();
    expect(dpPop(el).hidden).toBe(true);
    expect(document.activeElement).toBe(dpTrigger(el));

    escapeOnDocument();
    expect(dpPop(el).hidden).toBe(true);
  });
});

describe('e-date-picker · attribute mutation after mount', () => {
  it('repaints the trigger, grid and view when value changes', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    el.setAttribute('value', '2026-03-07');
    expect(dpTitle(el)).toBe(monthLabel(2026, 2));
    expect(dpTrigger(el).firstElementChild!.textContent).toBe('2026-03-07');
    expect(dpCell(el, 7).getAttribute('aria-selected')).toBe('true');

    el.value = '2026-03-08';
    expect(dpCell(el, 8).getAttribute('aria-selected')).toBe('true');
    expect(dpCell(el, 7).getAttribute('aria-selected')).toBe('false');
  });

  it('reverts to the placeholder when the value becomes invalid or is removed', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    el.setAttribute('value', 'garbage');
    expect(el.value).toBe('');
    expect(dpTrigger(el).firstElementChild!.textContent).toBe('YYYY-MM-DD');
    expect(dpTitle(el)).toBe(monthLabel(2026, 0));

    el.setAttribute('value', '2026-01-15');
    el.removeAttribute('value');
    expect(el.value).toBe('');
    expect(dpTrigger(el).firstElementChild!.textContent).toBe('YYYY-MM-DD');
  });

  it('patches the cached placeholder span in place', () => {
    const el = mount<EDatePicker>(`<e-date-picker></e-date-picker>`);
    const span = dpTrigger(el).firstElementChild!.firstElementChild;
    el.setAttribute('placeholder', 'Choose a date');
    expect(dpTrigger(el).firstElementChild!.firstElementChild).toBe(span);
    expect(span!.textContent).toBe('Choose a date');

    el.removeAttribute('placeholder');
    expect(span!.textContent).toBe('YYYY-MM-DD');

    el.setAttribute('value', '2026-01-15');
    el.setAttribute('placeholder', 'Hidden while set');
    expect(dpTrigger(el).firstElementChild!.textContent).toBe('2026-01-15');
  });

  it('ignores attribute writes before the element is wired', () => {
    const el = document.createElement('e-date-picker') as EDatePicker;
    el.setAttribute('value', '2026-05-04');
    el.setAttribute('placeholder', 'Later');
    expect(el.children).toHaveLength(0);

    document.body.appendChild(el);
    mounted.push(el);
    expect(el.value).toBe('2026-05-04');
    expect(dpTitle(el)).toBe(monthLabel(2026, 4));
  });
});

describe('e-date-picker · validity and form participation', () => {
  it('mirrors required onto the trigger and honours required-message', () => {
    const el = mount<EDatePicker>(`<e-date-picker required></e-date-picker>`);
    expect(dpTrigger(el).getAttribute('aria-required')).toBe('true');
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('Please select a date.');

    el.setAttribute('required-message', 'A date is required.');
    expect(el.validationMessage).toBe('A date is required.');

    el.value = '2026-01-15';
    expect(el.checkValidity()).toBe(true);

    el.removeAttribute('required');
    expect(dpTrigger(el).getAttribute('aria-required')).toBe('false');
  });

  it('round-trips through FormData and resets to default-value', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-date-picker name="d" value="2026-01-15" default-value="2026-02-02"></e-date-picker></form>`,
    );
    const el = form.querySelector<EDatePicker>('e-date-picker')!;
    expect(new FormData(form).get('d')).toBe('2026-01-15');

    form.reset();
    expect(el.value).toBe('2026-02-02');
    expect(dpTitle(el)).toBe(monthLabel(2026, 1));
    expect(new FormData(form).get('d')).toBe('2026-02-02');
  });

  it('restores a date from form state and rejects a bad one', () => {
    const el = mount<EDatePicker>(`<e-date-picker name="d"></e-date-picker>`);
    el.formStateRestoreCallback('2026-07-04');
    expect(el.value).toBe('2026-07-04');

    el.formStateRestoreCallback('not-a-date');
    expect(el.value).toBe('');
  });

  it('serializes and parses the value as a plain string', () => {
    const el = mount<EDatePicker>(`<e-date-picker></e-date-picker>`);
    const w = wire<string>(el);
    expect(w.serialize('2026-01-15')).toBe('2026-01-15');
    expect(w.serialize(null as unknown as string)).toBe('');
    expect(w.parse('2026-01-15')).toBe('2026-01-15');
  });

  it('drops its document listeners when disconnected', () => {
    const el = mount<EDatePicker>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    const host = el.parentElement!;
    dpTrigger(el).click();
    el.remove();

    clickOutside();
    expect(dpPop(el).hidden).toBe(false);

    host.appendChild(el);
    clickOutside();
    expect(dpPop(el).hidden).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * e-time-picker
 * ------------------------------------------------------------------ */

const tpCell = (el: ETimePicker, axis: 'h' | 'm'): HTMLElement =>
  el.querySelector<HTMLElement>(`[data-cell="${axis}"]`)!;
const tpStep = (el: ETimePicker, axis: 'h' | 'm', dir: '1' | '-1'): HTMLButtonElement =>
  el.querySelector<HTMLButtonElement>(`[data-axis="${axis}"][data-dir="${dir}"]`)!;
const tpRead = (el: ETimePicker): string =>
  `${tpCell(el, 'h').textContent}:${tpCell(el, 'm').textContent}`;

describe('e-time-picker · initial render', () => {
  it('renders two spinbuttons with the padded value', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="9:30"></e-time-picker>`);
    // "9:30" does not match HH:MM, so it normalises to the documented default.
    expect(el.value).toBe('00:00');
    expect(el.getAttribute('value')).toBe('00:00');

    const h = tpCell(el, 'h');
    const m = tpCell(el, 'm');
    expect(h.getAttribute('role')).toBe('spinbutton');
    expect(h.getAttribute('aria-label')).toBe('Hours');
    expect(h.getAttribute('aria-valuemin')).toBe('0');
    expect(h.getAttribute('aria-valuemax')).toBe('23');
    expect(h.getAttribute('aria-valuenow')).toBe('0');
    expect(h.tabIndex).toBe(0);
    expect(m.getAttribute('aria-label')).toBe('Minutes');
    expect(m.getAttribute('aria-valuemax')).toBe('59');
    expect(el.querySelector('.ink-timepicker__sep')!.textContent).toBe(':');
    expect(tpRead(el)).toBe('00:00');
  });

  it('accepts a well-formed value and exposes the steppers', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="09:30"></e-time-picker>`);
    expect(el.value).toBe('09:30');
    expect(tpRead(el)).toBe('09:30');
    expect(tpCell(el, 'h').getAttribute('aria-valuenow')).toBe('9');
    expect(tpCell(el, 'm').getAttribute('aria-valuenow')).toBe('30');

    expect(tpStep(el, 'h', '1').getAttribute('aria-label')).toBe('Hour up');
    expect(tpStep(el, 'h', '-1').getAttribute('aria-label')).toBe('Hour down');
    expect(tpStep(el, 'm', '1').getAttribute('aria-label')).toBe('Minute up');
    expect(tpStep(el, 'm', '-1').getAttribute('aria-label')).toBe('Minute down');
    expect(tpStep(el, 'h', '1').tabIndex).toBe(-1);
    expect(tpStep(el, 'h', '1').querySelector('svg path')!.getAttribute('d')).toBe(ICONS.chevU);
    expect(tpStep(el, 'h', '-1').querySelector('svg path')!.getAttribute('d')).toBe(ICONS.chevD);
  });

  it('clamps out-of-range hours and minutes to the default', () => {
    expect(mount<ETimePicker>(`<e-time-picker value="24:00"></e-time-picker>`).value).toBe('00:00');
    expect(mount<ETimePicker>(`<e-time-picker value="10:60"></e-time-picker>`).value).toBe('00:00');
    expect(mount<ETimePicker>(`<e-time-picker value=""></e-time-picker>`).value).toBe('00:00');
    expect(mount<ETimePicker>(`<e-time-picker value="23:59"></e-time-picker>`).value).toBe('23:59');
  });
});

describe('e-time-picker · stepping', () => {
  it('steps hours and minutes with the buttons', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="09:30"></e-time-picker>`);
    const detail = listen<{ value: string }>(el, 'e-change');

    tpStep(el, 'h', '1').click();
    expect(el.value).toBe('10:30');
    expect(tpRead(el)).toBe('10:30');
    expect(detail).toEqual([{ value: '10:30' }]);

    tpStep(el, 'm', '-1').click();
    expect(el.value).toBe('10:29');
    expect(tpCell(el, 'm').getAttribute('aria-valuenow')).toBe('29');
  });

  it('wraps at both the 24-hour and 60-minute boundaries', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="00:00"></e-time-picker>`);
    tpStep(el, 'h', '-1').click();
    expect(el.value).toBe('23:00');
    tpStep(el, 'h', '1').click();
    expect(el.value).toBe('00:00');

    tpStep(el, 'm', '-1').click();
    expect(el.value).toBe('00:59');
    tpStep(el, 'm', '1').click();
    expect(el.value).toBe('00:00');
  });

  it('ignores clicks that miss a stepper', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="09:30"></e-time-picker>`);
    const detail = listen<{ value: string }>(el, 'e-change');
    el.querySelector('.ink-timepicker__sep')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(detail).toEqual([]);
    expect(el.value).toBe('09:30');
  });
});

describe('e-time-picker · keyboard interaction', () => {
  it('steps with ArrowUp/ArrowDown and keeps focus on the cell', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="09:30"></e-time-picker>`);
    const detail = listen<{ value: string }>(el, 'e-change');

    const up = press(tpCell(el, 'h'), 'ArrowUp');
    expect(up.defaultPrevented).toBe(true);
    expect(el.value).toBe('10:30');
    expect(document.activeElement).toBe(tpCell(el, 'h'));

    press(tpCell(el, 'm'), 'ArrowDown');
    expect(el.value).toBe('10:29');
    expect(document.activeElement).toBe(tpCell(el, 'm'));
    expect(detail).toEqual([{ value: '10:30' }, { value: '10:29' }]);
  });

  it('moves between the two cells with ArrowLeft and ArrowRight', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="09:30"></e-time-picker>`);
    press(tpCell(el, 'h'), 'ArrowRight');
    expect(document.activeElement).toBe(tpCell(el, 'm'));

    press(tpCell(el, 'm'), 'ArrowLeft');
    expect(document.activeElement).toBe(tpCell(el, 'h'));
    expect(el.value).toBe('09:30');
  });

  it('jumps each axis to its bounds with Home and End', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="09:30"></e-time-picker>`);
    const detail = listen<{ value: string }>(el, 'e-change');

    press(tpCell(el, 'h'), 'End');
    expect(el.value).toBe('23:30');
    press(tpCell(el, 'h'), 'Home');
    expect(el.value).toBe('00:30');
    press(tpCell(el, 'm'), 'End');
    expect(el.value).toBe('00:59');
    press(tpCell(el, 'm'), 'Home');
    expect(el.value).toBe('00:00');
    expect(detail.map((d) => d.value)).toEqual(['23:30', '00:30', '00:59', '00:00']);
  });

  it('ignores unrelated keys and keys outside a cell', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="09:30"></e-time-picker>`);
    const detail = listen<{ value: string }>(el, 'e-change');

    const other = press(tpCell(el, 'h'), 'x');
    expect(other.defaultPrevented).toBe(false);

    press(el.querySelector('.ink-timepicker')!, 'ArrowUp');
    expect(detail).toEqual([]);
    expect(el.value).toBe('09:30');
  });
});

describe('e-time-picker · attribute mutation and form participation', () => {
  it('normalises a bad value written after mount', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="09:30"></e-time-picker>`);
    el.setAttribute('value', '99:99');
    expect(el.getAttribute('value')).toBe('00:00');
    expect(el.value).toBe('00:00');
    expect(tpRead(el)).toBe('00:00');

    el.removeAttribute('value');
    expect(el.value).toBe('00:00');
  });

  it('mirrors required onto the hour cell and stays satisfiable', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="09:30"></e-time-picker>`);
    expect(tpCell(el, 'h').getAttribute('aria-required')).toBe('false');

    el.setAttribute('required', '');
    expect(tpCell(el, 'h').getAttribute('aria-required')).toBe('true');
    // The default `00:00` always satisfies the constraint, as documented.
    expect(el.checkValidity()).toBe(true);

    el.setAttribute('required-message', 'A time is required.');
    expect(el.checkValidity()).toBe(true);

    el.removeAttribute('required');
    expect(tpCell(el, 'h').getAttribute('aria-required')).toBe('false');
  });

  it('coerces a null assignment to the default time', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="09:30"></e-time-picker>`);
    (el as unknown as { value: unknown }).value = null;
    expect(el.value).toBe('00:00');
    expect(el.getAttribute('value')).toBe('00:00');
  });

  it('round-trips through FormData and resets to default-value', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-time-picker name="t" value="09:30" default-value="07:15"></e-time-picker></form>`,
    );
    const el = form.querySelector<ETimePicker>('e-time-picker')!;
    expect(new FormData(form).get('t')).toBe('09:30');

    form.reset();
    expect(el.value).toBe('07:15');
    expect(tpRead(el)).toBe('07:15');
    expect(new FormData(form).get('t')).toBe('07:15');
  });

  it('resets to midnight without a default-value', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-time-picker name="t" value="09:30"></e-time-picker></form>`,
    );
    const el = form.querySelector<ETimePicker>('e-time-picker')!;
    form.reset();
    expect(el.value).toBe('00:00');
    expect(tpRead(el)).toBe('00:00');
  });

  it('restores and normalises form state', () => {
    const el = mount<ETimePicker>(`<e-time-picker name="t"></e-time-picker>`);
    el.formStateRestoreCallback('18:45');
    expect(el.value).toBe('18:45');
    expect(tpRead(el)).toBe('18:45');

    el.formStateRestoreCallback('nonsense');
    expect(el.value).toBe('00:00');
  });

  it('serializes to HH:MM and parses through the normaliser', () => {
    const el = mount<ETimePicker>(`<e-time-picker></e-time-picker>`);
    const w = wire<string>(el);
    expect(w.serialize('09:30')).toBe('09:30');
    expect(w.serialize(null as unknown as string)).toBe('00:00');
    expect(w.parse('09:30')).toBe('09:30');
    expect(w.parse('44:44')).toBe('00:00');
  });

  it('stops responding once disconnected and resumes when re-attached', () => {
    const el = mount<ETimePicker>(`<e-time-picker value="09:30"></e-time-picker>`);
    const host = el.parentElement!;
    el.remove();

    tpStep(el, 'h', '1').click();
    expect(el.value).toBe('09:30');

    host.appendChild(el);
    tpStep(el, 'h', '1').click();
    expect(el.value).toBe('10:30');
  });
});

/* ------------------------------------------------------------------ *
 * Shared tree helpers
 * ------------------------------------------------------------------ */

const TREE_DATA = JSON.stringify([
  {
    value: 'src',
    label: 'src',
    children: [
      { value: 'app', label: 'app.ts' },
      {
        value: 'lib',
        label: 'lib',
        children: [
          { value: 'a', label: 'a.ts' },
          { value: 'b', label: 'b.ts' },
        ],
      },
    ],
  },
  { value: 'readme', label: 'README.md' },
]);

const rows = (el: HTMLElement): HTMLElement[] => [
  ...el.querySelectorAll<HTMLElement>('.ink-tree__row'),
];
const rowFor = (el: HTMLElement, value: string): HTMLElement =>
  el.querySelector<HTMLElement>(`.ink-tree__row[data-value="${value}"]`)!;
const rowValues = (el: HTMLElement): string[] => rows(el).map((r) => r.dataset['value'] ?? '');
const groupOf = (el: HTMLElement, value: string): HTMLUListElement =>
  rowFor(el, value).parentElement!.querySelector<HTMLUListElement>(':scope > ul')!;
const expander = (el: HTMLElement, value: string): HTMLButtonElement =>
  el.querySelector<HTMLButtonElement>(`[data-expand="${value}"]`)!;
const tabStops = (el: HTMLElement): string[] =>
  rows(el)
    .filter((r) => r.tabIndex === 0)
    .map((r) => r.dataset['value'] ?? '');

/* ------------------------------------------------------------------ *
 * e-tree-select
 * ------------------------------------------------------------------ */

describe('e-tree-select · initial render', () => {
  it('renders a role=tree with lazily materialised children', () => {
    const el = mount<ETreeSelect>(`<e-tree-select data='${TREE_DATA}'></e-tree-select>`);
    const tree = el.querySelector('[role="tree"]')!;
    expect(tree.tagName).toBe('UL');
    expect(tree.className).toBe('ink-tree');

    expect(rowValues(el)).toEqual(['src', 'readme']);
    expect(rowFor(el, 'src').getAttribute('role')).toBe('treeitem');
    expect(rowFor(el, 'src').getAttribute('aria-level')).toBe('1');
    expect(rowFor(el, 'src').getAttribute('aria-expanded')).toBe('false');
    expect(rowFor(el, 'src').getAttribute('aria-selected')).toBe('false');
    expect(rowFor(el, 'src').style.paddingLeft).toBe('10px');
    expect(rowFor(el, 'readme').querySelector('.ink-tree__leaf-spacer')).not.toBeNull();
    expect(expander(el, 'src').getAttribute('aria-label')).toBe('Expand src');
    expect(expander(el, 'src').querySelector('svg path')!.getAttribute('d')).toBe(ICONS.plus);
    expect(groupOf(el, 'src').hidden).toBe(true);
    expect(groupOf(el, 'src').children).toHaveLength(0);
    expect(tabStops(el)).toEqual(['src']);
  });

  it('honours default-expanded and value', () => {
    const el = mount<ETreeSelect>(
      `<e-tree-select data='${TREE_DATA}' default-expanded="src" value="app"></e-tree-select>`,
    );
    expect(rowValues(el)).toEqual(['src', 'app', 'lib', 'readme']);
    expect(groupOf(el, 'src').hidden).toBe(false);
    expect(rowFor(el, 'app').getAttribute('aria-selected')).toBe('true');
    expect(rowFor(el, 'app').getAttribute('aria-level')).toBe('2');
    expect(rowFor(el, 'app').style.paddingLeft).toBe('30px');
    expect(expander(el, 'src').getAttribute('aria-label')).toBe('Collapse src');
    expect(expander(el, 'src').querySelector('svg path')!.getAttribute('d')).toBe(ICONS.minus);
    expect(tabStops(el)).toEqual(['app']);
    expect(el.value).toBe('app');
  });

  it('degrades to an empty tree and reports malformed JSON', () => {
    const errors = listen<{ error: Error; source: string }>(document, 'e-error');
    const el = mount<ETreeSelect>(`<e-tree-select data='[[['></e-tree-select>`);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.source).toBe('data');
    expect(errors[0]!.error).toBeInstanceOf(SyntaxError);
    expect(rows(el)).toEqual([]);
    expect(el.querySelector('[role="tree"]')).not.toBeNull();
  });

  it('reads the options alias and reports its own source', () => {
    const ok = mount<ETreeSelect>(`<e-tree-select options='${TREE_DATA}'></e-tree-select>`);
    expect(rowValues(ok)).toEqual(['src', 'readme']);

    const errors = listen<{ error: Error; source: string }>(document, 'e-error');
    const bad = mount<ETreeSelect>(`<e-tree-select options='["nope"]'></e-tree-select>`);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.source).toBe('options');
    expect(errors[0]!.error.message).toBe('Expected an array of tree nodes.');
    expect(rows(bad)).toEqual([]);
  });
});

describe('e-tree-select · interaction', () => {
  it('selects a row, emits and moves the selection marker', () => {
    const el = mount<ETreeSelect>(
      `<e-tree-select data='${TREE_DATA}' default-expanded="src"></e-tree-select>`,
    );
    const detail = listen<{ value: string }>(el, 'e-change');

    rowFor(el, 'app').click();
    expect(detail).toEqual([{ value: 'app' }]);
    expect(el.getAttribute('value')).toBe('app');
    expect(el.value).toBe('app');
    expect(rowFor(el, 'app').getAttribute('aria-selected')).toBe('true');
    expect(tabStops(el)).toEqual(['app']);

    rowFor(el, 'readme').click();
    expect(detail).toEqual([{ value: 'app' }, { value: 'readme' }]);
    expect(rowFor(el, 'app').getAttribute('aria-selected')).toBe('false');
    expect(rowFor(el, 'readme').getAttribute('aria-selected')).toBe('true');
  });

  it('materialises children on first expand and only toggles hidden afterwards', () => {
    const el = mount<ETreeSelect>(`<e-tree-select data='${TREE_DATA}'></e-tree-select>`);
    const detail = listen<{ value: string }>(el, 'e-change');

    expander(el, 'src').click();
    expect(groupOf(el, 'src').hidden).toBe(false);
    expect(rowValues(el)).toEqual(['src', 'app', 'lib', 'readme']);
    expect(rowFor(el, 'src').getAttribute('aria-expanded')).toBe('true');
    expect(expander(el, 'src').getAttribute('aria-label')).toBe('Collapse src');
    // Expanding must not be mistaken for selecting.
    expect(detail).toEqual([]);

    const appRow = rowFor(el, 'app');
    expander(el, 'src').click();
    expect(groupOf(el, 'src').hidden).toBe(true);
    expander(el, 'src').click();
    expect(rowFor(el, 'app')).toBe(appRow);
  });

  it('ignores clicks outside the tree rows', () => {
    const el = mount<ETreeSelect>(`<e-tree-select data='${TREE_DATA}'></e-tree-select>`);
    const detail = listen<{ value: string }>(el, 'e-change');
    el.querySelector('[role="tree"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(detail).toEqual([]);
  });

  it('walks visible rows with ArrowDown/ArrowUp/Home/End', () => {
    const el = mount<ETreeSelect>(
      `<e-tree-select data='${TREE_DATA}' default-expanded="src"></e-tree-select>`,
    );
    rowFor(el, 'src').focus();

    pressActive('ArrowDown');
    expect(document.activeElement).toBe(rowFor(el, 'app'));
    pressActive('End');
    expect(document.activeElement).toBe(rowFor(el, 'readme'));
    pressActive('ArrowDown');
    expect(document.activeElement).toBe(rowFor(el, 'readme'));
    pressActive('ArrowUp');
    expect(document.activeElement).toBe(rowFor(el, 'lib'));
    pressActive('Home');
    expect(document.activeElement).toBe(rowFor(el, 'src'));
    pressActive('ArrowUp');
    expect(document.activeElement).toBe(rowFor(el, 'src'));
    expect(tabStops(el)).toEqual(['src']);
  });

  it('expands with ArrowRight, then steps into the first child', () => {
    const el = mount<ETreeSelect>(`<e-tree-select data='${TREE_DATA}'></e-tree-select>`);
    rowFor(el, 'src').focus();

    pressActive('ArrowRight');
    expect(groupOf(el, 'src').hidden).toBe(false);
    expect(document.activeElement).toBe(rowFor(el, 'src'));

    pressActive('ArrowRight');
    expect(document.activeElement).toBe(rowFor(el, 'app'));

    // A leaf swallows ArrowRight without preventing the default.
    const leaf = pressActive('ArrowRight');
    expect(leaf.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(rowFor(el, 'app'));
  });

  it('collapses with ArrowLeft, then climbs to the parent', () => {
    const el = mount<ETreeSelect>(
      `<e-tree-select data='${TREE_DATA}' default-expanded="src,lib"></e-tree-select>`,
    );
    rowFor(el, 'a').focus();

    pressActive('ArrowLeft');
    expect(document.activeElement).toBe(rowFor(el, 'lib'));

    pressActive('ArrowLeft');
    expect(groupOf(el, 'lib').hidden).toBe(true);
    expect(document.activeElement).toBe(rowFor(el, 'lib'));

    pressActive('ArrowLeft');
    expect(document.activeElement).toBe(rowFor(el, 'src'));

    pressActive('ArrowLeft');
    expect(groupOf(el, 'src').hidden).toBe(true);
    expect(tabStops(el)).toEqual(['src']);
  });

  it('activates a row with Enter and with Space and ignores other keys', () => {
    const el = mount<ETreeSelect>(
      `<e-tree-select data='${TREE_DATA}' default-expanded="src"></e-tree-select>`,
    );
    const detail = listen<{ value: string }>(el, 'e-change');

    press(rowFor(el, 'app'), 'Enter');
    press(rowFor(el, 'readme'), ' ');
    expect(detail).toEqual([{ value: 'app' }, { value: 'readme' }]);

    const other = press(rowFor(el, 'readme'), 'x');
    expect(other.defaultPrevented).toBe(false);
    press(el.querySelector('[role="tree"]')!, 'ArrowDown');
    expect(detail).toHaveLength(2);
  });

  it('hands the tab stop to a collapsing ancestor', () => {
    const el = mount<ETreeSelect>(
      `<e-tree-select data='${TREE_DATA}' default-expanded="src"></e-tree-select>`,
    );
    rowFor(el, 'src').focus();
    pressActive('ArrowDown');
    expect(document.activeElement).toBe(rowFor(el, 'app'));
    expect(tabStops(el)).toEqual(['app']);

    expander(el, 'src').click();
    expect(tabStops(el)).toEqual(['src']);
  });
});

describe('e-tree-select · attribute mutation and form participation', () => {
  it('re-renders from a replacement data attribute', () => {
    const el = mount<ETreeSelect>(`<e-tree-select data='${TREE_DATA}'></e-tree-select>`);
    el.setAttribute('data', '[{"value":"only","label":"Only"}]');
    expect(rowValues(el)).toEqual(['only']);

    const errors = listen<{ error: Error; source: string }>(el, 'e-error');
    el.setAttribute('data', 'broken');
    expect(errors).toHaveLength(1);
    expect(rows(el)).toEqual([]);
  });

  it('patches the selection when value changes and clears it when removed', () => {
    const el = mount<ETreeSelect>(
      `<e-tree-select data='${TREE_DATA}' default-expanded="src" value="app"></e-tree-select>`,
    );
    el.setAttribute('value', 'lib');
    expect(rowFor(el, 'app').getAttribute('aria-selected')).toBe('false');
    expect(rowFor(el, 'lib').getAttribute('aria-selected')).toBe('true');

    el.removeAttribute('value');
    expect(rowFor(el, 'lib').getAttribute('aria-selected')).toBe('false');
    expect(el.value).toBe('');
  });

  it('short-circuits an unchanged attribute write and pre-wire writes', () => {
    const el = mount<ETreeSelect>(`<e-tree-select data='${TREE_DATA}'></e-tree-select>`);
    const tree = el.querySelector('[role="tree"]');
    el.setAttribute('data', TREE_DATA);
    expect(el.querySelector('[role="tree"]')).toBe(tree);

    const pre = document.createElement('e-tree-select') as ETreeSelect;
    pre.setAttribute('data', TREE_DATA);
    pre.setAttribute('value', 'readme');
    expect(pre.children).toHaveLength(0);
    document.body.appendChild(pre);
    mounted.push(pre);
    expect(rowFor(pre, 'readme').getAttribute('aria-selected')).toBe('true');
  });

  it('mirrors required onto the tree and honours required-message', () => {
    const el = mount<ETreeSelect>(`<e-tree-select data='${TREE_DATA}' required></e-tree-select>`);
    const tree = el.querySelector('[role="tree"]')!;
    expect(tree.getAttribute('aria-required')).toBe('true');
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('Please select an option.');

    el.setAttribute('required-message', 'Pick a file.');
    expect(el.validationMessage).toBe('Pick a file.');

    el.value = 'readme';
    expect(el.checkValidity()).toBe(true);

    el.removeAttribute('required');
    expect(tree.getAttribute('aria-required')).toBe('false');
  });

  it('round-trips through FormData, resets and restores', () => {
    const form = mount<HTMLFormElement>(
      `<form><e-tree-select name="path" data='${TREE_DATA}' value="readme" default-value="src"></e-tree-select></form>`,
    );
    const el = form.querySelector<ETreeSelect>('e-tree-select')!;
    expect(new FormData(form).get('path')).toBe('readme');

    form.reset();
    expect(el.value).toBe('src');
    expect(rowFor(el, 'src').getAttribute('aria-selected')).toBe('true');

    el.formStateRestoreCallback('readme');
    expect(el.value).toBe('readme');
    expect(new FormData(form).get('path')).toBe('readme');
  });

  it('serializes and parses the value as a plain string', () => {
    const el = mount<ETreeSelect>(`<e-tree-select data='${TREE_DATA}'></e-tree-select>`);
    const w = wire<string>(el);
    expect(w.serialize('readme')).toBe('readme');
    expect(w.serialize(null as unknown as string)).toBe('');
    expect(w.parse('readme')).toBe('readme');
  });

  it('stops handling clicks once disconnected', () => {
    const el = mount<ETreeSelect>(`<e-tree-select data='${TREE_DATA}'></e-tree-select>`);
    const host = el.parentElement!;
    const detail = listen<{ value: string }>(el, 'e-change');
    el.remove();

    rowFor(el, 'readme').click();
    expect(detail).toEqual([]);

    host.appendChild(el);
    rowFor(el, 'readme').click();
    expect(detail).toEqual([{ value: 'readme' }]);
  });
});

/* ------------------------------------------------------------------ *
 * e-tree
 * ------------------------------------------------------------------ */

const checkBox = (el: ETree, value: string): HTMLElement =>
  rowFor(el, value).querySelector<HTMLElement>('.ink-tree__check')!;
const checkGlyph = (el: ETree, value: string): string | null =>
  checkBox(el, value).querySelector('svg path')?.getAttribute('d') ?? null;

describe('e-tree · display mode', () => {
  it('reports activation without marking anything as selected', () => {
    const el = mount<ETree>(`<e-tree data='${TREE_DATA}'></e-tree>`);
    const selected = listen<{ value: string }>(el, 'e-select');

    expect(rowFor(el, 'readme').hasAttribute('aria-selected')).toBe(false);
    expect(rowFor(el, 'readme').querySelector('.ink-tree__check')).toBeNull();

    rowFor(el, 'readme').click();
    expect(selected).toEqual([{ value: 'readme' }]);
    expect(el.getAttribute('value')).toBeNull();
    expect(rowFor(el, 'readme').hasAttribute('aria-selected')).toBe(false);
    expect(el.value).toBe('');
  });

  it('marks the activated row when selectable', () => {
    const el = mount<ETree>(`<e-tree selectable data='${TREE_DATA}'></e-tree>`);
    const selected = listen<{ value: string }>(el, 'e-select');

    rowFor(el, 'readme').click();
    expect(selected).toEqual([{ value: 'readme' }]);
    expect(el.value).toBe('readme');
    expect(rowFor(el, 'readme').getAttribute('aria-selected')).toBe('true');

    el.value = 'src';
    expect(rowFor(el, 'src').getAttribute('aria-selected')).toBe('true');
    expect(rowFor(el, 'readme').getAttribute('aria-selected')).toBe('false');

    (el as unknown as { value: unknown }).value = null;
    expect(el.getAttribute('value')).toBe('');
  });

  it('emits e-expand for both directions', () => {
    const el = mount<ETree>(`<e-tree data='${TREE_DATA}'></e-tree>`);
    const expands = listen<{ value: string; expanded: boolean }>(el, 'e-expand');

    expander(el, 'src').click();
    expander(el, 'src').click();
    expect(expands).toEqual([
      { value: 'src', expanded: true },
      { value: 'src', expanded: false },
    ]);
  });

  it('degrades to an empty tree on malformed data', () => {
    const errors = listen<{ error: Error; source: string }>(document, 'e-error');
    const el = mount<ETree>(`<e-tree data='oops'></e-tree>`);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.source).toBe('data');
    expect(rows(el)).toEqual([]);

    const later = listen<{ error: Error; source: string }>(el, 'e-error');
    el.setAttribute('data', TREE_DATA);
    expect(later).toEqual([]);
    expect(rowValues(el)).toEqual(['src', 'readme']);
  });

  it('navigates with the keyboard', () => {
    const el = mount<ETree>(
      `<e-tree selectable data='${TREE_DATA}' default-expanded="src"></e-tree>`,
    );
    const selected = listen<{ value: string }>(el, 'e-select');
    rowFor(el, 'src').focus();

    pressActive('ArrowDown');
    expect(document.activeElement).toBe(rowFor(el, 'app'));
    pressActive('Enter');
    expect(selected).toEqual([{ value: 'app' }]);
    expect(el.value).toBe('app');

    press(el.querySelector('[role="tree"]')!, 'ArrowDown');
    expect(selected).toHaveLength(1);
  });
});

describe('e-tree · checkable mode', () => {
  it('renders a checkbox per row and cascades a check to the subtree', () => {
    const el = mount<ETree>(
      `<e-tree checkable data='${TREE_DATA}' default-expanded="src,lib"></e-tree>`,
    );
    const checks = listen<{ value: string[] }>(el, 'e-check');

    expect(checkBox(el, 'src').getAttribute('aria-hidden')).toBe('true');
    expect(checkBox(el, 'src').dataset['check']).toBe('src');
    expect(rowFor(el, 'src').getAttribute('aria-checked')).toBe('false');
    expect(rowFor(el, 'src').hasAttribute('aria-selected')).toBe(false);
    expect(checkGlyph(el, 'src')).toBeNull();

    rowFor(el, 'lib').click();
    expect(checks).toEqual([{ value: ['lib', 'a', 'b'] }]);
    expect(el.checkedValues).toEqual(['lib', 'a', 'b']);
    expect(el.getAttribute('checked')).toBe('lib,a,b');
    expect(rowFor(el, 'lib').getAttribute('aria-checked')).toBe('true');
    expect(rowFor(el, 'a').getAttribute('aria-checked')).toBe('true');
    expect(checkGlyph(el, 'a')).toBe(ICONS.check);
    // src still has an unchecked child, so it is partially checked.
    expect(rowFor(el, 'src').getAttribute('aria-checked')).toBe('mixed');
    expect(checkGlyph(el, 'src')).toBe(ICONS.minus);
    expect(rowFor(el, 'readme').getAttribute('aria-checked')).toBe('false');

    rowFor(el, 'app').click();
    expect(el.checkedValues).toEqual(['src', 'app', 'lib', 'a', 'b']);
    expect(rowFor(el, 'src').getAttribute('aria-checked')).toBe('true');
    expect(checkGlyph(el, 'src')).toBe(ICONS.check);
  });

  it('unchecks a whole subtree and re-derives the ancestors', () => {
    const el = mount<ETree>(
      `<e-tree checkable data='${TREE_DATA}' checked="src" default-expanded="src,lib"></e-tree>`,
    );
    expect(el.checkedValues).toEqual(['src', 'app', 'lib', 'a', 'b']);
    expect(rowFor(el, 'b').getAttribute('aria-checked')).toBe('true');

    rowFor(el, 'a').click();
    expect(el.checkedValues).toEqual(['app', 'b']);
    expect(rowFor(el, 'src').getAttribute('aria-checked')).toBe('mixed');
    expect(rowFor(el, 'lib').getAttribute('aria-checked')).toBe('mixed');
  });

  it('takes precedence over selectable for what a click does', () => {
    const el = mount<ETree>(`<e-tree checkable selectable data='${TREE_DATA}'></e-tree>`);
    const selected = listen<{ value: string }>(el, 'e-select');
    rowFor(el, 'readme').click();

    expect(selected).toEqual([{ value: 'readme' }]);
    expect(rowFor(el, 'readme').hasAttribute('aria-selected')).toBe(false);
    expect(rowFor(el, 'readme').getAttribute('aria-checked')).toBe('true');
    expect(el.getAttribute('value')).toBeNull();
  });

  it('seeds from the checked attribute, ignoring unknown values', () => {
    const el = mount<ETree>(
      `<e-tree checkable data='${TREE_DATA}' checked="a,ghost" default-expanded="src,lib"></e-tree>`,
    );
    expect(el.checkedValues).toEqual(['a']);
    expect(rowFor(el, 'lib').getAttribute('aria-checked')).toBe('mixed');

    el.setAttribute('checked', 'readme,b');
    expect(el.checkedValues).toEqual(['b', 'readme']);
    expect(rowFor(el, 'a').getAttribute('aria-checked')).toBe('false');
    expect(rowFor(el, 'readme').getAttribute('aria-checked')).toBe('true');

    el.setAttribute('checked', '');
    expect(el.checkedValues).toEqual([]);
    expect(rowFor(el, 'src').getAttribute('aria-checked')).toBe('false');
  });

  it('paints check marks on rows materialised by a later expand', () => {
    const el = mount<ETree>(`<e-tree checkable data='${TREE_DATA}' checked="src"></e-tree>`);
    expect(rows(el).map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false']);

    expander(el, 'src').click();
    expect(rowFor(el, 'app').getAttribute('aria-checked')).toBe('true');
    expect(checkGlyph(el, 'app')).toBe(ICONS.check);
    expect(rowFor(el, 'lib').getAttribute('aria-checked')).toBe('true');
  });

  it('reseeds and repaints when data is replaced', () => {
    const el = mount<ETree>(`<e-tree checkable data='${TREE_DATA}' checked="readme"></e-tree>`);
    expect(el.checkedValues).toEqual(['readme']);

    el.setAttribute('data', '[{"value":"readme","label":"README"},{"value":"x","label":"X"}]');
    expect(rowValues(el)).toEqual(['readme', 'x']);
    expect(el.checkedValues).toEqual(['readme']);
    expect(rowFor(el, 'readme').getAttribute('aria-checked')).toBe('true');
    expect(rowFor(el, 'x').getAttribute('aria-checked')).toBe('false');
  });

  it('patches aria-checked on rows that predate the checkable switch', () => {
    // `checkable` is not observed, so rows built before it was added carry no
    // box element — the sync must patch aria-checked and skip the glyph.
    const el = mount<ETree>(`<e-tree data='${TREE_DATA}'></e-tree>`);
    expect(rowFor(el, 'readme').querySelector('.ink-tree__check')).toBeNull();

    el.setAttribute('checkable', '');
    el.setAttribute('checked', 'readme');
    expect(rowFor(el, 'readme').getAttribute('aria-checked')).toBe('true');
    expect(rowFor(el, 'readme').querySelector('.ink-tree__check')).toBeNull();
  });

  it('treats checkable="false" as absent', () => {
    const el = mount<ETree>(`<e-tree checkable="false" selectable data='${TREE_DATA}'></e-tree>`);
    rowFor(el, 'readme').click();
    expect(rowFor(el, 'readme').querySelector('.ink-tree__check')).toBeNull();
    expect(rowFor(el, 'readme').getAttribute('aria-selected')).toBe('true');
  });

  it('ignores attribute writes before the element is wired', () => {
    const el = document.createElement('e-tree') as ETree;
    el.setAttribute('checkable', '');
    el.setAttribute('data', TREE_DATA);
    el.setAttribute('checked', 'readme');
    expect(el.children).toHaveLength(0);

    document.body.appendChild(el);
    mounted.push(el);
    expect(el.checkedValues).toEqual(['readme']);
  });

  it('toggles checks from the keyboard too', async () => {
    const el = mount<ETree>(`<e-tree checkable data='${TREE_DATA}'></e-tree>`);
    const checks = listen<{ value: string[] }>(el, 'e-check');
    rowFor(el, 'readme').focus();
    pressActive(' ');
    await settle();

    expect(checks).toEqual([{ value: ['readme'] }]);
    expect(rowFor(el, 'readme').getAttribute('aria-checked')).toBe('true');
  });
});
