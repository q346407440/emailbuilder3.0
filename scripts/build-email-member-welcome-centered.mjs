#!/usr/bin/env node

import { contentAlignFromAxes, axesAlignRecord } from "./lib/content-align-axis.mjs";
/**
 * 生成「会员欢迎 · 居中流式」版式到 data/emails/member-welcome/layouts/centered/
 * 与场景共享 payload；槽位与 card 版式对齐（含 memberName interpolate）。
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "./lib/token-preset-standard-order.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "emails", "member-welcome", "layouts", "centered");
const PREFIX = "mwc";

const TABLER = (name) =>
  `https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/${name}.svg`;
const LUCIDE = (name) =>
  `https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/${name}.svg`;
const PEX = (id, w = 400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const STORE_LOGO_SRC = TABLER("building-store");
/** 欢迎横幅（珊瑚促销氛围，可经 payload.heroWelcomeImageSrc 替换） */
const HERO_WELCOME_SRC = PEX(7688336, 800);
const WELCOME_ACCENT = "#8B2332";
const ICON_DISC_BG = "#4A3F35";

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
        contentAlign: { horizontal: "center", vertical: "top" },
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

  const addModBleed = (modId, title, innerIds) => {
    modIds.push(modId);
    reg(modId, "layout.container", title, {
      id: modId,
      type: "layout",
      parentId: ROOT_ID,
      children: innerIds,
      wrapperStyle: wsBase({
        backgroundColor: themeRef("colors.surface"),
        padding: { mode: "unified", unified: "0" },
        contentAlign: { horizontal: "center", vertical: "top" },
      }),
      props: {
        direction: "vertical",
        gapMode: "fixed",
        gap: "0",
      },
      bindings: {
        "wrapperStyle.backgroundColor": themeBinding("colors.surface"),
      },
    });
  };

  // --- 模块 · 店铺 Logo（与 card 版式共用 payload 槽；设计图无顶栏时可在预览中替换为空图）---
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
      width: "120px",
      heightMode: "fixed",
      height: "40px",
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

  // --- 模块 · 欢迎横幅（底图叠放：横幅 + 白卡片 WELCOME 压在图上）---
  const modHero = `${PREFIX}-mod-hero`;
  const heroCard = `${PREFIX}-hero-card`;
  const heroWelcome = `${PREFIX}-hero-welcome`;
  const heroSub = `${PREFIX}-hero-sub`;
  addModBleed(modHero, "模块 · 欢迎横幅", [heroCard]);

  blocks[modHero].wrapperStyle = {
    ...blocks[modHero].wrapperStyle,
    contentAlign: { horizontal: "center", vertical: "center" },
    heightMode: "fixed",
    height: "220px",
    padding: {
      mode: "separate",
      top: themeRef("tokens.spacing.section"),
      right: themeRef("tokens.spacing.pageInline"),
      bottom: themeRef("tokens.spacing.section"),
      left: themeRef("tokens.spacing.pageInline"),
    },
    backgroundImage: {
      src: HERO_WELCOME_SRC,
      alt: "Welcome banner",
      link: "",
      fit: "cover",
      position: "center",
      borderRadius: radius0(),
      border: border0(),
    },
  };
  blocks[modHero].bindings = {
    "wrapperStyle.backgroundColor": themeBinding("colors.surface"),
    "wrapperStyle.padding.top": themeBinding("tokens.spacing.section"),
    "wrapperStyle.padding.left": themeBinding("tokens.spacing.pageInline"),
    "wrapperStyle.padding.right": themeBinding("tokens.spacing.pageInline"),
    "wrapperStyle.padding.bottom": themeBinding("tokens.spacing.section"),
    "wrapperStyle.backgroundImage.src": {
      slotId: "heroWelcomeImageSrc",
      mode: "variable",
      valueType: "image",
      defaultValue: HERO_WELCOME_SRC,
      allowExternal: true,
      fieldKind: "content",
      label: "欢迎横幅图地址",
      description: "顶部珊瑚色促销横幅（建议宽 600px）。",
    },
    "wrapperStyle.backgroundImage.alt": {
      slotId: "heroWelcomeImageAlt",
      mode: "variable",
      valueType: "string",
      defaultValue: "Welcome banner",
      allowExternal: true,
      fieldKind: "content",
      label: "欢迎横幅替代文字",
    },
  };

  reg(heroCard, "layout.container", "欢迎白卡片", {
    id: heroCard,
    type: "layout",
    parentId: modHero,
    children: [heroWelcome, heroSub],
    wrapperStyle: wsBase({
      contentAlign: { horizontal: "center", vertical: "top" },
      backgroundColor: themeRef("colors.surface"),
      padding: {
        mode: "separate",
        top: themeRef("tokens.spacing.gap"),
        right: themeRef("tokens.spacing.gap"),
        bottom: themeRef("tokens.spacing.gap"),
        left: themeRef("tokens.spacing.gap"),
      },
    }),
    props: { direction: "vertical", gapMode: "fixed", gap: "8px" },
    bindings: {
      "wrapperStyle.backgroundColor": themeBinding("colors.surface"),
      "wrapperStyle.padding.top": themeBinding("tokens.spacing.gap"),
      "wrapperStyle.padding.bottom": themeBinding("tokens.spacing.gap"),
      "wrapperStyle.padding.left": themeBinding("tokens.spacing.gap"),
      "wrapperStyle.padding.right": themeBinding("tokens.spacing.gap"),
    },
  });

  reg(heroWelcome, "content.text", "WELCOME 主标题", {
    id: heroWelcome,
    type: "text",
    parentId: heroCard,
    children: [],
    wrapperStyle: wsBase({
      contentAlign: { horizontal: "center", vertical: "top" },
    }),
    props: {
      content: "<p>WELCOME</p>",
      textBody: textBodyRuns([{ text: "WELCOME", bold: true }]),
      fontSize: themeRef("tokens.typography.display"),
      color: WELCOME_ACCENT,
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.fontSize": themeBinding("tokens.typography.display"),
    },
  });

  reg(heroSub, "content.text", "欢迎副标题", {
    id: heroSub,
    type: "text",
    parentId: heroCard,
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
        "<p>Hi {{ memberName }}, we're excited to provide you with more exclusive member services and savings:</p>",
      textBody: textBodyRuns([
        {
          text: "Hi {{ memberName }}, we're excited to provide you with more exclusive member services and savings:",
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
        backgroundColor: ICON_DISC_BG,
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
  addMod(modAccount, "模块 · 账户说明", [accountPara1, accountPara2, accountPara3], {
    contentAlign: { horizontal: "left", vertical: "top" },
  });

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
      gap: themeRef("tokens.spacing.gap"),
    },
    bindings: {
      "props.backgroundColor": themeBinding("colors.surface"),
      "props.gap": themeBinding("tokens.spacing.gap"),
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

function writeTokenPresets() {
  return {
    schemaVersion: "1.0.0",
    activePresetId: "default",
    presets: {
      default: {
        label: "会员欢迎 · 居中流式",
        description:
          "珊瑚横幅 + 白卡片 WELCOME 衬线大标题；问候/权益居中区；深棕圆标权益列表。",
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


mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "template.json"), `${JSON.stringify(build(), null, 2)}\n`);
writeFileSync(
  join(OUT_DIR, "tokenPresets.json"),
  `${JSON.stringify(writeTokenPresets(), null, 2)}\n`,
);
const norm = spawnSync(
  "npx",
  [
    "tsx",
    "scripts/normalize-template-defaults.ts",
    "--write",
    "data/emails/member-welcome/layouts/centered/template.json",
  ],
  { cwd: ROOT, stdio: "inherit" },
);
if (norm.status !== 0) process.exit(norm.status ?? 1);

console.log(`Wrote member-welcome centered layout to ${OUT_DIR}`);
