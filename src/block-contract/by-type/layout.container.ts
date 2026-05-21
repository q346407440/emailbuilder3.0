import type { BlockTypeContract } from "../types";
import {
  BLOCK_SHELL_KEYS,
  WRAPPER_BACKGROUND_IMAGE_PREFIXES,
  WRAPPER_CONTAINER_PREFIXES,
} from "../shared";

export const layoutContainerContract: BlockTypeContract = {
  blockType: "layout.container",
  runtimeType: "layout",
  label: "布局容器",
  description: "纵向/横向排列子 block；可配置容器底图 backgroundImage 与叠放对齐。",
  shellKeys: BLOCK_SHELL_KEYS,
  allowedPrefixes: [
    ...WRAPPER_CONTAINER_PREFIXES,
    ...WRAPPER_BACKGROUND_IMAGE_PREFIXES,
    "props.direction",
    "props.gapMode",
    "props.gap",
  ],
  bindingKinds: {
    "props.direction": "structural",
    "props.gapMode": "structural",
    "props.gap": "style",
    "wrapperStyle.backgroundColor": "style",
    "wrapperStyle.padding": "style",
    "wrapperStyle.backgroundImage.src": "content",
    "wrapperStyle.backgroundImage.alt": "content",
    "wrapperStyle.backgroundImage.link": "content",
    "wrapperStyle.backgroundImage.fit": "structural",
    "wrapperStyle.backgroundImage.position": "style",
    "wrapperStyle.backgroundImage.border": "style",
    "wrapperStyle.backgroundImage.borderRadius": "style",
    "wrapperStyle.contentAlign": "structural",
  },
};
