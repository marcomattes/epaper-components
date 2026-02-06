export default {
  extends: [
    "stylelint-config-standard",
    "stylelint-config-recommended-scss",
    "stylelint-config-css-modules",
  ],
  plugins: ["stylelint-order"],
  rules: {
    "color-function-notation": "modern",
    "alpha-value-notation": "percentage",
    "selector-max-specificity": "0,2,0",
    "selector-class-pattern": [
      "^eink-[a-z0-9]+(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+-?)+)?(?:--(?:[a-z0-9]+-?)*)?$",
      { resolveNestedSelectors: true },
    ],
    "value-keyword-case": null,
    "property-no-vendor-prefix": null,
    "property-no-deprecated": [true, { ignoreProperties: ["clip"] }],
    "comment-empty-line-before": null,
    "order/properties-order": null,
    "media-feature-range-notation": null,
    "declaration-empty-line-before": null,
    "rule-empty-line-before": null,
  },
  overrides: [
    {
      files: ["**/*.scss"],
      customSyntax: "postcss-scss",
    },
  ],
};
