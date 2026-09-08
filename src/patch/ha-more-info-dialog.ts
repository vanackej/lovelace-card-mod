import { patch_element } from "../helpers/patch_function";
import { ModdedElement, apply_card_mod } from "../helpers/apply_card_mod";

// Theme-only styling of the more-info dialog; the dialog element is ha-adaptive-dialog since 2026.8.
@patch_element("ha-more-info-dialog")
class MoreInfoDialogPatch extends ModdedElement {
  showDialog(_orig, params, ...rest) {
    _orig?.(params, ...rest);

    this.requestUpdate();
    this.updateComplete.then(async () => {
      const haDialog =
        this.shadowRoot.querySelector("ha-adaptive-dialog") ??
        this.shadowRoot.querySelector("ha-dialog");
      if (!haDialog) return;

      apply_card_mod(
        haDialog as ModdedElement,
        "more-info",
        undefined,
        {
          config: params,
        },
        false,
      );
    });
  }
}
