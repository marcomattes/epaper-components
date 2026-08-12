import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, waitFor } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const EVENTS = JSON.stringify([
  { date: '2026-04-26', title: 'Sprint Review' },
  { date: '2026-04-28', title: 'Design Sync' },
  { date: '2026-04-30', title: 'Release 2.0' },
  { date: '2026-05-05', title: 'All-Hands' },
]);

const meta: Meta = {
  title: 'Display/Calendar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Month-grid date display. Read-only by default; supply `events` (a JSON array of `{ date, title }`) to mark dated entries. Useful for editorial calendars, schedules and date overviews.',
      },
    },
  },
  argTypes: {
    value: { control: 'text', description: 'Initially displayed date (YYYY-MM-DD)' },
  },
  render: (args) => html`
    <e-calendar value=${args.value || '2026-04-26'} events=${EVENTS}></e-calendar>
  `,
};
export default meta;

type Story = StoryObj;

export const CurrentMonth: Story = {
  args: { value: '2026-04-26' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const cal = canvasElement.querySelector('e-calendar');
    expect(cal).toBeInTheDocument();
  },
};

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    expect(canvasElement.querySelector('e-calendar')).toBeInTheDocument();
  },
  render: () => html`<e-calendar value="2026-04-01"></e-calendar>`,
};

export const WithManyEvents: Story = {
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    expect(canvasElement.querySelector('e-calendar')).toBeInTheDocument();
  },
  render: () => html`
    <e-calendar
      value="2026-04-26"
      events=${JSON.stringify([
        { date: '2026-04-01', title: 'Q2 Kickoff' },
        { date: '2026-04-07', title: 'Design Review' },
        { date: '2026-04-14', title: 'Engineering Sync' },
        { date: '2026-04-21', title: 'Sprint Planning' },
        { date: '2026-04-26', title: 'Sprint Review' },
        { date: '2026-04-28', title: 'Retrospective' },
      ])}
    ></e-calendar>
  `,
};

export const Interactions: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-calendar')).toBeTruthy();
    });
    const cal = canvasElement.querySelector('e-calendar') as HTMLElement;
    const next = cal.querySelector<HTMLElement>('[data-step="1"]')!;
    next.click();
    expect(cal.querySelector('.ink-calendar__title')!.textContent).toContain('February');

    for (let i = 0; i < 11; i++) {
      (cal.querySelector('[data-step="1"]') as HTMLElement).click();
    }
    expect(cal.querySelector('.ink-calendar__title-eyebrow')!.textContent).toContain('2027');

    for (let i = 0; i < 13; i++) {
      (cal.querySelector('[data-step="-1"]') as HTMLElement).click();
    }
    expect(cal.querySelector('.ink-calendar__title-eyebrow')!.textContent).toContain('2025');

    const day = cal.querySelector<HTMLButtonElement>('.ink-calendar__cell[data-day="15"]')!;
    day.click();
    expect(cal.getAttribute('value')).toMatch(/-15$/);
  },
  render: () => html`<e-calendar value="2026-01-10"></e-calendar>`,
};

export const InvalidJson: Story = {
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('e-calendar')).toBeInTheDocument();
  },
  render: () => html`<e-calendar value="2026-04-01" events="not json"></e-calendar>`,
};
