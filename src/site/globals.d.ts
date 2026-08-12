/// <reference types="vite/client" />

// Vite handles CSS side-effect imports; tell TS to treat them as opaque modules.
declare module '*.css';
