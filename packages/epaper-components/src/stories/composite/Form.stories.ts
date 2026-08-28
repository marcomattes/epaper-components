import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Composite/Form',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Form layout with consistent label/control rows, hint text and validation messaging. Use `stacked` for most cases and `inline` for filter bars or single-row queries.',
      },
    },
  },
  argTypes: {
    layout: { control: 'select', options: ['stacked', 'inline'] },
  },
  render: (args) => html`
    <e-form layout=${args.layout === 'inline' ? 'inline' : ''} style="max-width:480px">
      <e-form-item label="Full name" required>
        <e-input placeholder="John Doe"></e-input>
      </e-form-item>
      <e-form-item label="Email" required hint="We won't spam you.">
        <e-input type="email" placeholder="you@example.com"></e-input>
      </e-form-item>
      <e-form-item label="Role">
        <e-select placeholder="Choose role…">
          <e-option value="admin" label="Admin" />
          <e-option value="editor" label="Editor" />
          <e-option value="viewer" label="Viewer" />
        </e-select>
      </e-form-item>
      <e-form-item label="">
        <e-space size="8">
          <e-button variant="primary">Submit</e-button>
          <e-button variant="secondary">Cancel</e-button>
        </e-space>
      </e-form-item>
    </e-form>
  `,
};
export default meta;

type Story = StoryObj;

export const Stacked: Story = {
  args: { layout: 'stacked' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Full name')).toBeInTheDocument();
    expect(canvas.getByText('Email')).toBeInTheDocument();
  },
};

export const Inline: Story = {
  args: { layout: 'inline' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const form = canvasElement.querySelector('e-form');
    expect(form).toBeInTheDocument();
    expect(form?.getAttribute('layout')).toBe('inline');
  },
  render: () => html`
    <e-form layout="inline">
      <e-form-item label="Search">
        <e-input placeholder="Query…"></e-input>
      </e-form-item>
      <e-form-item label="Type">
        <e-select placeholder="All">
          <e-option value="all" label="All" />
          <e-option value="docs" label="Docs" />
          <e-option value="code" label="Code" />
        </e-select>
      </e-form-item>
      <e-form-item label="">
        <e-button variant="primary">Search</e-button>
      </e-form-item>
    </e-form>
  `,
};

export const WithError: Story = {
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText(/This username is already taken\./)).toBeInTheDocument();
  },
  render: () => html`
    <e-form style="max-width:400px">
      <e-form-item label="Username" required error="This username is already taken.">
        <e-input value="john.doe" error="This username is already taken."></e-input>
      </e-form-item>
      <e-form-item label="Password" required>
        <e-input type="password" placeholder="Min 8 characters"></e-input>
      </e-form-item>
      <e-form-item label="">
        <e-button variant="primary">Create Account</e-button>
      </e-form-item>
    </e-form>
  `,
};

export const Submission: Story = {
  play: async ({ canvasElement }) => {
    const formEl = canvasElement.querySelector('e-form') as HTMLElement;
    const inner = formEl.querySelector('form') as HTMLFormElement;
    let captured = false;
    formEl.addEventListener(
      'e-submit',
      () => {
        captured = true;
      },
      { once: true },
    );
    inner.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(captured).toBe(true);

    const items = canvasElement.querySelectorAll('e-form-item');
    expect(items.length).toBeGreaterThan(0);
  },
  render: () => html`
    <e-form>
      <e-form-item label="Note" hint="Helper hint">
        <e-input></e-input>
      </e-form-item>
      <e-form-item>
        <e-input aria-label="Bare"></e-input>
      </e-form-item>
    </e-form>
  `,
};
