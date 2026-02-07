# Changelog

All notable changes to this project will be documented in this file.

See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## 1.0.0 (2026-02-07)

### Features

- **Initial Release**: CSS-first component library optimized for E-Paper displays
- **Zero JavaScript**: Pure CSS implementation with optional Web Components
- **30+ Components**: Buttons, forms, cards, dialogs, tables, layouts, and more
- **Design Tokens**: Complete token system with theme support (default, inverted, high-contrast)
- **Web Components**: Progressive enhancement with light-DOM custom elements
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA support
- **E-Paper Optimized**: Minimal repaints, high contrast, no animations
- **Responsive**: Mobile-first with E-Reader viewport support
- **TypeScript**: Full type definitions for Web Components API
- **Storybook**: Interactive component documentation

### Architecture

- Dual selector pattern: classes and custom elements share styles (`.epaper-btn` + `epaper-button`)
- Three-layer CSS architecture: tokens, base, components
- Component factory pattern for Web Components
- Form wrapper components for enhanced native inputs
- Theme system via CSS custom properties

### Documentation

- Complete migration guide for consuming applications
- Storybook with live examples and code snippets
- 10 demo pages showcasing real-world layouts
- 4 Web Components demo pages
- Comprehensive README with quick start guide
