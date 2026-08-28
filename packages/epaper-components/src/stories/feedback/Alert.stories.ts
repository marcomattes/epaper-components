import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, fn } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Feedback/Alert',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.1.0',
      description: {
        component:
          'Inline status banner. The static counterpart to a toast — nothing appears or disappears on a timer, because a message that auto-dismisses can be missed entirely between two panel refreshes. Severity is carried by an icon, a border weight and a hatch fill, never by color alone. Use `<e-result>` instead when the message *is* the page.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'error'] },
    heading: { control: 'text' },
    body: { control: 'text' },
    closable: { control: 'boolean' },
    noIcon: { control: 'boolean' },
  },
  render: (args) => html`
    <e-alert
      variant=${args.variant}
      heading=${args.heading}
      ?closable=${args.closable}
      ?no-icon=${args.noIcon}
      >${args.body}</e-alert
    >
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: {
    variant: 'info',
    heading: 'Sync paused',
    body: 'Reconnect to Wi-Fi to resume downloading your library.',
    closable: false,
    noIcon: false,
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Sync paused')).toBeInTheDocument();
  },
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:16px">
      <e-alert variant="info" heading="Info">Your notes are stored on the device.</e-alert>
      <e-alert variant="success" heading="Export finished">42 highlights written to USB.</e-alert>
      <e-alert variant="warning" heading="Battery low"
        >Connect the charger to keep syncing.</e-alert
      >
      <e-alert variant="error" heading="Update failed"
        >Checksum mismatch — the package was not installed.</e-alert
      >
    </div>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
  },
};

export const Closable: Story = {
  args: {
    variant: 'warning',
    heading: 'Battery low',
    body: 'Connect the charger to keep syncing.',
    closable: true,
    noIcon: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvasElement.querySelector('e-alert')!;
    const onClose = fn();
    alert.addEventListener('e-close', onClose);
    canvas.getByRole('button', { name: 'Dismiss' }).click();
    expect(onClose).toHaveBeenCalledOnce();
    expect(alert.hasAttribute('hidden')).toBe(true);
  },
};

export const WithAction: Story = {
  render: () => html`
    <e-alert variant="error" heading="Update failed">
      Checksum mismatch — the package was not installed.
      <e-button slot="action" variant="secondary">Retry</e-button>
    </e-alert>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  },
};

export const HeadingOnly: Story = {
  render: () => html`<e-alert variant="success" heading="Saved to device"></e-alert>`,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
  },
};
