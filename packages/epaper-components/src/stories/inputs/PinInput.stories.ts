import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/PinInput',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.3.0\n\nFixed-length code entry as separate digit boxes. Typing advances, `Backspace` on an empty box steps back, and pasting a code fills every box at once. `inputmode="numeric"` brings up the numeric soft keyboard; `masked` hides the digits.',
      },
    },
  },
  argTypes: {
    length: { control: 'number' },
    masked: { control: 'boolean' },
  },
  render: (args) => html`
    <e-pin-input
      name="pin"
      length=${args.length ?? 4}
      value=${args.value ?? ''}
      label=${args.label ?? 'Access code'}
      hint=${args.hint ?? ''}
      ?masked=${args.masked}
    ></e-pin-input>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { length: 4, value: '' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const pin = canvasElement.querySelector('e-pin-input')!;
    expect(pin.querySelectorAll('.ink-pin__box')).toHaveLength(4);
  },
};

export const Prefilled: Story = { args: { length: 4, value: '2026' } };

export const Masked: Story = { args: { length: 4, value: '1234', masked: true } };

export const SixDigits: Story = {
  args: { length: 6, label: 'Confirmation code', hint: 'Six digits from the display' },
};

export const Typing: Story = {
  args: { length: 4 },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-pin__box')).toBeTruthy();
    });
    const pin = canvasElement.querySelector('e-pin-input') as HTMLElement & { value: string };
    const boxes = [...pin.querySelectorAll<HTMLInputElement>('.ink-pin__box')];
    await userEvent.click(boxes[0]);
    await userEvent.keyboard('4711');
    expect(pin.value).toBe('4711');
    expect(boxes[3].value).toBe('1');
  },
};
