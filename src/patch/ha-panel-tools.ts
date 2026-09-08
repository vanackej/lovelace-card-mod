import { patch_element } from "../helpers/patch_function";
import { ModdedElement, apply_card_mod } from "../helpers/apply_card_mod";

// Theme-only styling of the tools panel; requires card-mod loaded as a frontend module.
@patch_element("ha-panel-tools")
class HaPanelToolsPatch extends ModdedElement {
  updated(_orig, ...args) {
    _orig?.(...args);
    apply_card_mod(this, "tools");
  }
}
