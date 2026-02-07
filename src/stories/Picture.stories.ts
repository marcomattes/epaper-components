import type { Meta, StoryObj } from "@storybook/html";

const placeholder = (w: number, h: number, text: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' fill='%23e5e5e5'%3E%3Crect width='${w}' height='${h}'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23737373' font-family='sans-serif' font-size='16'%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;

const meta: Meta = {
  title: "Components/Picture",
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => `
    <figure class="epaper-picture" style="max-width:24rem">
      <img src="${placeholder(400, 250, "400 × 250")}" alt="Placeholder image" width="400" height="250">
      <figcaption>Figure 1 — A placeholder image with caption.</figcaption>
    </figure>`,
};

export const Grid: Story = {
  render: () => `
    <div class="epaper-grid" style="--epaper-grid-min:14rem">
      <figure class="epaper-picture">
        <img src="${placeholder(400, 250, "Photo A")}" alt="Photo A" width="400" height="250">
        <figcaption>Photo A — Landscape</figcaption>
      </figure>
      <figure class="epaper-picture">
        <img src="${placeholder(400, 250, "Photo B")}" alt="Photo B" width="400" height="250">
        <figcaption>Photo B — On E-Ink, dithered to 16 grays</figcaption>
      </figure>
    </div>`,
};
