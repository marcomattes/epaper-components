// Compiled with `tsc -p sample-app/tsconfig.json --noEmit` against the
// project's own strict compiler options, against the *built* dist/ output —
// this is what a real consumer's editor and build actually see, not the
// library's internal src/ types.
//
// It exists to keep README.md's TypeScript claims honest: the tag-map
// augmentation and the typed-listener pattern shown there must compile as
// written, not just look plausible.

import type { EButton, EInput, EChangeDetail } from '@marcomattes/epaper-components';

// `HTMLElementTagNameMap` augmentation: querySelector('e-button') must be
// typed as EButton without a cast.
const button: EButton | null = document.querySelector('e-button');
const input: EInput | null = document.querySelector('e-input');

button?.addEventListener('e-click', (e) => {
  // e-click's detail is { originalEvent: MouseEvent }, not the EChangeDetail
  // default; this line only compiles if the JSDoc-derived type is honored.
  const { originalEvent } = (e as CustomEvent<{ originalEvent: MouseEvent }>).detail;
  originalEvent satisfies MouseEvent;
});

// The README's documented pattern for a custom event listener under
// `strict: true`. `'e-change'` is not a key of HTMLElementEventMap, so
// addEventListener falls back to its untyped overload — the listener must be
// typed `Event` and narrowed inside the body, or this file fails to compile.
input?.addEventListener('e-change', (e: Event) => {
  const { value } = (e as CustomEvent<EChangeDetail<string>>).detail;
  value.toUpperCase() satisfies string;
});
