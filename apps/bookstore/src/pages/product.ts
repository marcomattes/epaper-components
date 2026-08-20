// The product page.
//
// Built once and re-filled per title. Everything a component can take as an
// attribute (cover, price, rating, price history, table of contents) is patched
// in place; the regions whose components read their children once at connect
// time — format choices, detail lists, the publication timeline, the review
// list — are rebuilt inside wrapper elements this module owns.

import {
  bookById,
  CATEGORY_LABELS,
  FORMAT_LABELS,
  formatPrice,
  LANGUAGE_LABELS,
  listPrice,
  publisherName,
  type Book,
  type FormatId,
} from '../books';
import { div, h, onDetail, setAttr, setText, t } from '../dom';
import {
  discountPercent,
  eur,
  eurAmount,
  EXPRESS_DELIVERY,
  FREE_DELIVERY_THRESHOLD,
  longDate,
  STANDARD_DELIVERY,
} from '../format';
import { announce } from '../announce';
import { bookHref, catalogHref, navigate, type Route } from '../router';
import {
  addToCart,
  inComparison,
  inWishlist,
  MAX_COMPARISON,
  onStateChange,
  rememberViewed,
  state,
  toggleComparison,
  toggleWishlist,
} from '../state';
import { bookCard, coverFor, deliveryNote, ratingRun, stockRun, type BookCard } from '../ui';
import type { Crumb, Page } from '../page';

/** Open a product page. The hash change drives the shell. */
export function openProduct(productId: string): void {
  navigate(bookHref(productId));
}

/**
 * Star distribution for the review summary.
 *
 * Derived from the average and the review count with a triangular kernel, so
 * the bars always add up to the count printed beside them and a title never
 * shows a distribution that contradicts its own average.
 */
function ratingDistribution(book: Book): number[] {
  const weights = [5, 4, 3, 2, 1].map((star) =>
    Math.max(0, 1 - Math.abs(star - book.rating) / 2.5),
  );
  const sum = weights.reduce((total, weight) => total + weight, 0) || 1;
  const counts = weights.map((weight) => Math.round((weight / sum) * book.reviews));
  const drift = book.reviews - counts.reduce((total, count) => total + count, 0);
  counts[0] = Math.max(0, (counts[0] ?? 0) + drift);
  return counts;
}

const TAB_LABELS: Record<string, string> = {
  description: 'Description',
  details: 'Details',
  contents: 'Contents',
  delivery: 'Delivery',
  reviews: 'Reviews',
};

/**
 * Every part key used by any table of contents in the catalogue.
 *
 * `<e-tree>` seeds its expansion set from `default-expanded` once, at connect
 * time, so the value has to cover every book the page will later show. Keys
 * that no current tree contains are ignored.
 */
const TOC_PARTS = 'p1,p2,p3,p4,app,plates,spec';

export function createProductPage(): Page {
  let current: Book | null = null;
  let chosenFormat: FormatId = 'hardcover';
  let relatedCards: BookCard[] = [];

  /* ---------------- head ---------------- */

  const kicker = t('e-text', { kind: 'label', class: 'shop-eyebrow' }, '');
  const heading = t('e-title', { level: 1 }, '');
  const subtitle = t('e-text', { kind: 'prose', as: 'p', class: 'shop-lede' }, '');
  const byline = t('e-text', { kind: 'small', as: 'p' }, '');

  /* ---------------- cover and buy box ---------------- */

  const cover = h('e-image', { src: '', alt: '', fit: 'contain', caption: '' });
  const ribbon = h('e-ribbon', { text: '' }, [cover]);

  const priceStat = h('e-statistic', { label: 'Price', value: '', prefix: '€ ' });
  const ratingMeter = h('e-meter', {
    label: 'Average rating',
    min: 0,
    max: 5,
    segments: 10,
    low: 3,
    high: 4.5,
    unit: ' / 5',
  });
  const priceHistory = h('e-sparkline', {
    label: 'List price, last eight quarters',
    values: '[]',
  });
  const ratingSlot = div('shop-buy__rating');
  const stockSlot = div('shop-buy__stock');
  const deliveryLine = t('e-text', { kind: 'small', as: 'p' }, '');

  const deliveryPopover = h('e-popover', { heading: 'Delivery to Germany' }, [
    t('e-button', { slot: 'trigger' }, 'Delivery details'),
    t(
      'e-text',
      { kind: 'small', as: 'p' },
      `Standard delivery ${eur(STANDARD_DELIVERY)}, free from ${eur(FREE_DELIVERY_THRESHOLD)} ` +
        `goods value. Express ${eur(EXPRESS_DELIVERY)} if ordered before 13:00 on a working day.`,
    ),
    t(
      'e-text',
      { kind: 'small', as: 'p' },
      'Dispatch is Monday to Friday from the Hamburg warehouse. Books carry 7 % VAT, already ' +
        'included in every price shown. Collection from the reading room is free.',
    ),
  ]);

  // The banner keeps its identity across titles: only this span's text and the
  // host's `variant` / `heading` attributes change.
  const availabilityText = t('span', {}, '');
  const availabilityAlert = h('e-alert', { variant: 'info', heading: '' }, [availabilityText]);

  const formatSlot = div('shop-buy__formats');
  const quantity = h('e-input-number', { value: 1, min: 1, max: 20, step: 1 });
  const addLabel = t('span', {}, 'Add to basket');
  const addButton = h('e-button', { variant: 'primary' }, [addLabel]);

  const saveButton = t('e-button', {}, '♥ Save to wishlist');
  const removeConfirm = h(
    'e-popconfirm',
    {
      message: 'Remove this title from your wishlist?',
      'confirm-label': 'Remove',
      'cancel-label': 'Keep it',
      align: 'right',
    },
    [t('e-button', { slot: 'trigger', variant: 'destructive' }, '♥ Saved — remove')],
  );
  const compareChip = t('e-chip', {}, 'Compare');

  const buyBox = h('e-card', { class: 'shop-buy', eyebrow: 'Order' }, [
    priceStat,
    ratingSlot,
    div('shop-buy__meters', [ratingMeter, priceHistory]),
    stockSlot,
    deliveryLine,
    deliveryPopover,
    availabilityAlert,
    formatSlot,
    h('e-form-item', { label: 'Quantity' }, [quantity]),
    h('e-space', { size: 10, wrap: true }, [addButton, saveButton, removeConfirm, compareChip]),
  ]);

  /* ---------------- tabs ---------------- */

  const shortText = t('e-text', { kind: 'prose', as: 'p', class: 'shop-lede' }, '');
  const longText = t('e-text', { kind: 'prose', as: 'p' }, '');
  const tagSlot = h('e-space', { size: 8, wrap: true, class: 'shop-tags' });
  const timelineSlot = div('shop-timeline');
  const detailSlot = div('shop-details');
  const editionSlot = div('shop-editions');
  const contents = h('e-tree', { data: '[]', selectable: true, 'default-expanded': TOC_PARTS });
  const contentsNote = t('e-text', { kind: 'small', as: 'p' }, '');
  const deliverySlot = div('shop-delivery');
  const reviewSummary = div('shop-reviews__summary');
  const reviewSlot = div('shop-reviews__list');

  const tabs = h('e-tabs', { 'default-value': 'description' }, [
    h('e-tab', { key: 'description', label: 'Description', icon: 'doc' }, [
      shortText,
      longText,
      t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Tags'),
      tagSlot,
      t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Publication history'),
      timelineSlot,
    ]),
    h('e-tab', { key: 'details', label: 'Details', icon: 'folder' }, [
      detailSlot,
      t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Compared with the previous edition'),
      editionSlot,
    ]),
    h('e-tab', { key: 'contents', label: 'Contents', icon: 'menu' }, [contentsNote, contents]),
    h('e-tab', { key: 'delivery', label: 'Delivery', icon: 'download' }, [
      deliverySlot,
      h('e-alert', { variant: 'info', heading: 'Shipping within Germany' }, [
        'Deutsche Post and DHL, tracked. Orders placed before 13:00 on a working day leave the ' +
          'same day. The statutory 14-day right of withdrawal applies; sealed audio editions are ' +
          'excluded once opened.',
      ]),
    ]),
    h('e-tab', { key: 'reviews', label: 'Reviews', icon: 'star' }, [reviewSummary, reviewSlot]),
  ]);

  const relatedGrid = h('e-grid', {
    cols: 'repeat(auto-fill,minmax(228px,1fr))',
    gap: 18,
    class: 'shop-shelf',
  });

  /* ---------------- sider ---------------- */

  const sider = h('e-affix', { 'offset-top': 16 }, [
    h('section', { class: 'shop-sidenav', 'aria-label': 'On this page' }, [
      h('e-anchor', { 'offset-top': 96 }, [
        h('e-anchor-item', { href: '#product-buy', title: 'Order' }),
        h('e-anchor-item', { href: '#product-tabs', title: 'About this book' }),
        h('e-anchor-item', { href: '#product-related', title: 'Related titles' }),
      ]),
      h('e-divider', {}),
      t('e-link', { href: `#${catalogHref({})}` }, '← Back to the catalogue'),
    ]),
  ]);

  // `<e-anchor>` renders plain in-page anchors. This shop keeps its route in
  // the hash, so letting them navigate natively would replace `#/book/…` with
  // `#product-buy` and lose the route. Scrolling here keeps both: the URL still
  // names the product, and the anchor's marker still tracks the current section
  // because that is driven by the section ids, not by the location.
  sider.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#product-"]');
    if (!link) return;
    const target = document.getElementById(link.getAttribute('href')!.slice(1));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  });

  const content = div('shop-product', [
    h('header', { class: 'shop-masthead' }, [kicker, heading, subtitle, byline]),
    h('section', { id: 'product-buy', class: 'shop-section shop-product__top', tabindex: -1 }, [
      div('shop-product__cover', [ribbon]),
      buyBox,
    ]),
    h('e-divider', {}),
    h('section', { id: 'product-tabs', class: 'shop-section', tabindex: -1 }, [
      t('e-title', { level: 2 }, 'About this book'),
      tabs,
    ]),
    h('e-divider', {}),
    h('section', { id: 'product-related', class: 'shop-section', tabindex: -1 }, [
      t('e-title', { level: 2 }, 'Related titles'),
      relatedGrid,
    ]),
  ]);

  const notFoundAction = t(
    'e-button',
    { slot: 'action', variant: 'primary' },
    'Open the catalogue',
  );
  notFoundAction.addEventListener('e-click', () => navigate(catalogHref({})));
  const notFound = div('shop-section', [
    h(
      'e-result',
      {
        status: '404',
        title: 'That title is not on the shelf',
        description:
          'The link may come from an older catalogue. Everything in print is one click away.',
      },
      [notFoundAction],
    ),
  ]);
  notFound.hidden = true;

  const el = div('shop-page shop-page--product', [content, notFound]);

  /* ---------------- rendering ---------------- */

  function renderFormats(book: Book): void {
    const group = h(
      'e-radio-group',
      { layout: 'vertical', value: chosenFormat },
      book.formats.map((option) =>
        h('e-radio', {
          value: option.id,
          label: `${FORMAT_LABELS[option.id]} · ${eur(option.price)}`,
        }),
      ),
    );
    onDetail<{ value: string }>(group, 'e-change', ({ value }) => {
      chosenFormat = value as FormatId;
      renderPrice(book);
      announce(`${FORMAT_LABELS[chosenFormat]} selected, ${eur(formatPrice(book, chosenFormat))}.`);
    });
    formatSlot.replaceChildren(
      h('fieldset', { class: 'shop-fieldset' }, [
        t('legend', { class: 'shop-fieldset__legend' }, 'Format'),
        group,
      ]),
    );
  }

  function renderPrice(book: Book): void {
    const price = formatPrice(book, chosenFormat);
    setAttr(priceStat, 'value', eurAmount(price));
    setAttr(priceStat, 'label', `${FORMAT_LABELS[chosenFormat]}, VAT included`);
    const leadFormat = chosenFormat === book.formats[0]!.id;
    if (book.previousPrice != null && leadFormat) {
      setAttr(priceStat, 'trend', 'down');
      setAttr(priceStat, 'delta', `was ${eur(book.previousPrice)}`);
      setAttr(ribbon, 'text', `−${discountPercent(listPrice(book), book.previousPrice)} %`);
    } else {
      setAttr(priceStat, 'trend', null);
      setAttr(priceStat, 'delta', null);
      setAttr(ribbon, 'text', '');
    }
  }

  function renderTimeline(book: Book): void {
    const future = new Date(`${book.published}T00:00:00`).getTime() > Date.now();
    timelineSlot.replaceChildren(
      h('e-timeline', { 'time-position': 'left' }, [
        h(
          'e-timeline-item',
          { time: book.previousEdition.year, title: book.previousEdition.label, variant: 'done' },
          [
            `${book.previousEdition.pages} pages · ${eur(book.previousEdition.price)} · ` +
              `ISBN ${book.previousEdition.isbn}`,
          ],
        ),
        h(
          'e-timeline-item',
          {
            time: book.published.slice(0, 4),
            title: future ? 'Announced for publication' : 'Current edition',
            variant: future ? 'pending' : 'done',
          },
          [`${book.pages} pages · ${eur(listPrice(book))} · ISBN ${book.isbn}`],
        ),
        h('e-timeline-item', { time: 'Next', title: 'Reprint window', variant: 'pending' }, [
          book.availability === 'out-of-stock'
            ? 'Reprint requested from the publisher; no date confirmed.'
            : 'Reprinted on demand once shop stock falls below twenty copies.',
        ]),
      ]),
    );
  }

  function renderDetails(book: Book): void {
    const rows: Array<[string, string]> = [
      ['ISBN', book.isbn],
      ['Author', book.author],
      ['Publisher', publisherName(book)],
      ['Published', longDate(book.published)],
      ['Pages', String(book.pages)],
      ['Language', LANGUAGE_LABELS[book.language]],
      ['Shelf', CATEGORY_LABELS[book.category]],
      ['Formats', book.formats.map((option) => FORMAT_LABELS[option.id]).join(', ')],
    ];
    detailSlot.replaceChildren(
      h(
        'e-description-list',
        { columns: 2, bordered: true },
        rows.map(([term, detail]) => t('e-desc-item', { term }, detail)),
      ),
    );

    const editionLabels = {
      'before-label': book.previousEdition.label,
      'after-label': 'This edition',
    };
    editionSlot.replaceChildren(
      h('e-diff', {
        ...editionLabels,
        label: 'Extent',
        before: `${book.previousEdition.pages} pages`,
        after: `${book.pages} pages`,
      }),
      h('e-diff', {
        ...editionLabels,
        label: 'Price',
        before: eur(book.previousEdition.price),
        after: eur(listPrice(book)),
      }),
      h('e-diff', {
        ...editionLabels,
        label: 'ISBN',
        layout: 'stacked',
        before: book.previousEdition.isbn,
        after: book.isbn,
      }),
    );
  }

  function renderDelivery(book: Book): void {
    const rows: Array<[string, string]> = [
      ['Ships from', 'Hamburg, Germany'],
      ['Availability', deliveryNote(book)],
      ['Standard delivery', `${eur(STANDARD_DELIVERY)}, 2–4 working days`],
      ['Free delivery', `From ${eur(FREE_DELIVERY_THRESHOLD)} goods value`],
      ['Express delivery', `${eur(EXPRESS_DELIVERY)}, next working day`],
      ['Collection', 'Free, reading room, Mon–Sat'],
      ['VAT', '7 % on books, included in every price'],
      ['Returns', '14 days, postage paid'],
    ];
    deliverySlot.replaceChildren(
      h(
        'e-description-list',
        { columns: 2, bordered: true, layout: 'vertical' },
        rows.map(([term, detail]) => t('e-desc-item', { term }, detail)),
      ),
    );
  }

  function renderReviews(book: Book): void {
    const counts = ratingDistribution(book);
    reviewSummary.replaceChildren(
      div('shop-reviews__head', [
        h('e-statistic', { label: 'Average', value: book.rating, precision: 1, suffix: ' / 5' }),
        h('e-statistic', { label: 'Reviews', value: book.reviews }),
      ]),
      ...counts.map((count, index) =>
        h('e-progress', {
          value: count,
          max: Math.max(1, book.reviews),
          label: `${5 - index} stars, ${count} reviews`,
        }),
      ),
    );

    const list = h('e-list', { bordered: true, 'header-title': 'Most helpful reviews' });
    for (const review of book.reviewList) {
      list.appendChild(
        h('e-list-item', {}, [
          h('e-avatar', { slot: 'leading', name: review.author, size: 40, shape: 'circle' }),
          div('shop-review', [
            t('e-title', { level: 3 }, review.title),
            t(
              'e-text',
              { kind: 'small', as: 'p', class: 'shop-review__meta' },
              `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} · ${review.author} · ` +
                longDate(review.date),
            ),
            t('e-text', { kind: 'prose', as: 'p' }, review.body),
          ]),
        ]),
      );
    }
    reviewSlot.replaceChildren(list);
  }

  function renderRelated(book: Book): void {
    for (const card of relatedCards) card.dispose();
    relatedCards = book.related
      .map((id) => bookById(id))
      .filter((related): related is Book => related != null)
      .map((related) => bookCard(related, 'grid'));
    relatedGrid.replaceChildren(...relatedCards.map((card) => card.root));
  }

  function renderAvailability(book: Book): void {
    const notices: Record<
      Book['availability'],
      { variant: string; heading: string; body: string }
    > = {
      'in-stock': { variant: 'success', heading: '', body: '' },
      'low-stock': {
        variant: 'warning',
        heading: 'Only a few copies left',
        body: 'Fewer than ten copies on the shelf and no delivery from the publisher scheduled.',
      },
      preorder: {
        variant: 'info',
        heading: 'Pre-order',
        body: `Charged when the book ships on ${longDate(book.published)}. Cancel any time before then.`,
      },
      'out-of-stock': {
        variant: 'error',
        heading: 'Out of print between printings',
        body: 'Not orderable right now. Save it to your wishlist and the shop will tell you when the reprint lands.',
      },
    };
    const notice = notices[book.availability];
    setAttr(availabilityAlert, 'variant', notice.variant);
    setAttr(availabilityAlert, 'heading', notice.heading);
    setAttr(availabilityAlert, 'hidden', book.availability === 'in-stock' ? '' : null);
    setText(availabilityText, notice.body);
  }

  function syncControls(): void {
    if (!current) return;
    const saved = inWishlist(current.id);
    setAttr(saveButton, 'hidden', saved ? '' : null);
    setAttr(removeConfirm, 'hidden', saved ? null : '');
    const comparing = inComparison(current.id);
    setAttr(compareChip, 'selected', comparing ? '' : null);
    setAttr(
      compareChip,
      'disabled',
      !comparing && state.comparison.length >= MAX_COMPARISON ? '' : null,
    );
    setAttr(addButton, 'disabled', current.availability === 'out-of-stock' ? '' : null);
    setText(
      addLabel,
      current.availability === 'preorder' ? 'Pre-order this title' : 'Add to basket',
    );
  }

  function findLabel(book: Book, value: string): string | null {
    const walk = (nodes: Book['contents']): string | null => {
      for (const node of nodes) {
        if (node.value === value) return node.label;
        const nested = node.children ? walk(node.children) : null;
        if (nested) return nested;
      }
      return null;
    };
    return walk(book.contents);
  }

  function render(book: Book): void {
    current = book;
    chosenFormat = book.formats[0]!.id;

    setText(kicker, CATEGORY_LABELS[book.category]);
    setText(heading, book.title);
    setText(subtitle, book.subtitle);
    setText(
      byline,
      `${book.author} · ${publisherName(book)} · ${longDate(book.published)} · ISBN ${book.isbn}`,
    );

    const art = coverFor(book);
    setAttr(cover, 'src', art.src);
    setAttr(cover, 'alt', art.alt);
    setAttr(cover, 'caption', `${book.pages} pages · ${LANGUAGE_LABELS[book.language]}`);

    renderPrice(book);
    setAttr(ratingMeter, 'value', String(book.rating));
    setAttr(priceHistory, 'values', JSON.stringify(book.priceHistory));
    ratingSlot.replaceChildren(ratingRun(book));
    stockSlot.replaceChildren(stockRun(book));
    setText(deliveryLine, deliveryNote(book));

    renderAvailability(book);
    renderFormats(book);

    setText(shortText, book.short);
    setText(longText, book.long);
    tagSlot.replaceChildren(...book.tags.map((tag) => t('e-tag', {}, tag)));
    renderTimeline(book);
    renderDetails(book);
    renderDelivery(book);
    setAttr(contents, 'data', JSON.stringify(book.contents));
    setText(
      contentsNote,
      `Table of contents as printed: ${book.pages} pages in ${book.contents.length} parts.`,
    );
    renderReviews(book);
    renderRelated(book);

    setAttr(quantity, 'value', '1');
    syncControls();
  }

  /* ---------------- events ---------------- */

  addButton.addEventListener('e-click', () => {
    if (!current) return;
    const raw = Number(quantity.getAttribute('value') ?? '1');
    const amount = Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 1;
    const line = addToCart(current.id, amount, chosenFormat);
    if (!line) {
      announce('This title cannot be ordered at the moment.');
      return;
    }
    announce(
      `${amount} × ${current.title} (${FORMAT_LABELS[chosenFormat]}) added. ` +
        `${line.quantity} in the basket.`,
    );
  });

  saveButton.addEventListener('e-click', () => {
    if (!current) return;
    toggleWishlist(current.id);
    announce(`${current.title} saved to the wishlist.`);
  });

  onDetail<{ value: boolean }>(removeConfirm, 'e-confirm', () => {
    if (!current) return;
    toggleWishlist(current.id);
    announce(`${current.title} removed from the wishlist.`);
  });

  onDetail<{ value: boolean }>(removeConfirm, 'e-cancel', () => {
    announce('Kept on the wishlist.');
  });

  onDetail<{ value: boolean }>(compareChip, 'e-change', () => {
    if (!current) return;
    const result = toggleComparison(current.id);
    if (result.rejected) {
      compareChip.removeAttribute('selected');
      announce(`Comparison already holds ${MAX_COMPARISON} titles. Remove one first.`);
      return;
    }
    announce(
      result.added
        ? `${current.title} added to the comparison.`
        : `${current.title} removed from the comparison.`,
    );
  });

  onDetail<{ value: string }>(tabs, 'e-change', ({ value }) => {
    announce(`${TAB_LABELS[value] ?? value} tab.`);
  });

  onDetail<{ value: string }>(contents, 'e-select', ({ value }) => {
    if (!current) return;
    const label = findLabel(current, value);
    if (label) announce(`${label}. Part of the printed book, not a separate purchase.`);
  });

  onStateChange(syncControls);

  return {
    el,
    sider,
    enter(route: Route) {
      const book = bookById(route.id);
      if (!book) {
        content.hidden = true;
        notFound.hidden = false;
        return {
          title: 'Title not found',
          trail: [{ label: 'Shop', href: '#/' }, { label: 'Not found' }] as Crumb[],
        };
      }
      content.hidden = false;
      notFound.hidden = true;
      if (current?.id !== book.id) render(book);
      else syncControls();
      rememberViewed(book.id);

      const trail: Crumb[] = [
        { label: 'Shop', href: '#/' },
        { label: 'Catalogue', href: `#${catalogHref({})}` },
        { label: CATEGORY_LABELS[book.category], href: `#${catalogHref({ cat: book.category })}` },
        { label: book.title },
      ];
      return { title: book.title, trail };
    },
  };
}
