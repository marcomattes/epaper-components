// The Inkbound Books catalogue.
//
// Twenty fictional titles across the eight shelves the shop sells. Everything
// here is invented — authors, publishers, ISBNs and reviews alike — so nothing
// in the demo depends on a real catalogue or a rights holder.
//
// The data is deliberately static and ordered: `resetDemoData()` restores
// exactly this, which is what makes the demo reproducible.

import type { TreeNode } from '../../../packages/epaper-components/src/core/types';

export type CategoryId =
  | 'scifi'
  | 'fantasy'
  | 'children'
  | 'technology'
  | 'history'
  | 'biography'
  | 'design'
  | 'architecture';

export type FormatId = 'hardcover' | 'paperback' | 'ebook' | 'audiobook';

export type LanguageId = 'en' | 'de';

export type Availability = 'in-stock' | 'low-stock' | 'preorder' | 'out-of-stock';

export type ShelfId = 'new' | 'staff' | 'deal' | 'best';

export interface FormatOption {
  id: FormatId;
  price: number;
}

export interface Review {
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
}

/** The edition a book replaces, shown as a before/after comparison. */
export interface Edition {
  label: string;
  year: string;
  pages: number;
  price: number;
  isbn: string;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  subtitle: string;
  author: string;
  publisher: PublisherId;
  published: string;
  previousPrice?: number;
  pages: number;
  formats: FormatOption[];
  language: LanguageId;
  availability: Availability;
  rating: number;
  reviews: number;
  short: string;
  long: string;
  category: CategoryId;
  tags: string[];
  /** Working days until dispatch reaches the customer. */
  deliveryDays: number;
  contents: TreeNode[];
  priceHistory: number[];
  related: string[];
  previousEdition: Edition;
  shelves: ShelfId[];
  reviewList: Review[];
}

export type PublisherId =
  | 'alder-quill'
  | 'vellum-house'
  | 'sixth-signal'
  | 'northgate'
  | 'meridian'
  | 'foxglove'
  | 'paper-lantern';

export const PUBLISHERS: Record<PublisherId, string> = {
  'alder-quill': 'Alder & Quill',
  'vellum-house': 'Vellum House',
  'sixth-signal': 'Sixth Signal',
  northgate: 'Northgate Academic',
  meridian: 'Meridian Press',
  foxglove: 'Foxglove Editions',
  'paper-lantern': 'Paper Lantern',
};

/** Publishers grouped by house type — the shape `<e-tree-select>` reads. */
export const PUBLISHER_TREE: TreeNode[] = [
  {
    value: 'group-independent',
    label: 'Independent presses',
    children: [
      { value: 'alder-quill', label: 'Alder & Quill' },
      { value: 'vellum-house', label: 'Vellum House' },
      { value: 'sixth-signal', label: 'Sixth Signal' },
    ],
  },
  {
    value: 'group-academic',
    label: 'Academic houses',
    children: [
      { value: 'northgate', label: 'Northgate Academic' },
      { value: 'meridian', label: 'Meridian Press' },
    ],
  },
  {
    value: 'group-illustrated',
    label: 'Illustrated houses',
    children: [
      { value: 'foxglove', label: 'Foxglove Editions' },
      { value: 'paper-lantern', label: 'Paper Lantern' },
    ],
  },
];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  scifi: 'Science fiction',
  fantasy: 'Fantasy',
  children: "Children's books",
  technology: 'Technology',
  history: 'History',
  biography: 'Biography',
  design: 'Design',
  architecture: 'Architecture',
};

/** Spine mark stamped on the generated cover. */
export const CATEGORY_IMPRINT: Record<CategoryId, string> = {
  scifi: 'Science fiction',
  fantasy: 'Fantasy',
  children: 'Young readers',
  technology: 'Technology',
  history: 'History',
  biography: 'Lives',
  design: 'Design',
  architecture: 'Architecture',
};

/** Two-level department tree — the shape `<e-cascader>` and `<e-menu>` read. */
export const CATEGORY_TREE: TreeNode[] = [
  {
    value: 'dept-fiction',
    label: 'Fiction',
    children: [
      { value: 'scifi', label: 'Science fiction' },
      { value: 'fantasy', label: 'Fantasy' },
      { value: 'children', label: "Children's books" },
    ],
  },
  {
    value: 'dept-knowledge',
    label: 'Knowledge',
    children: [
      { value: 'technology', label: 'Technology' },
      { value: 'history', label: 'History' },
      { value: 'biography', label: 'Biography' },
    ],
  },
  {
    value: 'dept-making',
    label: 'Making',
    children: [
      { value: 'design', label: 'Design' },
      { value: 'architecture', label: 'Architecture' },
    ],
  },
];

export const FORMAT_LABELS: Record<FormatId, string> = {
  hardcover: 'Hardcover',
  paperback: 'Paperback',
  ebook: 'E-book',
  audiobook: 'Audiobook',
};

export const LANGUAGE_LABELS: Record<LanguageId, string> = {
  en: 'English',
  de: 'German',
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  'in-stock': 'In stock',
  'low-stock': 'Only a few left',
  preorder: 'Pre-order',
  'out-of-stock': 'Out of stock',
};

export const SHELF_LABELS: Record<ShelfId, string> = {
  new: 'New releases',
  staff: 'Staff picks',
  deal: 'Deals',
  best: 'Bestsellers',
};

/** List price: the first format is the edition the shop leads with. */
export const listPrice = (book: Book): number => book.formats[0]!.price;

export const formatPrice = (book: Book, format: FormatId): number =>
  book.formats.find((option) => option.id === format)?.price ?? listPrice(book);

export const publisherName = (book: Book): string => PUBLISHERS[book.publisher];

export const BOOKS: Book[] = [
  {
    id: 'sf-tidal-archive',
    isbn: '978-3-9421-0017-4',
    title: 'The Tidal Archive',
    subtitle: 'A novel of the drowned libraries',
    author: 'Ines Marek',
    publisher: 'sixth-signal',
    published: '2026-03-17',
    pages: 418,
    formats: [
      { id: 'hardcover', price: 28.0 },
      { id: 'paperback', price: 18.0 },
      { id: 'ebook', price: 13.99 },
      { id: 'audiobook', price: 21.0 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.6,
    reviews: 214,
    short: 'A salvage diver catalogues the books a rising sea took, one shelf at a time.',
    long:
      'Sela Vondt works the flooded stacks of a coastal archive that nobody has funded for ' +
      'thirty years. Each dive recovers a little less, and each catalogue entry becomes an ' +
      'argument about what deserves the last dry room on the hill. Marek writes the ocean as ' +
      'an archivist would: patient, indifferent and very thorough.',
    category: 'scifi',
    tags: ['climate', 'archives', 'near future', 'literary'],
    deliveryDays: 2,
    contents: [
      {
        value: 'p1',
        label: 'Part One · Low Water',
        children: [
          { value: 'p1-1', label: '1. The shelf list' },
          { value: 'p1-2', label: '2. Salt damage' },
          { value: 'p1-3', label: '3. What floats' },
        ],
      },
      {
        value: 'p2',
        label: 'Part Two · Spring Tide',
        children: [
          { value: 'p2-1', label: '4. The dry room' },
          { value: 'p2-2', label: '5. Accession numbers' },
        ],
      },
      {
        value: 'p3',
        label: 'Part Three · Slack',
        children: [
          { value: 'p3-1', label: '6. Deaccession' },
          { value: 'p3-2', label: '7. The tidal archive' },
        ],
      },
    ],
    priceHistory: [32, 32, 30, 30, 29, 28, 28, 28],
    related: ['sf-pale-orbit', 'hi-marginalia', 'sf-quiet-engines'],
    previousEdition: {
      label: 'Proof edition',
      year: '2025',
      pages: 402,
      price: 32.0,
      isbn: '978-3-9421-0009-9',
    },
    shelves: ['new', 'staff'],
    reviewList: [
      {
        author: 'Hedda P.',
        rating: 5,
        date: '2026-06-02',
        title: 'The best kind of slow',
        body: 'Nothing explodes and I could not put it down. The catalogue entries between chapters are the whole book.',
      },
      {
        author: 'Ruben K.',
        rating: 4,
        date: '2026-04-28',
        title: 'Bleak, precise, worth it',
        body: 'The middle third drags a little, then the last fifty pages justify every page before them.',
      },
    ],
  },
  {
    id: 'sf-pale-orbit',
    isbn: '978-3-9421-0022-8',
    title: 'Pale Orbit',
    subtitle: 'Three hundred days above Ceres',
    author: 'Tomas Ferreira',
    publisher: 'sixth-signal',
    published: '2025-09-02',
    previousPrice: 24.0,
    pages: 352,
    formats: [
      { id: 'paperback', price: 16.5 },
      { id: 'ebook', price: 11.99 },
      { id: 'audiobook', price: 18.0 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.2,
    reviews: 486,
    short: 'Two survey pilots, one contract, and a rock that keeps failing its own paperwork.',
    long:
      'A mining survey turns into a procedural standoff when the assay does not match the ' +
      'claim. Ferreira keeps the physics honest and the arguments better: most of the danger ' +
      'here is contractual, and it is far more frightening than vacuum.',
    category: 'scifi',
    tags: ['hard sf', 'asteroid belt', 'labour', 'procedural'],
    deliveryDays: 2,
    contents: [
      {
        value: 'p1',
        label: 'Log One · Approach',
        children: [
          { value: 'p1-1', label: 'Day 1–40: The assay' },
          { value: 'p1-2', label: 'Day 41–90: Dispute' },
        ],
      },
      {
        value: 'p2',
        label: 'Log Two · Station Keeping',
        children: [
          { value: 'p2-1', label: 'Day 91–180: Arbitration' },
          { value: 'p2-2', label: 'Day 181–240: The second core' },
        ],
      },
      {
        value: 'p3',
        label: 'Log Three · Departure',
        children: [{ value: 'p3-1', label: 'Day 241–300: Settlement' }],
      },
    ],
    priceHistory: [24, 24, 24, 22, 20, 18.5, 16.5, 16.5],
    related: ['sf-tidal-archive', 'sf-quiet-engines', 'te-1-bit'],
    previousEdition: {
      label: 'First hardcover',
      year: '2024',
      pages: 344,
      price: 26.0,
      isbn: '978-3-9421-0014-3',
    },
    shelves: ['deal', 'best'],
    reviewList: [
      {
        author: 'Marit S.',
        rating: 4,
        date: '2026-01-19',
        title: 'Paperwork in space',
        body: 'I did not expect an arbitration hearing to be the tensest chapter of any book this year.',
      },
      {
        author: 'Ola D.',
        rating: 5,
        date: '2025-11-30',
        title: 'Reads like a logbook',
        body: 'The day headings make it perfect for reading in short sittings on a commute.',
      },
    ],
  },
  {
    id: 'sf-quiet-engines',
    isbn: '978-3-9418-0044-1',
    title: 'Quiet Engines',
    subtitle: 'Stories from the long deceleration',
    author: 'Ada Okonjo',
    publisher: 'alder-quill',
    published: '2026-09-15',
    pages: 288,
    formats: [
      { id: 'hardcover', price: 26.0 },
      { id: 'ebook', price: 14.99 },
    ],
    language: 'en',
    availability: 'preorder',
    rating: 4.4,
    reviews: 37,
    short: 'Nine stories set aboard ships that will not arrive in any reader’s lifetime.',
    long:
      'Okonjo returns to the generation-ship form and refuses its usual crisis. These crews ' +
      'are not mutinying; they are running committees, keeping allotments and arguing about ' +
      'school timetables. The engines are quiet because the work is.',
    category: 'scifi',
    tags: ['short stories', 'generation ship', 'community'],
    deliveryDays: 5,
    contents: [
      {
        value: 'p1',
        label: 'First Watch',
        children: [
          { value: 'p1-1', label: 'The Allotment Committee' },
          { value: 'p1-2', label: 'Names for the Fourth Deck' },
          { value: 'p1-3', label: 'Quiet Engines' },
        ],
      },
      {
        value: 'p2',
        label: 'Middle Watch',
        children: [
          { value: 'p2-1', label: 'A Timetable for Nobody' },
          { value: 'p2-2', label: 'The Long Deceleration' },
        ],
      },
    ],
    priceHistory: [26, 26, 26, 26, 26, 26, 26, 26],
    related: ['sf-tidal-archive', 'sf-pale-orbit', 'fa-lanternwright'],
    previousEdition: {
      label: 'Chapbook selection',
      year: '2023',
      pages: 96,
      price: 12.0,
      isbn: '978-3-9418-0021-2',
    },
    shelves: ['new'],
    reviewList: [
      {
        author: 'Fenja B.',
        rating: 5,
        date: '2026-08-04',
        title: 'Advance copy — extraordinary',
        body: 'Three of these nine stories will be anthologised for the next twenty years.',
      },
      {
        author: 'Ilja M.',
        rating: 4,
        date: '2026-07-22',
        title: 'Gentle but not soft',
        body: 'Quieter than her novels and better for it, though the last story ends abruptly.',
      },
    ],
  },
  {
    id: 'fa-salt-crown',
    isbn: '978-3-9440-0102-7',
    title: 'The Salt Crown',
    subtitle: 'Book one of the Harrow Tides',
    author: 'Bryn Elgar',
    publisher: 'vellum-house',
    published: '2026-01-20',
    pages: 604,
    formats: [
      { id: 'hardcover', price: 32.0 },
      { id: 'paperback', price: 19.5 },
      { id: 'ebook', price: 15.99 },
      { id: 'audiobook', price: 24.0 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.5,
    reviews: 1042,
    short:
      'A salt-marsh republic elects a queen it does not want, and she takes the job seriously.',
    long:
      'The Harrow marshes have run themselves by committee for four hundred years. When an ' +
      'old treaty forces them to seat a monarch, they choose the candidate least likely to ' +
      'enjoy it. Elgar writes court intrigue with the texture of municipal minutes, and the ' +
      'result is far funnier and far sharper than that sounds.',
    category: 'fantasy',
    tags: ['epic', 'politics', 'series', 'coastal'],
    deliveryDays: 2,
    contents: [
      {
        value: 'p1',
        label: 'Book One · The Treaty',
        children: [
          { value: 'p1-1', label: 'I. Seat of Reeds' },
          { value: 'p1-2', label: 'II. The Unwilling' },
          { value: 'p1-3', label: 'III. Salt Right' },
        ],
      },
      {
        value: 'p2',
        label: 'Book Two · The Crown',
        children: [
          { value: 'p2-1', label: 'IV. Marsh Law' },
          { value: 'p2-2', label: 'V. The Harrow Tides' },
        ],
      },
      { value: 'app', label: 'Appendix · Marsh calendar and offices' },
    ],
    priceHistory: [32, 32, 32, 32, 32, 32, 32, 32],
    related: ['fa-lanternwright', 'fa-nine-gates', 'sf-tidal-archive'],
    previousEdition: {
      label: 'Limited subscriber edition',
      year: '2025',
      pages: 590,
      price: 45.0,
      isbn: '978-3-9440-0088-4',
    },
    shelves: ['new', 'best'],
    reviewList: [
      {
        author: 'Cato R.',
        rating: 5,
        date: '2026-05-16',
        title: 'Bureaucracy has never been this good',
        body: 'Six hundred pages and I have already pre-ordered book two. The appendix is worth reading first.',
      },
      {
        author: 'Wren A.',
        rating: 4,
        date: '2026-03-08',
        title: 'Slow start, huge payoff',
        body: 'Give it a hundred pages. The treaty chapter is where it clicks.',
      },
    ],
  },
  {
    id: 'fa-lanternwright',
    isbn: '978-3-9440-0077-8',
    title: "The Lanternwright's Daughter",
    subtitle: 'A tale of the lamp guilds',
    author: 'Mira Sandoval',
    publisher: 'vellum-house',
    published: '2024-11-05',
    previousPrice: 22.0,
    pages: 376,
    formats: [
      { id: 'paperback', price: 14.0 },
      { id: 'ebook', price: 9.99 },
      { id: 'audiobook', price: 17.0 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.1,
    reviews: 628,
    short: 'An apprentice inherits a workshop, a debt, and the only lamp that will not go out.',
    long:
      'Sandoval builds her magic out of maintenance schedules. Light is a trade with hours, ' +
      'apprenticeships and an inspection regime, and the one lamp that breaks the rules ' +
      'threatens a guild that has more to lose from a miracle than from the dark.',
    category: 'fantasy',
    tags: ['guilds', 'craft', 'standalone', 'cosy'],
    deliveryDays: 2,
    contents: [
      {
        value: 'p1',
        label: 'Part One · Apprentice',
        children: [
          { value: 'p1-1', label: '1. The inventory' },
          { value: 'p1-2', label: '2. Inspection day' },
        ],
      },
      {
        value: 'p2',
        label: 'Part Two · Journeyman',
        children: [
          { value: 'p2-1', label: '3. The lamp that will not go out' },
          { value: 'p2-2', label: '4. A debt in wicks' },
        ],
      },
      {
        value: 'p3',
        label: 'Part Three · Master',
        children: [{ value: 'p3-1', label: '5. The lanternwright' }],
      },
    ],
    priceHistory: [22, 22, 20, 19, 17, 16, 14, 14],
    related: ['fa-salt-crown', 'fa-nine-gates', 'ch-owl-who-forgot'],
    previousEdition: {
      label: 'First paperback',
      year: '2023',
      pages: 368,
      price: 18.0,
      isbn: '978-3-9440-0061-7',
    },
    shelves: ['deal'],
    reviewList: [
      {
        author: 'Nils H.',
        rating: 4,
        date: '2025-12-11',
        title: 'Comfort reading with teeth',
        body: 'Warmer than it looks from the cover, and the guild politics are genuinely well built.',
      },
      {
        author: 'Petra L.',
        rating: 4,
        date: '2025-08-27',
        title: 'Good, not great',
        body: 'Lovely worldbuilding, a slightly tidy ending. Still recommended at this price.',
      },
    ],
  },
  {
    id: 'fa-nine-gates',
    isbn: '978-3-9466-0031-5',
    title: 'Nine Gates of Amber Hollow',
    subtitle: 'An illustrated bestiary',
    author: 'Rowan Kesh',
    publisher: 'foxglove',
    published: '2025-04-15',
    pages: 240,
    formats: [
      { id: 'hardcover', price: 38.0 },
      { id: 'ebook', price: 22.0 },
    ],
    language: 'en',
    availability: 'out-of-stock',
    rating: 4.8,
    reviews: 152,
    short: 'Nine gates, nine keepers, and a field guide to everything that waits behind them.',
    long:
      'Half novella, half bestiary, entirely a printed object. Kesh gives each gate a keeper, ' +
      'a ledger of tolls and a full-page plate. Foxglove printed it letterpress and the ' +
      'reprint has been promised twice.',
    category: 'fantasy',
    tags: ['illustrated', 'bestiary', 'collectible'],
    deliveryDays: 12,
    contents: [
      {
        value: 'p1',
        label: 'The Outer Gates',
        children: [
          { value: 'p1-1', label: 'First Gate · The Toll of Names' },
          { value: 'p1-2', label: 'Second Gate · The Toll of Hours' },
          { value: 'p1-3', label: 'Third Gate · The Toll of Weight' },
        ],
      },
      {
        value: 'p2',
        label: 'The Inner Gates',
        children: [
          { value: 'p2-1', label: 'Fourth to Eighth Gates' },
          { value: 'p2-2', label: 'Ninth Gate · Amber Hollow' },
        ],
      },
      { value: 'plates', label: 'Plates · Nine keepers' },
    ],
    priceHistory: [38, 38, 38, 38, 38, 38, 38, 38],
    related: ['fa-salt-crown', 'de-grid-and-grain', 'ch-counting-crows'],
    previousEdition: {
      label: 'Broadsheet printing',
      year: '2022',
      pages: 32,
      price: 15.0,
      isbn: '978-3-9466-0012-4',
    },
    shelves: ['staff'],
    reviewList: [
      {
        author: 'Juno F.',
        rating: 5,
        date: '2026-02-14',
        title: 'An object, not just a book',
        body: 'The plates alone are worth it. Please reprint this.',
      },
      {
        author: 'Bo T.',
        rating: 5,
        date: '2025-09-09',
        title: 'Perfect gift',
        body: 'Bought two, kept both. The toll ledgers are a lovely structural joke.',
      },
    ],
  },
  {
    id: 'te-slow-web',
    isbn: '978-3-9482-0140-6',
    title: 'The Slow Web',
    subtitle: 'Designing software that waits well',
    author: 'Priya Raman',
    publisher: 'northgate',
    published: '2026-02-10',
    pages: 312,
    formats: [
      { id: 'paperback', price: 34.0 },
      { id: 'ebook', price: 27.0 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.7,
    reviews: 193,
    short: 'What interfaces should do with the seconds they cannot make disappear.',
    long:
      'Raman argues that latency is a design material, not a defect budget. The book works ' +
      'through queueing, offline-first storage and progressive disclosure, and closes with a ' +
      'long chapter on displays that repaint in hundreds of milliseconds rather than sixteen.',
    category: 'technology',
    tags: ['ux', 'performance', 'offline', 'interface'],
    deliveryDays: 3,
    contents: [
      {
        value: 'p1',
        label: 'Part I · Latency as material',
        children: [
          { value: 'p1-1', label: '1. The second that cannot be removed' },
          { value: 'p1-2', label: '2. Queues the user can see' },
        ],
      },
      {
        value: 'p2',
        label: 'Part II · Patterns',
        children: [
          { value: 'p2-1', label: '3. Offline first, sync later' },
          { value: 'p2-2', label: '4. Progressive disclosure' },
          { value: 'p2-3', label: '5. Optimism and its costs' },
        ],
      },
      {
        value: 'p3',
        label: 'Part III · Slow hardware',
        children: [
          { value: 'p3-1', label: '6. Electrophoretic interfaces' },
          { value: 'p3-2', label: '7. Designing for one refresh' },
        ],
      },
    ],
    priceHistory: [34, 34, 34, 34, 34, 34, 34, 34],
    related: ['te-1-bit', 'de-legible', 'te-typesetting-machines'],
    previousEdition: {
      label: 'Self-published draft',
      year: '2024',
      pages: 244,
      price: 22.0,
      isbn: '978-3-9482-0098-0',
    },
    shelves: ['new', 'best'],
    reviewList: [
      {
        author: 'Dana W.',
        rating: 5,
        date: '2026-06-21',
        title: 'Required reading for my team',
        body: 'Chapter six alone paid for the ten copies I bought.',
      },
      {
        author: 'Émile G.',
        rating: 4,
        date: '2026-04-03',
        title: 'Strong, occasionally repetitive',
        body: 'The patterns section restates its thesis a few times too often, but the thesis is right.',
      },
    ],
  },
  {
    id: 'te-1-bit',
    isbn: '978-3-9482-0121-5',
    title: 'One Bit at a Time',
    subtitle: 'A field guide to electrophoretic displays',
    author: 'Hendrik Voss',
    publisher: 'northgate',
    published: '2025-10-28',
    pages: 396,
    formats: [
      { id: 'hardcover', price: 42.0 },
      { id: 'paperback', price: 29.0 },
      { id: 'ebook', price: 24.0 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.9,
    reviews: 341,
    short: 'Waveforms, ghosting and dithering, explained by someone who has measured all three.',
    long:
      'Voss spent eleven years in display controller firmware and writes like it. The book ' +
      'covers particle physics only as far as it must, then spends its length on the things ' +
      'that actually decide whether a panel looks good: waveform selection, dirty-rectangle ' +
      'budgets, temperature compensation and the honest limits of partial refresh.',
    category: 'technology',
    tags: ['e-paper', 'hardware', 'firmware', 'reference'],
    deliveryDays: 2,
    contents: [
      {
        value: 'p1',
        label: 'Part I · The panel',
        children: [
          { value: 'p1-1', label: '1. Particles and pigments' },
          { value: 'p1-2', label: '2. Backplanes' },
        ],
      },
      {
        value: 'p2',
        label: 'Part II · The controller',
        children: [
          { value: 'p2-1', label: '3. Waveform families' },
          { value: 'p2-2', label: '4. Partial refresh and its debts' },
          { value: 'p2-3', label: '5. Temperature compensation' },
        ],
      },
      {
        value: 'p3',
        label: 'Part III · The picture',
        children: [
          { value: 'p3-1', label: '6. Dithering for one bit' },
          { value: 'p3-2', label: '7. Colour filter arrays' },
          { value: 'p3-3', label: '8. Measuring ghosting' },
        ],
      },
      { value: 'app', label: 'Appendix · Waveform reference tables' },
    ],
    priceHistory: [42, 42, 42, 42, 42, 42, 42, 42],
    related: ['te-slow-web', 'de-legible', 'te-typesetting-machines'],
    previousEdition: {
      label: 'Technical report',
      year: '2021',
      pages: 180,
      price: 30.0,
      isbn: '978-3-9482-0060-7',
    },
    shelves: ['staff', 'best'],
    reviewList: [
      {
        author: 'Sanne V.',
        rating: 5,
        date: '2026-07-01',
        title: 'The reference I kept wanting',
        body: 'The waveform tables in the appendix are worth the hardcover price on their own.',
      },
      {
        author: 'Tobias E.',
        rating: 5,
        date: '2026-01-05',
        title: 'Honest about limits',
        body: 'Rare to find a hardware book that tells you what it cannot do. Chapter four is superb.',
      },
    ],
  },
  {
    id: 'te-typesetting-machines',
    isbn: '978-3-9455-0210-9',
    title: 'Typesetting Machines',
    subtitle: 'Sixty years of digital composition',
    author: 'Lucia Brandt',
    publisher: 'meridian',
    published: '2024-08-13',
    previousPrice: 39.0,
    pages: 464,
    formats: [
      { id: 'paperback', price: 26.0 },
      { id: 'ebook', price: 19.0 },
    ],
    language: 'de',
    availability: 'in-stock',
    rating: 4.3,
    reviews: 88,
    short: 'From hot metal to hinting tables, the machines that decided how text looks.',
    long:
      'Brandt traces composition technology from Monotype keyboards to modern rasterisers, ' +
      'and pays unusual attention to the failures: formats that lost, hinting schemes that ' +
      'were abandoned, and the standards nobody implemented twice.',
    category: 'technology',
    tags: ['typography', 'printing', 'history of tech', 'german'],
    deliveryDays: 3,
    contents: [
      {
        value: 'p1',
        label: 'Teil I · Bleisatz',
        children: [
          { value: 'p1-1', label: '1. Monotype und Linotype' },
          { value: 'p1-2', label: '2. Der Handsatz verschwindet' },
        ],
      },
      {
        value: 'p2',
        label: 'Teil II · Fotosatz',
        children: [
          { value: 'p2-1', label: '3. Licht statt Blei' },
          { value: 'p2-2', label: '4. Die Zwischenjahre' },
        ],
      },
      {
        value: 'p3',
        label: 'Teil III · Digitalsatz',
        children: [
          { value: 'p3-1', label: '5. Rasterung und Hinting' },
          { value: 'p3-2', label: '6. Was nicht durchkam' },
        ],
      },
    ],
    priceHistory: [39, 39, 36, 34, 32, 29, 26, 26],
    related: ['de-legible', 'te-1-bit', 'hi-paper-roads'],
    previousEdition: {
      label: 'Erste Auflage',
      year: '2019',
      pages: 402,
      price: 44.0,
      isbn: '978-3-9455-0155-3',
    },
    shelves: ['deal'],
    reviewList: [
      {
        author: 'Gerd M.',
        rating: 5,
        date: '2026-03-30',
        title: 'Gründlich und lesbar',
        body: 'Das Kapitel über gescheiterte Formate ist der beste Teil des Buches.',
      },
      {
        author: 'Annika R.',
        rating: 4,
        date: '2025-10-17',
        title: 'Dense but rewarding',
        body: 'German only for now — an English edition is overdue. The plates are excellent.',
      },
    ],
  },
  {
    id: 'hi-paper-roads',
    isbn: '978-3-9455-0188-1',
    title: 'Paper Roads',
    subtitle: 'How the Hanseatic League moved information',
    author: 'Anselm Krug',
    publisher: 'meridian',
    published: '2025-06-24',
    pages: 528,
    formats: [
      { id: 'hardcover', price: 36.0 },
      { id: 'paperback', price: 24.0 },
      { id: 'ebook', price: 18.0 },
    ],
    language: 'de',
    availability: 'in-stock',
    rating: 4.4,
    reviews: 127,
    short: 'Letters, ledgers and couriers: the network that ran northern Europe before the post.',
    long:
      'Krug reconstructs the League as an information system rather than a trading bloc. ' +
      'Courier schedules, cipher habits and the standard formats of a merchant letter turn ' +
      'out to explain more about Hanseatic power than any tonnage figure.',
    category: 'history',
    tags: ['hanseatic', 'trade', 'communication', 'german'],
    deliveryDays: 3,
    contents: [
      {
        value: 'p1',
        label: 'Teil I · Die Boten',
        children: [
          { value: 'p1-1', label: '1. Fahrpläne des 14. Jahrhunderts' },
          { value: 'p1-2', label: '2. Kosten einer Nachricht' },
        ],
      },
      {
        value: 'p2',
        label: 'Teil II · Die Formate',
        children: [
          { value: 'p2-1', label: '3. Der Kaufmannsbrief' },
          { value: 'p2-2', label: '4. Rechnungsbücher als Archiv' },
        ],
      },
      {
        value: 'p3',
        label: 'Teil III · Das Netz',
        children: [{ value: 'p3-1', label: '5. Papierstraßen' }],
      },
    ],
    priceHistory: [36, 36, 36, 36, 36, 36, 36, 36],
    related: ['hi-marginalia', 'ar-brick-by-ledger', 'te-typesetting-machines'],
    previousEdition: {
      label: 'Habilitationsschrift',
      year: '2020',
      pages: 610,
      price: 68.0,
      isbn: '978-3-9455-0101-0',
    },
    shelves: ['best'],
    reviewList: [
      {
        author: 'Heike D.',
        rating: 5,
        date: '2026-05-08',
        title: 'Ein Netzwerkbuch',
        body: 'Endlich eine Hanse-Geschichte, die nicht bei Schiffen aufhört.',
      },
      {
        author: 'Lars T.',
        rating: 4,
        date: '2025-12-02',
        title: 'Excellent, needs a map',
        body: 'The courier chapter cries out for a fold-out map. Otherwise superb.',
      },
    ],
  },
  {
    id: 'hi-marginalia',
    isbn: '978-3-9482-0155-0',
    title: 'Marginalia',
    subtitle: 'Readers who wrote back, 1450–1700',
    author: 'Sofia Larsen',
    publisher: 'northgate',
    published: '2026-05-12',
    pages: 344,
    formats: [
      { id: 'hardcover', price: 33.0 },
      { id: 'ebook', price: 21.0 },
    ],
    language: 'en',
    availability: 'low-stock',
    rating: 4.5,
    reviews: 64,
    short: 'Two and a half centuries of readers arguing with their books in the margins.',
    long:
      'Larsen read four thousand annotated volumes so nobody else has to. The result is a ' +
      'history of reading told entirely through complaint, correction and shopping lists ' +
      'written where the printer left space.',
    category: 'history',
    tags: ['reading', 'early modern', 'books about books'],
    deliveryDays: 4,
    contents: [
      {
        value: 'p1',
        label: 'Part I · The hand in the margin',
        children: [
          { value: 'p1-1', label: '1. Who wrote here' },
          { value: 'p1-2', label: '2. Tools and inks' },
        ],
      },
      {
        value: 'p2',
        label: 'Part II · What they said',
        children: [
          { value: 'p2-1', label: '3. Corrections' },
          { value: 'p2-2', label: '4. Arguments' },
          { value: 'p2-3', label: '5. Everything else' },
        ],
      },
    ],
    priceHistory: [33, 33, 33, 33, 33, 33, 33, 33],
    related: ['hi-paper-roads', 'sf-tidal-archive', 'te-typesetting-machines'],
    previousEdition: {
      label: 'Exhibition catalogue',
      year: '2023',
      pages: 128,
      price: 24.0,
      isbn: '978-3-9482-0090-4',
    },
    shelves: ['new'],
    reviewList: [
      {
        author: 'Nora B.',
        rating: 5,
        date: '2026-07-19',
        title: 'Delightful and rigorous',
        body: 'The shopping-list chapter is the funniest thing I have read in an academic press book.',
      },
      {
        author: 'Piotr Z.',
        rating: 4,
        date: '2026-06-11',
        title: 'Wonderful, badly bound',
        body: 'Content is five stars; my copy started shedding pages at chapter three.',
      },
    ],
  },
  {
    id: 'bi-woman-who-drew-light',
    isbn: '978-3-9418-0058-8',
    title: 'The Woman Who Drew Light',
    subtitle: 'A life of Hedwig Ruhl, engraver',
    author: 'Clara Denhoff',
    publisher: 'alder-quill',
    published: '2026-04-07',
    pages: 432,
    formats: [
      { id: 'hardcover', price: 30.0 },
      { id: 'paperback', price: 20.0 },
      { id: 'ebook', price: 16.0 },
      { id: 'audiobook', price: 22.0 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.6,
    reviews: 176,
    short: 'The engraver who taught a century of printers how to render a shadow.',
    long:
      'Hedwig Ruhl cut plates for forty-one years and signed almost none of them. Denhoff ' +
      'reassembles the career from workshop ledgers, then makes the case that the standard ' +
      'grammar of printed shading is substantially hers.',
    category: 'biography',
    tags: ['engraving', 'women in print', 'attribution'],
    deliveryDays: 2,
    contents: [
      {
        value: 'p1',
        label: 'Part One · Apprenticed',
        children: [
          { value: 'p1-1', label: '1. Ledger entries, 1861' },
          { value: 'p1-2', label: '2. The burin' },
        ],
      },
      {
        value: 'p2',
        label: 'Part Two · Unsigned',
        children: [
          { value: 'p2-1', label: '3. Forty-one years' },
          { value: 'p2-2', label: '4. The shading grammar' },
        ],
      },
      {
        value: 'p3',
        label: 'Part Three · Attributed',
        children: [{ value: 'p3-1', label: '5. Reading the plates back' }],
      },
    ],
    priceHistory: [30, 30, 30, 30, 30, 30, 30, 30],
    related: ['bi-compositor', 'de-grid-and-grain', 'te-typesetting-machines'],
    previousEdition: {
      label: 'Journal article',
      year: '2022',
      pages: 48,
      price: 9.0,
      isbn: '978-3-9418-0011-3',
    },
    shelves: ['new', 'staff'],
    reviewList: [
      {
        author: 'Malin O.',
        rating: 5,
        date: '2026-07-08',
        title: 'A model biography',
        body: 'Denhoff never overstates the evidence, which somehow makes the argument land harder.',
      },
      {
        author: 'Rafi N.',
        rating: 4,
        date: '2026-05-27',
        title: 'Wanted more plates',
        body: 'Sixteen pages of reproductions is not enough for a book about engraving.',
      },
    ],
  },
  {
    id: 'bi-compositor',
    isbn: '978-3-9418-0035-9',
    title: 'Compositor',
    subtitle: 'Sixty years in the pressroom',
    author: 'Otto Brandeis with Jonas Wehr',
    publisher: 'alder-quill',
    published: '2025-02-18',
    pages: 288,
    formats: [
      { id: 'paperback', price: 18.0 },
      { id: 'ebook', price: 12.99 },
      { id: 'audiobook', price: 16.0 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.2,
    reviews: 95,
    short: 'A hand compositor talks through the trade that outlived him by refusing to.',
    long:
      'Brandeis started setting type at fifteen and stopped at seventy-five, by which point ' +
      'the job had changed three times underneath him. Told to Wehr over two years of ' +
      'interviews, this is oral history with ink under its fingernails.',
    category: 'biography',
    tags: ['oral history', 'printing', 'trade'],
    deliveryDays: 2,
    contents: [
      {
        value: 'p1',
        label: 'Part One · The case',
        children: [
          { value: 'p1-1', label: '1. Fifteen' },
          { value: 'p1-2', label: '2. Learning the lay' },
        ],
      },
      {
        value: 'p2',
        label: 'Part Two · The machines',
        children: [
          { value: 'p2-1', label: '3. Linotype years' },
          { value: 'p2-2', label: '4. Photosetting' },
        ],
      },
      {
        value: 'p3',
        label: 'Part Three · The screen',
        children: [{ value: 'p3-1', label: '5. Seventy-five' }],
      },
    ],
    priceHistory: [18, 18, 18, 18, 18, 18, 18, 18],
    related: ['bi-woman-who-drew-light', 'te-typesetting-machines', 'de-legible'],
    previousEdition: {
      label: 'Radio transcript',
      year: '2021',
      pages: 64,
      price: 8.0,
      isbn: '978-3-9418-0004-5',
    },
    shelves: ['best'],
    reviewList: [
      {
        author: 'Ida K.',
        rating: 4,
        date: '2026-02-02',
        title: 'A voice you trust',
        body: 'The audiobook is the way to read this one — Wehr keeps Brandeis’s cadence.',
      },
      {
        author: 'Sam O.',
        rating: 4,
        date: '2025-07-14',
        title: 'Warm and specific',
        body: 'Occasionally repeats itself, which is exactly what an interview book does.',
      },
    ],
  },
  {
    id: 'de-grid-and-grain',
    isbn: '978-3-9466-0055-1',
    title: 'Grid and Grain',
    subtitle: 'A working manual for print layout',
    author: 'Elise Vandenberg',
    publisher: 'foxglove',
    published: '2026-10-06',
    pages: 264,
    formats: [
      { id: 'hardcover', price: 45.0 },
      { id: 'ebook', price: 32.0 },
    ],
    language: 'en',
    availability: 'preorder',
    rating: 4.7,
    reviews: 22,
    short: 'Baseline grids, paper direction and the arithmetic that keeps a page honest.',
    long:
      'A manual rather than a monograph: every spread pairs a rule with a worked example and ' +
      'the measurements to reproduce it. Vandenberg is unusually good on paper grain, which ' +
      'most layout books treat as somebody else’s problem.',
    category: 'design',
    tags: ['layout', 'grids', 'manual', 'print'],
    deliveryDays: 6,
    contents: [
      {
        value: 'p1',
        label: 'Section 1 · The measure',
        children: [
          { value: 'p1-1', label: '1.1 Baseline arithmetic' },
          { value: 'p1-2', label: '1.2 Column and gutter' },
        ],
      },
      {
        value: 'p2',
        label: 'Section 2 · The sheet',
        children: [
          { value: 'p2-1', label: '2.1 Grain direction' },
          { value: 'p2-2', label: '2.2 Imposition' },
        ],
      },
      {
        value: 'p3',
        label: 'Section 3 · The page',
        children: [
          { value: 'p3-1', label: '3.1 Worked examples' },
          { value: 'p3-2', label: '3.2 When to break the grid' },
        ],
      },
    ],
    priceHistory: [45, 45, 45, 45, 45, 45, 45, 45],
    related: ['de-legible', 'ar-quiet-buildings', 'fa-nine-gates'],
    previousEdition: {
      label: 'Workshop handout',
      year: '2024',
      pages: 72,
      price: 18.0,
      isbn: '978-3-9466-0030-8',
    },
    shelves: ['new'],
    reviewList: [
      {
        author: 'Vera S.',
        rating: 5,
        date: '2026-08-12',
        title: 'Pre-ordered on the sample spreads',
        body: 'Foxglove sent twelve pages as a sampler and I ordered immediately.',
      },
      {
        author: 'Kai L.',
        rating: 4,
        date: '2026-08-01',
        title: 'Expensive but complete',
        body: 'Forty-five euro is a lot. It is also the only book that covers grain properly.',
      },
    ],
  },
  {
    id: 'de-legible',
    isbn: '978-3-9466-0048-3',
    title: 'Legible',
    subtitle: 'Type for surfaces that do not glow',
    author: 'Marko Petrić',
    publisher: 'foxglove',
    published: '2025-11-11',
    pages: 208,
    formats: [
      { id: 'hardcover', price: 34.0 },
      { id: 'paperback', price: 23.0 },
      { id: 'ebook', price: 18.0 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.6,
    reviews: 258,
    short: 'Choosing and setting type for paper, ink and electrophoretic panels.',
    long:
      'Petrić treats reflective surfaces as one family with shared rules: heavier hairlines, ' +
      'wider spacing, and a hard limit on optical tricks that need backlight to work. The ' +
      'specimen section covers thirty families at panel resolutions.',
    category: 'design',
    tags: ['typography', 'e-paper', 'specimens', 'legibility'],
    deliveryDays: 2,
    contents: [
      {
        value: 'p1',
        label: 'Part One · Reflected light',
        children: [
          { value: 'p1-1', label: '1. Why paper is not a screen' },
          { value: 'p1-2', label: '2. Contrast without brightness' },
        ],
      },
      {
        value: 'p2',
        label: 'Part Two · Setting',
        children: [
          { value: 'p2-1', label: '3. Weight and hairlines' },
          { value: 'p2-2', label: '4. Spacing at low resolution' },
        ],
      },
      { value: 'spec', label: 'Specimens · Thirty families' },
    ],
    priceHistory: [34, 34, 34, 34, 34, 34, 34, 34],
    related: ['de-grid-and-grain', 'te-1-bit', 'te-slow-web'],
    previousEdition: {
      label: 'Conference edition',
      year: '2023',
      pages: 144,
      price: 25.0,
      isbn: '978-3-9466-0022-3',
    },
    shelves: ['staff', 'best'],
    reviewList: [
      {
        author: 'Tomás A.',
        rating: 5,
        date: '2026-04-22',
        title: 'The specimens sold me',
        body: 'Thirty families set at real panel resolution — nobody else has published this.',
      },
      {
        author: 'Greta H.',
        rating: 4,
        date: '2026-01-13',
        title: 'Short and dense',
        body: 'Two hundred pages, no filler. I would have paid the same for twice the specimens.',
      },
    ],
  },
  {
    id: 'ar-quiet-buildings',
    isbn: '978-3-9471-0083-2',
    title: 'Quiet Buildings',
    subtitle: 'Twelve houses that make no noise',
    author: 'Hana Yoshimura',
    publisher: 'paper-lantern',
    published: '2026-02-24',
    pages: 296,
    formats: [
      { id: 'hardcover', price: 40.0 },
      { id: 'ebook', price: 28.0 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.5,
    reviews: 143,
    short: 'Twelve small houses documented in plan, section and acoustic measurement.',
    long:
      'Yoshimura visited twelve houses built for quiet and measured every one. The plates ' +
      'pair conventional drawings with reverberation data, which turns a coffee-table format ' +
      'into something a working architect can actually use.',
    category: 'architecture',
    tags: ['houses', 'acoustics', 'drawings', 'small buildings'],
    deliveryDays: 3,
    contents: [
      {
        value: 'p1',
        label: 'Part One · Measure',
        children: [
          { value: 'p1-1', label: '1. What quiet means' },
          { value: 'p1-2', label: '2. Method and instruments' },
        ],
      },
      {
        value: 'p2',
        label: 'Part Two · Twelve houses',
        children: [
          { value: 'p2-1', label: 'Houses 1–6' },
          { value: 'p2-2', label: 'Houses 7–12' },
        ],
      },
      { value: 'p3', label: 'Part Three · Drawings and data' },
    ],
    priceHistory: [40, 40, 40, 40, 40, 40, 40, 40],
    related: ['ar-brick-by-ledger', 'de-grid-and-grain', 'de-legible'],
    previousEdition: {
      label: 'Gallery booklet',
      year: '2024',
      pages: 88,
      price: 20.0,
      isbn: '978-3-9471-0044-3',
    },
    shelves: ['new', 'staff'],
    reviewList: [
      {
        author: 'Yara D.',
        rating: 5,
        date: '2026-06-30',
        title: 'Data with the drawings',
        body: 'Finally an architecture book with numbers in it. House seven is a masterclass.',
      },
      {
        author: 'Sven P.',
        rating: 4,
        date: '2026-03-19',
        title: 'Beautiful, heavy',
        body: 'Gorgeous printing. Do not expect to read it anywhere but a table.',
      },
    ],
  },
  {
    id: 'ar-brick-by-ledger',
    isbn: '978-3-9455-0166-9',
    title: 'Brick by Ledger',
    subtitle: "The account books of Hamburg's warehouse district",
    author: 'Anselm Krug',
    publisher: 'meridian',
    published: '2024-09-30',
    previousPrice: 32.0,
    pages: 384,
    formats: [
      { id: 'paperback', price: 21.0 },
      { id: 'ebook', price: 15.0 },
    ],
    language: 'de',
    availability: 'in-stock',
    rating: 4.0,
    reviews: 51,
    short: 'What the building accounts reveal about the Speicherstadt that the façades hide.',
    long:
      'Krug works through forty years of construction ledgers to show a warehouse district ' +
      'assembled from compromises: substituted bricks, renegotiated spans and a roofline ' +
      'decided by a tax boundary rather than by any architect.',
    category: 'architecture',
    tags: ['hamburg', 'warehouses', 'construction history', 'german'],
    deliveryDays: 3,
    contents: [
      {
        value: 'p1',
        label: 'Teil I · Die Bücher',
        children: [
          { value: 'p1-1', label: '1. Quellenlage' },
          { value: 'p1-2', label: '2. Wer bezahlte was' },
        ],
      },
      {
        value: 'p2',
        label: 'Teil II · Die Bauten',
        children: [
          { value: 'p2-1', label: '3. Ziegel und Ersatz' },
          { value: 'p2-2', label: '4. Spannweiten' },
        ],
      },
      {
        value: 'p3',
        label: 'Teil III · Die Traufe',
        children: [{ value: 'p3-1', label: '5. Eine Steuergrenze als Entwurf' }],
      },
    ],
    priceHistory: [32, 32, 30, 28, 26, 24, 21, 21],
    related: ['ar-quiet-buildings', 'hi-paper-roads', 'hi-marginalia'],
    previousEdition: {
      label: 'Erste Auflage',
      year: '2021',
      pages: 356,
      price: 34.0,
      isbn: '978-3-9455-0120-1',
    },
    shelves: ['deal'],
    reviewList: [
      {
        author: 'Kerstin A.',
        rating: 4,
        date: '2026-01-27',
        title: 'Archivarbeit, die sich lohnt',
        body: 'Das Kapitel über die Steuergrenze erklärt die Dachlandschaft besser als jede Führung.',
      },
      {
        author: 'Milan J.',
        rating: 4,
        date: '2025-05-06',
        title: 'Niche and excellent',
        body: 'If you have walked the Speicherstadt and wondered why, this is the answer.',
      },
    ],
  },
  {
    id: 'ch-owl-who-forgot',
    isbn: '978-3-9471-0097-9',
    title: 'The Owl Who Forgot the Night',
    subtitle: 'A bedtime story for late risers',
    author: 'Nell Achterberg',
    publisher: 'paper-lantern',
    published: '2026-05-05',
    pages: 48,
    formats: [
      { id: 'hardcover', price: 16.0 },
      { id: 'ebook', price: 9.99 },
      { id: 'audiobook', price: 12.0 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.8,
    reviews: 302,
    short: 'An owl sleeps through dusk and has to learn the daytime from scratch.',
    long:
      'Achterberg’s owl misses nightfall and spends a whole bright day working out what all ' +
      'these loud, colourful creatures are for. Cut-paper artwork, forty-eight pages, and a ' +
      'last spread that has reduced several adults to silence.',
    category: 'children',
    tags: ['picture book', 'ages 3-6', 'bedtime', 'illustrated'],
    deliveryDays: 2,
    contents: [
      { value: 'p1', label: 'Part One · A very bright morning' },
      { value: 'p2', label: 'Part Two · Everyone is awake' },
      { value: 'p3', label: 'Part Three · The owl remembers' },
    ],
    priceHistory: [16, 16, 16, 16, 16, 16, 16, 16],
    related: ['ch-paper-boat-post', 'ch-counting-crows', 'fa-lanternwright'],
    previousEdition: {
      label: 'Board-book edition',
      year: '2024',
      pages: 24,
      price: 10.0,
      isbn: '978-3-9471-0051-1',
    },
    shelves: ['new', 'staff'],
    reviewList: [
      {
        author: 'Britta H.',
        rating: 5,
        date: '2026-07-25',
        title: 'Requested nightly',
        body: 'Four-year-old approved, eleven nights running. The cut-paper work is beautiful.',
      },
      {
        author: 'Jean-Luc V.',
        rating: 5,
        date: '2026-06-04',
        title: 'The last spread',
        body: 'I was not prepared for the last spread. Buy it.',
      },
    ],
  },
  {
    id: 'ch-paper-boat-post',
    isbn: '978-3-9471-0062-7',
    title: 'Paper Boat Post',
    subtitle: 'Letters from a very small harbour',
    author: 'Nell Achterberg',
    publisher: 'paper-lantern',
    published: '2025-03-11',
    previousPrice: 15.0,
    pages: 56,
    formats: [
      { id: 'hardcover', price: 11.0 },
      { id: 'ebook', price: 7.99 },
    ],
    language: 'en',
    availability: 'in-stock',
    rating: 4.4,
    reviews: 187,
    short: 'Twelve letters, twelve paper boats, and one harbour that answers all of them.',
    long:
      'A child posts letters in folded paper boats and the harbour writes back — from the ' +
      'lighthouse, the ferry, a heron and eventually the sea itself. Each spread includes ' +
      'folding instructions for the boat that carried it.',
    category: 'children',
    tags: ['picture book', 'ages 5-8', 'letters', 'craft'],
    deliveryDays: 2,
    contents: [
      { value: 'p1', label: 'Letters One to Four' },
      { value: 'p2', label: 'Letters Five to Eight' },
      { value: 'p3', label: 'Letters Nine to Twelve' },
      { value: 'p4', label: 'How to fold every boat' },
    ],
    priceHistory: [15, 15, 15, 14, 13, 12, 11, 11],
    related: ['ch-owl-who-forgot', 'ch-counting-crows', 'de-grid-and-grain'],
    previousEdition: {
      label: 'First printing',
      year: '2023',
      pages: 52,
      price: 14.0,
      isbn: '978-3-9471-0033-7',
    },
    shelves: ['deal'],
    reviewList: [
      {
        author: 'Aina F.',
        rating: 5,
        date: '2026-02-09',
        title: 'We folded all twelve',
        body: 'The instructions actually work, which is more than I can say for most craft books.',
      },
      {
        author: 'Dorothee W.',
        rating: 4,
        date: '2025-09-21',
        title: 'Sweet, slightly slight',
        body: 'Lovely idea, over quickly. The heron letter is the best one.',
      },
    ],
  },
  {
    id: 'ch-counting-crows',
    isbn: '978-3-9466-0039-1',
    title: 'Counting Crows on the Elbe',
    subtitle: 'A number book for river walks',
    author: 'Jonas Wehr',
    publisher: 'foxglove',
    published: '2024-12-02',
    pages: 40,
    formats: [
      { id: 'hardcover', price: 14.0 },
      { id: 'ebook', price: 8.99 },
    ],
    language: 'en',
    availability: 'low-stock',
    rating: 4.3,
    reviews: 96,
    short: 'Counting from one to twenty along a river, with a crow hidden on every spread.',
    long:
      'A counting book that doubles as a river walk: cranes, barges, gulls and one persistent ' +
      'crow who appears on every spread whether or not the number calls for it. Wehr’s ' +
      'linocuts print beautifully in one colour.',
    category: 'children',
    tags: ['picture book', 'ages 2-5', 'counting', 'linocut'],
    deliveryDays: 4,
    contents: [
      { value: 'p1', label: 'One to Ten · The harbour' },
      { value: 'p2', label: 'Eleven to Twenty · Upriver' },
      { value: 'p3', label: 'Find the crow · Answers' },
    ],
    priceHistory: [14, 14, 14, 14, 14, 14, 14, 14],
    related: ['ch-owl-who-forgot', 'ch-paper-boat-post', 'ar-brick-by-ledger'],
    previousEdition: {
      label: 'Print-fair edition',
      year: '2022',
      pages: 24,
      price: 12.0,
      isbn: '978-3-9466-0008-7',
    },
    shelves: ['best'],
    reviewList: [
      {
        author: 'Femke R.',
        rating: 4,
        date: '2026-05-02',
        title: 'The crow is the point',
        body: 'Counting is fine. Finding the crow is what my daughter actually wants to do.',
      },
      {
        author: 'Hugo B.',
        rating: 5,
        date: '2025-06-17',
        title: 'Linocuts in one colour',
        body: 'Prints beautifully. Wish the run were bigger — it keeps selling out.',
      },
    ],
  },
];

export const BOOK_BY_ID = new Map(BOOKS.map((book) => [book.id, book]));

export const bookById = (id: string): Book | undefined => BOOK_BY_ID.get(id);

/** The title the storefront leads with. */
export const FEATURED_ID = 'te-1-bit';

/** Titles announced but not yet published — the account calendar reads these. */
export const UPCOMING = [
  { id: 'sf-quiet-engines', date: '2026-09-15' },
  { id: 'de-grid-and-grain', date: '2026-10-06' },
  { id: 'fa-nine-gates', date: '2026-09-29', note: 'Reprint' },
];
