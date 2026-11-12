import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ModdedElement } from "../src/helpers/apply_card_mod";
import { patch_object } from "../src/helpers/patch_function";

// patch_object copies methods onto an existing prototype and never runs
// ModdedElement's constructor, exactly as on a Home Assistant element.
class PatchedCard {
  updateComplete = Promise.resolve(true);
  updated() {}
  setConfig() {}
}
patch_object(PatchedCard.prototype, ModdedElement);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("ModdedElement on a patched element", () => {
  let rejections: unknown[];
  const onRejection = (reason: unknown) => rejections.push(reason);

  beforeEach(() => {
    rejections = [];
    process.on("unhandledRejection", onRejection);
  });
  afterEach(() => {
    process.off("unhandledRejection", onRejection);
  });

  it("does not reject when card-mod never styled the element", async () => {
    const card = new PatchedCard() as any;
    expect(card._cardMod).toBeUndefined();

    card.setConfig({ type: "entities" });
    card.updated(new Map());
    await flush();

    expect(rejections).toEqual([]);
  });

  it("still refreshes and reconfigures the card-mod elements it holds", async () => {
    const card = new PatchedCard() as any;
    const calls: string[] = [];
    const cm: any = { refresh: () => calls.push("refresh") };
    card._cardMod = [cm];

    card.setConfig({ type: "entities", card_mod: { style: "ha-card {}" } });
    card.updated(new Map());
    await flush();

    expect(cm.styles).toBe("ha-card {}");
    expect(cm.variables).toEqual({
      config: { type: "entities", card_mod: { style: "ha-card {}" } },
    });
    expect(calls).toEqual(["refresh"]);
    expect(rejections).toEqual([]);
  });
});
