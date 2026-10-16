// js-yaml is only needed for card-mod-*-yaml theme keys, and would nearly double
// the bundle. Rollup splits it into its own chunk next to card-mod.js, fetched
// the first time such a key is actually parsed.
let jsYaml: Promise<typeof import("./yaml_parser")> | undefined;

export const yaml2json = async (
  key: string,
  yaml: string,
): Promise<Record<string, any>> => {
  let lib: typeof import("./yaml_parser");
  try {
    lib = await (jsYaml ??= import("./yaml_parser"));
  } catch (error: unknown) {
    jsYaml = undefined; // let a later lookup retry
    console.error(`CARD-MOD: Could not load the YAML parser for ${key}:`, error);
    return {};
  }
  const { load, YAML11_SCHEMA, YAMLException } = lib;
  try {
    const parsed = load(yaml, { schema: YAML11_SCHEMA });
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected YAML document root to be a mapping");
    }
    return parsed as Record<string, any>;
  } catch (error: unknown) {
    const mark = error instanceof YAMLException ? error.mark : undefined;
    const reason =
      error instanceof YAMLException
        ? error.reason
        : error instanceof Error
          ? error.message
          : String(error);
    const where = mark
      ? ` at line ${mark.line + 1}, column ${mark.column + 1}`
      : "";
    console.groupCollapsed(`CARD-MOD: Error loading theme key ${key}`);
    console.log(`${reason}${where}`);
    console.log(
      String(yaml)
        .split("\n")
        .map(
          (line, i) => `${i === mark?.line ? ">>" : "  "}${i + 1}: ${line}`,
        )
        .join("\n"),
    );
    console.groupEnd();
    return {};
  }
};
