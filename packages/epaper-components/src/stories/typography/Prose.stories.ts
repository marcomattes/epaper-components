import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Typography/Prose',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v2.0.0',
      description: {
        component:
          'Typographic container for document bodies. Slotted `<h2>`, `<p>`, `<ul>`/`<ol>`, `<blockquote>`, `<figure>` and `<table>` markup is styled through child selectors — the component itself renders nothing.',
      },
    },
  },
  render: () => html`
    <e-prose style="display:block;max-width:620px">
      <h2>Background</h2>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
        labore et dolore magna aliqua.
      </p>
      <ul>
        <li>First point</li>
        <li>Second point</li>
      </ul>
      <blockquote>A quoted remark worth setting apart from the body.</blockquote>
      <h2>Figures</h2>
      <figure>
        <img
          src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='120'><rect width='300' height='120' fill='%23fff' stroke='%23000' stroke-width='2'/></svg>"
          alt="Placeholder"
        />
        <figcaption>Fig. 1 — Placeholder</figcaption>
      </figure>
      <table>
        <thead>
          <tr>
            <th>Quarter</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Q1</td>
            <td>On target</td>
          </tr>
          <tr>
            <td>Q2</td>
            <td>Above target</td>
          </tr>
        </tbody>
      </table>
    </e-prose>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByRole('heading', { level: 2, name: 'Background' })).toBeInTheDocument();
    expect(canvasElement.querySelector('e-prose')!.classList.contains('ink-prose')).toBe(true);
    expect(canvasElement.querySelector('table')).toBeInTheDocument();
  },
};
