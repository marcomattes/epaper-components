import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Foundations/Typography",
};

export default meta;
type Story = StoryObj;

export const TypeScale: Story = {
  render: () => `
    <div class="eink-stack eink-stack--sm">
      <div><span class="eink-text-xs eink-text-muted eink-text-mono">h1 — 2.25rem</span><h1>Heading 1</h1></div>
      <hr class="eink-divider">
      <div><span class="eink-text-xs eink-text-muted eink-text-mono">h2 — 1.875rem</span><h2>Heading 2</h2></div>
      <hr class="eink-divider">
      <div><span class="eink-text-xs eink-text-muted eink-text-mono">h3 — 1.5rem</span><h3>Heading 3</h3></div>
      <hr class="eink-divider">
      <div><span class="eink-text-xs eink-text-muted eink-text-mono">h4 — 1.25rem</span><h4>Heading 4</h4></div>
      <hr class="eink-divider">
      <div><span class="eink-text-xs eink-text-muted eink-text-mono">body — 1rem</span><p>Body text for paragraphs.</p></div>
      <hr class="eink-divider">
      <div><span class="eink-text-xs eink-text-muted eink-text-mono">small — 0.875rem</span><p class="eink-text-sm">Small text for captions.</p></div>
      <hr class="eink-divider">
      <div><span class="eink-text-xs eink-text-muted eink-text-mono">xs — 0.75rem</span><p class="eink-text-xs">Extra-small for metadata.</p></div>
    </div>`,
};

export const FontStacks: Story = {
  render: () => `
    <div class="eink-stack eink-stack--sm">
      <div>
        <span class="eink-badge">Sans-serif</span>
        <p style="margin-top:var(--eink-space-2)">The quick brown fox jumps over the lazy dog. 0123456789.</p>
      </div>
      <hr class="eink-divider">
      <div>
        <span class="eink-badge">Serif</span>
        <p class="eink-text-serif" style="margin-top:var(--eink-space-2)">The quick brown fox jumps over the lazy dog. 0123456789.</p>
      </div>
      <hr class="eink-divider">
      <div>
        <span class="eink-badge">Monospace</span>
        <p class="eink-text-mono" style="margin-top:var(--eink-space-2)">The quick brown fox jumps over the lazy dog. 0123456789.</p>
      </div>
    </div>`,
};

export const InlineElements: Story = {
  render: () => `
    <div class="eink-stack eink-stack--sm">
      <p><strong>Bold text</strong></p>
      <p><em>Italic text</em></p>
      <p><small>Small text</small></p>
      <p><mark>Highlighted text</mark></p>
      <p><code>Inline code</code></p>
      <p><kbd>Ctrl</kbd> + <kbd>S</kbd></p>
      <p><a href="#">A hyperlink</a></p>
    </div>`,
};

export const CodeBlock: Story = {
  render: () => `
    <pre><code>.my-component {
  color: var(--eink-fg);
  border: var(--eink-border-thin) solid var(--eink-border-color);
  padding: var(--eink-space-4);
}</code></pre>`,
};

export const Blockquote: Story = {
  render: () => `
    <blockquote>
      "The best interface for a reading device is one that disappears entirely."
    </blockquote>`,
};

export const Prose: Story = {
  render: () => `
    <div class="eink-prose">
      <h3>On electronic paper</h3>
      <p>Electronic paper displays use electrophoretic technology to rearrange charged pigment particles. The result is a reflective display that closely mimics paper.</p>
      <p>Unlike LCD or OLED screens, E-Ink requires no backlight. The display is perfectly legible in direct sunlight.</p>
      <blockquote>"The best interface for a reading device is one that disappears entirely."</blockquote>
      <p>Design constraints include: no animations, no hover effects, minimal filled backgrounds, and generous spacing.</p>
    </div>`,
};
