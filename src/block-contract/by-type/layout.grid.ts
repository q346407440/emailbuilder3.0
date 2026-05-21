import type { BlockTypeContract } from "../types";
import { BLOCK_SHELL_KEYS, WRAPPER_CONTAINER_PREFIXES } from "../shared";

export const layoutGridContract: BlockTypeContract = {
  blockType: "layout.grid",
  runtimeType: "grid",
  label: "栅格",
  description: "多列栅格；单元格宽高与宫格间距在 props，外壳宽高与 padding 在 wrapperStyle。",
  shellKeys: BLOCK_SHELL_KEYS,
  allowedPrefixes: [
    ...WRAPPER_CONTAINER_PREFIXES,
    "props.columns",
    "props.gap",
    "props.cellWidthMode",
    "props.cellWidth",
    "props.cellHeightMode",
    "props.cellHeight",
  ],
  bindingKinds: {
    "wrapperStyle.contentAlign": "structural",
    "props.columns": "structural",
    "props.gap": "style",
    "props.cellWidthMode": "structural",
    "props.cellWidth": "style",
    "props.cellHeightMode": "structural",
    "props.cellHeight": "style",
    "wrapperStyle.padding": "style",
  },
};
