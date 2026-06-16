import type { BlockTypeContract } from "../types";
import { BLOCK_SHELL_KEYS, WRAPPER_BACKGROUND_IMAGE_PREFIXES } from "../shared";

/**
 * 根节点壳层约束（与 validate 一致）：
 * - 不允许 visibility（条件显隐配在子块）
 * - 不允许 repeat（列表重复仅 layout/grid/image，见 validateTemplateBindings）
 */
export const EMAIL_ROOT_SHELL_KEYS = BLOCK_SHELL_KEYS.filter(
  (k) => k !== "visibility" && k !== "repeat"
);

export const emailRootContract: BlockTypeContract = {
  blockType: "email.root",
  runtimeType: "emailRoot",
  label: "邮件根",
  description:
    "画布根节点；blockMeta 常记为 layout.container，但 runtime 为 emailRoot；可配置内容区底图 backgroundImage。列表重复仅允许写在 layout/grid/image，不得出现在根节点。",
  shellKeys: EMAIL_ROOT_SHELL_KEYS,
  allowedPrefixes: [
    "wrapperStyle.widthMode",
    "wrapperStyle.heightMode",
    ...WRAPPER_BACKGROUND_IMAGE_PREFIXES,
    "props.backgroundColor",
    "props.width",
    "props.padding",
    "props.border",
    "props.gapMode",
    "props.gap",
  ],
  bindingKinds: {
    "wrapperStyle.backgroundImage.src": "content",
    "wrapperStyle.backgroundImage.link": "content",
    "wrapperStyle.backgroundImage.fit": "structural",
    "wrapperStyle.backgroundImage.position": "structural",
  },
};
