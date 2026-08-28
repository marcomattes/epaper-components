import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const ITEMS = [
  { h: 80, label: 'Short' },
  { h: 140, label: 'Tall' },
  { h: 100, label: 'Medium' },
  { h: 60, label: 'Tiny' },
  { h: 160, label: 'Very Tall' },
  { h: 90, label: 'Medium' },
  { h: 120, label: 'Tall' },
  { h: 70, label: 'Short' },
  { h: 110, label: 'Medium' },
];

const meta: Meta = {
  title: 'Layout/Masonry',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Pinterest-style multi-column layout that packs items of varying heights without leaving gaps. Configurable column count and inter-item spacing.',
      },
    },
  },
  argTypes: {
    columns: { control: 'number', description: 'Number of columns' },
    gap: { control: 'number', description: 'Gap in px' },
  },
  render: (args) => html`
    <e-masonry columns=${args.columns} gap=${args.gap}>
      ${ITEMS.map(
        (it) => html`
          <div
            style="height:${it.h}px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px"
          >
            ${it.label}
          </div>
        `,
      )}
    </e-masonry>
  `,
};
export default meta;

type Story = StoryObj;

export const ThreeColumns: Story = {
  args: { columns: 3, gap: 12 },
};

export const TwoColumns: Story = {
  args: { columns: 2, gap: 16 },
};

export const FourColumns: Story = {
  args: { columns: 4, gap: 8 },
};
