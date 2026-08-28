import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/LastUpdated',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.1.0',
      description: {
        component:
          'Relative update age with fresh, stale and expired states. It owns no timer: set `now` from the application refresh cycle or call `refresh()` explicitly.',
      },
    },
  },
  argTypes: {
    staleAfter: { control: 'number' },
    expiredAfter: { control: 'number' },
    showAbsolute: { control: 'boolean' },
  },
  render: (args) => html`
    <e-last-updated
      datetime="2026-08-17T14:00:00Z"
      now="2026-08-17T14:03:00Z"
      stale-after=${args.staleAfter ?? 300}
      expired-after=${args.expiredAfter ?? 3600}
      ?show-absolute=${args.showAbsolute}
    ></e-last-updated>
  `,
};
export default meta;

type Story = StoryObj;

export const Fresh: Story = {
  args: { staleAfter: 300, expiredAfter: 3600 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const updated = canvasElement.querySelector('e-last-updated')!;
    expect(updated.querySelector('.ink-last-updated')!.getAttribute('data-freshness')).toBe(
      'fresh',
    );
    expect(updated.querySelector('.ink-last-updated__relative')!.textContent).toBe('3 minutes ago');
  },
};

export const Stale: Story = { args: { staleAfter: 60, expiredAfter: 3600 } };

export const Expired: Story = { args: { staleAfter: 60, expiredAfter: 120, showAbsolute: true } };
