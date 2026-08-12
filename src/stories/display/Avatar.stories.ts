import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Display/Avatar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'User or entity portrait. Falls back from image (`src`) to derived initials based on `name`. Supports any pixel size and either a `square` or `circle` shape.',
      },
    },
  },
  argTypes: {
    name: { control: 'text', description: 'Full name (used for initials)' },
    src: { control: 'text', description: 'Image URL (optional)' },
    size: { control: 'number', description: 'Size in px (default 40)' },
    shape: { control: 'select', options: ['square', 'circle'] },
  },
  render: (args) => html`
    <e-avatar
      name=${args.name || ''}
      src=${args.src || ''}
      size=${args.size || 40}
      shape=${args.shape || 'square'}
    ></e-avatar>
  `,
};
export default meta;

type Story = StoryObj;

export const Initials: Story = {
  args: { name: 'Marco Mattes', size: 40, shape: 'square' },
};

export const Circle: Story = {
  args: { name: 'Anna König', size: 48, shape: 'circle' },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display:flex;gap:12px;align-items:center">
      <e-avatar name="AB" size="24"></e-avatar>
      <e-avatar name="CD" size="32"></e-avatar>
      <e-avatar name="EF" size="40"></e-avatar>
      <e-avatar name="GH" size="56"></e-avatar>
      <e-avatar name="IJ" size="72"></e-avatar>
    </div>
  `,
};

export const Group: Story = {
  render: () => html`
    <e-avatar-group max="4" size="40">
      <e-avatar-item name="Alice Berger" />
      <e-avatar-item name="Bob Chen" />
      <e-avatar-item name="Clara Dorn" />
      <e-avatar-item name="David Eich" />
      <e-avatar-item name="Eva Fischer" />
      <e-avatar-item name="Frank Grun" />
    </e-avatar-group>
  `,
};
