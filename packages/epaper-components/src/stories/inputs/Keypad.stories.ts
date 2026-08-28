import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/Keypad',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.3.0\n\nOn-screen numeric keypad for kiosk browsers with no operating-system keyboard. It is a form control in its own right, and mirrors every key into the control named by `for`.',
      },
    },
  },
  argTypes: {
    decimal: { control: 'boolean' },
    showDisplay: { control: 'boolean' },
    maxLength: { control: 'number' },
  },
  render: (args) => html`
    <e-keypad
      name="keypad"
      value=${args.value ?? ''}
      max-length=${args.maxLength ?? 6}
      label=${args.label ?? 'Quantity'}
      ?decimal=${args.decimal}
      ?show-display=${args.showDisplay}
    ></e-keypad>
  `,
};
export default meta;

type Story = StoryObj;

export const Numeric: Story = {
  args: { showDisplay: true, maxLength: 6 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const keypad = canvasElement.querySelector('e-keypad')!;
    expect(keypad.querySelectorAll('.ink-keypad__key')).toHaveLength(12);
  },
};

export const WithDecimalKey: Story = { args: { decimal: true, showDisplay: true } };

export const DrivingAnInput: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:16px;max-width:280px">
      <e-input id="kiosk-qty" label="Quantity" inputmode="numeric" value=""></e-input>
      <e-keypad for="kiosk-qty" max-length="4"></e-keypad>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-keypad__key')).toBeTruthy();
    });
    const keypad = canvasElement.querySelector('e-keypad')!;
    const target = canvasElement.querySelector('e-input') as HTMLElement & { value: string };
    const key = (label: string): HTMLButtonElement =>
      [...keypad.querySelectorAll<HTMLButtonElement>('.ink-keypad__key')].find(
        (k) => k.dataset['key'] === label,
      )!;
    await userEvent.click(key('2'));
    await userEvent.click(key('5'));
    expect(target.value).toBe('25');
    await userEvent.click(key('backspace'));
    expect(target.value).toBe('2');
  },
};
