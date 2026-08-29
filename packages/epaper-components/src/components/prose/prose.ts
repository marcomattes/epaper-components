import { define, EpaperElement } from '../../core/dom';

/**
 * @summary Typographic container for rich document content.
 * @since v1.3.0
 *
 * Purely a class carrier: the authored markup — `<h2>`, `<p>`, `<ul>`/`<ol>`,
 * `<blockquote>`, `<figure>` and `<table>` — is styled through
 * `components.css` child selectors, so there is nothing to render and no
 * user text is ever interpolated into a template. That also means a nested
 * component (`<e-title>`, `<e-image>`, …) keeps working unchanged inside it.
 *
 * Pair with `<e-toc>` for an auto-generated table of contents: `<e-toc>`
 * scans a document's `<h2>`/`<h3>` elements — including plain ones inside an
 * `<e-prose>` — and assigns them the same auto-id an `<e-title>` would.
 *
 * @slot - Document body: `<h2>`, `<p>`, `<ul>`, `<ol>`, `<blockquote>`, `<figure>`, `<table>`.
 *
 * @example
 * <e-prose>
 *   <h2>Background</h2>
 *   <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
 *   <ul>
 *     <li>First point</li>
 *     <li>Second point</li>
 *   </ul>
 *   <blockquote>A quoted remark.</blockquote>
 * </e-prose>
 */
export class EProse extends EpaperElement {
  connectedCallback() {
    this.classList.add('ink-prose');
  }
}

define('e-prose', EProse);
