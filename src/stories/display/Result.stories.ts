import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Result',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nStatus page block (success / error / 404 / info / warning). Composes an icon, large title, optional description and a slotted action area.',
      },
    },
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info', '404'],
    },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  render: (args) => html`
    <e-result
      status=${args.status || 'info'}
      title=${args.title || ''}
      description=${args.description || ''}
    ></e-result>
  `,
};
export default meta;

type Story = StoryObj;

export const Success: Story = {
  args: {
    status: 'success',
    title: 'Order placed',
    description: 'We sent you a confirmation email.',
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('heading', { name: 'Order placed' })).toBeInTheDocument();
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    title: 'Something went wrong',
    description: 'Please try again or contact support.',
  },
};

export const NotFound: Story = {
  render: () => html`
    <e-result
      status="404"
      title="Page not found"
      description="The page you are looking for does not exist."
    >
      <e-button slot="action" variant="primary">Back to home</e-button>
    </e-result>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: 'Back to home' })).toBeInTheDocument();
  },
};

export const Warning: Story = {
  args: {
    status: 'warning',
    title: 'Battery low',
    description: 'Connect your device to charge.',
  },
};
