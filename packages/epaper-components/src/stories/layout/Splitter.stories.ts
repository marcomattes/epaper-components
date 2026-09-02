import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Layout/Splitter',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
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

/**
 * Drags are driven with `PointerEvent`, which is what the handle listens for.
 * A capacitive e-paper panel never emits `mousemove` mid-gesture, so a
 * mouse-only implementation was keyboard-only in practice on the hardware this
 * library targets.
 */
const down = (el: HTMLElement, pointerType: 'mouse' | 'touch'): void => {
  el.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: pointerType === 'touch' ? 2 : 1,
      pointerType,
      isPrimary: true,
    }),
  );
};

const moveTo = (x: number, y: number, pointerType: 'mouse' | 'touch' = 'mouse'): void => {
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerId: pointerType === 'touch' ? 2 : 1,
      pointerType,
      isPrimary: true,
    }),
  );
};

const up = (pointerType: 'mouse' | 'touch' = 'mouse'): void => {
  window.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      pointerId: pointerType === 'touch' ? 2 : 1,
      pointerType,
      isPrimary: true,
    }),
  );
};

export const MouseDrag: Story = {
  args: { orientation: 'horizontal', initial: 50, min: 15, max: 85 },
  play: async ({ canvasElement }) => {
    const handle = canvasElement.querySelector('.ink-splitter__handle') as HTMLElement;
    const wrap = canvasElement.querySelector('.ink-splitter') as HTMLElement;
    const paneA = canvasElement.querySelector('[data-pane="a"]') as HTMLElement;
    const r = wrap.getBoundingClientRect();
    down(handle, 'mouse');
    moveTo(r.left + r.width * 0.7, r.top + r.height * 0.5);
    await waitFor(() => expect(paneA.style.width).toBe('70%'));
    moveTo(r.left + r.width * 2, r.top + r.height * 0.5);
    await waitFor(() => expect(paneA.style.width).toBe('85%'));
    up();
    moveTo(r.left + r.width * 0.2, r.top + r.height * 0.5);
    expect(paneA.style.width).toBe('85%');
  },
};

export const TouchDrag: Story = {
  args: { orientation: 'horizontal', initial: 50, min: 15, max: 85 },
  play: async ({ canvasElement }) => {
    const handle = canvasElement.querySelector('.ink-splitter__handle') as HTMLElement;
    const wrap = canvasElement.querySelector('.ink-splitter') as HTMLElement;
    const paneA = canvasElement.querySelector('[data-pane="a"]') as HTMLElement;
    const r = wrap.getBoundingClientRect();
    down(handle, 'touch');
    moveTo(r.left + r.width * 0.35, r.top + r.height * 0.5, 'touch');
    await waitFor(() => expect(paneA.style.width).toBe('35%'));
    up('touch');
    moveTo(r.left + r.width * 0.8, r.top + r.height * 0.5, 'touch');
    expect(paneA.style.width).toBe('35%');
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
    down(handle, 'mouse');
    moveTo(r.left + r.width * 0.5, r.top + r.height * 0.3);
    await waitFor(() => expect(paneA.style.height).toBe('30%'));
    up();
  },
};
