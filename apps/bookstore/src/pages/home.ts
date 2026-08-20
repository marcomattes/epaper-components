// The storefront.
//
// A front page in the shape of a broadsheet: masthead lede, one featured
// title, then four shelves and the editorial column that explains why the shop
// looks like this.

import {
  bookById,
  BOOKS,
  CATEGORY_LABELS,
  FEATURED_ID,
  listPrice,
  publisherName,
  SHELF_LABELS,
  type Book,
  type ShelfId,
} from '../books';
import { div, h, setAttr, t, type Child } from '../dom';
import { deliveryWindow, eur, eurAmount, longDate } from '../format';
import { bookHref, catalogHref } from '../router';
import { addToCart, onStateChange, state } from '../state';
import { announce } from '../announce';
import { bookCard, bookTile, coverFor, ratingRun, sectionHead, stockRun } from '../ui';
import type { Page } from '../page';

const shelf = (id: ShelfId): Book[] => BOOKS.filter((book) => book.shelves.includes(id));

function featuredBlock(book: Book): HTMLElement {
  const cover = coverFor(book);
  const add = t('e-button', { variant: 'primary' }, 'Add to basket');
  add.addEventListener('e-click', () => {
    addToCart(book.id, 1);
    announce(`${book.title} added to the basket.`);
  });

  return h('e-card', { class: 'shop-hero', eyebrow: 'Book of the month' }, [
    div('shop-hero__grid', [
      h('a', { class: 'shop-hero__cover', href: `#${bookHref(book.id)}`, tabindex: -1 }, [
        h('e-image', { src: cover.src, alt: cover.alt, fit: 'contain' }),
      ]),
      div('shop-hero__body', [
        t('e-text', { kind: 'label', class: 'shop-eyebrow' }, CATEGORY_LABELS[book.category]),
        h('e-title', { level: 2 }, [t('a', { href: `#${bookHref(book.id)}` }, book.title)]),
        t('e-text', { kind: 'prose', as: 'p', class: 'shop-hero__subtitle' }, book.subtitle),
        t(
          'e-text',
          { kind: 'small', as: 'p' },
          `${book.author} · ${publisherName(book)} · ${longDate(book.published)}`,
        ),
        t('e-text', { kind: 'prose', as: 'p', class: 'shop-hero__blurb' }, book.long),
        ratingRun(book),
        div('shop-hero__facts', [
          h('e-statistic', {
            label: 'Hardcover',
            value: eurAmount(listPrice(book)),
            prefix: '€ ',
          }),
          h('e-statistic', { label: 'Pages', value: book.pages }),
          h('e-statistic', { label: 'Rating', value: book.rating, precision: 1, suffix: ' / 5' }),
        ]),
        stockRun(book),
        t(
          'e-text',
          { kind: 'small', as: 'p' },
          `Delivery ${deliveryWindow(book.deliveryDays)} · free from €29 within Germany`,
        ),
        h('e-space', { size: 12, wrap: true }, [
          add,
          t('e-link', { href: `#${bookHref(book.id)}` }, 'Read the full description'),
        ]),
      ]),
    ]),
  ]);
}

function shelfGrid(id: ShelfId, cols: string): HTMLElement {
  const grid = h('e-grid', { cols, gap: 18, class: 'shop-shelf' });
  for (const book of shelf(id)) {
    grid.appendChild(h('e-grid-item', { col: 'span 1' }, [bookCard(book, 'grid').root]));
  }
  return grid;
}

function bestsellerList(): HTMLElement {
  const list = h('e-list', { bordered: true, 'header-title': 'This month at the counter' });
  shelf('best').forEach((book, index) => {
    const cover = coverFor(book);
    const buy = t('e-button', { slot: 'trailing', variant: 'primary' }, 'Add');
    buy.addEventListener('e-click', () => {
      addToCart(book.id, 1);
      announce(`${book.title} added to the basket.`);
    });
    list.appendChild(
      h('e-list-item', {}, [
        h('div', { slot: 'leading', class: 'shop-rank' }, [
          t('span', { class: 'shop-rank__num' }, String(index + 1)),
          h('e-image', { src: cover.src, alt: cover.alt, fit: 'contain' }),
        ]),
        buy,
        div('shop-listrow', [
          h('e-title', { level: 3 }, [t('a', { href: `#${bookHref(book.id)}` }, book.title)]),
          t(
            'e-text',
            { kind: 'small', as: 'p' },
            `${book.author} · ${CATEGORY_LABELS[book.category]} · ${eur(listPrice(book))}`,
          ),
        ]),
      ]),
    );
  });
  return list;
}

function editorialColumn(): HTMLElement {
  return h('e-collapse', { 'default-open': 'why' }, [
    h('e-collapse-panel', { key: 'why', heading: 'Why this shop looks like this' }, [
      t(
        'e-text',
        { kind: 'prose', as: 'p' },
        'Inkbound is built for reflective panels. There is no animation, no hover state and no ' +
          'colour-only status anywhere in the shop, because none of those survive a display ' +
          'that repaints in one step and holds its image without power.',
      ),
    ]),
    h('e-collapse-panel', { key: 'reading', heading: 'Reading on a reflective panel' }, [
      t(
        'e-text',
        { kind: 'prose', as: 'p' },
        'Contrast on e-paper comes from ambient light, not from a backlight. Heavier hairlines ' +
          'and wider letter spacing read better; thin display faces disappear. The Display Lab ' +
          'lets you compare the two settings this shop ships with.',
      ),
    ]),
    h('e-collapse-panel', { key: 'refresh', heading: 'Refresh, ghosting and waiting well' }, [
      t(
        'e-text',
        { kind: 'prose', as: 'p' },
        'A partial refresh repaints only the rectangle that changed and takes tens of ' +
          'milliseconds. A full refresh clears the whole panel and takes several hundred. Every ' +
          'interaction here is built to need the first one.',
      ),
    ]),
  ]);
}

function teaserCards(): HTMLElement {
  return h(
    'e-grid',
    { cols: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18, class: 'shop-teasers' },
    [
      h('e-card-image', { cover: 'hatch', eyebrow: 'Gifts', title: 'Inkbound gift cards' }, [
        t(
          'e-text',
          { kind: 'small', as: 'p' },
          'Any amount from €10. Delivered as a printable card, or as artwork you upload yourself ' +
            'during checkout.',
        ),
        t('div', { slot: 'footer' }, 'Redeemable in the shop and the reading room'),
      ]),
      h('e-card-image', { cover: 'hatch', eyebrow: 'Membership', title: 'The reading room' }, [
        t(
          'e-text',
          { kind: 'small', as: 'p' },
          'Members get first refusal on limited printings, a standing 5 % discount and a chair by ' +
            'the window on Thursdays.',
        ),
        t('div', { slot: 'footer' }, '€48 a year · cancel any time'),
      ]),
    ],
  );
}

export function createHomePage(): Page {
  const featured = bookById(FEATURED_ID)!;

  const recentStrip = h('e-space', { size: 14, wrap: true, class: 'shop-tiles' });
  const recentEmpty = h('e-empty', {
    icon: 'eye',
    title: 'Nothing viewed yet',
    description: 'Titles you open appear here so you can find your way back to them.',
  });

  const section = (children: readonly Child[]): HTMLElement =>
    h('section', { class: 'shop-section' }, children);

  const el = div('shop-page shop-page--home', [
    h('e-alert', { variant: 'info', heading: 'Demonstration shop', closable: true }, [
      'Inkbound Books is a demo for the EPaper component library. Every title, author and price ' +
        'here is invented, nothing is dispatched and no payment is ever taken.',
      t('e-link', { slot: 'action', href: '#/display' }, 'Open the Display Lab'),
    ]),
    h('header', { class: 'shop-masthead' }, [
      t('e-title', { level: 1 }, 'An independent bookshop for reflective screens'),
      t(
        'e-text',
        { kind: 'prose', as: 'p', class: 'shop-lede' },
        'Twenty titles, eight shelves, and a shopfront designed to be read in daylight on a ' +
          '1024 × 758 panel. Ships from Hamburg.',
      ),
    ]),
    section([featuredBlock(featured)]),
    h('e-divider', {}),
    section([
      sectionHead('Fresh from the binder', SHELF_LABELS.new, {
        label: 'See the whole catalogue',
        href: catalogHref({ sort: 'date' }),
      }),
      shelfGrid('new', 'repeat(auto-fill,minmax(228px,1fr))'),
    ]),
    h('e-divider', { variant: 'dashed', label: 'Chosen by the counter' }),
    section([
      sectionHead('Hand-sold', SHELF_LABELS.staff),
      h(
        'e-masonry',
        { columns: 3, gap: 18 },
        shelf('staff').map((book) => bookCard(book, 'grid').root),
      ),
    ]),
    h('e-divider', {}),
    section([
      sectionHead('Marked down', SHELF_LABELS.deal, {
        label: 'All reduced titles',
        href: catalogHref({ shelf: 'deal' }),
      }),
      shelfGrid('deal', 'repeat(auto-fill,minmax(228px,1fr))'),
    ]),
    h('e-divider', {}),
    section([sectionHead('Counted at the till', SHELF_LABELS.best), bestsellerList()]),
    h('e-divider', {}),
    section([sectionHead('Where you left off', 'Recently viewed'), recentStrip, recentEmpty]),
    h('e-divider', {}),
    section([
      sectionHead('From the counter', 'Shopping on an e-paper device'),
      div('shop-editorial', [editorialColumn(), teaserCards()]),
    ]),
  ]);

  function syncRecent(): void {
    const books = state.recentlyViewed
      .map((id) => bookById(id))
      .filter((book): book is Book => book != null);
    // A strip of at most six tiles: cheap to rebuild, and the alternative
    // (diffing six anchors) would repaint the same rectangle anyway.
    recentStrip.replaceChildren(...books.map((book) => bookTile(book)));
    setAttr(recentStrip, 'hidden', books.length > 0 ? null : '');
    setAttr(recentEmpty, 'hidden', books.length > 0 ? '' : null);
  }

  syncRecent();
  onStateChange(syncRecent);

  return {
    el,
    sider: null,
    enter() {
      syncRecent();
      return { title: 'Inkbound Books', trail: [{ label: 'Shop' }] };
    },
  };
}
