import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Price',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.3.0\n\nRetail price with the major unit set large and the minor unit small. Formatting goes through `Intl`, so the currency symbol lands where the locale puts it. `original` adds a struck-through previous price, `unit-price`/`unit` add the base price, and `size` scales the whole block from a 1.5" shelf label to a 10" panel.',
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    original: { control: 'number' },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    locale: { control: 'inline-radio', options: ['de-DE', 'en-US', 'en-GB'] },
  },
  render: (args) => html`
    <e-price
      value=${args.value ?? 3.99}
      original=${args.original ?? ''}
      currency=${args.currency ?? 'EUR'}
      locale=${args.locale ?? 'de-DE'}
      size=${args.size ?? 'md'}
      unit-price=${args.unitPrice ?? ''}
      unit=${args.unit ?? ''}
      note=${args.note ?? ''}
    ></e-price>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { value: 3.99, size: 'md', locale: 'de-DE' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const price = canvasElement.querySelector('e-price')!;
    expect(price.querySelector('.ink-price__major')!.textContent).toBe('3');
    expect(price.querySelector('.ink-price__minor')!.textContent).toBe(',99');
    expect(price.querySelector('.ink-price__currency')!.textContent).toBe('€');
  },
};

export const Reduced: Story = {
  args: { value: 3.49, original: 4.99, size: 'lg', note: 'incl. VAT' },
};

export const WithBasePrice: Story = {
  args: { value: 2.79, unitPrice: 5.58, unit: 'kg', size: 'md' },
};

export const Dollars: Story = {
  args: { value: 12.5, currency: 'USD', locale: 'en-US', size: 'lg' },
};

export const ShelfLabelSizes: Story = {
  render: () => html`
    <div style="display:flex;align-items:flex-end;gap:24px;flex-wrap:wrap">
      <e-price value="1.99" size="xs" locale="de-DE"></e-price>
      <e-price value="3.99" size="sm" locale="de-DE"></e-price>
      <e-price value="7.99" size="md" locale="de-DE"></e-price>
      <e-price value="19.99" size="lg" locale="de-DE"></e-price>
    </div>
  `,
};
