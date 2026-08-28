import {
  addCleanup,
  boolAttr,
  define,
  EpaperElement,
  patchAttr,
  runCleanups,
} from '../../core/dom';
import { iconSvg } from '../../core/icons';
import { TreeView, collectSubtree, parseTreeAttr } from '../../core/tree';
import type { TreeNode } from '../../core/types';

type CheckState = 'true' | 'false' | 'mixed';

function glyphForCheckState(state: CheckState): string {
  if (state === 'true') return iconSvg('check', 12);
  if (state === 'mixed') return iconSvg('minus', 12);
  return '';
}

/**
 * @summary Hierarchical tree for navigation and display, with optional checkboxes.
 * @since v1.1.0
 *
 * The display counterpart to `<e-tree-select>`: same markup, same keyboard
 * model (arrows, `Home`/`End`, `Enter`/`Space`), but not form-associated. Use
 * it for a file listing, a category browser or a table of contents.
 *
 * Expanding a node materialises its children on first open and toggles
 * `hidden` afterwards, so a deep tree costs one small dirty rectangle per
 * interaction rather than a full re-render.
 *
 * Activation depends on the mode: with `checkable` a row toggles its checkbox
 * and checks cascade to descendants; otherwise with `selectable` a row becomes
 * the selection. Without either the tree is read-only and only reports
 * `e-select` so the host can react.
 *
 * @attr {string} [data='[]'] - JSON-encoded array of `{value, label, children?}` nodes.
 * @attr {string} [default-expanded] - Comma-separated node values expanded on first render.
 * @attr {boolean} [selectable] - Marks the activated row with `aria-selected`.
 * @attr {string} [value] - Selected node value. Only meaningful with `selectable`.
 * @attr {boolean} [checkable] - Renders a checkbox per row. Takes precedence over `selectable` for what a click does.
 * @attr {string} [checked] - Comma-separated values that are checked on first render. Checking a node cascades to its whole subtree.
 *
 * @fires {CustomEvent<{value: string}>} e-select - Fired when a row is activated. `value` is the node's value.
 * @fires {CustomEvent<{value: string, expanded: boolean}>} e-expand - Fired when a node expands or collapses.
 * @fires {CustomEvent<{value: string[]}>} e-check - Fired when checkboxes change. `value` lists every fully checked node, parents included, in document order.
 * @fires {CustomEvent<{error: Error, source: string}>} e-error - Fired when `data` fails to parse as JSON. The tree falls back to `[]`.
 *
 * @example
 * <e-tree checkable data='[{"value":"src","label":"src","children":[{"value":"a","label":"app.ts"}]}]' default-expanded="src"></e-tree>
 */
export class ETree extends EpaperElement {
  static readonly observedAttributes = ['data', 'value', 'checked'];

  private _built = false;
  private _view: TreeView | null = null;
  private _checked = new Set<string>();
  private _order: string[] = [];

  connectedCallback() {
    if (!this._built) {
      const selectionAttr = !this._checkable() && this._selectable() ? 'aria-selected' : null;
      this._view = new TreeView(this, {
        selectionAttr,
        renderRowExtra: (row, node) => this._renderCheckbox(row, node),
        onActivate: (value) => this._activate(value),
        onToggle: (value, expanded) => {
          this.dispatchEvent(
            new CustomEvent('e-expand', { detail: { value, expanded }, bubbles: true }),
          );
        },
      });
      this._loadData();
      this._view.setExpanded(
        (this.getAttribute('default-expanded') || '').split(',').filter(Boolean),
      );
      this._view.setSelectedValue(this.getAttribute('value') ?? '');
      this._seedChecked();
      this._view.render();
      this._syncAllCheckMarks();
      this._built = true;
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
    if (!this._built || old === val || !this._view) return;
    if (name === 'data') {
      this._loadData();
      this._seedChecked();
      this._view.render();
      this._syncAllCheckMarks();
    } else if (name === 'value') {
      this._view.patchSelection(old ?? '', val ?? '');
    } else if (name === 'checked') {
      this._seedChecked();
      this._syncAllCheckMarks();
    }
  }

  /** Values of every fully checked node, in document order. */
  get checkedValues(): string[] {
    return this._order.filter((v) => this._checked.has(v));
  }

  /** Selected node value, or `''` when nothing is selected. */
  get value(): string {
    return this.getAttribute('value') ?? '';
  }
  set value(v: string) {
    this.setAttribute('value', v ?? '');
  }

  private _checkable(): boolean {
    return boolAttr(this, 'checkable');
  }
  private _selectable(): boolean {
    return boolAttr(this, 'selectable');
  }

  private _loadData(): void {
    const { data, source, error } = parseTreeAttr(this, ['data']);
    this._view!.setData(data);
    this._order = data.flatMap((node) => collectSubtree(node));
    if (error) {
      this.dispatchEvent(new CustomEvent('e-error', { detail: { error, source }, bubbles: true }));
    }
  }

  /** Rebuild the checked set from the `checked` attribute, cascading down. */
  private _seedChecked(): void {
    this._checked = new Set();
    const seeds = (this.getAttribute('checked') || '').split(',').filter(Boolean);
    for (const seed of seeds) {
      const node = this._view?.node(seed);
      if (node) for (const v of collectSubtree(node)) this._checked.add(v);
    }
    this._recomputeAncestors();
  }

  private _renderCheckbox(row: HTMLElement, node: TreeNode): void {
    if (!this._checkable()) return;
    const box = document.createElement('span');
    box.className = 'ink-tree__check';
    box.dataset['check'] = node.value;
    box.setAttribute('aria-hidden', 'true');
    row.appendChild(box);
  }

  /** Derived state of a node: fully checked, partially checked, or not. */
  private _checkState(value: string): CheckState {
    if (this._checked.has(value)) return 'true';
    const node = this._view?.node(value);
    if (!node?.children?.length) return 'false';
    const descendants = collectSubtree(node).slice(1);
    return descendants.some((v) => this._checked.has(v)) ? 'mixed' : 'false';
  }

  /**
   * Re-derive every branch node from its children: a parent is checked only
   * when all of its children are, so `mixed` never needs to be stored.
   */
  private _recomputeAncestors(): void {
    const walk = (node: TreeNode): boolean => {
      if (!node.children?.length) return this._checked.has(node.value);
      const all = node.children.map(walk).every(Boolean);
      if (all) this._checked.add(node.value);
      else this._checked.delete(node.value);
      return all;
    };
    for (const node of this._view?.data ?? []) walk(node);
  }

  private _toggleCheck(value: string): void {
    const node = this._view?.node(value);
    if (!node) return;
    const target = this._checkState(value) !== 'true';
    for (const v of collectSubtree(node)) {
      if (target) this._checked.add(v);
      else this._checked.delete(v);
    }
    this._recomputeAncestors();
    this._syncAllCheckMarks();
    this.setAttribute('checked', this.checkedValues.join(','));
    this.dispatchEvent(
      new CustomEvent('e-check', { detail: { value: this.checkedValues }, bubbles: true }),
    );
  }

  /** Paint `aria-checked` and the box glyph for every materialised row. */
  private _syncAllCheckMarks(): void {
    if (!this._checkable() || !this._view) return;
    for (const row of this._view.rows()) {
      const value = row.dataset['value'] ?? '';
      const state = this._checkState(value);
      patchAttr(row, 'aria-checked', state);
      const box = row.querySelector<HTMLElement>('.ink-tree__check');
      if (!box) continue;
      const glyph = glyphForCheckState(state);
      if (box.innerHTML !== glyph) box.innerHTML = glyph;
    }
  }

  private _activate(value: string): void {
    if (this._checkable()) {
      this._toggleCheck(value);
    } else if (this._selectable()) {
      // The attribute is the single source of truth; the marker is repainted
      // from attributeChangedCallback.
      this.setAttribute('value', value);
    }
    this.dispatchEvent(new CustomEvent('e-select', { detail: { value }, bubbles: true }));
  }

  private readonly _onClick = (e: Event): void => {
    this._view?.handleClick(e);
    // Expanding materialises new rows; paint their check marks in the same turn.
    this._syncAllCheckMarks();
  };

  private readonly _onKeydown = (e: Event): void => {
    this._view?.handleKeydown(e as KeyboardEvent);
    this._syncAllCheckMarks();
  };
}

define('e-tree', ETree);
