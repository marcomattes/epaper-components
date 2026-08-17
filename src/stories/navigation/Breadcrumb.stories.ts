import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Navigation/Breadcrumb',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nHierarchical trail showing the user’s location within nested pages. The last item represents the current page and is rendered as plain text.',
      },
    },
  },
  argTypes: {
    separator: { control: 'text', description: 'Separator character (default /)' },
  },
  render: (args) => html`
    <e-breadcrumb separator=${args.separator || '/'}>
      <e-breadcrumb-item href="#" title="Home" />
      <e-breadcrumb-item href="#" title="Components" />
      <e-breadcrumb-item title="Breadcrumb" />
    </e-breadcrumb>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { separator: '/' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const nav = canvas.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
    expect(canvas.getAllByRole('link')).toHaveLength(2);
    const current = canvasElement.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current).toBeInTheDocument();
    expect(current.textContent).toBe('Breadcrumb');
    expect(canvasElement.textContent).toContain('/');
  },
};

export const ArrowSeparator: Story = {
  args: { separator: '\u203a' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    expect(canvasElement.textContent).toContain('\u203a');
  },
};

export const DashSeparator: Story = {
  args: { separator: '\u2014' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    expect(canvasElement.textContent).toContain('\u2014');
  },
};

export const Deep: Story = {
  render: () => html`
    <e-breadcrumb separator="/">
      <e-breadcrumb-item href="#" title="Home" />
      <e-breadcrumb-item href="#" title="Docs" />
      <e-breadcrumb-item href="#" title="Components" />
      <e-breadcrumb-item href="#" title="Navigation" />
      <e-breadcrumb-item title="Breadcrumb" />
    </e-breadcrumb>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getAllByRole('link')).toHaveLength(4);
    const current = canvasElement.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current.textContent).toBe('Breadcrumb');
  },
};
