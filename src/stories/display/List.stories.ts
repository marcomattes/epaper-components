import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/List',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nStructured list with optional header / footer slots and slot-driven `<e-list-item>` rows. Use this instead of a native `<ul>` when you need leading / trailing content per row.',
      },
    },
  },
  argTypes: {
    bordered: { control: 'boolean' },
    split: { control: 'boolean' },
  },
  render: (args) => html`
    <e-list ?bordered=${args.bordered} split=${args.split === false ? 'false' : 'true'}>
      <e-list-item title="Annual report" description="Finance · 2026"></e-list-item>
      <e-list-item title="Sustainability" description="Operations · 2026"></e-list-item>
      <e-list-item title="Roadmap" description="Product · 2026"></e-list-item>
    </e-list>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { bordered: true, split: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Annual report')).toBeInTheDocument();
    const items = canvasElement.querySelectorAll('e-list-item');
    expect(items).toHaveLength(3);
  },
};

export const WithHeader: Story = {
  render: () => html`
    <e-list bordered header-title="Documents">
      <e-list-item title="Spec.pdf" description="2.4 MB"></e-list-item>
      <e-list-item title="Notes.md" description="12 KB"></e-list-item>
    </e-list>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Documents')).toBeInTheDocument();
  },
};

export const WithSlots: Story = {
  render: () => html`
    <e-list bordered>
      <e-list-item title="Anna König" description="Editor">
        <e-avatar slot="leading" name="Anna König" size="32"></e-avatar>
        <e-tag slot="trailing">Owner</e-tag>
      </e-list-item>
      <e-list-item title="Ben Müller" description="Reviewer">
        <e-avatar slot="leading" name="Ben Müller" size="32"></e-avatar>
        <e-tag slot="trailing">Member</e-tag>
      </e-list-item>
    </e-list>
  `,
};
