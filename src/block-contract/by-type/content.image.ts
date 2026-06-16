import type { BlockTypeContract } from "../types";
import {
  BLOCK_SHELL_KEYS,
  WRAPPER_BACKGROUND_IMAGE_PREFIXES,
  WRAPPER_CONTAINER_PREFIXES,
} from "../shared";

export const contentImageContract: BlockTypeContract = {
  blockType: "content.image",
  runtimeType: "image",
  label: "图片",
  description:
    "资源与裁切在 wrapperStyle.backgroundImage；props 仅用于叠放子内容的方向与间距，语义与带底图 layout 对齐。",
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
    "wrapperStyle.contentAlign": "structural",
    "wrapperStyle.backgroundImage.src": "content",
    "wrapperStyle.backgroundImage.link": "content",
    "wrapperStyle.backgroundImage.fit": "structural",
    "wrapperStyle.backgroundImage.position": "structural",
    "wrapperStyle.width": "style",
    "wrapperStyle.height": "style",
    "wrapperStyle.widthMode": "structural",
    "wrapperStyle.heightMode": "structural",
  },
};
