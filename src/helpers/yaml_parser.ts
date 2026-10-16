// The only js-yaml exports card-mod uses. yaml2json imports this module
// dynamically; going through it (rather than importing "js-yaml" itself)
// lets rollup tree-shake the dumper and the rest out of the split chunk.
export { load, YAML11_SCHEMA, YAMLException } from "js-yaml";
