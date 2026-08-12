import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const OPTIONS = JSON.stringify([
  {
    value: 'electronics',
    label: 'Electronics',
    children: [
      {
        value: 'phones',
        label: 'Phones',
        children: [
          { value: 'android', label: 'Android' },
          { value: 'ios', label: 'iOS' },
        ],
      },
      {
        value: 'laptops',
        label: 'Laptops',
        children: [
          { value: 'windows', label: 'Windows' },
          { value: 'mac', label: 'Mac' },
        ],
      },
    ],
  },
  {
    value: 'clothing',
    label: 'Clothing',
    children: [
      { value: 'men', label: "Men's" },
      { value: 'women', label: "Women's" },
    ],
  },
]);

const meta: Meta = {
  title: 'Inputs/Cascader',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Tiered select that drills into multi-level options column-by-column (e.g. country → region → city). The committed value is the full path joined with commas.',
      },
    },
  },
  argTypes: {
    value: { control: 'text', description: 'Selected path (comma-separated values)' },
    placeholder: { control: 'text' },
  },
  render: (args) => html`
    <e-cascader
      options=${OPTIONS}
      value=${args.value || ''}
      placeholder=${args.placeholder || 'Choose category…'}
    ></e-cascader>
  `,
};
export default meta;

type Story = StoryObj;

export const Empty: Story = {
  args: { value: '', placeholder: 'Choose category…' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    expect(canvasElement.querySelector('e-cascader')).toBeInTheDocument();
  },
};

export const WithValue: Story = {
  args: { value: 'electronics,phones,android' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const cascader = canvasElement.querySelector('e-cascader');
    expect(cascader).toBeInTheDocument();
    expect(cascader?.getAttribute('value')).toBe('electronics,phones,android');
  },
};

export const Drilldown: Story = {
  args: { value: '', placeholder: 'Pick…' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-cascader')).toBeTruthy();
    });
    const cas = canvasElement.querySelector('e-cascader') as HTMLElement;
    const trigger = () => cas.querySelector<HTMLElement>('[data-trigger]')!;
    const menu = () => cas.querySelector<HTMLElement>('.ink-cascader__menu')!;
    expect(menu().hidden).toBe(true);
    await userEvent.click(trigger());
    expect(menu().hidden).toBe(false);

    const pick = (val: string) =>
      userEvent.click(cas.querySelector<HTMLElement>(`.ink-cascader__item[data-value="${val}"]`)!);

    await pick('electronics');
    await pick('phones');
    await pick('android');
    expect(cas.getAttribute('value')).toBe('electronics,phones,android');

    await userEvent.click(trigger());
    await pick('clothing');
    await pick('men');
    expect(cas.getAttribute('value')).toBe('clothing,men');

    await userEvent.click(trigger());
    expect(menu().hidden).toBe(false);
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(menu().hidden).toBe(true);
  },
};

export const InvalidOptions: Story = {
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('e-cascader')).toBeInTheDocument();
  },
  render: () => html`<e-cascader options="bad json" placeholder="None"></e-cascader>`,
};

export const KeyboardNavigation: Story = {
  args: { value: '', placeholder: 'Pick…' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-cascader')).toBeTruthy();
    });
    const cas = canvasElement.querySelector('e-cascader') as HTMLElement;
    const trigger = cas.querySelector<HTMLElement>('[data-trigger]')!;
    const menu = () => cas.querySelector<HTMLElement>('.ink-cascader__menu')!;

    // Open via ArrowDown on trigger.
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(menu().hidden).toBe(false);
    expect((document.activeElement as HTMLElement).dataset['value']).toBe('electronics');

    // ArrowDown moves within column.
    await userEvent.keyboard('{ArrowDown}');
    expect((document.activeElement as HTMLElement).dataset['value']).toBe('clothing');
    await userEvent.keyboard('{ArrowUp}');
    expect((document.activeElement as HTMLElement).dataset['value']).toBe('electronics');

    // ArrowRight drills into children.
    await userEvent.keyboard('{ArrowRight}');
    expect((document.activeElement as HTMLElement).dataset['value']).toBe('phones');
    await userEvent.keyboard('{ArrowRight}');
    expect((document.activeElement as HTMLElement).dataset['value']).toBe('android');

    // ArrowLeft returns to parent column.
    await userEvent.keyboard('{ArrowLeft}');
    expect((document.activeElement as HTMLElement).dataset['value']).toBe('phones');

    // Enter on a leaf selects.
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(cas.getAttribute('value')).toBe('electronics,phones,android');
    expect(menu().hidden).toBe(true);

    // Escape closes when reopened.
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(menu().hidden).toBe(false);
    await userEvent.keyboard('{Escape}');
    expect(menu().hidden).toBe(true);
  },
};
