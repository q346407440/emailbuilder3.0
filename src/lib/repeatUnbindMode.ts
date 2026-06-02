/** 解除列表重复绑定时的处理方式 */
export type RepeatUnbindMode = "materializeRows" | "keepPrototypeOnly";

export type RepeatUnbindModeOption = {
  mode: RepeatUnbindMode;
  title: string;
  /** 单行辅助说明 */
  summary: string;
};

export function defaultRepeatUnbindMode(itemCount: number): RepeatUnbindMode {
  return itemCount > 0 ? "materializeRows" : "keepPrototypeOnly";
}

/** 解除绑定弹窗选项（简短说明，与公共确认弹窗语气一致） */
export function repeatUnbindModeOptions(itemCount: number): RepeatUnbindModeOption[] {
  return [
    {
      mode: "materializeRows",
      title: "保留全部行",
      summary:
        itemCount > 0
          ? `固定当前 ${itemCount} 行内容与结构，解除后不再随变量条数变化`
          : "解除后保留当前画布中的行结构",
    },
    {
      mode: "keepPrototypeOnly",
      title: "仅保留行模板",
      summary: "移除复制行与列表字段映射，画布只保留一行模板",
    },
  ];
}
