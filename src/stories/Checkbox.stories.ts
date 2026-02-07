import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Components/Checkbox",
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => `
    <div class="epaper-field eink-field--inline">
      <input type="checkbox" class="epaper-checkbox" id="sb-check-default">
      <label for="sb-check-default">Unchecked</label>
    </div>`,
};

export const Checked: Story = {
  render: () => `
    <div class="epaper-field eink-field--inline">
      <input type="checkbox" class="epaper-checkbox" id="sb-check-on" checked>
      <label for="sb-check-on">Checked</label>
    </div>`,
};

export const Disabled: Story = {
  render: () => `
    <div class="epaper-stack eink-stack--sm">
      <div class="epaper-field eink-field--inline">
        <input type="checkbox" class="epaper-checkbox" id="sb-check-dis" disabled>
        <label for="sb-check-dis">Disabled</label>
      </div>
      <div class="epaper-field eink-field--inline">
        <input type="checkbox" class="epaper-checkbox" id="sb-check-dis-on" disabled checked>
        <label for="sb-check-dis-on">Disabled &amp; checked</label>
      </div>
    </div>`,
};

export const Group: Story = {
  render: () => `
    <fieldset style="border:none;padding:0">
      <legend class="epaper-label" style="margin-bottom:var(--epaper-space-2)">Notifications</legend>
      <div class="epaper-stack eink-stack--sm">
        <div class="epaper-field eink-field--inline">
          <input type="checkbox" class="epaper-checkbox" id="sb-n-email" checked>
          <label for="sb-n-email">Email</label>
        </div>
        <div class="epaper-field eink-field--inline">
          <input type="checkbox" class="epaper-checkbox" id="sb-n-sms">
          <label for="sb-n-sms">SMS</label>
        </div>
        <div class="epaper-field eink-field--inline">
          <input type="checkbox" class="epaper-checkbox" id="sb-n-push" disabled>
          <label for="sb-n-push">Push (unavailable)</label>
        </div>
      </div>
    </fieldset>`,
};
