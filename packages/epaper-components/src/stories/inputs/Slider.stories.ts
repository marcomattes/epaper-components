import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, waitFor } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/Slider',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.3.0\n\nRange slider with a 28×36 grip, a printed value readout and optional tick marks. The value is always printed next to the track: a thumb position alone is not readable on a panel without sub-pixel rendering.',
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    ticks: { control: 'number' },
  },
  render: (args) => html`
    <div style="max-width:420px">
      <e-slider
        name="slider"
        min=${args.min ?? 0}
        max=${args.max ?? 100}
        step=${args.step ?? 1}
        value=${args.value ?? 50}
        ticks=${args.ticks ?? ''}
        unit=${args.unit ?? ''}
        label=${args.label ?? 'Brightness'}
        ?disabled=${args.disabled}
      ></e-slider>
    </div>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { value: 50, min: 0, max: 100, step: 1 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const slider = canvasElement.querySelector('e-slider')!;
    expect(slider.querySelector<HTMLInputElement>('input')!.value).toBe('50');
    expect(slider.querySelector('.ink-slider__value')!.textContent).toBe('50');
  },
};

export const WithTicks: Story = { args: { value: 60, min: 0, max: 100, step: 10, ticks: 10 } };

export const Temperature: Story = {
  args: { value: 21, min: 16, max: 28, step: 0.5, ticks: 6, unit: '°C', label: 'Target' },
};

export const Disabled: Story = { args: { value: 30, disabled: true } };

export const Dragging: Story = {
  args: { value: 20, min: 0, max: 100, step: 20, ticks: 5 },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-slider__input')).toBeTruthy();
    });
    const slider = canvasElement.querySelector('e-slider') as HTMLElement & { value: number };
    const input = slider.querySelector<HTMLInputElement>('input')!;
    input.value = '80';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(slider.value).toBe(80);
    expect(slider.querySelector('.ink-slider__value')!.textContent).toBe('80');
  },
};
