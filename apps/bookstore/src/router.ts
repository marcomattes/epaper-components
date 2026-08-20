// Hash routing.
//
// The shop is one document with seven views. Hash routes keep every view
// addressable — the browser's back button, a bookmarked product page and a
// shared catalogue search all work — without a server that has to know about
// the routes, which is what lets the built demo be served from any static
// path.

export type RouteName =
  'home' | 'catalog' | 'book' | 'cart' | 'checkout' | 'account' | 'display' | 'not-found';

export interface Route {
  name: RouteName;
  /** Path segment after the route name, e.g. the product id on `#/book/…`. */
  id: string;
  query: URLSearchParams;
}

const ROUTE_NAMES: RouteName[] = [
  'home',
  'catalog',
  'book',
  'cart',
  'checkout',
  'account',
  'display',
];

const listeners = new Set<(route: Route) => void>();

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path = '', search = ''] = raw.split('?');
  const [first = '', second = ''] = path.split('/');
  const query = new URLSearchParams(search);
  if (first === '') return { name: 'home', id: '', query };
  const name = ROUTE_NAMES.find((candidate) => candidate === first);
  if (!name) return { name: 'not-found', id: first, query };
  return { name, id: decodeURIComponent(second), query };
}

export const currentRoute = (): Route => parseHash(window.location.hash);

/** Navigate to `path` (without the leading `#`). */
export function navigate(path: string): void {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const next = `#${normalizedPath}`;
  if (window.location.hash === next) {
    // Same URL: `hashchange` will not fire, so drive the listeners directly.
    emit();
    return;
  }
  window.location.hash = next;
}

/** Build a catalogue URL with the given query parameters. */
export function catalogHref(params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return query ? `/catalog?${query}` : '/catalog';
}

export const bookHref = (id: string): string => `/book/${encodeURIComponent(id)}`;

export function onRoute(listener: (route: Route) => void): void {
  listeners.add(listener);
}

function emit(): void {
  const route = currentRoute();
  for (const listener of listeners) listener(route);
}

export function startRouter(): void {
  window.addEventListener('hashchange', emit);
  emit();
}
