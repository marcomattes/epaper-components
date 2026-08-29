import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const DAY_EVENTS = [
  {
    date: '2026-08-28',
    start: '08:30',
    end: '09:00',
    title: 'Shift handover',
    status: 'confirmed',
  },
  { date: '2026-08-28', start: '09:00', end: '10:30', title: 'Line review', status: 'confirmed' },
  { date: '2026-08-28', start: '14:00', end: '15:30', title: 'Maintenance', status: 'tentative' },
  { date: '2026-08-28', start: '16:00', end: '16:30', title: 'Debrief', status: 'cancelled' },
  { date: '2026-08-28', title: 'Audit week' },
];

const WEEK_EVENTS = [
  ...DAY_EVENTS,
  { date: '2026-08-24', start: '09:00', end: '12:00', title: 'Retooling' },
  { date: '2026-08-25', start: '11:00', end: '11:45', title: 'Supplier call' },
  { date: '2026-08-26', start: '13:00', end: '17:00', title: 'Training' },
  { date: '2026-08-27', start: '10:00', end: '10:30', title: 'Standup' },
];

const meta: Meta = {
  title: 'Display/Agenda',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v2.0.0',
      description: {
        component:
          'Day or week agenda on a proportional time axis. Entries are the same `{date, title, start?, end?, status?}` objects `<e-calendar>` reads, so one dataset feeds both. Free stretches are labelled rather than left blank, and the "now" marker is drawn only from the `now` attribute — the component owns no timer.',
      },
    },
  },
  argTypes: {
    view: { control: 'inline-radio', options: ['day', 'week'] },
    startHour: { control: 'number' },
    endHour: { control: 'number' },
    hideGaps: { control: 'boolean' },
  },
  render: (args) => html`
    <e-agenda
      date="2026-08-28"
      view=${args.view ?? 'day'}
      start-hour=${args.startHour ?? 8}
      end-hour=${args.endHour ?? 18}
      now=${args.now ?? '2026-08-28T11:20:00'}
      ?hide-gaps=${args.hideGaps}
      events=${JSON.stringify(args.view === 'week' ? WEEK_EVENTS : DAY_EVENTS)}
    ></e-agenda>
  `,
};
export default meta;

type Story = StoryObj;

export const Day: Story = {
  args: { view: 'day', startHour: 8, endHour: 18 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const agenda = canvasElement.querySelector('e-agenda')!;
    expect(agenda.querySelectorAll('.ink-agenda__block')).toHaveLength(4);
    expect(agenda.querySelector('.ink-agenda__gap')!.textContent).toContain('Free until 08:30');
    expect(agenda.querySelector('.ink-agenda__now')).not.toBeNull();
  },
};

export const Week: Story = {
  args: { view: 'week', startHour: 8, endHour: 18 },
};

export const NoNowMarker: Story = {
  args: { view: 'day', now: '' },
};

export const EntriesOnly: Story = {
  args: { view: 'day', hideGaps: true },
};

export const OfficeHours: Story = {
  render: () => html`
    <e-agenda
      date="2026-08-28"
      start-hour="9"
      end-hour="13"
      now="10:15"
      events=${JSON.stringify([
        { date: '2026-08-28', start: '09:30', end: '10:00', title: 'Consultation' },
        {
          date: '2026-08-28',
          start: '11:00',
          end: '12:00',
          title: 'Workshop',
          status: 'tentative',
        },
      ])}
    ></e-agenda>
  `,
};
