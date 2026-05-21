/** 区块类型在界面上的中文展示名（数据层 type 仍为英文标识） */
const MAP: Record<string, string> = {
  emailRoot: "邮件根",
  layout: "布局",
  text: "文本",
  image: "图片",
  button: "按钮",
  divider: "分割线",
  progress: "进度条",
  grid: "栅格",
  icon: "图标",
};

export function blockTypeLabel(type: string): string {
  return MAP[type] ?? type;
}
