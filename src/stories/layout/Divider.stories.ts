import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Layout/Divider',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Horizontal or vertical rule used to separate sections. Supports `solid` and `dashed` strokes and an optional centered inline label.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['solid', 'dashed'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    label: { control: 'text', description: 'Optional centered label' },
  },
  render: (args) => html`
    <div
      style="padding:16px;${args.orientation === 'vertical'
        ? 'display:flex;height:60px;align-items:stretch'
        : ''}"
    >
      <e-divider
        variant=${args.variant}
        orientation=${args.orientation}
        label=${args.label || ''}
      ></e-divider>
    </div>
  `,
};
export default meta;

type Story = StoryObj;

export const Solid: Story = {
  args: { variant: 'solid', orientation: 'horizontal', label: '' },
};

export const Dashed: Story = {
  args: { variant: 'dashed', orientation: 'horizontal', label: '' },
};

export const WithLabel: Story = {
  args: { variant: 'solid', orientation: 'horizontal', label: 'OR' },
};

export const Vertical: Story = {
  args: { variant: 'solid', orientation: 'vertical', label: '' },
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:24px;padding:16px">
      <div>
        <p style="margin:0 0 8px">Solid</p>
        <e-divider variant="solid"></e-divider>
      </div>
      <div>
        <p style="margin:0 0 8px">Dashed</p>
        <e-divider variant="dashed"></e-divider>
      </div>
      <div>
        <p style="margin:0 0 8px">Labeled</p>
        <e-divider label="Section"></e-divider>
      </div>
      <div style="display:flex;gap:16px;height:40px;align-items:center">
        <span>Left</span>
        <e-divider orientation="vertical"></e-divider>
        <span>Right</span>
      </div>
    </div>
  `,
};
