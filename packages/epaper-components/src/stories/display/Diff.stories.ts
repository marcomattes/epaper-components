import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Diff',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.1.0',
      description: {
        component:
          'Persistent previous/current comparison. Both values remain visible and the current state receives a patterned cue when changed.',
      },
    },
  },
  argTypes: {
    before: { control: 'text' },
    after: { control: 'text' },
    label: { control: 'text' },
    beforeLabel: { control: 'text' },
    afterLabel: { control: 'text' },
    layout: { control: 'inline-radio', options: ['inline', 'stacked'] },
  },
  render: (args) => html`
    <e-diff
      before=${args.before ?? ''}
      after=${args.after ?? ''}
      label=${args.label || ''}
      before-label=${args.beforeLabel || 'Previous'}
      after-label=${args.afterLabel || 'Current'}
      layout=${args.layout || 'inline'}
      style="display:block;max-width:620px"
    ></e-diff>
  `,
};
export default meta;

type Story = StoryObj;

export const Changed: Story = {
  args: { label: 'Firmware', before: '1.8.4', after: '1.9.0', layout: 'inline' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const diff = canvasElement.querySelector('e-diff')!;
    expect(diff.querySelector('.ink-diff')!.getAttribute('data-changed')).toBe('true');
    expect(diff.querySelector('.ink-diff__cue')!.textContent).toContain('Changed');
  },
};

export const Unchanged: Story = {
  args: { label: 'Panel mode', before: 'Partial', after: 'Partial' },
};

export const Stacked: Story = {
  args: {
    label: 'Release notes',
    before: 'Refresh fix pending',
    after: 'Refresh fix shipped',
    layout: 'stacked',
  },
};
