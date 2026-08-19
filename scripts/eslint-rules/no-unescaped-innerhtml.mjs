// Mechanical enforcement of CLAUDE.md hard rule #1: every value interpolated
// into an `innerHTML` template literal must go through `esc()`. Skipping it
// is an XSS vector the moment the interpolated expression stops being
// compile-time-safe data — which is exactly the kind of change a future
// refactor can introduce without anyone noticing, since the string still
// looks fine in review. This rule catches it at lint time instead.
//
// Design note: a naive "every ${} must literally be esc(...)" check has real
// false positives in this codebase — `${iconSvg(...)}` returns trusted,
// pre-built SVG markup (not user data), ternaries frequently branch between
// static string literals (`${cond ? 'checked' : ''}`), and several
// components build a list of markup with `items.map(item => \`...\`).join('')`
// where the per-item template already escapes its own interpolations. All
// three shapes are recognized as safe below; anything else is flagged.

const SAFE_CALLEES = new Set(['esc', 'iconSvg']);

function isSafeExpression(node) {
  if (!node) return true;
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string';
    case 'TemplateLiteral':
      return node.expressions.every(isSafeExpression);
    case 'ConditionalExpression':
      return isSafeExpression(node.consequent) && isSafeExpression(node.alternate);
    case 'CallExpression':
      return isSafeCall(node);
    default:
      return false;
  }
}

function isSafeCall(node) {
  const { callee } = node;
  if (callee.type === 'Identifier' && SAFE_CALLEES.has(callee.name)) return true;
  // `<items>.map(item => `...`).join(sep)` — safe when the per-item
  // template it builds is itself made of safe expressions.
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'join'
  ) {
    return isSafeMapCall(callee.object);
  }
  return false;
}

function isSafeMapCall(node) {
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    node.callee.property.type !== 'Identifier' ||
    node.callee.property.name !== 'map'
  ) {
    return false;
  }
  const callback = node.arguments[node.arguments.length - 1];
  if (
    !callback ||
    (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')
  ) {
    return false;
  }
  const { body } = callback;
  if (body.type === 'BlockStatement') {
    const returns = body.body.filter((statement) => statement.type === 'ReturnStatement');
    return returns.length > 0 && returns.every((statement) => isSafeExpression(statement.argument));
  }
  return isSafeExpression(body);
}

function isInnerHtmlAssignmentTarget(node) {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'innerHTML'
  );
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require every interpolated expression in an innerHTML template literal to be escaped (esc()/iconSvg(), a ternary or map/join built from safe values), or built through the html tagged template.',
    },
    schema: [],
    messages: {
      unescaped:
        'Interpolated value in an innerHTML template literal is not escaped. Wrap it in esc() (see core/dom.ts) — CLAUDE.md hard rule #1 requires esc() for every interpolated string in innerHTML; skipping it is an XSS vector.',
    },
  },
  create(context) {
    return {
      AssignmentExpression(node) {
        if (node.operator !== '=' || !isInnerHtmlAssignmentTarget(node.left)) return;
        const { right } = node;
        // Built through the auto-escaping `html` tagged template — every
        // interpolation is escaped by definition, nothing further to check.
        if (
          right.type === 'TaggedTemplateExpression' &&
          right.tag.type === 'Identifier' &&
          right.tag.name === 'html'
        ) {
          return;
        }
        if (right.type !== 'TemplateLiteral') return;
        for (const expression of right.expressions) {
          if (!isSafeExpression(expression)) {
            context.report({ node: expression, messageId: 'unescaped' });
          }
        }
      },
    };
  },
};
