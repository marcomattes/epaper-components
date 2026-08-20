// Shared view fragments: the product card, the small typographic runs that
// repeat across the shop, and the registry that keeps every rendered card in
// step with the basket, the wishlist and the comparison list.

import {
  AVAILABILITY_LABELS,
  CATEGORY_IMPRINT,
  CATEGORY_LABELS,
  FORMAT_LABELS,
  LANGUAGE_LABELS,
  listPrice,
  publisherName,
  type Book,
} from './books';
import { coverAlt, coverUri } from './covers';
import { deliveryWindow, discountPercent, eur } from './format';
import { bookHref } from './router';
import { announce } from './announce';
import { div, h, onDetail, setAttr, setFlag, t, type Child } from './dom';
import {
  addToCart,
  cartLine,
  inComparison,
  inWishlist,
  MAX_COMPARISON,
  state,
  toggleComparison,
  toggleWishlist,
} from './state';

/** Filled/hollow stars, plus the same value written out for screen readers. */
export function ratingRun(book: Book): HTMLElement {
  const filled = Math.round(book.rating);
  const glyphs = '★'.repeat(filled) + '☆'.repeat(5 - filled);
  return h('span', { class: 'shop-rating' }, [
    t('span', { class: 'shop-rating__stars', 'aria-hidden': 'true' }, glyphs),
    t('span', { class: 'shop-rating__value' }, book.rating.toFixed(1)),
    t('span', { class: 'shop-sr' }, `out of 5, from ${book.reviews} reviews`),
    t('span', { class: 'shop-rating__count', 'aria-hidden': 'true' }, `(${book.reviews})`),
  ]);
}

const AVAILABILITY_ICON: Record<Book['availability'], string> = {
  'in-stock': 'check',
  'low-stock': 'bell',
  preorder: 'bookmark',
  'out-of-stock': 'close',
};

/**
 * Stock line. The state is carried by an icon and a word, never by colour
 * alone — on a one-bit panel a red dot and a green dot are the same dot.
 */
export function stockRun(book: Book): HTMLElement {
  return h('span', { class: 'shop-stock', 'data-availability': book.availability }, [
    h('e-icon', { name: AVAILABILITY_ICON[book.availability], size: 15 }),
    t('span', {}, AVAILABILITY_LABELS[book.availability]),
  ]);
}

export function deliveryNote(book: Book): string {
  if (book.availability === 'out-of-stock') return 'Reprint expected — not orderable yet';
  if (book.availability === 'preorder') return `Dispatched on publication, ${book.published}`;
  return `Delivery ${deliveryWindow(book.deliveryDays)}`;
}

/** Price, with the struck previous price when the title is on offer. */
export function priceRun(book: Book): HTMLElement {
  const price = listPrice(book);
  const children: Child[] = [t('span', { class: 'shop-price__now' }, eur(price))];
  if (book.previousPrice != null) {
    children.push(t('s', { class: 'shop-price__was' }, eur(book.previousPrice)));
    children.push(
      t('e-badge', { inverted: true }, `−${discountPercent(price, book.previousPrice)} %`),
    );
  }
  return div('shop-price', children);
}

export const coverFor = (book: Book): { src: string; alt: string } => {
  const input = {
    id: book.id,
    title: book.title,
    author: book.author,
    publisher: publisherName(book),
    imprint: CATEGORY_IMPRINT[book.category],
  };
  return { src: coverUri(input), alt: coverAlt(input) };
};

/* ------------------------------------------------------------------ *
 * Product card
 * ------------------------------------------------------------------ */

export interface BookCard {
  root: HTMLElement;
  book: Book;
  /** Re-read basket / wishlist / comparison state onto the controls. */
  sync(): void;
  /** Drop the card from the sync registry once it leaves the page for good. */
  dispose(): void;
}

const cards = new Set<BookCard>();

/** Repaint every mounted card. Called once per committed state change. */
export function syncCards(): void {
  for (const card of cards) card.sync();
}

function addButtonLabel(book: Book): string {
  if (book.availability === 'out-of-stock') return 'Unavailable';
  if (book.availability === 'preorder') return 'Pre-order';
  return 'Add to basket';
}

/**
 * One product card.
 *
 * `variant` only changes the arrangement — both carry the same information and
 * the same controls, so switching the catalogue between grid and list never
 * removes an action from the page.
 */
export function bookCard(book: Book, variant: 'grid' | 'list'): BookCard {
  const cover = coverFor(book);
  // Not in the tab order: the title below points at the same page, and one
  // card should cost one tab stop plus its actions. The cover stays out of
  // `aria-hidden` so its alt text is still read in document order.
  const coverLink = h(
    'a',
    { href: `#${bookHref(book.id)}`, class: 'shop-card__cover', tabindex: -1 },
    [h('e-image', { src: cover.src, alt: cover.alt, fit: 'contain' })],
  );

  const addButton = t(
    'e-button',
    {
      variant: 'primary',
      disabled: book.availability === 'out-of-stock',
    },
    addButtonLabel(book),
  );
  const inBasket = t('span', { class: 'shop-card__in-basket' }, '');

  const wishChip = t('e-chip', { selected: inWishlist(book.id) }, '♥ Wishlist');
  const compareChip = t('e-chip', { selected: inComparison(book.id) }, 'Compare');

  const body = div('shop-card__body', [
    t('e-text', { kind: 'label', class: 'shop-card__kicker' }, CATEGORY_LABELS[book.category]),
    h('e-title', { level: 3, class: 'shop-card__title' }, [
      t('a', { href: `#${bookHref(book.id)}` }, book.title),
    ]),
    t('e-text', { kind: 'small', as: 'p', class: 'shop-card__author' }, book.author),
    div('shop-card__badges', [
      t('e-badge', {}, FORMAT_LABELS[book.formats[0]!.id]),
      t('e-badge', {}, LANGUAGE_LABELS[book.language]),
      book.pages > 0 ? t('e-badge', {}, `${book.pages} pp`) : null,
    ]),
    ratingRun(book),
    priceRun(book),
    stockRun(book),
    t('e-text', { kind: 'small', as: 'p', class: 'shop-card__delivery' }, deliveryNote(book)),
    div('shop-card__actions', [addButton, wishChip, compareChip, inBasket]),
  ]);

  const card = h('e-card', { class: 'shop-card__frame' }, [coverLink, body]);
  const framed =
    book.previousPrice != null
      ? h('e-ribbon', { text: `−${discountPercent(listPrice(book), book.previousPrice)} %` }, [
          card,
        ])
      : card;

  const root = h('article', {
    class: `shop-card shop-card--${variant}`,
    'data-book': book.id,
    'aria-label': `${book.title} by ${book.author}`,
  });
  root.appendChild(framed);

  addButton.addEventListener('e-click', () => {
    const line = addToCart(book.id, 1);
    if (!line) return;
    announce(`${book.title} added to the basket. ${line.quantity} in the basket.`);
  });

  onDetail<{ value: boolean }>(wishChip, 'e-change', () => {
    const added = toggleWishlist(book.id);
    announce(
      added ? `${book.title} saved to the wishlist.` : `${book.title} removed from the wishlist.`,
    );
  });

  onDetail<{ value: boolean }>(compareChip, 'e-change', () => {
    const result = toggleComparison(book.id);
    if (result.rejected) {
      // The chip toggled itself before firing; put it back, because nothing
      // was added.
      compareChip.removeAttribute('selected');
      announce(`Comparison already holds ${MAX_COMPARISON} titles. Remove one first.`);
      return;
    }
    announce(
      result.added
        ? `${book.title} added to the comparison, ${state.comparison.length} of ${MAX_COMPARISON}.`
        : `${book.title} removed from the comparison.`,
    );
  });

  const card_: BookCard = {
    root,
    book,
    sync() {
      setFlag(wishChip, 'selected', inWishlist(book.id));
      const comparing = inComparison(book.id);
      setFlag(compareChip, 'selected', comparing);
      setFlag(compareChip, 'disabled', !comparing && state.comparison.length >= MAX_COMPARISON);
      const line = cartLine(book.id);
      const label = line ? `${line.quantity} in basket` : '';
      if (inBasket.textContent !== label) inBasket.textContent = label;
      setAttr(inBasket, 'hidden', line ? null : '');
    },
    dispose() {
      cards.delete(card_);
    },
  };
  card_.sync();
  cards.add(card_);
  return card_;
}

/** A compact "recently viewed" tile — cover, title, price, nothing else. */
export function bookTile(book: Book): HTMLElement {
  const cover = coverFor(book);
  return h('a', { class: 'shop-tile', href: `#${bookHref(book.id)}` }, [
    h('e-image', { src: cover.src, alt: cover.alt, fit: 'contain' }),
    t('span', { class: 'shop-tile__title' }, book.title),
    t('span', { class: 'shop-tile__price' }, eur(listPrice(book))),
  ]);
}

/** Section head: eyebrow, heading and an optional "see all" link. */
export function sectionHead(
  eyebrowText: string,
  heading: string,
  link?: { label: string; href: string },
): HTMLElement {
  const head = div('shop-section__head', [
    div('', [
      t('e-text', { kind: 'label', class: 'shop-eyebrow' }, eyebrowText),
      t('e-title', { level: 2 }, heading),
    ]),
  ]);
  // A real `href`: the hash change drives the router, so the link works with
  // the keyboard, the middle mouse button and JavaScript switched off.
  if (link) head.appendChild(t('e-link', { href: `#${link.href}` }, link.label));
  return head;
}
