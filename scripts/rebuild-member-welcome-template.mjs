#!/usr/bin/env node
/**
 * 重建 member-welcome/layouts/card/template.json
 * - 业务槽位与 bindings 语义不变
 * - KAYAK/Hertz 式分段模块 + 根 gap 呼吸感 + 权益双列网格卡片
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../data/emails/member-welcome/layouts/card/template.json");

const BENEFIT_ITEMS = [
  {
    title: "Get points",
    subtitle: "Reward 888 points",
    iconSrc: "https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/star.svg",
  },
  {
    title: "Product discount",
    subtitle: "No threshold",
    iconSrc: "https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/tag.svg",
  },
  {
    title: "Order discounts",
    subtitle: "No threshold",
    iconSrc: "https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/shopping-bag.svg",
  },
  {
    title: "Buy 1 get 1",
    subtitle: "No threshold",
    iconSrc: "https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/gift.svg",
  },
  {
    title: "Free shipping",
    subtitle: "No threshold",
    iconSrc: "https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/truck-delivery.svg",
  },
];

const BENEFIT_ITEM_FIELDS = [
  { key: "title", label: "权益标题", valueType: "string", required: true },
  { key: "subtitle", label: "权益说明", valueType: "string", required: true },
  { key: "iconSrc", label: "图标地址", valueType: "image", required: true },
];

const transparentBorder = {
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
};

const zeroRadius = { mode: "unified", radius: "0" };
const panelRadius = { mode: "unified", radius: themeRef("tokens.radius.panel") };
const PAGE_CANVAS_BG = "#F4F4F5";
const BENEFIT_TILE_BG = "#EEF2FF";
const HERO_IMAGE =
  "https://images.pexels.com/photos/3944406/pexels-photo-3944406.jpeg?auto=compress&cs=tinysrgb&w=800";

function themeRef(tokenPath) {
  return { $themeRef: tokenPath };
}

function themeBinding(tokenPath) {
  return {
    slotId: tokenPath,
    mode: "theme",
    tokenPath,
    fieldKind: "style",
  };
}

function varBinding(slotId, valueType, extra = {}) {
  return {
    slotId,
    mode: "variable",
    valueType,
    allowExternal: true,
    fieldKind: "content",
    ...extra,
  };
}

function shell(overrides = {}) {
  return {
    placement: { horizontal: "start", vertical: "start" },
    widthMode: "fill",
    heightMode: "hug",
    border: transparentBorder,
    borderRadius: zeroRadius,
    contentAlign: { horizontal: "left", vertical: "top" },
    ...overrides,
  };
}

/** 白卡片模块壳：上下 section；左右用 gap 作卡片内留白（与根级 pageInline 分工） */
function surfaceModuleShell(extra = {}) {
  return shell({
    backgroundColor: themeRef("colors.surface"),
    borderRadius: panelRadius,
    border: { mode: "unified", width: "1px", style: "solid", color: "#E8E8ED" },
    padding: {
      mode: "separate",
      top: themeRef("tokens.spacing.section"),
      right: themeRef("tokens.spacing.gap"),
      bottom: themeRef("tokens.spacing.section"),
      left: themeRef("tokens.spacing.gap"),
    },
    ...extra,
  });
}

function surfaceModuleBindings() {
  return {
    "wrapperStyle.backgroundColor": themeBinding("colors.surface"),
    "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
    "wrapperStyle.padding.top": themeBinding("tokens.spacing.section"),
    "wrapperStyle.padding.bottom": themeBinding("tokens.spacing.section"),
    "wrapperStyle.padding.left": themeBinding("tokens.spacing.gap"),
    "wrapperStyle.padding.right": themeBinding("tokens.spacing.gap"),
  };
}

function collectionBinding(slotPath, description) {
  return {
    slotId: "memberBenefits",
    mode: "variable",
    valueType: "collection",
    allowExternal: true,
    fieldKind: "content",
    slotPath,
    label: "会员权益列表",
    description,
    itemFields: BENEFIT_ITEM_FIELDS,
    minItems: 5,
    maxItems: 5,
    defaultValue: BENEFIT_ITEMS,
  };
}

const template = {
  schemaVersion: "3.0.0",
  emailId: "member_welcome",
  templateId: "member_welcome",
  templateVersion: 1,
  locale: "en-US",
  rootBlockId: "mw-root",
  blockMeta: {
    "mw-root": { blockType: "layout.container", name: "画布根节点" },
    "mw-brand": { blockType: "layout.container", name: "模块 · 顶栏品牌" },
    "mw-brand-row": { blockType: "layout.container", name: "品牌行" },
    "mw-member-tag": { blockType: "content.text", name: "会员标签" },
    "mw-logo-img": { blockType: "content.image", name: "店铺图形标" },
    "mw-logo-wordmark": { blockType: "content.text", name: "店铺字标" },
    "mw-hero": { blockType: "layout.container", name: "模块 · 主视觉" },
    "mw-hero-headline": { blockType: "content.text", name: "欢迎副标题" },
    "mw-intro": { blockType: "layout.container", name: "模块 · 问候" },
    "mw-greeting": { blockType: "content.text", name: "会员问候" },
    "mw-benefits": { blockType: "layout.container", name: "模块 · 权益区" },
    "mw-benefits-title": { blockType: "content.text", name: "权益区标题" },
    "mw-benefits-grid": { blockType: "layout.grid", name: "权益双列网格" },
    "mw-benefit-row": { blockType: "layout.container", name: "权益卡片（模板）" },
    "mw-benefit-icon": { blockType: "content.icon", name: "权益图标" },
    "mw-benefit-copy": { blockType: "layout.container", name: "权益文案栈" },
    "mw-benefit-title": { blockType: "content.text", name: "权益标题" },
    "mw-benefit-sub": { blockType: "content.text", name: "权益说明" },
    "mw-account": { blockType: "layout.container", name: "模块 · 账户说明" },
    "mw-account-stack": { blockType: "layout.container", name: "账户说明栈" },
    "mw-account-1": { blockType: "content.text", name: "账户说明 1" },
    "mw-account-2": { blockType: "content.text", name: "账户说明 2" },
    "mw-account-3": { blockType: "content.text", name: "联系说明" },
  },
  blocks: {
    "mw-root": {
      id: "mw-root",
      type: "emailRoot",
      parentId: null,
      children: ["mw-brand", "mw-hero", "mw-intro", "mw-benefits", "mw-account"],
      wrapperStyle: {
        placement: { horizontal: "center", vertical: "start" },
        widthMode: "fill",
        heightMode: "hug",
      },
      props: {
        backgroundColor: PAGE_CANVAS_BG,
        width: "600px",
        padding: {
          mode: "separate",
          top: themeRef("tokens.spacing.section"),
          right: themeRef("tokens.spacing.pageInline"),
          bottom: themeRef("tokens.spacing.section"),
          left: themeRef("tokens.spacing.pageInline"),
        },
        border: transparentBorder,
        gapMode: "fixed",
        gap: themeRef("tokens.spacing.gap"),
      },
      bindings: {
        "props.gap": themeBinding("tokens.spacing.gap"),
        "props.padding.top": themeBinding("tokens.spacing.section"),
        "props.padding.bottom": themeBinding("tokens.spacing.section"),
        "props.padding.left": themeBinding("tokens.spacing.pageInline"),
        "props.padding.right": themeBinding("tokens.spacing.pageInline"),
      },
    },

    "mw-brand": {
      id: "mw-brand",
      type: "layout",
      parentId: "mw-root",
      children: ["mw-brand-row", "mw-member-tag"],
      wrapperStyle: shell({
        placement: { horizontal: "start", vertical: "start" },
        contentAlign: { horizontal: "left", vertical: "top" },
        backgroundColor: PAGE_CANVAS_BG,
        padding: {
          mode: "separate",
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      }),
      props: { direction: "vertical", gapMode: "fixed", gap: "12px" },
      bindings: {},
    },

    "mw-brand-row": {
      id: "mw-brand-row",
      type: "layout",
      parentId: "mw-brand",
      children: ["mw-logo-img", "mw-logo-wordmark"],
      wrapperStyle: shell({
        contentAlign: { horizontal: "center", vertical: "center" },
      }),
      props: { direction: "horizontal", gapMode: "fixed", gap: themeRef("tokens.spacing.gap") },
      bindings: { "props.gap": themeBinding("tokens.spacing.gap") },
    },

    "mw-member-tag": {
      id: "mw-member-tag",
      type: "text",
      parentId: "mw-brand",
      children: [],
      wrapperStyle: shell({
        contentAlign: { horizontal: "center", vertical: "top" },
      }),
      props: {
        content: "<p>MEMBER EXCLUSIVE</p>",
        textBody: {
          version: 1,
          paragraphs: [{ runs: [{ text: "MEMBER EXCLUSIVE", bold: true }] }],
        },
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.caption"),
        color: themeRef("colors.secondary"),
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.caption"),
        "props.color": themeBinding("colors.secondary"),
      },
    },

    "mw-logo-img": {
      id: "mw-logo-img",
      type: "image",
      parentId: "mw-brand-row",
      children: [],
      wrapperStyle: shell({
        widthMode: "fixed",
        width: "44px",
        heightMode: "fixed",
        height: "44px",
        placement: { horizontal: "start", vertical: "center" },
        borderRadius: { mode: "unified", radius: themeRef("tokens.radius.cta") },
        contentAlign: { horizontal: "center", vertical: "center" },
        backgroundImage: {
          src: "https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/store.svg",
          alt: "商店标识",
          link: "",
          fit: "contain",
          position: "center",
          borderRadius: { mode: "unified", radius: themeRef("tokens.radius.cta") },
          border: transparentBorder,
        },
      }),
      props: {},
      bindings: {
        "wrapperStyle.backgroundImage.src": varBinding("storeLogoSrc", "image", {
          defaultValue: "https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/store.svg",
          label: "店铺 Logo 地址",
          description: "与字标并排展示的店铺图形标识；建议使用正方形透明底 PNG。",
        }),
        "wrapperStyle.backgroundImage.alt": varBinding("storeLogoAlt", "string", {
          defaultValue: "商店标识",
          label: "店铺 Logo 替代文字",
        }),
        "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
        "wrapperStyle.backgroundImage.borderRadius.radius": themeBinding("tokens.radius.cta"),
      },
    },

    "mw-logo-wordmark": {
      id: "mw-logo-wordmark",
      type: "text",
      parentId: "mw-brand-row",
      children: [],
      wrapperStyle: shell({
        widthMode: "hug",
        heightMode: "hug",
        placement: { horizontal: "start", vertical: "center" },
        contentAlign: { horizontal: "left", vertical: "center" },
      }),
      props: {
        content: "<p>zyzshop1</p>",
        textBody: { version: 1, paragraphs: [{ runs: [{ text: "zyzshop1", bold: true }] }] },
        fontFamily: themeRef("fonts.heading"),
        fontSize: themeRef("tokens.typography.h1"),
        color: themeRef("colors.primary"),
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": varBinding("storeName", "string", {
          defaultValue: "zyzshop1",
          label: "店铺字标",
          description: "与图形标并排展示的品牌名，与正文中的店铺名称共用同一变量。",
        }),
        "props.fontFamily": themeBinding("fonts.heading"),
        "props.fontSize": themeBinding("tokens.typography.h1"),
        "props.color": themeBinding("colors.primary"),
      },
    },

    "mw-hero": {
      id: "mw-hero",
      type: "layout",
      parentId: "mw-root",
      children: ["mw-hero-headline"],
      wrapperStyle: shell({
        heightMode: "fixed",
        height: "260px",
        borderRadius: panelRadius,
        backgroundColor: themeRef("colors.primary"),
        padding: { mode: "unified", unified: "0" },
        backgroundImage: {
          src: HERO_IMAGE,
          alt: "Shopping and member perks",
          link: "",
          fit: "cover",
          position: "center",
          borderRadius: panelRadius,
          border: transparentBorder,
        },
        contentAlign: { horizontal: "center", vertical: "center" },
      }),
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {
        "wrapperStyle.backgroundColor": themeBinding("colors.primary"),
        "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
        "wrapperStyle.backgroundImage.src": varBinding("heroWelcomeImageSrc", "image", {
          defaultValue: HERO_IMAGE,
          label: "欢迎头图地址",
          description: "圆角主视觉底图；请换图后自测叠字可读性。建议宽 800px 以上横幅。",
        }),
        "wrapperStyle.backgroundImage.alt": varBinding("heroWelcomeImageAlt", "string", {
          defaultValue: "Shopping and member perks",
          label: "欢迎头图替代文字",
        }),
        "wrapperStyle.backgroundImage.borderRadius.radius": themeBinding("tokens.radius.panel"),
      },
    },

    "mw-hero-headline": {
      id: "mw-hero-headline",
      type: "text",
      parentId: "mw-hero",
      children: [],
      wrapperStyle: shell({
        placement: { horizontal: "center", vertical: "center" },
        contentAlign: { horizontal: "center", vertical: "center" },
        widthMode: "fill",
        padding: {
          mode: "separate",
          top: "28px",
          right: "24px",
          bottom: "28px",
          left: "24px",
        },
      }),
      props: {
        content: "<p>Enjoy various benefits!</p>",
        textBody: { version: 1, paragraphs: [{ runs: [{ text: "Enjoy various benefits!" }] }] },
        fontFamily: themeRef("fonts.heading"),
        fontSize: themeRef("tokens.typography.display"),
        color: "#FFFFFF",
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": varBinding("heroSubtitle", "string", {
          defaultValue: "Enjoy various benefits!",
          label: "欢迎副标题",
        }),
        "props.fontFamily": themeBinding("fonts.heading"),
        "props.fontSize": themeBinding("tokens.typography.display"),
      },
    },

    "mw-intro": {
      id: "mw-intro",
      type: "layout",
      parentId: "mw-root",
      children: ["mw-greeting"],
      wrapperStyle: surfaceModuleShell(),
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: surfaceModuleBindings(),
    },

    "mw-greeting": {
      id: "mw-greeting",
      type: "text",
      parentId: "mw-intro",
      children: [],
      wrapperStyle: shell(),
      props: {
        content:
          "<p>Hi {{ memberName }}, we're excited to provide you with more exclusive member services and savings:</p>",
        textBody: {
          version: 1,
          paragraphs: [
            {
              runs: [
                {
                  text: "Hi {{ memberName }}, we're excited to provide you with more exclusive member services and savings:",
                },
              ],
            },
          ],
        },
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.body"),
        color: themeRef("colors.primary"),
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: "greetingLine",
          mode: "interpolate",
          fieldKind: "content",
          label: "问候语",
          interpolationSlots: [
            {
              slotId: "memberName",
              valueType: "string",
              defaultValue: "Member Name",
              allowExternal: true,
              label: "会员姓名",
              description: "问候语中插入的会员姓名。",
            },
          ],
        },
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.body"),
        "props.color": themeBinding("colors.primary"),
      },
    },

    "mw-benefits": {
      id: "mw-benefits",
      type: "layout",
      parentId: "mw-root",
      children: ["mw-benefits-title", "mw-benefits-grid"],
      wrapperStyle: surfaceModuleShell(),
      props: { direction: "vertical", gapMode: "fixed", gap: themeRef("tokens.spacing.gap") },
      bindings: {
        ...surfaceModuleBindings(),
        "props.gap": themeBinding("tokens.spacing.gap"),
      },
    },

    "mw-benefits-title": {
      id: "mw-benefits-title",
      type: "text",
      parentId: "mw-benefits",
      children: [],
      wrapperStyle: shell(),
      props: {
        content: "<p>Your benefits:</p>",
        textBody: { version: 1, paragraphs: [{ runs: [{ text: "Your benefits:", bold: true }] }] },
        fontFamily: themeRef("fonts.heading"),
        fontSize: themeRef("tokens.typography.h1"),
        color: themeRef("colors.primary"),
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.fontFamily": themeBinding("fonts.heading"),
        "props.fontSize": themeBinding("tokens.typography.h1"),
        "props.color": themeBinding("colors.primary"),
      },
    },

    "mw-benefits-grid": {
      id: "mw-benefits-grid",
      type: "grid",
      parentId: "mw-benefits",
      children: ["mw-benefit-row"],
      repeat: {
        mode: "collection",
        slotId: "memberBenefits",
        prototypeChildIds: ["mw-benefit-row"],
        fallbackChildIds: ["mw-benefit-row"],
        itemFields: BENEFIT_ITEM_FIELDS,
        minItems: 5,
        maxItems: 5,
        label: "会员权益列表",
        description: "双列网格展示权益卡片，固定 5 项。",
      },
      wrapperStyle: shell({
        padding: { mode: "separate", top: "8px", right: "0", bottom: "0", left: "0" },
      }),
      props: {
        columns: 2,
        gap: themeRef("tokens.spacing.gap"),
        cellWidthMode: "auto",
        cellHeightMode: "content-max",
      },
      bindings: { "props.gap": themeBinding("tokens.spacing.gap") },
    },

    "mw-benefit-row": {
      id: "mw-benefit-row",
      type: "layout",
      parentId: "mw-benefits-grid",
      children: ["mw-benefit-icon", "mw-benefit-copy"],
      wrapperStyle: shell({
        backgroundColor: BENEFIT_TILE_BG,
        borderRadius: { mode: "unified", radius: themeRef("tokens.radius.cta") },
        padding: {
          mode: "separate",
          top: "20px",
          right: "16px",
          bottom: "20px",
          left: "16px",
        },
        contentAlign: { horizontal: "center", vertical: "top" },
        heightMode: "fill",
      }),
      props: { direction: "vertical", gapMode: "fixed", gap: "12px" },
      bindings: {
        "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
      },
    },

    "mw-benefit-icon": {
      id: "mw-benefit-icon",
      type: "icon",
      parentId: "mw-benefit-row",
      children: [],
      wrapperStyle: shell({
        placement: { horizontal: "center", vertical: "start" },
        contentAlign: { horizontal: "center", vertical: "center" },
        widthMode: "fixed",
        width: "52px",
        heightMode: "fixed",
        height: "52px",
        backgroundColor: themeRef("colors.secondary"),
        borderRadius: { mode: "unified", radius: themeRef("tokens.radius.cta") },
      }),
      props: {
        color: themeRef("colors.surface"),
        size: "24px",
        link: "",
        src: BENEFIT_ITEMS[0].iconSrc,
      },
      bindings: {
        "props.src": collectionBinding("0.iconSrc", "驱动权益区图标、标题与说明文案，固定 5 项。"),
        "wrapperStyle.backgroundColor": themeBinding("colors.secondary"),
        "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
        "props.color": themeBinding("colors.surface"),
      },
    },

    "mw-benefit-copy": {
      id: "mw-benefit-copy",
      type: "layout",
      parentId: "mw-benefit-row",
      children: ["mw-benefit-title", "mw-benefit-sub"],
      wrapperStyle: shell({
        contentAlign: { horizontal: "center", vertical: "top" },
      }),
      props: { direction: "vertical", gapMode: "fixed", gap: "6px" },
      bindings: {},
    },

    "mw-benefit-title": {
      id: "mw-benefit-title",
      type: "text",
      parentId: "mw-benefit-copy",
      children: [],
      wrapperStyle: shell({ contentAlign: { horizontal: "center", vertical: "top" } }),
      props: {
        content: "<p>Get points</p>",
        textBody: { version: 1, paragraphs: [{ runs: [{ text: "Get points", bold: true }] }] },
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.body"),
        color: themeRef("colors.primary"),
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": collectionBinding("0.title", "权益标题"),
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.body"),
        "props.color": themeBinding("colors.primary"),
      },
    },

    "mw-benefit-sub": {
      id: "mw-benefit-sub",
      type: "text",
      parentId: "mw-benefit-copy",
      children: [],
      wrapperStyle: shell({ contentAlign: { horizontal: "center", vertical: "top" } }),
      props: {
        content: "<p>Reward 888 points</p>",
        textBody: { version: 1, paragraphs: [{ runs: [{ text: "Reward 888 points" }] }] },
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.caption"),
        color: themeRef("colors.secondary"),
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": collectionBinding("0.subtitle", "权益说明"),
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.caption"),
        "props.color": themeBinding("colors.secondary"),
      },
    },

    "mw-account": {
      id: "mw-account",
      type: "layout",
      parentId: "mw-root",
      children: ["mw-account-stack"],
      wrapperStyle: surfaceModuleShell({
        backgroundColor: "#FAFAFA",
        border: transparentBorder,
      }),
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {
        "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
        "wrapperStyle.padding.top": themeBinding("tokens.spacing.section"),
        "wrapperStyle.padding.bottom": themeBinding("tokens.spacing.section"),
        "wrapperStyle.padding.left": themeBinding("tokens.spacing.gap"),
        "wrapperStyle.padding.right": themeBinding("tokens.spacing.gap"),
      },
    },

    "mw-account-stack": {
      id: "mw-account-stack",
      type: "layout",
      parentId: "mw-account",
      children: ["mw-account-1", "mw-account-2", "mw-account-3"],
      wrapperStyle: shell(),
      props: { direction: "vertical", gapMode: "fixed", gap: themeRef("tokens.spacing.gap") },
      bindings: { "props.gap": themeBinding("tokens.spacing.gap") },
    },

    "mw-account-1": {
      id: "mw-account-1",
      type: "text",
      parentId: "mw-account-stack",
      children: [],
      wrapperStyle: shell(),
      props: {
        content:
          "<p>You need to log into your store account to enjoy member services and savings. I don't have an account. <a href=\"https://example.com/register\">Create an account</a></p>",
        textBody: {
          version: 1,
          paragraphs: [
            {
              runs: [
                {
                  text: "You need to log into your store account to enjoy member services and savings. I don't have an account. ",
                },
                {
                  text: "Create an account",
                  link: "https://example.com/register",
                  decoration: "underline",
                },
              ],
            },
          ],
        },
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.body"),
        color: themeRef("colors.primary"),
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.1.link": varBinding("createAccountUrl", "url", {
          defaultValue: "https://example.com/register",
          label: "注册账户链接",
        }),
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.body"),
        "props.color": themeBinding("colors.primary"),
      },
    },

    "mw-account-2": {
      id: "mw-account-2",
      type: "text",
      parentId: "mw-account-stack",
      children: [],
      wrapperStyle: shell(),
      props: {
        content:
          "<p>If you agree to join the membership during Checkout, we have created an account for you. <a href=\"https://example.com/reset-password\">Reset password</a></p>",
        textBody: {
          version: 1,
          paragraphs: [
            {
              runs: [
                {
                  text: "If you agree to join the membership during Checkout, we have created an account for you. ",
                },
                {
                  text: "Reset password",
                  link: "https://example.com/reset-password",
                  decoration: "underline",
                },
              ],
            },
          ],
        },
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.body"),
        color: themeRef("colors.primary"),
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.1.link": varBinding("resetPasswordUrl", "url", {
          defaultValue: "https://example.com/reset-password",
          label: "重置密码链接",
        }),
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.body"),
        "props.color": themeBinding("colors.primary"),
      },
    },

    "mw-account-3": {
      id: "mw-account-3",
      type: "text",
      parentId: "mw-account-stack",
      children: [],
      wrapperStyle: shell(),
      props: {
        content:
          "<p>We are committed to making your experience enjoyable. For questions or feedback, please contact the <a href=\"https://example.com/store\">zyzshop1</a> Team at <a href=\"mailto:lintingting516@gmail.com\">lintingting516@gmail.com</a></p>",
        textBody: {
          version: 1,
          paragraphs: [
            {
              runs: [
                {
                  text: "We are committed to making your experience enjoyable. For questions or feedback, please contact the ",
                },
                { text: "zyzshop1", link: "https://example.com/store", decoration: "underline" },
                { text: " Team at " },
                {
                  text: "lintingting516@gmail.com",
                  link: "mailto:lintingting516@gmail.com",
                  decoration: "underline",
                },
              ],
            },
          ],
        },
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.caption"),
        color: themeRef("colors.secondary"),
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.1.text": varBinding("storeName", "string", {
          defaultValue: "zyzshop1",
          label: "店铺名称",
        }),
        "props.textBody.paragraphs.0.runs.1.link": varBinding("storeUrl", "url", {
          defaultValue: "https://example.com/store",
          label: "店铺链接",
        }),
        "props.textBody.paragraphs.0.runs.3.text": varBinding("supportEmail", "string", {
          defaultValue: "lintingting516@gmail.com",
          label: "客服邮箱",
        }),
        "props.textBody.paragraphs.0.runs.3.link": varBinding("supportEmailMailto", "url", {
          defaultValue: "mailto:lintingting516@gmail.com",
          label: "客服邮箱 mailto 链接",
        }),
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.caption"),
        "props.color": themeBinding("colors.secondary"),
      },
    },
  },
};

fs.writeFileSync(OUT, `${JSON.stringify(template, null, 2)}\n`, "utf8");
console.log("已写入", OUT);
console.log("区块数:", Object.keys(template.blocks).length);
