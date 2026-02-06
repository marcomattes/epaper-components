import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Components/Radio",
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => `
    <fieldset style="border:none;padding:0">
      <legend class="eink-label" style="margin-bottom:var(--eink-space-2)">Size</legend>
      <div class="eink-stack eink-stack--sm">
        <div class="eink-field eink-field--inline">
          <input type="radio" class="eink-radio" name="sb-size" id="sb-r-sm" value="sm">
          <label for="sb-r-sm">Small</label>
        </div>
        <div class="eink-field eink-field--inline">
          <input type="radio" class="eink-radio" name="sb-size" id="sb-r-md" value="md" checked>
          <label for="sb-r-md">Medium</label>
        </div>
        <div class="eink-field eink-field--inline">
          <input type="radio" class="eink-radio" name="sb-size" id="sb-r-lg" value="lg">
          <label for="sb-r-lg">Large</label>
        </div>
      </div>
    </fieldset>`,
};

export const WithDisabled: Story = {
  render: () => `
    <fieldset style="border:none;padding:0">
      <legend class="eink-label" style="margin-bottom:var(--eink-space-2)">Plan</legend>
      <div class="eink-stack eink-stack--sm">
        <div class="eink-field eink-field--inline">
          <input type="radio" class="eink-radio" name="sb-plan" id="sb-p-free" value="free" checked>
          <label for="sb-p-free">Free</label>
        </div>
        <div class="eink-field eink-field--inline">
          <input type="radio" class="eink-radio" name="sb-plan" id="sb-p-pro" value="pro">
          <label for="sb-p-pro">Pro</label>
        </div>
        <div class="eink-field eink-field--inline">
          <input type="radio" class="eink-radio" name="sb-plan" id="sb-p-ent" value="ent" disabled>
          <label for="sb-p-ent">Enterprise (disabled)</label>
        </div>
      </div>
    </fieldset>`,
};
