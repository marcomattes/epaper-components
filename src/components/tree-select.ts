import { define, addCleanup, runCleanups } from '../core/dom';
import { BaseFormControl } from '../core/base-form-control';
import { TreeView, parseTreeAttr } from '../core/tree';

/**
 * @summary Single-select hierarchical tree with expand/collapse controls.
 * @since v1.0.1
 *
 * Form-associated: submits the selected node's value.
 *
 * @attr {string} [data='[]'] - JSON-encoded array of `{value, label, children?}` nodes. Canonical attribute, shared with `<e-cascader>`.
 * @attr {string} [options='[]'] - Alias for `data` for symmetry with `<e-cascader>`. When both are set, `data` wins.
 * @attr {string} [value] - Currently selected node value.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {string} [default-expanded] - Comma-separated list of node values that are expanded on first render.
 * @attr {boolean} [required] - Requires a selected tree node.
 * @attr {string} [required-message] - Message reported when no required node is selected.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user selects a node. `value` is the node's value.
 * @fires {CustomEvent<{error: Error, source: 'data' | 'options'}>} e-error - Fired when the `data` or `options` attribute fails to parse as JSON. The internal tree falls back to `[]`.
 *
 * @example
 * <e-tree-select data='[{"value":"a","label":"A","children":[{"value":"a1","label":"A1"}]}]' default-expanded="a"></e-tree-select>
 */
export class ETreeSelect extends BaseFormControl {
  static readonly observedAttributes = ['value', 'data', 'options', 'required', 'required-message'];

  private _built = false;
  private readonly _view = new TreeView(this, {
    onActivate: (value) => this._selectValue(value),
  });

  connectedCallback() {
    if (!this._built) {
      this._loadData();
      this._view.setExpanded(
        (this.getAttribute('default-expanded') || '').split(',').filter(Boolean),
      );
      this._value = this.getAttribute('value') ?? '';
      this._view.setSelectedValue(this._value);
      this.internals.setFormValue(this._value);
      this._view.render();
      this._built = true;
      this._syncValidity();
    }
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
    addCleanup(this, () => this.removeEventListener('keydown', this._onKeydown));
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null) {
    if (!this._built || old === val) return;
    if (name === 'data' || name === 'options') {
      this._loadData();
      this._view.render();
    } else if (name === 'value') {
      const oldVal = old ?? '';
      this._value = val ?? '';
      this.internals.setFormValue(this._value);
      this._view.patchSelection(oldVal, this._value);
      this._syncValidity();
    } else if (name === 'required' || name === 'required-message') {
      this._syncValidity();
    }
  }

  /** Read `data` (preferred) or `options`, reporting parse failures. */
  private _loadData(): void {
    const { data, source, error } = parseTreeAttr(this, ['data', 'options']);
    this._view.setData(data);
    if (error) {
      this.dispatchEvent(new CustomEvent('e-error', { detail: { error, source }, bubbles: true }));
    }
  }

  private readonly _onClick = (e: Event): void => {
    this._view.handleClick(e);
  };

  private readonly _onKeydown = (e: Event): void => {
    this._view.handleKeydown(e as KeyboardEvent);
  };

  private _selectValue(v: string): void {
    this._value = v;
    this.internals.setFormValue(v);
    this.setAttribute('value', v);
    this._syncValidity();
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
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
    const tree = this.querySelector<HTMLElement>('[role="tree"]') ?? undefined;
    tree?.setAttribute('aria-required', String(this.hasAttribute('required')));
    this.applyRequiredValidity(!!this._value, tree, 'Please select an option.');
  }
}

define('e-tree-select', ETreeSelect);
