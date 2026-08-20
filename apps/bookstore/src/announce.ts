// The shop's single polite live region.
//
// Every state change that is only visible as a small repaint — a basket
// counter, a filter chip, a sorted table — is also spoken here, because on a
// panel that repaints in one step there is no motion to notice.

let region: HTMLElement | null = null;

/** Create the live region. Called once by the shell, before any view mounts. */
export function createAnnouncer(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'shop-live';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  region = el;
  return el;
}

/**
 * Announce `message` to assistive technology.
 *
 * Repeating the same string would otherwise be silent, so an identical
 * message is re-seeded through an empty string first — the two writes land in
 * one task and only the second is announced.
 */
export function announce(message: string): void {
  if (!region) return;
  if (region.textContent === message) region.textContent = '';
  region.textContent = message;
}
