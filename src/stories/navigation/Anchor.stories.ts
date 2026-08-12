import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, waitFor } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Navigation/Anchor',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'In-page navigation that highlights the section currently in view as the user scrolls. Useful for long documentation or article pages.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <div style="display:flex;gap:32px">
      <e-anchor offset-top="80">
        <e-anchor-item href="#sec-1" title="Introduction" depth="0" />
        <e-anchor-item href="#sec-2" title="Getting Started" depth="0" />
        <e-anchor-item href="#sec-2a" title="Installation" depth="1" />
        <e-anchor-item href="#sec-2b" title="Configuration" depth="1" />
        <e-anchor-item href="#sec-3" title="API Reference" depth="0" />
      </e-anchor>
      <div style="flex:1">
        <div id="sec-1" style="padding:16px;margin-bottom:16px;border:2px solid #000">
          <strong>Introduction</strong>
        </div>
        <div id="sec-2" style="padding:16px;margin-bottom:16px;border:2px solid #000">
          <strong>Getting Started</strong>
        </div>
        <div
          id="sec-2a"
          style="padding:16px;margin-bottom:16px;border:1px solid #000;margin-left:24px"
        >
          <strong>Installation</strong>
        </div>
        <div
          id="sec-2b"
          style="padding:16px;margin-bottom:16px;border:1px solid #000;margin-left:24px"
        >
          <strong>Configuration</strong>
        </div>
        <div id="sec-3" style="padding:16px;margin-bottom:16px;border:2px solid #000">
          <strong>API Reference</strong>
        </div>
      </div>
    </div>
  `,
};

export const ScrollAndDisconnect: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-anchor')).toBeTruthy();
    });
    const anchor = canvasElement.querySelector('e-anchor') as HTMLElement;
    // Trigger scroll handler with visible sections in viewport
    window.dispatchEvent(new Event('scroll'));
    expect(anchor.querySelector('.ink-anchor__link[aria-current="true"]')).toBeTruthy();
    // Remove element to exercise disconnectedCallback
    anchor.remove();
  },
  render: () => html`
    <div>
      <e-anchor offset-top="0">
        <e-anchor-item href="#a-sec-1" title="One" depth="0" />
        <e-anchor-item href="#a-sec-2" title="Two" depth="0" />
        <e-anchor-item href="#nope" title="Missing" depth="0" />
        <e-anchor-item title="No href" />
      </e-anchor>
      <div id="a-sec-1" style="height:40px">A</div>
      <div id="a-sec-2" style="height:40px">B</div>
    </div>
  `,
};
