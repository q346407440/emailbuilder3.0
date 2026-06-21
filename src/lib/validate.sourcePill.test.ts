import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  EmailBlock,
  EmailTemplate,
  WrapperBackgroundImage,
} from "../types/email";
import { validateTemplate, validateTemplateBindings } from "./validate";

function makeTemplate(blocks: EmailTemplate["blocks"]): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "test",
    templateVersion: 1,
    rootBlockId: "root",
    blocks,
  };
}

function blockForTest(block: unknown): EmailBlock {
  return block as EmailBlock;
}

describe("validateTemplateBindings —— 来源胶囊体系约束", () => {
  it("mode=theme 出现在 content 字段（image.wrapperStyle.backgroundImage.src）应报错", () => {
    const t = makeTemplate({
      img: {
        id: "img",
        type: "image",
        parentId: null,
        children: [],
        wrapperStyle: {
          // 故意保留非法字段以验证运行时校验拒绝（类型已移除该字段）
          backgroundImage: {
            src: "https://example.com/x.jpg",
            alt: "",
            link: "",
            position: "center",
            fit: "cover",
            borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
            border: { style: "solid", color: "rgba(0,0,0,0)", top: "0", right: "0", bottom: "0", left: "0" },
          } as unknown as WrapperBackgroundImage,
        },
        props: {},
        bindings: {
          "wrapperStyle.backgroundImage.src": {
            slotId: "tokens.color",
            mode: "theme",
            tokenPath: "tokens.color",
            fieldKind: "content",
          },
        },
      },
    });
    const issues = validateTemplateBindings(t);
    const violation = issues.find(
      (i) =>
        i.path === "blocks.img.bindings.wrapperStyle.backgroundImage.src" &&
        /样式（style）字段/.test(i.reason)
    );
    assert.ok(violation, "未捕获 theme 误用到 content 字段的违例");
  });

  it("backgroundImage.borderRadius bindings 应被禁止持久化校验捕获", () => {
    const t = makeTemplate({
      img: {
        id: "img",
        type: "image",
        parentId: null,
        children: [],
        wrapperStyle: {
          // 故意保留非法字段以验证运行时校验拒绝（类型已移除该字段）
          backgroundImage: {
            src: "https://example.com/x.jpg",
            position: "center",
            fit: "cover",
            borderRadius: { topLeft: "8px", topRight: "8px", bottomRight: "8px", bottomLeft: "8px" },
          } as unknown as WrapperBackgroundImage,
        },
        props: {},
        bindings: {
          "wrapperStyle.backgroundImage.borderRadius.topLeft": {
            slotId: "vipRadius",
            mode: "variable",
            valueType: "string",
            allowExternal: true,
            fieldKind: "style",
          },
        },
      },
    });
    const issues = validateTemplate(t);
    const violation = issues.find(
      (i) =>
        i.path === "blocks.img.bindings.wrapperStyle.backgroundImage.borderRadius.topLeft" &&
        /border \/ borderRadius 已禁止持久化/.test(i.reason)
    );
    assert.ok(violation, "未捕获禁止持久化的图级圆角 binding");
  });

  it("mode=variable 在 content 字段（button.props.text）应通过", () => {
    const t = makeTemplate({
      btn: {
        id: "btn",
        type: "button",
        parentId: null,
        children: [],
        wrapperStyle: {},
        props: { text: "Click", buttonStyle: {} },
        bindings: {
          "props.text": {
            slotId: "ctaText",
            mode: "variable",
            valueType: "string",
            allowExternal: true,
            fieldKind: "content",
          },
        },
      },
    });
    const issues = validateTemplateBindings(t);
    assert.equal(issues.length, 0, `不应报错，实际：${JSON.stringify(issues)}`);
  });

  it("声明 fieldKind 与推断不一致应报错", () => {
    const t = makeTemplate({
      btn: {
        id: "btn",
        type: "button",
        parentId: null,
        children: [],
        wrapperStyle: {},
        props: { text: "Click", buttonStyle: {} },
        bindings: {
          "props.text": {
            slotId: "ctaText",
            mode: "variable",
            valueType: "string",
            allowExternal: true,
            // 实际 button.props.text 应为 content；这里声明 style 测试越界
            fieldKind: "style",
          },
        },
      },
    });
    const issues = validateTemplateBindings(t);
    const inconsistent = issues.find(
      (i) => /字段分类不一致/.test(i.reason) && i.path.endsWith("fieldKind")
    );
    assert.ok(inconsistent, "未捕获字段分类声明与推断不一致的违例");
  });

  it("字段值含 $themeRef 但 bindings 缺登记应报错", () => {
    const t = makeTemplate({
      txt: blockForTest({
        id: "txt",
        type: "text",
        parentId: null,
        children: [],
        wrapperStyle: {},
        props: {
          color: { $themeRef: "colors.brand" },
        },
        // 故意不在 bindings 中登记 mode: "theme"
        bindings: {},
      }),
    });
    const issues = validateTemplateBindings(t);
    const violation = issues.find(
      (i) =>
        i.path === "blocks.txt.props.color" &&
        /未登记 mode:"theme"/.test(i.reason)
    );
    assert.ok(violation, "未捕获 themeRef 与 bindings 不一致的违例");
  });

  it("structural 字段（layout.props.direction）出现 binding 应报错", () => {
    const t = makeTemplate({
      lay: {
        id: "lay",
        type: "layout",
        parentId: null,
        children: [],
        wrapperStyle: {},
        props: { direction: "vertical" },
        bindings: {
          "props.direction": {
            slotId: "ctaDir",
            mode: "variable",
            valueType: "string",
            allowExternal: true,
            fieldKind: "structural",
          },
        },
      },
    });
    const issues = validateTemplateBindings(t);
    const violation = issues.find(
      (i) =>
        i.path === "blocks.lay.bindings.props.direction" &&
        /结构性（structural）字段/.test(i.reason)
    );
    assert.ok(violation, "未捕获 structural 字段被绑定的违例");
  });

  it("mode=theme 缺 tokenPath 应报错", () => {
    const t = makeTemplate({
      btn: blockForTest({
        id: "btn",
        type: "button",
        parentId: null,
        children: [],
        wrapperStyle: {},
        props: {
          buttonStyle: { backgroundColor: { $themeRef: "colors.brand" } },
        },
        bindings: {
          "props.buttonStyle.backgroundColor": {
            slotId: "colors.brand",
            mode: "theme",
            // tokenPath 缺失
            fieldKind: "style",
          },
        },
      }),
    });
    const issues = validateTemplateBindings(t);
    const violation = issues.find(
      (i) =>
        i.path === "blocks.btn.bindings.props.buttonStyle.backgroundColor.tokenPath" &&
        /必须声明 tokenPath/.test(i.reason)
    );
    assert.ok(violation, "未捕获 theme 缺 tokenPath 的违例");
  });

  it("collection 带数字下标 slotPath 且不在列表重复行模板内应报错", () => {
    const t = makeTemplate({
      host: blockForTest({
        id: "host",
        type: "layout",
        parentId: null,
        children: ["leaf"],
        wrapperStyle: {},
        props: { direction: "vertical" },
      }),
      leaf: blockForTest({
        id: "leaf",
        type: "text",
        parentId: "host",
        children: [],
        wrapperStyle: {},
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "x" }] }] },
          bold: false,
          italic: false,
          decoration: "none",
        },
        bindings: {
          "props.textBody.paragraphs.0.runs.0.text": {
            slotId: "items",
            mode: "variable",
            valueType: "collection",
            allowExternal: true,
            fieldKind: "content",
            slotPath: "0.title",
            itemFields: [{ key: "title", label: "标题", valueType: "string", required: true }],
          },
        },
      }),
    });
    const issues = validateTemplateBindings(t);
    const violation = issues.find(
      (i) =>
        i.path === "blocks.leaf.bindings.props.textBody.paragraphs.0.runs.0.text.slotPath" &&
        /列表重复/.test(i.reason)
    );
    assert.ok(violation, "未捕获静态行上 collection 下标绑定的违例");
  });
});
