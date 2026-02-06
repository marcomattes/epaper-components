import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Web Components/Feedback",
  parameters: {
    docs: {
      description: {
        component:
          "Class-based feedback patterns used alongside Web Components. Loader, tooltip, and accordion work with the same design tokens and require no extra JS.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Loader: Story = {
  render: () => `
    <div class="eink-stack eink-stack--sm" style="max-width:30rem">
      <div class="eink-loader" role="status" aria-live="polite">
        <span class="eink-loader__label">Syncing library</span>
        <div class="eink-loader__track">
          <div class="eink-loader__fill" style="--eink-loader-value:70%"></div>
        </div>
        <span class="eink-loader__label" aria-hidden="true">70%</span>
      </div>
      <div class="eink-loader eink-loader--thin" data-state="complete">
        <span class="eink-loader__label">Download</span>
        <div class="eink-loader__track">
          <div class="eink-loader__fill"></div>
        </div>
        <span class="eink-badge">Done</span>
      </div>
    </div>
  `,
};

export const Tooltip: Story = {
  render: () => `
    <div class="eink-cluster" style="align-items:center">
      <button class="eink-btn eink-btn--secondary eink-tooltip" data-tooltip="Focus to show. No animation.">
        Focus tooltip
      </button>
      <button class="eink-btn eink-btn--ghost eink-tooltip eink-tooltip--persistent" data-tooltip="Always visible tooltip.">
        Persistent
      </button>
    </div>
  `,
};

export const Accordion: Story = {
  render: () => `
    <div class="eink-accordion-group" style="max-width:28rem">
      <details class="eink-accordion" open>
        <summary class="eink-accordion__summary">Keyboard shortcuts</summary>
        <div class="eink-accordion__body">Use left/right arrows to flip pages.</div>
      </details>
      <details class="eink-accordion">
        <summary class="eink-accordion__summary">Annotations</summary>
        <div class="eink-accordion__body">Syncs when Wi‑Fi is available.</div>
      </details>
    </div>
  `,
};
