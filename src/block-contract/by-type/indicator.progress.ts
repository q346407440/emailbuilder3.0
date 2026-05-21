import type { BlockTypeContract } from "../types";
import { BLOCK_SHELL_KEYS, WRAPPER_CONTAINER_PREFIXES } from "../shared";

export const indicatorProgressContract: BlockTypeContract = {
  blockType: "indicator.progress",
  runtimeType: "progress",
  label: "进度条",
  description: "槽色与进度色、数值与满槽值；条带宽度/高度/圆角在 props（barWidth / barHeight / barBorderRadius），外层占位与容器样式在 wrapperStyle。",
  shellKeys: BLOCK_SHELL_KEYS,
  allowedPrefixes: [
    ...WRAPPER_CONTAINER_PREFIXES,
    "props.trackColor",
    "props.fillColor",
    "props.value",
    "props.max",
    "props.barWidthMode",
    "props.barWidth",
    "props.barHeight",
    "props.barBorderRadius",
  ],
  bindingKinds: {
    "wrapperStyle.contentAlign": "structural",
    "props.trackColor": "style",
    "props.fillColor": "style",
    "props.barWidthMode": "structural",
    "props.barWidth": "style",
    "props.barHeight": "style",
    "props.barBorderRadius": "style",
    "props.value": "content",
    "props.max": "content",
  },
};
