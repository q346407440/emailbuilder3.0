import type { EmailTemplate } from "../types/email";

/** 生成模板内唯一的 block id。 */
export function uniqueTemplateBlockId(template: EmailTemplate, prefix: string): string {
  const base = prefix.replace(/[^a-zA-Z0-9_-]/g, "") || "block";
  for (let i = 0; i < 10_000; i += 1) {
    const suffix = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
    const candidate = `${base}-${suffix}${i === 0 ? "" : `-${i}`}`;
    if (!template.blocks[candidate]) return candidate;
  }
  return `${base}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}
