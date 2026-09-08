import { hass } from "./hass";
import { yaml2json } from "./yaml2json";
import type { CardMod } from "../card-mod";
import type { CardModStyle } from "./apply_card_mod";
import { themesReady } from "../theme-watcher";

function cssValueIsTrue(v: string): boolean {
  if (!v) return false;
  const t = v.trim().toLowerCase();
  return t === "true" || t === "1" || t === "yes" || t === "on";
}

// Older theme key names that still resolve to a current card-mod type.
export const THEME_TYPE_ALIASES: Record<string, string[]> = {
  tools: ["developer-tools"],
};

export function theme_key_names(type: string): string[] {
  return [type, ...(THEME_TYPE_ALIASES[type] ?? [])];
}

export function theme_styles_for_type(
  theme: Record<string, any> | undefined,
  type: string,
): CardModStyle {
  if (!theme) return {};
  const names = theme_key_names(type);
  for (const name of names) {
    const key = `card-mod-${name}-yaml`;
    if (theme[key]) return yaml2json(key, theme[key]);
  }
  for (const name of names) {
    const key = `card-mod-${name}`;
    if (theme[key]) return { ".": theme[key] };
  }
  return {};
}

export async function get_theme(root: CardMod): Promise<CardModStyle> {
  if (!root.type) return null;

  await themesReady();

  const el = root.parentElement ? root.parentElement : root;
  const cs = window.getComputedStyle(el);
  const theme = cs.getPropertyValue("--card-mod-theme").trim();

  let debug = false;

  const typeDebug = cs.getPropertyValue(`--card-mod-${root.type}-debug`);
  if (cssValueIsTrue(typeDebug)) debug = true;

  for (const cls of root.classes) {
    const debugVar = cs.getPropertyValue(
      `--card-mod-${root.type}-${cls}-debug`,
    );
    if (cssValueIsTrue(debugVar)) {
      debug = true;
      break;
    }
  }

  root.debug ||= !!debug;

  root.debug && console.log("CardMod Debug: Theme:", theme);

  const hs = await hass();
  if (!hs) return {};
  const themes = hs?.themes?.themes ?? {};
  if (!themes[theme]) return {};

  return theme_styles_for_type(themes[theme], root.type);
}
