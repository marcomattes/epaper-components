import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, waitFor } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Composite/FloatButton',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Fixed-position circular action button anchored to a viewport corner. Surfaces a top-priority action (e.g. compose, add) without taking space in the document flow.',
      },
    },
  },
  argTypes: {
    icon: { control: 'text', description: 'Icon name' },
    label: { control: 'text', description: 'Tooltip label' },
    primary: { control: 'boolean' },
  },
  render: (args) => html`
    <div style="position:relative;height:300px;background:#f5f5f5">
      <e-float-button
        icon=${args.icon || 'plus'}
        label=${args.label || 'Add'}
        ?primary=${args.primary !== false}
      ></e-float-button>
    </div>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { icon: 'plus', label: 'Add', primary: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const btn = canvasElement.querySelector('e-float-button');
    expect(btn).toBeInTheDocument();
    expect(btn?.getAttribute('label')).toBe('Add');
  },
};

export const Secondary: Story = {
  args: { icon: 'edit', label: 'Edit', primary: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const btn = canvasElement.querySelector('e-float-button');
    expect(btn).toBeInTheDocument();
  },
};

export const Group: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-fab-group button')).toBeTruthy();
    });
    await checkA11y(canvasElement);
    const items = canvasElement.querySelectorAll('.ink-fab-group button');
    expect(items).toHaveLength(3);
  },
  render: () => html`
    <div style="position:relative;height:300px;background:#f5f5f5">
      <e-float-button-group orientation="vertical">
        <e-fab-item icon="pen" label="Edit" />
        <e-fab-item icon="copy" label="Copy" />
        <e-fab-item icon="trash" label="Delete" />
      </e-float-button-group>
    </div>
  `,
};

export const HorizontalGroup: Story = {
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const group = canvasElement.querySelector('e-float-button-group');
    expect(group?.getAttribute('orientation')).toBe('horizontal');
  },
  render: () => html`
    <div style="position:relative;height:300px;background:#f5f5f5">
      <e-float-button-group orientation="horizontal">
        <e-fab-item icon="arrowU" label="Top" />
        <e-fab-item icon="home" label="Home" />
        <e-fab-item icon="cog" label="Settings" />
      </e-float-button-group>
    </div>
  `,
};
