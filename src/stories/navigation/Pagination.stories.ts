import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, userEvent } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Navigation/Pagination',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Page-list control for paged data sets. Provides previous/next buttons, direct page jumps and an ellipsis when the page count exceeds the visible window.',
      },
    },
  },
  argTypes: {
    current: { control: 'number', description: 'Active page (1-based)' },
    total: { control: 'number', description: 'Total number of pages' },
    siblingCount: { control: 'number', description: 'Pages shown around current' },
  },
  render: (args) => html`
    <e-pagination
      current=${args.current}
      total=${args.total}
      sibling-count=${args.siblingCount}
    ></e-pagination>
  `,
};
export default meta;

type Story = StoryObj;

export const FirstPage: Story = {
  args: { current: 1, total: 10, siblingCount: 1 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const prev = canvas.getByRole('button', { name: 'Previous' }) as HTMLButtonElement;
    expect(prev).toBeDisabled();
    const next = canvas.getByRole('button', { name: 'Next' }) as HTMLButtonElement;
    expect(next).not.toBeDisabled();
    const current = canvasElement.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current.textContent?.trim()).toBe('1');
  },
};

export const MiddlePage: Story = {
  args: { current: 5, total: 10, siblingCount: 1 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: 'Previous' })).not.toBeDisabled();
    expect(canvas.getByRole('button', { name: 'Next' })).not.toBeDisabled();
    const current = canvasElement.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current.textContent?.trim()).toBe('5');
  },
};

export const LastPage: Story = {
  args: { current: 10, total: 10, siblingCount: 1 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: 'Next' })).toBeDisabled();
    const current = canvasElement.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current.textContent?.trim()).toBe('10');
  },
};

export const ManyPages: Story = {
  args: { current: 15, total: 50, siblingCount: 1 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const gaps = canvasElement.querySelectorAll('.ink-pagination__gap');
    expect(gaps.length).toBe(2);
    const pager = canvasElement.querySelector('e-pagination') as HTMLElement;
    let captured: number | null = null;
    pager.addEventListener(
      'e-change',
      (e) => {
        captured = (e as CustomEvent).detail.value;
      },
      { once: true },
    );
    const page16 = canvasElement.querySelector('button[data-page="16"]') as HTMLButtonElement;
    await userEvent.click(page16);
    expect(captured).toBe(16);
    expect(pager.getAttribute('current')).toBe('16');
  },
};

export const WideSiblings: Story = {
  args: { current: 10, total: 20, siblingCount: 2 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    for (const p of [8, 9, 10, 11, 12]) {
      expect(canvasElement.querySelector(`button[data-page="${p}"]`)).toBeInTheDocument();
    }
  },
};

export const SmallTotal: Story = {
  args: { current: 2, total: 4, siblingCount: 1 },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelectorAll('.ink-pagination__gap').length).toBe(0);
    for (const p of [1, 2, 3, 4]) {
      expect(canvasElement.querySelector(`button[data-page="${p}"]`)).toBeInTheDocument();
    }
    const pager = canvasElement.querySelector('e-pagination') as HTMLElement;
    (canvasElement.querySelector('button[aria-label="Next"]') as HTMLButtonElement).click();
    expect(pager.getAttribute('current')).toBe('3');
    (canvasElement.querySelector('button[aria-label="Previous"]') as HTMLButtonElement).click();
    expect(pager.getAttribute('current')).toBe('2');
    (
      canvasElement.querySelector('button[data-page="2"][aria-current="page"]') as HTMLButtonElement
    ).click();
    expect(pager.getAttribute('current')).toBe('2');
  },
};
