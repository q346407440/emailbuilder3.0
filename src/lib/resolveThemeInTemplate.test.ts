import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock, EmailTemplate } from "../types/email";
import type { ExpandedTheme } from "../types/theme";
import { bakeThemeRefs, resolveThemeInTemplate } from "./resolveThemeInTemplate";

const theme: ExpandedTheme = {
  schemaVersion: "2.0.0",
  colors: {
    brand: "#0056a8",
    accent: "#ff832a",
    onBrand: "#ffffff",
    onAccent: "#1a1a1a",
    surface: "#ffffff",
    surfaceMuted: "#efefef",
    surfaceInverse: "#2d2d2d",
    text: "#1a1a1a",
    textMuted: "#8a8a8a",
    textInverse: "#ffffff",
    border: "#d6d6d6",
    danger: "#e53935",
  },
  tokens: {
    spacing: { xs: "6px", sm: "10px", md: "14px", lg: "20px", xl: "24px", section: "24px" },
    typography: { display: "50px", h1: "32px", h2: "22px", body: "16px", caption: "13px", micro: "11px" },
    radius: { none: "0", sm: "4px", md: "8px", lg: "12px", pill: "999px" },
  },
};

function templateWithProps(props: Record<string, unknown>): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    templateId: "demo",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: [],
        props: {
          width: "600px",
          backgroundColor: "#fff",
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          padding: { mode: "unified", unified: "0" },
          gapMode: "fixed",
          gap: "0",
          ...props,
        },
      },
    },
  };
}

function rootProps(template: EmailTemplate): Record<string, unknown> {
  return template.blocks.root?.props as Record<string, unknown>;
}

describe("resolveThemeInTemplate", () => {
  it("解析白名单字段中的 $themeRef 对象", () => {
    const input = templateWithProps({
      backgroundColor: { $themeRef: "colors.brand" },
      padding: { mode: "unified", unified: { $themeRef: "tokens.spacing.section" } },
      gap: { $themeRef: "tokens.spacing.section" },
    });

    const result = resolveThemeInTemplate(input, theme);

    assert.equal(result.issues.length, 0);
    assert.equal(result.template ? rootProps(result.template).backgroundColor : undefined, "#0056a8");
    assert.deepEqual(result.template ? rootProps(result.template).padding : undefined, {
      mode: "unified",
      unified: "24px",
    });
    assert.equal(result.template ? rootProps(result.template).gap : undefined, "24px");
    assert.notEqual(result.template, input);
  });

  it("解析嵌套描边与圆角字段", () => {
    const input = templateWithProps({
      border: { mode: "unified", width: "1px", style: "solid", color: { $themeRef: "colors.text" } },
      borderRadius: { mode: "unified", radius: { $themeRef: "tokens.radius.md" } },
    });

    const result = resolveThemeInTemplate(input, theme);

    assert.equal(result.issues.length, 0);
    assert.deepEqual(result.template ? rootProps(result.template).border : undefined, {
      mode: "unified",
      width: "1px",
      style: "solid",
      color: "#1a1a1a",
    });
    assert.deepEqual(result.template ? rootProps(result.template).borderRadius : undefined, {
      mode: "unified",
      radius: "8px",
    });
  });

  it("路径缺失时阻断并返回 null template", () => {
    const result = resolveThemeInTemplate(
      templateWithProps({ backgroundColor: { $themeRef: "colors.missing" } }),
      theme
    );

    assert.equal(result.template, null);
    assert.match(result.issues[0]?.reason ?? "", /无法解析/);
  });

  it("类型不匹配时阻断", () => {
    const result = resolveThemeInTemplate(
      templateWithProps({ backgroundColor: { $themeRef: "tokens.spacing" } }),
      theme
    );

    assert.equal(result.template, null);
    assert.match(result.issues[0]?.reason ?? "", /非空字符串/);
  });

  it("白名单外字段不解析并产出 issue", () => {
    const result = resolveThemeInTemplate(
      templateWithProps({ imageUrl: { $themeRef: "colors.brand" } }),
      theme
    );

    assert.equal(result.template, null);
    assert.match(result.issues[0]?.reason ?? "", /不允许/);
  });

  it("解析 progress 的 fillColor / trackColor themeRef", () => {
    const input: EmailTemplate = {
      schemaVersion: "3.0.0",
      templateId: "demo",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "emailRoot",
          parentId: null,
          children: ["bar"],
          props: {
            width: "600px",
            backgroundColor: "#fff",
            border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
            padding: { mode: "unified", unified: "0" },
            gapMode: "fixed",
            gap: "0",
          },
        },
        bar: {
          id: "bar",
          type: "progress",
          parentId: "root",
          children: [],
          props: {
            trackColor: { $themeRef: "colors.surfaceMuted" },
            fillColor: { $themeRef: "colors.brand" },
            value: 20,
            max: 100,
          },
        },
      },
    };

    const result = resolveThemeInTemplate(input, theme);

    assert.equal(result.issues.length, 0);
    assert.equal(result.template?.blocks.bar?.props?.trackColor, "#efefef");
    assert.equal(result.template?.blocks.bar?.props?.fillColor, "#0056a8");
  });

  it("tokens.radius 从合并主题 tokens.radius 字典解析", () => {
    const input: EmailTemplate = {
      schemaVersion: "3.0.0",
      templateId: "demo",
      templateVersion: 1,
      rootBlockId: "img1",
      blocks: {
        img1: {
          id: "img1",
          type: "image",
          parentId: null,
          children: [],
          wrapperStyle: {
            backgroundImage: {
              src: "https://example.com/x.png",
              alt: "",
              link: "",
              position: "center",
              fit: "cover",
              borderRadius: { mode: "unified", radius: { $themeRef: "tokens.radius.md" } },
              border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
            },
          },
          props: {},
          bindings: {
            "wrapperStyle.backgroundImage.borderRadius.radius": {
              slotId: "tokens.radius.md",
              mode: "theme",
              tokenPath: "tokens.radius.md",
              fieldKind: "style",
            },
          },
        } as unknown as EmailBlock,
      },
    };

    const result = resolveThemeInTemplate(input, theme);
    assert.equal(result.issues.length, 0);
    const bg = result.template?.blocks["img1"]?.wrapperStyle?.backgroundImage as
      | { borderRadius?: { mode: string; radius: string } }
      | undefined;
    const br = bg?.borderRadius;
    assert.deepEqual(br, { mode: "unified", radius: "8px" });
  });

  it("bakeThemeRefs 可烘焙合法 themeRef", () => {
    const baked = bakeThemeRefs(
      templateWithProps({ backgroundColor: { $themeRef: "colors.brand" } }),
      theme
    );
    assert.equal(rootProps(baked).backgroundColor, "#0056a8");

    assert.throws(
      () => bakeThemeRefs(templateWithProps({ backgroundColor: { $themeRef: "colors.missing" } }), theme),
      /themeRef 烘焙失败/
    );
  });
});
