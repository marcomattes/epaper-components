import { define, addCleanup, onGlobal, runCleanups, patchAttr } from '../core/dom';
import { iconSvg } from '../core/icons';
import type { CascaderOption } from '../core/types';
import { BaseFormControl } from '../core/base-form-control';
import { isTreeData } from '../core/data';

/**
 * @summary Multi-column cascading selector for hierarchical options.
 * @since v1.0.1
 *
 * Form-associated: submits the current path joined with `,`.
 *
 * @attr {string} [placeholder='Select…'] - Placeholder shown when no value is selected.
 * @attr {string} [data='[]'] - JSON-encoded array of `{value, label, children?}` nodes. Canonical attribute, shared with `<e-tree-select>`.
 * @attr {string} [options='[]'] - Legacy alias for `data`. When both are set, `data` wins.
 * @attr {string} [value] - Comma-separated value path (e.g. `a,b,c`).
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [required] - Requires a completed selection path.
 * @attr {string} [required-message] - Message reported when no required path is selected.
 *
 * @fires {CustomEvent<{value: string[]}>} e-change - Fired when a leaf node is selected. `value` is the path of node values.
 * @fires {CustomEvent<{error: Error, source: 'data' | 'options'}>} e-error - Fired when the `data` or `options` attribute fails to parse as JSON. The internal options list falls back to `[]`.
 *
 * @example
 * <e-cascader data='[{"value":"eu","label":"Europe","children":[{"value":"de","label":"Germany"}]}]' value="eu,de"></e-cascader>
 */
export class ECascader extends BaseFormControl {
  static readonly observedAttributes = [
    'value',
    'data',
    'options',
    'placeholder',
    'required',
    'required-message',
  ];

  private _options: CascaderOption[] = [];
  private _path: string[] = [];
  private _built = false;
  private _triggerSpan!: HTMLElement;
  private _trigger!: HTMLButtonElement;
  private _menu!: HTMLElement;
  private _colKeys: string[] = [];

  connectedCallback() {
    if (!this._built) {
      this._parseOptions();
      this._path = (this.getAttribute('value') || '').split(',').filter(Boolean);
      this._value = this._path.join(',');
      this.internals.setFormValue(this._value);
      this._build();
      this._syncMenu();
      this._syncTrigger();
      this._syncValidity();
    }
    this._bindEvents();
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null) {
    if (!this._built || old === val) return;
    if (name === 'options' || name === 'data') {
      this._parseOptions();
      this._colKeys = [];
      this._syncMenu();
      this._syncTrigger();
      this._syncValidity();
    } else if (name === 'value') {
      this._path = (val || '').split(',').filter(Boolean);
      this._value = this._path.join(',');
      this.internals.setFormValue(this._value);
      this._syncMenu();
      this._syncTrigger();
      this._syncValidity();
    } else if (name === 'placeholder') {
      this._syncTrigger();
    } else if (name === 'required' || name === 'required-message') {
      this._syncValidity();
    }
  }

  private _parseOptions(): void {
    const data = this.getAttribute('data');
    const source: 'data' | 'options' = data != null ? 'data' : 'options';
    const raw = data ?? this.getAttribute('options') ?? '[]';
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isTreeData(parsed)) throw new TypeError('Expected an array of cascader options.');
      this._options = parsed;
    } catch (err) {
      this._options = [];
      this.dispatchEvent(
        new CustomEvent('e-error', {
          detail: {
            error: err instanceof Error ? err : new Error(String(err)),
            source,
          },
          bubbles: true,
        }),
      );
    }
  }

  private _resolveCols(): CascaderOption[][] {
    const cols: CascaderOption[][] = [this._options];
    for (let i = 0; i < this._path.length; i++) {
      const node = (cols[i] || []).find((o) => o.value === this._path[i]);
      if (node?.children?.length) cols.push(node.children);
      else break;
    }
    return cols;
  }

  private _labelChain(): string[] {
    let cur: CascaderOption[] | undefined = this._options;
    const out: string[] = [];
    for (const v of this._path) {
      const node: CascaderOption | undefined = (cur || []).find((o) => o.value === v);
      if (!node) break;
      out.push(node.label);
      cur = node.children;
    }
    return out;
  }

  private _build(): void {
    const root = document.createElement('div');
    root.className = 'ink-cascader';

    this._trigger = document.createElement('button');
    this._trigger.type = 'button';
    this._trigger.className = 'ink-select__trigger';
    this._trigger.dataset['trigger'] = '';
    this._trigger.setAttribute('aria-haspopup', 'listbox');
    this._trigger.setAttribute('aria-expanded', 'false');

    this._triggerSpan = document.createElement('span');
    this._triggerSpan.style.display = 'inline-flex';
    this._triggerSpan.style.gap = '6px';
    this._triggerSpan.style.flexWrap = 'wrap';
    this._trigger.appendChild(this._triggerSpan);

    const tmp = document.createElement('span');
    tmp.innerHTML = iconSvg('chevD', 18);
    while (tmp.firstChild) this._trigger.appendChild(tmp.firstChild);

    root.appendChild(this._trigger);

    this._menu = document.createElement('div');
    this._menu.className = 'ink-cascader__menu';
    this._menu.hidden = true;
    root.appendChild(this._menu);

    this.replaceChildren(root);
    this._built = true;
  }

  private _bindEvents(): void {
    this._trigger.addEventListener('click', this._onTriggerClick);
    addCleanup(this, () => this._trigger.removeEventListener('click', this._onTriggerClick));

    this._trigger.addEventListener('keydown', this._onTriggerKeydown);
    addCleanup(this, () => this._trigger.removeEventListener('keydown', this._onTriggerKeydown));

    this._menu.addEventListener('click', this._onMenuClick);
    addCleanup(this, () => this._menu.removeEventListener('click', this._onMenuClick));

    this._menu.addEventListener('keydown', this._onMenuKeydown);
    addCleanup(this, () => this._menu.removeEventListener('keydown', this._onMenuKeydown));

    onGlobal(this, document, 'mousedown', (e) => {
      if (!this.contains(e.target as Node)) {
        this._menu.hidden = true;
        this._trigger.setAttribute('aria-expanded', 'false');
      }
    });
    onGlobal(this, document, 'keydown', (e) => {
      if (e.key === 'Escape' && !this._menu.hidden && this.contains(document.activeElement)) {
        this._menu.hidden = true;
        this._trigger.setAttribute('aria-expanded', 'false');
        this._trigger.focus();
      }
    });
  }

  private _onTriggerClick = (): void => {
    const open = this._menu.hidden;
    this._menu.hidden = !open;
    this._trigger.setAttribute('aria-expanded', String(open));
    if (open) this._focusColumn(this._menu.children.length - 1);
  };

  private _onTriggerKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this._menu.hidden) {
        this._menu.hidden = false;
        this._trigger.setAttribute('aria-expanded', 'true');
      }
      this._focusColumn(this._menu.children.length - 1);
    }
  };

  private _focusColumn(level: number): void {
    const ul = this._menu.children[level] as HTMLUListElement | undefined;
    if (!ul) return;
    const items = [...ul.querySelectorAll<HTMLElement>('.ink-cascader__item')];
    if (items.length === 0) return;
    const sel = items.find((i) => i.getAttribute('aria-selected') === 'true');
    (sel ?? items[0])?.focus();
  }

  private _onMenuKeydown = (e: KeyboardEvent): void => {
    const item = (e.target as Element).closest<HTMLElement>('.ink-cascader__item');
    if (!item) return;
    const level = Number(item.dataset['level']);
    const ul = this._menu.children[level] as HTMLUListElement | undefined;
    if (!ul) return;
    const items = [...ul.querySelectorAll<HTMLElement>('.ink-cascader__item')];
    const idx = items.indexOf(item);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items.at(-1)?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const v = item.dataset['value'] ?? '';
      const cols = this._resolveCols();
      const node = (cols[level] || []).find((o) => o.value === v);
      if (node?.children?.length) {
        this._path = [...this._path.slice(0, level), v];
        this._syncMenu();
        this._syncTrigger();
        this._focusColumn(level + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (level > 0) this._focusColumn(level - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      item.click();
    }
  };

  private _onMenuClick = (e: Event): void => {
    const item = (e.target as Element).closest<HTMLElement>('.ink-cascader__item');
    if (!item) return;
    const level = Number(item.dataset['level']);
    const v = item.dataset['value'] ?? '';
    const cols = this._resolveCols();
    const node = (cols[level] || []).find((o) => o.value === v);
    this._path = [...this._path.slice(0, level), v];

    if (!node?.children?.length) {
      this._value = this._path.join(',');
      this.internals.setFormValue(this._value);
      this.setAttribute('value', this._value);
      this.dispatchEvent(
        new CustomEvent('e-change', {
          detail: { value: [...this._path] },
          bubbles: true,
        }),
      );
      this._menu.hidden = true;
      this._trigger.setAttribute('aria-expanded', 'false');
    } else {
      this._syncMenu();
      this._syncTrigger();
    }
  };

  private _buildCol(col: CascaderOption[], level: number): HTMLUListElement {
    const placeholder = this.getAttribute('placeholder') || 'Select…';
    const ul = document.createElement('ul');
    ul.className = 'ink-cascader__col';
    ul.setAttribute('role', 'listbox');
    ul.setAttribute('aria-label', `${placeholder} level ${level + 1}`);

    for (const node of col) {
      const li = document.createElement('li');
      li.className = 'ink-cascader__item';
      li.setAttribute('role', 'option');
      li.tabIndex = -1;
      li.dataset['level'] = String(level);
      li.dataset['value'] = node.value;
      patchAttr(li, 'aria-selected', String(this._path[level] === node.value));

      const span = document.createElement('span');
      span.textContent = node.label;
      li.appendChild(span);

      if (node.children?.length) {
        const tmp = document.createElement('span');
        tmp.innerHTML = iconSvg('chevR', 14);
        while (tmp.firstChild) li.appendChild(tmp.firstChild);
      }

      ul.appendChild(li);
    }
    return ul;
  }

  private _syncMenu(): void {
    const cols = this._resolveCols();

    while (this._menu.children.length > cols.length) {
      this._menu.lastChild!.remove();
    }

    const newKeys: string[] = [];
    for (let level = 0; level < cols.length; level++) {
      const key = cols[level].map((o) => o.value).join('\0');
      newKeys.push(key);

      if (this._colKeys[level] === key) {
        const ul = this._menu.children[level] as HTMLUListElement;
        const items = ul.querySelectorAll<HTMLElement>('.ink-cascader__item');
        for (const li of items) {
          patchAttr(li, 'aria-selected', String(this._path[level] === li.dataset['value']));
        }
      } else {
        const ul = this._buildCol(cols[level], level);
        if (level < this._menu.children.length) {
          this._menu.replaceChild(ul, this._menu.children[level]);
        } else {
          this._menu.appendChild(ul);
        }
      }
    }

    this._colKeys = newKeys;
  }

  private _syncTrigger(): void {
    const chain = this._labelChain();
    const placeholder = this.getAttribute('placeholder') || 'Select…';

    this._triggerSpan.replaceChildren();

    if (chain.length === 0) {
      const span = document.createElement('span');
      span.style.fontWeight = '400';
      span.textContent = placeholder;
      this._triggerSpan.appendChild(span);
    } else {
      for (let i = 0; i < chain.length; i++) {
        if (i > 0) {
          const sep = document.createElement('span');
          sep.setAttribute('aria-hidden', 'true');
          sep.textContent = '/';
          this._triggerSpan.appendChild(sep);
        }
        const span = document.createElement('span');
        span.textContent = chain[i];
        this._triggerSpan.appendChild(span);
      }
    }
  }

  override get value(): string {
    return this._value;
  }
  override set value(v: string) {
    this.setAttribute('value', v ?? '');
  }

  protected serialize(v: string): string {
    return v ?? '';
  }
  protected parse(s: string): string {
    return s;
  }

  override formResetCallback(): void {
    const dflt = this.getAttribute('default-value') ?? '';
    this.setAttribute('value', dflt);
  }

  private _syncValidity(): void {
    this._trigger?.setAttribute('aria-required', String(this.hasAttribute('required')));
    this.applyRequiredValidity(!!this._value, this._trigger, 'Please select an option.');
  }
}

define('e-cascader', ECascader);
