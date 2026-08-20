// The comparison drawer: up to three titles side by side in a modal.
//
// `<e-table>` reads its columns and rows from two JSON attributes and both are
// reactive, so a title joining or leaving the comparison is a single attribute
// write rather than a rebuilt table.

import {
  AVAILABILITY_LABELS,
  bookById,
  CATEGORY_LABELS,
  FORMAT_LABELS,
  LANGUAGE_LABELS,
  listPrice,
  publisherName,
  type Book,
} from './books';
import { announce } from './announce';
import { div, h, onDetail, setAttr, t } from './dom';
import { deliveryNote } from './ui';
import { eur, longDate } from './format';
import { clearComparison, MAX_COMPARISON, state } from './state';

interface ComparisonRow {
  attribute: string;
  read: (book: Book) => string;
}

const ROWS: ComparisonRow[] = [
  { attribute: 'Author', read: (book) => book.author },
  { attribute: 'Publisher', read: (book) => publisherName(book) },
  { attribute: 'Shelf', read: (book) => CATEGORY_LABELS[book.category] },
  { attribute: 'Published', read: (book) => longDate(book.published) },
  { attribute: 'Pages', read: (book) => String(book.pages) },
  { attribute: 'Language', read: (book) => LANGUAGE_LABELS[book.language] },
  {
    attribute: 'Formats',
    read: (book) => book.formats.map((option) => FORMAT_LABELS[option.id]).join(', '),
  },
  { attribute: 'Rating', read: (book) => `${book.rating.toFixed(1)} / 5 (${book.reviews})` },
  { attribute: 'Availability', read: (book) => AVAILABILITY_LABELS[book.availability] },
  { attribute: 'Delivery', read: (book) => deliveryNote(book) },
  { attribute: 'Price', read: (book) => eur(listPrice(book)) },
];

let dialog: HTMLElement | null = null;
let table: HTMLElement | null = null;
let empty: HTMLElement | null = null;
let clearButton: HTMLElement | null = null;

/** Build the comparison dialog. Mounted once by the shell. */
export function createComparisonDialog(): HTMLElement {
  table = h('e-table', { columns: '[]', data: '[]', 'empty-text': 'Nothing to compare yet' });
  empty = h('e-empty', {
    icon: 'copy',
    title: 'No titles selected',
    description: `Use "Compare" on any product card to line up to ${MAX_COMPARISON} titles here.`,
  });

  clearButton = t('e-button', { slot: 'footer', variant: 'destructive' }, 'Clear comparison');
  const closeButton = t('e-button', { slot: 'footer', 'data-close': '' }, 'Close');

  const root = h('e-dialog', { heading: 'Compare titles', size: 'large', class: 'shop-compare' }, [
    t(
      'e-text',
      { kind: 'small', as: 'p' },
      `Up to ${MAX_COMPARISON} titles. Scroll sideways on a narrow panel — the table keeps its columns.`,
    ),
    div('shop-compare__table', [table]),
    empty,
    clearButton,
    closeButton,
  ]);

  clearButton.addEventListener('e-click', () => {
    clearComparison();
    announce('Comparison cleared.');
  });

  onDetail<{ value: boolean; reason: string }>(root, 'e-close', () => {
    announce('Comparison closed.');
  });

  dialog = root;
  refreshComparison();
  return root;
}

/** Re-read the comparison list onto the table. Safe to call while closed. */
export function refreshComparison(): void {
  if (!table || !empty || !clearButton) return;
  const books = state.comparison
    .map((id) => bookById(id))
    .filter((book): book is Book => book != null);

  const columns = [
    { key: 'attribute', title: 'Attribute', width: '180px' },
    ...books.map((book, index) => ({ key: `b${index}`, title: book.title })),
  ];
  const data = ROWS.map((row) => {
    const record: Record<string, string> = { attribute: row.attribute };
    books.forEach((book, index) => {
      record[`b${index}`] = row.read(book);
    });
    return record;
  });

  setAttr(table, 'columns', JSON.stringify(columns));
  setAttr(table, 'data', books.length > 0 ? JSON.stringify(data) : '[]');
  setAttr(table, 'hidden', books.length > 0 ? null : '');
  setAttr(empty, 'hidden', books.length > 0 ? '' : null);
  setAttr(clearButton, 'disabled', books.length > 0 ? null : '');
}

export function openComparison(): void {
  if (!dialog) return;
  refreshComparison();
  dialog.setAttribute('open', '');
  announce(
    state.comparison.length === 0
      ? 'Comparison is empty.'
      : `Comparing ${state.comparison.length} of ${MAX_COMPARISON} titles.`,
  );
}
