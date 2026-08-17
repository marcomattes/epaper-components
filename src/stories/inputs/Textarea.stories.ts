import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, userEvent } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/Textarea',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nMulti-line text field for longer-form input such as comments, descriptions or messages. Shares the Input visual treatment.',
      },
    },
  },
  argTypes: {
    placeholder: { control: 'text' },
    value: { control: 'text' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render: (args) => html`
    <e-textarea
      placeholder=${args.placeholder || ''}
      value=${args.value || ''}
      aria-label=${args.ariaLabel || 'Message'}
      ?error=${args.error}
      ?disabled=${args.disabled}
    ></e-textarea>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { placeholder: 'Write something…', error: false, disabled: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const ta = canvas.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta).toBeInTheDocument();
    expect(ta).not.toBeDisabled();
    await userEvent.type(ta, 'Hello world');
    expect(ta.value).toBe('Hello world');
  },
};

export const WithValue: Story = {
  args: {
    value: 'This is some pre-filled content.',
    placeholder: '',
    ariaLabel: 'Content',
    error: false,
    disabled: false,
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const ta = canvas.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta.value).toBe('This is some pre-filled content.');
  },
};

export const ErrorState: Story = {
  args: { placeholder: 'Write something…', error: true, disabled: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const ta = canvas.getByRole('textbox');
    expect(ta).toHaveAttribute('aria-invalid', 'true');
  },
};

export const Disabled: Story = {
  args: {
    value: 'Read-only content here.',
    ariaLabel: 'Read-only content',
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const ta = canvas.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta).toBeDisabled();
    expect(ta.value).toBe('Read-only content here.');
  },
};

export const AttributeChanges: Story = {
  args: { value: 'initial', ariaLabel: 'Notes' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('e-textarea') as HTMLElement;
    const ta = el.querySelector('textarea') as HTMLTextAreaElement;
    expect(ta.value).toBe('initial');
    expect(ta.getAttribute('aria-label')).toBe('Notes');

    el.setAttribute('value', 'changed');
    expect(ta.value).toBe('changed');

    el.setAttribute('aria-label', 'Renamed');
    expect(ta.getAttribute('aria-label')).toBe('Renamed');
    el.removeAttribute('aria-label');
    expect(ta.hasAttribute('aria-label')).toBe(false);

    el.setAttribute('error', '');
    expect(ta.getAttribute('aria-invalid')).toBe('true');
    el.removeAttribute('error');
    expect(ta.hasAttribute('aria-invalid')).toBe(false);

    el.setAttribute('disabled', '');
    expect(ta.disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(ta.disabled).toBe(false);

    // Keep the final rendered story accessible for Storybook's automatic
    // post-play axe audit after testing removal and reactivity above.
    el.setAttribute('aria-label', 'Notes');
  },
};
