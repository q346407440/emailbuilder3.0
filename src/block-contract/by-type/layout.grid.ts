import type { BlockTypeContract } from "../types";
import {
  BLOCK_SHELL_KEYS,
  WRAPPER_BACKGROUND_IMAGE_PREFIXES,
  WRAPPER_CONTAINER_PREFIXES,
} from "../shared";

export const layoutGridContract: BlockTypeContract = {
  blockType: "layout.grid",
  runtimeType: "grid",
  label: "栅格",
  description:
    "多列栅格；单元格宽高与宫格间距在 props，外壳宽高与 padding 在 wrapperStyle；可选 wrapperStyle.backgroundImage 作栅格区域底图。",
  shellKeys: BLOCK_SHELL_KEYS,
  allowedPrefixes: [
    ...WRAPPER_CONTAINER_PREFIXES,
    ...WRAPPER_BACKGROUND_IMAGE_PREFIXES,
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
    "wrapperStyle.backgroundImage.src": "content",
    "wrapperStyle.backgroundImage.alt": "content",
    "wrapperStyle.backgroundImage.link": "content",
    "wrapperStyle.backgroundImage.fit": "structural",
    "wrapperStyle.backgroundImage.position": "style",
    "wrapperStyle.backgroundImage.border": "style",
    "wrapperStyle.backgroundImage.borderRadius": "style",
  },
};
