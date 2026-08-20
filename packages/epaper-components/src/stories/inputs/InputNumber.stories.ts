import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Inputs/InputNumber',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nNumeric input with stepper buttons. Supports `min`, `max` and `step` constraints and clamps the value on commit.',
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    ariaLabel: { control: 'text', description: 'Accessible label for the numeric input' },
  },
  render: (args) => html`
    <e-input-number
      value=${args.value ?? 0}
      min=${args.min ?? ''}
      max=${args.max ?? ''}
      step=${args.step ?? 1}
      aria-label=${args.ariaLabel || 'Number'}
    ></e-input-number>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { value: 5, step: 1 },
};

export const WithBounds: Story = {
  args: { value: 10, min: 0, max: 100, step: 10 },
};

export const Decimal: Story = {
  args: { value: 1.5, min: 0, max: 10, step: 0.5 },
};

export const Quantity: Story = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:12px">
      <e-text kind="label" as="span">Quantity</e-text>
      <e-input-number value="1" min="1" max="99" step="1" aria-label="Quantity"></e-input-number>
    </div>
  `,
};

export const Stepping: Story = {
  args: { value: 5, min: 0, max: 10, step: 1 },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-number')).toBeTruthy();
    });
    const el = canvasElement.querySelector('e-input-number') as HTMLElement & {
      value: string;
    };
    const input = el.querySelector<HTMLInputElement>('input')!;
    const inc = el.querySelector<HTMLElement>('[data-step="1"]')!;
    const dec = el.querySelector<HTMLElement>('[data-step="-1"]')!;

    await userEvent.click(inc);
    expect(input.value).toBe('6');
    await userEvent.click(dec);
    await userEvent.click(dec);
    expect(input.value).toBe('4');

    for (let i = 0; i < 20; i++) await userEvent.click(inc);
    expect(input.value).toBe('10');

    for (let i = 0; i < 20; i++) await userEvent.click(dec);
    expect(input.value).toBe('0');

    input.value = '7';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.value).toBe('7');

    el.value = '3';
    expect(input.value).toBe('3');
  },
};

export const Unbounded: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-number')).toBeTruthy();
    });
    const el = canvasElement.querySelector('e-input-number') as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('input')!;
    const dec = el.querySelector<HTMLElement>('[data-step="-1"]')!;
    await userEvent.click(dec);
    expect(input.value).toBe('-2');
  },
  render: () => html`
    <e-input-number value="0" step="2" aria-label="Unbounded number"></e-input-number>
  `,
};
