import { load, YAML11_SCHEMA, YAMLException } from "js-yaml";

export const yaml2json = (key: string, yaml: string): Record<string, any> => {
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
