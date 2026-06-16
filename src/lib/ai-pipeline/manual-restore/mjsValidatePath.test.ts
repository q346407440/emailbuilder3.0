import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blockIdFromValidateIssueLine,
  rewriteNestedIssuePathToBlockPath,
} from "./mjsValidatePath";

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

const NESTED_TEMPLATE = {
  root: {
    id: "ai-root",
    children: [
      { id: "ai-s1" },
      {
        id: "ai-s7",
        children: [
          {
            id: "ai-s7-nav",
            children: [{ id: "ai-s7-nav-left" }, { id: "ai-s7-nav-right" }],
          },
        ],
      },
    ],
  },
};

test("rewriteNestedIssuePathToBlockPath 把索引路径改写为 blocks.<id> 形态", () => {
  // 壳层报错的典型形态（2026-06-12 模板 38 事故：此前全部兜底归属 template slot）
  assert.equal(
    rewriteNestedIssuePathToBlockPath("root.children[1].children[0].children[0].blockMeta", NESTED_TEMPLATE),
    "blocks.ai-s7-nav-left.blockMeta"
  );
  assert.equal(
    rewriteNestedIssuePathToBlockPath("root.children[1].children[0].children[1].type", NESTED_TEMPLATE),
    "blocks.ai-s7-nav-right.type"
  );
  // 根节点自身字段与无余段路径
  assert.equal(rewriteNestedIssuePathToBlockPath("root.blockMeta", NESTED_TEMPLATE), "blocks.ai-root.blockMeta");
  assert.equal(rewriteNestedIssuePathToBlockPath("root.children[0]", NESTED_TEMPLATE), "blocks.ai-s1");
  // 多级字段余段保留
  assert.equal(
    rewriteNestedIssuePathToBlockPath("root.children[1].blockMeta.blockType", NESTED_TEMPLATE),
    "blocks.ai-s7.blockMeta.blockType"
  );
});

test("rewriteNestedIssuePathToBlockPath 不可解析时原样保留", () => {
  // 越界索引
  assert.equal(
    rewriteNestedIssuePathToBlockPath("root.children[9].blockMeta", NESTED_TEMPLATE),
    "root.children[9].blockMeta"
  );
  // 节点缺 id（id 缺失是独立错误，不可机械寻址）
  const noId = { root: { id: "r", children: [{}] } };
  assert.equal(rewriteNestedIssuePathToBlockPath("root.children[0].type", noId), "root.children[0].type");
  // 非 root 前缀路径与已是 blocks 形态的路径不受影响
  assert.equal(
    rewriteNestedIssuePathToBlockPath("blocks.ai-s1.props.bold", NESTED_TEMPLATE),
    "blocks.ai-s1.props.bold"
  );
  assert.equal(rewriteNestedIssuePathToBlockPath("schemaVersion", NESTED_TEMPLATE), "schemaVersion");
});
