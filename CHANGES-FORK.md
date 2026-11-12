# What this fork changes

Base: `thomasloven/lovelace-card-mod` 4.2.1 (February 2026), the last upstream
release.

## 5.0.0

- **Packaged as a Home Assistant integration** (`custom_components/card_mod`).
  It serves the build and registers one versioned URL as both a frontend
  module and a dashboard resource: card-mod loads before the first card,
  updates reach browsers without editing `configuration.yaml`, and it is never
  loaded twice. A repair flags any other copy still registered.
- **No more unhandled rejections from unstyled elements.** Patched elements
  never run the patch class constructor, so `_cardMod` stayed undefined until
  card-mod styled them, and `updated()` threw on every update (reported on
  `trooperthorn/ha_card-mod#3`).
- **A navigation that only changes `#…` re-renders only the styles that read
  `hash`**, instead of every style on the page with every template
  re-subscribed: no flash when a pop-up opens through the URL fragment
  (reported on `trooperthorn/ha_card-mod#4`).

## 4.4.0

- Works on Home Assistant 2026.8 and later: upstream's unreleased
  `2026.4.0-fixes` (dialog patching), theme `-yaml` keys parsed with js-yaml,
  `ha-adaptive-dialog` for more-info, `ha-panel-tools` for the tools panel,
  `ha-drawer` enabled (ported from `trooperthorn/ha_card-mod`).
- js-yaml is a separate chunk, loaded only when a theme has a `-yaml` key.
- vitest (`npm test`).

## 4.3.x

- Built for the browsers Home Assistant supports, so async/await stays native
  (-45 % bundle; upstream PR #609).
- Elements nothing can style are skipped; icons are only inspected when a
  style uses the icon variables (upstream PR #610).
- The "not loaded as a frontend module" notice recognises the import block
  Home Assistant now emits (upstream PR #619).
