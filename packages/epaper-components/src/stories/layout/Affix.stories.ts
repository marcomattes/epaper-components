import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Layout/Affix',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Wraps content in a CSS `position: sticky` container. Pure CSS — no scroll listeners, no e-paper waveform on scroll.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <div
      tabindex="0"
      style="display:flex;gap:24px;align-items:flex-start;height:600px;overflow:auto"
    >
      <e-affix offset-top="16" style="flex:0 0 200px">
        <div style="border:2px solid #000;padding:12px;background:#fff">
          <strong>Pinned</strong>
          <div style="font-family:ui-monospace,monospace;font-size:12px;margin-top:6px">
            Sticks 16px from top
          </div>
        </div>
      </e-affix>
      <div style="flex:1">
        ${Array.from({ length: 20 }).map(
          (_, i) =>
            html`<p style="border:1px solid #000;padding:12px;margin:0 0 12px">
              Section ${i + 1}
            </p>`,
        )}
      </div>
    </div>
  `,
};
