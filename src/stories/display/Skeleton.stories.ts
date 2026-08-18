import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Skeleton',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nStatic loading placeholder. Pure outline — no shimmer, no animation. Use to reserve space while content loads. Avoids triggering a full GC16 refresh on e-paper.',
      },
    },
  },
  argTypes: {
    shape: { control: 'select', options: ['block', 'text', 'circle'] },
    lines: { control: 'number' },
    width: { control: 'text' },
    height: { control: 'text' },
  },
  render: (args) => html`
    <e-skeleton
      shape=${args.shape || 'block'}
      lines=${args.lines || 1}
      width=${args.width || ''}
      height=${args.height || ''}
    ></e-skeleton>
  `,
};
export default meta;

type Story = StoryObj;

export const Block: Story = {
  args: { shape: 'block', height: '120px' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const sk = canvasElement.querySelector('e-skeleton')!;
    expect(sk.getAttribute('aria-busy')).toBe('true');
  },
};

export const TextLines: Story = {
  args: { shape: 'text', lines: 4 },
  play: async ({ canvasElement }) => {
    const lines = canvasElement.querySelectorAll('.ink-skeleton__line');
    expect(lines).toHaveLength(4);
  },
};

export const Circle: Story = {
  args: { shape: 'circle' },
};

export const ProfileCard: Story = {
  render: () => html`
    <div style="display:flex;gap:16px;padding:16px;border:2px solid #000;max-width:340px">
      <e-skeleton shape="circle"></e-skeleton>
      <div style="flex:1">
        <e-skeleton shape="text" lines="3"></e-skeleton>
      </div>
    </div>
  `,
};
