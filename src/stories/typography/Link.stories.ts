import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Typography/Link',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nInline anchor styled with the system’s underline + ink-fg colour. Set `underline` when you need to force a visible underline outside flowing prose.',
      },
    },
  },
  argTypes: {
    href: { control: 'text', description: 'Link destination' },
    label: { control: 'text', description: 'Link text' },
    underline: { control: 'boolean', description: 'Always show underline' },
  },
  render: (args) => html`
    <e-link href=${args.href} ?underline=${args.underline}>${args.label}</e-link>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { href: '#', label: 'Read the documentation', underline: false },
};

export const Underlined: Story = {
  args: { href: '#', label: 'Always underlined link', underline: true },
};

export const InParagraph: Story = {
  render: () => html`
    <e-text kind="body" as="p">
      This is a paragraph with an inline
      <e-link href="#">hyperlink</e-link>
      embedded within body text.
    </e-text>
  `,
};

export const DefaultHref: Story = {
  play: async ({ canvasElement }) => {
    const link = canvasElement.querySelector('e-link') as HTMLElement;
    const a = link.querySelector('a') as HTMLAnchorElement;
    expect(a).toBeTruthy();
    expect(a.getAttribute('href')).toBe('#');
    expect(a.textContent).toContain('Bare link');
  },
  render: () => html`<e-link>Bare link</e-link>`,
};

export const Reconnect: Story = {
  play: async ({ canvasElement }) => {
    const link = canvasElement.querySelector('e-link') as HTMLElement;
    const parent = link.parentNode as HTMLElement;
    parent.removeChild(link);
    parent.appendChild(link);
    expect(link.querySelectorAll('a').length).toBe(1);
  },
  render: () => html`<e-link href="/x">Move</e-link>`,
};
