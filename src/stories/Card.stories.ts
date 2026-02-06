import type { Meta, StoryObj } from "@storybook/html";

interface CardArgs {
  title: string;
  body: string;
  raised: boolean;
  showFooter: boolean;
}

const meta: Meta<CardArgs> = {
  title: "Components/Card",
  argTypes: {
    title: { control: "text" },
    body: { control: "text" },
    raised: { control: "boolean" },
    showFooter: { control: "boolean" },
  },
  render: (args) => {
    const cls = args.raised ? "eink-card eink-card--raised" : "eink-card";
    const footer = args.showFooter
      ? `<div class="eink-card__footer"><button class="eink-btn eink-btn--sm eink-btn--secondary">Action</button></div>`
      : "";
    return `
      <div class="${cls}" style="max-width:24rem">
        <div class="eink-card__title">${args.title}</div>
        <div class="eink-card__body"><p>${args.body}</p></div>
        ${footer}
      </div>`;
  },
};

export default meta;
type Story = StoryObj<CardArgs>;

export const Default: Story = {
  args: {
    title: "Card title",
    body: "Card body content with a short description.",
    raised: false,
    showFooter: false,
  },
};

export const Raised: Story = {
  args: {
    title: "Raised card",
    body: "Emphasis card with heavier border weight.",
    raised: true,
    showFooter: false,
  },
};

export const WithFooter: Story = {
  args: {
    title: "Card with footer",
    body: "This card includes a footer with an action button.",
    raised: false,
    showFooter: true,
  },
};

export const Grid: Story = {
  render: () => `
    <div class="eink-grid" style="--eink-grid-min:14rem">
      <div class="eink-card">
        <div class="eink-card__title">First</div>
        <div class="eink-card__body"><p>Content for the first card.</p></div>
      </div>
      <div class="eink-card eink-card--raised">
        <div class="eink-card__title">Second</div>
        <div class="eink-card__body"><p>Content for the raised card.</p></div>
      </div>
      <div class="eink-card">
        <div class="eink-card__title">Third</div>
        <div class="eink-card__body"><p>Content for the third card.</p></div>
        <div class="eink-card__footer"><span class="eink-text-xs eink-text-muted">Footer</span></div>
      </div>
    </div>`,
};
