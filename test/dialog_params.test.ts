import { describe, expect, it } from "vitest";
import { stripHtmlAndFunctions } from "../src/helpers/dialog_params";

describe("stripHtmlAndFunctions", () => {
  it("keeps primitives and plain data", () => {
    expect(stripHtmlAndFunctions({ a: 1, b: "x", c: [1, "y", null] })).toEqual({
      a: 1,
      b: "x",
      c: [1, "y", null],
    });
  });

  it("drops functions and DOM elements", () => {
    const el = document.createElement("div");
    expect(stripHtmlAndFunctions({ f: () => 1, el, keep: true })).toEqual({
      keep: true,
    });
    expect(stripHtmlAndFunctions([el, () => 1, 2])).toEqual([2]);
  });

  it("returns undefined for a circular reference instead of recursing", () => {
    const a: any = { name: "a" };
    a.self = a;
    a.list = [a, 1];
    expect(stripHtmlAndFunctions(a)).toEqual({ name: "a", list: [1] });
  });

  it("keeps a shared, non-circular reference in both places", () => {
    const shared = { v: 1 };
    const out = stripHtmlAndFunctions({ x: shared, y: shared });
    expect(out).toEqual({ x: { v: 1 }, y: { v: 1 } });
  });
});
