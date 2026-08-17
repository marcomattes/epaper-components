import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, waitFor } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Display/Image',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nImage wrapper with native lazy-loading, fallback source and optional caption. On error, swaps to `fallback`; if that fails too, shows a hatched placeholder.',
      },
    },
  },
  argTypes: {
    src: { control: 'text' },
    alt: { control: 'text' },
    caption: { control: 'text' },
    lazy: { control: 'boolean' },
    fit: { control: 'inline-radio', options: ['cover', 'contain', 'fill', 'none'] },
  },
  render: (args) => html`
    <e-image
      src=${args.src || ''}
      alt=${args.alt || ''}
      caption=${args.caption || ''}
      ?lazy=${args.lazy}
      fit=${args.fit || 'cover'}
      style="max-width:320px"
    ></e-image>
  `,
};
export default meta;

type Story = StoryObj;

const SAMPLE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 200'>
      <rect width='320' height='200' fill='#fff' stroke='#000' stroke-width='4'/>
      <text x='160' y='110' text-anchor='middle' font-family='serif' font-size='32' font-weight='700'>EPAPER</text>
    </svg>`,
  );

export const Default: Story = {
  args: {
    src: SAMPLE,
    alt: 'Demo cover',
    caption: 'Issue #42 — Spring 2026',
    lazy: true,
  },
};

export const FallbackChain: Story = {
  render: () => html`
    <e-image
      src="https://invalid.example/missing.png"
      alt="Cover"
      fallback=${SAMPLE}
      caption="Recovered from fallback"
      style="max-width:320px"
    ></e-image>
  `,
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const img = canvasElement.querySelector<HTMLImageElement>('img');
      expect(img?.getAttribute('data-state')).toBe('loaded');
    });
  },
};

export const Placeholder: Story = {
  render: () => html`<e-image alt="Missing image" style="max-width:240px"></e-image>`,
};
