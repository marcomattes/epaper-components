import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Progress',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Static progress indicator. Renders as a linear bar or as discrete steps. No animation: the bar updates as a single dirty rectangle for partial-refresh-friendly behaviour.',
      },
    },
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    max: { control: 'number' },
    variant: { control: 'select', options: ['linear', 'steps'] },
    steps: { control: 'number' },
    label: { control: 'text' },
    hideLabel: { control: 'boolean' },
  },
  render: (args) => html`
    <e-progress
      value=${args.value ?? 0}
      max=${args.max ?? 100}
      variant=${args.variant || 'linear'}
      steps=${args.steps ?? 5}
      label=${args.label || ''}
      ?hide-label=${args.hideLabel}
      style="display:block;max-width:340px"
    ></e-progress>
  `,
};
export default meta;

type Story = StoryObj;

export const Linear: Story = {
  args: { value: 42, label: 'Upload', variant: 'linear' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const bar = canvasElement.querySelector('e-progress')!;
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
  },
};

export const Steps: Story = {
  args: { value: 3, max: 5, steps: 5, variant: 'steps', label: 'Onboarding' },
  play: async ({ canvasElement }) => {
    const segs = canvasElement.querySelectorAll('.ink-progress__seg');
    expect(segs.length).toBe(5);
    const filled = canvasElement.querySelectorAll('.ink-progress__seg[data-on]');
    expect(filled.length).toBe(3);
  },
};

export const Full: Story = {
  args: { value: 100, label: 'Done', variant: 'linear' },
};

export const NoLabel: Story = {
  args: { value: 25, label: 'Hidden', hideLabel: true, variant: 'linear' },
  play: async ({ canvasElement }) => {
    const cap = canvasElement.querySelector('.ink-progress__label');
    expect(cap).toBeNull();
  },
};
