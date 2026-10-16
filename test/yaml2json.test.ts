import { afterEach, describe, expect, it, vi } from "vitest";
import { yaml2json } from "../src/helpers/yaml2json";

describe("yaml2json", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses a mapping", async () => {
    await expect(yaml2json("card-mod-card-yaml", ".: |\n  ha-card { color: red; }\n")).resolves.toEqual({
      ".": "ha-card { color: red; }\n",
    });
  });

  it("keeps keys ending in a dollar sign", async () => {
    await expect(yaml2json("k", "foo$: bar\n\"a b$\": c\n")).resolves.toEqual({ foo$: "bar", "a b$": "c" });
  });

  it("uses YAML 1.1 booleans like the frontend editor", async () => {
    await expect(yaml2json("k", "a: yes\nb: no\nc: on\n")).resolves.toEqual({ a: true, b: false, c: true });
  });

  it("returns an empty object for a non-mapping root", async () => {
    const group = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
    await expect(yaml2json("k", "- a\n- b\n")).resolves.toEqual({});
    await expect(yaml2json("k", "just a string")).resolves.toEqual({});
    expect(group).toHaveBeenCalledWith("CARD-MOD: Error loading theme key k");
  });

  it("marks the failing line for invalid YAML and returns an empty object", async () => {
    vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
    await expect(yaml2json("card-mod-card-yaml", "a: 1\nb: [unclosed\n")).resolves.toEqual({});
    const printed = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(printed).toMatch(/at line \d+, column \d+/);
    expect(printed).toMatch(/^>>\d+: /m);
  });
});
