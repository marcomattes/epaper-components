import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/Signature',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.3.0',
      description: {
        component:
          'Signature pad on a canvas. The drawn signature is submitted as a PNG `File`, exactly as an `<input type="file">` would post one, and a restored file is put back on the canvas. `clear()` wipes it; `fallback-text` covers a browser without a 2D canvas.',
      },
    },
  },
  argTypes: {
    width: { control: 'number' },
    height: { control: 'number' },
    penWidth: { control: 'number' },
    readonly: { control: 'boolean' },
  },
  render: (args) => html`
    <div style="max-width:480px">
      <e-signature
        name="signature"
        width=${args.width ?? 480}
        height=${args.height ?? 180}
        pen-width=${args.penWidth ?? 3}
        label=${args.label ?? 'Signature'}
        hint=${args.hint ?? 'Sign with a finger or a stylus'}
        ?readonly=${args.readonly}
      ></e-signature>
    </div>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { width: 480, height: 180, penWidth: 3 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const signature = canvasElement.querySelector('e-signature') as HTMLElement & {
      empty: boolean;
    };
    const canvas = signature.querySelector<HTMLCanvasElement>('canvas')!;
    expect(canvas.width).toBe(480);
    expect(signature.empty).toBe(true);
  },
};

export const ThickPen: Story = { args: { penWidth: 6, height: 220 } };

export const Readonly: Story = { args: { readonly: true, hint: 'Captured at check-in' } };

export const DeliveryReceipt: Story = {
  render: () => html`
    <div style="max-width:480px;display:flex;flex-direction:column;gap:12px">
      <e-text kind="label" as="span">Order 4471 · 3 parcels</e-text>
      <e-signature name="receipt" label="Received by" height="140" required></e-signature>
    </div>
  `,
};
