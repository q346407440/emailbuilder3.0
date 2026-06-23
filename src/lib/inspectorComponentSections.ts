/** 组件配置 Tab 内分段：与 Inspector 字段分布一致 */
export type InspectorComponentSection = "content" | "layout" | "style";

const COMPONENT_SECTIONS: Record<string, readonly InspectorComponentSection[]> = {
  text: ["content", "style"],
  button: ["content", "layout", "style"],
  divider: ["style"],
  progress: ["content", "style"],
  icon: ["content", "style"],
  layout: ["content", "layout"],
  image: ["content", "layout"],
  grid: ["content", "layout"],
};

/** 未知 block 类型仅在「内容」段展示占位说明 */
export function inspectorComponentSections(blockType: string): InspectorComponentSection[] {
  const sections = COMPONENT_SECTIONS[blockType];
  if (sections) return [...sections];
  return ["content"];
}

export function hasInspectorComponentSection(
  blockType: string,
  section: InspectorComponentSection
): boolean {
  return inspectorComponentSections(blockType).includes(section);
}
