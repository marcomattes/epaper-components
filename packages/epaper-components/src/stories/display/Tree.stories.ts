import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, fn, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const FILES = JSON.stringify([
  {
    value: 'src',
    label: 'src',
    children: [
      { value: 'index', label: 'index.ts' },
      {
        value: 'components',
        label: 'components',
        children: [
          { value: 'button', label: 'button.ts' },
          { value: 'tree', label: 'tree.ts' },
        ],
      },
    ],
  },
  { value: 'readme', label: 'README.md' },
]);

const meta: Meta = {
  title: 'Display/Tree',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.1.0',
      description: {
        component:
          'Hierarchical tree for navigation and display — the counterpart to `<e-tree-select>`, sharing its markup and keyboard model (arrows, `Home`/`End`, `Enter`/`Space`) but not form-associated. Expanding a node materialises its children on first open and toggles `hidden` afterwards, so a deep tree costs one small dirty rectangle per interaction rather than a full re-render.',
      },
    },
  },
  argTypes: {
    selectable: { control: 'boolean' },
    checkable: { control: 'boolean' },
    defaultExpanded: { control: 'text' },
  },
  render: (args) => html`
    <e-tree
      data=${FILES}
      default-expanded=${args.defaultExpanded}
      ?selectable=${args.selectable}
      ?checkable=${args.checkable}
    ></e-tree>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { selectable: false, checkable: false, defaultExpanded: 'src' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('index.ts')).toBeInTheDocument();
  },
};

export const Selectable: Story = {
  args: { selectable: true, checkable: false, defaultExpanded: 'src' },
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('e-tree')!;
    const onSelect = fn();
    tree.addEventListener('e-select', onSelect);

    tree.querySelector<HTMLElement>('[data-value="index"]')!.click();

    expect(onSelect).toHaveBeenCalledOnce();
    expect(tree.getAttribute('value')).toBe('index');
    expect(tree.querySelector('[data-value="index"]')!.getAttribute('aria-selected')).toBe('true');
  },
};

export const Checkable: Story = {
  args: { selectable: false, checkable: true, defaultExpanded: 'src,components' },
  parameters: {
    docs: {
      description: {
        story:
          'Checking a node cascades to its whole subtree; a parent whose children are only partly checked reports `aria-checked="mixed"` and shows a minus glyph.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('e-tree')!;
    const onCheck = fn();
    tree.addEventListener('e-check', onCheck);

    // Checking the folder cascades down to both files below it.
    tree.querySelector<HTMLElement>('[data-value="components"]')!.click();
    let detail = (onCheck.mock.calls.at(-1)![0] as CustomEvent).detail;
    expect(detail.value).toEqual(['components', 'button', 'tree']);

    // Unchecking one child leaves the parent partially checked.
    tree.querySelector<HTMLElement>('[data-value="button"]')!.click();
    detail = (onCheck.mock.calls.at(-1)![0] as CustomEvent).detail;
    expect(detail.value).toEqual(['tree']);
    expect(tree.querySelector('[data-value="components"]')!.getAttribute('aria-checked')).toBe(
      'mixed',
    );
  },
};

export const ExpandCollapse: Story = {
  args: { selectable: false, checkable: false, defaultExpanded: '' },
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('e-tree')!;
    const onExpand = fn();
    tree.addEventListener('e-expand', onExpand);

    tree.querySelector<HTMLElement>('[data-expand="src"]')!.click();

    const detail = (onExpand.mock.calls.at(-1)![0] as CustomEvent).detail;
    expect(detail).toEqual({ value: 'src', expanded: true });
    expect(tree.querySelector('[data-value="index"]')).not.toBeNull();
  },
};
