import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const BOX = () =>
  html`<div style="background:#000;color:#fff;padding:8px 12px;font-size:13px">Box</div>`;

const meta: Meta = {
  title: 'Layout/Flex',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nOne-dimensional flexbox container. Exposes attributes for `direction`, `wrap`, `gap`, `justify` and `align` so layout stays declarative — no ad-hoc inline styles.',
      },
    },
  },
  argTypes: {
    direction: { control: 'select', options: ['row', 'column'] },
    wrap: { control: 'select', options: ['nowrap', 'wrap'] },
    gap: { control: 'text', description: 'Gap value (px or CSS)' },
    justify: {
      control: 'select',
      options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
    },
    align: {
      control: 'select',
      options: ['stretch', 'flex-start', 'center', 'flex-end'],
    },
  },
  render: (args) => html`
    <e-flex
      direction=${args.direction}
      wrap=${args.wrap}
      gap=${args.gap}
      justify=${args.justify}
      align=${args.align}
    >
      ${[1, 2, 3].map(() => BOX())}
    </e-flex>
  `,
};
export default meta;

type Story = StoryObj;

export const Row: Story = {
  args: {
    direction: 'row',
    wrap: 'nowrap',
    gap: '12',
    justify: 'flex-start',
    align: 'stretch',
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const flex = canvasElement.querySelector('e-flex') as HTMLElement;
    expect(flex).toBeInTheDocument();
    const cs = getComputedStyle(flex);
    expect(cs.display).toBe('flex');
    expect(cs.flexDirection).toBe('row');
    expect(cs.gap).toBe('12px');
    expect(flex.children.length).toBe(3);
  },
};

export const Column: Story = {
  args: {
    direction: 'column',
    wrap: 'nowrap',
    gap: '12',
    justify: 'flex-start',
    align: 'flex-start',
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const flex = canvasElement.querySelector('e-flex') as HTMLElement;
    const cs = getComputedStyle(flex);
    expect(cs.flexDirection).toBe('column');
    expect(cs.alignItems).toBe('flex-start');
  },
};

export const SpaceBetween: Story = {
  args: {
    direction: 'row',
    wrap: 'nowrap',
    gap: '0',
    justify: 'space-between',
    align: 'center',
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const flex = canvasElement.querySelector('e-flex') as HTMLElement;
    const cs = getComputedStyle(flex);
    expect(cs.justifyContent).toBe('space-between');
    expect(cs.alignItems).toBe('center');
  },
};

export const Centered: Story = {
  args: {
    direction: 'row',
    wrap: 'nowrap',
    gap: '16',
    justify: 'center',
    align: 'center',
  },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const flex = canvasElement.querySelector('e-flex') as HTMLElement;
    const cs = getComputedStyle(flex);
    expect(cs.justifyContent).toBe('center');
    expect(cs.alignItems).toBe('center');
    expect(cs.gap).toBe('16px');
  },
};
