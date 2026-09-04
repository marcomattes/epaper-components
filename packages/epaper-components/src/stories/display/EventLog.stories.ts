import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const ENTRIES = [
  {
    id: 'e1',
    ts: '2026-08-28T09:02:11Z',
    severity: 'info',
    source: 'LINE-2',
    message: 'Batch 4471 started',
  },
  {
    id: 'e2',
    ts: '2026-08-28T09:14:52Z',
    severity: 'warning',
    source: 'PRESS-7',
    message: 'Torque above tolerance (18.4 Nm)',
  },
  {
    id: 'e3',
    ts: '2026-08-28T09:20:03Z',
    severity: 'error',
    source: 'PRESS-7',
    message: 'Cycle aborted',
    acknowledged: true,
  },
  {
    id: 'e4',
    ts: '2026-08-28T09:31:44Z',
    severity: 'critical',
    source: 'CELL-1',
    message: 'Safety guard opened during motion',
  },
];

const meta: Meta = {
  title: 'Display/EventLog',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v2.0.0',
      description: {
        component:
          'Keyed, append-only event and alarm list. Rows are identified by `id`: a new event is inserted as a single node and an existing row is patched in place, so a live log costs a partial refresh of one row instead of a full-page flash. Use `appendEntries()` to push, `acknowledge(id)` to mark one row, `clear()` to empty it.',
      },
    },
  },
  argTypes: {
    order: { control: 'inline-radio', options: ['newest', 'oldest'] },
    maxItems: { control: 'number' },
    hideSource: { control: 'boolean' },
    timeFormat: { control: 'inline-radio', options: ['time', 'datetime'] },
  },
  render: (args) => html`
    <e-event-log
      style="max-width:640px"
      locale="en-GB"
      order=${args.order ?? 'newest'}
      max-items=${args.maxItems ?? 20}
      time-format=${args.timeFormat ?? 'time'}
      ?hide-source=${args.hideSource}
      data=${JSON.stringify(ENTRIES)}
    ></e-event-log>
  `,
};
export default meta;

type Story = StoryObj;

export const Newest: Story = {
  args: { order: 'newest', maxItems: 20 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const log = canvasElement.querySelector('e-event-log')!;
    const rows = [...log.querySelectorAll<HTMLElement>('.ink-event-log__row')];
    expect(rows).toHaveLength(4);
    expect(rows[0].dataset['severity']).toBe('critical');
    expect(rows[1].dataset['acknowledged']).toBe('true');
  },
};

export const Oldest: Story = { args: { order: 'oldest', maxItems: 20 } };

export const Trimmed: Story = { args: { order: 'newest', maxItems: 2 } };

export const WithoutSource: Story = { args: { hideSource: true } };

export const Empty: Story = {
  render: () => html`
    <e-event-log style="max-width:640px" empty-text="No events since 06:00"></e-event-log>
  `,
};
