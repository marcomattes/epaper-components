import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Meter',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.1.0\n\nDiscrete bounded measurement with explicit low, in-range and high cues. It uses segments and hatch patterns instead of animation or color-only status.',
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    segments: { control: { type: 'number', min: 1, max: 100 } },
    low: { control: 'number' },
    high: { control: 'number' },
    label: { control: 'text' },
    unit: { control: 'text' },
    hideValue: { control: 'boolean' },
  },
  render: (args) => html`
    <e-meter
      value=${args.value ?? 72}
      min=${args.min ?? 0}
      max=${args.max ?? 100}
      segments=${args.segments ?? 10}
      low=${args.low ?? 20}
      high=${args.high ?? 90}
      label=${args.label || 'Battery'}
      unit=${args.unit || '%'}
      ?hide-value=${args.hideValue}
      style="display:block;max-width:380px"
    ></e-meter>
  `,
};
export default meta;

type Story = StoryObj;

export const InRange: Story = {
  args: { value: 72, label: 'Battery', unit: '%', segments: 10, low: 20, high: 90 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const meter = canvasElement.querySelector('e-meter')!;
    expect(meter.getAttribute('role')).toBe('meter');
    expect(meter.querySelectorAll('.ink-meter__segment[data-on]')).toHaveLength(7);
  },
};

export const Low: Story = { args: { value: 12, label: 'Battery', unit: '%', low: 20 } };

export const High: Story = {
  args: { value: 96, label: 'Panel temperature', unit: ' °C', high: 80 },
};
