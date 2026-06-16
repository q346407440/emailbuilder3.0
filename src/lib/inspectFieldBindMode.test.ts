import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { pathKeyFor } from "./bindingUiMeta";
import { BASELINE_EXPANDED_THEME } from "./baselineExpandedTheme";
import { resolveDesignTokens } from "./resolveTokenPreset";
import { getInspectFieldBindMode } from "./inspectFieldBindMode";
import { mergeTemplatePayload } from "./merge";
import { resolveThemeInTemplate } from "./resolveThemeInTemplate";
import { detachThemeFieldBranch, applyThemeTokenBinding, hasThemeRefInTemplateField } from "./themeBindingEdit";
import { isThemeRef } from "../types/themeRef";
import { parseTemplateFromDisk } from "./templateTreeAdapter";

function containsThemeRef(value: unknown): boolean {
  if (isThemeRef(value)) return true;
  if (Array.isArray(value)) return value.some(containsThemeRef);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some(containsThemeRef);
  return false;
}

describe("getInspectFieldBindMode（主题解除 meta 优先于字面量 $themeRef）", () => {
  const blockId = "blk-img";
  const bindPath = "wrapperStyle.borderRadius";

  it("仅有 $themeRef 且无解除 meta → themeFollow", () => {
    const template = {
      schemaVersion: "4.0.0" as const,
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "emailRoot" as const,
          parentId: "",
          children: [blockId],
          wrapperStyle: {},
          props: { width: "600px", gapMode: "fixed", gap: "0" },
        },
        [blockId]: {
          id: blockId,
          type: "image" as const,
          parentId: "root",
          children: [],
          wrapperStyle: {
            borderRadius: {
              mode: "unified",
              radius: { $themeRef: "tokens.radius.none" },
            },
            backgroundImage: {
              src: "https://example.com/a.png",
              position: "center",
              fit: "cover",
            },
          },
          props: {},
        },
      },
    } as unknown as EmailTemplate;
    const block = template.blocks[blockId]!;
    const payload: EmailPayload = { schemaVersion: "1.0.0", slots: {}, values: {} };
    assert.equal(getInspectFieldBindMode(template, block, payload, blockId, bindPath), "themeFollow");
  });

  it("meta 已记录解除但字面量仍含 $themeRef → themeDetached（避免永远 themeFollow）", () => {
    const pk = pathKeyFor(blockId, bindPath);
    const template = {
      schemaVersion: "4.0.0" as const,
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      meta: {
        easyEmailBindingUi: {
          themeRestoreJson: {
            [pk]: JSON.stringify({
              mode: "unified",
              radius: { $themeRef: "tokens.radius.none" },
            }),
          },
        },
      },
      blocks: {
        root: {
          id: "root",
          type: "emailRoot" as const,
          parentId: "",
          children: [blockId],
          wrapperStyle: {},
          props: { width: "600px", gapMode: "fixed", gap: "0" },
        },
        [blockId]: {
          id: blockId,
          type: "image" as const,
          parentId: "root",
          children: [],
          wrapperStyle: {
            borderRadius: {
              mode: "unified",
              radius: { $themeRef: "tokens.radius.none" },
            },
            backgroundImage: {
              src: "https://example.com/a.png",
              position: "center",
              fit: "cover",
            },
          },
          props: {},
        },
      },
    } as unknown as EmailTemplate;
    const block = template.blocks[blockId]!;
    const payload: EmailPayload = { schemaVersion: "1.0.0", slots: {}, values: {} };
    assert.equal(getInspectFieldBindMode(template, block, payload, blockId, bindPath), "themeDetached");
  });
});

describe("template43 v2 主视觉块：解除主题圆角", () => {
  const root = path.join(process.cwd(), "data/emails/engagement_grooming_template43_v2");
  const bid = "tmpl43v2-section-heroimage-1";
  const bindPath = "props.borderRadius";

  it("detach 后为 themeDetached 且模板字段与子字段均解除 theme 锁定，可手动重新绑定预设", (t) => {
    if (!fs.existsSync(path.join(root, "template.json"))) {
      t.skip("当前工作区未包含 template43 v2 fixture");
      return;
    }
    const raw = parseTemplateFromDisk(
      JSON.parse(fs.readFileSync(path.join(root, "template.json"), "utf8"))
    );
    const tokenPresetsPath = path.join(root, "tokenPresets.json");
    let expanded = BASELINE_EXPANDED_THEME;
    if (fs.existsSync(tokenPresetsPath)) {
      expanded = resolveDesignTokens(JSON.parse(fs.readFileSync(tokenPresetsPath, "utf8")));
    }
    let payload: EmailPayload = { schemaVersion: "1.0.0", slots: {}, values: {} };
    try {
      payload = JSON.parse(fs.readFileSync(path.join(root, "payload.json"), "utf8"));
    } catch {
      /* 无 payload 文件则用默认空赋值 */
    }

    let mergedTpl = mergeTemplatePayload(raw, payload);
    if (containsThemeRef(mergedTpl)) {
      const r = resolveThemeInTemplate(mergedTpl, expanded);
      assert.ok(r.template, r.issues.map((i) => `${i.path}:${i.reason}`).join("; "));
      mergedTpl = r.template!;
    }

    const blockBefore = raw.blocks[bid];
    assert.equal(getInspectFieldBindMode(raw, blockBefore, payload, bid, bindPath), "themeFollow");

    const next = detachThemeFieldBranch(raw, mergedTpl, bid, bindPath);
    const blockAfter = next.blocks[bid];
    assert.ok(blockAfter);
    assert.equal(getInspectFieldBindMode(next, blockAfter, payload, bid, bindPath), "themeDetached");
    assert.equal(getInspectFieldBindMode(next, blockAfter, payload, bid, "props.borderRadius.radius"), "free");
    assert.equal(hasThemeRefInTemplateField(next, bid, bindPath), false);

    const beforeBlock = raw.blocks[bid];
    assert.ok(beforeBlock);
    const tokenPath = beforeBlock.bindings?.[bindPath]?.tokenPath;
    assert.ok(tokenPath, "fixture 应含 theme tokenPath");

    const rebound = applyThemeTokenBinding(next, bid, bindPath, tokenPath);
    const reboundBlock = rebound.blocks[bid];
    assert.ok(reboundBlock);
    assert.equal(getInspectFieldBindMode(rebound, reboundBlock, payload, bid, bindPath), "themeFollow");
    assert.equal(
      getInspectFieldBindMode(rebound, reboundBlock, payload, bid, "props.borderRadius.radius"),
      "themeFollow"
    );
  });
});
