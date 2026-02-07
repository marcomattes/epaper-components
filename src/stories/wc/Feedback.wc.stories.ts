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
    <div class="epaper-stack eink-stack--sm" style="max-width:30rem">
      <div class="epaper-loader" role="status" aria-live="polite">
        <span class="epaper-loader__label">Syncing library</span>
        <div class="epaper-loader__track">
          <div class="epaper-loader__fill" style="--epaper-loader-value:70%"></div>
        </div>
        <span class="epaper-loader__label" aria-hidden="true">70%</span>
      </div>
      <div class="epaper-loader eink-loader--thin" data-state="complete">
        <span class="epaper-loader__label">Download</span>
        <div class="epaper-loader__track">
          <div class="epaper-loader__fill"></div>
        </div>
        <span class="epaper-badge">Done</span>
      </div>
    </div>
  `,
};

export const Tooltip: Story = {
  render: () => `
    <div class="epaper-stack eink-stack--sm" style="max-width:32rem">
      <div class="epaper-cluster" style="align-items:center">
        <button class="epaper-btn epaper-btn--secondary eink-tooltip" aria-describedby="wc-tt-1">
          Focus tooltip (attr)
        </button>
        <span class="epaper-sr-only" id="wc-tt-1">Focus to show. No animation.</span>
        <button class="epaper-btn epaper-btn--ghost eink-tooltip eink-tooltip--persistent" data-tooltip="Always visible tooltip.">
          Persistent
        </button>
      </div>
      <div class="epaper-tooltip">
        <span>Inline WC note</span>
        <button class="epaper-tooltip__trigger" type="button" aria-describedby="wc-tt-inline">i</button>
        <span class="epaper-tooltip__bubble" id="wc-tt-inline" role="tooltip">
          Works with Web Components; stays visible until you tap outside the cluster.
        </span>
        <span class="epaper-tooltip__arrow" aria-hidden="true"></span>
      </div>
    </div>
  `,
};

export const Accordion: Story = {
  render: () => `
    <div class="epaper-accordion-group" style="max-width:28rem">
      <details class="epaper-accordion" open>
        <summary class="epaper-accordion__summary">Keyboard shortcuts</summary>
        <div class="epaper-accordion__body">Use left/right arrows to flip pages.</div>
      </details>
      <details class="epaper-accordion">
        <summary class="epaper-accordion__summary">Annotations</summary>
        <div class="epaper-accordion__body">Syncs when Wi‑Fi is available.</div>
      </details>
    </div>
  `,
};
