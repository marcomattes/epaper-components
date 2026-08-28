import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, fn, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const COLS = JSON.stringify([
  { key: 'name', title: 'Name', sortable: true },
  { key: 'role', title: 'Role', sortable: true },
  { key: 'team', title: 'Team' },
]);
const ROWS = JSON.stringify([
  { name: 'Anna König', role: 'Editor', team: 'Docs' },
  { name: 'Ben Müller', role: 'Admin', team: 'Ops' },
  { name: 'Clara Hahn', role: 'Reviewer', team: 'Docs' },
  { name: 'David Eich', role: 'Editor', team: 'Eng' },
]);

const meta: Meta = {
  title: 'Display/Table',
  tags: ['autodocs'],
  parameters: {
    docs: {
      subtitle: 'Since v1.0.1',
      description: {
        component:
          'Data grid with header, optional sort and row selection. Sort is **static**: clicking a header cycles `none → asc → desc → none` and emits `e-sort` — owners decide whether to re-sort or re-fetch.',
      },
    },
  },
  argTypes: {
    selectable: { control: 'boolean' },
  },
  render: (args) => html`
    <e-table columns=${COLS} data=${ROWS} ?selectable=${args.selectable}></e-table>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { selectable: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Anna König')).toBeInTheDocument();
    expect(canvasElement.querySelectorAll('tbody tr')).toHaveLength(4);
  },
};

export const Selectable: Story = {
  args: { selectable: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvasElement.querySelector('e-table')!;
    const onSelect = fn();
    table.addEventListener('e-select', onSelect);
    const cb = canvas.getByLabelText('Select row 2') as HTMLInputElement;
    cb.click();
    expect(onSelect).toHaveBeenCalledOnce();
    expect(table.getAttribute('selected')).toBe('1');
  },
};

export const SortInteraction: Story = {
  args: { selectable: false },
  play: async ({ canvasElement }) => {
    const table = canvasElement.querySelector('e-table')!;
    const onSort = fn();
    table.addEventListener('e-sort', onSort);
    const sortBtn = canvasElement.querySelector<HTMLButtonElement>('[data-sort-key="name"]')!;
    sortBtn.click();
    expect(table.getAttribute('sort')).toBe('name:asc');
    sortBtn.click();
    expect(table.getAttribute('sort')).toBe('name:desc');
    sortBtn.click();
    expect(table.getAttribute('sort')).toBeNull();
    expect(onSort).toHaveBeenCalledTimes(3);
  },
};

export const Empty: Story = {
  render: () => html` <e-table columns=${COLS} data="[]" empty-text="No people yet"></e-table> `,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('No people yet')).toBeInTheDocument();
  },
};
