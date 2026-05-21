import type { BlockBindings } from "../types/email";

export function remapBindingPaths(
  bindings: BlockBindings | undefined,
  mappingRules: Record<string, string>
): BlockBindings | undefined {
  if (!bindings) return bindings;
  const remapped: BlockBindings = {};
  for (const [path, spec] of Object.entries(bindings)) {
    const nextPath = mappingRules[path] ?? path;
    remapped[nextPath] = spec;
  }
  return remapped;
}
