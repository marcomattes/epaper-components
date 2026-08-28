import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Sparkline',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.1.0',
      description: {
        component:
          'Monochrome SVG mini-chart. The first-to-last trend is repeated as a glyph and readable text, and updates replace only the polyline coordinates.',
      },
    },
  },
  argTypes: {
    values: { control: 'object' },
    label: { control: 'text' },
    hideCaption: { control: 'boolean' },
  },
  render: (args) => html`
    <e-sparkline
      values=${JSON.stringify(args.values ?? [])}
      label=${args.label || ''}
      ?hide-caption=${args.hideCaption}
      style="display:block;max-width:420px"
    ></e-sparkline>
  `,
};
export default meta;

type Story = StoryObj;

export const Rising: Story = {
  args: { label: 'Requests', values: [12, 18, 15, 24, 28, 31] },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const sparkline = canvasElement.querySelector('e-sparkline')!;
    expect(sparkline.querySelector('.ink-sparkline')!.getAttribute('data-trend')).toBe('up');
    expect(sparkline.querySelector('.ink-sparkline__line')!.getAttribute('points')).not.toBe('');
  },
};

export const Falling: Story = {
  args: { label: 'Queue depth', values: [42, 39, 31, 34, 26, 18] },
};

export const Empty: Story = { args: { label: 'Telemetry', values: [] } };
