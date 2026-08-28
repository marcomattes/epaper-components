import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/Rating',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.3.0\n\nStar or smiley rating with 48px touch targets and full keyboard control (arrows, `Home`/`End`, digit keys). Form-associated: an unrated control submits an empty value, so `required` behaves like it does on a native control.',
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    max: { control: 'number' },
    glyph: { control: 'inline-radio', options: ['star', 'smiley'] },
    readonly: { control: 'boolean' },
    allowClear: { control: 'boolean' },
  },
  render: (args) => html`
    <e-rating
      name="rating"
      value=${args.value ?? 0}
      max=${args.max ?? 5}
      glyph=${args.glyph ?? 'star'}
      label=${args.label ?? 'How was your visit?'}
      ?readonly=${args.readonly}
      ?allow-clear=${args.allowClear}
    ></e-rating>
  `,
};
export default meta;

type Story = StoryObj;

export const Stars: Story = {
  args: { value: 4, max: 5, glyph: 'star' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const rating = canvasElement.querySelector('e-rating')!;
    const symbols = [...rating.querySelectorAll<HTMLElement>('.ink-rating__symbol')];
    expect(symbols.filter((s) => s.dataset['on'] === 'true')).toHaveLength(4);
  },
};

export const Smileys: Story = { args: { value: 3, max: 5, glyph: 'smiley' } };

export const Readonly: Story = { args: { value: 5, readonly: true } };

export const Clearable: Story = { args: { value: 2, allowClear: true } };

export const Picking: Story = {
  args: { value: 0, max: 5 },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-rating__group')).toBeTruthy();
    });
    const rating = canvasElement.querySelector('e-rating') as HTMLElement & { value: number };
    const symbols = [...rating.querySelectorAll<HTMLElement>('.ink-rating__symbol')];
    await userEvent.click(symbols[3]);
    expect(rating.value).toBe(4);
    await userEvent.keyboard('{ArrowLeft}');
    expect(rating.value).toBe(3);
  },
};
