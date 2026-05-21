#!/usr/bin/env node
/**
 * 生成「会员恭喜 / 升级」学习模板到 data/emails/member-congrats/
 * 按配置母版：模块壳 + tokenPresets 标准 14 键 + payload 变量。
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "./lib/token-preset-standard-order.mjs";
import { defaultLayoutDir } from "./lib/email-layout-output.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "emails", "member-congrats");
const LAYOUT_DIR = defaultLayoutDir(OUT_DIR);
const PREFIX = "mc";

const TABLER = (name) =>
  `https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/${name}.svg`;
const LUCIDE = (name) =>
  `https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/${name}.svg`;
const PEX = (id, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const STORE_LOGO_SRC = TABLER("building-store");
/** 恭喜主视觉头图（红底礼盒氛围占位，可经 payload.heroCongratsImageSrc 替换） */
const HERO_CONGRATS_SRC = PEX(2647990, 800);

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

const placement = (h, v) => ({ horizontal: h, vertical: v });

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
  placement: placement("start", "start"),
  contentAlign: { horizontal: "left", vertical: "top" },
  widthMode: "fill",
  heightMode: "hug",
  border: border0(),
  borderRadius: radius0(),
  ...extra,
});

const textBodyRuns = (runs) => ({
  version: 1,
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
      placement: placement("center", "start"),
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
      placement: placement("center", "center"),
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

  // --- 模块 · 恭喜主视觉（头图 + 称呼 + 大标题 + 副标题）---
  const modHero = `${PREFIX}-mod-hero`;
  const heroImg = `${PREFIX}-hero-img`;
  const heroDear = `${PREFIX}-hero-dear`;
  const heroTitle = `${PREFIX}-hero-title`;
  const heroSub = `${PREFIX}-hero-sub`;
  addMod(modHero, "模块 · 恭喜主视觉", [heroImg, heroDear, heroTitle, heroSub]);

  reg(heroImg, "content.image", "恭喜头图", {
    id: heroImg,
    type: "image",
    parentId: modHero,
    children: [],
    wrapperStyle: {
      placement: placement("center", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
      widthMode: "fill",
      heightMode: "fixed",
      height: "200px",
      border: border0(),
      borderRadius: {
        mode: "unified",
        radius: themeRef("tokens.radius.panel"),
      },
      backgroundImage: {
        src: HERO_CONGRATS_SRC,
        alt: "Congratulations",
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
        slotId: "heroCongratsImageSrc",
        mode: "variable",
        valueType: "image",
        defaultValue: HERO_CONGRATS_SRC,
        allowExternal: true,
        fieldKind: "content",
        label: "恭喜头图地址",
        description: "恭喜/升级主视觉横幅图，建议宽 600px 比例。",
      },
      "wrapperStyle.backgroundImage.alt": {
        slotId: "heroCongratsImageAlt",
        mode: "variable",
        valueType: "string",
        defaultValue: "Congratulations",
        allowExternal: true,
        fieldKind: "content",
        label: "恭喜头图替代文字",
      },
      "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
      "wrapperStyle.backgroundImage.borderRadius.radius": themeBinding("tokens.radius.panel"),
    },
  });

  reg(heroDear, "content.text", "恭喜称呼", {
    id: heroDear,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Dear member</p>",
      textBody: textBodyRuns([{ text: "Dear member", italic: true }]),
      fontFamily: themeRef("fonts.heading"),
      fontSize: themeRef("tokens.typography.h1"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: true,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "heroDearText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Dear member",
        allowExternal: true,
        fieldKind: "content",
        label: "恭喜称呼",
      },
      "props.fontFamily": themeBinding("fonts.heading"),
      "props.fontSize": themeBinding("tokens.typography.h1"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  reg(heroTitle, "content.text", "恭喜大标题", {
    id: heroTitle,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Congratulations</p>",
      textBody: textBodyRuns([{ text: "Congratulations", bold: true }]),
      fontFamily: themeRef("fonts.heading"),
      fontSize: themeRef("tokens.typography.display"),
      color: themeRef("colors.primary"),
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "heroTitleText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Congratulations",
        allowExternal: true,
        fieldKind: "content",
        label: "恭喜大标题",
      },
      "props.fontFamily": themeBinding("fonts.heading"),
      "props.fontSize": themeBinding("tokens.typography.display"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  reg(heroSub, "content.text", "恭喜副标题", {
    id: heroSub,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>we provide you with more member services and discounts</p>",
      textBody: textBodyRuns([
        { text: "we provide you with more member services and discounts" },
      ]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.caption"),
      color: themeRef("colors.secondary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "heroSubtitle",
        mode: "variable",
        valueType: "string",
        defaultValue: "we provide you with more member services and discounts",
        allowExternal: true,
        fieldKind: "content",
        label: "恭喜副标题",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.caption"),
      "props.color": themeBinding("colors.secondary"),
    },
  });

  // --- 模块 · 问候语 ---
  const modGreeting = `${PREFIX}-mod-greeting`;
  const greetingMain = `${PREFIX}-greeting-main`;
  const greetingSub = `${PREFIX}-greeting-sub`;
  addMod(modGreeting, "模块 · 问候语", [greetingMain, greetingSub]);

  reg(greetingMain, "content.text", "升级问候主文", {
    id: greetingMain,
    type: "text",
    parentId: modGreeting,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Hi Member Name You are now a level member!</p>",
      textBody: textBodyRuns([{ text: "Hi Member Name You are now a level member!" }]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "greetingMainText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Hi Member Name You are now a level member!",
        allowExternal: true,
        fieldKind: "content",
        label: "升级问候主文",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  reg(greetingSub, "content.text", "权益引导语", {
    id: greetingSub,
    type: "text",
    parentId: modGreeting,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>You can enjoy the following membership benefits</p>",
      textBody: textBodyRuns([{ text: "You can enjoy the following membership benefits" }]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "greetingSubText",
        mode: "variable",
        valueType: "string",
        defaultValue: "You can enjoy the following membership benefits",
        allowExternal: true,
        fieldKind: "content",
        label: "权益引导语",
      },
      "props.fontFamily": themeBinding("fonts.body"),
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
        placement: placement("start", "start"),
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
        placement: placement("start", "center"),
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
        placement: placement("center", "center"),
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
        placement: placement("start", "center"),
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
        fontFamily: themeRef("fonts.body"),
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
        "props.fontFamily": themeBinding("fonts.body"),
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
        fontFamily: themeRef("fonts.body"),
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
        "props.fontFamily": themeBinding("fonts.body"),
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
      fontFamily: themeRef("fonts.body"),
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
      "props.fontFamily": themeBinding("fonts.body"),
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
      fontFamily: themeRef("fonts.body"),
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
      "props.fontFamily": themeBinding("fonts.body"),
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
      fontFamily: themeRef("fonts.body"),
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
      "props.fontFamily": themeBinding("fonts.body"),
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
      placement: placement("center", "start"),
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
    emailId: "member_congrats",
    templateId: "member_congrats",
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
      heroCongratsImageSrc: HERO_CONGRATS_SRC,
      heroCongratsImageAlt: "Congratulations",
      heroDearText: "Dear member",
      heroTitleText: "Congratulations",
      heroSubtitle: "we provide you with more member services and discounts",
      greetingMainText: "Hi Member Name You are now a level member!",
      greetingSubText: "You can enjoy the following membership benefits",
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
        label: "会员恭喜预设",
        description:
          "恭喜升级邮件：深蓝主色、权益列表与账户说明；与模板 $themeRef 对齐。",
        tokens: normalizeTokenPresetTokens({
          colors: {
            primary: "#1A365D",
            secondary: "#6B7280",
            surface: "#FFFFFF",
          },
          fonts: {
            heading: "Georgia",
            body:
              "'Segoe UI'",
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
    displayName: "会员恭喜（Congratulations 学习模板）",
    description:
      "店铺 Logo、恭喜主视觉、升级问候、五项会员权益与账户说明；样式经 tokenPresets 统一管理。",
    source: "agent",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    designSource: {
      type: "screenshot",
      url: "",
    },
    defaultStylePresetSelection: "local",
  };
}


mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(LAYOUT_DIR, { recursive: true });
writeFileSync(join(LAYOUT_DIR, "template.json"), `${JSON.stringify(build(), null, 2)}\n`);
writeFileSync(join(OUT_DIR, "payload.json"), `${JSON.stringify(writePayload(), null, 2)}\n`);
writeFileSync(
  join(LAYOUT_DIR, "tokenPresets.json"),
  `${JSON.stringify(writeTokenPresets(), null, 2)}\n`,
);
writeFileSync(join(OUT_DIR, "meta.json"), `${JSON.stringify(writeMeta(), null, 2)}\n`);
const norm = spawnSync(
  "npx",
  [
    "tsx",
    "scripts/normalize-template-defaults.ts",
    "--write",
    "data/emails/member-congrats/layouts/default/template.json",
  ],
  { cwd: ROOT, stdio: "inherit" },
);
if (norm.status !== 0) process.exit(norm.status ?? 1);

console.log(`Wrote member-congrats template to ${OUT_DIR}`);
