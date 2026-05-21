import type { EmailBlock, EmailTemplate } from "../types/email";
import { EMAIL_ROOT_FIXED_WIDTH } from "../render-defaults-contract/values";
import type { ThemeRef } from "../types/themeRef";

const CATALOG_ROOT_ID = "__catalog_root__";

function themeRef(tokenPath: string): ThemeRef {
  return { $themeRef: tokenPath };
}

const T = {
  colorPrimary: themeRef("colors.primary"),
  colorSecondary: themeRef("colors.secondary"),
  colorSurface: themeRef("colors.surface"),
  fontHeading: themeRef("fonts.heading"),
  fontBody: themeRef("fonts.body"),
  gap: themeRef("tokens.spacing.gap"),
  section: themeRef("tokens.spacing.section"),
  pageInline: themeRef("tokens.spacing.pageInline"),
  typoBody: themeRef("tokens.typography.body"),
  radiusPanel: themeRef("tokens.radius.panel"),
  radiusCta: themeRef("tokens.radius.cta"),
} as const;

function sectionPadding() {
  return {
    mode: "separate" as const,
    top: T.section,
    right: T.pageInline,
    bottom: T.section,
    left: T.pageInline,
  };
}

function ctaBorderRadius() {
  return {
    mode: "unified" as const,
    radius: T.radiusCta,
  };
}

function defaultBorder() {
  return {
    mode: "unified" as const,
    width: "0",
    style: "solid" as const,
    color: "rgba(0,0,0,0)",
  };
}

function defaultBorderRadius() {
  return { mode: "unified" as const, radius: "0" };
}

function defaultWrapperBase() {
  return {
    placement: { horizontal: "center" as const, vertical: "center" as const },
    contentAlign: { horizontal: "left" as const, vertical: "top" as const },
    widthMode: "fill" as const,
    heightMode: "hug" as const,
  };
}

function defaultThemedTextProps(color = T.colorPrimary) {
  return {
    fontSize: T.typoBody,
    color,
    fontFamily: T.fontBody,
    bold: false,
    italic: false,
    decoration: "none" as const,
  };
}

export type BlockCatalogEntry = {
  masterId: string;
  blockType: string;
  runtimeType: EmailBlock["type"];
  name: string;
  description: string;
  buildSampleBlock: (blockId: string, parentId: string) => EmailBlock;
  /** 容器类 block 母版预览用的示例子节点 */
  buildPreviewChildBlocks?: (sampleBlockId: string) => {
    blocks: Record<string, EmailBlock>;
    blockMeta: Record<string, { blockType: string; name: string }>;
    childIds: string[];
  };
};

function buildDemoTextBlock(
  id: string,
  parentId: string,
  text: string,
  color = T.colorPrimary
): EmailBlock {
  return {
    id,
    type: "text",
    parentId,
    children: [],
    wrapperStyle: {
      placement: { horizontal: "start", vertical: "start" },
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "fill",
      heightMode: "hug",
      border: defaultBorder(),
      borderRadius: defaultBorderRadius(),
    },
    props: {
      textBody: { version: 1, paragraphs: [{ runs: [{ text }] }] },
      ...defaultThemedTextProps(color),
    },
    bindings: {},
  } as unknown as EmailBlock;
}

function demoTextChildMeta(label: string) {
  return { blockType: "content.text", name: label };
}

export const BLOCK_CATALOG_ENTRIES: BlockCatalogEntry[] = [
  {
    masterId: "layout.container",
    blockType: "layout.container",
    runtimeType: "layout",
    name: "布局容器",
    description: "纵向或横向排列子 block，通过 gap 控制间距。",
    buildSampleBlock: (blockId, parentId) => ({
      id: blockId,
      type: "layout",
      parentId,
      children: [],
      wrapperStyle: {
        ...defaultWrapperBase(),
        placement: { horizontal: "start", vertical: "start" },
        contentAlign: { horizontal: "left", vertical: "top" },
        border: defaultBorder(),
        borderRadius: defaultBorderRadius(),
        backgroundColor: T.colorSurface,
        padding: sectionPadding(),
      },
      props: { direction: "vertical", gapMode: "fixed", gap: T.gap },
      bindings: {},
    }) as unknown as EmailBlock,
    buildPreviewChildBlocks: (sampleBlockId) => {
      const ids = ["__demo_layout_text_a__", "__demo_layout_text_b__"] as const;
      const labels = ["示例文案 A", "示例文案 B"] as const;
      const blocks: Record<string, EmailBlock> = {};
      const blockMeta: Record<string, { blockType: string; name: string }> = {};
      ids.forEach((id, i) => {
        blocks[id] = buildDemoTextBlock(
          id,
          sampleBlockId,
          labels[i]!,
          i === 0 ? T.colorPrimary : T.colorSecondary
        );
        blockMeta[id] = demoTextChildMeta(labels[i]!);
      });
      return { blocks, blockMeta, childIds: [...ids] };
    },
  },
  {
    masterId: "layout.grid",
    blockType: "layout.grid",
    runtimeType: "grid",
    name: "栅格",
    description: "多列栅格布局，子项顺序与 columns 一致；单元格宽高在 props 配置。",
    buildSampleBlock: (blockId, parentId) => ({
      id: blockId,
      type: "grid",
      parentId,
      children: [],
      wrapperStyle: {
        ...defaultWrapperBase(),
        placement: { horizontal: "center", vertical: "center" },
        border: defaultBorder(),
        borderRadius: defaultBorderRadius(),
        padding: sectionPadding(),
      },
      props: {
        columns: 2,
        gap: T.gap,
        cellWidthMode: "auto",
        cellHeightMode: "content-max",
      },
      bindings: {},
    }) as unknown as EmailBlock,
    buildPreviewChildBlocks: (sampleBlockId) => {
      const specs = [
        ["__demo_grid_cell_1__", "栅格单元 1"],
        ["__demo_grid_cell_2__", "栅格单元 2"],
        ["__demo_grid_cell_3__", "栅格单元 3"],
        ["__demo_grid_cell_4__", "栅格单元 4"],
      ] as const;
      const blocks: Record<string, EmailBlock> = {};
      const blockMeta: Record<string, { blockType: string; name: string }> = {};
      const childIds: string[] = [];
      for (const [id, label] of specs) {
        blocks[id] = buildDemoTextBlock(id, sampleBlockId, label);
        blockMeta[id] = demoTextChildMeta(label);
        childIds.push(id);
      }
      return { blocks, blockMeta, childIds };
    },
  },
  {
    masterId: "content.text",
    blockType: "content.text",
    runtimeType: "text",
    name: "文本",
    description: "富文本段落，支持字号、颜色与对齐。",
    buildSampleBlock: (blockId, parentId) => ({
      id: blockId,
      type: "text",
      parentId,
      children: [],
      wrapperStyle: {
        placement: { horizontal: "start", vertical: "start" },
        contentAlign: { horizontal: "left", vertical: "top" },
        widthMode: "fill",
        heightMode: "hug",
        border: defaultBorder(),
        borderRadius: defaultBorderRadius(),
      },
      props: {
        textBody: { version: 1, paragraphs: [{ runs: [{ text: "示例正文" }] }] },
        ...defaultThemedTextProps(T.colorPrimary),
      },
      bindings: {},
    }) as unknown as EmailBlock,
  },
  {
    masterId: "content.image",
    blockType: "content.image",
    runtimeType: "image",
    name: "图片",
    description: "图片资源在 wrapperStyle.backgroundImage，叠放子内容的方向与间距沿用 layout 语义。",
    buildSampleBlock: (blockId, parentId) => ({
      id: blockId,
      type: "image",
      parentId,
      children: [],
      wrapperStyle: {
        placement: { horizontal: "start", vertical: "start" },
        contentAlign: { horizontal: "center", vertical: "center" },
        widthMode: "fill",
        heightMode: "hug",
        border: defaultBorder(),
        borderRadius: defaultBorderRadius(),
        backgroundImage: {
          src: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800",
          alt: "图片",
          link: "",
          fit: "cover",
          position: "center",
          borderRadius: { mode: "unified", radius: T.radiusPanel },
          border: defaultBorder(),
        },
      },
      props: { direction: "vertical", gapMode: "fixed", gap: T.gap },
      bindings: {},
    }) as unknown as EmailBlock,
  },
  {
    masterId: "content.icon",
    blockType: "content.icon",
    runtimeType: "icon",
    name: "图标",
    description: "小尺寸图标，src 与跳转链接为内容字段。",
    buildSampleBlock: (blockId, parentId) => ({
      id: blockId,
      type: "icon",
      parentId,
      children: [],
      wrapperStyle: {
        placement: { horizontal: "center", vertical: "center" },
        contentAlign: { horizontal: "center", vertical: "center" },
        widthMode: "hug",
        heightMode: "hug",
        border: defaultBorder(),
        borderRadius: defaultBorderRadius(),
      },
      props: {
        src: "https://cdn.jsdelivr.net/npm/@tabler/icons@3.21.0/icons/outline/photo.svg",
        link: "",
        color: T.colorPrimary,
        size: "20px",
      },
      bindings: {},
    }) as unknown as EmailBlock,
  },
  {
    masterId: "action.button",
    blockType: "action.button",
    runtimeType: "button",
    name: "按钮",
    description: "行动按钮，文案与链接为内容字段，buttonStyle 控制按钮胶囊本体样式。",
    buildSampleBlock: (blockId, parentId) => ({
      id: blockId,
      type: "button",
      parentId,
      children: [],
      wrapperStyle: {
        ...defaultWrapperBase(),
        widthMode: "hug",
        heightMode: "hug",
        placement: { horizontal: "center", vertical: "start" },
        contentAlign: { horizontal: "left", vertical: "top" },
        border: defaultBorder(),
        borderRadius: defaultBorderRadius(),
      },
      props: {
        text: "按钮",
        link: "https://example.com",
        buttonStyle: {
          widthMode: "hug",
          backgroundColor: T.colorSurface,
          textColor: T.colorPrimary,
          fontFamily: T.fontBody,
          fontSize: T.typoBody,
          border: {
            mode: "unified",
            width: "1px",
            style: "solid",
            color: T.colorPrimary,
          },
          borderRadius: ctaBorderRadius(),
          bold: false,
          italic: false,
        },
      },
      bindings: {},
    }) as unknown as EmailBlock,
  },
  {
    masterId: "separator.divider",
    blockType: "separator.divider",
    runtimeType: "divider",
    name: "分割线",
    description: "水平分割线，颜色、粗细与线条本体宽度为样式字段。",
    buildSampleBlock: (blockId, parentId) => ({
      id: blockId,
      type: "divider",
      parentId,
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
        placement: { horizontal: "center", vertical: "center" },
        contentAlign: { horizontal: "left", vertical: "top" },
        padding: sectionPadding(),
      },
      props: { color: T.colorSecondary, lineWidthMode: "fill", height: "2px" },
      bindings: {},
    }) as unknown as EmailBlock,
  },
  {
    masterId: "indicator.progress",
    blockType: "indicator.progress",
    runtimeType: "progress",
    name: "进度条",
    description: "横向进度条；槽/进度色与数值在 props；条带宽度、高度与圆角在 props，外层容器样式在 wrapperStyle。",
    buildSampleBlock: (blockId, parentId) => ({
      id: blockId,
      type: "progress",
      parentId,
      children: [],
      wrapperStyle: {
        ...defaultWrapperBase(),
        placement: { horizontal: "start", vertical: "start" },
        contentAlign: { horizontal: "left", vertical: "top" },
        widthMode: "fill",
        heightMode: "hug",
        border: defaultBorder(),
        borderRadius: { mode: "unified", radius: "0" },
      },
      props: {
        trackColor: T.colorSurface,
        fillColor: T.colorPrimary,
        value: 20,
        max: 100,
        barWidthMode: "fill",
        barHeight: "10px",
        barBorderRadius: ctaBorderRadius(),
      },
      bindings: {},
    }) as unknown as EmailBlock,
  },
];

export function buildCatalogEmailRoot(children: string[]): EmailBlock {
  return {
    id: CATALOG_ROOT_ID,
    type: "emailRoot",
    parentId: null,
    children,
    wrapperStyle: {
      placement: { horizontal: "center" },
      widthMode: "fill",
      heightMode: "hug",
    },
    props: {
      backgroundColor: "#FFFFFF",
      width: EMAIL_ROOT_FIXED_WIDTH,
      padding: { mode: "unified", unified: "0" },
      border: defaultBorder(),
      gapMode: "fixed",
      gap: "0",
    },
    bindings: {},
  } as unknown as EmailBlock;
}

export function buildBlockMasterTemplate(entry: BlockCatalogEntry): Pick<EmailTemplate, "rootBlockId" | "blocks" | "blockMeta"> {
  const sampleBlockId = `__sample_${entry.runtimeType}__`;
  const sample = entry.buildSampleBlock(sampleBlockId, CATALOG_ROOT_ID);
  const blocks: EmailTemplate["blocks"] = { [sampleBlockId]: sample };
  const blockMeta: EmailTemplate["blockMeta"] = {
    [sampleBlockId]: { blockType: entry.blockType, name: entry.name },
  };

  if (entry.buildPreviewChildBlocks) {
    const preview = entry.buildPreviewChildBlocks(sampleBlockId);
    Object.assign(blocks, preview.blocks);
    Object.assign(blockMeta, preview.blockMeta);
    sample.children = preview.childIds;
  }

  const root = buildCatalogEmailRoot([sampleBlockId]);
  return {
    rootBlockId: CATALOG_ROOT_ID,
    blocks: {
      [CATALOG_ROOT_ID]: root,
      ...blocks,
    },
    blockMeta: {
      [CATALOG_ROOT_ID]: { blockType: "layout.container", name: "预览根" },
      ...blockMeta,
    },
  };
}

export { CATALOG_ROOT_ID };
