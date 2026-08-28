import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Segmented',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Single-select control rendered as a flat row of mutually-exclusive segments. Use it as a lightweight alternative to Tabs or RadioGroup when options are short labels.',
      },
    },
  },
  argTypes: {
    value: { control: 'text', description: 'Active segment value' },
  },
  render: (args) => html`
    <e-segmented value=${args.value || 'day'}>
      <e-segment value="day" label="Day" />
      <e-segment value="week" label="Week" />
      <e-segment value="month" label="Month" />
      <e-segment value="year" label="Year" />
    </e-segmented>
  `,
};
export default meta;

type Story = StoryObj;

export const Day: Story = {
  args: { value: 'day' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-segmented__btn')).toBeTruthy();
    });
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Day')).toBeInTheDocument();
    expect(canvas.getByText('Week')).toBeInTheDocument();
    const active = canvasElement.querySelector('.ink-segmented__btn[data-value="day"]');
    expect(active?.getAttribute('aria-checked')).toBe('true');
  },
};

export const Month: Story = {
  args: { value: 'month' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-segmented__btn')).toBeTruthy();
    });
    await checkA11y(canvasElement);
    const segments = canvasElement.querySelectorAll('.ink-segmented__btn');
    expect(segments).toHaveLength(4);
  },
};

export const ViewToggle: Story = {
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('List')).toBeInTheDocument();
    expect(canvas.getByText('Grid')).toBeInTheDocument();
  },
  render: () => html`
    <e-segmented value="list">
      <e-segment value="list" label="List" />
      <e-segment value="grid" label="Grid" />
      <e-segment value="board" label="Board" />
    </e-segmented>
  `,
};

export const TwoOptions: Story = {
  render: () => html`
    <e-segmented value="on">
      <e-segment value="on" label="On" />
      <e-segment value="off" label="Off" />
    </e-segmented>
  `,
};

export const Switching: Story = {
  args: { value: 'day' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-segmented__btn')).toBeTruthy();
    });
    const seg = canvasElement.querySelector('e-segmented') as HTMLElement;
    const week = seg.querySelector<HTMLElement>('[data-value="week"]')!;
    await userEvent.click(week);
    expect(seg.getAttribute('value')).toBe('week');
    expect(week.getAttribute('aria-checked')).toBe('true');
    const day = seg.querySelector<HTMLElement>('[data-value="day"]')!;
    expect(day.getAttribute('aria-checked')).toBe('false');

    seg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seg.getAttribute('value')).toBe('week');
  },
};
