import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';
import { customElementJetBrainsPlugin } from 'custom-element-jet-brains-integration';

/**
 * Detects calls to the project's local `define('e-tag', ClassName)` helper
 * (re-exported from src/core/dom.ts) and marks the corresponding class
 * declaration as a custom element. Without this, the analyzer only sees
 * plain ES classes because it looks for `customElements.define(...)` directly.
 */
function localDefinePlugin() {
  /** @type {Array<{ tag: string; className: string; modulePath: string }>} */
  const found = [];

  return {
    name: 'epaper-local-define',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isCallExpression(node)) return;
      const expr = node.expression;
      // Match `define('e-foo', EFoo)` — bare identifier call.
      if (!ts.isIdentifier(expr) || expr.text !== 'define') return;
      const [arg0, arg1] = node.arguments;
      if (!arg0 || !arg1) return;
      if (!ts.isStringLiteral(arg0)) return;
      if (!ts.isIdentifier(arg1)) return;
      const tag = arg0.text;
      const className = arg1.text;
      if (!tag.includes('-')) return; // must be a valid custom element name
      found.push({ tag, className, modulePath: moduleDoc.path });

      // Promote the matching class declaration to a custom-element declaration.
      const decl = (moduleDoc.declarations ?? []).find(
        (d) => d.kind === 'class' && d.name === className,
      );
      if (decl) {
        decl.customElement = true;
        decl.tagName = tag;
      }
    },
    packageLinkPhase({ customElementsManifest }) {
      // Ensure each detected pair has a `custom-element-definition` export entry,
      // which is what downstream plugins (vs-code, jet-brains) iterate over.
      for (const { tag, className, modulePath } of found) {
        const mod = customElementsManifest.modules.find((m) => m.path === modulePath);
        if (!mod) continue;
        mod.exports = mod.exports ?? [];
        const already = mod.exports.some(
          (e) => e.kind === 'custom-element-definition' && e.name === tag,
        );
        if (already) continue;
        mod.exports.push({
          kind: 'custom-element-definition',
          name: tag,
          declaration: { name: className, module: modulePath },
        });
      }
    },
  };
}

/** @type {import('@custom-elements-manifest/analyzer').Config} */
export default {
  globs: ['src/components/**/*.ts'],
  exclude: ['src/**/*.stories.ts', 'src/**/*.test.ts'],
  outdir: 'dist',
  litelement: false,
  fastelement: false,
  stencil: false,
  catalyst: false,
  dev: false,
  watch: false,
  packagejson: true,
  plugins: [
    localDefinePlugin(),
    customElementVsCodePlugin({
      outdir: 'dist',
      htmlFileName: 'vscode.html-custom-data.json',
      cssFileName: 'vscode.css-custom-data.json',
    }),
    customElementJetBrainsPlugin({
      outdir: 'dist',
      excludeCss: false,
      packageJson: false,
    }),
  ],
};
