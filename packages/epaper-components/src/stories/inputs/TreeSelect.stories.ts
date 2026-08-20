import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const DATA = JSON.stringify([
  {
    value: 'europe',
    label: 'Europe',
    children: [
      { value: 'de', label: 'Germany' },
      { value: 'fr', label: 'France' },
      {
        value: 'ch',
        label: 'Switzerland',
        children: [
          { value: 'zh', label: 'Zurich' },
          { value: 'ge', label: 'Geneva' },
        ],
      },
    ],
  },
  {
    value: 'americas',
    label: 'Americas',
    children: [
      { value: 'us', label: 'United States' },
      { value: 'ca', label: 'Canada' },
      { value: 'br', label: 'Brazil' },
    ],
  },
]);

const meta: Meta = {
  title: 'Inputs/TreeSelect',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nSelect that exposes a hierarchical tree of options collapsible by branch. Useful for taxonomies, org charts or geo selectors where parent/child context matters.',
      },
    },
  },
  argTypes: {
    value: { control: 'text', description: 'Selected node value' },
    defaultExpanded: {
      control: 'text',
      description: 'Comma-separated values of initially expanded nodes',
    },
  },
  render: (args) => html`
    <e-tree-select
      data=${DATA}
      value=${args.value || ''}
      default-expanded=${args.defaultExpanded || 'europe'}
    ></e-tree-select>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { value: '', defaultExpanded: 'europe' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const tree = canvasElement.querySelector('e-tree-select');
    expect(tree).toBeInTheDocument();
    expect(canvasElement.textContent).toContain('Germany');
    expect(canvasElement.textContent).toContain('France');
    expect(canvasElement.textContent).not.toContain('United States');
  },
};

export const WithValue: Story = {
  args: { value: 'zh', defaultExpanded: 'europe,ch' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const tree = canvasElement.querySelector('e-tree-select');
    expect(tree).toBeInTheDocument();
    const selectedRow = canvasElement.querySelector(
      '.ink-tree__row[aria-selected="true"]',
    ) as HTMLElement | null;
    expect(selectedRow).not.toBeNull();
    expect(selectedRow!.dataset['value']).toBe('zh');
  },
};

export const ExpandAndSelect: Story = {
  args: { value: '', defaultExpanded: '' },
  render: () => html`<e-tree-select data=${DATA} default-expanded=""></e-tree-select>`,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const tree = canvasElement.querySelector('e-tree-select') as HTMLElement;
    expect(canvasElement.textContent).not.toContain('Germany');
    const expandBtn = canvasElement.querySelector('[data-expand="europe"]') as HTMLButtonElement;
    expect(expandBtn).toBeInTheDocument();
    await userEvent.click(expandBtn);
    expect(canvasElement.textContent).toContain('Germany');
    let captured: string | null = null;
    tree.addEventListener(
      'e-change',
      (e) => {
        captured = (e as CustomEvent).detail.value;
      },
      { once: true },
    );
    const row = canvasElement.querySelector('.ink-tree__row[data-value="de"]') as HTMLElement;
    await userEvent.click(row);
    expect(captured).toBe('de');
    expect(tree.getAttribute('value')).toBe('de');
  },
};

export const KeyboardNavigation: Story = {
  args: { value: '', defaultExpanded: '' },
  render: () => html`<e-tree-select data=${DATA} default-expanded=""></e-tree-select>`,
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('e-tree-select') as HTMLElement;
    const row = (v: string) =>
      tree.querySelector<HTMLElement>(`.ink-tree__row[data-value="${v}"]`)!;

    // First row gets initial focus.
    row('europe').focus();
    expect(document.activeElement).toBe(row('europe'));

    // ArrowDown to next visible row.
    await userEvent.keyboard('{ArrowDown}');
    expect((document.activeElement as HTMLElement).dataset['value']).toBe('americas');

    // ArrowUp back.
    await userEvent.keyboard('{ArrowUp}');
    expect((document.activeElement as HTMLElement).dataset['value']).toBe('europe');

    // ArrowRight expands collapsed node.
    expect(
      tree.querySelector<HTMLElement>('[data-expand="europe"]')!.getAttribute('aria-label'),
    ).toContain('Expand');
    await userEvent.keyboard('{ArrowRight}');
    expect(row('europe').getAttribute('aria-expanded')).toBe('true');
    expect(canvasElement.textContent).toContain('Germany');

    // ArrowRight again steps into first child.
    await userEvent.keyboard('{ArrowRight}');
    expect((document.activeElement as HTMLElement).dataset['value']).toBe('de');

    // ArrowLeft on a leaf goes to parent.
    await userEvent.keyboard('{ArrowLeft}');
    expect((document.activeElement as HTMLElement).dataset['value']).toBe('europe');

    // ArrowLeft on expanded node collapses it.
    await userEvent.keyboard('{ArrowLeft}');
    expect(row('europe').getAttribute('aria-expanded')).toBe('false');

    // End jumps to last visible row.
    await userEvent.keyboard('{End}');
    expect((document.activeElement as HTMLElement).dataset['value']).toBe('americas');

    // Enter selects.
    await userEvent.keyboard('{Enter}');
    expect(tree.getAttribute('value')).toBe('americas');
  },
};
