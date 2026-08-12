import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Empty',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Empty-state placeholder with icon, title, optional description and an action slot. Use as the body of a list, table or section that has no content yet.',
      },
    },
  },
  argTypes: {
    icon: { control: 'text' },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  render: (args) => html`
    <e-empty
      icon=${args.icon || 'doc'}
      title=${args.title || 'No data'}
      description=${args.description || ''}
    ></e-empty>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: {
    icon: 'doc',
    title: 'No invoices',
    description: 'Create one to get started.',
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('No invoices')).toBeInTheDocument();
    expect(canvas.getByText('Create one to get started.')).toBeInTheDocument();
  },
};

export const WithAction: Story = {
  render: () => html`
    <e-empty icon="folder" title="Folder is empty" description="Drop files here or upload one.">
      <e-button slot="action" variant="primary">Upload</e-button>
    </e-empty>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
  },
};

export const Minimal: Story = {
  args: { icon: 'search', title: 'No results' },
};
