import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Layout/Space',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Inline gap utility that distributes equal spacing between children. Lighter than Flex when all you need is a consistent gutter between elements.',
      },
    },
  },
  argTypes: {
    size: { control: 'number', description: 'Gap size in px' },
    direction: { control: 'select', options: ['horizontal', 'vertical'] },
    wrap: { control: 'boolean' },
  },
  render: (args) => html`
    <e-space size=${args.size} direction=${args.direction} ?wrap=${args.wrap}>
      <e-button variant="primary">First</e-button>
      <e-button variant="secondary">Second</e-button>
      <e-button variant="secondary">Third</e-button>
    </e-space>
  `,
};
export default meta;

type Story = StoryObj;

export const Horizontal: Story = {
  args: { size: 12, direction: 'horizontal', wrap: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const space = canvasElement.querySelector('e-space') as HTMLElement;
    const cs = getComputedStyle(space);
    expect(cs.display).toBe('inline-flex');
    expect(cs.flexDirection).toBe('row');
    expect(cs.gap).toBe('12px');
    expect(within(canvasElement).getAllByRole('button')).toHaveLength(3);
  },
};

export const Vertical: Story = {
  args: { size: 12, direction: 'vertical', wrap: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const space = canvasElement.querySelector('e-space') as HTMLElement;
    expect(getComputedStyle(space).flexDirection).toBe('column');
  },
};

export const Compact: Story = {
  args: { size: 4, direction: 'horizontal', wrap: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const space = canvasElement.querySelector('e-space') as HTMLElement;
    expect(getComputedStyle(space).gap).toBe('4px');
  },
};

export const Loose: Story = {
  args: { size: 24, direction: 'horizontal', wrap: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const space = canvasElement.querySelector('e-space') as HTMLElement;
    expect(getComputedStyle(space).gap).toBe('24px');
  },
};
