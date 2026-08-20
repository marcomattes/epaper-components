import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Typography/Title',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nHeading element across the H1–H6 scale. The `level` attribute drives both the rendered tag (for semantics) and the `--ink-text-h*` token used for sizing.',
      },
    },
  },
  argTypes: {
    level: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6],
      description: 'Heading level (h1–h6)',
    },
    text: { control: 'text', description: 'Heading text' },
  },
  render: (args) => html` <e-title level=${args.level}>${args.text}</e-title> `,
};
export default meta;

type Story = StoryObj;

export const H1: Story = {
  args: { level: 1, text: 'Display Heading' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', { level: 1, name: 'Display Heading' });
    expect(heading).toBeInTheDocument();
    expect(heading.className).toContain('ink-title--1');
  },
};

export const H2: Story = {
  args: { level: 2, text: 'Section Heading' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', { level: 2, name: 'Section Heading' });
    expect(heading).toBeInTheDocument();
    expect(heading.className).toContain('ink-title--2');
  },
};

export const H3: Story = {
  args: { level: 3, text: 'Sub-section Heading' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', {
      level: 3,
      name: 'Sub-section Heading',
    });
    expect(heading).toBeInTheDocument();
  },
};

export const AllLevels: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:8px">
      <e-title level="1">Heading Level 1</e-title>
      <e-title level="2">Heading Level 2</e-title>
      <e-title level="3">Heading Level 3</e-title>
      <e-title level="4">Heading Level 4</e-title>
      <e-title level="5">Heading Level 5</e-title>
      <e-title level="6">Heading Level 6</e-title>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    for (let i = 1; i <= 6; i++) {
      const heading = canvas.getByRole('heading', { level: i });
      expect(heading).toBeInTheDocument();
      expect(heading.className).toContain(`ink-title--${i}`);
    }
  },
};

export const ClampLevel: Story = {
  play: async ({ canvasElement }) => {
    const headings = canvasElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
    // level=99 clamps to 6, level=0 clamps to 1
    expect(canvasElement.querySelector('e-title[level="99"] h6')).toBeTruthy();
    expect(canvasElement.querySelector('e-title[level="0"] h1')).toBeTruthy();
    expect(headings).toHaveLength(2);
  },
  render: () => html`
    <div>
      <e-title level="99">Too high</e-title>
      <e-title level="0">Too low</e-title>
    </div>
  `,
};

export const Reconnect: Story = {
  play: async ({ canvasElement }) => {
    const t = canvasElement.querySelector('e-title') as HTMLElement;
    const parent = t.parentNode as HTMLElement;
    parent.removeChild(t);
    parent.appendChild(t);
    expect(t.querySelectorAll('h2')).toHaveLength(1);
  },
  render: () => html`<e-title level="2">Move me</e-title>`,
};
