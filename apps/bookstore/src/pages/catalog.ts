// The catalogue: search, ten filters, six sort orders, two views.
//
// Every product card is built once, for both views, and then reordered and
// hidden as the result set changes. Filtering therefore never destroys and
// re-creates a card — the panel repaints the cells that actually moved, and a
// card keeps its identity across a filter change.

import {
  BOOKS,
  CATEGORY_LABELS,
  CATEGORY_TREE,
  FORMAT_LABELS,
  LANGUAGE_LABELS,
  listPrice,
  publisherName,
  PUBLISHER_TREE,
  PUBLISHERS,
  SHELF_LABELS,
  type Book,
  type CategoryId,
  type FormatId,
  type LanguageId,
  type PublisherId,
  type ShelfId,
} from '../books';
import { div, h, onDetail, setAttr, setText, t } from '../dom';
import { eur } from '../format';
import { announce } from '../announce';
import { openComparison } from '../comparison';
import { catalogHref, type Route } from '../router';
import { MAX_COMPARISON, onStateChange, state, type SortKey, type ViewMode } from '../state';
import { bookCard } from '../ui';
import type { Crumb, Page } from '../page';

const PAGE_SIZE = 9;

type AvailabilityFilter = 'any' | 'in-stock' | 'preorder';

export interface Filters {
  query: string;
  category: CategoryId | '';
  publisher: PublisherId | '';
  publisherGroup: string;
  formats: FormatId[];
  languages: LanguageId[];
  availability: AvailabilityFilter;
  minRating: number;
  publishedFrom: string;
  priceMin: number | null;
  priceMax: number | null;
  shelves: ShelfId[];
  dealsOnly: boolean;
}

const emptyFilters = (): Filters => ({
  query: '',
  category: '',
  publisher: '',
  publisherGroup: '',
  formats: [],
  languages: [],
  availability: 'any',
  minRating: 0,
  publishedFrom: '',
  priceMin: null,
  priceMax: null,
  shelves: [],
  dealsOnly: false,
});

const filters: Filters = emptyFilters();

const PUBLISHERS_IN_GROUP: Record<string, PublisherId[]> = {
  'group-independent': ['alder-quill', 'vellum-house', 'sixth-signal'],
  'group-academic': ['northgate', 'meridian'],
  'group-illustrated': ['foxglove', 'paper-lantern'],
};

/** `<e-cascader>` stores the whole path, so a leaf has to be resolved back. */
function categoryPath(leaf: CategoryId | ''): string {
  if (!leaf) return '';
  for (const department of CATEGORY_TREE) {
    if (department.children?.some((child) => child.value === leaf)) {
      return `${department.value},${leaf}`;
    }
  }
  return leaf;
}

/** Everything a free-text search looks at, lower-cased once per book. */
const HAYSTACK = new Map<string, string>(
  BOOKS.map((book) => [
    book.id,
    [
      book.title,
      book.subtitle,
      book.author,
      book.isbn,
      book.isbn.replace(/-/g, ''),
      publisherName(book),
      CATEGORY_LABELS[book.category],
      ...book.tags,
    ]
      .join(' ')
      .toLowerCase(),
  ]),
);

/**
 * Apply the active filters.
 *
 * Search covers title, subtitle, author, ISBN (with or without hyphens),
 * publisher, shelf name and tags, so a customer holding the physical book can
 * type the number off the back of it.
 */
export function filterProducts(books: readonly Book[], active: Filters = filters): Book[] {
  const needle = active.query.trim().toLowerCase();
  const allowedPublishers = active.publisherGroup
    ? (PUBLISHERS_IN_GROUP[active.publisherGroup] ?? [])
    : [];

  return books.filter((book) => {
    if (needle && !HAYSTACK.get(book.id)?.includes(needle)) return false;
    if (active.category && book.category !== active.category) return false;
    if (active.publisher && book.publisher !== active.publisher) return false;
    if (allowedPublishers.length > 0 && !allowedPublishers.includes(book.publisher)) return false;
    if (
      active.formats.length > 0 &&
      !book.formats.some((option) => active.formats.includes(option.id))
    ) {
      return false;
    }
    if (active.languages.length > 0 && !active.languages.includes(book.language)) return false;
    if (
      active.availability === 'in-stock' &&
      book.availability !== 'in-stock' &&
      book.availability !== 'low-stock'
    ) {
      return false;
    }
    if (active.availability === 'preorder' && book.availability !== 'preorder') return false;
    if (book.rating < active.minRating) return false;
    if (active.publishedFrom && book.published < active.publishedFrom) return false;
    const price = listPrice(book);
    if (active.priceMin != null && price < active.priceMin) return false;
    if (active.priceMax != null && price > active.priceMax) return false;
    if (active.shelves.length > 0 && !active.shelves.some((id) => book.shelves.includes(id))) {
      return false;
    }
    if (active.dealsOnly && book.previousPrice == null) return false;
    return true;
  });
}

/** Weight for the `relevance` order: a title hit outranks a tag hit. */
function relevance(book: Book, needle: string): number {
  if (!needle) return book.rating * 100 + book.reviews / 100;
  const title = book.title.toLowerCase();
  let score = 0;
  if (title === needle) score += 1000;
  else if (title.startsWith(needle)) score += 600;
  else if (title.includes(needle)) score += 400;
  if (book.author.toLowerCase().includes(needle)) score += 250;
  if (book.isbn.replace(/-/g, '').includes(needle.replace(/-/g, ''))) score += 800;
  if (book.tags.some((tag) => tag.includes(needle))) score += 120;
  return score + book.rating * 10;
}

export function sortProducts(books: readonly Book[], key: SortKey, query = ''): Book[] {
  const needle = query.trim().toLowerCase();
  const sorted = [...books];
  switch (key) {
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'en'));
      break;
    case 'price-asc':
      sorted.sort((a, b) => listPrice(a) - listPrice(b));
      break;
    case 'price-desc':
      sorted.sort((a, b) => listPrice(b) - listPrice(a));
      break;
    case 'date':
      sorted.sort((a, b) => b.published.localeCompare(a.published));
      break;
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
      break;
    default:
      sorted.sort((a, b) => relevance(b, needle) - relevance(a, needle));
  }
  return sorted;
}

/** One active filter, as shown on its removable chip. */
interface ActiveChip {
  key: string;
  label: string;
  clear: () => void;
}

function activeChips(): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const add = (key: string, label: string, clear: () => void): void => {
    chips.push({ key, label, clear });
  };

  if (filters.query) {
    add('query', `Search: “${filters.query}”`, () => {
      filters.query = '';
    });
  }
  if (filters.category) {
    add('category', `Shelf: ${CATEGORY_LABELS[filters.category]}`, () => {
      filters.category = '';
    });
  }
  if (filters.publisher || filters.publisherGroup) {
    const label = filters.publisher
      ? PUBLISHERS[filters.publisher]
      : (PUBLISHER_TREE.find((node) => node.value === filters.publisherGroup)?.label ??
        'Publisher');
    add('publisher', `Publisher: ${label}`, () => {
      filters.publisher = '';
      filters.publisherGroup = '';
    });
  }
  for (const format of filters.formats) {
    add(`format-${format}`, `Format: ${FORMAT_LABELS[format]}`, () => {
      filters.formats = filters.formats.filter((item) => item !== format);
    });
  }
  for (const language of filters.languages) {
    add(`language-${language}`, `Language: ${LANGUAGE_LABELS[language]}`, () => {
      filters.languages = filters.languages.filter((item) => item !== language);
    });
  }
  if (filters.availability !== 'any') {
    const label = filters.availability === 'in-stock' ? 'Ready to ship' : 'Pre-order';
    add('availability', `Availability: ${label}`, () => {
      filters.availability = 'any';
    });
  }
  if (filters.minRating > 0) {
    add('rating', `Rating: ${filters.minRating} stars and up`, () => {
      filters.minRating = 0;
    });
  }
  if (filters.publishedFrom) {
    add('published', `Published from ${filters.publishedFrom}`, () => {
      filters.publishedFrom = '';
    });
  }
  if (filters.priceMin != null || filters.priceMax != null) {
    const from = filters.priceMin != null ? eur(filters.priceMin) : 'any';
    const to = filters.priceMax != null ? eur(filters.priceMax) : 'any';
    add('price', `Price ${from} – ${to}`, () => {
      filters.priceMin = null;
      filters.priceMax = null;
    });
  }
  for (const id of filters.shelves) {
    add(`shelf-${id}`, SHELF_LABELS[id], () => {
      filters.shelves = filters.shelves.filter((item) => item !== id);
    });
  }
  if (filters.dealsOnly) {
    add('deals', 'Reduced price only', () => {
      filters.dealsOnly = false;
    });
  }
  return chips;
}

let update: (() => void) | null = null;

/** Re-run filter, sort and paging, then repaint the result area. */
export function updateCatalog(): void {
  update?.();
}

/** A named group of controls, so assistive technology hears the grouping. */
function fieldset(legend: string, children: readonly HTMLElement[]): HTMLElement {
  return h('fieldset', { class: 'shop-fieldset' }, [
    t('legend', { class: 'shop-sr' }, legend),
    ...children,
  ]);
}

export function createCatalogPage(): Page {
  let page = 1;
  let loading = false;
  let lastRefreshed = new Date().toISOString();

  /* ---------------- sider: the filter rail ---------------- */

  const searchInput = h('e-input', {
    label: 'Search the catalogue',
    placeholder: 'Title, author, ISBN, publisher, tag',
    type: 'search',
    hint: 'Try “e-paper”, “Achterberg” or an ISBN.',
  });

  const categoryPicker = h('e-cascader', {
    data: JSON.stringify(CATEGORY_TREE),
    placeholder: 'All departments',
  });

  const publisherPicker = h('e-tree-select', {
    data: JSON.stringify(PUBLISHER_TREE),
    'default-expanded': 'group-independent',
  });

  const formatGroup = h(
    'e-checkbox-group',
    { layout: 'vertical' },
    (Object.keys(FORMAT_LABELS) as FormatId[]).map((id) =>
      h('e-cbox-option', { value: id, label: FORMAT_LABELS[id] }),
    ),
  );

  const languageGroup = h(
    'e-checkbox-group',
    { layout: 'horizontal' },
    (Object.keys(LANGUAGE_LABELS) as LanguageId[]).map((id) =>
      h('e-cbox-option', { value: id, label: LANGUAGE_LABELS[id] }),
    ),
  );

  const availabilityGroup = h('e-radio-group', { layout: 'vertical', value: 'any' }, [
    h('e-radio', { value: 'any', label: 'Any' }),
    h('e-radio', { value: 'in-stock', label: 'Ready to ship' }),
    h('e-radio', { value: 'preorder', label: 'Pre-order only' }),
  ]);

  const ratingGroup = h('e-radio-group', { layout: 'vertical', value: '0' }, [
    h('e-radio', { value: '0', label: 'Any rating' }),
    h('e-radio', { value: '3', label: '3 stars and up' }),
    h('e-radio', { value: '4', label: '4 stars and up' }),
    h('e-radio', { value: '4.5', label: '4.5 stars and up' }),
  ]);

  const priceMin = h('e-input-number', { min: 0, max: 200, step: 1 });
  const priceMax = h('e-input-number', { min: 0, max: 200, step: 1 });
  const publishedFrom = h('e-date-picker', { placeholder: 'Any date' });
  const dealsOnly = h('e-checkbox', { label: 'Reduced price only' });

  const clearAll = t('e-button', { variant: 'destructive' }, 'Clear every filter');

  const sider = h('section', { class: 'shop-filters', 'aria-label': 'Catalogue filters' }, [
    t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Refine'),
    searchInput,
    h('e-collapse', { 'default-open': 'department,price' }, [
      h('e-collapse-panel', { key: 'department', heading: 'Department' }, [categoryPicker]),
      h('e-collapse-panel', { key: 'publisher', heading: 'Publisher' }, [publisherPicker]),
      h('e-collapse-panel', { key: 'format', heading: 'Format' }, [
        fieldset('Format', [formatGroup]),
      ]),
      h('e-collapse-panel', { key: 'language', heading: 'Language' }, [
        fieldset('Language', [languageGroup]),
      ]),
      h('e-collapse-panel', { key: 'availability', heading: 'Availability' }, [
        fieldset('Availability', [availabilityGroup]),
      ]),
      h('e-collapse-panel', { key: 'rating', heading: 'Minimum rating' }, [
        fieldset('Minimum rating', [ratingGroup]),
      ]),
      h('e-collapse-panel', { key: 'price', heading: 'Price and date' }, [
        div('shop-filters__row', [
          h('e-form-item', { label: 'From (€)' }, [priceMin]),
          h('e-form-item', { label: 'To (€)' }, [priceMax]),
        ]),
        h('e-form-item', { label: 'Published from' }, [publishedFrom]),
        dealsOnly,
      ]),
    ]),
    clearAll,
  ]);

  /* ---------------- content: toolbar and results ---------------- */

  const quickChips: Array<{ id: ShelfId; chip: HTMLElement }> = (
    ['new', 'staff', 'deal', 'best'] as ShelfId[]
  ).map((id) => ({ id, chip: t('e-chip', {}, SHELF_LABELS[id]) }));

  const sortSelect = h('e-select', { value: state.sort }, [
    h('e-option', { value: 'relevance', label: 'Relevance' }),
    h('e-option', { value: 'title', label: 'Title A–Z' }),
    h('e-option', { value: 'price-asc', label: 'Price, lowest first' }),
    h('e-option', { value: 'price-desc', label: 'Price, highest first' }),
    h('e-option', { value: 'date', label: 'Publication date' }),
    h('e-option', { value: 'rating', label: 'Rating' }),
  ]);

  const viewToggle = h('e-segmented', { value: state.view }, [
    h('e-segment', { value: 'grid', label: 'Grid' }),
    h('e-segment', { value: 'list', label: 'List' }),
  ]);

  const refreshButton = t('e-button', {}, 'Refresh prices');
  const lastUpdated = h('e-last-updated', {
    datetime: lastRefreshed,
    label: 'Prices checked',
    'stale-after': 60,
    'expired-after': 600,
    'show-absolute': true,
  });

  const compareButton = t('e-button', {}, 'Compare');
  const compareBadge = h('e-badge-count', { count: 0, max: MAX_COMPARISON }, [compareButton]);

  const chipRow = div('shop-chips');
  const resultCount = t('e-text', { kind: 'small', as: 'p', class: 'shop-count' }, '');

  const gridView = h('e-grid', {
    cols: 'repeat(auto-fill,minmax(228px,1fr))',
    gap: 18,
    class: 'shop-results shop-results--grid',
  });
  const listView = h('e-flex', {
    direction: 'column',
    gap: 14,
    class: 'shop-results shop-results--list',
  });

  const gridCards = new Map<string, HTMLElement>();
  const listCards = new Map<string, HTMLElement>();
  for (const book of BOOKS) {
    const grid = bookCard(book, 'grid').root;
    grid.hidden = true;
    gridView.appendChild(grid);
    gridCards.set(book.id, grid);

    const list = bookCard(book, 'list').root;
    list.hidden = true;
    listView.appendChild(list);
    listCards.set(book.id, list);
  }

  const skeletons = div(
    'shop-skeletons',
    Array.from({ length: 6 }, () =>
      div('shop-skeletons__cell', [
        h('e-skeleton', { shape: 'block', height: '150px' }),
        h('e-skeleton', { shape: 'text', lines: 3 }),
      ]),
    ),
  );
  skeletons.hidden = true;

  const emptyAction = t('e-button', { slot: 'action', variant: 'primary' }, 'Clear every filter');
  const emptyState = h(
    'e-empty',
    {
      icon: 'search',
      title: 'No titles match those filters',
      description: 'Remove a chip above, or clear every filter and start again.',
    },
    [emptyAction],
  );
  emptyState.hidden = true;

  const pagination = h('e-pagination', { current: 1, total: 1, 'sibling-count': 1 });

  const el = div('shop-page shop-page--catalog', [
    h('header', { class: 'shop-masthead' }, [
      t('e-title', { level: 1 }, 'Catalogue'),
      t(
        'e-text',
        { kind: 'prose', as: 'p', class: 'shop-lede' },
        'Twenty titles across eight shelves. Filters live in the left rail; everything switched ' +
          'on is listed as a removable chip below.',
      ),
    ]),
    div('shop-toolbar', [
      h(
        'e-space',
        { size: 8, wrap: true, class: 'shop-toolbar__chips' },
        quickChips.map((entry) => entry.chip),
      ),
      h('e-space', { size: 12, wrap: true, class: 'shop-toolbar__controls' }, [
        h('e-form-item', { label: 'Sort by' }, [sortSelect]),
        h('e-form-item', { label: 'Layout' }, [viewToggle]),
        refreshButton,
        compareBadge,
      ]),
    ]),
    div('shop-toolbar__meta', [lastUpdated, resultCount]),
    chipRow,
    h('e-divider', {}),
    skeletons,
    gridView,
    listView,
    emptyState,
    pagination,
  ]);

  /* ---------------- behaviour ---------------- */

  const currentResults = (): Book[] =>
    sortProducts(filterProducts(BOOKS), state.sort, filters.query);

  function renderChips(chips: ActiveChip[]): void {
    const nodes: HTMLElement[] = chips.map((chip) => {
      const tag = t('e-tag', { closable: true, 'data-filter': chip.key }, chip.label);
      onDetail<{ value: string }>(tag, 'e-close', () => {
        chip.clear();
        page = 1;
        syncControls();
        paint();
        announce(`${chip.label} removed. ${currentResults().length} titles match.`);
      });
      return tag;
    });
    if (chips.length > 0) {
      const clear = t('e-button', { class: 'shop-chips__clear' }, 'Clear all');
      clear.addEventListener('e-click', clearFilters);
      nodes.push(clear);
    }
    chipRow.replaceChildren(...nodes);
    setAttr(chipRow, 'hidden', chips.length > 0 ? null : '');
  }

  function paint(): void {
    const results = currentResults();
    const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * PAGE_SIZE;
    const shown = results.slice(start, start + PAGE_SIZE);
    const shownIds = new Set(shown.map((book) => book.id));

    for (const [cardsById, container] of [
      [gridCards, gridView],
      [listCards, listView],
    ] as const) {
      for (const book of shown) {
        // appendChild moves the existing node, so the visible cards end up in
        // result order without any of them being re-created.
        container.appendChild(cardsById.get(book.id)!);
        cardsById.get(book.id)!.hidden = false;
      }
      for (const [id, card] of cardsById) {
        if (!shownIds.has(id)) card.hidden = true;
      }
    }

    const isGrid = state.view === 'grid';
    const hasResults = results.length > 0;
    gridView.hidden = loading || !isGrid || !hasResults;
    listView.hidden = loading || isGrid || !hasResults;
    skeletons.hidden = !loading;
    emptyState.hidden = loading || hasResults;
    pagination.hidden = loading || !hasResults;

    setAttr(pagination, 'total', String(totalPages));
    setAttr(pagination, 'current', String(page));
    setAttr(lastUpdated, 'datetime', lastRefreshed);
    setAttr(compareBadge, 'count', String(state.comparison.length));

    setText(
      resultCount,
      hasResults
        ? `${results.length} title${results.length === 1 ? '' : 's'} · page ${page} of ${totalPages}`
        : 'No titles match',
    );

    renderChips(activeChips());
  }

  update = paint;

  /** Push the filter object back onto the controls after a chip removal. */
  function syncControls(): void {
    setAttr(searchInput, 'value', filters.query);
    setAttr(categoryPicker, 'value', categoryPath(filters.category));
    setAttr(publisherPicker, 'value', filters.publisher || filters.publisherGroup);
    setAttr(formatGroup, 'value', filters.formats.join(','));
    setAttr(languageGroup, 'value', filters.languages.join(','));
    setAttr(availabilityGroup, 'value', filters.availability);
    setAttr(ratingGroup, 'value', String(filters.minRating));
    setAttr(priceMin, 'value', filters.priceMin == null ? '' : String(filters.priceMin));
    setAttr(priceMax, 'value', filters.priceMax == null ? '' : String(filters.priceMax));
    setAttr(publishedFrom, 'value', filters.publishedFrom);
    setAttr(dealsOnly, 'checked', filters.dealsOnly ? '' : null);
    setAttr(sortSelect, 'value', state.sort);
    setAttr(viewToggle, 'value', state.view);
    for (const entry of quickChips) {
      setAttr(entry.chip, 'selected', filters.shelves.includes(entry.id) ? '' : null);
    }
  }

  function clearFilters(): void {
    Object.assign(filters, emptyFilters());
    page = 1;
    syncControls();
    paint();
    announce(`Filters cleared. ${BOOKS.length} titles.`);
  }

  /** Read a numeric field through its reflected attribute so "" stays empty. */
  function readNumber(control: HTMLElement): number | null {
    const raw = (control.getAttribute('value') ?? '').trim();
    if (raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  clearAll.addEventListener('e-click', clearFilters);
  emptyAction.addEventListener('e-click', clearFilters);

  onDetail<{ value: string }>(searchInput, 'e-input', ({ value }) => {
    filters.query = value;
    page = 1;
    paint();
  });

  onDetail<{ value: string[] }>(categoryPicker, 'e-change', ({ value }) => {
    filters.category = (value[value.length - 1] ?? '') as CategoryId | '';
    page = 1;
    paint();
    announce(
      filters.category
        ? `Shelf set to ${CATEGORY_LABELS[filters.category]}.`
        : 'Department filter cleared.',
    );
  });

  onDetail<{ value: string }>(publisherPicker, 'e-change', ({ value }) => {
    if (PUBLISHERS_IN_GROUP[value]) {
      filters.publisherGroup = value;
      filters.publisher = '';
    } else {
      filters.publisher = value as PublisherId;
      filters.publisherGroup = '';
    }
    page = 1;
    paint();
  });

  onDetail<{ value: string[] }>(formatGroup, 'e-change', ({ value }) => {
    filters.formats = value as FormatId[];
    page = 1;
    paint();
  });

  onDetail<{ value: string[] }>(languageGroup, 'e-change', ({ value }) => {
    filters.languages = value as LanguageId[];
    page = 1;
    paint();
  });

  onDetail<{ value: string }>(availabilityGroup, 'e-change', ({ value }) => {
    filters.availability = value as AvailabilityFilter;
    page = 1;
    paint();
  });

  onDetail<{ value: string }>(ratingGroup, 'e-change', ({ value }) => {
    filters.minRating = Number(value);
    page = 1;
    paint();
  });

  onDetail<{ value: number }>(priceMin, 'e-change', () => {
    filters.priceMin = readNumber(priceMin);
    page = 1;
    paint();
  });

  onDetail<{ value: number }>(priceMax, 'e-change', () => {
    filters.priceMax = readNumber(priceMax);
    page = 1;
    paint();
  });

  onDetail<{ value: string }>(publishedFrom, 'e-change', ({ value }) => {
    filters.publishedFrom = value;
    page = 1;
    paint();
  });

  onDetail<{ checked: boolean }>(dealsOnly, 'e-change', ({ checked }) => {
    filters.dealsOnly = checked;
    page = 1;
    paint();
  });

  for (const entry of quickChips) {
    onDetail<{ value: boolean }>(entry.chip, 'e-change', ({ value }) => {
      filters.shelves = value
        ? [...filters.shelves, entry.id]
        : filters.shelves.filter((item) => item !== entry.id);
      page = 1;
      paint();
    });
  }

  onDetail<{ value: string }>(sortSelect, 'e-change', ({ value }) => {
    state.sort = value as SortKey;
    page = 1;
    paint();
    announce(`Sorted by ${value.replace('-', ' ')}.`);
  });

  onDetail<{ value: string }>(viewToggle, 'e-change', ({ value }) => {
    state.view = value as ViewMode;
    paint();
    announce(`${value === 'grid' ? 'Grid' : 'List'} view.`);
  });

  onDetail<{ value: number }>(pagination, 'e-change', ({ value }) => {
    page = value;
    paint();
    announce(`Page ${value}.`);
    el.scrollIntoView({ block: 'start' });
  });

  compareButton.addEventListener('e-click', () => openComparison());

  /**
   * The refresh demonstration.
   *
   * A real shop would re-fetch here. The delay exists to show the static
   * skeleton doing its job: the result area keeps its height, so the panel
   * repaints one rectangle instead of reflowing the page twice.
   */
  refreshButton.addEventListener('e-click', () => {
    if (loading) return;
    loading = true;
    setAttr(refreshButton, 'disabled', '');
    paint();
    announce('Refreshing prices…');
    window.setTimeout(() => {
      loading = false;
      lastRefreshed = new Date().toISOString();
      setAttr(refreshButton, 'disabled', null);
      paint();
      announce(`Prices refreshed. ${currentResults().length} titles listed.`);
    }, 700);
  });

  onStateChange(() => {
    setAttr(compareBadge, 'count', String(state.comparison.length));
  });

  return {
    el,
    sider,
    enter(route: Route) {
      const query = route.query.get('q');
      const category = route.query.get('cat');
      const shelfParam = route.query.get('shelf');
      const sortParam = route.query.get('sort');
      if (query != null) filters.query = query;
      if (category != null) filters.category = category as CategoryId;
      if (shelfParam != null) filters.shelves = [shelfParam as ShelfId];
      if (sortParam != null) state.sort = sortParam as SortKey;
      if (query != null || category != null || shelfParam != null || sortParam != null) page = 1;
      syncControls();
      paint();

      const trail: Crumb[] = [{ label: 'Shop', href: '#/' }];
      if (filters.category) {
        trail.push({ label: 'Catalogue', href: `#${catalogHref({})}` });
        trail.push({ label: CATEGORY_LABELS[filters.category] });
      } else {
        trail.push({ label: 'Catalogue' });
      }
      return { title: 'Catalogue', trail };
    },
  };
}
