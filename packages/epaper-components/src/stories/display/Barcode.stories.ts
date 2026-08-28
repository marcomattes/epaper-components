import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Barcode',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.3.0',
      description: {
        component:
          'EAN-13, EAN-8, UPC-A and Code 128 rendered as inline SVG by a self-contained encoder — the same construction as `<e-qrcode>`: zero runtime dependencies, one white rect plus one dark path, `shape-rendering="crispEdges"`. A missing check digit is computed; a wrong one is reported.',
      },
    },
  },
  argTypes: {
    format: { control: 'inline-radio', options: ['auto', 'ean13', 'ean8', 'upca', 'code128'] },
    height: { control: 'number' },
    moduleWidth: { control: 'number' },
    showText: { control: 'boolean' },
  },
  render: (args) => html`
    <e-barcode
      value=${args.value ?? '4006381333931'}
      format=${args.format ?? 'auto'}
      height=${args.height ?? 80}
      module-width=${args.moduleWidth ?? 2}
      ?show-text=${args.showText}
    ></e-barcode>
  `,
};
export default meta;

type Story = StoryObj;

export const Ean13: Story = {
  args: { value: '4006381333931', format: 'auto', height: 80, showText: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const barcode = canvasElement.querySelector('e-barcode')!;
    expect(barcode.querySelector('svg')!.getAttribute('shape-rendering')).toBe('crispEdges');
    expect(barcode.querySelector('.ink-barcode__text')!.textContent).toBe('4 006381 333931');
  },
};

export const Ean8: Story = { args: { value: '96385074', showText: true } };

export const UpcA: Story = { args: { value: '036000291452', showText: true } };

export const Code128: Story = {
  args: { value: 'EPAPER-SHELF-42', format: 'code128', showText: true },
};

export const ShelfLabel: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:8px;max-width:280px">
      <e-price value="3.49" original="4.29" unit-price="6.98" unit="kg" locale="de-DE"></e-price>
      <e-barcode value="4006381333931" height="56" module-width="2" show-text></e-barcode>
    </div>
  `,
};
