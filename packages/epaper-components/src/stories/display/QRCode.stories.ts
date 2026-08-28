import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Display/QRCode',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Pure-SVG QR code renderer with zero runtime dependencies. Ideal for e-paper devices: every module is a sharp 1-bit cell.',
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    level: { control: 'inline-radio', options: ['L', 'M', 'Q', 'H'] },
    scale: { control: { type: 'number', min: 1, max: 12 } },
    border: { control: { type: 'number', min: 0, max: 8 } },
  },
  render: (args) => html`
    <e-qrcode
      value=${args.value || ''}
      level=${args.level || 'M'}
      scale=${String(args.scale ?? 4)}
      border=${String(args.border ?? 2)}
    ></e-qrcode>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { value: 'https://epaper.example.com', level: 'M', scale: 4, border: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const svg = canvasElement.querySelector('e-qrcode svg');
    expect(svg).toBeTruthy();
    expect(canvas.getByRole('img')).toBeInTheDocument();
  },
};

export const HighRecovery: Story = {
  args: { value: 'EPAPER://device/A1B2C3', level: 'H', scale: 5, border: 3 },
};

export const Small: Story = {
  args: { value: 'hello', level: 'L', scale: 3, border: 1 },
};

export const Empty: Story = {
  args: { value: '', level: 'M', scale: 4, border: 2 },
};
