import type { Meta, StoryObj } from '@storybook/web-components';
import { html, type TemplateResult } from 'lit';

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const sectionStyle = `
  .tk { font-family: var(--ink-sans); color: var(--ink-fg); max-width: 960px; }
  .tk h2 { font-size: var(--ink-text-h3); margin: 0 0 var(--ink-space-3); }
  .tk h3 { font-size: var(--ink-text-h5); margin: var(--ink-space-5) 0 var(--ink-space-2); }
  .tk p  { font-size: var(--ink-text-body); line-height: var(--ink-lh-body); margin: 0 0 var(--ink-space-4); }
  .tk code { font-family: var(--ink-mono); font-size: var(--ink-text-mono); }
  .tk hr { border: 0; border-top: var(--ink-border-hair); margin: var(--ink-space-6) 0; }
  .tk-row  { display: grid; align-items: center; column-gap: var(--ink-space-4); row-gap: var(--ink-space-2); }
  .tk-card { border: var(--ink-border); }
  .tk-card__meta { padding: var(--ink-space-2); font-family: var(--ink-mono); font-size: var(--ink-text-caption); }
  .tk-card__meta i { font-style: italic; opacity: 0.75; }
`;

const intro = (title: string, body: TemplateResult | string) => html`
  <style>
    ${sectionStyle}
  </style>
  <section class="tk">
    <h2>${title}</h2>
    <p>${body}</p>
  </section>
`;

/* ------------------------------------------------------------------ */
/* Meta                                                                */
/* ------------------------------------------------------------------ */

const meta: Meta = {
  title: 'Foundations/Design Tokens',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nSingle source of truth for the visual system. Every component reads from these CSS custom properties — never hard-coded values — so re-skinning the library is a matter of overriding tokens at the page or component level. The system is intentionally narrow: no light/dark theme, no semantic alias layer, only five accent colors.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

export const Typography: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Three font stacks (`--ink-sans`, `--ink-serif`, `--ink-mono`) and an absolute-pixel type scale calibrated for high-contrast e-paper rendering where sub-pixel scaling is unreliable.',
      },
    },
  },
  render: () => html`
    <style>
      ${sectionStyle} .tk-fonts {
        grid-template-columns: 180px 1fr;
      }
      .tk-scale {
        grid-template-columns: 200px 80px 1fr;
      }
      .tk-lh {
        grid-template-columns: 240px 1fr;
      }
    </style>
    <section class="tk">
      <h2>Typography</h2>
      <p>
        UI defaults to <code>--ink-sans</code>; long-form reading uses <code>--ink-serif</code>;
        code and numerics use <code>--ink-mono</code>.
      </p>

      <h3>Font stacks</h3>
      <div class="tk-row tk-fonts">
        <code>--ink-sans</code>
        <span style="font-family:var(--ink-sans);font-size:18px"
          >The quick brown fox jumps over the lazy dog</span
        >
        <code>--ink-serif</code>
        <span style="font-family:var(--ink-serif);font-size:18px"
          >The quick brown fox jumps over the lazy dog</span
        >
        <code>--ink-mono</code>
        <span style="font-family:var(--ink-mono);font-size:18px"
          >The quick brown fox jumps over the lazy dog</span
        >
      </div>

      <h3>Type scale</h3>
      <div class="tk-row tk-scale">
        <code>--ink-text-h1</code> <span>44px</span>
        <span style="font-size:var(--ink-text-h1);line-height:var(--ink-lh-tight)">Heading 1</span>
        <code>--ink-text-h2</code> <span>32px</span>
        <span style="font-size:var(--ink-text-h2);line-height:var(--ink-lh-tight)">Heading 2</span>
        <code>--ink-text-h3</code> <span>24px</span>
        <span style="font-size:var(--ink-text-h3);line-height:var(--ink-lh-tight)">Heading 3</span>
        <code>--ink-text-h4</code> <span>20px</span>
        <span style="font-size:var(--ink-text-h4);line-height:var(--ink-lh-tight)">Heading 4</span>
        <code>--ink-text-h5</code> <span>17px</span>
        <span style="font-size:var(--ink-text-h5);line-height:var(--ink-lh-tight)">Heading 5</span>
        <code>--ink-text-h6</code> <span>15px</span>
        <span style="font-size:var(--ink-text-h6);line-height:var(--ink-lh-tight)">Heading 6</span>
        <code>--ink-text-prose</code> <span>18px</span>
        <span
          style="font-size:var(--ink-text-prose);font-family:var(--ink-serif);line-height:var(--ink-lh-prose)"
          >Long-form prose</span
        >
        <code>--ink-text-body</code> <span>16px</span>
        <span style="font-size:var(--ink-text-body)">Default body copy</span>
        <code>--ink-text-mono</code> <span>14px</span>
        <span style="font-size:var(--ink-text-mono);font-family:var(--ink-mono)"
          >monospace_data_99</span
        >
        <code>--ink-text-small</code> <span>13px</span>
        <span style="font-size:var(--ink-text-small)">Small / hint copy</span>
        <code>--ink-text-caption</code> <span>12px</span>
        <span style="font-size:var(--ink-text-caption)">Caption text</span>
        <code>--ink-text-label</code> <span>11px</span>
        <span
          style="font-size:var(--ink-text-label);text-transform:uppercase;letter-spacing:var(--ink-tracking-label)"
          >Eyebrow label</span
        >
      </div>

      <h3>Line height &amp; tracking</h3>
      <div class="tk-row tk-lh">
        <code>--ink-lh-tight</code> <span>1.15</span> <code>--ink-lh-body</code> <span>1.55</span>
        <code>--ink-lh-prose</code> <span>1.6</span> <code>--ink-tracking-tight</code>
        <span>-0.015em</span> <code>--ink-tracking-mono</code> <span>0.16em</span>
        <code>--ink-tracking-label</code> <span>0.18em</span> <code>--ink-tracking-wide</code>
        <span>0.20em</span>
      </div>
    </section>
  `,
};

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

const swatch = (name: string, hex: string, role?: string) => html`
  <div class="tk-card">
    <div
      style="background:${hex};height:80px;${
        hex === '#fff' ? 'border-bottom:var(--ink-border)' : ''
      }"
    ></div>
    <div class="tk-card__meta">
      <div>${name}</div>
      <div style="opacity:0.7">${hex}</div>
      ${role ? html`<div style="margin-top:4px"><i>${role}</i></div>` : null}
    </div>
  </div>
`;

export const Color: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Neutrals are just full-ink black and paper-white plus inverted aliases. The Kaleido palette is the **only** source of fill color — each value is reserved for a single state, never for decoration.',
      },
    },
  },
  render: () => html`
    <style>
      ${sectionStyle} .tk-neutral {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--ink-space-4);
      }
      .tk-kal {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: var(--ink-space-4);
      }
    </style>
    <section class="tk">
      <h2>Color · Neutrals</h2>
      <p>
        Two values plus inverted aliases for surfaces that flip polarity (e.g. dark tooltips on a
        light page).
      </p>
      <div class="tk-neutral">
        ${swatch('--ink-fg', '#000')} ${swatch('--ink-bg', '#fff')}
        ${swatch('--ink-fg-inverted', '#fff')} ${swatch('--ink-bg-inverted', '#000')}
      </div>

      <h3>Kaleido</h3>
      <p>Used as flat fills with no gradients or transparency.</p>
      <div class="tk-kal">
        ${swatch('--kaleido-red', '#D11A1A', 'destructive / error')}
        ${swatch('--kaleido-orange', '#E26A1B', 'warning')}
        ${swatch('--kaleido-yellow', '#E8C81C', 'attention / pending')}
        ${swatch('--kaleido-green', '#1F8A3B', 'success / confirm')}
        ${swatch('--kaleido-blue', '#1E4FB8', 'link / info')}
      </div>
    </section>
  `,
};

/* ------------------------------------------------------------------ */
/* Borders & focus                                                     */
/* ------------------------------------------------------------------ */

export const BordersAndFocus: Story = {
  name: 'Borders & Focus',
  parameters: {
    docs: {
      description: {
        story:
          'Borders carry most of the visual weight in lieu of shadow or color. A single high-contrast focus ring is reused across every interactive control so it is unambiguous on monochrome displays.',
      },
    },
  },
  render: () => html`
    <style>
      ${sectionStyle} .tk-borders {
        grid-template-columns: 240px 1fr;
      }
      .tk-focus {
        grid-template-columns: 240px 1fr;
      }
    </style>
    <section class="tk">
      <h2>Borders</h2>
      <div class="tk-row tk-borders">
        <code>--ink-border-width</code>
        <div style="border:2px solid #000;height:36px"></div>
        <code>--ink-border-width-strong</code>
        <div style="border:4px solid #000;height:36px"></div>
        <code>--ink-border-width-hair</code>
        <div style="border:1px solid #000;height:36px"></div>
        <code>--ink-border-width-error</code>
        <div style="border:3px solid #000;height:36px"></div>
      </div>
      <p style="margin-top:var(--ink-space-4)">
        The composite shorthands <code>--ink-border</code>, <code>--ink-border-strong</code>, and
        <code>--ink-border-hair</code> bundle each width with <code>solid var(--ink-fg)</code>.
      </p>

      <hr />

      <h2>Focus</h2>
      <div class="tk-row tk-focus">
        <code>--ink-focus-width</code> <span>3px</span> <code>--ink-focus-offset</code>
        <span>2px</span>
      </div>
      <div style="margin-top:var(--ink-space-4)">
        <button
          style="font:inherit;padding:8px 16px;background:#fff;border:2px solid #000;outline:3px solid #000;outline-offset:2px"
        >
          Focused button
        </button>
      </div>
    </section>
  `,
};

/* ------------------------------------------------------------------ */
/* Spacing                                                             */
/* ------------------------------------------------------------------ */

const spaceRow = (name: string, px: number) => html`
  <div class="tk-row" style="grid-template-columns:160px 80px 1fr">
    <code>${name}</code>
    <span>${px}px</span>
    <div style="background:#000;height:12px;width:${px}px"></div>
  </div>
`;

export const Spacing: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '4px base scale used for padding, margin and gaps. Do not introduce intermediate values — pick the closest token.',
      },
    },
  },
  render: () => html`
    <style>
      ${sectionStyle}
    </style>
    <section class="tk">
      <h2>Spacing</h2>
      <div style="display:grid;row-gap:var(--ink-space-2)">
        ${spaceRow('--ink-space-1', 4)} ${spaceRow('--ink-space-2', 8)}
        ${spaceRow('--ink-space-3', 12)} ${spaceRow('--ink-space-4', 16)}
        ${spaceRow('--ink-space-5', 24)} ${spaceRow('--ink-space-6', 32)}
        ${spaceRow('--ink-space-7', 48)} ${spaceRow('--ink-space-8', 64)}
      </div>
    </section>
  `,
};

/* ------------------------------------------------------------------ */
/* Control sizes                                                       */
/* ------------------------------------------------------------------ */

export const ControlSizes: Story = {
  name: 'Control Sizes',
  parameters: {
    docs: {
      description: {
        story:
          'All interactive controls snap to one of three heights. The medium track meets the 44 px minimum hit-target recommended by WCAG.',
      },
    },
  },
  render: () => html`
    <style>
      ${sectionStyle} .tk-ctrl {
        grid-template-columns: 240px 1fr;
      }
    </style>
    <section class="tk">
      <h2>Control sizes</h2>
      <div class="tk-row tk-ctrl">
        <code>--ink-control-h-sm</code>
        <div
          style="border:var(--ink-border);height:36px;display:flex;align-items:center;padding:0 12px"
        >
          36px · sm
        </div>
        <code>--ink-control-h-md</code>
        <div
          style="border:var(--ink-border);height:44px;display:flex;align-items:center;padding:0 12px"
        >
          44px · md (default)
        </div>
        <code>--ink-control-h-lg</code>
        <div
          style="border:var(--ink-border);height:48px;display:flex;align-items:center;padding:0 12px"
        >
          48px · lg
        </div>
      </div>
    </section>
  `,
};

/* ------------------------------------------------------------------ */
/* Patterns                                                            */
/* ------------------------------------------------------------------ */

export const Patterns: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Diagonal hatch fills replace flat grays for disabled controls, error fields and decorative cover art on cards. They render predictably on e-paper without dithering artefacts.',
      },
    },
  },
  render: () => html`
    <style>
      ${sectionStyle} .tk-pat {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--ink-space-4);
      }
    </style>
    <section class="tk">
      <h2>Patterns</h2>
      <div class="tk-pat">
        <div class="tk-card">
          <div style="height:100px;background:var(--ink-hatch-disabled)"></div>
          <div class="tk-card__meta">--ink-hatch-disabled</div>
        </div>
        <div class="tk-card">
          <div style="height:100px;background:var(--ink-hatch-error)"></div>
          <div class="tk-card__meta">--ink-hatch-error</div>
        </div>
        <div class="tk-card">
          <div style="height:100px;background:var(--ink-hatch-cover)"></div>
          <div class="tk-card__meta">--ink-hatch-cover</div>
        </div>
      </div>
    </section>
  `,
};

/* ------------------------------------------------------------------ */
/* Overview (autodocs intro story)                                     */
/* ------------------------------------------------------------------ */

export const Overview: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Override any token at the page or component level — for example: `:root { --ink-fg: #111; --ink-bg: #fafafa; --ink-space-4: 18px; }`. See the dedicated stories below for typography, color, borders, focus, spacing, control sizes and patterns.',
      },
    },
  },
  render: () =>
    intro(
      'Design Tokens',
      html`Defined in <code>src/styles/tokens.css</code>. Every component reads from these custom
        properties — never hard-coded values. The stories in this section render every token in the
        system grouped by category.`,
    ),
};
