import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/DescriptionList',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Semantic key/value list rendered with a `<dl>`. Prefer this over a raw `<dl>` when you want consistent layout, optional borders and a multi-column grid.',
      },
    },
  },
  argTypes: {
    columns: { control: { type: 'number', min: 1, max: 4 } },
    layout: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    bordered: { control: 'boolean' },
  },
  render: (args) => html`
    <e-description-list
      columns=${String(args.columns ?? 1)}
      layout=${args.layout || 'horizontal'}
      ?bordered=${args.bordered}
    >
      <e-desc-item term="Order">EP-2048-AX</e-desc-item>
      <e-desc-item term="Status">Shipped</e-desc-item>
      <e-desc-item term="Carrier">DHL</e-desc-item>
      <e-desc-item term="Updated">Today, 14:02</e-desc-item>
    </e-description-list>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { columns: 1, layout: 'horizontal', bordered: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('EP-2048-AX')).toBeInTheDocument();
    expect(canvas.getByText('Carrier')).toBeInTheDocument();
  },
};

export const TwoColumn: Story = {
  args: { columns: 2, layout: 'horizontal', bordered: true },
};
export const Vertical: Story = {
  args: { columns: 2, layout: 'vertical', bordered: false },
};
