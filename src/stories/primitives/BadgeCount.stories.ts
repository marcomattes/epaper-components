import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Primitives/BadgeCount',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nCompact numeric indicator for unread or new-item counts. Renders as a small filled chip overflowing past `max` (default 99) or as a simple dot when `dot` is set. Typically overlaid on icons, avatars, or menu items.',
      },
    },
  },
  argTypes: {
    count: { control: 'number', description: 'Number to display' },
    max: { control: 'number', description: 'Overflow cap (default 99)' },
    dot: { control: 'boolean', description: 'Show as dot instead of number' },
  },
  render: (args) => html`
    <e-badge-count count=${args.count} max=${args.max} ?dot=${args.dot}>
      <e-button variant="secondary">Inbox</e-button>
    </e-badge-count>
  `,
};
export default meta;

type Story = StoryObj;

export const WithCount: Story = {
  args: { count: 5, max: 99, dot: false },
};

export const Overflow: Story = {
  args: { count: 120, max: 99, dot: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    expect(canvasElement.querySelector('.ink-badge-count__num')?.textContent).toBe('99+');
  },
};

export const DotOnly: Story = {
  args: { count: 3, max: 99, dot: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const dot = canvasElement.querySelector('.ink-badge-count__dot');
    expect(dot).toHaveAttribute('role', 'status');
    expect(dot).toHaveAttribute('aria-label', '3');
  },
};

export const Zero: Story = {
  args: { count: 0, max: 99, dot: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    expect(canvasElement.querySelector('.ink-badge-count__num')).not.toBeInTheDocument();
  },
};

export const ReactiveBoundaryChanges: Story = {
  args: { count: 1, max: 5, dot: false },
  play: async ({ canvasElement }) => {
    const badge = canvasElement.querySelector('e-badge-count')!;
    const initialIndicator = badge.querySelector('.ink-badge-count__num');
    badge.setAttribute('count', '6');
    expect(badge.querySelector('.ink-badge-count__num')).toBe(initialIndicator);
    expect(initialIndicator).toHaveTextContent('5+');
    badge.setAttribute('dot', '');
    expect(badge.querySelector('.ink-badge-count__num')).not.toBeInTheDocument();
    expect(badge.querySelector('.ink-badge-count__dot')).toHaveAttribute('aria-label', '6');
    await checkA11y(canvasElement);
  },
};
