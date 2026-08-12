import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Primitives/BadgeCount',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Compact numeric indicator for unread or new-item counts. Renders as a small filled chip overflowing past `max` (default 99) or as a simple dot when `dot` is set. Typically overlaid on icons, avatars, or menu items.',
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
};

export const DotOnly: Story = {
  args: { count: 3, max: 99, dot: true },
};

export const Zero: Story = {
  args: { count: 0, max: 99, dot: false },
};
