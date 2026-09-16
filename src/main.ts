import "./ll-custom-actions";
import "./card-mod";

import "./patch/hui-card";
import "./patch/ha-card";
import "./patch/hui-section";
import "./patch/hui-badge";
import "./patch/hui-heading-badge";
import "./patch/ha-assist-chip";

import "./patch/hui-entities-card";
import "./patch/hui-glance-card";
import "./patch/hui-picture-elements-card";

import "./patch/ha-icon";
import "./patch/hui-view";
import "./patch/hui-root";
// To include in 4.2.2 and leave 4.2.1 just as a bugfix release for the 4.2.0 duplicate patching warning
// import "./patch/ha-drawer";
import "./patch/ha-dialog";
import "./patch/ha-more-info-dialog";
import "./patch/ha-sidebar";
import "./patch/hui-card-element-editor";
import "./patch/ha-panel-config";
import "./patch/ha-panel-developer-tools";
import "./mod-card";
import "./theme-watcher";

// `frontend.extra_module_url` entries are emitted by the backend as an inline
// import block in index.html. Home Assistant now prefixes that block with a
// comment and wraps each import in a `.catch()`:
//
//   // Caught, or the boot recovery guard reads it as a stale build.
//   import("/hacsfiles/lovelace-card-mod/card-mod.js?hacstag=1").catch(...);
//
// so requiring the script to *start with* `import(` reported "not loaded as a
// module" on instances that were configured correctly, and the `");` suffix no
// longer terminates the statement either. Match the import anywhere in the
// inline script instead of trying to reconstruct the URL.
//
// Only inline scripts are inspected, on purpose: Lovelace resources are loaded
// by the frontend with a runtime `import()` that appends its own
// `<script type="module" src=...>`, and those must not count as a frontend
// module or the notice could never fire.
const loadedAsFrontendModule = Array.from(
  document.querySelectorAll("script")
).some(
  (script) =>
    !script.src &&
    /import\(\s*["'][^"']*\/card-mod\.js/.test(script.textContent ?? "")
);

if (!loadedAsFrontendModule) {
  console.info(
    "You may not be getting optimal performance out of card-mod.\nSee https://github.com/thomasloven/lovelace-card-mod#performance-improvements"
  );
}

// const get_paths = (root, basepath = "") => {
//   let paths = {};
//   paths[`${basepath}`] = root;
//   if (root.shadowRoot) {
//     const pth = `${basepath} $`;
//     paths[pth] = root.shadowRoot;
//     const p = get_paths(root.shadowRoot, pth);
//     Object.entries(p).forEach(([k, v]) => {
//       if (paths[k] === undefined) paths[k] = v;
//     });
//   }
//   for (const el of root.children) {
//     const pth = `${basepath} ${el.localName}`;
//     paths[pth] = el;
//     const p = get_paths(el, pth);
//     Object.entries(p).forEach(([k, v]) => {
//       if (paths[k] === undefined) paths[k] = v;
//     });
//   }

//   return paths;
// };

// (window as any).get_paths = get_paths;
