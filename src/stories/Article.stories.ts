import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Pages/Article",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const BlogPost: Story = {
  name: "Blog Post",
  render: () => `
    <div style="max-width:52rem;margin-inline:auto;padding:var(--epaper-space-7) var(--epaper-space-6)">
      <nav class="epaper-breadcrumb" aria-label="Breadcrumb" style="margin-bottom:var(--epaper-space-6)">
        <ol class="epaper-breadcrumb__list">
          <li class="epaper-breadcrumb__item"><a href="#">Home</a></li>
          <li class="epaper-breadcrumb__item"><a href="#">Blog</a></li>
          <li class="epaper-breadcrumb__item" aria-current="page">E-Ink Display Technology</li>
        </ol>
      </nav>

      <article>
        <header style="margin-bottom:var(--epaper-space-7)">
          <h1 style="margin-bottom:var(--epaper-space-4)">Why E-Ink Displays Deserve Better Software</h1>
          <div class="epaper-cluster" style="align-items:center;margin-bottom:var(--epaper-space-3)">
            <span class="epaper-text-sm eink-text-muted">By Maren Richter</span>
            <span class="epaper-text-sm eink-text-muted" aria-hidden="true">&middot;</span>
            <time class="epaper-text-sm eink-text-muted" datetime="2025-11-15">November 15, 2025</time>
            <span class="epaper-text-sm eink-text-muted" aria-hidden="true">&middot;</span>
            <span class="epaper-text-sm eink-text-muted">8 min read</span>
          </div>
          <div class="epaper-cluster">
            <span class="epaper-tag">E-Ink</span>
            <span class="epaper-tag">Design Systems</span>
            <span class="epaper-tag">Accessibility</span>
          </div>
        </header>

        <hr class="epaper-divider eink-divider--strong" style="margin-bottom:var(--epaper-space-7)">

        <div class="epaper-prose" style="--epaper-measure:52rem;line-height:1.8">
          <p style="font-size:1.125rem">Electronic paper has been commercially available for nearly two decades, yet the software designed for these displays remains stuck in patterns borrowed from LCD and OLED screens. Animations, translucent overlays, and colour gradients are default choices in modern UI frameworks &mdash; none of which translate well to electrophoretic displays.</p>

          <h2 style="margin-top:var(--epaper-space-8)">The Ghosting Problem</h2>
          <p>Every partial refresh on an E-Ink panel leaves a faint trace of the previous frame. This phenomenon, known as <em>ghosting</em>, is exacerbated by large filled regions, rapid layout changes, and gratuitous motion. A purpose-built design system can eliminate most ghosting artifacts by following a few simple principles.</p>

          <blockquote style="margin-block:var(--epaper-space-6);padding:var(--epaper-space-5) var(--epaper-space-6)">"If your interface looks identical before and after a full-page flash, you've done E-Ink design right."</blockquote>

          <h3 style="margin-top:var(--epaper-space-7)">Borders Over Fills</h3>
          <p>Filled backgrounds require the display controller to move thousands of charged pigment particles between black and white states. Borders and rules achieve visual hierarchy at a fraction of the repaint cost. Consider a card component: a 1-pixel border defines the boundary just as clearly as a grey background, but produces no ghosting on subsequent updates.</p>

          <h3 style="margin-top:var(--epaper-space-7)">Stable Spacing, Not Dynamic Layout</h3>
          <p>Reflowing content causes the entire viewport to repaint. Fixed vertical rhythm &mdash; consistent margins and padding derived from a spacing scale &mdash; keeps the panel stable between navigations. When users flip between pages of text, only the prose region needs to update.</p>

          <h2 style="margin-top:var(--epaper-space-8)">A Practical Token System</h2>
          <p>CSS custom properties let us encode display-specific constraints directly into the design language. A small set of tokens covers the essentials:</p>

          <pre style="margin-block:var(--epaper-space-5);padding:var(--epaper-space-5)"><code>--epaper-fg:          #1a1a1a;
--epaper-bg:          #f5f5f0;
--epaper-border-color: #999;
--epaper-space-4:     1rem;
--epaper-border-thin:  1px;</code></pre>

          <p>Themes become simple variable overrides. An inverted theme swaps foreground and background; a high-contrast theme pushes values to pure black and white. No component CSS changes at all.</p>

          <h2 style="margin-top:var(--epaper-space-8)">What Comes Next</h2>
          <p>Colour E-Ink panels &mdash; such as Kaleido 3 and Gallery 3 &mdash; introduce a limited palette of four to seven hues. Future design systems will need to map semantic colour tokens to this constrained gamut while preserving readability. The foundations laid by monochrome-first systems will make that transition far smoother.</p>

          <p>The lesson is straightforward: design for the medium. E-Ink rewards restraint, clarity, and structure. The best interfaces for electronic paper are the ones that treat its limitations as features.</p>
        </div>

        <hr class="epaper-divider" style="margin-block:var(--epaper-space-7)">

        <footer class="epaper-stack" style="--epaper-stack-gap:var(--epaper-space-6)">
          <div class="epaper-cluster">
            <span class="epaper-text-sm eink-text-muted">Share:</span>
            <button class="epaper-btn epaper-btn--sm epaper-btn--ghost">Copy link</button>
            <button class="epaper-btn epaper-btn--sm epaper-btn--ghost">Email</button>
          </div>

          <div class="epaper-card" style="max-width:32rem">
            <div class="epaper-card__body" style="padding:var(--epaper-space-5)">
              <div class="epaper-cluster" style="align-items:center;gap:var(--epaper-space-5)">
                <div style="width:3.5rem;height:3.5rem;border-radius:50%;border:var(--epaper-border-thin) solid var(--epaper-border-color);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <strong>MR</strong>
                </div>
                <div>
                  <strong>Maren Richter</strong>
                  <p class="epaper-text-sm eink-text-muted" style="margin:var(--epaper-space-1) 0 0">Design engineer focused on low-power and accessible interfaces. Based in Berlin.</p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </article>
    </div>`,
};

export const PressRelease: Story = {
  name: "Press Release",
  render: () => `
    <div style="max-width:50rem;margin-inline:auto;padding:var(--epaper-space-7) var(--epaper-space-6)">
      <div class="epaper-stack--lg">
        <header style="margin-bottom:var(--epaper-space-6)">
          <span class="epaper-tag eink-tag--filled" style="margin-bottom:var(--epaper-space-4);display:inline-block">Press Release</span>
          <h1 style="margin-bottom:var(--epaper-space-4)">Papyrus Labs Announces Open-Source E-Ink Component Library</h1>
          <p class="epaper-text-sm eink-text-muted">
            <strong>BERLIN, November 20, 2025</strong> &mdash; For immediate release
          </p>
        </header>

        <hr class="epaper-divider eink-divider--strong" style="margin-bottom:var(--epaper-space-7)">

        <div class="epaper-prose" style="--epaper-measure:50rem;line-height:1.8">
          <p style="font-size:1.125rem"><strong>Papyrus Labs</strong>, a design-technology studio specialising in low-power user interfaces, today released <em>epaper-components</em>, an open-source CSS component library purpose-built for electronic paper displays.</p>

          <p>The library ships as a single, zero-JavaScript CSS file weighing under 12 KB compressed. It provides tokens, layout primitives, form controls, and composite components optimised for the unique rendering characteristics of E-Ink panels.</p>

          <p>"Most design systems assume 60-fps colour screens," said Maren Richter, lead engineer at Papyrus Labs. "We built epaper-components from first principles for a medium where every pixel flip has a physical cost."</p>

          <h3 style="margin-top:var(--epaper-space-7)">Key Features</h3>
          <ul style="line-height:2">
            <li>Three built-in themes: default, inverted, and high-contrast</li>
            <li>Dual CSS selectors for standalone and Web Component usage</li>
            <li>Accessible form patterns with error summaries and focus-visible states</li>
            <li>No animations, no hover-dependent affordances, no JavaScript dependencies</li>
            <li>Tested on Kindle Paperwhite, Kobo Libra 2, and reMarkable 2</li>
          </ul>

          <h3 style="margin-top:var(--epaper-space-7)">Availability</h3>
          <p>epaper-components 1.0 is available today under the MIT licence. Documentation and demo pages are hosted on GitHub Pages.</p>
        </div>

        <hr class="epaper-divider" style="margin-block:var(--epaper-space-7)">

        <div class="epaper-card" style="max-width:28rem">
          <div class="epaper-card__title">Media Contact</div>
          <div class="epaper-card__body" style="padding:var(--epaper-space-5)">
            <dl class="epaper-dl eink-dl--horizontal eink-dl--bordered">
              <dt class="epaper-dl__term">Name</dt>
              <dd class="epaper-dl__detail">Jonas Weber</dd>
              <dt class="epaper-dl__term">Email</dt>
              <dd class="epaper-dl__detail">press@papyrus-labs.example</dd>
              <dt class="epaper-dl__term">Phone</dt>
              <dd class="epaper-dl__detail">+49 30 555 0199</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>`,
};
