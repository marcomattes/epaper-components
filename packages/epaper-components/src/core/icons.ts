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
} as const satisfies Record<string, string>;

export type IconName = keyof typeof ICONS;

export const SVG_NS = 'http://www.w3.org/2000/svg';

const escAttr = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * True when `name` is an own key of the icon registry. Uses `Object.hasOwn`
 * so inherited `Object.prototype` members (`toString`, `constructor`,
 * `valueOf`, `hasOwnProperty`, …) are not mistaken for icon names.
 */
export const hasIcon = (name: string): name is IconName => Object.hasOwn(ICONS, name);

export function iconSvg(name: string, size: number = 20, label?: string | null): string {
  if (!hasIcon(name)) return '';
  const d = ICONS[name];
  const role = label ? 'img' : 'presentation';
  const a11y = label ? `aria-label="${escAttr(label)}"` : 'aria-hidden="true"';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" role="${role}" ${a11y}><path d="${d}" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
}
