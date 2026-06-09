/** 从 validate 报错行 `blocks.<id>.<fieldPath>: reason` 提取 block id（id 可含连字符）。 */

export function blockIdFromValidateIssueLine(errorLine: string): string | null {
  const path = errorLine.split(":")[0]?.trim() ?? "";
  const nested = /^blocks\.(.+?)\.(?:props|wrapperStyle|children|blockMeta|type)(?:\.|$)/.exec(path);
  if (nested?.[1]) return nested[1];
  const bare = /^blocks\.([^\s/]+)$/.exec(path);
  return bare?.[1] ?? null;
}
