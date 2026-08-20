import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Navigation/BackTop',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nFloating button that scrolls the window (or a target container) to the top. Hidden until the user has scrolled past `visibility-height`.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <div
      id="bt-scroll"
      tabindex="0"
      style="height:480px;overflow:auto;border:2px solid #000;padding:16px;position:relative"
    >
      ${Array.from({ length: 30 }).map(
        (_, i) => html`<p style="margin:0 0 12px">Line ${i + 1}</p>`,
      )}
      <e-back-top
        target="#bt-scroll"
        visibility-height="120"
        style="position:absolute"
      ></e-back-top>
    </div>
  `,
};

export const Window: Story = {
  render: () => html`
    <div>
      ${Array.from({ length: 60 }).map(
        (_, i) => html`<p style="margin:0 0 12px">Window line ${i + 1}</p>`,
      )}
      <e-back-top visibility-height="200"></e-back-top>
    </div>
  `,
};
