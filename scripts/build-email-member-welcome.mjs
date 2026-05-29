#!/usr/bin/env node

import { contentAlignFromAxes, axesAlignRecord } from "./lib/content-align-axis.mjs";
/**
 * 生成「会员欢迎」学习模板到 data/emails/member-welcome/
 * 按配置母版：模块壳 + tokenPresets 标准 12 键 + payload 变量。
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "./lib/token-preset-standard-order.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "emails", "member-welcome");
const PREFIX = "mw";

const TABLER = (name) =>
  `https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/${name}.svg`;
const LUCIDE = (name) =>
  `https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/${name}.svg`;
const PEX = (id, w = 400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const STORE_LOGO_SRC = TABLER("building-store");
/** 欢迎主视觉头图（珊瑚/促销氛围占位，可经 payload.heroWelcomeImageSrc 替换） */
const HERO_WELCOME_SRC = PEX(7688336, 800);

const BENEFITS = [
  {
    title: "Get points",
    subtitle: "Reward 888 points",
    icon: TABLER("star"),
    iconColor: "#F5B301",
  },
  {
    title: "Product discount",
    subtitle: "No threshold",
    icon: TABLER("tag"),
    iconColor: "#FFFFFF",
  },
  {
    title: "Order discounts",
    subtitle: "No threshold",
    icon: TABLER("shopping-bag"),
    iconColor: "#FFFFFF",
  },
  {
    title: "Buy 1 get 1",
    subtitle: "No threshold",
    icon: LUCIDE("gift"),
    iconColor: "#FFFFFF",
  },
  {
    title: "Free shipping",
    subtitle: "No threshold",
    icon: TABLER("truck-delivery"),
    iconColor: "#FFFFFF",
  },
];

const border0 = () => ({
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
});

const radius0 = () => ({ mode: "unified", radius: "0" });

const themeRef = (path) => ({ $themeRef: path });

const themeBinding = (path) => ({
  slotId: path,
  mode: "theme",
  tokenPath: path,
  fieldKind: "style",
});

const padSectionInline = () => ({
  mode: "separate",
  top: themeRef("tokens.spacing.section"),
  right: themeRef("tokens.spacing.pageInline"),
  bottom: themeRef("tokens.spacing.section"),
  left: themeRef("tokens.spacing.pageInline"),
});

const padBindings = () => ({
  "wrapperStyle.padding.top": themeBinding("tokens.spacing.section"),
  "wrapperStyle.padding.bottom": themeBinding("tokens.spacing.section"),
  "wrapperStyle.padding.left": themeBinding("tokens.spacing.pageInline"),
  "wrapperStyle.padding.right": themeBinding("tokens.spacing.pageInline"),
});

const modShellBindings = () => ({
  "wrapperStyle.backgroundColor": themeBinding("colors.surface"),
  ...padBindings(),
  "props.gap": themeBinding("tokens.spacing.gap"),
});

const wsBase = (extra = {}) => ({
  contentAlign: contentAlignFromAxes("start", "start"),
  contentAlign: { horizontal: "left", vertical: "top" },
  widthMode: "fill",
  heightMode: "hug",
  border: border0(),
  borderRadius: radius0(),
  ...extra,
});

const textBodyRuns = (runs) => ({
  paragraphs: [{ runs }],
});

const snapshotFromRuns = (runs) => {
  const inner = runs
    .map((r) => {
      if (r.link) return `<a href="${r.link}">${r.text}</a>`;
      return r.text;
    })
    .join("");
  return `<p>${inner}</p>`;
};

function build() {
  const blockMeta = {};
  const blocks = {};
  const reg = (id, blockType, name, block) => {
    blockMeta[id] = { blockType, name };
    blocks[id] = block;
  };

  const ROOT_ID = `${PREFIX}-root`;
  const modIds = [];

  const addMod = (modId, title, innerIds, extraWs = {}, extraBindings = {}) => {
    modIds.push(modId);
    reg(modId, "layout.container", title, {
      id: modId,
      type: "layout",
      parentId: ROOT_ID,
      children: innerIds,
      wrapperStyle: wsBase({
        backgroundColor: themeRef("colors.surface"),
        padding: padSectionInline(),
        ...extraWs,
      }),
      props: {
        direction: "vertical",
        gapMode: "fixed",
        gap: themeRef("tokens.spacing.gap"),
      },
      bindings: { ...modShellBindings(), ...extraBindings },
    });
  };

  // --- 模块 · 店铺 Logo ---
  const modLogo = `${PREFIX}-mod-logo`;
  const logoRow = `${PREFIX}-logo-row`;
  const logoImg = `${PREFIX}-logo-img`;
  addMod(modLogo, "模块 · 店铺 Logo", [logoRow]);

  reg(logoRow, "layout.container", "Logo 居中行", {
    id: logoRow,
    type: "layout",
    parentId: modLogo,
    children: [logoImg],
    wrapperStyle: wsBase({
      contentAlign: contentAlignFromAxes("center", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
    }),
    props: { direction: "horizontal", gapMode: "fixed", gap: "0" },
    bindings: {},
  });

  reg(logoImg, "content.image", "店铺 Logo", {
    id: logoImg,
    type: "image",
    parentId: logoRow,
    children: [],
    wrapperStyle: {
      contentAlign: contentAlignFromAxes("center", "center"),
      contentAlign: { horizontal: "center", vertical: "center" },
      widthMode: "fixed",
      width: "140px",
      heightMode: "fixed",
      height: "48px",
      border: border0(),
      borderRadius: radius0(),
      backgroundImage: {
        src: STORE_LOGO_SRC,
        alt: "Store logo",
        link: "",
        fit: "contain",
        position: "center",
        borderRadius: radius0(),
        border: border0(),
      },
    },
    props: {},
    bindings: {
      "wrapperStyle.backgroundImage.src": {
        slotId: "storeLogoSrc",
        mode: "variable",
        valueType: "image",
        defaultValue: STORE_LOGO_SRC,
        allowExternal: true,
        fieldKind: "content",
        label: "店铺 Logo 地址",
        description: "邮件顶部居中展示的店铺标识图。",
      },
      "wrapperStyle.backgroundImage.alt": {
        slotId: "storeLogoAlt",
        mode: "variable",
        valueType: "string",
        defaultValue: "Store logo",
        allowExternal: true,
        fieldKind: "content",
        label: "店铺 Logo 替代文字",
      },
    },
  });

  // --- 模块 · 欢迎主视觉（头图 + 副标题文案）---
  const modHero = `${PREFIX}-mod-hero`;
  const heroImg = `${PREFIX}-hero-img`;
  const heroSub = `${PREFIX}-hero-sub`;
  addMod(modHero, "模块 · 欢迎主视觉", [heroImg, heroSub]);

  reg(heroImg, "content.image", "欢迎头图", {
    id: heroImg,
    type: "image",
    parentId: modHero,
    children: [],
    wrapperStyle: {
      contentAlign: contentAlignFromAxes("center", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
      widthMode: "fill",
      heightMode: "fixed",
      height: "220px",
      border: border0(),
      borderRadius: {
        mode: "unified",
        radius: themeRef("tokens.radius.panel"),
      },
      backgroundImage: {
        src: HERO_WELCOME_SRC,
        alt: "Welcome",
        link: "",
        fit: "cover",
        position: "center",
        borderRadius: {
          mode: "unified",
          radius: themeRef("tokens.radius.panel"),
        },
        border: border0(),
      },
    },
    props: {},
    bindings: {
      "wrapperStyle.backgroundImage.src": {
        slotId: "heroWelcomeImageSrc",
        mode: "variable",
        valueType: "image",
        defaultValue: HERO_WELCOME_SRC,
        allowExternal: true,
        fieldKind: "content",
        label: "欢迎头图地址",
        description: "欢迎主视觉横幅图（含 WELCOME 等画面，建议宽 600px 比例横幅）。",
      },
      "wrapperStyle.backgroundImage.alt": {
        slotId: "heroWelcomeImageAlt",
        mode: "variable",
        valueType: "string",
        defaultValue: "Welcome",
        allowExternal: true,
        fieldKind: "content",
        label: "欢迎头图替代文字",
      },
      "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
      "wrapperStyle.backgroundImage.borderRadius.radius": themeBinding("tokens.radius.panel"),
    },
  });

  reg(heroSub, "content.text", "欢迎副标题", {
    id: heroSub,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({
      contentAlign: { horizontal: "center", vertical: "top" },
    }),
    props: {
      content: "<p>Enjoy various benefits!</p>",
      textBody: textBodyRuns([{ text: "Enjoy various benefits!" }]),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "heroSubtitle",
        mode: "variable",
        valueType: "string",
        defaultValue: "Enjoy various benefits!",
        allowExternal: true,
        fieldKind: "content",
        label: "欢迎副标题",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  // --- 模块 · 问候语 ---
  const modGreeting = `${PREFIX}-mod-greeting`;
  const greetingText = `${PREFIX}-greeting-text`;
  addMod(modGreeting, "模块 · 问候语", [greetingText]);

  reg(greetingText, "content.text", "会员问候", {
    id: greetingText,
    type: "text",
    parentId: modGreeting,
    children: [],
    wrapperStyle: wsBase({
      contentAlign: { horizontal: "center", vertical: "top" },
    }),
    props: {
      content:
        "<p>Hi Member Name, we're excited to provide you with more exclusive member services and savings:</p>",
      textBody: textBodyRuns([
        {
          text: "Hi Member Name, we're excited to provide you with more exclusive member services and savings:",
        },
      ]),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "greetingText",
        mode: "variable",
        valueType: "string",
        defaultValue:
          "Hi Member Name, we're excited to provide you with more exclusive member services and savings:",
        allowExternal: true,
        fieldKind: "content",
        label: "问候正文",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  // --- 模块 · 会员权益 ---
  const modBenefits = `${PREFIX}-mod-benefits`;
  const benefitsTitle = `${PREFIX}-benefits-title`;
  const benefitRowIds = [];

  reg(benefitsTitle, "content.text", "权益区标题", {
    id: benefitsTitle,
    type: "text",
    parentId: modBenefits,
    children: [],
    wrapperStyle: wsBase({
      contentAlign: { horizontal: "center", vertical: "top" },
    }),
    props: {
      content: "<p>Your benefits:</p>",
      textBody: textBodyRuns([{ text: "Your benefits:", bold: true }]),
      fontSize: themeRef("tokens.typography.h1"),
      color: themeRef("colors.primary"),
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.fontSize": themeBinding("tokens.typography.h1"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  BENEFITS.forEach((item, i) => {
    const n = i + 1;
    const rowId = `${PREFIX}-benefit-row-${n}`;
    const iconWrapId = `${PREFIX}-benefit-icon-wrap-${n}`;
    const iconId = `${PREFIX}-benefit-icon-${n}`;
    const textColId = `${PREFIX}-benefit-text-col-${n}`;
    const titleId = `${PREFIX}-benefit-title-${n}`;
    const subId = `${PREFIX}-benefit-sub-${n}`;
    benefitRowIds.push(rowId);

    reg(rowId, "layout.container", `权益行 ${n}`, {
      id: rowId,
      type: "layout",
      parentId: modBenefits,
      children: [iconWrapId, textColId],
      wrapperStyle: wsBase({
        contentAlign: contentAlignFromAxes("start", "start"),
        contentAlign: { horizontal: "left", vertical: "top" },
      }),
      props: { direction: "horizontal", gapMode: "fixed", gap: themeRef("tokens.spacing.gap") },
      bindings: {
        "props.gap": themeBinding("tokens.spacing.gap"),
      },
    });

    reg(iconWrapId, "layout.container", `权益图标底 ${n}`, {
      id: iconWrapId,
      type: "layout",
      parentId: rowId,
      children: [iconId],
      wrapperStyle: {
        contentAlign: contentAlignFromAxes("start", "center"),
        contentAlign: { horizontal: "center", vertical: "center" },
        widthMode: "fixed",
        width: "48px",
        heightMode: "fixed",
        height: "48px",
        border: border0(),
        borderRadius: {
          mode: "unified",
          radius: themeRef("tokens.radius.cta"),
        },
        backgroundColor: "#1F2937",
        padding: { mode: "unified", unified: "0" },
      },
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {
        "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
      },
    });

    reg(iconId, "content.icon", `权益图标 ${n}`, {
      id: iconId,
      type: "icon",
      parentId: iconWrapId,
      children: [],
      wrapperStyle: {
        contentAlign: contentAlignFromAxes("center", "center"),
        contentAlign: { horizontal: "center", vertical: "center" },
        widthMode: "hug",
        heightMode: "hug",
        border: border0(),
        borderRadius: radius0(),
      },
      props: {
        src: item.icon,
        color: item.iconColor,
        size: "22px",
        link: "",
      },
      bindings: {
        "props.src": {
          slotId: "memberBenefits",
          mode: "variable",
          valueType: "collection",
          defaultValue: BENEFITS.map((b) => ({
            title: b.title,
            subtitle: b.subtitle,
            iconSrc: b.icon,
          })),
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.iconSrc`,
          ...(i === 0
            ? {
                label: "会员权益列表",
                description: "驱动权益区图标、标题与说明文案，固定 5 项。",
                itemFields: [
                  { key: "title", label: "权益标题", valueType: "string", required: true },
                  { key: "subtitle", label: "权益说明", valueType: "string", required: true },
                  { key: "iconSrc", label: "图标地址", valueType: "image", required: true },
                ],
                minItems: 5,
                maxItems: 5,
              }
            : {}),
        },
      },
    });

    reg(textColId, "layout.container", `权益文案列 ${n}`, {
      id: textColId,
      type: "layout",
      parentId: rowId,
      children: [titleId, subId],
      wrapperStyle: wsBase({
        widthMode: "fill",
        contentAlign: contentAlignFromAxes("start", "center"),
      }),
      props: { direction: "vertical", gapMode: "fixed", gap: "4px" },
      bindings: {},
    });

    reg(titleId, "content.text", `权益标题 ${n}`, {
      id: titleId,
      type: "text",
      parentId: textColId,
      children: [],
      wrapperStyle: wsBase({
        contentAlign: { horizontal: "left", vertical: "top" },
      }),
      props: {
        content: `<p>${item.title}</p>`,
        textBody: textBodyRuns([{ text: item.title }]),
        fontSize: themeRef("tokens.typography.body"),
        color: themeRef("colors.primary"),
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: "memberBenefits",
          mode: "variable",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.title`,
        },
        "props.fontSize": themeBinding("tokens.typography.body"),
        "props.color": themeBinding("colors.primary"),
      },
    });

    reg(subId, "content.text", `权益说明 ${n}`, {
      id: subId,
      type: "text",
      parentId: textColId,
      children: [],
      wrapperStyle: wsBase({
        contentAlign: { horizontal: "left", vertical: "top" },
      }),
      props: {
        content: `<p>${item.subtitle}</p>`,
        textBody: textBodyRuns([{ text: item.subtitle }]),
        fontSize: themeRef("tokens.typography.caption"),
        color: themeRef("colors.secondary"),
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: "memberBenefits",
          mode: "variable",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.subtitle`,
        },
        "props.fontSize": themeBinding("tokens.typography.caption"),
        "props.color": themeBinding("colors.secondary"),
      },
    });
  });

  addMod(modBenefits, "模块 · 会员权益", [benefitsTitle, ...benefitRowIds]);

  // --- 模块 · 账户说明 ---
  const modAccount = `${PREFIX}-mod-account`;
  const accountPara1 = `${PREFIX}-account-para-1`;
  const accountPara2 = `${PREFIX}-account-para-2`;
  const accountPara3 = `${PREFIX}-account-para-3`;
  addMod(modAccount, "模块 · 账户说明", [accountPara1, accountPara2, accountPara3]);

  const accountRuns1 = [
    {
      text: "You need to log into your store account to enjoy member services and savings. I don't have an account. ",
    },
    { text: "Create an account", link: "https://example.com/register", decoration: "underline" },
  ];
  reg(accountPara1, "content.text", "账户说明 1", {
    id: accountPara1,
    type: "text",
    parentId: modAccount,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
    props: {
      content: snapshotFromRuns(accountRuns1),
      textBody: textBodyRuns(accountRuns1),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.1.link": {
        slotId: "createAccountUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/register",
        allowExternal: true,
        fieldKind: "content",
        label: "注册账户链接",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  const accountRuns2 = [
    {
      text: "If you agree to join the membership during Checkout, we have created an account for you. ",
    },
    { text: "Reset password", link: "https://example.com/reset-password", decoration: "underline" },
  ];
  reg(accountPara2, "content.text", "账户说明 2", {
    id: accountPara2,
    type: "text",
    parentId: modAccount,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
    props: {
      content: snapshotFromRuns(accountRuns2),
      textBody: textBodyRuns(accountRuns2),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.1.link": {
        slotId: "resetPasswordUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/reset-password",
        allowExternal: true,
        fieldKind: "content",
        label: "重置密码链接",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  const accountRuns3 = [
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
  ];
  reg(accountPara3, "content.text", "联系说明", {
    id: accountPara3,
    type: "text",
    parentId: modAccount,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
    props: {
      content: snapshotFromRuns(accountRuns3),
      textBody: textBodyRuns(accountRuns3),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.1.text": {
        slotId: "storeName",
        mode: "variable",
        valueType: "string",
        defaultValue: "zyzshop1",
        allowExternal: true,
        fieldKind: "content",
        label: "店铺名称",
      },
      "props.textBody.paragraphs.0.runs.1.link": {
        slotId: "storeUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/store",
        allowExternal: true,
        fieldKind: "content",
        label: "店铺链接",
      },
      "props.textBody.paragraphs.0.runs.3.text": {
        slotId: "supportEmail",
        mode: "variable",
        valueType: "string",
        defaultValue: "lintingting516@gmail.com",
        allowExternal: true,
        fieldKind: "content",
        label: "客服邮箱",
      },
      "props.textBody.paragraphs.0.runs.3.link": {
        slotId: "supportEmailMailto",
        mode: "variable",
        valueType: "url",
        defaultValue: "mailto:lintingting516@gmail.com",
        allowExternal: true,
        fieldKind: "content",
        label: "客服邮箱 mailto 链接",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  reg(ROOT_ID, "layout.container", "画布根节点", {
    id: ROOT_ID,
    type: "emailRoot",
    parentId: null,
    children: modIds,
    wrapperStyle: {
      contentAlign: contentAlignFromAxes("center", "start"),
      widthMode: "fill",
      heightMode: "hug",
    },
    props: {
      border: border0(),
      backgroundColor: themeRef("colors.surface"),
      width: "600px",
      padding: { mode: "unified", unified: "0" },
      gapMode: "fixed",
      gap: "0",
    },
    bindings: {
      "props.backgroundColor": themeBinding("colors.surface"),
    },
  });

  return {
    schemaVersion: "3.0.0",
    emailId: "member_welcome",
    templateId: "member_welcome",
    templateVersion: 1,
    locale: "en-US",
    rootBlockId: ROOT_ID,
    blockMeta,
    blocks,
  };
}

function writePayload() {
  return {
    schemaVersion: "1.0.0",
    values: {
      storeLogoSrc: STORE_LOGO_SRC,
      storeLogoAlt: "Store logo",
      heroWelcomeImageSrc: HERO_WELCOME_SRC,
      heroWelcomeImageAlt: "Welcome",
      heroSubtitle: "Enjoy various benefits!",
      greetingText:
        "Hi Member Name, we're excited to provide you with more exclusive member services and savings:",
      memberBenefits: BENEFITS.map((b) => ({
        title: b.title,
        subtitle: b.subtitle,
        iconSrc: b.icon,
      })),
      createAccountUrl: "https://example.com/register",
      resetPasswordUrl: "https://example.com/reset-password",
      storeName: "zyzshop1",
      storeUrl: "https://example.com/store",
      supportEmail: "lintingting516@gmail.com",
      supportEmailMailto: "mailto:lintingting516@gmail.com",
    },
  };
}

function writeTokenPresets() {
  return {
    schemaVersion: "1.0.0",
    activePresetId: "default",
    presets: {
      default: {
        label: "会员欢迎预设",
        description:
          "欢迎邮件：衬线大标题、链接蓝主色、灰副文案、模块间距与圆角；与模板 $themeRef 对齐。",
        tokens: normalizeTokenPresetTokens({
          colors: {
            primary: "#111827",
            secondary: "#6B7280",
            surface: "#FFFFFF",
          },
          spacing: {
            section: "24px",
            gap: "14px",
            pageInline: "24px",
          },
          typography: {
            display: "42px",
            h1: "18px",
            body: "15px",
            caption: "13px",
          },
          radius: {
            panel: "10px",
            cta: "9999px",
          },
        }),
      },
    },
    scopeSelections: {},
  };
}

function writeMeta() {
  return {
    displayName: "会员欢迎（Welcome 学习模板）",
    description:
      "店铺 Logo、欢迎主视觉、问候、五项会员权益与账户说明；样式经 tokenPresets 统一管理。",
    source: "agent",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultStylePresetSelection: "local",
  };
}


mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "template.json"), `${JSON.stringify(build(), null, 2)}\n`);
writeFileSync(join(OUT_DIR, "payload.json"), `${JSON.stringify(writePayload(), null, 2)}\n`);
writeFileSync(
  join(OUT_DIR, "tokenPresets.json"),
  `${JSON.stringify(writeTokenPresets(), null, 2)}\n`,
);
writeFileSync(join(OUT_DIR, "meta.json"), `${JSON.stringify(writeMeta(), null, 2)}\n`);
const norm = spawnSync(
  "npx",
  [
    "tsx",
    "scripts/normalize-template-defaults.ts",
    "--write",
    "data/emails/member-welcome/layouts/card/template.json",
  ],
  { cwd: ROOT, stdio: "inherit" },
);
if (norm.status !== 0) process.exit(norm.status ?? 1);

console.log(`Wrote member-welcome template to ${OUT_DIR}`);
