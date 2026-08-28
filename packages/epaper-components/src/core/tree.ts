// Shared hierarchical-tree engine.
//
// `<e-tree-select>` and `<e-tree>` render the same `.ink-tree` markup and share
// the same traversal, expansion and keyboard model. The only differences are
// what a row carries (a checkbox, a selection marker) and what activating a row
// means to the host. Both live behind the hooks in `TreeViewConfig`, so the
// components stay thin and the roving-tabindex/expansion logic exists once.
//
// The view never rebuilds a subtree that is already mounted: expanding a node
// materialises its children on first open and toggles `hidden` afterwards, so
// the EPDC sees one small dirty rectangle instead of a full redraw.

import { patchAttr, patchBoolAttr } from './dom';
import { iconSvg } from './icons';
import { isTreeData } from './data';
import type { TreeNode } from './types';

/** Outcome of reading JSON tree data off an attribute. */
export interface TreeParseResult {
  /** Parsed nodes, or `[]` when the attribute was absent, empty or invalid. */
  data: TreeNode[];
  /** The attribute the value was read from, for error reporting. */
  source: string;
  /** Parse failure, if any. Hosts surface this as an `e-error` event. */
  error: Error | null;
}

/**
 * Read and validate JSON tree data from the first attribute in `names` that is
 * present. Falls back to an empty tree rather than throwing, so a malformed
 * attribute degrades to an empty view instead of breaking the page.
 *
 * An absent, empty or whitespace-only attribute is the "no data yet" state and
 * reports `error: null` — binding an empty string from a framework is not a
 * page error. Only non-blank content that fails to parse is reported.
 */
export function parseTreeAttr(el: Element, names: readonly string[]): TreeParseResult {
  const found = names.find((name) => el.getAttribute(name) != null);
  const source = found ?? names[0] ?? 'data';
  const raw = (found != null ? el.getAttribute(found) : null)?.trim() || '[]';
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isTreeData(parsed)) throw new TypeError('Expected an array of tree nodes.');
    return { data: parsed as TreeNode[], source, error: null };
  } catch (err) {
    return {
      data: [],
      source,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/** Flatten a node list into a `value → node` lookup, descending into children. */
export function indexTree(
  nodes: TreeNode[],
  into = new Map<string, TreeNode>(),
): Map<string, TreeNode> {
  for (const node of nodes) {
    into.set(node.value, node);
    if (node.children) indexTree(node.children, into);
  }
  return into;
}

/** Collect the values of `node` and every descendant. */
export function collectSubtree(node: TreeNode, into: string[] = []): string[] {
  into.push(node.value);
  for (const child of node.children ?? []) collectSubtree(child, into);
  return into;
}

const hasChildren = (node: TreeNode | undefined): boolean => !!node?.children?.length;

/** Hooks a host component provides to specialise the shared view. */
export interface TreeViewConfig {
  /**
   * Marks the active row. `'aria-selected'` suits a single-select picker;
   * `null` opts out entirely for a plain navigation tree.
   */
  selectionAttr?: 'aria-selected' | null;
  /** Injects per-row affordances (a checkbox, a badge) ahead of the label. */
  renderRowExtra?: (row: HTMLElement, node: TreeNode, depth: number) => void;
  /** Fired when a row is activated by click, `Enter` or `Space`. */
  onActivate?: (value: string, node: TreeNode | undefined) => void;
  /** Fired after a node expanded or collapsed. */
  onToggle?: (value: string, expanded: boolean) => void;
}

/**
 * Renders and drives a `.ink-tree` list inside a host element.
 *
 * The host owns the element and its lifecycle; this class owns the DOM below
 * it, the expansion set and the roving tabindex. Hosts forward `click` and
 * `keydown` to {@link handleClick} and {@link handleKeydown}.
 */
export class TreeView {
  private _data: TreeNode[] = [];
  private _expanded = new Set<string>();
  private _selected = '';
  /**
   * Row that owns the tree's single tab stop.
   *
   * Deliberately separate from `_selected`: rows are materialised lazily, so
   * a selected row can be absent (its branch is still collapsed) or hidden
   * (its branch was collapsed again). Deriving the tab stop from selection
   * alone produced both failure modes — two tabbable rows after expanding to
   * a selected child, and a tab stop stranded inside a hidden group after
   * collapsing. The tab stop is re-derived from what is actually visible.
   */
  private _focus = '';
  private _root: HTMLUListElement | null = null;

  private readonly _rows = new Map<string, HTMLElement>();
  private readonly _groups = new Map<string, HTMLUListElement>();
  private readonly _toggles = new Map<string, HTMLButtonElement>();
  private _nodes = new Map<string, TreeNode>();

  constructor(
    private readonly host: HTMLElement,
    private readonly config: TreeViewConfig = {},
  ) {}

  get data(): TreeNode[] {
    return this._data;
  }

  get selected(): string {
    return this._selected;
  }

  /** Look up a node by value. */
  node(value: string): TreeNode | undefined {
    return this._nodes.get(value);
  }

  /** Values of every node currently expanded. */
  expandedValues(): string[] {
    return [...this._expanded];
  }

  /** Replace the backing data. Callers follow up with {@link render}. */
  setData(data: TreeNode[]): void {
    this._data = data;
    this._nodes = indexTree(data);
  }

  /** Seed the expansion set, e.g. from a `default-expanded` attribute. */
  setExpanded(values: Iterable<string>): void {
    this._expanded = new Set(values);
  }

  /** Set the active value without touching the DOM (pre-render). */
  setSelectedValue(value: string): void {
    this._selected = value;
  }

  /** Build the full tree and mount it as the host's only child. */
  render(): void {
    this._rows.clear();
    this._groups.clear();
    this._toggles.clear();

    const ul = document.createElement('ul');
    ul.className = 'ink-tree';
    ul.setAttribute('role', 'tree');
    for (const node of this._data) this._buildNode(ul, node, 0);

    this._root = ul;
    this.host.replaceChildren(ul);

    this.normalizeTabStop();
  }

  /**
   * Leave exactly one visible row tabbable.
   *
   * Preference order: the row that already owns the tab stop, then the
   * selected row, then the first visible row. Call after anything that adds,
   * hides or reveals rows.
   */
  normalizeTabStop(): void {
    const visible = this.visibleRows();
    if (visible.length === 0) return;

    const preferred = [this._focus, this._selected]
      .filter(Boolean)
      .map((v) => this._rows.get(v))
      .find((row) => row !== undefined && visible.includes(row));

    const target = preferred ?? visible[0];
    if (!target) return;

    // Only a real position — the user's focus or the selection — is recorded.
    // Pinning `_focus` to the first-row fallback would make that arbitrary
    // choice outrank a selection that becomes visible later, so expanding to a
    // selected child would leave the tab stop on its ancestor.
    if (preferred) this._focus = target.dataset['value'] ?? '';
    for (const row of this._rows.values()) {
      const next = row === target ? 0 : -1;
      if (row.tabIndex !== next) row.tabIndex = next;
    }
  }

  private _buildNode(parent: HTMLElement, node: TreeNode, depth: number): void {
    const kids = hasChildren(node);
    const isOpen = this._expanded.has(node.value);
    const isSelected = this._selected === node.value;
    const { selectionAttr = 'aria-selected' } = this.config;

    const li = document.createElement('li');
    li.setAttribute('role', 'none');

    const row = document.createElement('div');
    row.className = 'ink-tree__row';
    row.dataset['depth'] = String(depth);
    row.dataset['value'] = node.value;
    row.setAttribute('role', 'treeitem');
    row.setAttribute('aria-level', String(depth + 1));
    if (selectionAttr) row.setAttribute(selectionAttr, String(isSelected));
    // The tab stop is assigned by normalizeTabStop() once the row's
    // visibility is known — a freshly materialised row may be inside a group
    // that is still hidden.
    row.tabIndex = -1;
    row.style.paddingLeft = `${10 + depth * 20}px`;

    if (kids) {
      row.setAttribute('aria-expanded', String(isOpen));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ink-tree__expand';
      btn.dataset['expand'] = node.value;
      btn.tabIndex = -1;
      btn.setAttribute('aria-label', `${isOpen ? 'Collapse' : 'Expand'} ${node.label}`);
      btn.innerHTML = iconSvg(isOpen ? 'minus' : 'plus', 12);
      row.appendChild(btn);
      this._toggles.set(node.value, btn);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'ink-tree__leaf-spacer';
      row.appendChild(spacer);
    }

    this.config.renderRowExtra?.(row, node, depth);

    const label = document.createElement('span');
    label.className = 'ink-tree__label';
    label.textContent = node.label;
    row.appendChild(label);

    li.appendChild(row);
    this._rows.set(node.value, row);

    if (kids) {
      const childUl = document.createElement('ul');
      childUl.setAttribute('role', 'group');
      if (isOpen) {
        for (const child of node.children!) this._buildNode(childUl, child, depth + 1);
      }
      childUl.hidden = !isOpen;
      li.appendChild(childUl);
      this._groups.set(node.value, childUl);
    }

    parent.appendChild(li);
  }

  /** The row element for `value`, if it is currently materialised. */
  row(value: string): HTMLElement | undefined {
    return this._rows.get(value);
  }

  /** Iterate every materialised row. */
  rows(): Iterable<HTMLElement> {
    return this._rows.values();
  }

  /**
   * Move the selection marker from `oldValue` to `newValue`, keeping the
   * roving tabindex on the selected row. When `selectionAttr` is null only the
   * marker write is skipped: the recorded selection and the tab stop still
   * follow `newValue`.
   */
  patchSelection(oldValue: string, newValue: string): void {
    const { selectionAttr = 'aria-selected' } = this.config;
    this._selected = newValue;
    const oldRow = oldValue ? this._rows.get(oldValue) : undefined;
    if (oldRow && selectionAttr) patchAttr(oldRow, selectionAttr, 'false');
    const newRow = newValue ? this._rows.get(newValue) : undefined;
    if (newRow) {
      if (selectionAttr) patchAttr(newRow, selectionAttr, 'true');
      // Selecting a row moves the tab stop to it, so returning to the tree
      // lands on the current selection.
      this._focus = newValue;
    }
    this.normalizeTabStop();
  }

  /**
   * Expand or collapse a node, materialising its children on first open.
   * Ignores a value that matches no node in the current data, so the expansion
   * set only ever holds values a host can meaningfully persist.
   */
  toggleExpand(value: string): void {
    if (!this._nodes.has(value)) return;
    const wasOpen = this._expanded.has(value);
    const open = !wasOpen;
    if (wasOpen) this._expanded.delete(value);
    else this._expanded.add(value);

    this._syncGroup(value, open);
    this._syncToggleButton(value, open);
    const row = this._rows.get(value);
    if (row) patchAttr(row, 'aria-expanded', String(open));
    if (!open) this._rescueFocusFrom(value);
    // Re-derive either way: expanding also materialises rows that have no tab
    // index yet.
    this.normalizeTabStop();

    this.config.onToggle?.(value, open);
  }

  /** Materialise children on first open, then show or hide the group. */
  private _syncGroup(value: string, open: boolean): void {
    const group = this._groups.get(value);
    if (!group) return;
    if (open && group.children.length === 0) {
      const node = this._nodes.get(value);
      const depth = Number(this._rows.get(value)?.dataset['depth'] ?? '0');
      for (const child of node?.children ?? []) this._buildNode(group, child, depth + 1);
    }
    patchBoolAttr(group, 'hidden', !open);
  }

  private _syncToggleButton(value: string, open: boolean): void {
    const btn = this._toggles.get(value);
    if (!btn) return;
    const node = this._nodes.get(value);
    btn.innerHTML = iconSvg(open ? 'minus' : 'plus', 12);
    btn.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} ${node?.label ?? value}`);
  }

  /**
   * Collapsing a branch that holds the tab stop hands it to the branch itself,
   * which is where the ARIA tree pattern puts focus and what the user is
   * looking at.
   */
  private _rescueFocusFrom(value: string): void {
    const node = this._nodes.get(value);
    if (node && this._focus !== value && collectSubtree(node).includes(this._focus)) {
      this._focus = value;
    }
  }

  /** Rows that are not hidden behind a collapsed ancestor, in document order. */
  visibleRows(): HTMLElement[] {
    const root = this._root;
    if (!root) return [];
    return [...root.querySelectorAll<HTMLElement>('.ink-tree__row')].filter((row) => {
      let p: HTMLElement | null = row.parentElement;
      while (p && p !== root) {
        if (p.tagName === 'UL' && (p as HTMLUListElement).hidden) return false;
        p = p.parentElement;
      }
      return true;
    });
  }

  /** Move focus to `row`, keeping a single tab stop in the tree. */
  focusRow(row: HTMLElement | undefined): void {
    if (!row) return;
    this._focus = row.dataset['value'] ?? '';
    this.normalizeTabStop();
    row.focus();
  }

  /**
   * Handle a delegated click. Returns `true` when the event hit the tree, so
   * hosts can skip their own handling for clicks elsewhere.
   */
  handleClick(e: Event): boolean {
    const target = e.target as Element;
    const toggle = target.closest<HTMLElement>('[data-expand]');
    if (toggle) {
      e.stopPropagation();
      this.toggleExpand(toggle.dataset['expand'] ?? '');
      return true;
    }
    const row = target.closest<HTMLElement>('.ink-tree__row');
    if (!row) return false;
    const value = row.dataset['value'] ?? '';
    this.config.onActivate?.(value, this._nodes.get(value));
    return true;
  }

  /** Handle a delegated keydown: arrows, Home/End, Enter/Space. */
  handleKeydown(e: KeyboardEvent): boolean {
    const row = (e.target as Element).closest<HTMLElement>('.ink-tree__row');
    if (!row) return false;
    const value = row.dataset['value'] ?? '';
    const visible = this.visibleRows();
    const idx = visible.indexOf(row);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.focusRow(visible[Math.min(idx + 1, visible.length - 1)]);
        return true;
      case 'ArrowUp':
        e.preventDefault();
        this.focusRow(visible[Math.max(idx - 1, 0)]);
        return true;
      case 'Home':
        e.preventDefault();
        this.focusRow(visible[0]);
        return true;
      case 'End':
        e.preventDefault();
        this.focusRow(visible.at(-1));
        return true;
      case 'ArrowRight':
        return this._arrowRight(e, value);
      case 'ArrowLeft':
        return this._arrowLeft(e, value, row);
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.config.onActivate?.(value, this._nodes.get(value));
        return true;
      default:
        return false;
    }
  }

  /** Right opens a closed branch, or steps into an open one. */
  private _arrowRight(e: KeyboardEvent, value: string): boolean {
    if (!hasChildren(this._nodes.get(value))) return true;
    e.preventDefault();
    if (this._expanded.has(value)) {
      const first = this._groups.get(value)?.querySelector<HTMLElement>('.ink-tree__row');
      if (first) this.focusRow(first);
    } else {
      this.toggleExpand(value);
    }
    return true;
  }

  /** Left closes an open branch, or steps out to the parent row. */
  private _arrowLeft(e: KeyboardEvent, value: string, row: HTMLElement): boolean {
    e.preventDefault();
    if (hasChildren(this._nodes.get(value)) && this._expanded.has(value)) {
      this.toggleExpand(value);
      return true;
    }
    const parentLi = row.parentElement?.parentElement?.closest<HTMLElement>('li');
    const parentRow = parentLi?.querySelector<HTMLElement>(':scope > .ink-tree__row');
    if (parentRow) this.focusRow(parentRow);
    return true;
  }
}
