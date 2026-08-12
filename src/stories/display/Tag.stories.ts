import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, fn } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Tag',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Small inline label, optionally removable. Use to mark categories or filters that the user can dismiss. Distinct from `<e-badge>`, which is purely decorative.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    closable: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render: (args) => html`
    <e-tag ?closable=${args.closable} ?disabled=${args.disabled}>${args.label}</e-tag>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Draft', closable: false, disabled: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Draft')).toBeInTheDocument();
  },
};

export const Closable: Story = {
  args: { label: 'Marketing', closable: true, disabled: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tag = canvasElement.querySelector('e-tag')!;
    const onClose = fn();
    tag.addEventListener('e-close', onClose);
    const btn = canvas.getByRole('button', { name: 'Remove' });
    btn.click();
    expect(onClose).toHaveBeenCalledOnce();
  },
};

export const Group: Story = {
  render: () => html`
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <e-tag closable>Design</e-tag>
      <e-tag closable>Frontend</e-tag>
      <e-tag closable>A11y</e-tag>
      <e-tag>E-Paper</e-tag>
    </div>
  `,
};
