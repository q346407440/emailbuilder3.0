import type { BlockTypeContract } from "../types";
import { BLOCK_SHELL_KEYS, WRAPPER_CONTAINER_PREFIXES } from "../shared";

export const contentIconContract: BlockTypeContract = {
  blockType: "content.icon",
  runtimeType: "icon",
  label: "图标",
  description: "src 与 link 为内容；color / size 为样式。",
  shellKeys: BLOCK_SHELL_KEYS,
  allowedPrefixes: [
    ...WRAPPER_CONTAINER_PREFIXES,
    "props.src",
    "props.color",
    "props.size",
    "props.link",
  ],
  bindingKinds: {
    "wrapperStyle.contentAlign": "structural",
    "props.src": "content",
    "props.color": "style",
    "props.size": "style",
    "props.link": "content",
  },
};
