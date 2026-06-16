import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inferSemanticBlockTypeForMeta,
  normalizeRuntimeTypeAlias,
  RUNTIME_BLOCK_TYPES,
  RUNTIME_TYPE_TO_SEMANTIC,
} from "./types";

test("normalizeRuntimeTypeAlias 归一常见别名写法", () => {
  // 合法 type 原样返回
  for (const type of RUNTIME_BLOCK_TYPES) {
    assert.equal(normalizeRuntimeTypeAlias(type), type);
  }
  // <type>Block 后缀（2026-06-12 模板 38 保底产物实测 41 处）
  assert.equal(normalizeRuntimeTypeAlias("textBlock"), "text");
  assert.equal(normalizeRuntimeTypeAlias("imageBlock"), "image");
  assert.equal(normalizeRuntimeTypeAlias("buttonBlock"), "button");
  assert.equal(normalizeRuntimeTypeAlias("iconBlock"), "icon");
  // 语义类型当 runtime 用
  assert.equal(normalizeRuntimeTypeAlias("layout.container"), "layout");
  assert.equal(normalizeRuntimeTypeAlias("content.text"), "text");
  assert.equal(normalizeRuntimeTypeAlias("action.button"), "button");
  // 驼峰语义名
  assert.equal(normalizeRuntimeTypeAlias("layoutContainer"), "layout");
  assert.equal(normalizeRuntimeTypeAlias("contentImage"), "image");
  // 不可归一返回 null，不编造
  assert.equal(normalizeRuntimeTypeAlias("mysteryWidget"), null);
  assert.equal(normalizeRuntimeTypeAlias(""), null);
});

test("inferSemanticBlockTypeForMeta 与落盘约定一致", () => {
  // emailRoot 的 blockMeta 落盘约定写 layout.container（registry 解析时始终视 email.root）
  assert.equal(inferSemanticBlockTypeForMeta("emailRoot"), "layout.container");
  // 其余按默认映射；别名先归一再映射
  assert.equal(inferSemanticBlockTypeForMeta("layout"), RUNTIME_TYPE_TO_SEMANTIC.layout);
  assert.equal(inferSemanticBlockTypeForMeta("textBlock"), "content.text");
  // 未知 type 不编造语义类型
  assert.equal(inferSemanticBlockTypeForMeta("mysteryWidget"), null);
});
