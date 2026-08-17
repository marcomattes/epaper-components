import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nFramed container with optional eyebrow, title and slotted body content. Uses the standard 2 px ink border so cards line up with the rest of the system.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    eyebrow: { control: 'text', description: 'Small label above the title' },
  },
  render: (args) => html`
    <e-card title=${args.title || ''} eyebrow=${args.eyebrow || ''} style="max-width:360px">
      <p>This is the card body. Add any content here.</p>
    </e-card>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { title: 'Card Title', eyebrow: '' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('heading', { name: 'Card Title' })).toBeInTheDocument();
    expect(canvas.getByText('This is the card body. Add any content here.')).toBeInTheDocument();
  },
};

export const WithEyebrow: Story = {
  args: { title: 'Annual Report', eyebrow: 'Finance · 2026' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Finance · 2026')).toBeInTheDocument();
    expect(canvas.getByRole('heading', { name: 'Annual Report' })).toBeInTheDocument();
  },
};

export const WithAction: Story = {
  render: () => html`
    <e-card title="Project Alpha" eyebrow="Active" style="max-width:360px">
      <p>Project status and details live here.</p>
      <e-button slot="action" variant="primary">Open</e-button>
    </e-card>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
    expect(canvas.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  },
};

export const Grid: Story = {
  render: () => html`
    <e-grid cols="3" gap="16">
      <e-grid-item col="span 1">
        <e-card title="Design" eyebrow="Team"><p>UI/UX work.</p></e-card>
      </e-grid-item>
      <e-grid-item col="span 1">
        <e-card title="Engineering" eyebrow="Team"><p>Frontend & backend.</p></e-card>
      </e-grid-item>
      <e-grid-item col="span 1">
        <e-card title="Product" eyebrow="Team"><p>Roadmap & planning.</p></e-card>
      </e-grid-item>
    </e-grid>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('heading', { name: 'Design' })).toBeInTheDocument();
    expect(canvas.getByRole('heading', { name: 'Engineering' })).toBeInTheDocument();
    expect(canvas.getByRole('heading', { name: 'Product' })).toBeInTheDocument();
  },
};
