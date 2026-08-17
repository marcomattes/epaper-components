import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Navigation/Menu',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nNavigation container with vertical or horizontal layout. Items support icons, badges and one level of nested children. The active item is reflected through `aria-current="page"`.',
      },
    },
  },
  argTypes: {
    mode: { control: 'select', options: ['vertical', 'horizontal'] },
    value: { control: 'text', description: 'Active menu item value' },
  },
  render: (args) => html`
    <e-menu mode=${args.mode} value=${args.value || 'dashboard'}>
      <e-menu-item value="dashboard" icon="home" label="Dashboard"></e-menu-item>
      <e-menu-item value="docs" icon="doc" label="Documentation"></e-menu-item>
      <e-menu-item value="settings" icon="cog" label="Settings">
        <e-menu-item value="profile" label="Profile"></e-menu-item>
        <e-menu-item value="security" label="Security"></e-menu-item>
      </e-menu-item>
      <e-menu-item value="account" icon="user" label="Account" badge="3"></e-menu-item>
    </e-menu>
  `,
};
export default meta;

type Story = StoryObj;

export const Vertical: Story = {
  args: { mode: 'vertical', value: 'dashboard' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const menu = canvasElement.querySelector('e-menu') as HTMLElement;
    expect(menu).toBeInTheDocument();
    const ul = canvasElement.querySelector('ul.ink-menu') as HTMLElement;
    expect(ul.classList.contains('ink-menu--horizontal')).toBe(false);
    const topButtons = canvasElement.querySelectorAll('ul.ink-menu > li > .ink-menu__btn');
    expect(topButtons.length).toBe(4);
    const active = canvasElement.querySelector(
      '.ink-menu__btn[aria-current="page"]',
    ) as HTMLElement;
    expect(active.dataset['value']).toBe('dashboard');
  },
};

export const Horizontal: Story = {
  args: { mode: 'horizontal', value: 'docs' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const ul = canvasElement.querySelector('ul.ink-menu') as HTMLElement;
    expect(ul.classList.contains('ink-menu--horizontal')).toBe(true);
    const active = canvasElement.querySelector(
      '.ink-menu__btn[aria-current="page"]',
    ) as HTMLElement;
    expect(active.dataset['value']).toBe('docs');
  },
};

export const ClickToSelect: Story = {
  args: { mode: 'vertical', value: 'dashboard' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const menu = canvasElement.querySelector('e-menu') as HTMLElement;
    const docsBtn = canvasElement.querySelector(
      '.ink-menu__btn[data-value="docs"]',
    ) as HTMLButtonElement;
    expect(docsBtn).toBeInTheDocument();
    await userEvent.click(docsBtn);
    expect(menu.getAttribute('value')).toBe('docs');
    const active = canvasElement.querySelector(
      '.ink-menu__btn[aria-current="page"]',
    ) as HTMLElement;
    expect(active.dataset['value']).toBe('docs');
  },
};

export const WithBadge: Story = {
  render: () => html`
    <e-menu mode="vertical" value="inbox">
      <e-menu-item value="inbox" icon="bell" label="Inbox" badge="12"></e-menu-item>
      <e-menu-item value="drafts" icon="pen" label="Drafts"></e-menu-item>
      <e-menu-item value="sent" icon="arrowR" label="Sent"></e-menu-item>
      <e-menu-item value="trash" icon="trash" label="Trash"></e-menu-item>
    </e-menu>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const buttons = canvasElement.querySelectorAll('.ink-menu__btn');
    expect(buttons.length).toBe(4);
    expect(canvasElement.textContent).toContain('12');
    expect(canvasElement.textContent).toContain('Inbox');
  },
};

export const ExpandSubmenu: Story = {
  args: { mode: 'vertical', value: 'dashboard' },
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('e-menu') as HTMLElement;
    const subList = () =>
      menu
        .querySelector('.ink-menu__btn[data-value="settings"]')!
        .parentElement!.querySelector<HTMLElement>(':scope > ul')!;
    // Submenu items live in the DOM from the start but the wrapping <ul> is `hidden`.
    expect(subList().hidden).toBe(true);
    expect(menu.querySelector('.ink-menu__btn[data-value="profile"]')).not.toBeNull();
    (menu.querySelector('.ink-menu__btn[data-value="settings"]') as HTMLElement).click();
    expect(subList().hidden).toBe(false);
    (menu.querySelector('.ink-menu__btn[data-value="profile"]') as HTMLElement).click();
    expect(menu.getAttribute('value')).toBe('profile');
    // Activating a leaf inside the group keeps it open via _openAncestorsOf.
    expect(subList().hidden).toBe(false);
    (menu.querySelector('.ink-menu__btn[data-value="settings"]') as HTMLElement).click();
    expect(subList().hidden).toBe(true);
  },
};

export const KeyboardNavigation: Story = {
  args: { mode: 'vertical', value: 'dashboard' },
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('e-menu') as HTMLElement;
    const btn = (v: string) =>
      menu.querySelector<HTMLButtonElement>(`.ink-menu__btn[data-value="${v}"]`)!;

    // ArrowDown traverses top-level items.
    btn('dashboard').focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(btn('docs'));
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(btn('settings'));

    // ArrowRight on a parent expands it.
    const subList = btn('settings').parentElement!.querySelector<HTMLElement>(':scope > ul')!;
    expect(subList.hidden).toBe(true);
    await userEvent.keyboard('{ArrowRight}');
    expect(subList.hidden).toBe(false);

    // ArrowRight again moves into first child.
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(btn('profile'));

    // ArrowDown moves to next visible child.
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(btn('security'));

    // ArrowLeft on a child moves focus back to parent.
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(btn('settings'));

    // ArrowLeft on an open parent collapses it.
    await userEvent.keyboard('{ArrowLeft}');
    expect(subList.hidden).toBe(true);

    // End jumps to last visible button.
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(btn('account'));

    // Home jumps to first.
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(btn('dashboard'));
  },
};
