import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Layout/Watermark',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Tiled SVG watermark layered behind slotted content. Designed for print-style "DRAFT" / "CONFIDENTIAL" labels on e-paper layouts.',
      },
    },
  },
  argTypes: {
    content: { control: 'text' },
    fontSize: { control: 'number' },
    rotate: { control: 'number' },
    opacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
  },
  render: (args) => html`
    <e-watermark
      content=${args.content || 'DRAFT'}
      font-size=${String(args.fontSize ?? 16)}
      rotate=${String(args.rotate ?? -22)}
      opacity=${String(args.opacity ?? 0.18)}
    >
      <article style="border:2px solid #000;padding:24px;background:#fff;min-height:240px">
        <h2 style="margin:0 0 8px">Memo</h2>
        <p>This page carries a watermark behind the content.</p>
        <p>Use it for draft, preview or confidential layouts on e-paper devices.</p>
      </article>
    </e-watermark>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = { args: { content: 'DRAFT' } };
export const Confidential: Story = {
  args: { content: 'CONFIDENTIAL', fontSize: 14, rotate: -28 },
};
export const Subtle: Story = { args: { content: 'EPAPER', opacity: 0.08 } };
