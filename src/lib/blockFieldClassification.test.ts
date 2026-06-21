import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyField,
  isContentField,
  isStructuralField,
  isStyleField,
} from "./blockFieldClassification";

describe("blockFieldClassification —— 通用 wrapperStyle 字段", () => {
  it("padding / borderRadius / border / backgroundColor → style", () => {
    assert.equal(classifyField("layout", "wrapperStyle.padding.top"), "style");
    assert.equal(classifyField("button", "wrapperStyle.borderRadius.topLeft"), "style");
    assert.equal(classifyField("layout", "wrapperStyle.border.color"), "style");
    assert.equal(classifyField("layout", "wrapperStyle.backgroundColor"), "style");
  });

  it("白名单外的旧 wrapperStyle 路径保守视为 structural", () => {
    assert.equal(classifyField("text", "wrapperStyle.margin.top"), "structural");
    assert.equal(classifyField("layout", "wrapperStyle.gap"), "structural");
  });

  it("widthMode / heightMode → structural；width / height 数值 → style", () => {
    assert.equal(classifyField("layout", "wrapperStyle.widthMode"), "structural");
    assert.equal(classifyField("layout", "wrapperStyle.heightMode"), "structural");
    assert.equal(classifyField("layout", "wrapperStyle.width"), "style");
    assert.equal(classifyField("layout", "wrapperStyle.height"), "style");
  });

  it("text contentAlign → structural", () => {
    assert.equal(classifyField("text", "wrapperStyle.contentAlign.horizontal"), "structural");
  });

  it("背景图：URL/link → content；fit / position → structural", () => {
    assert.equal(classifyField("layout", "wrapperStyle.backgroundImage.src"), "content");
    assert.equal(classifyField("layout", "wrapperStyle.backgroundImage.link"), "content");
    assert.equal(classifyField("layout", "wrapperStyle.backgroundImage.fit"), "structural");
    assert.equal(classifyField("layout", "wrapperStyle.backgroundImage.position"), "structural");
    assert.equal(
      classifyField("layout", "wrapperStyle.backgroundImage.borderRadius.topLeft"),
      "structural"
    );
  });
});

describe("blockFieldClassification —— emailRoot", () => {
  it("背景色 / padding / border → style；gapMode / width → structural", () => {
    assert.equal(classifyField("emailRoot", "props.backgroundColor"), "style");
    assert.equal(classifyField("emailRoot", "props.padding.top"), "style");
    assert.equal(classifyField("emailRoot", "props.border.color"), "style");
    assert.equal(classifyField("emailRoot", "props.gapMode"), "structural");
    assert.equal(classifyField("emailRoot", "props.gap"), "style");
    assert.equal(classifyField("emailRoot", "props.width"), "structural");
    assert.equal(classifyField("emailRoot", "wrapperStyle.backgroundImage.src"), "content");
    assert.equal(classifyField("emailRoot", "wrapperStyle.backgroundImage.link"), "content");
    assert.equal(classifyField("emailRoot", "wrapperStyle.backgroundImage.fit"), "structural");
    assert.equal(classifyField("emailRoot", "wrapperStyle.backgroundImage.position"), "structural");
  });
});

describe("blockFieldClassification —— text", () => {
  it("正文（textBody / text / html）→ content；props.content 已废弃为 structural", () => {
    assert.equal(classifyField("text", "props.content"), "structural");
    assert.equal(classifyField("text", "props.textBody"), "content");
    assert.equal(classifyField("text", "props.text"), "content");
    assert.equal(classifyField("text", "props.html"), "content");
    assert.equal(classifyField("text", "props.fontSize"), "style");
    assert.equal(classifyField("text", "props.color"), "style");
    assert.equal(classifyField("text", "props.bold"), "style");
    assert.equal(classifyField("text", "props.italic"), "style");
    assert.equal(classifyField("text", "props.decoration"), "style");
  });

  it("textBody run color/fontSize → structural（仅字面量）；run text → content", () => {
    assert.equal(classifyField("text", "props.textBody.paragraphs.0.runs.1.color"), "structural");
    assert.equal(classifyField("text", "props.textBody.paragraphs.0.runs.1.fontSize"), "structural");
    assert.equal(classifyField("text", "props.textBody.paragraphs.0.runs.0.text"), "content");
  });
});

describe("blockFieldClassification —— image（与 layout 容器背景图同源路径）", () => {
  it("wrapperStyle.backgroundImage.src / link → content", () => {
    assert.equal(classifyField("image", "wrapperStyle.backgroundImage.src"), "content");
    assert.equal(classifyField("image", "wrapperStyle.backgroundImage.link"), "content");
  });

  it("backgroundImage fit/position → structural；图级 border/borderRadius 已废弃", () => {
    assert.equal(classifyField("image", "wrapperStyle.backgroundImage.position"), "structural");
    assert.equal(classifyField("image", "wrapperStyle.backgroundImage.fit"), "structural");
    assert.equal(
      classifyField("image", "wrapperStyle.backgroundImage.borderRadius.topLeft"),
      "structural"
    );
  });

  it("叠放栈布局 props 与 layout 同源分类", () => {
    assert.equal(classifyField("image", "props.direction"), "structural");
    assert.equal(classifyField("image", "props.gapMode"), "structural");
    assert.equal(classifyField("image", "props.gap"), "style");
  });

  it("历史 props.* 路径不再作为可绑定 content（保守 structural）", () => {
    assert.equal(classifyField("image", "props.src"), "structural");
  });
});

describe("blockFieldClassification —— button（含灰色字段定调）", () => {
  it("text / link → content（按钮 href 是业务 URL，不归 style）", () => {
    assert.equal(classifyField("button", "props.text"), "content");
    assert.equal(classifyField("button", "props.link"), "content");
  });

  it("buttonStyle.* → style", () => {
    assert.equal(classifyField("button", "props.buttonStyle.widthMode"), "structural");
    assert.equal(classifyField("button", "props.buttonStyle.width"), "style");
    assert.equal(classifyField("button", "props.buttonStyle.backgroundColor"), "style");
    assert.equal(classifyField("button", "props.buttonStyle.textColor"), "style");
    assert.equal(classifyField("button", "props.buttonStyle.fontSize"), "style");
    assert.equal(classifyField("button", "props.buttonStyle.borderRadius.topLeft"), "style");
    assert.equal(classifyField("button", "props.buttonStyle.border.color"), "style");
    assert.equal(classifyField("button", "props.buttonStyle.bold"), "style");
    assert.equal(classifyField("button", "props.buttonStyle.italic"), "style");
  });
});

describe("blockFieldClassification —— icon", () => {
  it("icon.src / link → content（图标 URL 与跳转链接）；size → style", () => {
    assert.equal(classifyField("icon", "props.src"), "content");
    assert.equal(classifyField("icon", "props.link"), "content");
    assert.equal(classifyField("icon", "props.size"), "style");
  });
});

describe("blockFieldClassification —— layout / grid / divider", () => {
  it("layout.direction / gapMode → structural；gap → style", () => {
    assert.equal(classifyField("layout", "props.direction"), "structural");
    assert.equal(classifyField("layout", "props.gapMode"), "structural");
    assert.equal(classifyField("layout", "props.gap"), "style");
  });

  it("grid.columns / cellWidthMode / cellHeightMode → structural；gap / cellWidth / cellHeight → style", () => {
    assert.equal(classifyField("grid", "props.columns"), "structural");
    assert.equal(classifyField("grid", "props.cellWidthMode"), "structural");
    assert.equal(classifyField("grid", "props.cellHeightMode"), "structural");
    assert.equal(classifyField("grid", "props.gap"), "style");
    assert.equal(classifyField("grid", "props.cellWidth"), "style");
    assert.equal(classifyField("grid", "props.cellHeight"), "style");
  });

  it("divider.color / height → style", () => {
    assert.equal(classifyField("divider", "props.lineWidthMode"), "structural");
    assert.equal(classifyField("divider", "props.lineWidth"), "style");
    assert.equal(classifyField("divider", "props.color"), "style");
    assert.equal(classifyField("divider", "props.height"), "style");
  });

  it("progress 槽色 / 进度色 / 条几何 → style；数值 → content", () => {
    assert.equal(classifyField("progress", "props.trackColor"), "style");
    assert.equal(classifyField("progress", "props.fillColor"), "style");
    assert.equal(classifyField("progress", "props.barWidthMode"), "structural");
    assert.equal(classifyField("progress", "props.barWidth"), "style");
    assert.equal(classifyField("progress", "props.barHeight"), "style");
    assert.equal(classifyField("progress", "props.barBorderRadius"), "style");
    assert.equal(classifyField("progress", "props.value"), "content");
    assert.equal(classifyField("progress", "props.max"), "content");
  });
});

describe("blockFieldClassification —— 兜底与最长前缀优先", () => {
  it("未声明字段路径默认 structural（保守，禁止误绑）", () => {
    assert.equal(classifyField("text", "props.unknownField"), "structural");
    assert.equal(classifyField("imaginaryBlock", "props.color"), "structural");
  });

  it("grid wrapperStyle.backgroundImage.src → content", () => {
    assert.equal(classifyField("grid", "wrapperStyle.backgroundImage.src"), "content");
    assert.equal(classifyField("grid", "wrapperStyle.backgroundImage.fit"), "structural");
  });

  it("最长前缀优先：wrapperStyle.backgroundImage.src 应优先于通用规则", () => {
    // 没有这种通用规则覆盖，但确认深路径仍能命中专属前缀
    assert.equal(classifyField("layout", "wrapperStyle.backgroundImage.src"), "content");
    // 子路径一并命中（如未来出现 backgroundImage.src.foo 也应保持 content）
    assert.equal(classifyField("layout", "wrapperStyle.backgroundImage.src.something"), "content");
  });
});

describe("blockFieldClassification —— helper API", () => {
  it("isStyleField / isContentField / isStructuralField 与 classifyField 一致", () => {
    assert.equal(isStyleField("button", "props.buttonStyle.backgroundColor"), true);
    assert.equal(isContentField("image", "wrapperStyle.backgroundImage.src"), true);
    assert.equal(isStructuralField("layout", "props.direction"), true);
    assert.equal(isStyleField("button", "props.text"), false);
    assert.equal(isContentField("button", "props.buttonStyle.backgroundColor"), false);
  });
});
