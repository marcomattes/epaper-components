import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, fn, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Popover',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.1.0',
      description: {
        component:
          'Click-triggered overlay panel anchored to its trigger — the counterpart to a tooltip for hardware that has no hover. Capacitive e-paper digitizers report contact, not proximity, so anything that would be revealed on hover has to be revealed on tap instead. Content is arbitrary, which separates this from `<e-dropdown>` (a list of commands). The panel is non-modal and does not trap focus; reach for `<e-dialog>` when the user must deal with it before continuing.',
      },
    },
  },
  argTypes: {
    heading: { control: 'text' },
    align: { control: 'inline-radio', options: ['left', 'right'] },
    placement: { control: 'inline-radio', options: ['bottom', 'top'] },
  },
  render: (args) => html`
    <e-popover heading=${args.heading} align=${args.align} placement=${args.placement}>
      <e-button slot="trigger">Sync details</e-button>
      <e-text as="p">Last sync 3 minutes ago over Wi-Fi. 42 highlights uploaded.</e-text>
    </e-popover>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { heading: 'Sync status', align: 'left', placement: 'bottom' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: 'Sync details' })).toBeInTheDocument();
  },
};

export const TriggerTogglesPanel: Story = {
  args: { heading: 'Sync status', align: 'left', placement: 'bottom' },
  play: async ({ canvasElement }) => {
    const popover = canvasElement.querySelector('e-popover')!;
    const onOpen = fn();
    const onClose = fn();
    popover.addEventListener('e-open', onOpen);
    popover.addEventListener('e-close', onClose);
    const trigger = popover.querySelector<HTMLElement>('[data-trigger] button')!;

    trigger.click();
    expect(popover.hasAttribute('open')).toBe(true);
    expect(onOpen).toHaveBeenCalledOnce();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    trigger.click();
    expect(popover.hasAttribute('open')).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  },
};

export const EscapeCloses: Story = {
  args: { heading: 'Sync status', align: 'left', placement: 'bottom' },
  play: async ({ canvasElement }) => {
    const popover = canvasElement.querySelector('e-popover')!;
    popover.setAttribute('open', '');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popover.hasAttribute('open')).toBe(false);
  },
};

export const OpenedAbove: Story = {
  args: { heading: 'Sync status', align: 'right', placement: 'top' },
  render: (args) => html`
    <div style="padding-top:180px">
      <e-popover heading=${args.heading} align=${args.align} placement=${args.placement} open>
        <e-button slot="trigger">Sync details</e-button>
        <e-text as="p">Last sync 3 minutes ago over Wi-Fi.</e-text>
      </e-popover>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector('.ink-popover__panel')!;
    expect(panel.classList.contains('ink-popover__panel--top')).toBe(true);
    expect(panel.classList.contains('ink-popover__panel--align-right')).toBe(true);
  },
};
