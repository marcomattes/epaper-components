import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const ICON_NAMES = [
  'plus',
  'minus',
  'check',
  'close',
  'search',
  'arrowR',
  'arrowL',
  'arrowD',
  'arrowU',
  'chevR',
  'chevL',
  'chevD',
  'chevU',
  'pen',
  'trash',
  'bookmark',
  'star',
  'heart',
  'home',
  'doc',
  'folder',
  'bell',
  'cog',
  'sun',
  'moon',
  'upload',
  'download',
  'refresh',
  'more',
  'menu',
  'filter',
  'battery',
  'wifi',
  'link',
  'share',
  'eye',
  'lock',
  'user',
  'copy',
  'edit',
  'flip',
] as const;

const meta: Meta = {
  title: 'Primitives/Icon',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '**Version:** v1.0.1\n\nMonochrome line icon rendered as inline SVG from the built-in icon set. Sized in pixels (default 20) and styled with the current ink color. Provide a `label` whenever the icon is the only thing conveying meaning.',
      },
    },
  },
  argTypes: {
    name: { control: 'select', options: ICON_NAMES, description: 'Icon name' },
    size: { control: 'number', description: 'Size in px (default 20)' },
    label: { control: 'text', description: 'Accessible label' },
  },
  render: (args) => html`
    <e-icon name=${args.name} size=${args.size} label=${args.label || ''}></e-icon>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { name: 'star', size: 24, label: '' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const svg = canvasElement.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('role')).toBe('presentation');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  },
};

export const Small: Story = {
  args: { name: 'check', size: 16, label: 'Checked' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    const icon = canvas.getByRole('img', { name: 'Checked' });
    expect(icon).toBeInTheDocument();
  },
};

export const Large: Story = {
  args: { name: 'bell', size: 40, label: '' },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const eIcon = canvasElement.querySelector('e-icon');
    expect(eIcon).toBeInTheDocument();
    const svg = eIcon!.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg!.getAttribute('width')).toBe('40');
  },
};

export const AllIcons: Story = {
  render: () => html`
    <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center">
      ${ICON_NAMES.map(
        (n) => html`
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:56px">
            <e-icon name=${n} size="22"></e-icon>
            <span style="font-size:10px;color:#666;text-align:center">${n}</span>
          </div>
        `,
      )}
    </div>
  `,
};

export const AttributeChanges: Story = {
  args: { name: 'star', size: 20, label: '' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('e-icon') as HTMLElement;
    expect(el.querySelector('svg')).toBeInTheDocument();
    el.setAttribute('name', 'bell');
    expect(el.querySelector('svg')).toBeInTheDocument();
    el.setAttribute('size', '40');
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('40');
    el.setAttribute('label', 'Notify');
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('Notify');
    el.setAttribute('name', 'definitely-not-a-real-icon');
    expect(el.querySelector('svg')).toBeNull();
    el.removeAttribute('name');
    expect(el.innerHTML).toBe('');
  },
};
