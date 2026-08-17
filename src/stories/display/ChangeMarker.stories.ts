import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/ChangeMarker',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.1.0\n\nCompact current value with a persistent text-and-pattern cue only when it differs from `previous`.',
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    previous: { control: 'text' },
    label: { control: 'text' },
    prefix: { control: 'text' },
    suffix: { control: 'text' },
    precision: { control: 'number' },
    tolerance: { control: 'number' },
    showPrevious: { control: 'boolean' },
  },
  render: (args) => html`
    <e-change-marker
      value=${args.value ?? ''}
      previous=${args.previous ?? ''}
      label=${args.label || ''}
      prefix=${args.prefix || ''}
      suffix=${args.suffix || ''}
      precision=${args.precision ?? ''}
      tolerance=${args.tolerance ?? 0}
      ?show-previous=${args.showPrevious}
    ></e-change-marker>
  `,
};
export default meta;

type Story = StoryObj;

export const Increased: Story = {
  args: {
    label: 'Temperature',
    previous: '21.8',
    value: '22.4',
    suffix: ' °C',
    precision: 1,
    showPrevious: true,
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const marker = canvasElement.querySelector('e-change-marker')!;
    expect(marker.querySelector('.ink-change-marker')!.getAttribute('data-change')).toBe('up');
    expect(marker.querySelector('.ink-change-marker__cue')!.textContent).toContain('Increased');
  },
};

export const TextChanged: Story = {
  args: { label: 'Mode', previous: 'Standby', value: 'Active', showPrevious: true },
};

export const Unchanged: Story = { args: { label: 'Readers', previous: '48', value: '48' } };
