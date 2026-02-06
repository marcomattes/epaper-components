import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Components/Feedback",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

export const Loader: Story = {
  render: () => `
    <div class="eink-stack eink-stack--sm" style="max-width:30rem">
      <div class="eink-loader" role="status" aria-live="polite">
        <span class="eink-loader__label">Updating firmware</span>
        <div class="eink-loader__track">
          <div class="eink-loader__fill" style="--eink-loader-value:40%"></div>
        </div>
        <span class="eink-loader__label" aria-hidden="true">40%</span>
      </div>
      <div class="eink-loader eink-loader--thin" data-state="paused" aria-label="Paused">
        <span class="eink-loader__label">Download paused</span>
        <div class="eink-loader__track">
          <div class="eink-loader__fill" style="--eink-loader-value:55%"></div>
        </div>
        <span class="eink-badge">Paused</span>
      </div>
    </div>
  `,
};

export const Tooltip: Story = {
  render: () => `
    <div class="eink-stack eink-stack--sm" style="max-width:32rem">
      <div class="eink-cluster" style="align-items:center">
        <button class="eink-btn eink-btn--secondary eink-tooltip" aria-describedby="tt-1">
          Focus tooltip (attr)
        </button>
        <span class="eink-sr-only" id="tt-1">Appears on focus. No animation.</span>
        <button class="eink-btn eink-btn--ghost eink-tooltip eink-tooltip--persistent" data-tooltip="Always visible tooltip.">
          Persistent
        </button>
      </div>

      <div class="eink-tooltip">
        <span>Inline fact:</span>
        <button class="eink-tooltip__trigger" type="button" aria-describedby="tt-inline">i</button>
        <span class="eink-tooltip__bubble" id="tt-inline" role="tooltip">
          Tap the “i” to toggle. Tooltip stays open until you click outside.
        </span>
        <span class="eink-tooltip__arrow" aria-hidden="true"></span>
      </div>

      <p class="eink-note">
        Tooltips are focus-first; hover is optional. No motion to avoid ghosting on E-Ink.
      </p>
    </div>
  `,
};
