import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, waitFor } from 'storybook/test';
import { html } from 'lit';

const meta: Meta = {
  title: 'Navigation/Dropdown',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nLightweight menu that opens from a trigger button to expose secondary actions, filters, or sort options. Closes on outside click and Escape.',
      },
    },
  },
  argTypes: {
    align: { control: 'select', options: ['left', 'right'] },
  },
  render: (args) => html`
    <div style="padding:16px">
      <e-dropdown align=${args.align}>
        <e-button slot="trigger" variant="secondary">Options ▾</e-button>
        <e-dropdown-item header="Document" />
        <e-dropdown-item icon="pen" label="Edit" shortcut="⌘E" />
        <e-dropdown-item icon="copy" label="Duplicate" shortcut="⌘D" />
        <e-dropdown-item divider />
        <e-dropdown-item icon="share" label="Share" />
        <e-dropdown-item divider />
        <e-dropdown-item icon="trash" label="Delete" disabled />
      </e-dropdown>
    </div>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { align: 'left' },
};

export const AlignRight: Story = {
  args: { align: 'right' },
  render: (args) => html`
    <div style="padding:16px;display:flex;justify-content:flex-end">
      <e-dropdown align=${args.align}>
        <e-button slot="trigger" variant="secondary">More ▾</e-button>
        <e-dropdown-item icon="eye" label="View" />
        <e-dropdown-item icon="edit" label="Edit" />
        <e-dropdown-item divider />
        <e-dropdown-item icon="trash" label="Delete" />
      </e-dropdown>
    </div>
  `,
};

export const IconsAndShortcuts: Story = {
  render: () => html`
    <div style="padding:16px">
      <e-dropdown>
        <e-button slot="trigger" variant="primary">File ▾</e-button>
        <e-dropdown-item header="File" />
        <e-dropdown-item icon="doc" label="New" shortcut="⌘N" />
        <e-dropdown-item icon="folder" label="Open" shortcut="⌘O" />
        <e-dropdown-item icon="copy" label="Save As" shortcut="⇧⌘S" />
        <e-dropdown-item divider />
        <e-dropdown-item icon="upload" label="Export" />
        <e-dropdown-item icon="download" label="Import" />
      </e-dropdown>
    </div>
  `,
};

export const Interactions: Story = {
  args: { align: 'left' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-dropdown')).toBeTruthy();
    });
    const dd = canvasElement.querySelector('e-dropdown') as HTMLElement;
    const menu = dd.querySelector<HTMLElement>('.ink-dropdown__menu')!;
    const triggerWrap = dd.querySelector<HTMLElement>('[data-trigger]')!;
    expect(menu.hidden).toBe(true);
    await userEvent.click(triggerWrap);
    expect(menu.hidden).toBe(false);

    const events: number[] = [];
    dd.addEventListener('e-select', (e: Event) => {
      events.push((e as CustomEvent).detail.index);
    });

    const items = [...menu.querySelectorAll<HTMLButtonElement>('.ink-dropdown__item')];
    const firstEnabled = items.find((it) => !it.disabled)!;
    await userEvent.click(firstEnabled);
    expect(events).toHaveLength(1);
    expect(menu.hidden).toBe(true);

    await userEvent.click(triggerWrap);
    const disabled = menu.querySelector<HTMLButtonElement>('.ink-dropdown__item[disabled]')!;
    await userEvent.click(disabled);
    expect(events).toHaveLength(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu.hidden).toBe(true);

    await userEvent.click(triggerWrap);
    expect(menu.hidden).toBe(false);
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(menu.hidden).toBe(true);
  },
};

export const KeyboardNavigation: Story = {
  args: { align: 'left' },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-dropdown')).toBeTruthy();
    });
    const dd = canvasElement.querySelector('e-dropdown') as HTMLElement;
    const menu = dd.querySelector<HTMLElement>('.ink-dropdown__menu')!;
    const triggerBtn = dd.querySelector<HTMLElement>(
      '[data-trigger] button, [data-trigger] [role="button"]',
    )!;

    // ArrowDown on trigger opens menu and focuses first enabled item.
    triggerBtn.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(menu.hidden).toBe(false);
    const enabled = [...menu.querySelectorAll<HTMLButtonElement>('.ink-dropdown__item')].filter(
      (b) => !b.disabled,
    );
    expect(document.activeElement).toBe(enabled[0]);

    // ArrowDown moves to next enabled item, skipping disabled.
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(enabled[1]);

    // End jumps to last enabled.
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(enabled[enabled.length - 1]);

    // Home jumps to first enabled.
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(enabled[0]);

    // Escape closes and returns focus to trigger.
    await userEvent.keyboard('{Escape}');
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(triggerBtn);
  },
};
