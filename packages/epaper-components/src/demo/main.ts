// Demo page wiring — registers all components and drives demo interactions.
import '../index';
import { ICONS, iconSvg } from '../core/icons';
import { esc } from '../core/dom';

// Icon grid
const grid = document.getElementById('icon-grid');
const names = Object.keys(ICONS) as (keyof typeof ICONS)[];
const iconCountLabel = document.getElementById('icon-count-label');
if (iconCountLabel) iconCountLabel.textContent = `Icon Set · ${names.length} glyphs`;
if (grid) {
  grid.innerHTML = names
    .map(
      (n) => `
    <div>${iconSvg(n, 22)}<span class="icon-grid__name">${esc(n)}</span></div>
  `,
    )
    .join('');
}

// Buttons counter demo
let count = 3;
const counterLabel = document.getElementById('btn-counter-label');
const updateCounter = () => {
  if (counterLabel) counterLabel.textContent = `Counter Demo · clicks: ${count}`;
};
document.getElementById('btn-primary')?.addEventListener('e-click', () => {
  count++;
  updateCounter();
});
document.getElementById('btn-secondary')?.addEventListener('e-click', () => {
  count--;
  updateCounter();
});

// Bookmark toggle
const bookmarkBtn = document.getElementById('bookmark-btn');
let bookmarked = false;
bookmarkBtn?.addEventListener('e-click', () => {
  bookmarked = !bookmarked;
  const btn = bookmarkBtn.querySelector('button');
  if (btn) btn.textContent = bookmarked ? '★ Bookmarked' : '☆ Bookmark';
});

// Pagination label
const pag = document.getElementById('pag');
const pagLabel = document.getElementById('pag-label');
pag?.addEventListener('e-change', (e) => {
  const detail = (e as CustomEvent<{ value: number }>).detail;
  if (pagLabel) pagLabel.textContent = `e-pagination · ${detail.value} of 24`;
});

// Kaleido cell selector
const cellSeg = document.getElementById('kaleido-cell');
const kaleido = document.getElementById('kaleido');
cellSeg?.addEventListener('e-change', (e) => {
  const detail = (e as CustomEvent<{ value: string }>).detail;
  kaleido?.setAttribute('cell', detail.value);
});
