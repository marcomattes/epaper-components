import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const BEFORE = `The tenant may sublet the unit with written consent from the landlord.

Rent is due on the first of each month.`;

const AFTER = `The tenant may not sublet the unit under any circumstances.

Rent is due on the first of each month.

A late fee of 5% applies after the third day.`;

const meta: Meta = {
  title: 'Display/Redline',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.3.0\n\nWord-level diff between two text versions, with `<ins>`/`<del>` markup, a changed-paragraph summary and a "changes only" view.',
      },
    },
  },
  argTypes: {
    before: { control: 'text' },
    after: { control: 'text' },
    label: { control: 'text' },
  },
  render: (args) => html`
    <e-redline
      label=${args.label || ''}
      before=${args.before ?? BEFORE}
      after=${args.after ?? AFTER}
      style="display:block;max-width:640px"
    ></e-redline>
  `,
};
export default meta;

type Story = StoryObj;

export const Changed: Story = {
  args: { label: 'Section 4', before: BEFORE, after: AFTER },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const redline = canvasElement.querySelector('e-redline')!;
    expect(redline.querySelectorAll('.ink-redline__row[data-changed="true"]')).toHaveLength(2);
    expect(redline.querySelector('ins')).toBeTruthy();
    expect(redline.querySelector('del')).toBeTruthy();
  },
};

export const Unchanged: Story = {
  args: { label: 'Identical text', before: 'No change here.', after: 'No change here.' },
  play: async ({ canvasElement }) => {
    const redline = canvasElement.querySelector('e-redline')!;
    expect(redline.querySelector('.ink-redline__summary')!.textContent).toContain('No changes');
  },
};

export const ChangesOnly: Story = {
  args: { label: 'Section 4', before: BEFORE, after: AFTER },
  play: async ({ canvasElement }) => {
    const redline = canvasElement.querySelector('e-redline')!;
    const toggle = redline.querySelector<HTMLButtonElement>('.ink-redline__toggle')!;
    toggle.click();
    expect(redline.hasAttribute('changes-only')).toBe(true);
    expect(redline.querySelectorAll('.ink-redline__row:not([hidden])')).toHaveLength(2);
  },
};
