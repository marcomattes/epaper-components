import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Inputs/TimePicker',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Text field paired with an hour/minute popover for picking a time. Values are exchanged as 24-hour `HH:MM` strings.',
      },
    },
  },
  argTypes: {
    value: { control: 'text', description: 'Initial time (HH:MM)' },
  },
  render: (args) => html` <e-time-picker value=${args.value || '00:00'}></e-time-picker> `,
};
export default meta;

type Story = StoryObj;

export const Midnight: Story = {
  args: { value: '00:00' },
};

export const Morning: Story = {
  args: { value: '09:30' },
};

export const Afternoon: Story = {
  args: { value: '14:45' },
};

export const Stepping: Story = {
  args: { value: '10:30' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-timepicker')).toBeTruthy();
    });
    const tp = canvasElement.querySelector('e-time-picker') as HTMLElement;
    const click = (sel: string) => userEvent.click(tp.querySelector<HTMLElement>(sel)!);

    await click('[data-axis="h"][data-dir="1"]');
    expect(tp.getAttribute('value')).toBe('11:30');
    await click('[data-axis="h"][data-dir="-1"]');
    await click('[data-axis="h"][data-dir="-1"]');
    expect(tp.getAttribute('value')).toBe('09:30');
    await click('[data-axis="m"][data-dir="1"]');
    expect(tp.getAttribute('value')).toBe('09:31');
    await click('[data-axis="m"][data-dir="-1"]');
    await click('[data-axis="m"][data-dir="-1"]');
    expect(tp.getAttribute('value')).toBe('09:29');
  },
};

export const WrapAround: Story = {
  args: { value: '00:00' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-timepicker')).toBeTruthy();
    });
    const tp = canvasElement.querySelector('e-time-picker') as HTMLElement;
    const click = (sel: string) => userEvent.click(tp.querySelector<HTMLElement>(sel)!);
    await click('[data-axis="h"][data-dir="-1"]');
    await click('[data-axis="m"][data-dir="-1"]');
    expect(tp.getAttribute('value')).toBe('23:59');
  },
};

export const InForm: Story = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:flex-end">
      <e-date-picker value="2026-05-01"></e-date-picker>
      <e-time-picker value="10:00"></e-time-picker>
    </div>
  `,
};

export const KeyboardNavigation: Story = {
  args: { value: '10:30' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-timepicker')).toBeTruthy();
    });
    const tp = canvasElement.querySelector('e-time-picker') as HTMLElement;
    const hour = () => tp.querySelector<HTMLElement>('[data-cell="h"]')!;
    const minute = () => tp.querySelector<HTMLElement>('[data-cell="m"]')!;

    hour().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(tp.getAttribute('value')).toBe('11:30');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(tp.getAttribute('value')).toBe('09:30');

    // Move focus to minutes via ArrowRight.
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(minute());
    await userEvent.keyboard('{ArrowUp}');
    expect(tp.getAttribute('value')).toBe('09:31');

    // Home/End on minute axis.
    await userEvent.keyboard('{Home}');
    expect(tp.getAttribute('value')).toBe('09:00');
    await userEvent.keyboard('{End}');
    expect(tp.getAttribute('value')).toBe('09:59');

    // ArrowLeft moves back to hour cell.
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(hour());
  },
};
