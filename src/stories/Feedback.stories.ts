import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Components/Feedback",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

export const Loader: Story = {
  render: () => `
    <div class="epaper-stack eink-stack--sm" style="max-width:30rem">
      <div class="epaper-loader" role="status" aria-live="polite">
        <span class="epaper-loader__label">Updating firmware</span>
        <div class="epaper-loader__track">
          <div class="epaper-loader__fill" style="--epaper-loader-value:40%"></div>
        </div>
        <span class="epaper-loader__label" aria-hidden="true">40%</span>
      </div>
      <div class="epaper-loader eink-loader--thin" data-state="paused" aria-label="Paused">
        <span class="epaper-loader__label">Download paused</span>
        <div class="epaper-loader__track">
          <div class="epaper-loader__fill" style="--epaper-loader-value:55%"></div>
        </div>
        <span class="epaper-badge">Paused</span>
      </div>
    </div>
  `,
};

export const Tooltip: Story = {
  render: () => `
    <div class="epaper-stack eink-stack--sm" style="max-width:32rem">
      <div class="epaper-cluster" style="align-items:center">
        <button class="epaper-btn epaper-btn--secondary eink-tooltip" aria-describedby="tt-1">
          Focus tooltip (attr)
        </button>
        <span class="epaper-sr-only" id="tt-1">Appears on focus. No animation.</span>
        <button class="epaper-btn epaper-btn--ghost eink-tooltip eink-tooltip--persistent" data-tooltip="Always visible tooltip.">
          Persistent
        </button>
      </div>

      <div class="epaper-tooltip">
        <span>Inline fact:</span>
        <button class="epaper-tooltip__trigger" type="button" aria-describedby="tt-inline">i</button>
        <span class="epaper-tooltip__bubble" id="tt-inline" role="tooltip">
          Tap the “i” to toggle. Tooltip stays open until you click outside.
        </span>
        <span class="epaper-tooltip__arrow" aria-hidden="true"></span>
      </div>

      <p class="epaper-note">
        Tooltips are focus-first; hover is optional. No motion to avoid ghosting on E-Ink.
      </p>
    </div>
  `,
};
