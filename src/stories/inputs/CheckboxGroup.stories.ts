import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/CheckboxGroup',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nCollection of related checkboxes managed as one form field. Lays out children either vertically (default) or horizontally, exposing the joined selection as a comma-separated string.',
      },
    },
  },
  argTypes: {
    value: { control: 'text', description: 'Comma-separated selected values' },
    layout: { control: 'select', options: ['horizontal', 'vertical'] },
  },
  render: (args) => html`
    <e-checkbox-group value=${args.value || ''} layout=${args.layout || 'vertical'}>
      <e-cbox-option value="design" label="Design" />
      <e-cbox-option value="dev" label="Development" />
      <e-cbox-option value="pm" label="Project Management" />
      <e-cbox-option value="qa" label="Quality Assurance" />
    </e-checkbox-group>
  `,
};
export default meta;

type Story = StoryObj;

export const Vertical: Story = {
  args: { value: 'design', layout: 'vertical' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const checkboxes = canvas.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes).toHaveLength(4);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  },
};

export const Horizontal: Story = {
  args: { value: 'design,dev', layout: 'horizontal' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const checkboxes = canvas.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  },
};

export const AllSelected: Story = {
  args: { value: 'design,dev,pm,qa', layout: 'vertical' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const checkboxes = canvas.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes.every((cb) => cb.checked)).toBe(true);
  },
};

export const NoneSelected: Story = {
  args: { value: '', layout: 'vertical' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const checkboxes = canvas.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes.every((cb) => !cb.checked)).toBe(true);
  },
};

export const Toggling: Story = {
  args: { value: '', layout: 'vertical' },
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('e-checkbox-group') as HTMLElement;
    const canvas = within(canvasElement);
    const checkboxes = canvas.getAllByRole('checkbox') as HTMLInputElement[];
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[2]);
    expect(group.getAttribute('value')).toBe('design,pm');
  },
};
