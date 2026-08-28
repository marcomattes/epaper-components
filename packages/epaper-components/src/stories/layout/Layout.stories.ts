import type { Meta, StoryObj } from '@storybook/web-components';
import { expect } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Layout/Layout',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Page chrome scaffold composed of optional `<e-header>`, `<e-sider>`, `<e-content>` and `<e-footer>` regions. Provides the top-level frame for application screens.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

const boxStyle = 'padding:16px;background:#000;color:#fff;font-size:13px';
const lightStyle = 'padding:16px;background:#f5f5f5;font-size:13px';

export const HeaderContentFooter: Story = {
  render: () => html`
    <e-layout style="min-height:300px">
      <e-layout-header><div style="${boxStyle}">Header</div></e-layout-header>
      <e-layout-content><div style="${lightStyle};min-height:140px">Content</div></e-layout-content>
      <e-layout-footer><div style="${boxStyle}">Footer</div></e-layout-footer>
    </e-layout>
  `,
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const root = canvasElement.querySelector('e-layout') as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root.classList.contains('ink-layout')).toBe(true);
    expect(canvasElement.querySelector('header.ink-layout__header')).toBeInTheDocument();
    expect(canvasElement.querySelector('main.ink-layout__content')).toBeInTheDocument();
    expect(canvasElement.querySelector('footer.ink-layout__footer')).toBeInTheDocument();
  },
};

export const WithSider: Story = {
  render: () => html`
    <e-layout has-sider style="min-height:300px">
      <e-layout-header><div style="${boxStyle}">Header</div></e-layout-header>
      <e-layout has-sider>
        <e-layout-sider width="200"
          ><div style="${boxStyle};min-height:200px">Sidebar</div></e-layout-sider
        >
        <e-layout-content
          ><div style="${lightStyle};min-height:200px">Main Content</div></e-layout-content
        >
      </e-layout>
      <e-layout-footer><div style="${boxStyle}">Footer</div></e-layout-footer>
    </e-layout>
  `,
  play: async ({ canvasElement }) => {
    const outers = canvasElement.querySelectorAll('e-layout.ink-layout--has-sider');
    expect(outers).toHaveLength(2);
    const sider = canvasElement.querySelector('aside.ink-layout__sider') as HTMLElement;
    expect(sider).toBeInTheDocument();
    expect(sider.style.width).toBe('200px');
  },
};

export const SiderRight: Story = {
  render: () => html`
    <e-layout has-sider style="min-height:300px">
      <e-layout-content
        ><div style="${lightStyle};min-height:200px">Content Area</div></e-layout-content
      >
      <e-layout-sider width="180"
        ><div style="${boxStyle};min-height:200px">Right Panel</div></e-layout-sider
      >
    </e-layout>
  `,
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('e-layout') as HTMLElement;
    expect(root.classList.contains('ink-layout--has-sider')).toBe(true);
    const sider = canvasElement.querySelector('aside.ink-layout__sider') as HTMLElement;
    expect(sider.style.width).toBe('180px');
    const siderHost = canvasElement.querySelector('e-layout-sider')!;
    const contentHost = canvasElement.querySelector('e-layout-content')!;
    expect(
      contentHost.compareDocumentPosition(siderHost) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
};

export const Reconnect: Story = {
  render: () => html`
    <e-layout style="min-height:120px">
      <e-layout-header><div style="${boxStyle}">H</div></e-layout-header>
      <e-layout-content><div style="${lightStyle}">C</div></e-layout-content>
      <e-layout-footer><div style="${boxStyle}">F</div></e-layout-footer>
    </e-layout>
  `,
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('e-layout') as HTMLElement;
    const parent = root.parentNode as HTMLElement;
    parent.removeChild(root);
    parent.appendChild(root);
    expect(root.querySelectorAll('header.ink-layout__header')).toHaveLength(1);
    expect(root.querySelectorAll('main.ink-layout__content')).toHaveLength(1);
    expect(root.querySelectorAll('footer.ink-layout__footer')).toHaveLength(1);
  },
};

export const SiderDefaultWidth: Story = {
  render: () => html`
    <e-layout has-sider style="min-height:120px">
      <e-layout-sider><div style="${boxStyle}">S</div></e-layout-sider>
      <e-layout-content><div style="${lightStyle}">C</div></e-layout-content>
    </e-layout>
  `,
  play: async ({ canvasElement }) => {
    const sider = canvasElement.querySelector('aside.ink-layout__sider') as HTMLElement;
    expect(sider.style.width).toBe('220px');
  },
};
