import { describe, expect, it } from "vitest";
import {
  deriveBlockDisplayName,
  GRID_DISPLAY_NAME_FALLBACK,
  ROW_DISPLAY_NAME_FALLBACK,
  STACK_DISPLAY_NAME_FALLBACK,
} from "./deriveBlockDisplayName";
import type { RestoreNode } from "./types";

describe("deriveBlockDisplayName", () => {
  it("email 根", () => {
    expect(deriveBlockDisplayName({ t: "email", children: [] }, {})).toBe("邮件根");
  });

  it("email 直接子 stack 带 title", () => {
    const node: RestoreNode = { t: "stack", title: "顶部品牌导航", children: [] };
    expect(deriveBlockDisplayName(node, { isEmailDirectStack: true })).toBe("顶部品牌导航模块");
  });

  it("email 直接子 stack 无 title", () => {
    const node: RestoreNode = { t: "stack", children: [] };
    expect(deriveBlockDisplayName(node, { isEmailDirectStack: true })).toBe("垂直布局模块");
  });

  it("嵌套 stack 无 title", () => {
    const node: RestoreNode = { t: "stack", children: [] };
    expect(deriveBlockDisplayName(node, {})).toBe(STACK_DISPLAY_NAME_FALLBACK);
  });

  it("嵌套 row 无 title", () => {
    const node: RestoreNode = { t: "row", children: [] };
    expect(deriveBlockDisplayName(node, {})).toBe(ROW_DISPLAY_NAME_FALLBACK);
  });

  it("grid 无 title", () => {
    const node: RestoreNode = { t: "grid", columns: 3, children: [] };
    expect(deriveBlockDisplayName(node, {})).toBe(GRID_DISPLAY_NAME_FALLBACK);
  });

  it("文本用 content", () => {
    const node: RestoreNode = { t: "text", content: "WOMEN", role: "caption" };
    expect(deriveBlockDisplayName(node, {})).toBe("WOMEN");
  });
});
