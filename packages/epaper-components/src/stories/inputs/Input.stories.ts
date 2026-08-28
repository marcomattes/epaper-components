import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, userEvent } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/Input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Single-line text field with built-in label, placeholder, hint and error states. Setting `error` switches the border to the error treatment and wires `aria-invalid` automatically.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    value: { control: 'text' },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    error: { control: 'text', description: 'Error message (activates error state)' },
    disabled: { control: 'boolean' },
  },
  render: (args) => html`
    <e-input
      label=${args.label || ''}
      placeholder=${args.placeholder || ''}
      hint=${args.hint || ''}
      value=${args.value || ''}
      type=${args.type || 'text'}
      error=${args.error || ''}
      ?disabled=${args.disabled}
    ></e-input>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: {
    label: 'Full name',
    placeholder: 'John Doe',
    hint: '',
    error: '',
    disabled: false,
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Full name') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();
    await userEvent.type(input, 'Jane Smith');
    expect(input.value).toBe('Jane Smith');
  },
};

export const WithHint: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    hint: "We'll never share your email.",
    type: 'email',
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Email') as HTMLInputElement;
    expect(input.type).toBe('email');
    expect(canvas.getByText("We'll never share your email.")).toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  args: { label: 'Username', value: 'john doe', error: 'Spaces are not allowed.' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Username') as HTMLInputElement;
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.value).toBe('john doe');
  },
};

export const Disabled: Story = {
  args: { label: 'Account ID', value: 'ACC-10482', disabled: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Account ID') as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(input.value).toBe('ACC-10482');
  },
};

export const Password: Story = {
  args: { label: 'Password', placeholder: '••••••••', type: 'password' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    await userEvent.type(input, 'secret123');
    expect(input.value).toBe('secret123');
  },
};

export const NativeHints: Story = {
  args: { label: 'Email', placeholder: 'you@example.com', type: 'email' },
  render: (args) => html`
    <e-input
      label=${args.label || ''}
      placeholder=${args.placeholder || ''}
      type=${args.type || 'text'}
      autocomplete="email"
      inputmode="email"
      enterkeyhint="go"
      spellcheck="false"
    ></e-input>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'Native `autocomplete`, `inputmode`, `enterkeyhint` and `spellcheck` are forwarded to the inner `<input>` so autofill and virtual keyboards behave the same as a plain form field.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Email') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('email');
    expect(input.getAttribute('inputmode')).toBe('email');
    expect(input.getAttribute('enterkeyhint')).toBe('go');
    expect(input.getAttribute('spellcheck')).toBe('false');
  },
};

export const AttributeChanges: Story = {
  args: { label: 'Notes', value: 'one' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('e-input') as HTMLElement & {
      value: string;
    };
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('one');

    el.setAttribute('value', 'two');
    expect(input.value).toBe('two');

    el.setAttribute('error', '');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    el.removeAttribute('error');
    expect(input.hasAttribute('aria-invalid')).toBe(false);

    el.setAttribute('disabled', '');
    expect(input.disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(input.disabled).toBe(false);

    el.setAttribute('aria-label', 'Custom');
    expect(input.getAttribute('aria-label')).toBe('Custom');
    el.removeAttribute('aria-label');
    expect(input.hasAttribute('aria-label')).toBe(false);

    el.setAttribute('autocomplete', 'name');
    expect(input.getAttribute('autocomplete')).toBe('name');
    el.removeAttribute('autocomplete');
    expect(input.hasAttribute('autocomplete')).toBe(false);

    el.setAttribute('inputmode', 'numeric');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    el.removeAttribute('inputmode');
    expect(input.hasAttribute('inputmode')).toBe(false);

    el.setAttribute('enterkeyhint', 'search');
    expect(input.getAttribute('enterkeyhint')).toBe('search');
    el.removeAttribute('enterkeyhint');
    expect(input.hasAttribute('enterkeyhint')).toBe(false);

    el.setAttribute('spellcheck', 'false');
    expect(input.getAttribute('spellcheck')).toBe('false');
    el.removeAttribute('spellcheck');
    expect(input.hasAttribute('spellcheck')).toBe(false);

    el.value = 'three';
    expect(input.value).toBe('three');

    input.value = 'four';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.value).toBe('four');
  },
};
