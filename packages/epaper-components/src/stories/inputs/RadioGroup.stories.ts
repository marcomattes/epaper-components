import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/RadioGroup',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Single-select control rendered as a list of radio options. Use when the user needs to see all available choices at once.',
      },
    },
  },
  argTypes: {
    value: { control: 'text', description: 'Selected value' },
    layout: { control: 'select', options: ['horizontal', 'vertical'] },
  },
  render: (args) => html`
    <e-radio-group value=${args.value || ''} layout=${args.layout || 'horizontal'}>
      <e-radio value="xs" label="XS" />
      <e-radio value="sm" label="SM" />
      <e-radio value="md" label="MD" />
      <e-radio value="lg" label="LG" />
      <e-radio value="xl" label="XL" />
    </e-radio-group>
  `,
};
export default meta;

type Story = StoryObj;

export const Horizontal: Story = {
  args: { value: 'md', layout: 'horizontal' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio') as HTMLInputElement[];
    expect(radios).toHaveLength(5);
    const checked = radios.find((r) => r.checked);
    expect(checked?.value).toBe('md');
  },
};

export const Vertical: Story = {
  args: { value: 'sm', layout: 'vertical' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio') as HTMLInputElement[];
    const checked = radios.find((r) => r.checked);
    expect(checked?.value).toBe('sm');
  },
};

export const Unselected: Story = {
  args: { value: '', layout: 'horizontal' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio') as HTMLInputElement[];
    expect(radios.every((r) => !r.checked)).toBe(true);
  },
};

export const Selecting: Story = {
  args: { value: '', layout: 'horizontal' },
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('e-radio-group') as HTMLElement & {
      value: string | null;
    };
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio') as HTMLInputElement[];
    radios[2].checked = true;
    radios[2].dispatchEvent(new Event('change', { bubbles: true }));
    expect(group.getAttribute('value')).toBe('md');
    expect(group.value).toBe('md');
  },
};
