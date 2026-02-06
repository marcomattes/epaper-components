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
    <div class="eink-stack eink-stack--sm" style="max-width:32rem">
      <div class="eink-alert eink-alert--info" role="status">
        <div class="eink-alert__title">Info</div>
        <div class="eink-alert__body">Thin left rule; minimal repaint.</div>
      </div>
      <div class="eink-alert eink-alert--success" role="status">
        <div class="eink-alert__title">Success</div>
        <div class="eink-alert__body">Thicker rule for emphasis.</div>
      </div>
      <div class="eink-alert eink-alert--warning" role="status">
        <div class="eink-alert__title">Warning</div>
        <div class="eink-alert__body">Dashed rule stands out on E-Ink.</div>
      </div>
      <div class="eink-alert eink-alert--error" role="alert">
        <div class="eink-alert__title">Error</div>
        <div class="eink-alert__body">Error state with muted fill.</div>
      </div>
    </div>`,
};

export const NavigationPatterns: Story = {
  name: "Breadcrumb / Pagination / Tabs",
  render: () => `
    <div class="eink-stack eink-stack--sm" style="max-width:40rem">
      <nav class="eink-breadcrumb" aria-label="Breadcrumb">
        <ol class="eink-breadcrumb__list">
          <li class="eink-breadcrumb__item"><a href="#">Home</a></li>
          <li class="eink-breadcrumb__item"><a href="#">Library</a></li>
          <li class="eink-breadcrumb__item" aria-current="page">Current</li>
        </ol>
      </nav>
      <nav aria-label="Pagination" class="eink-pagination">
        <ol class="eink-pagination__list">
          <li><a class="eink-pagination__link" aria-disabled="true" href="#" tabindex="-1">Prev</a></li>
          <li><a class="eink-pagination__link" aria-current="page" href="#">1</a></li>
          <li><a class="eink-pagination__link" href="#">2</a></li>
          <li><a class="eink-pagination__link" href="#">Next</a></li>
        </ol>
      </nav>
      <div class="eink-tabs" style="--eink-tabs-count:3">
        <input type="radio" name="tabs" id="tab-1" class="eink-tabs__input" checked>
        <label for="tab-1" class="eink-tabs__tab">One</label>
        <input type="radio" name="tabs" id="tab-2" class="eink-tabs__input">
        <label for="tab-2" class="eink-tabs__tab">Two</label>
        <input type="radio" name="tabs" id="tab-3" class="eink-tabs__input">
        <label for="tab-3" class="eink-tabs__tab">Three</label>
        <div class="eink-tabs__panel">Panel one</div>
        <div class="eink-tabs__panel">Panel two</div>
        <div class="eink-tabs__panel">Panel three</div>
      </div>
    </div>`,
};

export const DataAndLists: Story = {
  name: "Data & Lists",
  render: () => `
    <div class="eink-grid" style="--eink-grid-min:18rem">
      <div class="eink-stack eink-stack--sm">
        <div class="eink-stat">
          <div class="eink-stat__label">Reading time</div>
          <div class="eink-stat__value">18m</div>
          <div class="eink-stat__delta">+3m vs. yesterday</div>
        </div>
        <div class="eink-progress eink-progress--labeled" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100" aria-label="Chapter progress">
          <div class="eink-progress__label">Chapter</div>
          <div class="eink-progress__track">
            <div class="eink-progress__bar" style="width:60%"></div>
          </div>
          <div class="eink-progress__label">60%</div>
        </div>
        <dl class="eink-dl eink-dl--horizontal eink-dl--bordered">
          <dt class="eink-dl__term">Display</dt>
          <dd class="eink-dl__detail">E-Ink Carta 1200</dd>
          <dt class="eink-dl__term">Density</dt>
          <dd class="eink-dl__detail">300 PPI</dd>
        </dl>
      </div>
      <div class="eink-stack eink-stack--sm">
        <ul class="eink-list-group">
          <li class="eink-list-group__item eink-list-group__item--active">Now reading</li>
          <li class="eink-list-group__item">Library</li>
          <li class="eink-list-group__item">Notes</li>
        </ul>
        <div class="eink-tag-group">
          <span class="eink-tag">Outline</span>
          <span class="eink-tag eink-tag--filled">Filled</span>
          <span class="eink-tag eink-tag--muted">Muted</span>
        </div>
        <div class="eink-accordion-group">
          <details class="eink-accordion" open>
            <summary class="eink-accordion__summary">Keyboard shortcuts</summary>
            <div class="eink-accordion__body">Use left/right arrows to flip pages.</div>
          </details>
          <details class="eink-accordion">
            <summary class="eink-accordion__summary">Annotations</summary>
            <div class="eink-accordion__body">Syncs when Wi‑Fi is available.</div>
          </details>
        </div>
      </div>
    </div>`,
};

export const TimelineAndToolbar: Story = {
  name: "Timeline & Toolbar",
  render: () => `
    <div class="eink-grid" style="--eink-grid-min:18rem">
      <div>
        <ol class="eink-timeline">
          <li class="eink-timeline__item eink-timeline__item--active">
            <span class="eink-timeline__time">Today</span>
            <div class="eink-timeline__title">Firmware updated</div>
            <div class="eink-timeline__body">Sharper rendering.</div>
          </li>
          <li class="eink-timeline__item">
            <span class="eink-timeline__time">Yesterday</span>
            <div class="eink-timeline__title">New book added</div>
            <div class="eink-timeline__body">"E-Ink Handbook"</div>
          </li>
        </ol>
      </div>
      <div class="eink-toolbar" role="toolbar" aria-label="Font settings">
        <div class="eink-toolbar__group">
          <span class="eink-toolbar__label">Font</span>
          <button class="eink-btn eink-btn--sm" aria-label="Decrease font size">-</button>
          <button class="eink-btn eink-btn--sm" aria-label="Increase font size">+</button>
        </div>
        <span class="eink-toolbar__separator" aria-hidden="true"></span>
        <div class="eink-toolbar__group">
          <button class="eink-btn eink-btn--sm">Aa</button>
          <button class="eink-btn eink-btn--sm">Mono</button>
        </div>
        <span class="eink-toolbar__spacer"></span>
        <button class="eink-btn eink-btn--ghost eink-btn--sm">Reset</button>
      </div>
    </div>`,
};

export const LoaderAndTooltip: Story = {
  name: "Loader / Tooltip",
  render: () => `
    <div class="eink-stack eink-stack--sm" style="max-width:30rem">
      <div class="eink-loader" role="status" aria-live="polite">
        <span class="eink-loader__label">Syncing library</span>
        <div class="eink-loader__track">
          <div class="eink-loader__fill" style="--eink-loader-value:65%"></div>
        </div>
        <span class="eink-loader__label" aria-hidden="true">65%</span>
      </div>
      <div class="eink-loader eink-loader--thin" data-state="complete" aria-label="Complete">
        <span class="eink-loader__label">Download</span>
        <div class="eink-loader__track">
          <div class="eink-loader__fill"></div>
        </div>
        <span class="eink-badge">Done</span>
      </div>
      <div class="eink-stack eink-stack--sm" style="margin-top:var(--eink-space-4)">
        <div class="eink-cluster" style="align-items:center">
          <button class="eink-btn eink-btn--secondary eink-tooltip" aria-describedby="tt-2">
            Focus tooltip (attr)
          </button>
          <span class="eink-sr-only" id="tt-2">Focus to show tooltip. No hover-only, no animation.</span>
          <button class="eink-btn eink-btn--ghost eink-tooltip eink-tooltip--persistent" data-tooltip="Always visible tooltip via data attribute.">
            Persistent tooltip
          </button>
        </div>
        <div class="eink-tooltip">
          <span>Inline help:</span>
          <button class="eink-tooltip__trigger" type="button" aria-describedby="tt-3">i</button>
          <span class="eink-tooltip__bubble" id="tt-3" role="tooltip">
            Tooltip stays open until focus leaves or you tap outside. Optimized for E-Ink.
          </span>
          <span class="eink-tooltip__arrow" aria-hidden="true"></span>
        </div>
      </div>
    </div>
  `,
};

export const StepperSnackbarSkeleton: Story = {
  name: "Stepper / Snackbar / Skeleton",
  render: () => `
    <div class="eink-stack eink-stack--sm" style="max-width:48rem">
      <div class="eink-grid" style="--eink-grid-min:18rem">
        <ol class="eink-stepper eink-stepper--vertical" aria-label="Vertical setup steps">
          <li class="eink-stepper__item" data-state="done">
            <span class="eink-stepper__marker" aria-hidden="true"></span>
            <div class="eink-stepper__content">
              <div class="eink-stepper__title">Pair device</div>
              <div class="eink-stepper__meta">Tolino Vision connected</div>
            </div>
          </li>
          <li class="eink-stepper__item" data-state="active">
            <span class="eink-stepper__marker" aria-hidden="true">2</span>
            <div class="eink-stepper__content">
              <div class="eink-stepper__title">Sync books</div>
              <div class="eink-stepper__meta">12 of 20 items</div>
            </div>
          </li>
          <li class="eink-stepper__item" data-state="todo">
            <span class="eink-stepper__marker" aria-hidden="true">3</span>
            <div class="eink-stepper__content">
              <div class="eink-stepper__title">Finish</div>
            </div>
          </li>
        </ol>
        <ol class="eink-stepper eink-stepper--horizontal" style="--eink-stepper-count:4" aria-label="Horizontal reading progress">
          <li class="eink-stepper__item" data-state="done"><span class="eink-stepper__marker" aria-hidden="true"></span><div class="eink-stepper__content"><div class="eink-stepper__title">Import</div></div></li>
          <li class="eink-stepper__item" data-state="done"><span class="eink-stepper__marker" aria-hidden="true"></span><div class="eink-stepper__content"><div class="eink-stepper__title">Analyze</div></div></li>
          <li class="eink-stepper__item" data-state="active"><span class="eink-stepper__marker" aria-hidden="true">3</span><div class="eink-stepper__content"><div class="eink-stepper__title">Render</div></div></li>
          <li class="eink-stepper__item" data-state="todo"><span class="eink-stepper__marker" aria-hidden="true">4</span><div class="eink-stepper__content"><div class="eink-stepper__title">Publish</div></div></li>
        </ol>
      </div>
      <div class="eink-skeleton-frame" role="status" aria-label="Loading preview" style="max-width:22rem">
        <span class="eink-skeleton eink-skeleton--title" aria-hidden="true"></span>
        <span class="eink-skeleton eink-skeleton--text" aria-hidden="true"></span>
        <span class="eink-skeleton eink-skeleton--text" aria-hidden="true"></span>
      </div>
      <div class="eink-snackbar eink-snackbar--warning" role="status" style="position:static">
        <p class="eink-snackbar__message">Connection unstable. Cached content shown.</p>
        <a class="eink-snackbar__action" href="#">Retry</a>
      </div>
    </div>
  `,
};
