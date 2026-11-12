import { describe, expect, it } from "vitest";
import { panel_state_change, uses_hash } from "../src/helpers/panel";
import "../src/card-mod";

const state = (hash: string, viewUrlPath = "home") => ({
  hash,
  panel: { title: "Maison", fullUrlPath: `lovelace/${viewUrlPath}`, viewUrlPath },
});

describe("panel_state_change", () => {
  it("is none when nothing a template can read changed", () => {
    expect(panel_state_change(state(""), state(""))).toBe("none");
  });

  it("is hash when only the URL fragment changed", () => {
    expect(panel_state_change(state(""), state("salon"))).toBe("hash");
  });

  it("is panel when the view changed, with or without the hash", () => {
    expect(panel_state_change(state(""), state("", "energie"))).toBe("panel");
    expect(panel_state_change(state("a"), state("b", "energie"))).toBe("panel");
  });

  it("is panel when there is no earlier state to compare with", () => {
    expect(panel_state_change(null, state(""))).toBe("panel");
  });
});

describe("uses_hash", () => {
  it("finds the variable in string and nested styles", () => {
    expect(uses_hash("{% if hash == 'salon' %}ha-card {}{% endif %}")).toBe(true);
    expect(uses_hash({ ".": "", "$": "{{ hash }}" })).toBe(true);
  });

  it("ignores styles that cannot read it", () => {
    expect(uses_hash("ha-card { color: {{ states('sun.sun') }} }")).toBe(false);
    expect(uses_hash({ ".": "ha-card { hashed: 1 }" })).toBe(false);
    expect(uses_hash({})).toBe(false);
    expect(uses_hash(undefined)).toBe(false);
  });
});

describe("card-mod element on cm_update", () => {
  // Not connected: a handled event only marks the element for processing on
  // the next connect, which is enough to observe the decision.
  const element = (styles: object) => {
    const cm = document.createElement("card-mod") as any;
    cm._fixed_styles = styles;
    return cm;
  };
  const update = (hashOnly: boolean) =>
    new CustomEvent("cm_update", { detail: { variablesChanged: true, hashOnly } });

  it("skips a hash-only navigation when its styles never mention hash", () => {
    const cm = element({ ".": "ha-card { color: red }" });
    cm._cmUpdateListener(update(true));
    expect(cm._processStylesOnConnect).toBeFalsy();
    expect(cm.dynamicVariablesHaveChanged).toBe(false);
  });

  it("re-renders on a hash-only navigation when a template reads hash", () => {
    const cm = element({ ".": "{% if hash == 'salon' %}ha-card {}{% endif %}" });
    cm._cmUpdateListener(update(true));
    expect(cm._processStylesOnConnect).toBe(true);
    expect(cm.dynamicVariablesHaveChanged).toBe(true);
  });

  it("re-renders on any other navigation", () => {
    const cm = element({ ".": "ha-card { color: red }" });
    cm._cmUpdateListener(update(false));
    expect(cm._processStylesOnConnect).toBe(true);
  });
});
