import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, userEvent } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/Toggle',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Two-state switch for binary settings that take effect immediately. Use as an alternative to Checkbox in settings panels and toolbars.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    checked: { control: 'boolean' },
  },
  render: (args) => html`
    <e-toggle label=${args.label || ''} ?checked=${args.checked}></e-toggle>
  `,
};
export default meta;

type Story = StoryObj;

export const Off: Story = {
  args: { label: 'Enable notifications', checked: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('switch', {
      name: 'Enable notifications',
    }) as HTMLInputElement;
    expect(toggle).not.toBeChecked();
    expect(canvas.getByText('OFF')).toBeInTheDocument();
  },
};

export const On: Story = {
  args: { label: 'Dark mode', checked: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('switch', {
      name: 'Dark mode',
    }) as HTMLInputElement;
    expect(toggle).toBeChecked();
    expect(canvas.getByText('ON')).toBeInTheDocument();
  },
};

export const ClickToToggle: Story = {
  args: { label: 'Auto-save', checked: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('switch', {
      name: 'Auto-save',
    }) as HTMLInputElement;
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(canvas.getByText('ON')).toBeInTheDocument();
  },
};

export const AllStates: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:12px">
      <e-toggle label="Notifications" checked></e-toggle>
      <e-toggle label="Auto-save"></e-toggle>
      <e-toggle label="Beta features" checked></e-toggle>
      <e-toggle label="Analytics"></e-toggle>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const switches = canvas.getAllByRole('switch') as HTMLInputElement[];
    expect(switches).toHaveLength(4);
    expect(switches[0]).toBeChecked();
    expect(switches[1]).not.toBeChecked();
    expect(switches[2]).toBeChecked();
    expect(switches[3]).not.toBeChecked();
  },
};

export const AttributeChanges: Story = {
  args: { label: 'Sync', checked: true },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('e-toggle') as HTMLElement & {
      checked: boolean;
    };
    const cb = el.querySelector('input') as HTMLInputElement;
    const state = el.querySelector('.ink-toggle__state') as HTMLElement;
    expect(cb.checked).toBe(true);
    expect(state.textContent).toBe('ON');

    el.removeAttribute('checked');
    expect(cb.checked).toBe(false);
    expect(state.textContent).toBe('OFF');

    el.checked = true;
    expect(el.hasAttribute('checked')).toBe(true);
    el.checked = false;
    expect(el.hasAttribute('checked')).toBe(false);

    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.hasAttribute('checked')).toBe(true);
    expect(state.textContent).toBe('ON');
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.hasAttribute('checked')).toBe(false);
    expect(state.textContent).toBe('OFF');
  },
};
