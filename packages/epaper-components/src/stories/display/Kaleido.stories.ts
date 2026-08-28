import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Display/Kaleido',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Showcase swatch for the five Kaleido accent colors (red, orange, yellow, green, blue). These are the **only** fills permitted in the system and are reserved for state — destructive, warning, attention, success, link/info.',
      },
    },
  },
  argTypes: {
    color: {
      control: 'select',
      options: ['ink', 'paper', 'red', 'orange', 'yellow', 'green', 'blue'],
      description: 'Fill color',
    },
    cell: {
      control: 'select',
      options: ['2', '4', '8'],
      description: 'Dither cell size',
    },
    size: { control: 'number', description: 'Canvas size in px' },
  },
  render: (args) => html`
    <e-kaleido
      color=${args.color || 'ink'}
      cell=${args.cell || '4'}
      size=${args.size || 200}
    ></e-kaleido>
  `,
};
export default meta;

type Story = StoryObj;

export const Ink: Story = {
  args: { color: 'ink', cell: '4', size: 200 },
};

export const Red: Story = {
  args: { color: 'red', cell: '4', size: 200 },
};

export const Blue: Story = {
  args: { color: 'blue', cell: '4', size: 200 },
};

export const AllColors: Story = {
  render: () => html`
    <div style="display:flex;flex-wrap:wrap;gap:16px">
      ${['ink', 'red', 'orange', 'yellow', 'green', 'blue'].map(
        (c) => html`
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
            <e-kaleido color=${c} cell="4" size="120"></e-kaleido>
            <e-text kind="small" as="span">${c}</e-text>
          </div>
        `,
      )}
    </div>
  `,
};

export const CellSizes: Story = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:flex-end">
      ${['2', '4', '8'].map(
        (cell) => html`
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
            <e-kaleido color="blue" cell=${cell} size="160"></e-kaleido>
            <e-text kind="small" as="span">cell=${cell}</e-text>
          </div>
        `,
      )}
    </div>
  `,
};
