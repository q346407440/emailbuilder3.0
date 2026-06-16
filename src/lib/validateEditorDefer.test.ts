import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { validateTemplate, validationIssuesForEditorDisplay } from "./validate";

function emailRootWithBackground(src: string): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "test-template",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          backgroundImage: {
            src,
            fit: "cover",
            position: "center",
          },
        },
        props: {
          width: "600px",
          backgroundColor: "#ffffff",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {},
      },
    },
  };
}

describe("validationIssuesForEditorDisplay", () => {
  it("已启用背景图但 src 为空：编辑中不展示，完整校验仍包含", () => {
    const all = validateTemplate(emailRootWithBackground(""));
    const srcIssue = all.find((i) => i.path === "blocks.root.wrapperStyle.backgroundImage.src");
    assert.ok(srcIssue);
    assert.equal(srcIssue?.phase, "save");
    assert.equal(validationIssuesForEditorDisplay(all).length, 0);
  });

  it("背景图 src 已填写：无 save 阶段项", () => {
    const all = validateTemplate(
      emailRootWithBackground("https://images.pexels.com/photos/1/pexels-photo-1.jpeg")
    );
    const srcIssue = all.find((i) => i.path === "blocks.root.wrapperStyle.backgroundImage.src");
    assert.equal(srcIssue, undefined);
  });
});
