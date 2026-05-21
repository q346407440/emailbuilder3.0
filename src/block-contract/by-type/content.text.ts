import type { BlockTypeContract } from "../types";
import { BLOCK_SHELL_KEYS, WRAPPER_CONTAINER_PREFIXES } from "../shared";

export const contentTextContract: BlockTypeContract = {
  blockType: "content.text",
  runtimeType: "text",
  label: "文本",
  description: "结构化正文 props.textBody 为唯一正文真源（禁止 props.content）。",
  shellKeys: BLOCK_SHELL_KEYS,
  allowedPrefixes: [
    ...WRAPPER_CONTAINER_PREFIXES,
    "props.textBody",
    "props.text",
    "props.html",
    "props.fontFamily",
    "props.fontSize",
    "props.color",
    "props.bold",
    "props.italic",
    "props.decoration",
  ],
  bindingKinds: {
    "props.textBody": "content",
    "props.fontFamily": "style",
    "props.fontSize": "style",
    "props.color": "style",
    "props.bold": "style",
    "props.italic": "style",
    "props.decoration": "style",
    "wrapperStyle.contentAlign": "structural",
  },
};
