import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, userEvent } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/Checkbox',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nSingle binary on/off control with a flat ink check. Pair with a label or compose multiple instances inside a CheckboxGroup.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render: (args) => html`
    <e-checkbox
      label=${args.label || ''}
      ?checked=${args.checked}
      ?disabled=${args.disabled}
    ></e-checkbox>
  `,
};
export default meta;

type Story = StoryObj;

export const Unchecked: Story = {
  args: { label: 'Accept terms', checked: false, disabled: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const cb = canvas.getByRole('checkbox', {
      name: 'Accept terms',
    }) as HTMLInputElement;
    expect(cb).not.toBeChecked();
    expect(cb).not.toBeDisabled();
  },
};

export const Checked: Story = {
  args: { label: 'Remember me', checked: true, disabled: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const cb = canvas.getByRole('checkbox', {
      name: 'Remember me',
    }) as HTMLInputElement;
    expect(cb).toBeChecked();
  },
};

export const ClickToCheck: Story = {
  args: { label: 'Subscribe to newsletter', checked: false, disabled: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const cb = canvas.getByRole('checkbox', {
      name: 'Subscribe to newsletter',
    }) as HTMLInputElement;
    expect(cb).not.toBeChecked();
    await userEvent.click(cb);
    expect(cb).toBeChecked();
  },
};

export const Disabled: Story = {
  args: { label: 'Admin access (locked)', checked: false, disabled: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const cb = canvas.getByRole('checkbox', { name: 'Admin access (locked)' });
    expect(cb).toBeDisabled();
    expect(cb).not.toBeChecked();
  },
};

export const DisabledChecked: Story = {
  args: { label: 'Default feature (on)', checked: true, disabled: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const cb = canvas.getByRole('checkbox', { name: 'Default feature (on)' });
    expect(cb).toBeDisabled();
    expect(cb).toBeChecked();
  },
};

export const AttributeChanges: Story = {
  args: { label: 'Sync', checked: true, disabled: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('e-checkbox') as HTMLElement & {
      checked: boolean;
    };
    const cb = el.querySelector('input') as HTMLInputElement;
    expect(cb.checked).toBe(true);
    el.removeAttribute('checked');
    expect(cb.checked).toBe(false);
    el.setAttribute('disabled', '');
    expect(cb.disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(cb.disabled).toBe(false);

    el.checked = true;
    expect(el.hasAttribute('checked')).toBe(true);
    el.checked = false;
    expect(el.hasAttribute('checked')).toBe(false);

    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.hasAttribute('checked')).toBe(true);
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.hasAttribute('checked')).toBe(false);
  },
};
