import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, fn } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Feedback/Dialog',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Modal dialog built on the native `<dialog>` element, opened through `showModal()`. Focus trapping, `Escape` handling, the top layer and inertness of the page behind it come from the browser. A modal is a deliberate context switch, which is the one place a full-panel refresh is appropriate on e-paper — so the backdrop is a flat hatch fill, never a translucent wash, which would dither unpredictably between refreshes.',
      },
    },
  },
  argTypes: {
    heading: { control: 'text' },
    size: { control: 'select', options: ['small', 'medium', 'large', 'full'] },
    noClose: { control: 'boolean' },
    isStatic: { control: 'boolean' },
  },
  render: (args) => html`
    <div>
      <e-button
        @click=${(e: Event) => {
          const root = (e.currentTarget as HTMLElement).parentElement;
          root?.querySelector('e-dialog')?.setAttribute('open', '');
        }}
        >Open dialog</e-button
      >
      <e-dialog
        heading=${args.heading}
        size=${args.size}
        ?no-close=${args.noClose}
        ?static=${args.isStatic}
      >
        <e-text as="p">Removing this book also removes your highlights and notes.</e-text>
        <e-button slot="footer" data-close>Cancel</e-button>
        <e-button slot="footer" variant="destructive">Remove</e-button>
      </e-dialog>
    </div>
  `,
};
export default meta;

type Story = StoryObj;

/** Opens the dialog so the docs page shows it rather than just its trigger. */
const openDialog = (canvasElement: HTMLElement): HTMLElement => {
  const dialog = canvasElement.querySelector<HTMLElement>('e-dialog')!;
  dialog.setAttribute('open', '');
  return dialog;
};

export const Default: Story = {
  args: { heading: 'Remove book?', size: 'medium', noClose: false, isStatic: false },
  play: async ({ canvasElement }) => {
    const dialog = openDialog(canvasElement);
    expect(dialog.querySelector('dialog')!.open).toBe(true);
  },
};

export const Small: Story = {
  args: { heading: 'Remove book?', size: 'small', noClose: false, isStatic: false },
  play: async ({ canvasElement }) => {
    openDialog(canvasElement);
  },
};

export const EmitsCloseReason: Story = {
  args: { heading: 'Remove book?', size: 'small', noClose: false, isStatic: false },
  play: async ({ canvasElement }) => {
    const dialog = openDialog(canvasElement);
    const onClose = fn();
    dialog.addEventListener('e-close', onClose);

    // `data-close` on any descendant dismisses without a listener of its own.
    canvasElement.querySelector<HTMLElement>('[data-close]')!.querySelector('button')!.click();

    expect(onClose).toHaveBeenCalledOnce();
    const detail = (onClose.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.value).toBe(false);
    expect(detail.reason).toBe('close-button');
    expect(dialog.hasAttribute('open')).toBe(false);
  },
};

export const StaticCannotBeDismissed: Story = {
  args: { heading: 'Finish setup', size: 'small', noClose: true, isStatic: true },
  parameters: {
    docs: {
      description: {
        story:
          '`static` vetoes `Escape` and backdrop clicks, and `no-close` hides the header button — for a decision the user has to make.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const dialog = openDialog(canvasElement);
    const native = dialog.querySelector('dialog')!;
    native.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(native.open).toBe(true);
  },
};
