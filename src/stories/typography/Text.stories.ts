import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Typography/Text',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Body-text element bound to the system type scale. Pick a `kind` (`body`, `prose`, `small`, `mono`, `label`) to map onto the matching `--ink-text-*` token and line-height.',
      },
    },
  },
  argTypes: {
    kind: {
      control: 'select',
      options: ['body', 'prose', 'small', 'mono', 'label'],
      description: 'Text style variant',
    },
    as: {
      control: 'select',
      options: ['span', 'p', 'div'],
      description: 'HTML element to render',
    },
    text: { control: 'text' },
  },
  render: (args) => html` <e-text kind=${args.kind} as=${args.as}>${args.text}</e-text> `,
};
export default meta;

type Story = StoryObj;

export const Body: Story = {
  args: {
    kind: 'body',
    as: 'p',
    text: 'Body text for reading comfortable paragraphs.',
  },
};

export const Prose: Story = {
  args: {
    kind: 'prose',
    as: 'p',
    text: 'Prose text, slightly larger and more relaxed line height for long-form articles.',
  },
};

export const Small: Story = {
  args: { kind: 'small', as: 'span', text: 'Small helper or caption text.' },
};

export const Mono: Story = {
  args: { kind: 'mono', as: 'span', text: 'monospaced_value: 42' },
};

export const Label: Story = {
  args: { kind: 'label', as: 'span', text: 'FORM LABEL' },
};

export const AllKinds: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:12px">
      <e-text kind="prose" as="p"
        >Prose — comfortable reading for articles and long-form content.</e-text
      >
      <e-text kind="body" as="p">Body — standard text for UI descriptions and labels.</e-text>
      <e-text kind="small" as="p">Small — captions, footnotes, and supporting info.</e-text>
      <e-text kind="mono" as="p">Mono — code, values, and technical strings.</e-text>
      <e-text kind="label" as="span">LABEL — uppercase tracking for form labels.</e-text>
    </div>
  `,
};

export const Reconnect: Story = {
  play: async ({ canvasElement }) => {
    const t = canvasElement.querySelector('e-text') as HTMLElement;
    const parent = t.parentNode as HTMLElement;
    const wrapped = t.querySelector('p');
    expect(wrapped).toBeTruthy();
    parent.removeChild(t);
    parent.appendChild(t);
    expect(t.querySelectorAll('p').length).toBe(1);
  },
  render: () => html`<e-text kind="prose" as="p">hello</e-text>`,
};
