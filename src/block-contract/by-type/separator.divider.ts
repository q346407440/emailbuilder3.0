import type { BlockTypeContract } from "../types";
import { BLOCK_SHELL_KEYS, WRAPPER_CONTAINER_PREFIXES } from "../shared";

export const separatorDividerContract: BlockTypeContract = {
  blockType: "separator.divider",
  runtimeType: "divider",
  label: "分割线",
  shellKeys: BLOCK_SHELL_KEYS,
  description: "线条颜色/粗细与线条本体宽度在 props；外层容器宽高与留白在 wrapperStyle。",
  allowedPrefixes: [
    ...WRAPPER_CONTAINER_PREFIXES,
    "props.color",
    "props.lineWidthMode",
    "props.lineWidth",
    "props.height",
  ],
  bindingKinds: {
    "wrapperStyle.contentAlign": "structural",
    "props.color": "style",
    "props.lineWidthMode": "structural",
    "props.lineWidth": "style",
    "props.height": "style",
  },
};
