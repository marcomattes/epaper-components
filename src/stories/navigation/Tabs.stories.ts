import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, userEvent } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Navigation/Tabs',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Switcher between sibling content panes with an underline-style active indicator. Implements WAI-ARIA tabs pattern with full keyboard support (← → Home End).',
      },
    },
  },
  argTypes: {
    defaultValue: { control: 'text', description: 'Initially active tab key' },
  },
  render: (args) => html`
    <e-tabs default-value=${args.defaultValue || 'overview'}>
      <e-tab key="overview" label="Overview">
        <div style="padding:16px">Overview panel content.</div>
      </e-tab>
      <e-tab key="details" label="Details">
        <div style="padding:16px">Detailed information panel.</div>
      </e-tab>
      <e-tab key="history" label="History" icon="refresh">
        <div style="padding:16px">Change history panel.</div>
      </e-tab>
    </e-tabs>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { defaultValue: 'overview' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const tabs = canvas.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    const overview = tabs.find((t) => (t as HTMLElement).dataset['key'] === 'overview')!;
    expect(overview.getAttribute('aria-selected')).toBe('true');
    expect(canvasElement.querySelector('[role="tabpanel"]:not([hidden])')?.textContent).toContain(
      'Overview panel content',
    );

    const tabsHost = canvasElement.querySelector('e-tabs') as HTMLElement;
    let captured: string | null = null;
    tabsHost.addEventListener(
      'e-change',
      (e) => {
        captured = (e as CustomEvent).detail.value;
      },
      { once: true },
    );
    const details = tabs.find(
      (t) => (t as HTMLElement).dataset['key'] === 'details',
    )! as HTMLElement;
    await userEvent.click(details);
    expect(captured).toBe('details');
    expect(canvasElement.querySelector('[role="tabpanel"]:not([hidden])')?.textContent).toContain(
      'Detailed information panel',
    );
    const newSelected = canvasElement.querySelector(
      '[role="tab"][aria-selected="true"]',
    ) as HTMLElement;
    expect(newSelected.dataset['key']).toBe('details');
  },
};

export const WithIcons: Story = {
  render: () => html`
    <e-tabs default-value="files">
      <e-tab key="files" label="Files" icon="folder">
        <div style="padding:16px">File browser content.</div>
      </e-tab>
      <e-tab key="code" label="Code" icon="doc">
        <div style="padding:16px">Code editor content.</div>
      </e-tab>
      <e-tab key="settings" label="Settings" icon="cog">
        <div style="padding:16px">Settings panel.</div>
      </e-tab>
    </e-tabs>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getAllByRole('tab')).toHaveLength(3);
    const selected = canvasElement.querySelector(
      '[role="tab"][aria-selected="true"]',
    ) as HTMLElement;
    expect(selected.dataset['key']).toBe('files');
  },
};

export const WithCount: Story = {
  render: () => html`
    <e-tabs default-value="open">
      <e-tab key="open" label="Open" count="8">
        <div style="padding:16px">8 open issues.</div>
      </e-tab>
      <e-tab key="closed" label="Closed" count="24">
        <div style="padding:16px">24 closed issues.</div>
      </e-tab>
    </e-tabs>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const tabs = canvas.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].textContent).toContain('8');
    expect(tabs[1].textContent).toContain('24');
  },
};
