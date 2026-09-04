import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, waitFor, within } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Navigation/Toc',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v2.0.0',
      description: {
        component:
          "Auto-generated table of contents. Scans a document's headings and mirrors them into an `<e-anchor>` it builds itself — no hand-written `<e-anchor-item>` list required.",
      },
    },
  },
  render: () => html`
    <div style="display:flex;gap:32px">
      <e-toc for="toc-article" min-level="2" max-level="3"></e-toc>
      <article id="toc-article" style="flex:1">
        <h2 style="padding:16px;margin-bottom:16px;border:2px solid #000">Introduction</h2>
        <h2 style="padding:16px;margin-bottom:16px;border:2px solid #000">Getting Started</h2>
        <h3 style="padding:16px;margin-bottom:16px;margin-left:24px;border:1px solid #000">
          Installation
        </h3>
        <h3 style="padding:16px;margin-bottom:16px;margin-left:24px;border:1px solid #000">
          Configuration
        </h3>
        <h2 style="padding:16px;margin-bottom:16px;border:2px solid #000">API Reference</h2>
      </article>
    </div>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvasElement.querySelectorAll('e-anchor-item')).toHaveLength(5);
    });
    const heading = canvas.getByRole('heading', { level: 2, name: 'Introduction' });
    expect(heading.id).toBe('introduction');
    const items = canvasElement.querySelectorAll('e-anchor-item');
    expect(items[0]!.getAttribute('href')).toBe('#introduction');
    expect(items[2]!.getAttribute('depth')).toBe('1');
  },
};

export const ReactsToNewHeadings: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelectorAll('e-anchor-item')).toHaveLength(5);
    });
    const article = canvasElement.querySelector('#toc-article')!;
    const h2 = document.createElement('h2');
    h2.textContent = 'Changelog';
    article.appendChild(h2);
    await waitFor(() => {
      expect(canvasElement.querySelectorAll('e-anchor-item')).toHaveLength(6);
    });
    expect(h2.id).toBe('changelog');
  },
};
