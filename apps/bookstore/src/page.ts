// The contract between the shell and the seven views.
//
// A view builds its DOM once and is then reused: `enter()` patches whatever the
// route changed and returns the chrome the shell needs. Nothing is torn down
// on navigation, so switching back to a view costs a `hidden` toggle rather
// than a rebuild — and the panel repaints the content area only.

import type { Route } from './router';

export interface Crumb {
  label: string;
  href?: string;
}

export interface PageHead {
  /** Document title, without the shop name. */
  title: string;
  trail: Crumb[];
}

export interface Page {
  /** Root element, appended to the layout content area on first activation. */
  el: HTMLElement;
  /** Optional panel this view contributes to the sider. */
  sider: HTMLElement | null;
  enter(route: Route): PageHead;
  /** Called before another view takes over. */
  leave?(): void;
}
