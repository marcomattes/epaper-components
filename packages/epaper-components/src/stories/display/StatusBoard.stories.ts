import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const ITEMS = [
  { key: 'queue', label: 'Queue', value: 12, status: 'warning', detail: '3 delayed' },
  { key: 'workers', label: 'Workers', value: '8 / 8', status: 'ok' },
  { key: 'errors', label: 'Errors', value: 2, status: 'critical', detail: 'Last hour' },
  { key: 'sensor', label: 'Outdoor sensor', value: 'Offline', status: 'offline' },
  { key: 'battery', label: 'Battery', value: '76%', status: 'ok' },
  { key: 'release', label: 'Release', value: '1.1.0', status: 'neutral' },
];

const meta: Meta = {
  title: 'Display/StatusBoard',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.1.0\n\nStable keyed KPI matrix. Replacing `data` patches existing cells in place when their keys are unchanged, keeping redraws local.',
      },
    },
  },
  argTypes: {
    columns: { control: { type: 'number', min: 1, max: 6 } },
    label: { control: 'text' },
    hideLabel: { control: 'boolean' },
  },
  render: (args) => html`
    <e-status-board
      data=${JSON.stringify(ITEMS)}
      columns=${args.columns ?? 3}
      label=${args.label || 'System status'}
      ?hide-label=${args.hideLabel}
    ></e-status-board>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { columns: 3, label: 'System status' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const board = canvasElement.querySelector('e-status-board')!;
    const queue = board.querySelector<HTMLElement>('[data-key="queue"]')!;
    const next = ITEMS.map((item) => (item.key === 'queue' ? { ...item, value: 9 } : item));
    board.setAttribute('data', JSON.stringify(next));
    expect(board.querySelector('[data-key="queue"]')).toBe(queue);
    expect(queue.querySelector('.ink-status-board__value')!.textContent).toBe('9');
  },
};

export const Empty: Story = {
  render: () =>
    html`<e-status-board data="[]" empty-text="No connected services"></e-status-board>`,
};
