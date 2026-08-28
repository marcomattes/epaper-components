import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Primitives/Badge',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Decorative text label used to mark status, categories or counts. Pure ink — no fill colors, just a flat outlined chip. Use the `inverted` variant for emphasis on light surfaces.',
      },
    },
  },
  argTypes: {
    label: { control: 'text', description: 'Badge text' },
    inverted: { control: 'boolean', description: 'Dark background variant' },
  },
  render: (args) => html` <e-badge ?inverted=${args.inverted}>${args.label}</e-badge> `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { label: 'New', inverted: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const badge = canvas.getByText('New');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('ink-badge');
    expect(badge.className).not.toContain('ink-badge--inverted');
  },
};

export const Inverted: Story = {
  args: { label: 'Featured', inverted: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const badge = canvas.getByText('Featured');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('ink-badge--inverted');
  },
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display:flex;gap:10px;align-items:center">
      <e-badge>Draft</e-badge>
      <e-badge>Beta</e-badge>
      <e-badge inverted>Live</e-badge>
      <e-badge inverted>Archived</e-badge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Draft')).toBeInTheDocument();
    expect(canvas.getByText('Beta')).toBeInTheDocument();
    expect(canvas.getByText('Live').className).toContain('ink-badge--inverted');
    expect(canvas.getByText('Archived').className).toContain('ink-badge--inverted');
  },
};
