import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Inputs/DatePicker',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Text field paired with a popover month calendar for picking a single date. Values are exchanged as ISO `YYYY-MM-DD` strings.',
      },
    },
  },
  argTypes: {
    value: { control: 'text', description: 'Initial date (YYYY-MM-DD)' },
    placeholder: { control: 'text' },
  },
  render: (args) => html`
    <e-date-picker
      value=${args.value || ''}
      placeholder=${args.placeholder || 'YYYY-MM-DD'}
    ></e-date-picker>
  `,
};
export default meta;

type Story = StoryObj;

export const Empty: Story = {
  args: { value: '', placeholder: 'YYYY-MM-DD' },
};

export const WithDate: Story = {
  args: { value: '2026-04-26' },
};

export const InForm: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:12px;max-width:320px">
      <e-input label="Event title" placeholder="Team meeting" />
      <e-date-picker value="2026-05-01"></e-date-picker>
    </div>
  `,
};

export const Interactions: Story = {
  args: { value: '2026-04-26' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-datepicker')).toBeTruthy();
    });
    const dp = canvasElement.querySelector('e-date-picker') as HTMLElement;
    const trigger = dp.querySelector<HTMLElement>('[data-trigger]')!;
    const pop = dp.querySelector<HTMLElement>('.ink-datepicker__pop')!;
    expect(pop.hidden).toBe(true);
    await userEvent.click(trigger);
    expect(pop.hidden).toBe(false);

    const next = pop.querySelector<HTMLElement>('[data-step="1"]')!;
    await userEvent.click(next);
    const pop2 = dp.querySelector<HTMLElement>('.ink-datepicker__pop')!;
    expect(pop2.hidden).toBe(false);

    for (let i = 0; i < 5; i++) {
      const prev = dp.querySelector<HTMLElement>('[data-step="-1"]')!;
      prev.click();
    }

    const cell = dp.querySelector<HTMLButtonElement>('.ink-datepicker__cell[data-day="15"]');
    expect(cell).toBeTruthy();
    cell!.click();
    expect(dp.getAttribute('value')).toMatch(/-15$/);

    const t2 = dp.querySelector<HTMLElement>('[data-trigger]')!;
    t2.click();
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    const pop3 = dp.querySelector<HTMLElement>('.ink-datepicker__pop')!;
    expect(pop3.hidden).toBe(true);
  },
};

export const ForwardYearBoundary: Story = {
  args: { value: '2026-12-15' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-datepicker')).toBeTruthy();
    });
    const dp = canvasElement.querySelector('e-date-picker') as HTMLElement;
    (dp.querySelector('[data-trigger]') as HTMLElement).click();
    (dp.querySelector('[data-step="1"]') as HTMLElement).click();
    expect(dp.querySelector('.ink-datepicker__nav-title')!.textContent).toContain('2027');
  },
};

export const KeyboardNavigation: Story = {
  args: { value: '2026-04-15' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-datepicker')).toBeTruthy();
    });
    const dp = canvasElement.querySelector('e-date-picker') as HTMLElement;
    const trigger = dp.querySelector<HTMLElement>('[data-trigger]')!;
    const pop = dp.querySelector<HTMLElement>('.ink-datepicker__pop')!;

    // Open via keyboard.
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(pop.hidden).toBe(false);
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('15');

    // ArrowRight → day 16.
    await userEvent.keyboard('{ArrowRight}');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('16');

    // ArrowDown → +7 days = 23.
    await userEvent.keyboard('{ArrowDown}');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('23');

    // ArrowLeft → 22.
    await userEvent.keyboard('{ArrowLeft}');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('22');

    // ArrowUp → -7 = 15.
    await userEvent.keyboard('{ArrowUp}');
    expect((document.activeElement as HTMLElement).dataset['day']).toBe('15');

    // PageDown → next month, focuses day 15 of May.
    await userEvent.keyboard('{PageDown}');
    expect(dp.querySelector('.ink-datepicker__nav-title')!.textContent).toContain('May');

    // PageUp → back to April.
    await userEvent.keyboard('{PageUp}');
    expect(dp.querySelector('.ink-datepicker__nav-title')!.textContent).toContain('April');

    // Enter selects current cell, closes popover.
    await userEvent.keyboard('{Enter}');
    expect(pop.hidden).toBe(true);
    expect(dp.getAttribute('value')).toMatch(/-15$/);

    // Reopen, Escape closes.
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(pop.hidden).toBe(false);
    await userEvent.keyboard('{Escape}');
    expect(pop.hidden).toBe(true);
  },
};
