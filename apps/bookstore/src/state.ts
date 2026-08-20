// One explicit state object, a `localStorage` mirror, and the small functions
// that move it.
//
// Nothing here touches the DOM. Views subscribe with `onStateChange()` and
// repaint only what the change actually affects, which is what keeps a panel
// refresh proportional to the edit that caused it.

import { bookById, listPrice, type Book, type FormatId } from './books';
import { EXPRESS_DELIVERY, FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY, VAT_RATE } from './format';

const STORAGE_KEY = 'inkbound.shop.v1';

export type DisplayMode = 'mono' | 'kaleido';
export type TextSize = 'small' | 'regular' | 'large';
export type Density = 'comfortable' | 'dense';
export type DeliveryMethod = 'standard' | 'express' | 'pickup';
export type OrderStatus = 'delivered' | 'shipped' | 'packing' | 'cancelled';
export type ViewMode = 'grid' | 'list';
export type SortKey = 'relevance' | 'title' | 'price-asc' | 'price-desc' | 'date' | 'rating';

export interface CartLine {
  id: string;
  format: FormatId;
  quantity: number;
}

export interface Order {
  id: string;
  placed: string;
  status: OrderStatus;
  delivery: DeliveryMethod;
  total: number;
  lines: CartLine[];
}

export interface Voucher {
  code: string;
  label: string;
  /** Fraction of the subtotal removed, 0 when the voucher is a flat amount. */
  percent: number;
  amount: number;
  freeDelivery: boolean;
  minimum: number;
}

export interface DisplaySettings {
  mode: DisplayMode;
  textSize: TextSize;
  density: Density;
  watermark: boolean;
  watermarkText: string;
}

/** What the last simulated panel refresh reported. */
export interface RefreshReport {
  kind: 'partial' | 'full';
  waveform: string;
  milliseconds: number;
  dirtyPercent: number;
  at: string;
}

export interface Preferences {
  topics: string[];
  format: FormatId;
  language: 'en' | 'de';
  invoiceByEmail: boolean;
}

export interface AppState {
  cart: CartLine[];
  wishlist: string[];
  comparison: string[];
  recentlyViewed: string[];
  voucher: string | null;
  orders: Order[];
  preferences: Preferences;
  display: DisplaySettings;
  view: ViewMode;
  sort: SortKey;
  lastRefresh: RefreshReport | null;
  signedIn: boolean;
  /** When the demo data was last (re)seeded — what `<e-last-updated>` reads. */
  updatedAt: string;
}

export const VOUCHERS: Voucher[] = [
  {
    code: 'INKBOUND10',
    label: '10 % off the whole basket',
    percent: 0.1,
    amount: 0,
    freeDelivery: false,
    minimum: 0,
  },
  {
    code: 'PAPERBACK5',
    label: '€5 off orders from €40',
    percent: 0,
    amount: 5,
    freeDelivery: false,
    minimum: 40,
  },
  {
    code: 'FREEPOST',
    label: 'Free standard delivery',
    percent: 0,
    amount: 0,
    freeDelivery: true,
    minimum: 0,
  },
];

export const HOUSEHOLD = [
  { name: 'Jonna Weiss' },
  { name: 'Mikkel Weiss' },
  { name: 'Elif Weiss' },
  { name: 'Rune Weiss' },
  { name: 'Toni Weiss' },
];

export const PROFILE = {
  name: 'Jonna Weiss',
  email: 'jonna.weiss@example.de',
  member: '2021-04-06',
  city: 'Hamburg',
  tier: 'Reading-room member',
};

/** Twelve months of spend, oldest first — the account sparkline. */
export const SPEND_BY_MONTH = [38, 22, 64, 41, 18, 73, 55, 29, 88, 47, 61, 96];

export const MONTH_LABELS = [
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
];

const DEMO_ORDERS: Order[] = [
  {
    id: 'INK-2026-0731',
    placed: '2026-07-31',
    status: 'delivered',
    delivery: 'standard',
    total: 62.0,
    lines: [
      { id: 'te-1-bit', format: 'hardcover', quantity: 1 },
      { id: 'de-legible', format: 'paperback', quantity: 1 },
    ],
  },
  {
    id: 'INK-2026-0612',
    placed: '2026-06-12',
    status: 'delivered',
    delivery: 'express',
    total: 40.9,
    lines: [{ id: 'fa-salt-crown', format: 'hardcover', quantity: 1 }],
  },
  {
    id: 'INK-2026-0508',
    placed: '2026-05-08',
    status: 'shipped',
    delivery: 'standard',
    total: 49.0,
    lines: [
      { id: 'hi-marginalia', format: 'hardcover', quantity: 1 },
      { id: 'ch-owl-who-forgot', format: 'hardcover', quantity: 1 },
    ],
  },
  {
    id: 'INK-2026-0402',
    placed: '2026-04-02',
    status: 'packing',
    delivery: 'pickup',
    total: 30.0,
    lines: [{ id: 'bi-woman-who-drew-light', format: 'hardcover', quantity: 1 }],
  },
  {
    id: 'INK-2026-0118',
    placed: '2026-01-18',
    status: 'cancelled',
    delivery: 'standard',
    total: 38.0,
    lines: [{ id: 'fa-nine-gates', format: 'hardcover', quantity: 1 }],
  },
  {
    id: 'INK-2025-1122',
    placed: '2025-11-22',
    status: 'delivered',
    delivery: 'standard',
    total: 34.5,
    lines: [
      { id: 'sf-pale-orbit', format: 'paperback', quantity: 1 },
      { id: 'ch-paper-boat-post', format: 'hardcover', quantity: 1 },
    ],
  },
];

/** The state a fresh demo starts from. Deterministic apart from `updatedAt`. */
function demoState(): AppState {
  return {
    cart: [
      { id: 'te-slow-web', format: 'paperback', quantity: 1 },
      { id: 'ch-owl-who-forgot', format: 'hardcover', quantity: 2 },
    ],
    wishlist: ['fa-nine-gates', 'de-grid-and-grain'],
    comparison: [],
    recentlyViewed: ['de-legible', 'fa-salt-crown'],
    voucher: null,
    orders: DEMO_ORDERS.map((order) => ({ ...order, lines: order.lines.map((l) => ({ ...l })) })),
    preferences: {
      topics: ['new-releases', 'e-paper'],
      format: 'paperback',
      language: 'en',
      invoiceByEmail: true,
    },
    display: {
      mode: 'mono',
      textSize: 'regular',
      density: 'comfortable',
      watermark: false,
      watermarkText: 'INKBOUND DEMO',
    },
    view: 'grid',
    sort: 'relevance',
    lastRefresh: null,
    signedIn: true,
    updatedAt: new Date().toISOString(),
  };
}

export const state: AppState = demoState();

type Listener = (state: AppState) => void;
const listeners = new Set<Listener>();

/** Subscribe to committed state changes. Views repaint from here. */
export function onStateChange(listener: Listener): void {
  listeners.add(listener);
}

/** Persist and notify. Every mutation below ends with this. */
export function commit(): void {
  saveState();
  for (const listener of listeners) listener(state);
}

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const stringList = (value: unknown, fallback: string[]): string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? (value as string[])
    : fallback;

function readLines(value: unknown): CartLine[] | null {
  if (!Array.isArray(value)) return null;
  const lines: CartLine[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const book = typeof entry['id'] === 'string' ? bookById(entry['id']) : undefined;
    if (!book) continue;
    const format = book.formats.find((option) => option.id === entry['format'])?.id;
    const quantity = typeof entry['quantity'] === 'number' ? Math.trunc(entry['quantity']) : 0;
    if (!format || quantity < 1) continue;
    lines.push({ id: book.id, format, quantity: Math.min(quantity, 99) });
  }
  return lines;
}

/**
 * Read the persisted shop.
 *
 * Anything that fails to validate is dropped back to its demo value rather
 * than throwing: a half-written record from an older build must not leave the
 * shop unusable, and there is no server to re-fetch from.
 */
export function loadState(): AppState {
  let parsed: unknown;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return state;
    parsed = JSON.parse(raw);
  } catch {
    // Storage disabled, a private-mode quota error, or a truncated record:
    // all three mean "run from the demo data".
    return state;
  }
  if (!isRecord(parsed)) return state;

  const lines = readLines(parsed['cart']);
  if (lines) state.cart = lines;
  state.wishlist = stringList(parsed['wishlist'], state.wishlist).filter((id) => !!bookById(id));
  state.comparison = stringList(parsed['comparison'], state.comparison)
    .filter((id) => !!bookById(id))
    .slice(0, MAX_COMPARISON);
  state.recentlyViewed = stringList(parsed['recentlyViewed'], state.recentlyViewed)
    .filter((id) => !!bookById(id))
    .slice(0, MAX_RECENT);

  const voucher = parsed['voucher'];
  state.voucher = typeof voucher === 'string' && findVoucher(voucher) ? voucher : null;

  const orders = parsed['orders'];
  if (Array.isArray(orders)) {
    const restored: Order[] = [];
    for (const entry of orders) {
      if (!isRecord(entry)) continue;
      const orderLines = readLines(entry['lines']);
      if (
        typeof entry['id'] !== 'string' ||
        typeof entry['placed'] !== 'string' ||
        typeof entry['total'] !== 'number' ||
        !orderLines
      ) {
        continue;
      }
      restored.push({
        id: entry['id'],
        placed: entry['placed'],
        status: readStatus(entry['status']),
        delivery: readDelivery(entry['delivery']),
        total: entry['total'],
        lines: orderLines,
      });
    }
    if (restored.length > 0) state.orders = restored;
  }

  readPreferences(parsed['preferences']);
  readDisplay(parsed['display']);

  state.view = parsed['view'] === 'list' ? 'list' : 'grid';
  state.sort = readSort(parsed['sort']);
  state.signedIn = parsed['signedIn'] !== false;
  if (typeof parsed['updatedAt'] === 'string') state.updatedAt = parsed['updatedAt'];

  return state;
}

function readStatus(value: unknown): OrderStatus {
  return value === 'delivered' ||
    value === 'shipped' ||
    value === 'packing' ||
    value === 'cancelled'
    ? value
    : 'packing';
}

function readDelivery(value: unknown): DeliveryMethod {
  return value === 'express' || value === 'pickup' ? value : 'standard';
}

function readSort(value: unknown): SortKey {
  const keys: SortKey[] = ['relevance', 'title', 'price-asc', 'price-desc', 'date', 'rating'];
  return keys.find((key) => key === value) ?? 'relevance';
}

function readPreferences(value: unknown): void {
  if (!isRecord(value)) return;
  state.preferences.topics = stringList(value['topics'], state.preferences.topics);
  const format = value['format'];
  if (
    format === 'hardcover' ||
    format === 'paperback' ||
    format === 'ebook' ||
    format === 'audiobook'
  ) {
    state.preferences.format = format;
  }
  if (value['language'] === 'de' || value['language'] === 'en') {
    state.preferences.language = value['language'];
  }
  state.preferences.invoiceByEmail = value['invoiceByEmail'] !== false;
}

function readDisplay(value: unknown): void {
  if (!isRecord(value)) return;
  if (value['mode'] === 'kaleido' || value['mode'] === 'mono') state.display.mode = value['mode'];
  if (
    value['textSize'] === 'small' ||
    value['textSize'] === 'large' ||
    value['textSize'] === 'regular'
  ) {
    state.display.textSize = value['textSize'];
  }
  if (value['density'] === 'dense' || value['density'] === 'comfortable') {
    state.display.density = value['density'];
  }
  state.display.watermark = value['watermark'] === true;
  if (typeof value['watermarkText'] === 'string' && value['watermarkText'].trim() !== '') {
    state.display.watermarkText = value['watermarkText'].slice(0, 40);
  }
}

export function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or private mode. The shop keeps working from memory; losing the
    // basket on reload is a better outcome than an unhandled exception here.
  }
}

/** Restore the deterministic demo catalogue, basket, orders and preferences. */
export function resetDemoData(): void {
  Object.assign(state, demoState());
  commit();
}

/* ------------------------------------------------------------------ *
 * Basket, wishlist, comparison
 * ------------------------------------------------------------------ */

export const MAX_COMPARISON = 3;
export const MAX_RECENT = 6;

export const cartLine = (id: string): CartLine | undefined =>
  state.cart.find((line) => line.id === id);

export const cartCount = (): number => state.cart.reduce((total, line) => total + line.quantity, 0);

export const inWishlist = (id: string): boolean => state.wishlist.includes(id);

export const inComparison = (id: string): boolean => state.comparison.includes(id);

/**
 * Add `quantity` copies to the basket.
 *
 * One basket line per title: choosing a different format for a title already
 * in the basket moves that line to the new format rather than opening a
 * second one, which keeps the line count equal to the number of books the
 * customer is looking at.
 */
export function addToCart(productId: string, quantity = 1, format?: FormatId): CartLine | null {
  const book = bookById(productId);
  if (!book || book.availability === 'out-of-stock') return null;
  const chosen = format ?? book.formats[0]!.id;
  const existing = cartLine(productId);
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + quantity);
    existing.format = chosen;
  } else {
    state.cart.push({
      id: productId,
      format: chosen,
      quantity: Math.min(99, Math.max(1, quantity)),
    });
  }
  commit();
  return cartLine(productId) ?? null;
}

export function updateCartQuantity(productId: string, quantity: number): void {
  const line = cartLine(productId);
  if (!line) return;
  const next = Math.max(0, Math.min(99, Math.trunc(quantity)));
  if (next === 0) {
    removeFromCart(productId);
    return;
  }
  if (next === line.quantity) return;
  line.quantity = next;
  commit();
}

export function setCartFormat(productId: string, format: FormatId): void {
  const line = cartLine(productId);
  if (!line || line.format === format) return;
  line.format = format;
  commit();
}

export function removeFromCart(productId: string): void {
  const index = state.cart.findIndex((line) => line.id === productId);
  if (index < 0) return;
  state.cart.splice(index, 1);
  commit();
}

export function clearCart(): void {
  state.cart = [];
  state.voucher = null;
  commit();
}

/** Toggle and report the state the title ended up in. */
export function toggleWishlist(productId: string): boolean {
  const index = state.wishlist.indexOf(productId);
  if (index >= 0) state.wishlist.splice(index, 1);
  else state.wishlist.push(productId);
  commit();
  return index < 0;
}

export interface ComparisonResult {
  added: boolean;
  /** True when the list was already full and nothing changed. */
  rejected: boolean;
}

export function toggleComparison(productId: string): ComparisonResult {
  const index = state.comparison.indexOf(productId);
  if (index >= 0) {
    state.comparison.splice(index, 1);
    commit();
    return { added: false, rejected: false };
  }
  if (state.comparison.length >= MAX_COMPARISON) return { added: false, rejected: true };
  state.comparison.push(productId);
  commit();
  return { added: true, rejected: false };
}

export function clearComparison(): void {
  if (state.comparison.length === 0) return;
  state.comparison = [];
  commit();
}

export function rememberViewed(productId: string): void {
  const existing = state.recentlyViewed.indexOf(productId);
  if (existing === 0) return;
  if (existing > 0) state.recentlyViewed.splice(existing, 1);
  state.recentlyViewed.unshift(productId);
  state.recentlyViewed = state.recentlyViewed.slice(0, MAX_RECENT);
  commit();
}

/* ------------------------------------------------------------------ *
 * Money
 * ------------------------------------------------------------------ */

export const findVoucher = (code: string): Voucher | undefined =>
  VOUCHERS.find((voucher) => voucher.code === code.trim().toUpperCase());

export interface CartSummary {
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  vat: number;
  itemCount: number;
  freeDeliveryGap: number;
  voucher: Voucher | null;
}

export function linePrice(line: CartLine): number {
  const book = bookById(line.id);
  if (!book) return 0;
  return (
    (book.formats.find((option) => option.id === line.format)?.price ?? listPrice(book)) *
    line.quantity
  );
}

/**
 * Recompute the basket totals.
 *
 * A voucher only ever reduces the goods value; delivery is decided afterwards
 * from the *undiscounted* subtotal, so a discount can never push an order
 * below the free-delivery threshold it already qualified for.
 */
export function cartSummary(method: DeliveryMethod = 'standard'): CartSummary {
  const subtotal = state.cart.reduce((sum, line) => sum + linePrice(line), 0);
  const voucher = state.voucher ? (findVoucher(state.voucher) ?? null) : null;
  const eligible = voucher != null && subtotal >= voucher.minimum;
  let discount = 0;
  if (eligible && voucher) {
    discount =
      voucher.percent > 0 ? subtotal * voucher.percent : Math.min(voucher.amount, subtotal);
  }

  let delivery = 0;
  if (state.cart.length > 0 && method !== 'pickup') {
    if (method === 'express') delivery = EXPRESS_DELIVERY;
    else delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY;
  }
  if (eligible && voucher?.freeDelivery && method === 'standard') delivery = 0;

  const total = Math.max(0, subtotal - discount) + delivery;
  return {
    subtotal,
    discount,
    delivery,
    total,
    vat: total - total / (1 + VAT_RATE),
    itemCount: cartCount(),
    freeDeliveryGap: Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal),
    voucher: eligible ? voucher : null,
  };
}

export type VoucherRejection = 'unknown' | 'minimum' | 'empty';

export type VoucherOutcome =
  { ok: true; voucher: Voucher } | { ok: false; reason: VoucherRejection };

/** Validate and store a voucher code. Rejection never changes stored state. */
export function applyVoucher(code: string): VoucherOutcome {
  const trimmed = code.trim();
  if (trimmed === '') return { ok: false, reason: 'empty' };
  const voucher = findVoucher(trimmed);
  if (!voucher) return { ok: false, reason: 'unknown' };
  const subtotal = state.cart.reduce((sum, line) => sum + linePrice(line), 0);
  if (subtotal < voucher.minimum) return { ok: false, reason: 'minimum' };
  state.voucher = voucher.code;
  commit();
  return { ok: true, voucher };
}

export function clearVoucher(): void {
  if (!state.voucher) return;
  state.voucher = null;
  commit();
}

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

/**
 * Order numbers are sequential within the demo rather than random, so a reset
 * always produces the same next number and screenshots stay reproducible.
 */
export function nextOrderNumber(): string {
  const year = new Date().getFullYear();
  const sequence = state.orders.length + 1;
  return `INK-${year}-${String(sequence).padStart(4, '0')}`;
}

export function placeOrder(method: DeliveryMethod, total: number): Order {
  const order: Order = {
    id: nextOrderNumber(),
    placed: new Date().toISOString().slice(0, 10),
    status: 'packing',
    delivery: method,
    total,
    lines: state.cart.map((line) => ({ ...line })),
  };
  state.orders.unshift(order);
  state.cart = [];
  state.voucher = null;
  commit();
  return order;
}

export const orderBooks = (order: Order): Book[] =>
  order.lines.map((line) => bookById(line.id)).filter((book): book is Book => !!book);

/* ------------------------------------------------------------------ *
 * Account and display preferences
 * ------------------------------------------------------------------ */

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
  state.preferences[key] = value;
  commit();
}

export function setDisplaySetting<K extends keyof DisplaySettings>(
  key: K,
  value: DisplaySettings[K],
): void {
  if (state.display[key] === value) return;
  state.display[key] = value;
  commit();
}

export function recordRefresh(report: RefreshReport): void {
  state.lastRefresh = report;
  commit();
}

export function signOut(): void {
  state.signedIn = false;
  commit();
}

export function signIn(): void {
  state.signedIn = true;
  commit();
}
