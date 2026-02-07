import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Components/Additional",
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj;

export const AlertsAndFeedback: Story = {
  name: "Alerts / Feedback",
  render: () => `
    <div class="epaper-stack eink-stack--sm" style="max-width:32rem">
      <div class="epaper-alert eink-alert--info" role="status">
        <div class="epaper-alert__title">Info</div>
        <div class="epaper-alert__body">Thin left rule; minimal repaint.</div>
      </div>
      <div class="epaper-alert eink-alert--success" role="status">
        <div class="epaper-alert__title">Success</div>
        <div class="epaper-alert__body">Thicker rule for emphasis.</div>
      </div>
      <div class="epaper-alert eink-alert--warning" role="status">
        <div class="epaper-alert__title">Warning</div>
        <div class="epaper-alert__body">Dashed rule stands out on E-Ink.</div>
      </div>
      <div class="epaper-alert eink-alert--error" role="alert">
        <div class="epaper-alert__title">Error</div>
        <div class="epaper-alert__body">Error state with muted fill.</div>
      </div>
    </div>`,
};

export const NavigationPatterns: Story = {
  name: "Breadcrumb / Pagination / Tabs",
  render: () => `
    <div class="epaper-stack eink-stack--sm" style="max-width:40rem">
      <nav class="epaper-breadcrumb" aria-label="Breadcrumb">
        <ol class="epaper-breadcrumb__list">
          <li class="epaper-breadcrumb__item"><a href="#">Home</a></li>
          <li class="epaper-breadcrumb__item"><a href="#">Library</a></li>
          <li class="epaper-breadcrumb__item" aria-current="page">Current</li>
        </ol>
      </nav>
      <nav aria-label="Pagination" class="epaper-pagination">
        <ol class="epaper-pagination__list">
          <li><a class="epaper-pagination__link" aria-disabled="true" href="#" tabindex="-1">Prev</a></li>
          <li><a class="epaper-pagination__link" aria-current="page" href="#">1</a></li>
          <li><a class="epaper-pagination__link" href="#">2</a></li>
          <li><a class="epaper-pagination__link" href="#">Next</a></li>
        </ol>
      </nav>
      <div class="epaper-tabs" style="--epaper-tabs-count:3">
        <input type="radio" name="tabs" id="tab-1" class="epaper-tabs__input" checked>
        <label for="tab-1" class="epaper-tabs__tab">One</label>
        <input type="radio" name="tabs" id="tab-2" class="epaper-tabs__input">
        <label for="tab-2" class="epaper-tabs__tab">Two</label>
        <input type="radio" name="tabs" id="tab-3" class="epaper-tabs__input">
        <label for="tab-3" class="epaper-tabs__tab">Three</label>
        <div class="epaper-tabs__panel">Panel one</div>
        <div class="epaper-tabs__panel">Panel two</div>
        <div class="epaper-tabs__panel">Panel three</div>
      </div>
    </div>`,
};

export const DataAndLists: Story = {
  name: "Data & Lists",
  render: () => `
    <div class="epaper-grid" style="--epaper-grid-min:18rem">
      <div class="epaper-stack eink-stack--sm">
        <div class="epaper-stat">
          <div class="epaper-stat__label">Reading time</div>
          <div class="epaper-stat__value">18m</div>
          <div class="epaper-stat__delta">+3m vs. yesterday</div>
        </div>
        <div class="epaper-progress eink-progress--labeled" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100" aria-label="Chapter progress">
          <div class="epaper-progress__label">Chapter</div>
          <div class="epaper-progress__track">
            <div class="epaper-progress__bar" style="width:60%"></div>
          </div>
          <div class="epaper-progress__label">60%</div>
        </div>
        <dl class="epaper-dl eink-dl--horizontal eink-dl--bordered">
          <dt class="epaper-dl__term">Display</dt>
          <dd class="epaper-dl__detail">E-Ink Carta 1200</dd>
          <dt class="epaper-dl__term">Density</dt>
          <dd class="epaper-dl__detail">300 PPI</dd>
        </dl>
      </div>
      <div class="epaper-stack eink-stack--sm">
        <ul class="epaper-list-group">
          <li class="epaper-list-group__item eink-list-group__item--active">Now reading</li>
          <li class="epaper-list-group__item">Library</li>
          <li class="epaper-list-group__item">Notes</li>
        </ul>
        <div class="epaper-tag-group">
          <span class="epaper-tag">Outline</span>
          <span class="epaper-tag eink-tag--filled">Filled</span>
          <span class="epaper-tag eink-tag--muted">Muted</span>
        </div>
        <div class="epaper-accordion-group">
          <details class="epaper-accordion" open>
            <summary class="epaper-accordion__summary">Keyboard shortcuts</summary>
            <div class="epaper-accordion__body">Use left/right arrows to flip pages.</div>
          </details>
          <details class="epaper-accordion">
            <summary class="epaper-accordion__summary">Annotations</summary>
            <div class="epaper-accordion__body">Syncs when Wi‑Fi is available.</div>
          </details>
        </div>
      </div>
    </div>`,
};

export const TimelineAndToolbar: Story = {
  name: "Timeline & Toolbar",
  render: () => `
    <div class="epaper-grid" style="--epaper-grid-min:18rem">
      <div>
        <ol class="epaper-timeline">
          <li class="epaper-timeline__item eink-timeline__item--active">
            <span class="epaper-timeline__time">Today</span>
            <div class="epaper-timeline__title">Firmware updated</div>
            <div class="epaper-timeline__body">Sharper rendering.</div>
          </li>
          <li class="epaper-timeline__item">
            <span class="epaper-timeline__time">Yesterday</span>
            <div class="epaper-timeline__title">New book added</div>
            <div class="epaper-timeline__body">"E-Ink Handbook"</div>
          </li>
        </ol>
      </div>
      <div class="epaper-toolbar" role="toolbar" aria-label="Font settings">
        <div class="epaper-toolbar__group">
          <span class="epaper-toolbar__label">Font</span>
          <button class="epaper-btn epaper-btn--sm" aria-label="Decrease font size">-</button>
          <button class="epaper-btn epaper-btn--sm" aria-label="Increase font size">+</button>
        </div>
        <span class="epaper-toolbar__separator" aria-hidden="true"></span>
        <div class="epaper-toolbar__group">
          <button class="epaper-btn epaper-btn--sm">Aa</button>
          <button class="epaper-btn epaper-btn--sm">Mono</button>
        </div>
        <span class="epaper-toolbar__spacer"></span>
        <button class="epaper-btn epaper-btn--ghost epaper-btn--sm">Reset</button>
      </div>
    </div>`,
};

export const LoaderAndTooltip: Story = {
  name: "Loader / Tooltip",
  render: () => `
    <div class="epaper-stack eink-stack--sm" style="max-width:30rem">
      <div class="epaper-loader" role="status" aria-live="polite">
        <span class="epaper-loader__label">Syncing library</span>
        <div class="epaper-loader__track">
          <div class="epaper-loader__fill" style="--epaper-loader-value:65%"></div>
        </div>
        <span class="epaper-loader__label" aria-hidden="true">65%</span>
      </div>
      <div class="epaper-loader eink-loader--thin" data-state="complete" aria-label="Complete">
        <span class="epaper-loader__label">Download</span>
        <div class="epaper-loader__track">
          <div class="epaper-loader__fill"></div>
        </div>
        <span class="epaper-badge">Done</span>
      </div>
      <div class="epaper-stack eink-stack--sm" style="margin-top:var(--epaper-space-4)">
        <div class="epaper-cluster" style="align-items:center">
          <button class="epaper-btn epaper-btn--secondary eink-tooltip" aria-describedby="tt-2">
            Focus tooltip (attr)
          </button>
          <span class="epaper-sr-only" id="tt-2">Focus to show tooltip. No hover-only, no animation.</span>
          <button class="epaper-btn epaper-btn--ghost eink-tooltip eink-tooltip--persistent" data-tooltip="Always visible tooltip via data attribute.">
            Persistent tooltip
          </button>
        </div>
        <div class="epaper-tooltip">
          <span>Inline help:</span>
          <button class="epaper-tooltip__trigger" type="button" aria-describedby="tt-3">i</button>
          <span class="epaper-tooltip__bubble" id="tt-3" role="tooltip">
            Tooltip stays open until focus leaves or you tap outside. Optimized for E-Ink.
          </span>
          <span class="epaper-tooltip__arrow" aria-hidden="true"></span>
        </div>
      </div>
    </div>
  `,
};
