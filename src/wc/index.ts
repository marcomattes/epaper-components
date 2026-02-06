import { defineEinkButton, EinkButtonElement } from "./button.js";
import { definePrimitiveComponents } from "./primitives.js";
import { defineFormComponents } from "./forms.js";

export { EinkButtonElement, defineEinkButton };

/** Register all provided custom elements. Extend as new components are added. */
export const defineEinkElements = () => {
  definePrimitiveComponents();
  defineFormComponents();
  defineEinkButton();
};
