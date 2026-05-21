import type { EditorCanvasRule } from "./types";

/** 编辑器画布行为目录（唯一真源；实现须与 `values.ts` 一致） */
export const EDITOR_CANVAS_RULES: readonly EditorCanvasRule[] = [
  {
    id: "editor.noAutoScrollOnBlockSelect",
    title: "选中区块不自动滚动画布",
    summary:
      "左侧树或 Inspector 切换选中时，画布不得 scrollIntoView；避免宽模板选中右侧块时画布横向跳动。",
    valueKey: "EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT",
    implementation: "src/components/EmailPreview.tsx",
  },
  {
    id: "editor.canvasScrollOverflowX",
    title: "画布区禁止横向滚动",
    summary: "`.canvas-scroll` 使用 overflow-x:hidden；纵向仍 auto 以查看长邮件。",
    valueKey: "EMAIL_CANVAS_SCROLL_OVERFLOW_X",
    implementation: "src/app.css（.canvas-scroll）、src/App.tsx、src/pages/LibraryPage.tsx",
  },
] as const;

export const EDITOR_CANVAS_RULE_IDS = EDITOR_CANVAS_RULES.map((r) => r.id);
