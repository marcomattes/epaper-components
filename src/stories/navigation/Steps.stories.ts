import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Navigation/Steps',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nSequential progress indicator for multi-step flows such as onboarding, checkout or wizards. Renders horizontally by default; switch to `vertical` for tall sidebars.',
      },
    },
  },
  argTypes: {
    current: { control: 'number', description: 'Zero-based active step index' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
  render: (args) => html`
    <e-steps current=${args.current} orientation=${args.orientation}>
      <e-step title="Account" description="Create your account" />
      <e-step title="Profile" description="Fill in your details" />
      <e-step title="Payment" description="Add payment method" />
      <e-step title="Done" description="You're all set!" />
    </e-steps>
  `,
};
export default meta;

type Story = StoryObj;

export const StepOne: Story = {
  args: { current: 0, orientation: 'horizontal' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const items = canvasElement.querySelectorAll('.ink-steps__item');
    expect(items).toHaveLength(4);
    expect(items[0].getAttribute('data-active')).toBe('true');
    expect(items[0].getAttribute('data-done')).toBe('false');
    // No completed yet
    expect(canvasElement.querySelectorAll('[data-done="true"]')).toHaveLength(0);
  },
};

export const StepTwo: Story = {
  args: { current: 1, orientation: 'horizontal' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const items = canvasElement.querySelectorAll('.ink-steps__item');
    expect(items[0].getAttribute('data-done')).toBe('true');
    expect(items[1].getAttribute('data-active')).toBe('true');
    expect(items[2].getAttribute('data-active')).toBe('false');
  },
};

export const Completed: Story = {
  args: { current: 3, orientation: 'horizontal' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const items = canvasElement.querySelectorAll('.ink-steps__item');
    expect(canvasElement.querySelectorAll('[data-done="true"]')).toHaveLength(3);
    expect(items[3].getAttribute('data-active')).toBe('true');
  },
};

export const Vertical: Story = {
  args: { current: 1, orientation: 'vertical' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const ol = canvasElement.querySelector('ol.ink-steps') as HTMLElement;
    expect(ol).toBeInTheDocument();
    expect(ol.classList.contains('ink-steps--horizontal')).toBe(false);
    expect(canvasElement.textContent).toContain('IN PROGRESS');
    expect(canvasElement.textContent).toContain('DONE');
    expect(canvasElement.textContent).toContain('PENDING');
  },
};
