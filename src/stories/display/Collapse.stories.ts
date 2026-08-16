import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, fn, waitFor, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Collapse',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Stack of expandable sections built on native `<details>`/`<summary>`. Expanding a section mutates one `open` attribute, so the panel repaints only the section that changed instead of reflowing the page — which is what makes a collapse a better fit than a scrolling wall of text on e-paper. Keyboard support, the accessible name and find-in-page all come from the native element.',
      },
    },
  },
  argTypes: {
    accordion: { control: 'boolean' },
    defaultOpen: { control: 'text' },
  },
  render: (args) => html`
    <e-collapse ?accordion=${args.accordion} default-open=${args.defaultOpen}>
      <e-collapse-panel key="shipping" heading="Shipping">
        Ships within two working days. Tracking arrives by email.
      </e-collapse-panel>
      <e-collapse-panel key="returns" heading="Returns">
        Thirty days, no questions asked. Return postage is on us.
      </e-collapse-panel>
      <e-collapse-panel key="warranty" heading="Warranty">
        Two years on the display, one year on the battery.
      </e-collapse-panel>
    </e-collapse>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { accordion: false, defaultOpen: 'shipping' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Shipping')).toBeInTheDocument();
    const panels = canvasElement.querySelectorAll('details');
    expect(panels[0]!.open).toBe(true);
    expect(panels[1]!.open).toBe(false);
  },
};

export const Accordion: Story = {
  args: { accordion: true, defaultOpen: 'shipping' },
  parameters: {
    docs: {
      description: {
        story: 'Opening one panel closes the rest, so only one body is ever rendered at a time.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const collapse = canvasElement.querySelector('e-collapse')!;
    const onChange = fn();
    collapse.addEventListener('e-change', onChange);
    const panels = canvasElement.querySelectorAll('details');

    panels[1]!.querySelector('summary')!.click();

    // `<details>` dispatches `toggle` as a queued task, so the accordion
    // collapses the sibling on the next tick rather than synchronously.
    await waitFor(() => {
      expect(panels[1]!.open).toBe(true);
      expect(panels[0]!.open).toBe(false);
    });
    const detail = (onChange.mock.calls.at(-1)![0] as CustomEvent).detail;
    expect(detail.value).toEqual(['returns']);
  },
};

export const MultipleOpen: Story = {
  args: { accordion: false, defaultOpen: 'shipping,warranty' },
  play: async ({ canvasElement }) => {
    const panels = canvasElement.querySelectorAll('details');
    expect(panels[0]!.open).toBe(true);
    expect(panels[2]!.open).toBe(true);
  },
};

export const DisabledPanel: Story = {
  render: () => html`
    <e-collapse>
      <e-collapse-panel key="a" heading="Available">Open me.</e-collapse-panel>
      <e-collapse-panel key="b" heading="Locked" disabled>Not reachable.</e-collapse-panel>
    </e-collapse>
  `,
  play: async ({ canvasElement }) => {
    const panels = canvasElement.querySelectorAll('details');
    panels[1]!.querySelector('summary')!.click();
    expect(panels[1]!.open).toBe(false);
  },
};
