import { apply_card_mod, ModdedElement } from "../helpers/apply_card_mod";
import { stripHtmlAndFunctions } from "../helpers/dialog_params";
import {
  is_patched,
  patch_prototype,
  set_patched,
} from "../helpers/patch_function";


const dialogParams = [];

class HaDialogPatch extends ModdedElement {
  async updated(_orig, args) {
    await _orig?.(args);

    this.updateComplete.then(async () => {
      let haDialog: HTMLElement | null =
        this.shadowRoot.querySelector("ha-dialog");
      if (!haDialog) {
        haDialog = this.shadowRoot.querySelector("ha-adaptive-dialog");
      }
      if (!haDialog) {
        haDialog = this.shadowRoot.querySelector("ha-toast");
      }
      if (!haDialog) {
        haDialog = this.shadowRoot.querySelector("ha-adaptive-popover");
      }
      if (!haDialog) {
        // Notification 'dialog' is ha-drawer
        haDialog = this.shadowRoot.querySelector("ha-drawer");
      }
      if (!haDialog) return;

      const cls = `type-${this.localName.replace?.("ha-", "")}`;
      apply_card_mod(
        haDialog as ModdedElement,
        "dialog",
        undefined,
        { params: dialogParams[this.localName] ?? {} },
        false,
        cls
      );
    });
  }
}

function patchDialog(ev: Event) {
  const dialogTag = (ev as CustomEvent).detail?.dialogTag;

  // Home Assistant dialog manager reuses the same dialog element for dialogs of same tag
  // so we can store params to use when patching
  const params = (ev as CustomEvent).detail?.dialogParams;
  if (params) {
    dialogParams[dialogTag] = stripHtmlAndFunctions(params);
  }

  if (dialogTag && !is_patched(dialogTag)) {
    set_patched(dialogTag);
    patch_prototype(dialogTag, HaDialogPatch);
  }
}

function patchNotification(ev: Event) {
  const notificationTag: string = "notification-manager";
  const params = (ev as CustomEvent).detail;
  if (params) {
    dialogParams[notificationTag] = stripHtmlAndFunctions(params);
  }

  if (notificationTag && !is_patched(notificationTag)) {
    set_patched(notificationTag);
    patch_prototype(notificationTag, HaDialogPatch);
  }
}

window.addEventListener("show-dialog", patchDialog, { capture: true });
window.addEventListener("hass-notification", patchNotification, { capture: true });
