/**
 * epaper-components.dialog.polyfill.js
 * Minimal fallback for browsers without native <dialog>.
 * - Adds show(), showModal(), close()
 * - Provides backdrop element styled via .eink-dialog-backdrop
 * - Click outside or [data-dialog-close] closes
 * - Triggers: any element with data-dialog-target="dialog-id"
 */
(() => {
  const hasNativeDialog =
    typeof HTMLDialogElement !== "undefined" &&
    typeof HTMLDialogElement.prototype.showModal === "function";

  if (hasNativeDialog) return;

  type DialogEl = HTMLDialogElement & {
    returnValue?: string;
  };

  const registry = new Map<DialogEl, { close: (returnValue?: string) => void }>();

  const createBackdrop = (dialog: DialogEl) => {
    const backdrop = document.createElement("div");
    backdrop.className = "eink-dialog-backdrop";
    backdrop.setAttribute("hidden", "");
    dialog.parentElement?.insertBefore(backdrop, dialog);
    return backdrop;
  };

  const wireDialog = (dialog: DialogEl) => {
    const backdrop = createBackdrop(dialog);

    const hide = (returnValue?: string) => {
      dialog.removeAttribute("open");
      dialog.returnValue = returnValue ?? "";
      backdrop.setAttribute("hidden", "");
      document.removeEventListener("keydown", onEscape);
    };

    const show = () => {
      dialog.setAttribute("open", "");
      backdrop.removeAttribute("hidden");
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hide();
      }
    };

    dialog.show = () => {
      show();
    };

    dialog.showModal = () => {
      show();
      document.addEventListener("keydown", onEscape);
    };

    dialog.close = (returnValue?: string) => {
      hide(returnValue);
    };

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        hide();
      }
    });

    return { close: hide };
  };

  document.querySelectorAll("dialog").forEach((node) => {
    const dialog = node as DialogEl;
    const wired = wireDialog(dialog);
    registry.set(dialog, wired);
  });

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const trigger = target.closest("[data-dialog-target]");
    if (trigger) {
      const id = trigger.getAttribute("data-dialog-target");
      if (id) {
        const dialog = document.getElementById(id) as DialogEl | null;
        if (dialog && typeof dialog.showModal === "function") {
          dialog.showModal();
          event.preventDefault();
        }
      }
    }

    if (target.matches("[data-dialog-close]")) {
      const dialog = target.closest("dialog") as DialogEl | null;
      if (dialog) {
        const wired = registry.get(dialog);
        (wired?.close ?? dialog.close)?.call(dialog);
        event.preventDefault();
      }
    }
  });
})();
