// The shop chrome: masthead, department rail, footer, floating actions and the
// router that swaps the seven views underneath them.
//
// A view is built the first time it is reached and then kept. Navigation is a
// `hidden` toggle plus whatever the view patches in `enter()`, so moving
// between pages repaints the content area and leaves the surrounding chrome
// untouched.

import { CATEGORY_LABELS, CATEGORY_TREE, SHELF_LABELS, type CategoryId } from './books';
import { announce, createAnnouncer } from './announce';
import { createComparisonDialog, openComparison, refreshComparison } from './comparison';
import { div, fieldValue, h, onDetail, setAttr, setText, t } from './dom';
import { catalogHref, navigate, onRoute, startRouter, type Route, type RouteName } from './router';
import { cartCount, onStateChange, state } from './state';
import { syncCards } from './ui';
import type { Crumb, Page } from './page';
import { createHomePage } from './pages/home';
import { createCatalogPage } from './pages/catalog';
import { createProductPage } from './pages/product';
import { createCartPage } from './pages/cart';
import { createCheckoutPage } from './pages/checkout';
import { createAccountPage } from './pages/account';
import { createDisplayLabPage } from './pages/display-lab';

/** `<e-collapse>` exposes its open panels as a property, not an attribute. */
interface CollapseElement extends HTMLElement {
  value: string[];
}

const FACTORIES: Record<Exclude<RouteName, 'not-found'>, () => Page> = {
  home: createHomePage,
  catalog: createCatalogPage,
  book: createProductPage,
  cart: createCartPage,
  checkout: createCheckoutPage,
  account: createAccountPage,
  display: createDisplayLabPage,
};

const ACCOUNT_ACTIONS = [
  { label: 'Your account', icon: 'user', href: '/account' },
  { label: 'Order history', icon: 'doc', href: '/account' },
  { label: 'Wishlist', icon: 'heart', href: '/account' },
  { label: 'Display Lab', icon: 'sun', href: '/display' },
  { label: 'Basket', icon: 'folder', href: '/cart' },
];

const HELP_PANELS = [
  {
    key: 'ordering',
    heading: 'Ordering and payment',
    body:
      'Add a title to the basket, then work through the four checkout steps. Payment is settled ' +
      'on invoice, by SEPA direct debit or at the counter. This demo never asks for a card ' +
      'number, an IBAN or any other payment detail, and nothing is ever charged.',
  },
  {
    key: 'delivery',
    heading: 'Delivery and dispatch',
    body:
      'Standard delivery inside Germany costs €3,90 and is free from €29 goods value. Express ' +
      'costs €7,90 and leaves the same working day if ordered before 13:00. Collection from the ' +
      'reading room is free, Monday to Saturday, 10:00 to 18:30.',
  },
  {
    key: 'returns',
    heading: 'Returns and right of withdrawal',
    body:
      'Fourteen days from delivery, no reason needed, return postage paid. Sealed audio editions ' +
      'are excluded once the seal is broken. Refunds go back to the original settlement method ' +
      'within five working days.',
  },
  {
    key: 'legal',
    heading: 'Legal notice and privacy',
    body:
      'Inkbound Books is a fictional shop written to demonstrate the EPaper component library. ' +
      'There is no company, no VAT number and no data controller. The only data stored is the ' +
      'basket, wishlist, comparison list and display preferences, kept in this browser under a ' +
      'single localStorage key and removable from the account page.',
  },
  {
    key: 'demo',
    heading: 'About this demonstration',
    body:
      'Every component on every page comes from the EPaper library, used through its documented ' +
      'attributes, slots and events. Nothing animates, nothing depends on hover and no status is ' +
      'carried by colour alone, because none of those survive an electrophoretic panel.',
  },
];

let syncCounts: (() => void) | null = null;

/** Repaint the basket and wishlist counters wherever they appear. */
export function updateGlobalCounts(): void {
  syncCounts?.();
}

export function mountShop(root: HTMLElement): void {
  const pages = new Map<RouteName, Page>();
  let activePage: Page | null = null;
  let activeName: RouteName | null = null;

  /* ---------------- header ---------------- */

  const searchInput = h('e-input', {
    type: 'search',
    placeholder: 'Search titles, authors, ISBNs',
    'aria-label': 'Search the catalogue',
  });
  const searchButton = t('e-button', { variant: 'primary' }, 'Search');
  const searchForm = h('form', { class: 'shop-search', role: 'search' }, [
    searchInput,
    searchButton,
  ]);

  const departmentsDropdown = h('e-dropdown', { align: 'left' }, [
    t('e-button', { slot: 'trigger' }, 'Departments'),
    h('e-dropdown-item', { header: 'Browse by shelf' }),
    ...(Object.keys(CATEGORY_LABELS) as CategoryId[]).map((id) =>
      h('e-dropdown-item', { icon: 'folder', label: CATEGORY_LABELS[id] }),
    ),
    h('e-dropdown-item', { divider: true }),
    h('e-dropdown-item', { icon: 'search', label: 'Everything in print', shortcut: 'All' }),
  ]);
  const departmentTargets: string[] = [
    ...(Object.keys(CATEGORY_LABELS) as CategoryId[]).map((id) => catalogHref({ cat: id })),
    catalogHref({}),
  ];

  const accountDropdown = h('e-dropdown', { align: 'right' }, [
    t('e-button', { slot: 'trigger' }, 'Account'),
    h('e-dropdown-item', { header: 'Jonna Weiss' }),
    ...ACCOUNT_ACTIONS.map((action) =>
      h('e-dropdown-item', { icon: action.icon, label: action.label }),
    ),
    h('e-dropdown-item', { divider: true }),
    h('e-dropdown-item', { icon: 'lock', label: 'Sign out', shortcut: 'Demo' }),
  ]);

  // The counts live in the badge chip *and*, for screen readers, in a hidden
  // span inside each button. The label spans belong to this module, so their
  // text can be patched — `<e-button>` moves its children into an inner
  // `<button>`, and writing to the host would destroy that button.
  const wishlistCountLabel = t('span', { class: 'shop-sr' }, '');
  const wishlistButton = h('e-button', {}, [t('span', {}, '♥ Wishlist'), wishlistCountLabel]);
  const wishlistBadge = h('e-badge-count', { count: 0, max: 99 }, [wishlistButton]);

  const cartCountLabel = t('span', { class: 'shop-sr' }, '');
  const cartButton = h('e-button', {}, [t('span', {}, 'Basket'), cartCountLabel]);
  const cartBadge = h('e-badge-count', { count: 0, max: 99 }, [cartButton]);

  const header = h('e-layout-header', {}, [
    div('shop-header', [
      h('a', { class: 'shop-brand', href: '#/' }, [
        t('span', { class: 'shop-brand__mark' }, 'Inkbound'),
        t('span', { class: 'shop-brand__rule' }, '·'),
        t('span', { class: 'shop-brand__sub' }, 'Books'),
      ]),
      searchForm,
      h('e-space', { size: 10, wrap: true, class: 'shop-header__actions' }, [
        departmentsDropdown,
        accountDropdown,
        wishlistBadge,
        cartBadge,
      ]),
    ]),
  ]);

  /* ---------------- sider ---------------- */

  const menu = h('e-menu', { mode: 'vertical', value: 'home' }, [
    h('e-menu-item', { value: 'home', icon: 'home', label: 'Storefront' }),
    h('e-menu-item', { value: 'catalog', icon: 'search', label: 'All titles' }),
    h(
      'e-menu-item',
      { value: 'departments', icon: 'folder', label: 'Departments' },
      CATEGORY_TREE.flatMap((department) =>
        (department.children ?? []).map((child) =>
          h('e-menu-item', { value: `cat:${child.value}`, label: child.label }),
        ),
      ),
    ),
    h('e-menu-item', { value: 'shelves', icon: 'bookmark', label: 'Shelves' }, [
      h('e-menu-item', { value: 'shelf:new', label: SHELF_LABELS.new }),
      h('e-menu-item', { value: 'shelf:staff', label: SHELF_LABELS.staff }),
      h('e-menu-item', { value: 'shelf:deal', label: SHELF_LABELS.deal }),
      h('e-menu-item', { value: 'shelf:best', label: SHELF_LABELS.best }),
    ]),
    h('e-menu-item', { value: 'cart', icon: 'doc', label: 'Basket' }),
    h('e-menu-item', { value: 'account', icon: 'user', label: 'Account' }),
    h('e-menu-item', { value: 'display', icon: 'sun', label: 'Display Lab' }),
  ]);

  const siderExtra = div('shop-sider__extra');
  const sider = h('e-layout-sider', { width: 268 }, [
    div('shop-sider', [
      t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'The shop'),
      menu,
      siderExtra,
    ]),
  ]);

  /* ---------------- content ---------------- */

  const breadcrumbSlot = div('shop-breadcrumb');
  const pageSlot = h('div', { class: 'shop-pages', id: 'shop-main', tabindex: -1 });
  const notFoundAction = t('e-button', { slot: 'action', variant: 'primary' }, 'Back to the shop');
  notFoundAction.addEventListener('e-click', () => navigate('/'));
  const notFound = div('shop-page', [
    h(
      'e-result',
      {
        status: '404',
        title: 'No such page',
        description:
          'The shop has a storefront, a catalogue, a basket, a checkout, an account and a Display Lab.',
      },
      [notFoundAction],
    ),
  ]);
  notFound.hidden = true;
  pageSlot.appendChild(notFound);

  const content = h('e-layout-content', {}, [div('shop-content', [breadcrumbSlot, pageSlot])]);

  /* ---------------- footer ---------------- */

  const helpCollapse = h(
    'e-collapse',
    { accordion: true, 'default-open': 'ordering' },
    HELP_PANELS.map((panel) =>
      h('e-collapse-panel', { key: panel.key, heading: panel.heading }, [
        t('e-text', { kind: 'prose', as: 'p' }, panel.body),
      ]),
    ),
  ) as CollapseElement;

  const helpDialog = h('e-dialog', { heading: 'Help and shop information', size: 'large' }, [
    helpCollapse,
    t('e-button', { slot: 'footer', 'data-close': '' }, 'Close'),
  ]);

  function openHelp(key: string): void {
    helpCollapse.value = [key];
    helpDialog.setAttribute('open', '');
    announce(`Help opened at ${HELP_PANELS.find((panel) => panel.key === key)?.heading ?? key}.`);
  }

  const footerLink = (label: string, key: string): HTMLElement => {
    const button = t('button', { type: 'button', class: 'shop-footer__link' }, label);
    button.addEventListener('click', () => openHelp(key));
    return button;
  };

  const footer = h('e-layout-footer', {}, [
    div('shop-footer', [
      h(
        'e-grid',
        { cols: 'repeat(auto-fit,minmax(160px,1fr))', gap: 24, class: 'shop-footer__columns' },
        [
          div('', [
            t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Help'),
            footerLink('Ordering', 'ordering'),
            footerLink('Payment methods', 'ordering'),
            footerLink('About this demo', 'demo'),
          ]),
          div('', [
            t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Shipping'),
            footerLink('Delivery times', 'delivery'),
            footerLink('Delivery costs', 'delivery'),
            footerLink('Collection', 'delivery'),
          ]),
          div('', [
            t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Legal'),
            footerLink('Right of withdrawal', 'returns'),
            footerLink('Returns', 'returns'),
            footerLink('Legal notice and privacy', 'legal'),
          ]),
          div('', [
            t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Project'),
            t('e-link', { href: 'https://github.com/marcomattes/epaper-components' }, 'Repository'),
            t('e-link', { href: 'https://epaper-components.dev/' }, 'Documentation site'),
            t(
              'e-link',
              { href: 'https://www.npmjs.com/package/@marcomattes/epaper-components' },
              'npm package',
            ),
          ]),
        ],
      ),
      h('e-divider', {}),
      t(
        'e-text',
        { kind: 'small', as: 'p', class: 'shop-footer__note' },
        'Inkbound Books is a demonstration storefront for the EPaper component library. Fictional ' +
          'titles, fictional publishers, fictional prices. Nothing is dispatched and nothing is ' +
          'charged.',
      ),
    ]),
  ]);

  /* ---------------- floating actions ---------------- */

  const helpFab = h('e-float-button', { icon: 'bell', label: 'Help and shop information' });
  const quickActions = h('e-float-button-group', { orientation: 'vertical' }, [
    h('e-fab-item', { icon: 'folder', label: 'Go to the basket', value: 'cart' }),
    h('e-fab-item', { icon: 'heart', label: 'Go to the wishlist', value: 'wishlist' }),
    h('e-fab-item', { icon: 'copy', label: 'Open the comparison', value: 'compare' }),
  ]);
  const backTop = h('e-back-top', {
    'visibility-height': 320,
    label: 'Back to the top of the page',
  });

  /* ---------------- assembly ---------------- */

  const shop = div('ink-page shop-root', [
    createAnnouncer(),
    h('e-layout', { class: 'shop-layout' }, [
      header,
      h('e-layout', { 'has-sider': true, class: 'shop-body' }, [sider, content]),
      footer,
    ]),
    div('shop-floats', [helpFab, quickActions, backTop]),
    helpDialog,
    createComparisonDialog(),
  ]);
  // Replaces the boot notice in index.html rather than appending beside it.
  root.replaceChildren(shop);

  /* ---------------- chrome behaviour ---------------- */

  function renderBreadcrumb(trail: readonly Crumb[]): void {
    breadcrumbSlot.replaceChildren(
      h(
        'e-breadcrumb',
        { separator: '/' },
        trail.map((crumb) =>
          h(
            'e-breadcrumb-item',
            crumb.href ? { href: crumb.href, title: crumb.label } : { title: crumb.label },
          ),
        ),
      ),
    );
  }

  function applyDisplaySettings(): void {
    setAttr(shop, 'data-text-size', state.display.textSize);
    setAttr(shop, 'data-density', state.display.density);
    // The Kaleido pack is a token override activated by this attribute, exactly
    // as THEMING.md documents. Monochrome is the bare token set.
    setAttr(shop, 'data-ink-theme', state.display.mode === 'kaleido' ? 'kaleido' : null);
  }

  function counts(): void {
    const items = cartCount();
    const saved = state.wishlist.length;
    setAttr(cartBadge, 'count', String(items));
    setAttr(wishlistBadge, 'count', String(saved));
    setText(cartCountLabel, `, ${items} item${items === 1 ? '' : 's'}`);
    setText(wishlistCountLabel, `, ${saved} title${saved === 1 ? '' : 's'} saved`);
  }
  syncCounts = counts;

  function runSearch(): void {
    const query = fieldValue(searchInput).trim();
    navigate(catalogHref(query ? { q: query } : {}));
    announce(query ? `Searching for “${query}”.` : 'Showing every title.');
  }

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    runSearch();
  });
  searchButton.addEventListener('e-click', runSearch);

  onDetail<{ index: number }>(departmentsDropdown, 'e-select', ({ index }) => {
    const target = departmentTargets[index];
    if (target) navigate(target);
  });

  onDetail<{ index: number }>(accountDropdown, 'e-select', ({ index }) => {
    const action = ACCOUNT_ACTIONS[index];
    if (action) {
      navigate(action.href);
      return;
    }
    // The last entry is the sign-out shortcut, which lives on the account page.
    navigate('/account');
    announce('Sign out is on the account page, under demo controls.');
  });

  wishlistButton.addEventListener('e-click', () => navigate('/account'));
  cartButton.addEventListener('e-click', () => navigate('/cart'));
  helpFab.addEventListener('click', () => openHelp('demo'));

  onDetail<{ index: number; value: string }>(quickActions, 'e-select', ({ value }) => {
    if (value === 'cart') navigate('/cart');
    else if (value === 'wishlist') navigate('/account');
    else openComparison();
  });

  onDetail<{ value: number }>(backTop, 'e-click', () => announce('Back at the top of the page.'));

  onDetail<{ value: string }>(menu, 'e-change', ({ value }) => {
    if (value.startsWith('cat:')) navigate(catalogHref({ cat: value.slice(4) }));
    else if (value.startsWith('shelf:')) navigate(catalogHref({ shelf: value.slice(6) }));
    else if (value === 'home') navigate('/');
    else navigate(`/${value}`);
  });

  function menuValueFor(route: Route): string {
    if (route.name === 'catalog') {
      const category = route.query.get('cat');
      if (category) return `cat:${category}`;
      const shelf = route.query.get('shelf');
      if (shelf) return `shelf:${shelf}`;
      return 'catalog';
    }
    if (route.name === 'book') return 'catalog';
    return route.name;
  }

  /* ---------------- routing ---------------- */

  function show(route: Route): void {
    if (route.name === 'not-found') {
      activePage?.leave?.();
      if (activePage) activePage.el.hidden = true;
      activePage = null;
      activeName = 'not-found';
      notFound.hidden = false;
      siderExtra.replaceChildren();
      renderBreadcrumb([{ label: 'Shop', href: '#/' }, { label: 'Not found' }]);
      document.title = 'Not found · Inkbound Books';
      announce('That page does not exist.');
      return;
    }

    notFound.hidden = true;
    let page = pages.get(route.name);
    if (!page) {
      page = FACTORIES[route.name]();
      pages.set(route.name, page);
      page.el.hidden = true;
      pageSlot.appendChild(page.el);
    }

    if (activePage && activePage !== page) {
      activePage.leave?.();
      activePage.el.hidden = true;
    }

    const head = page.enter(route);
    page.el.hidden = false;
    activePage = page;
    activeName = route.name;

    siderExtra.replaceChildren();
    if (page.sider) siderExtra.appendChild(page.sider);

    renderBreadcrumb(head.trail);
    document.title = `${head.title} · Inkbound Books`;
    setAttr(menu, 'value', menuValueFor(route));
    counts();
    refreshComparison();
  }

  onRoute((route) => {
    const previous = activeName;
    show(route);
    if (previous == null) return;
    // A view swap replaces the whole content area, so focus has to be told
    // where it went; without this it stays on the link that was activated and
    // a keyboard user tabs on from the old page's position.
    window.scrollTo({ top: 0 });
    pageSlot.focus({ preventScroll: true });
  });

  onStateChange(() => {
    counts();
    syncCards();
    applyDisplaySettings();
    refreshComparison();
  });

  applyDisplaySettings();
  counts();
  // Emits the current route synchronously, so the first view is mounted by the
  // time this returns.
  startRouter();
}
