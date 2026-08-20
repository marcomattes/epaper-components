// Inkbound Books — entry point.
//
// Loads the library's stylesheets in their documented cascade order (tokens →
// theme packs → base → components), registers all 95 custom elements, restores
// whatever this browser remembered, and hands the shop its root element.
//
// The library is imported from source, the same way apps/site does it, so a
// change to a component shows up here without a build step in between.
import '../../../packages/epaper-components/src/styles/tokens.css';
import '../../../packages/epaper-components/src/styles/themes/kaleido.css';
import '../../../packages/epaper-components/src/styles/themes/mono-high-contrast.css';
import '../../../packages/epaper-components/src/styles/base.css';
import '../../../packages/epaper-components/src/styles/components.css';
import './shop.css';
// Side-effect import: every `define()` in the barrel runs here, so the custom
// elements are registered before the first `document.createElement('e-…')`.
import '../../../packages/epaper-components/src/index';

import { loadState } from './state';
import { mountShop } from './shell';

const root = document.getElementById('shop-root');
if (root) {
  loadState();
  mountShop(root);
}
