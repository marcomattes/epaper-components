import { defineEpaperButton, EpaperButtonElement } from "./button.js";
import { definePrimitiveComponents } from "./primitives.js";
import { defineFormComponents } from "./forms.js";

export { EpaperButtonElement, defineEpaperButton };

/** Register all provided custom elements. Extend as new components are added. */
export const defineEpaperElements = () => {
  definePrimitiveComponents();
  defineFormComponents();
  defineEpaperButton();
};
