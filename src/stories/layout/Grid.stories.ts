import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const cell = (span: number, label: string) => html`
  <e-grid-item col="span ${span}">
    <div style="background:#000;color:#fff;padding:8px;text-align:center;font-size:12px">
      span ${span} · ${label}
    </div>
  </e-grid-item>
`;

const meta: Meta = {
  title: 'Layout/Grid',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Two-dimensional CSS-grid container. Compose with `<e-grid-item col="span N">` to lay out cells. Use the `cols` and `gap` attributes to drive the track count and spacing.',
      },
    },
  },
  argTypes: {
    cols: { control: 'number', description: 'Number of columns' },
    gap: { control: 'number', description: 'Gap in px' },
  },
  render: (args) => html`
    <e-grid cols=${args.cols} gap=${args.gap}>
      ${cell(6, 'Half')}${cell(6, 'Half')} ${cell(4, 'Third')}${cell(4, 'Third')}${cell(4, 'Third')}
      ${cell(3, 'Quarter')}${cell(3, 'Quarter')}${cell(3, 'Quarter')}${cell(3, 'Quarter')}
      ${cell(12, 'Full')}
    </e-grid>
  `,
};
export default meta;

type Story = StoryObj;

export const TwelveColumn: Story = {
  args: { cols: 12, gap: 8 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const grid = canvasElement.querySelector('e-grid');
    expect(grid?.getAttribute('cols')).toBe('12');
    const items = canvasElement.querySelectorAll('e-grid-item');
    expect(items.length).toBeGreaterThan(0);
  },
};

export const ThreeColumn: Story = {
  args: { cols: 3, gap: 16 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const grid = canvasElement.querySelector('e-grid');
    expect(grid?.getAttribute('cols')).toBe('3');
  },
};

export const TwoColumn: Story = {
  args: { cols: 2, gap: 16 },
  render: (args) => html`
    <e-grid cols=${args.cols} gap=${args.gap}>
      ${cell(1, 'Left')}${cell(1, 'Right')} ${cell(1, 'A')}${cell(1, 'B')}
    </e-grid>
  `,
};

export const StringValues: Story = {
  play: async ({ canvasElement }) => {
    const grid = canvasElement.querySelector('e-grid') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toContain('200px');
    expect(grid.style.gap).toBe('1rem');
    const itemA = canvasElement.querySelector('e-grid-item[col="1 / 3"]') as HTMLElement;
    expect(itemA.style.gridColumn).toBe('1 / 3');
    const itemB = canvasElement.querySelector('e-grid-item[row="2"]') as HTMLElement;
    expect(itemB.style.gridRow).toBe('2');
  },
  render: () => html`
    <e-grid cols="200px 200px" gap="1rem">
      <e-grid-item col="1 / 3"><div>Wide</div></e-grid-item>
      <e-grid-item row="2"><div>Below</div></e-grid-item>
    </e-grid>
  `,
};
