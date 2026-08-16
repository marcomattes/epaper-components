import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, fn, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Feedback/Popconfirm',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Inline confirmation bubble anchored to the control that triggers it. A lighter alternative to `<e-dialog>` for a single destructive action: no backdrop, no full-panel refresh, just a small dirty rectangle next to the button. Undo is expensive on e-paper, which makes confirming worth more than it is on desktop — but a full modal flash for a one-line question is not.',
      },
    },
  },
  argTypes: {
    message: { control: 'text' },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    align: { control: 'inline-radio', options: ['left', 'right'] },
    placement: { control: 'inline-radio', options: ['bottom', 'top'] },
  },
  render: (args) => html`
    <e-popconfirm
      message=${args.message}
      confirm-label=${args.confirmLabel}
      cancel-label=${args.cancelLabel}
      align=${args.align}
      placement=${args.placement}
    >
      <e-button slot="trigger" variant="destructive">Delete note</e-button>
    </e-popconfirm>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: {
    message: 'Delete this note?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    align: 'left',
    placement: 'bottom',
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: 'Delete note' })).toBeInTheDocument();
  },
};

export const ConfirmEmitsEvent: Story = {
  args: {
    message: 'Delete this note?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    align: 'left',
    placement: 'bottom',
  },
  play: async ({ canvasElement }) => {
    const popconfirm = canvasElement.querySelector('e-popconfirm')!;
    const onConfirm = fn();
    popconfirm.addEventListener('e-confirm', onConfirm);

    popconfirm.setAttribute('open', '');
    popconfirm.querySelector<HTMLElement>('[data-action="confirm"] button')!.click();

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(popconfirm.hasAttribute('open')).toBe(false);
  },
};

export const CancelEmitsEvent: Story = {
  args: {
    message: 'Delete this note?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    align: 'left',
    placement: 'bottom',
  },
  play: async ({ canvasElement }) => {
    const popconfirm = canvasElement.querySelector('e-popconfirm')!;
    const onCancel = fn();
    popconfirm.addEventListener('e-cancel', onCancel);

    popconfirm.setAttribute('open', '');
    popconfirm.querySelector<HTMLElement>('[data-action="cancel"] button')!.click();

    expect(onCancel).toHaveBeenCalledOnce();
    expect(popconfirm.hasAttribute('open')).toBe(false);
  },
};

export const AlignedRight: Story = {
  args: {
    message: 'Reset all reading progress?',
    confirmLabel: 'Reset',
    cancelLabel: 'Keep',
    align: 'right',
    placement: 'bottom',
  },
  play: async ({ canvasElement }) => {
    const popconfirm = canvasElement.querySelector('e-popconfirm')!;
    popconfirm.setAttribute('open', '');
    expect(
      popconfirm
        .querySelector('.ink-popconfirm__panel')!
        .classList.contains('ink-popconfirm__panel--align-right'),
    ).toBe(true);
  },
};
