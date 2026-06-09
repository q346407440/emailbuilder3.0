import { test } from "node:test";
import assert from "node:assert/strict";
import { blockIdFromValidateIssueLine } from "./mjsValidatePath";

test("blockIdFromValidateIssueLine 解析含连字符的 block id", () => {
  assert.equal(
    blockIdFromValidateIssueLine(
      "blocks.ai-s1-topbar-row.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入"
    ),
    "ai-s1-topbar-row"
  );
  assert.equal(
    blockIdFromValidateIssueLine("blocks.ai-root.props.borderRadius.mode: 字段不在 blockType 白名单内"),
    "ai-root"
  );
});
