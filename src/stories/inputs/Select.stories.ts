import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Inputs/Select',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Drop-down list for choosing one option from a closed set. Prefer over RadioGroup once the option count gets long enough that scanning becomes expensive (~6+ items).',
      },
    },
  },
  argTypes: {
    value: { control: 'text', description: 'Selected option value' },
    placeholder: { control: 'text' },
  },
  render: (args) => html`
    <e-select value=${args.value || ''} placeholder=${args.placeholder || 'Choose…'}>
      <e-option value="apple" label="Apple" />
      <e-option value="banana" label="Banana" />
      <e-option value="cherry" label="Cherry" />
      <e-option value="date" label="Date" />
      <e-option value="elderberry" label="Elderberry" />
    </e-select>
  `,
};
export default meta;

type Story = StoryObj;

export const Empty: Story = {
  args: { value: '', placeholder: 'Select a fruit…' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-select__trigger')).toBeTruthy();
    });
    await checkA11y(canvasElement);
    const select = canvasElement.querySelector('e-select');
    expect(select).toBeInTheDocument();
  },
};

export const WithValue: Story = {
  args: { value: 'banana', placeholder: 'Select a fruit…' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-select__option')).toBeTruthy();
    });
    await checkA11y(canvasElement);
    const select = canvasElement.querySelector('e-select');
    expect(select?.getAttribute('value')).toBe('banana');
  },
};

export const Countries: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-select__option')).toBeTruthy();
    });
    await checkA11y(canvasElement);
    const options = canvasElement.querySelectorAll('.ink-select__option');
    expect(options).toHaveLength(5);
  },
  render: () => html`
    <e-select placeholder="Select country…">
      <e-option value="de" label="Germany" />
      <e-option value="fr" label="France" />
      <e-option value="it" label="Italy" />
      <e-option value="es" label="Spain" />
      <e-option value="ch" label="Switzerland" />
    </e-select>
  `,
};

export const OpenAndPick: Story = {
  args: { value: '', placeholder: 'Pick…' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-select__trigger')).toBeTruthy();
    });
    const sel = canvasElement.querySelector('e-select') as HTMLElement;
    const trigger = sel.querySelector<HTMLElement>('.ink-select__trigger')!;
    const menu = sel.querySelector<HTMLElement>('.ink-select__menu')!;
    expect(menu.hidden).toBe(true);
    await userEvent.click(trigger);
    expect(menu.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const cherry = menu.querySelector<HTMLElement>('[data-value="cherry"]')!;
    await userEvent.click(cherry);
    expect(sel.getAttribute('value')).toBe('cherry');
    expect(menu.hidden).toBe(true);
    expect(cherry.getAttribute('aria-selected')).toBe('true');

    await userEvent.click(trigger);
    const apple = menu.querySelector<HTMLElement>('[data-value="apple"]')!;
    await userEvent.click(apple);
    expect(sel.getAttribute('value')).toBe('apple');

    await userEvent.click(trigger);
    expect(menu.hidden).toBe(false);
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(menu.hidden).toBe(true);
  },
};

export const KeyboardNavigation: Story = {
  args: { value: '', placeholder: 'Pick…' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-select__trigger')).toBeTruthy();
    });
    const sel = canvasElement.querySelector('e-select') as HTMLElement;
    const trigger = sel.querySelector<HTMLElement>('.ink-select__trigger')!;
    const menu = sel.querySelector<HTMLElement>('.ink-select__menu')!;
    const opt = (v: string) => menu.querySelector<HTMLElement>(`[data-value="${v}"]`)!;

    // ArrowDown on trigger opens and focuses first option.
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(menu.hidden).toBe(false);
    expect(document.activeElement).toBe(opt('apple'));

    // Walk down to cherry.
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toBe(opt('cherry'));

    // Enter selects, closes menu, focus returns to trigger.
    await userEvent.keyboard('{Enter}');
    expect(sel.getAttribute('value')).toBe('cherry');
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);

    // Reopen — ArrowUp lands on currently selected (cherry).
    await userEvent.keyboard('{ArrowUp}');
    expect(menu.hidden).toBe(false);
    expect(document.activeElement).toBe(opt('cherry'));

    // End jumps to last option.
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(opt('elderberry'));

    // Home jumps to first.
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(opt('apple'));

    // Escape closes.
    await userEvent.keyboard('{Escape}');
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  },
};
