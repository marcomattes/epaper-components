import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const ROOM_STATUSES = {
  free: { symbol: '○', label: 'Frei' },
  busy: { symbol: '●', label: 'Belegt' },
  soon: { symbol: '◐', label: 'Gleich belegt' },
};

const meta: Meta = {
  title: 'Display/StatusPill',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.3.0\n\nSingle-value status marker — the one-value counterpart to `StatusBoard`. Its vocabulary is open, so a door sign can say "Belegt" instead of bending occupancy onto `warning`. Every state renders a symbol *and* a word, so it stays readable on a greyscale panel.',
      },
    },
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['ok', 'warning', 'critical', 'offline', 'neutral'],
      description: 'Status key',
    },
    label: { control: 'text', description: 'Overrides the label for the current status' },
    size: { control: 'select', options: ['sm', 'md', 'lg'], description: 'Type scale' },
    announce: { control: 'boolean', description: 'Expose as a polite live region' },
  },
  render: (args) => html`
    <e-status-pill
      status=${args.status ?? 'ok'}
      label=${args.label || ''}
      size=${args.size ?? 'md'}
      ?announce=${args.announce}
    ></e-status-pill>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { status: 'ok', size: 'md' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const pill = canvasElement.querySelector('e-status-pill')!;
    expect(pill.querySelector('.ink-status-pill__label')!.textContent).toBe('OK');
  },
};

export const AllBuiltIns: Story = {
  render: () => html`
    <e-space gap="sm">
      <e-status-pill status="ok"></e-status-pill>
      <e-status-pill status="warning"></e-status-pill>
      <e-status-pill status="critical"></e-status-pill>
      <e-status-pill status="offline"></e-status-pill>
      <e-status-pill status="neutral"></e-status-pill>
    </e-space>
  `,
};

export const RoomSign: Story = {
  name: 'Custom vocabulary (room sign)',
  render: () => html`
    <e-space gap="sm">
      <e-status-pill
        statuses=${JSON.stringify(ROOM_STATUSES)}
        status="free"
        size="lg"
      ></e-status-pill>
      <e-status-pill
        statuses=${JSON.stringify(ROOM_STATUSES)}
        status="busy"
        size="lg"
      ></e-status-pill>
      <e-status-pill
        statuses=${JSON.stringify(ROOM_STATUSES)}
        status="soon"
        size="lg"
      ></e-status-pill>
    </e-space>
  `,
  play: async ({ canvasElement }) => {
    const pill = canvasElement.querySelector('e-status-pill')!;
    expect(pill.querySelector('.ink-status-pill__label')!.textContent).toBe('Frei');
    // An unknown key must fall back rather than render "undefined".
    pill.setAttribute('status', 'nonsense');
    expect(pill.querySelector('.ink-status-pill__label')!.textContent).toBe('Neutral');
  },
};

export const Sizes: Story = {
  render: () => html`
    <e-space gap="sm">
      <e-status-pill status="ok" size="sm"></e-status-pill>
      <e-status-pill status="ok" size="md"></e-status-pill>
      <e-status-pill status="ok" size="lg"></e-status-pill>
    </e-space>
  `,
};
