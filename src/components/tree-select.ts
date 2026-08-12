import { define, addCleanup, runCleanups, patchAttr, patchBoolAttr } from '../core/dom';
import { iconSvg } from '../core/icons';
import type { TreeNode } from '../core/types';
import { BaseFormControl } from '../core/base-form-control';
import { isTreeData } from '../core/data';

/**
 * @summary Single-select hierarchical tree with expand/collapse controls.
 *
 * Form-associated: submits the selected node's value.
 *
 * @attr {string} [data='[]'] - JSON-encoded array of `{value, label, children?}` nodes. Canonical attribute, shared with `<e-cascader>`.
 * @attr {string} [options='[]'] - Alias for `data` for symmetry with `<e-cascader>`. When both are set, `data` wins.
 * @attr {string} [value] - Currently selected node value.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {string} [default-expanded] - Comma-separated list of node values that are expanded on first render.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user selects a node. `value` is the node's value.
 * @fires {CustomEvent<{error: Error, source: 'data' | 'options'}>} e-error - Fired when the `data` or `options` attribute fails to parse as JSON. The internal tree falls back to `[]`.
 *
 * @example
 * <e-tree-select data='[{"value":"a","label":"A","children":[{"value":"a1","label":"A1"}]}]' default-expanded="a"></e-tree-select>
 */
export class ETreeSelect extends BaseFormControl {
  static observedAttributes = ['value', 'data', 'options'];

  private _data: TreeNode[] = [];
  private _expanded = new Set<string>();
  private _built = false;
  private _rowMap = new Map<string, HTMLElement>();
  private _groupMap = new Map<string, HTMLUListElement>();
  private _expandBtnMap = new Map<string, HTMLButtonElement>();
  private _nodeMap = new Map<string, TreeNode>();

  connectedCallback() {
    if (!this._built) {
      this._parseData();
      this._expanded = new Set(
        (this.getAttribute('default-expanded') || '').split(',').filter(Boolean),
      );
      this._value = this.getAttribute('value') ?? '';
      this.internals.setFormValue(this._value);
      this._build();
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
      this._parseData();
      this._rowMap.clear();
      this._groupMap.clear();
      this._expandBtnMap.clear();
      this._buildTree();
    } else if (name === 'value') {
      const oldVal = old ?? '';
      this._value = val ?? '';
      this.internals.setFormValue(this._value);
      this._patchSelection(oldVal, this._value);
    }
  }

  private _parseData(): void {
    const data = this.getAttribute('data');
    const source: 'data' | 'options' = data != null ? 'data' : 'options';
    const raw = data ?? this.getAttribute('options') ?? '[]';
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isTreeData(parsed)) throw new TypeError('Expected an array of tree nodes.');
      this._data = parsed;
    } catch (err) {
      this._data = [];
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
    this._nodeMap.clear();
    this._indexNodes(this._data);
  }

  private _indexNodes(nodes: TreeNode[]): void {
    for (const node of nodes) {
      this._nodeMap.set(node.value, node);
      if (node.children) this._indexNodes(node.children);
    }
  }

  private _build(): void {
    this._buildTree();
    this._built = true;
  }

  private _buildTree(): void {
    const ul = document.createElement('ul');
    ul.className = 'ink-tree';
    ul.setAttribute('role', 'tree');
    for (const node of this._data) {
      this._buildNode(ul, node, 0);
    }
    this.replaceChildren(ul);
    if (!this._value || !this._rowMap.has(this._value)) {
      const first = ul.querySelector<HTMLElement>('.ink-tree__row');
      if (first) first.tabIndex = 0;
    }
  }

  private _buildNode(parent: HTMLElement, node: TreeNode, depth: number): void {
    const hasKids = !!(node.children && node.children.length > 0);
    const isOpen = this._expanded.has(node.value);
    const isSelected = this._value === node.value;

    const li = document.createElement('li');
    li.setAttribute('role', 'none');

    const row = document.createElement('div');
    row.className = 'ink-tree__row';
    row.dataset['depth'] = String(depth);
    row.dataset['value'] = node.value;
    row.setAttribute('role', 'treeitem');
    row.setAttribute('aria-level', String(depth + 1));
    row.setAttribute('aria-selected', String(isSelected));
    row.tabIndex = isSelected ? 0 : -1;
    row.style.paddingLeft = `${10 + depth * 20}px`;

    if (hasKids) {
      row.setAttribute('aria-expanded', String(isOpen));

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ink-tree__expand';
      btn.dataset['expand'] = node.value;
      btn.tabIndex = -1;
      btn.setAttribute('aria-label', `${isOpen ? 'Collapse' : 'Expand'} ${node.label}`);
      btn.innerHTML = iconSvg(isOpen ? 'minus' : 'plus', 12);
      row.appendChild(btn);
      this._expandBtnMap.set(node.value, btn);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'ink-tree__leaf-spacer';
      row.appendChild(spacer);
    }

    const labelSpan = document.createElement('span');
    labelSpan.textContent = node.label;
    row.appendChild(labelSpan);

    li.appendChild(row);
    this._rowMap.set(node.value, row);

    if (hasKids) {
      const childUl = document.createElement('ul');
      childUl.setAttribute('role', 'group');
      if (isOpen) {
        for (const child of node.children!) {
          this._buildNode(childUl, child, depth + 1);
        }
      }
      childUl.hidden = !isOpen;
      li.appendChild(childUl);
      this._groupMap.set(node.value, childUl);
    }

    parent.appendChild(li);
  }

  private _onClick = (e: Event): void => {
    const expBtn = (e.target as Element).closest<HTMLElement>('[data-expand]');
    if (expBtn) {
      e.stopPropagation();
      this._toggleExpand(expBtn.dataset['expand'] ?? '');
      return;
    }
    const row = (e.target as Element).closest<HTMLElement>('.ink-tree__row');
    if (!row) return;
    const v = row.dataset['value'] ?? '';
    this._selectValue(v);
  };

  private _selectValue(v: string): void {
    this._value = v;
    this.internals.setFormValue(v);
    this.setAttribute('value', v);
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
  }

  private _onKeydown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const row = (ke.target as Element).closest<HTMLElement>('.ink-tree__row');
    if (!row) return;
    const v = row.dataset['value'] ?? '';
    const visible = this._visibleRows();
    const idx = visible.indexOf(row);

    if (ke.key === 'ArrowDown') {
      ke.preventDefault();
      this._focusRow(visible[Math.min(idx + 1, visible.length - 1)]);
    } else if (ke.key === 'ArrowUp') {
      ke.preventDefault();
      this._focusRow(visible[Math.max(idx - 1, 0)]);
    } else if (ke.key === 'Home') {
      ke.preventDefault();
      this._focusRow(visible[0]);
    } else if (ke.key === 'End') {
      ke.preventDefault();
      this._focusRow(visible[visible.length - 1]);
    } else if (ke.key === 'ArrowRight') {
      const node = this._nodeMap.get(v);
      const hasKids = !!(node?.children && node.children.length > 0);
      if (!hasKids) return;
      ke.preventDefault();
      if (!this._expanded.has(v)) {
        this._toggleExpand(v);
      } else {
        const childUl = this._groupMap.get(v);
        const firstChild = childUl?.querySelector<HTMLElement>('.ink-tree__row');
        if (firstChild) this._focusRow(firstChild);
      }
    } else if (ke.key === 'ArrowLeft') {
      ke.preventDefault();
      const node = this._nodeMap.get(v);
      const hasKids = !!(node?.children && node.children.length > 0);
      if (hasKids && this._expanded.has(v)) {
        this._toggleExpand(v);
      } else {
        const parentUl = row.parentElement?.parentElement?.closest<HTMLElement>('li');
        const parentRow = parentUl?.querySelector<HTMLElement>(':scope > .ink-tree__row');
        if (parentRow) this._focusRow(parentRow);
      }
    } else if (ke.key === 'Enter' || ke.key === ' ') {
      ke.preventDefault();
      this._selectValue(v);
    }
  };

  private _focusRow(row: HTMLElement | undefined): void {
    if (!row) return;
    for (const r of this._rowMap.values()) r.tabIndex = -1;
    row.tabIndex = 0;
    row.focus();
  }

  private _visibleRows(): HTMLElement[] {
    const root = this.querySelector<HTMLElement>('.ink-tree');
    if (!root) return [];
    return [...root.querySelectorAll<HTMLElement>('.ink-tree__row')].filter((r) => {
      let p: HTMLElement | null = r.parentElement;
      while (p && p !== root) {
        if (p.tagName === 'UL' && (p as HTMLUListElement).hidden) return false;
        p = p.parentElement;
      }
      return true;
    });
  }

  private _toggleExpand(v: string): void {
    const isOpen = this._expanded.has(v);
    if (isOpen) {
      this._expanded.delete(v);
    } else {
      this._expanded.add(v);
    }
    const newOpen = !isOpen;

    const childUl = this._groupMap.get(v);
    if (childUl) {
      if (newOpen && childUl.children.length === 0) {
        const node = this._nodeMap.get(v);
        if (node?.children) {
          const depth = Number(this._rowMap.get(v)?.dataset['depth'] ?? '0');
          for (const child of node.children) {
            this._buildNode(childUl, child, depth + 1);
          }
        }
      }
      patchBoolAttr(childUl, 'hidden', !newOpen);
    }

    const btn = this._expandBtnMap.get(v);
    if (btn) {
      const node = this._nodeMap.get(v);
      btn.innerHTML = iconSvg(newOpen ? 'minus' : 'plus', 12);
      btn.setAttribute('aria-label', `${newOpen ? 'Collapse' : 'Expand'} ${node?.label ?? v}`);
    }

    const row = this._rowMap.get(v);
    if (row) {
      patchAttr(row, 'aria-expanded', String(newOpen));
    }
  }

  private _patchSelection(oldVal: string, newVal: string): void {
    if (oldVal) {
      const oldRow = this._rowMap.get(oldVal);
      if (oldRow) {
        patchAttr(oldRow, 'aria-selected', 'false');
        oldRow.tabIndex = -1;
      }
    }
    if (newVal) {
      const newRow = this._rowMap.get(newVal);
      if (newRow) {
        patchAttr(newRow, 'aria-selected', 'true');
        newRow.tabIndex = 0;
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
}

define('e-tree-select', ETreeSelect);
