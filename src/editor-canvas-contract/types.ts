export type EditorCanvasValueKey =
  | "EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT"
  | "EMAIL_CANVAS_SCROLL_OVERFLOW_X"
  | "EMAIL_CANVAS_SCROLL_OVERFLOW_Y";

/** 编辑器画布 chrome 行为规则（不写入 template.json） */
export type EditorCanvasRule = {
  id: string;
  title: string;
  summary: string;
  valueKey: EditorCanvasValueKey;
  implementation: string;
};
