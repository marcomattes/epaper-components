// Unit tests for the shared hierarchical-tree engine. `<e-tree>` and
// `<e-tree-select>` only wire hooks into this module, so the traversal,
// lazy-materialisation and roving-tabindex rules are pinned here rather
// than through either component.
import { describe, it, expect, afterEach } from 'vitest';
import { parseTreeAttr, indexTree, collectSubtree, TreeView, type TreeViewConfig } from './tree';
import type { TreeNode } from './types';

const PLUS = 'M12 4v16M4 12h16';
const MINUS = 'M4 12h16';

const TREE: TreeNode[] = [
  {
    value: 'fruit',
    label: 'Fruit',
    children: [
      { value: 'apple', label: 'Apple' },
      { value: 'berry', label: 'Berry', children: [{ value: 'straw', label: 'Strawberry' }] },
    ],
  },
  { value: 'veg', label: 'Vegetable' },
];

const hosts: HTMLElement[] = [];

afterEach(() => {
  while (hosts.length) hosts.pop()!.remove();
});

interface Mounted {
  host: HTMLElement;
  view: TreeView;
}

const mount = (
  opts: { config?: TreeViewConfig; data?: TreeNode[]; expanded?: string[]; selected?: string } = {},
): Mounted => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  const view = new TreeView(host, opts.config ?? {});
  view.setData(opts.data ?? TREE);
  view.setExpanded(opts.expanded ?? []);
  if (opts.selected !== undefined) view.setSelectedValue(opts.selected);
  view.render();
  return { host, view };
};

const rowOf = (host: HTMLElement, value: string): HTMLElement =>
  host.querySelector<HTMLElement>(`.ink-tree__row[data-value="${value}"]`)!;

const toggleOf = (host: HTMLElement, value: string): HTMLButtonElement =>
  host.querySelector<HTMLButtonElement>(`button[data-expand="${value}"]`)!;

const groupOf = (host: HTMLElement, value: string): HTMLUListElement =>
  rowOf(host, value).parentElement!.querySelector<HTMLUListElement>(':scope > ul')!;

const iconPath = (btn: Element): string | null =>
  btn.querySelector('path')?.getAttribute('d') ?? null;

/** Dispatch a real click on `target` and return what handleClick decided. */
const click = (view: TreeView, target: Element): boolean => {
  let result = false;
  const handler = (e: Event): void => {
    result = view.handleClick(e);
  };
  target.addEventListener('click', handler);
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  target.removeEventListener('click', handler);
  return result;
};

/** Dispatch a real keydown on `target`; reports handled + preventDefault. */
const press = (
  view: TreeView,
  target: Element,
  key: string,
): { handled: boolean; prevented: boolean } => {
  let handled = false;
  const handler = (e: Event): void => {
    handled = view.handleKeydown(e as KeyboardEvent);
  };
  target.addEventListener('keydown', handler);
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
  target.removeEventListener('keydown', handler);
  return { handled, prevented: ev.defaultPrevented };
};

const tabStops = (host: HTMLElement): string[] =>
  [...host.querySelectorAll<HTMLElement>('.ink-tree__row')]
    .filter((r) => r.tabIndex === 0)
    .map((r) => r.dataset['value'] ?? '');

const attrEl = (attrs: Record<string, string>): Element => {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

describe('parseTreeAttr', () => {
  it('reads the first present attribute from the list', () => {
    const el = attrEl({ options: '[{"value":"b","label":"B"}]' });
    const res = parseTreeAttr(el, ['data', 'options']);
    expect(res.source).toBe('options');
    expect(res.error).toBeNull();
    expect(res.data).toEqual([{ value: 'b', label: 'B' }]);
  });

  it('prefers the earlier name when several attributes are present', () => {
    const el = attrEl({
      data: '[{"value":"a","label":"A"}]',
      options: '[{"value":"b","label":"B"}]',
    });
    const res = parseTreeAttr(el, ['data', 'options']);
    expect(res.source).toBe('data');
    expect(res.data).toEqual([{ value: 'a', label: 'A' }]);
  });

  it('falls back to an empty tree with the first name as source', () => {
    const res = parseTreeAttr(attrEl({}), ['data', 'options']);
    expect(res).toEqual({ data: [], source: 'data', error: null });
  });

  it('falls back to the literal source "data" when the name list is empty', () => {
    const res = parseTreeAttr(attrEl({}), []);
    expect(res.source).toBe('data');
    expect(res.data).toEqual([]);
    expect(res.error).toBeNull();
  });

  it('returns an error for malformed JSON without throwing', () => {
    const res = parseTreeAttr(attrEl({ data: '[{value:' }), ['data']);
    expect(res.data).toEqual([]);
    expect(res.source).toBe('data');
    expect(res.error).toBeInstanceOf(SyntaxError);
  });

  it('returns a TypeError for well-formed JSON that is not tree data', () => {
    const res = parseTreeAttr(attrEl({ data: '{"value":"a"}' }), ['data']);
    expect(res.data).toEqual([]);
    expect(res.error).toBeInstanceOf(TypeError);
    expect(res.error!.message).toBe('Expected an array of tree nodes.');
  });

  it('rejects an array whose nodes are missing a label', () => {
    const res = parseTreeAttr(attrEl({ data: '[{"value":"a"}]' }), ['data']);
    expect(res.error).toBeInstanceOf(TypeError);
  });

  it('rejects a node whose children fail validation', () => {
    const res = parseTreeAttr(
      attrEl({ data: '[{"value":"a","label":"A","children":[{"value":1}]}]' }),
      ['data'],
    );
    expect(res.error).toBeInstanceOf(TypeError);
    expect(res.data).toEqual([]);
  });

  it('accepts an empty array', () => {
    const res = parseTreeAttr(attrEl({ data: '[]' }), ['data']);
    expect(res).toEqual({ data: [], source: 'data', error: null });
  });

  it('reports an empty attribute value as a parse error, not as no data', () => {
    // `raw` uses `??`, so a present-but-empty attribute is *not* replaced by
    // the '[]' default and reaches JSON.parse('') — hosts surface this as an
    // `e-error`. Pinned so the behaviour is a decision, not an accident.
    const res = parseTreeAttr(attrEl({ data: '' }), ['data']);
    expect(res.data).toEqual([]);
    expect(res.source).toBe('data');
    expect(res.error).toBeInstanceOf(SyntaxError);
  });
});

describe('indexTree', () => {
  it('flattens nested children into a value -> node map', () => {
    const map = indexTree(TREE);
    expect([...map.keys()].sort()).toEqual(['apple', 'berry', 'fruit', 'straw', 'veg']);
    expect(map.get('straw')).toEqual({ value: 'straw', label: 'Strawberry' });
    expect(map.get('fruit')).toBe(TREE[0]);
  });

  it('returns an empty map for an empty list', () => {
    expect(indexTree([]).size).toBe(0);
  });

  it('writes into a provided map and returns it', () => {
    const into = new Map<string, TreeNode>();
    const out = indexTree([{ value: 'x', label: 'X' }], into);
    expect(out).toBe(into);
    expect(into.get('x')).toEqual({ value: 'x', label: 'X' });
  });

  it('lets a later duplicate value win', () => {
    const map = indexTree([
      { value: 'd', label: 'first' },
      { value: 'd', label: 'second' },
    ]);
    expect(map.get('d')!.label).toBe('second');
  });
});

describe('collectSubtree', () => {
  it('returns the node value plus every descendant, depth-first', () => {
    expect(collectSubtree(TREE[0]!)).toEqual(['fruit', 'apple', 'berry', 'straw']);
  });

  it('returns just the value for a leaf', () => {
    expect(collectSubtree({ value: 'leaf', label: 'L' })).toEqual(['leaf']);
  });

  it('appends into a provided accumulator', () => {
    const into = ['pre'];
    const out = collectSubtree({ value: 'a', label: 'A' }, into);
    expect(out).toBe(into);
    expect(into).toEqual(['pre', 'a']);
  });

  it('treats an empty children array as a leaf', () => {
    expect(collectSubtree({ value: 'a', label: 'A', children: [] })).toEqual(['a']);
  });
});

describe('TreeView.render markup', () => {
  it('mounts a single role="tree" list as the host child', () => {
    const { host } = mount();
    expect(host.children.length).toBe(1);
    const ul = host.firstElementChild!;
    expect(ul.tagName).toBe('UL');
    expect(ul.className).toBe('ink-tree');
    expect(ul.getAttribute('role')).toBe('tree');
  });

  it('gives each row the treeitem role, level, depth and value', () => {
    const { host } = mount({ expanded: ['fruit'] });
    const fruit = rowOf(host, 'fruit');
    expect(fruit.getAttribute('role')).toBe('treeitem');
    expect(fruit.getAttribute('aria-level')).toBe('1');
    expect(fruit.dataset['depth']).toBe('0');
    expect(fruit.dataset['value']).toBe('fruit');
    expect(fruit.className).toBe('ink-tree__row');

    const apple = rowOf(host, 'apple');
    expect(apple.getAttribute('aria-level')).toBe('2');
    expect(apple.dataset['depth']).toBe('1');
  });

  it('wraps every row in a role="none" list item', () => {
    const { host } = mount();
    expect(rowOf(host, 'veg').parentElement!.getAttribute('role')).toBe('none');
  });

  it('indents by 10 + depth * 20 pixels', () => {
    const { host } = mount({ expanded: ['fruit', 'berry'] });
    expect(rowOf(host, 'fruit').style.paddingLeft).toBe('10px');
    expect(rowOf(host, 'apple').style.paddingLeft).toBe('30px');
    expect(rowOf(host, 'straw').style.paddingLeft).toBe('50px');
  });

  it('renders aria-expanded only on rows that have children', () => {
    const { host } = mount({ expanded: ['fruit'] });
    expect(rowOf(host, 'fruit').getAttribute('aria-expanded')).toBe('true');
    expect(rowOf(host, 'berry').getAttribute('aria-expanded')).toBe('false');
    expect(rowOf(host, 'veg').hasAttribute('aria-expanded')).toBe(false);
  });

  it('renders a toggle button for parents and a spacer for leaves', () => {
    const { host } = mount({ expanded: ['fruit'] });
    const btn = toggleOf(host, 'fruit');
    expect(btn.className).toBe('ink-tree__expand');
    expect(btn.type).toBe('button');
    expect(btn.tabIndex).toBe(-1);
    expect(btn.getAttribute('aria-label')).toBe('Collapse Fruit');
    expect(iconPath(btn)).toBe(MINUS);

    expect(toggleOf(host, 'berry').getAttribute('aria-label')).toBe('Expand Berry');
    expect(iconPath(toggleOf(host, 'berry'))).toBe(PLUS);

    const veg = rowOf(host, 'veg');
    expect(veg.querySelector('button')).toBeNull();
    expect(veg.querySelector('.ink-tree__leaf-spacer')!.tagName).toBe('SPAN');
  });

  it('renders the label last, after the toggle and any extra', () => {
    const { host } = mount({ expanded: ['fruit'] });
    const label = rowOf(host, 'apple').lastElementChild!;
    expect(label.className).toBe('ink-tree__label');
    expect(label.textContent).toBe('Apple');
  });

  it('marks the selected row with aria-selected by default', () => {
    const { host } = mount({ expanded: ['fruit'], selected: 'apple' });
    expect(rowOf(host, 'apple').getAttribute('aria-selected')).toBe('true');
    expect(rowOf(host, 'veg').getAttribute('aria-selected')).toBe('false');
  });

  it('omits aria-selected entirely when selectionAttr is null', () => {
    const { host } = mount({ config: { selectionAttr: null }, selected: 'veg' });
    expect(rowOf(host, 'veg').hasAttribute('aria-selected')).toBe(false);
    expect(rowOf(host, 'fruit').hasAttribute('aria-selected')).toBe(false);
  });

  it('creates a hidden role="group" list for a collapsed parent and leaves it empty', () => {
    const { host, view } = mount();
    const group = groupOf(host, 'fruit');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.hidden).toBe(true);
    expect(group.children.length).toBe(0);
    expect(view.row('apple')).toBeUndefined();
  });

  it('materialises and shows the group for an expanded parent', () => {
    const { host } = mount({ expanded: ['fruit'] });
    const group = groupOf(host, 'fruit');
    expect(group.hidden).toBe(false);
    expect(group.children.length).toBe(2);
  });

  it('renders nothing but the empty list for empty data', () => {
    const { host, view } = mount({ data: [] });
    expect(host.querySelectorAll('.ink-tree__row').length).toBe(0);
    expect(view.visibleRows()).toEqual([]);
  });

  it('rebuilds cleanly on a second render with new data', () => {
    const { host, view } = mount({ expanded: ['fruit'] });
    view.setData([{ value: 'solo', label: 'Solo' }]);
    view.render();
    expect(host.children.length).toBe(1);
    expect(host.querySelectorAll('.ink-tree__row').length).toBe(1);
    expect(view.row('apple')).toBeUndefined();
    expect(view.node('solo')).toEqual({ value: 'solo', label: 'Solo' });
  });
});

describe('TreeView accessors', () => {
  it('exposes data, selected, node lookup and expanded values', () => {
    const { view } = mount({ expanded: ['fruit'], selected: 'apple' });
    expect(view.data).toBe(TREE);
    expect(view.selected).toBe('apple');
    expect(view.node('berry')).toBe(TREE[0]!.children![1]);
    expect(view.node('missing')).toBeUndefined();
    expect(view.expandedValues()).toEqual(['fruit']);
  });

  it('iterates only materialised rows', () => {
    const { view } = mount({ expanded: ['fruit'] });
    const values = [...view.rows()].map((r) => r.dataset['value']);
    expect(values).toEqual(['fruit', 'apple', 'berry', 'veg']);
    expect(view.row('fruit')!.dataset['value']).toBe('fruit');
    expect(view.row('straw')).toBeUndefined();
  });
});

describe('TreeView.renderRowExtra hook', () => {
  it('is invoked with (row, node, depth) before the label', () => {
    const seen: Array<[string, string, number]> = [];
    const { host } = mount({
      expanded: ['fruit'],
      config: {
        renderRowExtra: (row, node, depth) => {
          seen.push([row.dataset['value'] ?? '', node.value, depth]);
          const mark = document.createElement('i');
          mark.className = 'extra';
          row.appendChild(mark);
        },
      },
    });

    expect(seen).toEqual([
      ['fruit', 'fruit', 0],
      ['apple', 'apple', 1],
      ['berry', 'berry', 1],
      ['veg', 'veg', 0],
    ]);
    const children = [...rowOf(host, 'apple').children].map((c) => c.className);
    expect(children).toEqual(['ink-tree__leaf-spacer', 'extra', 'ink-tree__label']);
  });

  it('runs for rows materialised lazily on expand', () => {
    const seen: string[] = [];
    const { view } = mount({
      config: { renderRowExtra: (_row, node) => seen.push(node.value) },
    });
    expect(seen).toEqual(['fruit', 'veg']);
    view.toggleExpand('fruit');
    expect(seen).toEqual(['fruit', 'veg', 'apple', 'berry']);
  });
});

describe('TreeView.toggleExpand', () => {
  it('materialises children on first open only', () => {
    const { host, view } = mount();
    const group = groupOf(host, 'fruit');
    expect(group.children.length).toBe(0);

    view.toggleExpand('fruit');
    expect(group.hidden).toBe(false);
    expect(group.children.length).toBe(2);
    const appleRow = view.row('apple')!;

    view.toggleExpand('fruit');
    expect(group.hidden).toBe(true);
    expect(group.children.length).toBe(2);

    view.toggleExpand('fruit');
    expect(group.hidden).toBe(false);
    expect(group.children.length).toBe(2);
    expect(view.row('apple')).toBe(appleRow);
  });

  it('flips the toggle icon and aria-label between Expand and Collapse', () => {
    const { host, view } = mount();
    const btn = toggleOf(host, 'fruit');
    expect(btn.getAttribute('aria-label')).toBe('Expand Fruit');
    expect(iconPath(btn)).toBe(PLUS);

    view.toggleExpand('fruit');
    expect(btn.getAttribute('aria-label')).toBe('Collapse Fruit');
    expect(iconPath(btn)).toBe(MINUS);

    view.toggleExpand('fruit');
    expect(btn.getAttribute('aria-label')).toBe('Expand Fruit');
    expect(iconPath(btn)).toBe(PLUS);
  });

  it('keeps aria-expanded and the expansion set in sync', () => {
    const { host, view } = mount();
    view.toggleExpand('fruit');
    expect(rowOf(host, 'fruit').getAttribute('aria-expanded')).toBe('true');
    expect(view.expandedValues()).toEqual(['fruit']);
    view.toggleExpand('fruit');
    expect(rowOf(host, 'fruit').getAttribute('aria-expanded')).toBe('false');
    expect(view.expandedValues()).toEqual([]);
  });

  it('fires onToggle with the new state', () => {
    const calls: Array<[string, boolean]> = [];
    const { view } = mount({ config: { onToggle: (v, open) => calls.push([v, open]) } });
    view.toggleExpand('fruit');
    view.toggleExpand('fruit');
    expect(calls).toEqual([
      ['fruit', true],
      ['fruit', false],
    ]);
  });

  it('materialises a nested branch only when its own toggle opens', () => {
    const { host, view } = mount();
    view.toggleExpand('fruit');
    expect(view.row('straw')).toBeUndefined();
    view.toggleExpand('berry');
    expect(view.row('straw')).toBeDefined();
    expect(rowOf(host, 'straw').dataset['depth']).toBe('2');
    expect(rowOf(host, 'straw').style.paddingLeft).toBe('50px');
  });

  it('tolerates a value that has no row, group or toggle', () => {
    const { view } = mount();
    expect(() => view.toggleExpand('nope')).not.toThrow();
    expect(view.expandedValues()).toEqual(['nope']);
  });
});

describe('TreeView.normalizeTabStop', () => {
  it('leaves exactly one visible row tabbable after render', () => {
    const { host } = mount({ expanded: ['fruit'] });
    expect(tabStops(host)).toEqual(['fruit']);
  });

  it('moves the single tab stop onto a selected child once it is revealed', () => {
    const { host, view } = mount({ selected: 'apple' });
    expect(tabStops(host)).toEqual(['fruit']);
    view.toggleExpand('fruit');
    expect(tabStops(host)).toEqual(['apple']);
  });

  it('hands the tab stop to the branch row when that branch is collapsed', () => {
    const { host, view } = mount({ selected: 'apple' });
    view.toggleExpand('fruit');
    expect(tabStops(host)).toEqual(['apple']);
    view.toggleExpand('fruit');
    expect(tabStops(host)).toEqual(['fruit']);
  });

  it('keeps the tab stop where it is when an unrelated branch collapses', () => {
    const { host, view } = mount({ expanded: ['fruit'] });
    view.focusRow(rowOf(host, 'veg'));
    expect(tabStops(host)).toEqual(['veg']);
    view.toggleExpand('fruit');
    expect(tabStops(host)).toEqual(['veg']);
  });

  it('does nothing when there are no visible rows', () => {
    const { view } = mount({ data: [] });
    expect(() => view.normalizeTabStop()).not.toThrow();
  });

  it('falls back to the first visible row without pinning it as the focus', () => {
    const { host, view } = mount({ selected: 'straw' });
    expect(tabStops(host)).toEqual(['fruit']);
    view.toggleExpand('fruit');
    // 'straw' is still unmaterialised, so the fallback stays on the first row.
    expect(tabStops(host)).toEqual(['fruit']);
    view.toggleExpand('berry');
    // Now the selection is visible and outranks the arbitrary first-row choice.
    expect(tabStops(host)).toEqual(['straw']);
  });
});

describe('TreeView.focusRow', () => {
  it('focuses the row and moves the tab stop', () => {
    const { host, view } = mount({ expanded: ['fruit'] });
    view.focusRow(rowOf(host, 'berry'));
    expect(document.activeElement).toBe(rowOf(host, 'berry'));
    expect(tabStops(host)).toEqual(['berry']);
  });

  it('is a no-op for an undefined row', () => {
    const { host, view } = mount({ expanded: ['fruit'] });
    expect(() => view.focusRow(undefined)).not.toThrow();
    expect(tabStops(host)).toEqual(['fruit']);
  });
});

describe('TreeView.patchSelection', () => {
  it('moves aria-selected from the old row to the new one', () => {
    const { host, view } = mount({ expanded: ['fruit'], selected: 'apple' });
    view.patchSelection('apple', 'veg');
    expect(rowOf(host, 'apple').getAttribute('aria-selected')).toBe('false');
    expect(rowOf(host, 'veg').getAttribute('aria-selected')).toBe('true');
    expect(view.selected).toBe('veg');
    expect(tabStops(host)).toEqual(['veg']);
  });

  it('handles an empty old value and an unmaterialised new value', () => {
    const { host, view } = mount({ expanded: ['fruit'] });
    view.patchSelection('', 'apple');
    expect(rowOf(host, 'apple').getAttribute('aria-selected')).toBe('true');

    view.patchSelection('apple', 'straw');
    expect(view.selected).toBe('straw');
    expect(rowOf(host, 'apple').getAttribute('aria-selected')).toBe('false');
    // 'straw' is not built yet, so the tab stop stays on the previous holder.
    expect(tabStops(host)).toEqual(['apple']);
  });

  it('clearing the selection leaves no row marked', () => {
    const { host, view } = mount({ expanded: ['fruit'], selected: 'apple' });
    view.patchSelection('apple', '');
    expect(view.selected).toBe('');
    expect(host.querySelectorAll('[aria-selected="true"]').length).toBe(0);
  });

  it('records the value but writes nothing when selectionAttr is null', () => {
    const { host, view } = mount({ config: { selectionAttr: null }, expanded: ['fruit'] });
    const before = tabStops(host);
    view.patchSelection('fruit', 'apple');
    expect(view.selected).toBe('apple');
    expect(host.querySelectorAll('[aria-selected]').length).toBe(0);
    expect(tabStops(host)).toEqual(before);
  });
});

describe('TreeView.visibleRows', () => {
  it('excludes rows nested under a hidden group', () => {
    const { host, view } = mount();
    expect(view.visibleRows().map((r) => r.dataset['value'])).toEqual(['fruit', 'veg']);

    view.toggleExpand('fruit');
    expect(view.visibleRows().map((r) => r.dataset['value'])).toEqual([
      'fruit',
      'apple',
      'berry',
      'veg',
    ]);

    view.toggleExpand('berry');
    expect(view.visibleRows().map((r) => r.dataset['value'])).toEqual([
      'fruit',
      'apple',
      'berry',
      'straw',
      'veg',
    ]);

    // Collapsing the outer branch hides the grandchild too.
    view.toggleExpand('fruit');
    expect(view.visibleRows().map((r) => r.dataset['value'])).toEqual(['fruit', 'veg']);
    expect(host.querySelectorAll('.ink-tree__row').length).toBe(5);
  });

  it('returns an empty list before render', () => {
    const host = document.createElement('div');
    const view = new TreeView(host);
    expect(view.visibleRows()).toEqual([]);
  });
});

describe('TreeView.handleClick', () => {
  it('returns true and toggles when the toggle button is hit', () => {
    const toggles: Array<[string, boolean]> = [];
    const { host, view } = mount({ config: { onToggle: (v, o) => toggles.push([v, o]) } });
    const handled = click(view, toggleOf(host, 'fruit'));
    expect(handled).toBe(true);
    expect(toggles).toEqual([['fruit', true]]);
    expect(groupOf(host, 'fruit').hidden).toBe(false);
  });

  it('treats a click on the icon inside the toggle as a toggle hit', () => {
    const { host, view } = mount();
    const svg = toggleOf(host, 'fruit').querySelector('svg')!;
    expect(click(view, svg)).toBe(true);
    expect(view.expandedValues()).toEqual(['fruit']);
  });

  it('stops propagation for a toggle hit so the row does not also activate', () => {
    const activated: string[] = [];
    const { host, view } = mount({ config: { onActivate: (v) => activated.push(v) } });
    const btn = toggleOf(host, 'fruit');
    const row = rowOf(host, 'fruit');
    row.addEventListener('click', (e) => view.handleClick(e));
    btn.addEventListener('click', (e) => view.handleClick(e));
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(activated).toEqual([]);
  });

  it('returns true and activates when a row is hit', () => {
    const activated: Array<[string, string | undefined]> = [];
    const { host, view } = mount({
      config: { onActivate: (v, node) => activated.push([v, node?.label]) },
    });
    expect(click(view, rowOf(host, 'veg').querySelector('.ink-tree__label')!)).toBe(true);
    expect(activated).toEqual([['veg', 'Vegetable']]);
  });

  it('returns false for a click outside any row', () => {
    const activated: string[] = [];
    const { host, view } = mount({ config: { onActivate: (v) => activated.push(v) } });
    expect(click(view, host)).toBe(false);
    expect(activated).toEqual([]);
  });

  it('activates without an onActivate hook configured', () => {
    const { host, view } = mount();
    expect(click(view, rowOf(host, 'veg'))).toBe(true);
  });
});

describe('TreeView.handleKeydown', () => {
  it('returns false when the event did not start on a row', () => {
    const { host, view } = mount();
    expect(press(view, host, 'ArrowDown').handled).toBe(false);
  });

  it('ArrowDown moves to the next visible row and clamps at the end', () => {
    const { host, view } = mount({ expanded: ['fruit'] });
    const res = press(view, rowOf(host, 'fruit'), 'ArrowDown');
    expect(res).toEqual({ handled: true, prevented: true });
    expect(document.activeElement).toBe(rowOf(host, 'apple'));

    press(view, rowOf(host, 'veg'), 'ArrowDown');
    expect(document.activeElement).toBe(rowOf(host, 'veg'));
  });

  it('ArrowUp moves to the previous visible row and clamps at the start', () => {
    const { host, view } = mount({ expanded: ['fruit'] });
    const res = press(view, rowOf(host, 'apple'), 'ArrowUp');
    expect(res).toEqual({ handled: true, prevented: true });
    expect(document.activeElement).toBe(rowOf(host, 'fruit'));

    press(view, rowOf(host, 'fruit'), 'ArrowUp');
    expect(document.activeElement).toBe(rowOf(host, 'fruit'));
  });

  it('skips rows hidden behind a collapsed branch', () => {
    const { host, view } = mount();
    press(view, rowOf(host, 'fruit'), 'ArrowDown');
    expect(document.activeElement).toBe(rowOf(host, 'veg'));
  });

  it('Home and End jump to the first and last visible rows', () => {
    const { host, view } = mount({ expanded: ['fruit'] });
    expect(press(view, rowOf(host, 'berry'), 'Home')).toEqual({ handled: true, prevented: true });
    expect(document.activeElement).toBe(rowOf(host, 'fruit'));

    expect(press(view, rowOf(host, 'fruit'), 'End')).toEqual({ handled: true, prevented: true });
    expect(document.activeElement).toBe(rowOf(host, 'veg'));
  });

  it('ArrowRight expands a collapsed parent, then steps into the first child', () => {
    const { host, view } = mount();
    const res = press(view, rowOf(host, 'fruit'), 'ArrowRight');
    expect(res).toEqual({ handled: true, prevented: true });
    expect(view.expandedValues()).toEqual(['fruit']);
    expect(document.activeElement).not.toBe(rowOf(host, 'apple'));

    press(view, rowOf(host, 'fruit'), 'ArrowRight');
    expect(document.activeElement).toBe(rowOf(host, 'apple'));
  });

  it('ArrowRight is a handled no-op on a leaf and does not preventDefault', () => {
    const { host, view } = mount();
    const res = press(view, rowOf(host, 'veg'), 'ArrowRight');
    expect(res).toEqual({ handled: true, prevented: false });
    expect(view.expandedValues()).toEqual([]);
  });

  it('ArrowLeft collapses an open parent', () => {
    const { host, view } = mount({ expanded: ['fruit'] });
    const res = press(view, rowOf(host, 'fruit'), 'ArrowLeft');
    expect(res).toEqual({ handled: true, prevented: true });
    expect(view.expandedValues()).toEqual([]);
    expect(groupOf(host, 'fruit').hidden).toBe(true);
  });

  it('ArrowLeft on a child moves to its parent row', () => {
    const { host, view } = mount({ expanded: ['fruit'] });
    press(view, rowOf(host, 'apple'), 'ArrowLeft');
    expect(document.activeElement).toBe(rowOf(host, 'fruit'));
  });

  it('ArrowLeft on a collapsed parent moves out to its parent row', () => {
    const { host, view } = mount({ expanded: ['fruit'] });
    press(view, rowOf(host, 'berry'), 'ArrowLeft');
    expect(document.activeElement).toBe(rowOf(host, 'fruit'));
    expect(view.expandedValues()).toEqual(['fruit']);
  });

  it('ArrowLeft on a top-level leaf has nowhere to go but is still handled', () => {
    const { host, view } = mount();
    rowOf(host, 'veg').focus();
    const res = press(view, rowOf(host, 'veg'), 'ArrowLeft');
    expect(res).toEqual({ handled: true, prevented: true });
    expect(document.activeElement).toBe(rowOf(host, 'veg'));
  });

  it('Enter and Space activate the row', () => {
    const activated: Array<[string, string | undefined]> = [];
    const { host, view } = mount({
      expanded: ['fruit'],
      config: { onActivate: (v, node) => activated.push([v, node?.label]) },
    });
    expect(press(view, rowOf(host, 'apple'), 'Enter')).toEqual({ handled: true, prevented: true });
    expect(press(view, rowOf(host, 'veg'), ' ')).toEqual({ handled: true, prevented: true });
    expect(activated).toEqual([
      ['apple', 'Apple'],
      ['veg', 'Vegetable'],
    ]);
  });

  it('Enter without an onActivate hook is still handled', () => {
    const { host, view } = mount();
    expect(press(view, rowOf(host, 'veg'), 'Enter').handled).toBe(true);
  });

  it('returns false and does not preventDefault for an unhandled key', () => {
    const { host, view } = mount();
    expect(press(view, rowOf(host, 'veg'), 'x')).toEqual({ handled: false, prevented: false });
  });
});
