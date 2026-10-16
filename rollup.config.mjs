import nodeResolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import { getBabelOutputPlugin } from "@rollup/plugin-babel";

const dev = process.env.ROLLUP_WATCH;

export default {
  input: "src/main.ts",
  output: {
    // js-yaml is imported dynamically (helpers/yaml_parser.ts) and lands in its
    // own chunk. HACS installs every file under dist/, and the chunk resolves
    // next to card-mod.js. The hash in its name busts the cache on change,
    // since the hacstag query on card-mod.js does not reach it.
    dir: "dist",
    entryFileNames: "card-mod.js",
    chunkFileNames: "[name]-[hash].js",
    format: "es",
  },
  plugins: [
    nodeResolve(),
    json(),
    typescript(),
    // Without explicit targets, preset-env downlevels to ES5 and rewrites every
    // async function into a regenerator state machine. That machinery showed up
    // as ~165ms of asyncGeneratorStep/tryCatch/wrap on a single dashboard load,
    // and it is pure waste: Home Assistant itself only runs on browsers that
    // support native async/await (see the isModern check in HA's index.html).
    // These targets mirror that set, so async stays native.
    getBabelOutputPlugin({
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              chrome: "109",
              edge: "139",
              firefox: "140",
              safari: "26",
            },
            bugfixes: true,
            // Leave import() alone: rollup already emits ES modules.
            modules: false,
          },
        ],
      ],
    }),
    !dev && terser({ format: { comments: false } }),
  ],
};
