import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Display/Timeline',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Vertical event list with a hairline rail and bullet markers. Use for activity feeds, audit logs or order tracking. Static layout — no animations.',
      },
    },
  },
  argTypes: {
    timePosition: { control: 'inline-radio', options: ['left', 'right'] },
  },
  render: (args) => html`
    <e-timeline time-position=${args.timePosition || 'left'}>
      <e-timeline-item time="08:30" title="Stand-up" variant="done">Daily sync.</e-timeline-item>
      <e-timeline-item time="11:00" title="Review" variant="done"
        >Approved release notes.</e-timeline-item
      >
      <e-timeline-item time="14:00" title="Deploy" variant="default"
        >Pushed v1.4.0.</e-timeline-item
      >
      <e-timeline-item time="17:30" title="Postmortem" variant="pending"
        >Pending writeup.</e-timeline-item
      >
    </e-timeline>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { timePosition: 'left' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Stand-up')).toBeInTheDocument();
    expect(canvas.getByText('Postmortem')).toBeInTheDocument();
  },
};

export const TimeOnRight: Story = {
  args: { timePosition: 'right' },
};

export const Minimal: Story = {
  render: () => html`
    <e-timeline>
      <e-timeline-item title="Created"></e-timeline-item>
      <e-timeline-item title="Submitted"></e-timeline-item>
      <e-timeline-item title="Published"></e-timeline-item>
    </e-timeline>
  `,
};
