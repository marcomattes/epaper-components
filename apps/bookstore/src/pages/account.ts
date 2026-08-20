// The customer account.
//
// A reading record rather than a dashboard: order history, what has been
// spent, what is on the way, and the preferences that decide how the shop is
// rendered on this device.

import { bookById, FORMAT_LABELS, listPrice, UPCOMING, type Book, type FormatId } from '../books';
import { div, h, onDetail, setAttr, setText, t } from '../dom';
import { eur, eurAmount, longDate } from '../format';
import { announce } from '../announce';
import { bookHref, catalogHref, navigate } from '../router';
import {
  addToCart,
  HOUSEHOLD,
  MONTH_LABELS,
  onStateChange,
  PROFILE,
  resetDemoData,
  setPreference,
  signIn,
  signOut,
  SPEND_BY_MONTH,
  state,
  toggleWishlist,
  type Order,
  type OrderStatus,
} from '../state';
import type { Page } from '../page';

const STATUS_LABELS: Record<OrderStatus, string> = {
  delivered: 'Delivered',
  shipped: 'On the way',
  packing: 'Being packed',
  cancelled: 'Cancelled',
};

/** Order statuses mapped onto the board's own vocabulary. */
const STATUS_TONE: Record<OrderStatus, string> = {
  delivered: 'ok',
  shipped: 'warning',
  packing: 'neutral',
  cancelled: 'critical',
};

const TOPICS = [
  { value: 'new-releases', label: 'New releases' },
  { value: 'e-paper', label: 'E-paper and typography' },
  { value: 'events', label: 'Reading-room events' },
  { value: 'staff', label: 'Staff picks' },
];

const ORDER_COLUMNS = [
  { key: 'id', title: 'Order', sortable: true, width: '150px' },
  { key: 'placed', title: 'Placed', sortable: true, width: '120px' },
  { key: 'status', title: 'Status', sortable: true },
  { key: 'delivery', title: 'Delivery' },
  { key: 'titles', title: 'Titles', align: 'right' as const, width: '80px' },
  { key: 'total', title: 'Total', sortable: true, align: 'right' as const, width: '110px' },
];

const orderTitles = (order: Order): number =>
  order.lines.reduce((sum, line) => sum + line.quantity, 0);

export function createAccountPage(): Page {
  let sortKey = 'placed';
  let sortDirection: 'asc' | 'desc' | 'none' = 'desc';

  /* ---------------- profile ---------------- */

  const avatar = h('e-avatar', { name: PROFILE.name, size: 64, shape: 'circle' });
  const profileFacts = div('shop-account__facts');
  const household = h(
    'e-avatar-group',
    { max: 4, size: 34 },
    HOUSEHOLD.map((member) => h('e-avatar-item', { name: member.name })),
  );
  const lastUpdated = h('e-last-updated', {
    datetime: state.updatedAt,
    label: 'Account data',
    'stale-after': 3600,
    'expired-after': 86_400,
    'show-absolute': true,
  });

  /* ---------------- statistics ---------------- */

  const spentStat = h('e-statistic', { label: 'Spent with Inkbound', value: '', prefix: '€ ' });
  const ordersStat = h('e-statistic', { label: 'Orders placed', value: '0' });
  const averageStat = h('e-statistic', { label: 'Average order', value: '', prefix: '€ ' });
  const spendLine = h('e-sparkline', {
    label: `Spend by month, ${MONTH_LABELS[0]}–${MONTH_LABELS.at(-1)}`,
    values: JSON.stringify(SPEND_BY_MONTH),
  });
  const monthChange = h('e-change-marker', {
    label: 'This month against last',
    value: SPEND_BY_MONTH.at(-1) ?? 0,
    previous: SPEND_BY_MONTH.at(-2) ?? 0,
    prefix: '€ ',
    precision: 0,
    'show-previous': true,
    announce: true,
  });
  const statusBoard = h('e-status-board', {
    label: 'Order status',
    columns: 4,
    data: '[]',
    'empty-text': 'No orders yet',
  });

  /* ---------------- orders ---------------- */

  const orderTable = h('e-table', {
    columns: JSON.stringify(ORDER_COLUMNS),
    data: '[]',
    sort: 'placed:desc',
    'empty-text': 'No orders in this account yet',
  });
  const orderTimeline = div('shop-account__timeline');

  /* ---------------- calendar ---------------- */

  const calendar = h('e-calendar', {
    value: UPCOMING[0]?.date ?? '',
    events: JSON.stringify(
      UPCOMING.map((entry) => ({
        date: entry.date,
        title: bookById(entry.id)?.title ?? 'Release',
      })),
    ),
  });
  const calendarNote = t('e-text', { kind: 'small', as: 'p' }, '');

  /* ---------------- wishlist ---------------- */

  const wishlistSlot = div('shop-account__wishlist');
  const wishlistEmpty = h('e-empty', {
    icon: 'heart',
    title: 'Nothing saved yet',
    description: 'The heart on any product card puts a title here for later.',
  });
  const wishlistEmptyAction = t(
    'e-button',
    { slot: 'action', variant: 'primary' },
    'Find something',
  );
  wishlistEmpty.appendChild(wishlistEmptyAction);
  wishlistEmptyAction.addEventListener('e-click', () => navigate(catalogHref({})));

  /* ---------------- preferences ---------------- */

  const topicGroup = h(
    'e-checkbox-group',
    { layout: 'vertical', value: state.preferences.topics.join(',') },
    TOPICS.map((topic) => h('e-cbox-option', { value: topic.value, label: topic.label })),
  );
  const formatSelect = h(
    'e-select',
    { value: state.preferences.format },
    (Object.keys(FORMAT_LABELS) as FormatId[]).map((id) =>
      h('e-option', { value: id, label: FORMAT_LABELS[id] }),
    ),
  );
  const languageGroup = h(
    'e-radio-group',
    { layout: 'horizontal', value: state.preferences.language },
    [
      h('e-radio', { value: 'en', label: 'English' }),
      h('e-radio', { value: 'de', label: 'German' }),
    ],
  );
  const invoiceToggle = h('e-toggle', {
    label: 'Invoices by email',
    checked: state.preferences.invoiceByEmail,
  });
  const displaySummary = t('e-text', { kind: 'small', as: 'p' }, '');

  /* ---------------- danger zone ---------------- */

  const resetDialog = h(
    'e-dialog',
    { heading: 'Reset the demo data?', size: 'small', static: true },
    [
      t(
        'e-text',
        { kind: 'prose', as: 'p' },
        'This puts the basket, the wishlist, the comparison list, the order history and every ' +
          'preference back to the state a fresh visitor sees. It cannot be undone, and it clears ' +
          'what this browser has stored for the shop.',
      ),
      t('e-button', { slot: 'footer', 'data-close': '' }, 'Keep my data'),
      t(
        'e-button',
        { slot: 'footer', variant: 'destructive', id: 'reset-confirm' },
        'Reset everything',
      ),
    ],
  );
  const resetConfirm = resetDialog.querySelector<HTMLElement>('#reset-confirm')!;
  const resetButton = t('e-button', { variant: 'destructive' }, 'Reset the demo data');
  const signOutButton = t('e-button', {}, 'Sign out');

  const signedOutAction = t('e-button', { slot: 'action', variant: 'primary' }, 'Sign back in');
  const signedOut = h(
    'e-result',
    {
      status: 'info',
      title: 'Signed out',
      description: 'The demo account is signed out on this device. Nothing was deleted.',
    },
    [signedOutAction],
  );
  signedOut.hidden = true;

  /* ---------------- assembly ---------------- */

  const body = div('shop-account', [
    h('section', { class: 'shop-section' }, [
      h('e-card', { class: 'shop-account__profile', eyebrow: 'Account', title: PROFILE.name }, [
        div('shop-account__identity', [
          avatar,
          div('', [
            t('e-text', { kind: 'small', as: 'p' }, `${PROFILE.tier} · ${PROFILE.city}`),
            t('e-text', { kind: 'small', as: 'p' }, PROFILE.email),
            lastUpdated,
          ]),
        ]),
        profileFacts,
        h('e-divider', { variant: 'dashed', label: 'Household' }),
        t(
          'e-text',
          { kind: 'small', as: 'p' },
          'Everyone on this account can order to the same address.',
        ),
        household,
      ]),
      h(
        'e-grid',
        { cols: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18, class: 'shop-account__stats' },
        [spentStat, ordersStat, averageStat],
      ),
      h('e-grid', { cols: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18 }, [
        h('e-card', { eyebrow: 'Spending', title: 'The last twelve months' }, [
          spendLine,
          monthChange,
        ]),
        h('e-card', { eyebrow: 'Fulfilment', title: 'Where the orders are' }, [statusBoard]),
      ]),
    ]),
    h('e-divider', {}),
    h('section', { class: 'shop-section' }, [
      t('e-title', { level: 2 }, 'Order history'),
      t(
        'e-text',
        { kind: 'small', as: 'p' },
        'Sort by order number, date, status or total. The table reports the sort; the rows are ' +
          'reordered here, so the panel repaints once per click.',
      ),
      orderTable,
      t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Most recent order'),
      orderTimeline,
    ]),
    h('e-divider', {}),
    h('e-grid', { cols: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18 }, [
      h('e-card', { eyebrow: 'Coming up', title: 'Publication calendar' }, [
        calendar,
        calendarNote,
      ]),
      h('e-card', { eyebrow: 'Saved', title: 'Wishlist' }, [wishlistSlot, wishlistEmpty]),
    ]),
    h('e-divider', {}),
    h('section', { class: 'shop-section' }, [
      t('e-title', { level: 2 }, 'Preferences'),
      h('e-grid', { cols: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18 }, [
        h('e-card', { eyebrow: 'Post', title: 'What the shop sends' }, [
          h('fieldset', { class: 'shop-fieldset' }, [
            t('legend', { class: 'shop-fieldset__legend' }, 'Topics'),
            topicGroup,
          ]),
          h('e-form-item', { label: 'Preferred format' }, [formatSelect]),
          h('fieldset', { class: 'shop-fieldset' }, [
            t('legend', { class: 'shop-fieldset__legend' }, 'Catalogue language'),
            languageGroup,
          ]),
          invoiceToggle,
        ]),
        h('e-card', { eyebrow: 'This device', title: 'Display preferences' }, [
          displaySummary,
          t('e-link', { href: '#/display' }, 'Open the Display Lab'),
          h('e-divider', {}),
          t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Demo controls'),
          t(
            'e-text',
            { kind: 'small', as: 'p' },
            'Everything this shop remembers lives in this browser. Nothing is sent anywhere.',
          ),
          h('e-space', { size: 12, wrap: true }, [resetButton, signOutButton]),
        ]),
      ]),
    ]),
  ]);

  const el = div('shop-page shop-page--account', [
    h('header', { class: 'shop-masthead' }, [
      t('e-title', { level: 1 }, 'Your account'),
      t(
        'e-text',
        { kind: 'prose', as: 'p', class: 'shop-lede' },
        'A demo account with a made-up order history. Everything here is stored in this browser ' +
          'and can be reset in one step.',
      ),
    ]),
    signedOut,
    body,
    resetDialog,
  ]);

  /* ---------------- rendering ---------------- */

  function sortedOrders(): Order[] {
    const rows = [...state.orders];
    if (sortDirection === 'none') return rows;
    const factor = sortDirection === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      switch (sortKey) {
        case 'id':
          return a.id.localeCompare(b.id) * factor;
        case 'status':
          return STATUS_LABELS[a.status].localeCompare(STATUS_LABELS[b.status]) * factor;
        case 'total':
          return (a.total - b.total) * factor;
        default:
          return a.placed.localeCompare(b.placed) * factor;
      }
    });
    return rows;
  }

  function renderOrders(): void {
    const rows = sortedOrders().map((order) => ({
      id: order.id,
      placed: order.placed,
      status: STATUS_LABELS[order.status],
      delivery: order.delivery,
      titles: orderTitles(order),
      total: eur(order.total),
    }));
    setAttr(orderTable, 'data', JSON.stringify(rows));
    setAttr(orderTable, 'sort', sortDirection === 'none' ? null : `${sortKey}:${sortDirection}`);
  }

  function renderTimeline(): void {
    const order = state.orders[0];
    if (!order) {
      orderTimeline.replaceChildren(
        t('e-text', { kind: 'small', as: 'p' }, 'No orders to trace yet.'),
      );
      return;
    }
    const reached: Record<OrderStatus, number> = {
      cancelled: 1,
      packing: 2,
      shipped: 3,
      delivered: 4,
    };
    const stage = reached[order.status];
    const mark = (index: number): string => {
      if (order.status === 'cancelled' && index > 1) return 'pending';
      return index <= stage ? 'done' : 'pending';
    };

    orderTimeline.replaceChildren(
      h('e-timeline', { 'time-position': 'left' }, [
        h(
          'e-timeline-item',
          { time: order.placed, title: `Order ${order.id} placed`, variant: 'done' },
          [`${orderTitles(order)} title(s) · ${eur(order.total)} · ${order.delivery}`],
        ),
        h('e-timeline-item', { time: 'Warehouse', title: 'Picked and packed', variant: mark(2) }, [
          'Packed in the Hamburg warehouse, Monday to Friday.',
        ]),
        h('e-timeline-item', { time: 'Carrier', title: 'Handed to DHL', variant: mark(3) }, [
          order.delivery === 'pickup'
            ? 'Collection order — moved to the reading-room shelf instead.'
            : 'Tracked parcel, two to four working days.',
        ]),
        h('e-timeline-item', { time: 'Door', title: 'Delivered', variant: mark(4) }, [
          order.status === 'cancelled'
            ? 'Cancelled before dispatch. Nothing was charged.'
            : STATUS_LABELS[order.status],
        ]),
      ]),
    );
  }

  function renderStats(): void {
    const billable = state.orders.filter((order) => order.status !== 'cancelled');
    const spent = billable.reduce((sum, order) => sum + order.total, 0);
    setAttr(spentStat, 'value', eurAmount(spent));
    setAttr(ordersStat, 'value', String(state.orders.length));
    setAttr(averageStat, 'value', eurAmount(billable.length > 0 ? spent / billable.length : 0));

    const counts = new Map<OrderStatus, number>();
    for (const order of state.orders) {
      counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
    }
    const boardData = (Object.keys(STATUS_LABELS) as OrderStatus[]).map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      value: counts.get(status) ?? 0,
      status: STATUS_TONE[status],
      detail: status === 'shipped' ? 'Tracked with DHL' : '',
    }));
    setAttr(statusBoard, 'data', JSON.stringify(boardData));

    profileFacts.replaceChildren(
      h('e-description-list', { columns: 2, bordered: true, layout: 'vertical' }, [
        t('e-desc-item', { term: 'Member since' }, longDate(PROFILE.member)),
        t('e-desc-item', { term: 'Orders' }, String(state.orders.length)),
        t('e-desc-item', { term: 'Wishlist' }, `${state.wishlist.length} titles`),
        t('e-desc-item', { term: 'Basket' }, `${state.cart.length} lines`),
      ]),
    );
    setAttr(lastUpdated, 'datetime', state.updatedAt);
  }

  function renderWishlist(): void {
    const books = state.wishlist
      .map((id) => bookById(id))
      .filter((book): book is Book => book != null);
    setAttr(wishlistEmpty, 'hidden', books.length > 0 ? '' : null);
    setAttr(wishlistSlot, 'hidden', books.length > 0 ? null : '');
    if (books.length === 0) {
      wishlistSlot.replaceChildren();
      return;
    }

    const list = h('e-list', { bordered: true, 'header-title': `${books.length} saved titles` });
    for (const book of books) {
      const add = t('e-button', { variant: 'primary' }, 'Add to basket');
      add.addEventListener('e-click', () => {
        addToCart(book.id, 1);
        announce(`${book.title} added to the basket.`);
      });
      const remove = h(
        'e-popconfirm',
        {
          message: `Remove “${book.title}” from the wishlist?`,
          'confirm-label': 'Remove',
          'cancel-label': 'Keep it',
          align: 'right',
        },
        [t('e-button', { slot: 'trigger', variant: 'destructive' }, 'Remove')],
      );
      onDetail<{ value: boolean }>(remove, 'e-confirm', () => {
        toggleWishlist(book.id);
        announce(`${book.title} removed from the wishlist.`);
      });

      list.appendChild(
        h('e-list-item', {}, [
          h('e-space', { slot: 'trailing', size: 8, wrap: true }, [add, remove]),
          div('shop-listrow', [
            h('e-title', { level: 3 }, [t('a', { href: `#${bookHref(book.id)}` }, book.title)]),
            t('e-text', { kind: 'small', as: 'p' }, `${book.author} · ${eur(listPrice(book))}`),
          ]),
        ]),
      );
    }
    wishlistSlot.replaceChildren(list);
  }

  function renderPreferences(): void {
    setAttr(topicGroup, 'value', state.preferences.topics.join(','));
    setAttr(formatSelect, 'value', state.preferences.format);
    setAttr(languageGroup, 'value', state.preferences.language);
    setAttr(invoiceToggle, 'checked', state.preferences.invoiceByEmail ? '' : null);
    setText(
      displaySummary,
      `Mode: ${state.display.mode === 'kaleido' ? 'Kaleido colour' : 'Monochrome'} · ` +
        `text ${state.display.textSize} · layout ${state.display.density} · ` +
        `watermark ${state.display.watermark ? 'on' : 'off'}.`,
    );
  }

  function renderCalendar(): void {
    const next = UPCOMING[0];
    const book = next ? bookById(next.id) : undefined;
    setText(
      calendarNote,
      book && next
        ? `Next out: ${book.title}, ${longDate(next.date)}. Pre-orders are charged on dispatch.`
        : 'No announced titles at the moment.',
    );
  }

  function renderSignedIn(): void {
    const signedIn = state.signedIn;
    setAttr(body, 'hidden', signedIn ? null : '');
    setAttr(signedOut, 'hidden', signedIn ? '' : null);
  }

  function paint(): void {
    renderStats();
    renderOrders();
    renderTimeline();
    renderWishlist();
    renderPreferences();
    renderCalendar();
    renderSignedIn();
  }

  /* ---------------- events ---------------- */

  onDetail<{ key: string; direction: 'asc' | 'desc' | 'none' }>(
    orderTable,
    'e-sort',
    ({ key, direction }) => {
      sortKey = key;
      sortDirection = direction;
      renderOrders();
      if (direction === 'none') {
        announce('Order history back in its original order.');
      } else {
        const orderWord = direction === 'asc' ? 'ascending' : 'descending';
        announce(`Order history sorted by ${key}, ${orderWord}.`);
      }
    },
  );

  onDetail<{ value: string }>(calendar, 'e-change', ({ value }) => {
    const entry = UPCOMING.find((item) => item.date === value);
    const book = entry ? bookById(entry.id) : undefined;
    announce(
      book
        ? `${book.title} is published on ${longDate(value)}.`
        : `${longDate(value)}: nothing due.`,
    );
  });

  onDetail<{ value: string[] }>(topicGroup, 'e-change', ({ value }) => {
    setPreference('topics', value);
    announce(`Subscribed to ${value.length} topic${value.length === 1 ? '' : 's'}.`);
  });

  onDetail<{ value: string }>(formatSelect, 'e-change', ({ value }) => {
    setPreference('format', value as FormatId);
    announce(`Preferred format: ${FORMAT_LABELS[value as FormatId]}.`);
  });

  onDetail<{ value: string }>(languageGroup, 'e-change', ({ value }) => {
    setPreference('language', value === 'de' ? 'de' : 'en');
    announce(`Catalogue language: ${value === 'de' ? 'German' : 'English'}.`);
  });

  onDetail<{ checked: boolean }>(invoiceToggle, 'e-change', ({ checked }) => {
    setPreference('invoiceByEmail', checked);
    announce(checked ? 'Invoices will be emailed.' : 'Invoices will travel with the parcel.');
  });

  resetButton.addEventListener('e-click', () => resetDialog.setAttribute('open', ''));
  resetConfirm.addEventListener('e-click', () => {
    resetDialog.removeAttribute('open');
    resetDemoData();
    sortKey = 'placed';
    sortDirection = 'desc';
    paint();
    announce(
      'Demo data reset. Basket, wishlist, orders and preferences are back to their defaults.',
    );
    resetButton.focus();
  });

  signOutButton.addEventListener('e-click', () => {
    signOut();
    announce('Signed out of the demo account.');
    signedOutAction.focus();
  });

  signedOutAction.addEventListener('e-click', () => {
    signIn();
    announce('Signed back in.');
    signOutButton.focus();
  });

  onStateChange(paint);

  return {
    el,
    sider: null,
    enter() {
      paint();
      return {
        title: 'Account',
        trail: [{ label: 'Shop', href: '#/' }, { label: 'Account' }],
      };
    },
  };
}
