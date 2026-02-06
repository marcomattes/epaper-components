import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Components/Dialog",
};

export default meta;
type Story = StoryObj;

export const Confirmation: Story = {
  render: () => `
    <dialog class="eink-dialog" open style="position:relative" aria-labelledby="story-confirm-title">
      <div class="eink-dialog__title" id="story-confirm-title">Confirm deletion</div>
      <div class="eink-dialog__body">
        <p>Are you sure you want to delete this item? This action cannot be undone.</p>
      </div>
      <div class="eink-dialog__actions">
        <button class="eink-btn eink-btn--ghost">Cancel</button>
        <button class="eink-btn eink-btn--primary">Delete</button>
      </div>
    </dialog>`,
};

export const WithForm: Story = {
  render: () => `
    <dialog class="eink-dialog" open style="position:relative" aria-labelledby="story-form-title">
      <div class="eink-dialog__title" id="story-form-title">Add a note</div>
      <div class="eink-dialog__body">
        <div class="eink-stack eink-stack--sm">
          <div class="eink-field">
            <label class="eink-label">Title</label>
            <input type="text" class="eink-input" placeholder="Note title">
          </div>
          <div class="eink-field">
            <label class="eink-label">Content</label>
            <textarea class="eink-textarea" placeholder="Write here" style="min-height:4rem"></textarea>
          </div>
        </div>
      </div>
      <div class="eink-dialog__actions">
        <button class="eink-btn eink-btn--ghost">Cancel</button>
        <button class="eink-btn eink-btn--primary">Save</button>
      </div>
    </dialog>`,
};

export const Scrollable: Story = {
  render: () => `
    <dialog class="eink-dialog" open style="position:relative;max-height:16rem;display:flex;flex-direction:column" aria-labelledby="story-scroll-title">
      <div class="eink-dialog__title" id="story-scroll-title" style="flex-shrink:0">Terms of service</div>
      <div class="eink-dialog__body" style="overflow-y:auto;flex:1">
        <div class="eink-prose">
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
          <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
          <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
        </div>
      </div>
      <div class="eink-dialog__actions" style="flex-shrink:0">
        <button class="eink-btn eink-btn--ghost">Decline</button>
        <button class="eink-btn eink-btn--primary">Accept</button>
      </div>
    </dialog>`,
};
