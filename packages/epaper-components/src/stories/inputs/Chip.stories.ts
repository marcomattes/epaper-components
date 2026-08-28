import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/Chip',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Selectable label for filters or quick choices. Toggles `selected` on click and fires `e-change`. Distinct from `<e-tag>` (removable label) and `<e-badge>` (decorative).',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    selected: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render: (args) => html`
    <e-chip ?selected=${args.selected} ?disabled=${args.disabled}>${args.label}</e-chip>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Today', selected: false, disabled: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const btn = canvas.getByRole('button', { name: 'Today' });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  },
};

export const Selected: Story = {
  args: { label: 'This week', selected: true, disabled: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole('button', { name: 'This week' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  },
};

export const FilterRow: Story = {
  render: () => html`
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <e-chip selected>All</e-chip>
      <e-chip>Drafts</e-chip>
      <e-chip>Published</e-chip>
      <e-chip>Archived</e-chip>
    </div>
  `,
};
