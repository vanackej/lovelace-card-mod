import { describe, expect, it } from "vitest";
import { theme_key_names, theme_styles_for_type } from "../src/helpers/themes";

describe("theme key aliases", () => {
  it("lists the tools keys and the developer-tools alias", () => {
    expect(theme_key_names("tools")).toEqual(["tools", "developer-tools"]);
    expect(theme_key_names("card")).toEqual(["card"]);
  });

  it("prefers the current key and falls back to the alias", () => {
    expect(theme_styles_for_type({ "card-mod-tools": "a" }, "tools")).toEqual({ ".": "a" });
    expect(theme_styles_for_type({ "card-mod-developer-tools": "b" }, "tools")).toEqual({ ".": "b" });
    expect(
      theme_styles_for_type({ "card-mod-developer-tools-yaml": ".: c\n", "card-mod-tools": "d" }, "tools"),
    ).toEqual({ ".": "c" });
    expect(theme_styles_for_type({ "card-mod-card": "x" }, "tools")).toEqual({});
    expect(theme_styles_for_type(undefined, "tools")).toEqual({});
  });
});
