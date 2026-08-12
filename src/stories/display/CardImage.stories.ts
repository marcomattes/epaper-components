import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/CardImage',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Card variant with a leading hero region — either an image URL or the built-in diagonal `hatch` cover for editorial layouts. Pairs well with Ribbon for featured items.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    eyebrow: { control: 'text' },
    cover: { control: 'select', options: ['hatch', 'https://picsum.photos/400/200'] },
    footerText: { control: 'text' },
  },
  render: (args) => html`
    <e-card-image
      title=${args.title || ''}
      eyebrow=${args.eyebrow || ''}
      cover=${args.cover || 'hatch'}
      style="max-width:360px"
    >
      <p>Card body content goes here.</p>
    </e-card-image>
  `,
};
export default meta;

type Story = StoryObj;

export const HatchCover: Story = {
  args: { title: 'Article Title', eyebrow: 'Blog · April 2026', cover: 'hatch' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('heading', { name: 'Article Title' })).toBeInTheDocument();
    expect(canvas.getByText('Blog · April 2026')).toBeInTheDocument();
    const cover = canvasElement.querySelector('.ink-card__cover');
    expect(cover).toBeInTheDocument();
    expect(cover!.className).toContain('ink-card__cover--hatch');
  },
};

export const WithImageUrl: Story = {
  args: {
    title: 'Product Launch',
    eyebrow: 'News',
    cover: 'https://picsum.photos/400/200',
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('heading', { name: 'Product Launch' })).toBeInTheDocument();
    const cover = canvasElement.querySelector('.ink-card__cover');
    expect(cover).toBeInTheDocument();
    expect(cover!.className).not.toContain('--hatch');
  },
};

export const WithFooter: Story = {
  render: () => html`
    <e-card-image title="Research Paper" eyebrow="Science" cover="hatch" style="max-width:360px">
      <p>Abstract and summary content.</p>
      <div slot="footer" style="display:flex;justify-content:space-between;align-items:center">
        <e-text kind="small" as="span">12 min read</e-text>
        <e-button variant="secondary">Read More</e-button>
      </div>
    </e-card-image>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('heading', { name: 'Research Paper' })).toBeInTheDocument();
    expect(canvas.getByRole('button', { name: 'Read More' })).toBeInTheDocument();
    expect(canvasElement.querySelector('.ink-card__footer')).toBeInTheDocument();
  },
};
