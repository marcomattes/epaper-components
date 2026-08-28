import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Primitives/Ribbon',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Diagonal corner banner attached to a parent container — typically a card. Used sparingly for promotions, status flags or “new” callouts.',
      },
    },
  },
  argTypes: {
    text: { control: 'text', description: 'Ribbon label text' },
  },
  render: (args) => html`
    <e-ribbon text=${args.text}>
      <e-card title="Featured Article" eyebrow="Design System">
        <p>This card has a ribbon overlay in the corner.</p>
      </e-card>
    </e-ribbon>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { text: 'NEW' },
};

export const OnButton: Story = {
  render: () => html`
    <e-ribbon text="PRO">
      <e-button variant="primary">Upgrade</e-button>
    </e-ribbon>
  `,
};

export const Multiple: Story = {
  render: () => html`
    <div style="display:flex;gap:24px;flex-wrap:wrap">
      <e-ribbon text="NEW">
        <e-card title="Fresh Feature" eyebrow="Product">
          <p>Just shipped this week.</p>
        </e-card>
      </e-ribbon>
      <e-ribbon text="BETA">
        <e-card title="Experimental" eyebrow="Labs">
          <p>Subject to change.</p>
        </e-card>
      </e-ribbon>
    </div>
  `,
};

export const Renders: Story = {
  play: async ({ canvasElement }) => {
    const ribbon = canvasElement.querySelector('e-ribbon') as HTMLElement;
    const span = ribbon.querySelector('.ink-ribbon');
    const tag = ribbon.querySelector('.ink-ribbon__tag');
    expect(span).toBeTruthy();
    expect(tag?.textContent).toBe('SALE');
  },
  render: () => html`<e-ribbon text="SALE"><span>Item</span></e-ribbon>`,
};

export const NoText: Story = {
  play: async ({ canvasElement }) => {
    const ribbon = canvasElement.querySelector('e-ribbon') as HTMLElement;
    const tag = ribbon.querySelector('.ink-ribbon__tag');
    expect(tag?.textContent).toBe('');
  },
  render: () => html`<e-ribbon><span>Plain</span></e-ribbon>`,
};

export const Reconnect: Story = {
  play: async ({ canvasElement }) => {
    const ribbon = canvasElement.querySelector('e-ribbon') as HTMLElement;
    const parent = ribbon.parentNode as HTMLElement;
    parent.removeChild(ribbon);
    parent.appendChild(ribbon);
    expect(ribbon.querySelectorAll('.ink-ribbon')).toHaveLength(1);
  },
  render: () => html`<e-ribbon text="X"><span>X</span></e-ribbon>`,
};
