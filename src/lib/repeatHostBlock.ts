import type { EmailBlock } from "../types/email";
import {
  REPEAT_HOST_BLOCK_TYPES,
  type RepeatHostBlockType,
} from "../repeat-binding-contract/values";

export { REPEAT_HOST_BLOCK_TYPES, type RepeatHostBlockType } from "../repeat-binding-contract/values";

export type RepeatHostBlock = Extract<EmailBlock, { type: RepeatHostBlockType }>;

export function isRepeatHostBlockType(type: EmailBlock["type"] | undefined): type is RepeatHostBlockType {
  return (REPEAT_HOST_BLOCK_TYPES as readonly string[]).includes(type ?? "");
}

export function isRepeatHostBlock(block: EmailBlock | undefined): block is RepeatHostBlock {
  return isRepeatHostBlockType(block?.type);
}
