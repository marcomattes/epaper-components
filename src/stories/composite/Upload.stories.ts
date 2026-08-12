import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, waitFor, within } from 'storybook/test';
import { html } from 'lit';
import { checkA11y } from '../a11y';

const meta: Meta = {
  title: 'Composite/Upload',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'File upload control with both click-to-browse and drag-and-drop targets, plus an inline file list. Restrict file types via the `accept` attribute and toggle `multiple` for batch uploads.',
      },
    },
  },
  argTypes: {
    accept: { control: 'text', description: 'Accepted MIME types (e.g. image/*)' },
    multiple: { control: 'boolean', description: 'Allow multiple file selection' },
  },
  render: (args) => html`
    <e-upload accept=${args.accept || ''} ?multiple=${args.multiple}></e-upload>
  `,
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: { accept: '', multiple: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const upload = canvasElement.querySelector('e-upload');
    expect(upload).toBeInTheDocument();
    const input = upload!.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
  },
};

export const ImagesOnly: Story = {
  args: { accept: 'image/*', multiple: false },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const input = canvasElement.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input?.accept).toBe('image/*');
  },
};

export const MultipleFiles: Story = {
  args: { accept: '', multiple: true },
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const input = canvasElement.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input?.multiple).toBe(true);
  },
};

export const Interactions: Story = {
  args: { accept: '', multiple: true },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('.ink-upload')).toBeTruthy();
    });
    const upload = canvasElement.querySelector('e-upload') as HTMLElement;
    const drop = upload.querySelector('.ink-upload') as HTMLElement;
    const list = upload.querySelector('.ink-upload__list') as HTMLElement;

    drop.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true }));
    expect(drop.dataset['drag']).toBe('true');
    drop.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }));
    expect(drop.dataset['drag']).toBe('false');

    const file1 = new File(['hello'], 'a.txt', { type: 'text/plain' });
    const file2 = new File(['world world'], 'b.txt', { type: 'text/plain' });
    const dt = new DataTransfer();
    dt.items.add(file1);
    dt.items.add(file2);
    drop.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }),
    );

    await waitFor(() => {
      expect(list.querySelectorAll('.ink-upload__file')).toHaveLength(2);
    });

    const removeBtn = list.querySelector<HTMLElement>('[data-remove="0"]');
    expect(removeBtn).toBeTruthy();
    removeBtn!.click();
    await waitFor(() => {
      expect(list.querySelectorAll('.ink-upload__file')).toHaveLength(1);
    });

    const lastRemove = list.querySelector<HTMLElement>('[data-remove="0"]');
    lastRemove!.click();
    await waitFor(() => {
      expect(list.hidden).toBe(true);
    });

    const input = upload.querySelector('input[type="file"]') as HTMLInputElement;
    const dt2 = new DataTransfer();
    dt2.items.add(new File(['c'], 'c.txt', { type: 'text/plain' }));
    Object.defineProperty(input, 'files', { value: dt2.files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => {
      expect(list.querySelectorAll('.ink-upload__file')).toHaveLength(1);
    });
  },
  render: () => html`<e-upload multiple></e-upload>`,
};

export const InForm: Story = {
  play: async ({ canvasElement }) => {
    await checkA11y(canvasElement);
    const canvas = within(canvasElement);
    expect(canvas.getByText('Profile photo')).toBeInTheDocument();
    expect(canvas.getByText('Attachments')).toBeInTheDocument();
  },
  render: () => html`
    <e-form style="max-width:480px">
      <e-form-item label="Profile photo">
        <e-upload accept="image/*"></e-upload>
      </e-form-item>
      <e-form-item label="Attachments">
        <e-upload multiple></e-upload>
      </e-form-item>
      <e-form-item label="">
        <e-button variant="primary">Upload</e-button>
      </e-form-item>
    </e-form>
  `,
};
