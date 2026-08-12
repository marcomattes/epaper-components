import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Layout/Splitter',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Resizable two-pane layout with a draggable divider. Supports horizontal and vertical orientations plus min-size constraints so panes can’t be collapsed past a usable width.',
      },
    },
  },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    initial: { control: 'number', description: 'Initial split percentage' },
    min: { control: 'number', description: 'Min percent for pane A' },
    max: { control: 'number', description: 'Max percent for pane A' },
  },
  render: (args) => html`
    <e-splitter
      orientation=${args.orientation}
      initial=${args.initial}
      min=${args.min}
      max=${args.max}
      style="height:240px;border:2px solid #000"
    >
      <div slot="a" style="padding:16px;background:#f5f5f5">Pane A</div>
      <div slot="b" style="padding:16px;background:#e8e8e8">Pane B</div>
    </e-splitter>
  `,
};
export default meta;

type Story = StoryObj;

export const Horizontal: Story = {
  args: { orientation: 'horizontal', initial: 50, min: 15, max: 85 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const splitter = canvasElement.querySelector('e-splitter');
    expect(splitter).toBeInTheDocument();
    const handle = canvasElement.querySelector('.ink-splitter__handle') as HTMLElement;
    expect(handle).toBeInTheDocument();
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-valuenow')).toBe('50');
    const paneA = canvasElement.querySelector('[data-pane="a"]') as HTMLElement;
    expect(paneA.style.width).toBe('50%');
  },
};

export const Vertical: Story = {
  args: { orientation: 'vertical', initial: 40, min: 15, max: 85 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const handle = canvasElement.querySelector('.ink-splitter__handle') as HTMLElement;
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    const paneA = canvasElement.querySelector('[data-pane="a"]') as HTMLElement;
    expect(paneA.style.height).toBe('40%');
  },
};

export const Skewed: Story = {
  args: { orientation: 'horizontal', initial: 30, min: 20, max: 80 },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const handle = canvasElement.querySelector('.ink-splitter__handle') as HTMLElement;
    const paneA = canvasElement.querySelector('[data-pane="a"]') as HTMLElement;
    expect(paneA.style.width).toBe('30%');
    handle.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(paneA.style.width).toBe('32%');
    expect(handle.getAttribute('aria-valuenow')).toBe('32');
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(paneA.style.width).toBe('28%');
  },
};

export const MouseDrag: Story = {
  args: { orientation: 'horizontal', initial: 50, min: 15, max: 85 },
  play: async ({ canvasElement }) => {
    const handle = canvasElement.querySelector('.ink-splitter__handle') as HTMLElement;
    const wrap = canvasElement.querySelector('.ink-splitter') as HTMLElement;
    const paneA = canvasElement.querySelector('[data-pane="a"]') as HTMLElement;
    const r = wrap.getBoundingClientRect();
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: r.left + r.width * 0.7,
        clientY: r.top + r.height * 0.5,
      }),
    );
    await waitFor(() => expect(paneA.style.width).toBe('70%'));
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: r.left + r.width * 2,
        clientY: r.top + r.height * 0.5,
      }),
    );
    await waitFor(() => expect(paneA.style.width).toBe('85%'));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: r.left + r.width * 0.2,
        clientY: r.top + r.height * 0.5,
      }),
    );
    expect(paneA.style.width).toBe('85%');
  },
};

export const VerticalDrag: Story = {
  args: { orientation: 'vertical', initial: 50, min: 10, max: 90 },
  play: async ({ canvasElement }) => {
    const handle = canvasElement.querySelector('.ink-splitter__handle') as HTMLElement;
    const wrap = canvasElement.querySelector('.ink-splitter') as HTMLElement;
    const paneA = canvasElement.querySelector('[data-pane="a"]') as HTMLElement;
    handle.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(paneA.style.height).toBe('54%');
    await userEvent.keyboard('{ArrowUp}');
    expect(paneA.style.height).toBe('52%');
    const r = wrap.getBoundingClientRect();
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: r.left + r.width * 0.5,
        clientY: r.top + r.height * 0.3,
      }),
    );
    await waitFor(() => expect(paneA.style.height).toBe('30%'));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  },
};
