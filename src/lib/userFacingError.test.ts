import { test } from "node:test";
import assert from "node:assert/strict";
import { toUserFacingErrorMessage } from "./userFacingError";

test("中文业务提示原样展示", () => {
  assert.equal(
    toUserFacingErrorMessage(new Error("保存冲突：内容已被其他操作修改"), "操作失败"),
    "保存冲突：内容已被其他操作修改"
  );
});

test("英文异常原文替换为兜底文案", () => {
  assert.equal(
    toUserFacingErrorMessage(new Error("Failed to fetch"), "操作失败，请稍后重试"),
    "操作失败，请稍后重试"
  );
});

test("空消息与非 Error 输入使用兜底文案", () => {
  assert.equal(toUserFacingErrorMessage(new Error("  "), "兜底"), "兜底");
  assert.equal(toUserFacingErrorMessage(undefined, "兜底"), "兜底");
  assert.equal(toUserFacingErrorMessage({ code: 500 }, "兜底"), "兜底");
});

test("字符串异常按同样规则处理", () => {
  assert.equal(toUserFacingErrorMessage("网络异常，请重试", "兜底"), "网络异常，请重试");
  assert.equal(toUserFacingErrorMessage("TypeError: x is null", "兜底"), "兜底");
});
