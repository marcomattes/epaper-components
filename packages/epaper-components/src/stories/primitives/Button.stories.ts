import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, userEvent } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Primitives/Button',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Primary interactive control for triggering actions. Three visual variants — `primary` (filled ink), `secondary` (outlined), and `destructive` (hatched) — plus a disabled state. Always meets the 44 px hit-target token.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'destructive'],
      description: 'Visual variant',
    },
    label: { control: 'text', description: 'Button text' },
    disabled: { control: 'boolean' },
  },
  render: (args) => html`
    <e-button variant=${args.variant} ?disabled=${args.disabled}>${args.label}</e-button>
  `,
};
export default meta;

type Story = StoryObj;

export const Primary: Story = {
  args: { variant: 'primary', label: 'Save', disabled: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const btn = canvas.getByRole('button', { name: 'Save' });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
    await userEvent.click(btn);
  },
};

export const Secondary: Story = {
  args: { variant: 'secondary', label: 'Cancel', disabled: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const btn = canvas.getByRole('button', { name: 'Cancel' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('ink-btn--secondary');
  },
};

export const Destructive: Story = {
  args: { variant: 'destructive', label: 'Delete', disabled: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const btn = canvas.getByRole('button', { name: /delete/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('ink-btn--destructive');
  },
};

export const Disabled: Story = {
  args: { variant: 'primary', label: 'Disabled', disabled: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const btn = canvas.getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
  },
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <e-button variant="primary">Primary</e-button>
      <e-button variant="secondary">Secondary</e-button>
      <e-button variant="destructive">Delete</e-button>
      <e-button variant="primary" disabled>Disabled</e-button>
    </div>
  `,
};

export const DisabledClick: Story = {
  args: { variant: 'primary', label: 'Locked', disabled: true },
  play: async ({ canvasElement }) => {
    const eBtn = canvasElement.querySelector('e-button') as HTMLElement;
    const inner = eBtn.querySelector('button') as HTMLButtonElement;
    let fired = false;
    eBtn.addEventListener('e-click', () => {
      fired = true;
    });
    // Native click on disabled button still fires DOM event but handler short-circuits
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(fired).toBe(false);
  },
};

export const Reconnect: Story = {
  args: { variant: 'secondary', label: 'Move', disabled: false },
  play: async ({ canvasElement }) => {
    const eBtn = canvasElement.querySelector('e-button') as HTMLElement;
    const parent = eBtn.parentNode as HTMLElement;
    parent.removeChild(eBtn);
    parent.appendChild(eBtn);
    expect(eBtn.querySelector('button')).toBeTruthy();
  },
};
