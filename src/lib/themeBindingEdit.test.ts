import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { mergeTemplatePayload } from "./merge";
import { resolveDesignTokens } from "./resolveTokenPreset";
import { resolveThemeInTemplate } from "./resolveThemeInTemplate";
import {
  detachThemeFieldBranch,
  hasThemeRefInTemplateField,
  isThemeDetached,
} from "./themeBindingEdit";
import { getInspectFieldBindMode } from "./inspectFieldBindMode";
import type { EmailPayload, EmailTemplate } from "../types/email";
import type { LayoutManifest } from "../layout-variant-contract/types";
import { resolveEmailFilePaths } from "./emailLayoutVariant";

function loadMemberWelcomeCardFixture(): {
  template: EmailTemplate;
  tokenPresets: unknown;
  payload: EmailPayload;
} {
  const rootDir = path.join(process.cwd(), "data/emails/member-welcome");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(rootDir, "layout-manifest.json"), "utf8")
  ) as LayoutManifest;
  const paths = resolveEmailFilePaths(rootDir, manifest, "card");
  const template = JSON.parse(fs.readFileSync(paths.templatePath, "utf8")) as EmailTemplate;
  const tokenPresets = JSON.parse(fs.readFileSync(paths.tokenPresetsPath, "utf8"));
  const payload = JSON.parse(fs.readFileSync(path.join(rootDir, "payload.json"), "utf8")) as EmailPayload;
  return { template, tokenPresets, payload };
}

describe("detachThemeFieldBranch", () => {
  it("member-welcome 问候卡片背景色可解除样式令牌并烘焙字面量", () => {
    const { template, tokenPresets, payload } = loadMemberWelcomeCardFixture();
    const theme = resolveDesignTokens(tokenPresets);
    const mergedBase = mergeTemplatePayload(template, payload);
    const { template: merged } = resolveThemeInTemplate(mergedBase, theme);
    assert.ok(merged);

    const blockId = "mw-intro";
    const bindPath = "wrapperStyle.backgroundColor";
    assert.equal(hasThemeRefInTemplateField(template, blockId, bindPath), true);

    const next = detachThemeFieldBranch(template, merged!, blockId, bindPath);
    const block = next.blocks[blockId];
    assert.ok(block);
    const bg = block.wrapperStyle?.backgroundColor;
    assert.equal(bg, "#FFFFFF");
    assert.equal(block.bindings?.[bindPath], undefined);
    assert.equal(isThemeDetached(next, blockId, bindPath), true);
    assert.equal(getInspectFieldBindMode(next, block, payload, blockId, bindPath), "themeDetached");
  });

  it("仅 bindings.mode=theme、字段已是字面量时仍可解除跟随", () => {
    const { template, payload } = loadMemberWelcomeCardFixture();
    const blockId = "mw-intro";
    const bindPath = "wrapperStyle.backgroundColor";
    const inconsistent = structuredClone(template);
    const block = inconsistent.blocks[blockId];
    assert.ok(block?.wrapperStyle);
    block.wrapperStyle!.backgroundColor = "#FFFFFF";
    assert.equal(hasThemeRefInTemplateField(inconsistent, blockId, bindPath), true);

    const merged = mergeTemplatePayload(inconsistent, payload);

    const next = detachThemeFieldBranch(inconsistent, merged, blockId, bindPath);
    const after = next.blocks[blockId];
    assert.ok(after);
    assert.equal(after.wrapperStyle?.backgroundColor, "#FFFFFF");
    assert.equal(after.bindings?.[bindPath], undefined);
    assert.equal(isThemeDetached(next, blockId, bindPath), true);
  });
});
