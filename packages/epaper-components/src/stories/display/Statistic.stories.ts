import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Statistic',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'KPI block: large numeric value with label and an optional trend marker. The trend glyph is static (no animation) so it does not provoke an e-paper full refresh.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    prefix: { control: 'text' },
    suffix: { control: 'text' },
    precision: { control: 'number' },
    trend: { control: 'inline-radio', options: ['', 'up', 'down', 'flat'] },
    delta: { control: 'text' },
  },
  render: (args) => html`
    <e-statistic
      label=${args.label || ''}
      value=${args.value || ''}
      prefix=${args.prefix || ''}
      suffix=${args.suffix || ''}
      precision=${args.precision ?? ''}
      trend=${args.trend || ''}
      delta=${args.delta || ''}
    ></e-statistic>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Active Subscribers', value: '12480', trend: 'up', delta: '8.4%' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('12480')).toBeInTheDocument();
    expect(canvas.getByText('8.4%')).toBeInTheDocument();
  },
};

export const Currency: Story = {
  args: {
    label: 'Revenue',
    value: '12480.5',
    prefix: '$',
    precision: 2,
    trend: 'up',
    delta: '+3.2%',
  },
};

export const Percent: Story = {
  args: { label: 'Battery', value: '76', suffix: '%', trend: 'down', delta: '-2%' },
};

export const Flat: Story = {
  args: { label: 'Sessions', value: '342', trend: 'flat', delta: '0' },
};

export const Grid: Story = {
  render: () => html`
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">
      <e-statistic label="Pages" value="48"></e-statistic>
      <e-statistic label="Words" value="12480"></e-statistic>
      <e-statistic label="Score" value="92" suffix="/100" trend="up" delta="+4"></e-statistic>
    </div>
  `,
};
