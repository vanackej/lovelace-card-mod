import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import pjson from "../package.json";

// The bundle stamps package.json's version (banner, cardMod_patch_state); the
// Marketplace and Home Assistant read the manifest's. They must not drift.
describe("versions", () => {
  it("package.json and the integration manifest agree", () => {
    const manifest = JSON.parse(
      readFileSync("custom_components/card_mod/manifest.json", "utf-8"),
    );
    expect(manifest.version).toBe(pjson.version);
  });
});
