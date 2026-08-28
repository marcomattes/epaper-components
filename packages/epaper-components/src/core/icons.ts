// EPaper · Icon path data
// 24×24 viewBox · stroke 2 · square caps · no fills.
// Fills dither poorly under 32px on Kaleido — never use them here.

export const ICONS = {
  plus: 'M12 4v16M4 12h16',
  minus: 'M4 12h16',
  check: 'M4 12.5l5 5L20 6',
  close: 'M5 5l14 14M19 5L5 19',
  search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5L21 21',
  arrowR: 'M5 12h14M13 6l6 6-6 6',
  arrowL: 'M19 12H5M11 6l-6 6 6 6',
  arrowD: 'M12 5v14M6 13l6 6 6-6',
  arrowU: 'M12 19V5M6 11l6-6 6 6',
  chevR: 'M9 6l6 6-6 6',
  chevL: 'M15 6l-6 6 6 6',
  chevD: 'M6 9l6 6 6-6',
  chevU: 'M6 15l6-6 6 6',
  pen: 'M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3',
  trash: 'M5 6h14M9 6V4h6v2M7 6l1 14h8l1-14M10 10v6M14 10v6',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  star: 'M12 4l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.4 6.8 20l1-5.8L3.5 10.2l5.9-.9z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  home: 'M4 11l8-7 8 7v9h-5v-6h-6v6H4z',
  doc: 'M6 3h9l4 4v14H6zM15 3v4h4',
  folder: 'M4 6h6l2 2h8v11H4z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20h4',
  cog: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  sun: 'M12 6V3M12 21v-3M6 12H3M21 12h-3M6.3 6.3 4.2 4.2M19.8 19.8l-2.1-2.1M6.3 17.7l-2.1 2.1M19.8 4.2l-2.1 2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4 6 6 0 0 0 20 14.5z',
  upload: 'M12 16V4M6 10l6-6 6 6M4 20h16',
  download: 'M12 4v12M6 14l6 6 6-6M4 20h16',
  refresh: 'M4 12a8 8 0 0 1 14-5.3M20 4v5h-5M20 12a8 8 0 0 1-14 5.3M4 20v-5h5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z',
  battery: 'M3 8h15v8H3zM18 11v2h2v-2zM6 11h6v2H6z',
  wifi: 'M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8 15.5a5 5 0 0 1 8 0M12 19h.01',
  link: 'M9 15l6-6M10 6l2-2a4 4 0 0 1 6 6l-2 2M14 18l-2 2a4 4 0 0 1-6-6l2-2',
  share: 'M6 12a3 3 0 1 0 0 0zM18 6a3 3 0 1 0 0 0zM18 18a3 3 0 1 0 0 0zM8.5 10.5l7-3M8.5 13.5l7 3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 1 1 8 0v3',
  user: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 20c0-4 4-6 8-6s8 2 8 6',
  copy: 'M9 9h11v11H9zM4 4h11v3M4 4v11h3',
  edit: 'M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3',
  flip: 'M4 12h16M9 7l-5 5 5 5M15 7l5 5-5 5',

  // Status / industrial. `warning` and `error` exist so `e-alert` can stop
  // borrowing `bell` and `close` for severities they do not mean.
  warning: 'M12 3 1.5 21h21zM12 9v5M12 18h.01',
  error: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM9 9l6 6M15 9l-6 6',
  info: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 11v6M12 7.5h.01',
  thermometer: 'M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0zM12 17h.01',
  gauge: 'M4 18a8 8 0 1 1 16 0M12 14l4-4',
  play: 'M7 4l12 8-12 8z',
  pause: 'M8 5v14M16 5v14',
  stop: 'M6 6h12v12H6z',
  power: 'M12 4v8M6.5 7a8 8 0 1 0 11 0',

  // Retail.
  cart: 'M3 4h3l2.5 11h9L20 7H7M9 20h.01M18 20h.01',
  pricetag: 'M4 4h7l9 9-7 7-9-9zM8 8h.01',
  euro: 'M18 6.5A6.5 6.5 0 0 0 8 12a6.5 6.5 0 0 0 10 5.5M5 10.5h7M5 13.5h7',
  percent: 'M6 6h.01M18 18h.01M5 19 19 5',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4M20 8l-8 4M12 12v8',
  truck: 'M3 6h11v11H3zM14 10h4l3 3v4h-7M7 20a2 2 0 1 0 0-.01M18 20a2 2 0 1 0 0-.01',
  barcode: 'M4 5v14M7 5v14M10 5v10M13 5v14M16 5v10M20 5v14',

  // Office / wayfinding.
  calendar: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3.5 2',
  door: 'M6 3h12v18H6zM14 12h.01',
  users:
    'M9 5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM2 20c0-3.5 3.5-5 7-5s7 1.5 7 5M17 6.5a3 3 0 0 1 0 6M18 15c2.5.5 4 2 4 5',
  arrowUR: 'M7 17 17 7M9 7h8v8',
  arrowUL: 'M17 17 7 7M15 7H7v8',
  arrowDR: 'M7 7l10 10M17 9v8H9',
  arrowDL: 'M17 7 7 17M9 9v8h8',
} as const satisfies Record<string, string>;

export type IconName = keyof typeof ICONS;

/**
 * Icons registered at runtime by the host application. Kept separate from
 * `ICONS` so the built-in set stays statically typed while an app can still
 * add its own glyphs — previously the registry was closed, and a project
 * needing a domain symbol had to fork the library.
 */
const CUSTOM_ICONS = new Map<string, string>();

/**
 * Path data is interpolated straight into an SVG `d` attribute, so it is
 * held to the SVG path grammar: commands, numbers and separators only. A
 * quote or angle bracket would break out of the attribute, which is the same
 * class of hole `esc()` closes everywhere else in the library.
 */
const SAFE_PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9\s,.+\-eE]+$/;

/**
 * Register a custom icon under `name`, usable anywhere an icon name is
 * accepted (`<e-icon name="…">`, `e-menu-item`'s `icon`, …).
 *
 * Paths must be drawn on a 24×24 viewBox and stroked, not filled — fills
 * dither badly below 32px on Kaleido panels.
 *
 * @throws If the name is empty, collides with a built-in, or the path data
 * is not valid SVG path syntax.
 */
export function registerIcon(name: string, path: string): void {
  const key = name.trim();
  if (!key) throw new Error('registerIcon: name must not be empty.');
  if (Object.hasOwn(ICONS, key)) {
    throw new Error(`registerIcon: "${key}" is a built-in icon and cannot be replaced.`);
  }
  if (!SAFE_PATH.test(path)) {
    throw new Error(`registerIcon: "${key}" has invalid SVG path data.`);
  }
  CUSTOM_ICONS.set(key, path);
}

/** Every icon name currently available, built-in and registered. */
export const iconNames = (): string[] => [...Object.keys(ICONS), ...CUSTOM_ICONS.keys()];

export const SVG_NS = 'http://www.w3.org/2000/svg';

const escAttr = (s: string): string =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

/**
 * True when `name` is an own key of the icon registry. Uses `Object.hasOwn`
 * so inherited `Object.prototype` members (`toString`, `constructor`,
 * `valueOf`, `hasOwnProperty`, …) are not mistaken for icon names.
 */
export const hasIcon = (name: string): name is IconName =>
  Object.hasOwn(ICONS, name) || CUSTOM_ICONS.has(name);

export function iconSvg(name: string, size: number = 20, label?: string | null): string {
  if (!hasIcon(name)) return '';
  const d = Object.hasOwn(ICONS, name) ? ICONS[name as IconName] : CUSTOM_ICONS.get(name)!;
  const role = label ? 'img' : 'presentation';
  const a11y = label ? `aria-label="${escAttr(label)}"` : 'aria-hidden="true"';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" role="${role}" ${a11y}><path d="${d}" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
}
