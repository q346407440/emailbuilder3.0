#!/usr/bin/env node
/**
 * 生成「VIP 会员服务更新」学习模板到 data/emails/member-vip-update/
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "./lib/token-preset-standard-order.mjs";
import { defaultLayoutDir } from "./lib/email-layout-output.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "emails", "member-vip-update");
const LAYOUT_DIR = defaultLayoutDir(OUT_DIR);
const PREFIX = "mv";

const TABLER = (name) =>
  `https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/${name}.svg`;
const LUCIDE = (name) =>
  `https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/${name}.svg`;
const PEX = (id, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const STORE_LOGO_SRC = TABLER("building-store");
const HERO_VIP_SRC = PEX(265906, 800);

const CURRENT_BENEFITS = [
  { title: "Get points", subtitle: "Reward 888 points", icon: TABLER("star"), iconColor: "#C9A227" },
  { title: "Product discount", subtitle: "No threshold", icon: TABLER("percentage"), iconColor: "#FFFFFF" },
  { title: "Order discounts", subtitle: "No threshold", icon: TABLER("shopping-bag"), iconColor: "#FFFFFF" },
  { title: "Buy 1 get 1", subtitle: "No threshold", icon: LUCIDE("gift"), iconColor: "#FFFFFF" },
  { title: "Free shipping", subtitle: "No threshold", icon: TABLER("truck-delivery"), iconColor: "#FFFFFF" },
];

const ACTIVATION_BENEFITS = [
  { title: "Get points", subtitle: "Reward 888 points", icon: TABLER("star"), iconColor: "#C9A227" },
  { title: "15% off", subtitle: "No threshold", icon: TABLER("discount"), iconColor: "#FFFFFF" },
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
      if (r.bold) return `<strong>${r.text}</strong>`;
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

  /** 栅格内权益单元（图标圆底 + 标题 + 说明） */
  const addBenefitCell = (
    cellId,
    parentId,
    item,
    collectionSlotId,
    index,
    collectionMeta,
  ) => {
    const iconWrapId = `${cellId}-icon-wrap`;
    const iconId = `${cellId}-icon`;
    const textColId = `${cellId}-text-col`;
    const titleId = `${cellId}-title`;
    const subId = `${cellId}-sub`;

    reg(cellId, "layout.container", `权益格 ${index + 1}`, {
      id: cellId,
      type: "layout",
      parentId,
      children: [iconWrapId, textColId],
      wrapperStyle: wsBase({
        placement: placement("start", "start"),
        contentAlign: { horizontal: "left", vertical: "top" },
      }),
      props: { direction: "horizontal", gapMode: "fixed", gap: "10px" },
      bindings: {},
    });

    reg(iconWrapId, "layout.container", `权益图标底 ${index + 1}`, {
      id: iconWrapId,
      type: "layout",
      parentId: cellId,
      children: [iconId],
      wrapperStyle: {
        placement: placement("start", "center"),
        contentAlign: { horizontal: "center", vertical: "center" },
        widthMode: "fixed",
        width: "40px",
        heightMode: "fixed",
        height: "40px",
        border: border0(),
        borderRadius: { mode: "unified", radius: themeRef("tokens.radius.cta") },
        backgroundColor: "#1F1F1F",
        padding: { mode: "unified", unified: "0" },
      },
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {
        "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
      },
    });

    reg(iconId, "content.icon", `权益图标 ${index + 1}`, {
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
        size: "20px",
        link: "",
      },
      bindings: {
        "props.src": {
          slotId: collectionSlotId,
          mode: "variable",
          valueType: "collection",
          defaultValue: collectionMeta.defaultItems,
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${index}.iconSrc`,
          ...(index === 0 ? collectionMeta.meta : {}),
        },
      },
    });

    reg(textColId, "layout.container", `权益文案列 ${index + 1}`, {
      id: textColId,
      type: "layout",
      parentId: cellId,
      children: [titleId, subId],
      wrapperStyle: wsBase({ widthMode: "fill", placement: placement("start", "center") }),
      props: { direction: "vertical", gapMode: "fixed", gap: "2px" },
      bindings: {},
    });

    reg(titleId, "content.text", `权益标题 ${index + 1}`, {
      id: titleId,
      type: "text",
      parentId: textColId,
      children: [],
      wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
      props: {
        content: `<p>${item.title}</p>`,
        textBody: textBodyRuns([{ text: item.title, bold: true }]),
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.body"),
        color: "#2C2416",
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: collectionSlotId,
          mode: "variable",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${index}.title`,
        },
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.body"),
      },
    });

    reg(subId, "content.text", `权益说明 ${index + 1}`, {
      id: subId,
      type: "text",
      parentId: textColId,
      children: [],
      wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
      props: {
        content: `<p>${item.subtitle}</p>`,
        textBody: textBodyRuns([{ text: item.subtitle }]),
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.caption"),
        color: "#6B5E4F",
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: collectionSlotId,
          mode: "variable",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${index}.subtitle`,
        },
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.caption"),
      },
    });
  };

  // --- Logo ---
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

  // --- 主视觉 Hero ---
  const modHero = `${PREFIX}-mod-hero`;
  const heroImg = `${PREFIX}-hero-img`;
  const heroTitle = `${PREFIX}-hero-title`;
  const heroSub = `${PREFIX}-hero-sub`;
  addMod(
    modHero,
    "模块 · VIP 主视觉",
    [heroImg, heroTitle, heroSub],
    {
      backgroundColor: "#141414",
      borderRadius: { mode: "unified", radius: themeRef("tokens.radius.panel") },
    },
    { "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel") },
  );

  reg(heroImg, "content.image", "VIP 头图", {
    id: heroImg,
    type: "image",
    parentId: modHero,
    children: [],
    wrapperStyle: {
      placement: placement("center", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
      widthMode: "fill",
      heightMode: "fixed",
      height: "160px",
      border: border0(),
      borderRadius: {
        mode: "unified",
        radius: themeRef("tokens.radius.panel"),
      },
      backgroundImage: {
        src: HERO_VIP_SRC,
        alt: "VIP membership",
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
        slotId: "heroVipImageSrc",
        mode: "variable",
        valueType: "image",
        defaultValue: HERO_VIP_SRC,
        allowExternal: true,
        fieldKind: "content",
        label: "VIP 主视觉头图",
      },
      "wrapperStyle.backgroundImage.alt": {
        slotId: "heroVipImageAlt",
        mode: "variable",
        valueType: "string",
        defaultValue: "VIP membership",
        allowExternal: true,
        fieldKind: "content",
        label: "VIP 头图替代文字",
      },
      "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
      "wrapperStyle.backgroundImage.borderRadius.radius": themeBinding("tokens.radius.panel"),
    },
  });

  reg(heroTitle, "content.text", "VIP 大标题", {
    id: heroTitle,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>VIP</p>",
      textBody: textBodyRuns([{ text: "VIP", bold: true }]),
      fontFamily: themeRef("fonts.heading"),
      fontSize: themeRef("tokens.typography.display"),
      color: "#C9A227",
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "heroTitleText",
        mode: "variable",
        valueType: "string",
        defaultValue: "VIP",
        allowExternal: true,
        fieldKind: "content",
        label: "VIP 大标题",
      },
      "props.fontFamily": themeBinding("fonts.heading"),
      "props.fontSize": themeBinding("tokens.typography.display"),
    },
  });

  reg(heroSub, "content.text", "VIP 副标题", {
    id: heroSub,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Exclusive membership</p>",
      textBody: textBodyRuns([{ text: "Exclusive membership" }]),
      fontFamily: themeRef("fonts.heading"),
      fontSize: themeRef("tokens.typography.h1"),
      color: "#D4AF37",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "heroSubtitle",
        mode: "variable",
        valueType: "string",
        defaultValue: "Exclusive membership",
        allowExternal: true,
        fieldKind: "content",
        label: "VIP 副标题",
      },
      "props.fontFamily": themeBinding("fonts.heading"),
      "props.fontSize": themeBinding("tokens.typography.h1"),
    },
  });

  // --- 问候与说明 ---
  const modIntro = `${PREFIX}-mod-intro`;
  const introHi = `${PREFIX}-intro-hi`;
  const introBody1 = `${PREFIX}-intro-body-1`;
  const introTerms = `${PREFIX}-intro-terms`;
  addMod(modIntro, "模块 · 问候与更新说明", [introHi, introBody1, introTerms]);

  reg(introHi, "content.text", "问候称呼", {
    id: introHi,
    type: "text",
    parentId: modIntro,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
    props: {
      content: "<p>Hi Member Name</p>",
      textBody: textBodyRuns([{ text: "Hi Member Name" }]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.body"),
      color: "#F3F4F6",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "greetingHiText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Hi Member Name",
        allowExternal: true,
        fieldKind: "content",
        label: "问候称呼",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.body"),
    },
  });

  reg(introBody1, "content.text", "更新说明 1", {
    id: introBody1,
    type: "text",
    parentId: modIntro,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
    props: {
      content:
        "<p>We're thrilled to share that zyzshop1 Membership Services have been updated to bring more ease, clarity, and member-only features.</p>",
      textBody: textBodyRuns([
        {
          text: "We're thrilled to share that zyzshop1 Membership Services have been updated to bring more ease, clarity, and member-only features.",
        },
      ]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.body"),
      color: "#E5E7EB",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "introBodyText1",
        mode: "variable",
        valueType: "string",
        defaultValue:
          "We're thrilled to share that zyzshop1 Membership Services have been updated to bring more ease, clarity, and member-only features.",
        allowExternal: true,
        fieldKind: "content",
        label: "会员服务更新说明",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.body"),
    },
  });

  const termsRuns = [
    { text: "Agree to accept our updated " },
    { text: "Terms of Use", link: "https://example.com/terms", decoration: "underline" },
    { text: " and " },
    { text: "Privacy Policy", link: "https://example.com/privacy", decoration: "underline" },
    { text: " and to receive marketing emails from us as a member" },
  ];
  reg(introTerms, "content.text", "条款同意说明", {
    id: introTerms,
    type: "text",
    parentId: modIntro,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
    props: {
      content: snapshotFromRuns(termsRuns),
      textBody: textBodyRuns(termsRuns),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.caption"),
      color: "#D1D5DB",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.1.link": {
        slotId: "termsOfUseUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/terms",
        allowExternal: true,
        fieldKind: "content",
        label: "使用条款链接",
      },
      "props.textBody.paragraphs.0.runs.3.link": {
        slotId: "privacyPolicyUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/privacy",
        allowExternal: true,
        fieldKind: "content",
        label: "隐私政策链接",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.caption"),
    },
  });

  // --- VIP 状态卡（奶油色大卡片）---
  const modVipCard = `${PREFIX}-mod-vip-card`;
  const vipLevelRow = `${PREFIX}-vip-level-row`;
  const vipDiamondWrap = `${PREFIX}-vip-diamond-wrap`;
  const vipDiamondIcon = `${PREFIX}-vip-diamond-icon`;
  const vipBadge = `${PREFIX}-vip-badge`;
  const vipLevelTitle = `${PREFIX}-vip-level-title`;
  const progressText = `${PREFIX}-progress-text`;
  const progressBar = `${PREFIX}-progress-bar`;
  const progressFill = `${PREFIX}-progress-fill`;
  const progressRemain = `${PREFIX}-progress-remain`;
  const benefitsGrid = `${PREFIX}-benefits-grid`;
  const cardDivider = `${PREFIX}-card-divider`;
  const activateIntro = `${PREFIX}-activate-intro`;
  const activateGrid = `${PREFIX}-activate-grid`;
  const ctaBtn = `${PREFIX}-cta-btn`;
  const disclaimer = `${PREFIX}-disclaimer`;

  const currentBenefitCellIds = CURRENT_BENEFITS.map((_, i) => `${PREFIX}-benefit-cell-${i + 1}`);
  const activateBenefitCellIds = ACTIVATION_BENEFITS.map(
    (_, i) => `${PREFIX}-activate-cell-${i + 1}`,
  );

  addMod(
    modVipCard,
    "模块 · VIP 状态卡",
    [
      vipLevelRow,
      progressText,
      progressBar,
      benefitsGrid,
      cardDivider,
      activateIntro,
      activateGrid,
      ctaBtn,
      disclaimer,
    ],
    {
      backgroundColor: "#FDF0E1",
      borderRadius: { mode: "unified", radius: themeRef("tokens.radius.panel") },
    },
    { "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel") },
  );

  reg(vipLevelRow, "layout.container", "VIP 等级行", {
    id: vipLevelRow,
    type: "layout",
    parentId: modVipCard,
    children: [vipDiamondWrap, vipBadge, vipLevelTitle],
    wrapperStyle: wsBase({
      placement: placement("start", "center"),
      contentAlign: { horizontal: "left", vertical: "center" },
    }),
    props: { direction: "horizontal", gapMode: "fixed", gap: "10px" },
    bindings: {},
  });

  reg(vipDiamondWrap, "layout.container", "钻石图标底", {
    id: vipDiamondWrap,
    type: "layout",
    parentId: vipLevelRow,
    children: [vipDiamondIcon],
    wrapperStyle: {
      placement: placement("start", "center"),
      widthMode: "fixed",
      width: "36px",
      heightMode: "fixed",
      height: "36px",
      border: border0(),
      borderRadius: { mode: "unified", radius: themeRef("tokens.radius.cta") },
      backgroundColor: "#1F1F1F",
    },
    props: { direction: "horizontal", gapMode: "fixed", gap: "0" },
    bindings: {
      "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
    },
  });

  reg(vipDiamondIcon, "content.icon", "钻石图标", {
    id: vipDiamondIcon,
    type: "icon",
    parentId: vipDiamondWrap,
    children: [],
    wrapperStyle: {
      placement: placement("center", "center"),
      widthMode: "hug",
      heightMode: "hug",
      border: border0(),
      borderRadius: radius0(),
    },
    props: {
      src: TABLER("diamond"),
      color: "#C9A227",
      size: "20px",
      link: "",
    },
    bindings: {},
  });

  reg(vipBadge, "content.text", "等级徽章", {
    id: vipBadge,
    type: "text",
    parentId: vipLevelRow,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "center" } }),
    props: {
      content: "<p>V1</p>",
      textBody: textBodyRuns([{ text: "V1", bold: true }]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.caption"),
      color: "#2C2416",
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "vipLevelBadge",
        mode: "variable",
        valueType: "string",
        defaultValue: "V1",
        allowExternal: true,
        fieldKind: "content",
        label: "等级徽章",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.caption"),
    },
  });

  reg(vipLevelTitle, "content.text", "VIP 等级标题", {
    id: vipLevelTitle,
    type: "text",
    parentId: vipLevelRow,
    children: [],
    wrapperStyle: wsBase({
      widthMode: "fill",
      contentAlign: { horizontal: "left", vertical: "center" },
    }),
    props: {
      content: "<p>VIP 1</p>",
      textBody: textBodyRuns([{ text: "VIP 1", bold: true }]),
      fontFamily: themeRef("fonts.heading"),
      fontSize: themeRef("tokens.typography.h1"),
      color: "#2C2416",
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "vipLevelTitle",
        mode: "variable",
        valueType: "string",
        defaultValue: "VIP 1",
        allowExternal: true,
        fieldKind: "content",
        label: "VIP 等级标题",
      },
      "props.fontFamily": themeBinding("fonts.heading"),
      "props.fontSize": themeBinding("tokens.typography.h1"),
    },
  });

  reg(progressText, "content.text", "升级进度说明", {
    id: progressText,
    type: "text",
    parentId: modVipCard,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
    props: {
      content: "<p>Spent $1000.00 more to reach VIP next level</p>",
      textBody: textBodyRuns([{ text: "Spent $1000.00 more to reach VIP next level" }]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.body"),
      color: "#4A3F32",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "progressText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Spent $1000.00 more to reach VIP next level",
        allowExternal: true,
        fieldKind: "content",
        label: "升级进度说明",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.body"),
    },
  });

  reg(progressBar, "layout.container", "升级进度条", {
    id: progressBar,
    type: "layout",
    parentId: modVipCard,
    children: [progressFill, progressRemain],
    wrapperStyle: {
      ...wsBase({ placement: placement("start", "start") }),
      borderRadius: { mode: "unified", radius: "9999px" },
      heightMode: "fixed",
      height: "10px",
      overflow: "hidden",
    },
    props: { direction: "horizontal", gapMode: "fixed", gap: "0" },
    bindings: {},
  });

  reg(progressFill, "layout.container", "进度已完成", {
    id: progressFill,
    type: "layout",
    parentId: progressBar,
    children: [],
    wrapperStyle: {
      widthMode: "fixed",
      width: "20%",
      heightMode: "fixed",
      height: "10px",
      backgroundColor: "#C9A227",
      border: border0(),
      borderRadius: radius0(),
    },
    props: { direction: "horizontal", gapMode: "fixed", gap: "0" },
    bindings: {},
  });

  reg(progressRemain, "layout.container", "进度未完成", {
    id: progressRemain,
    type: "layout",
    parentId: progressBar,
    children: [],
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "fixed",
      height: "10px",
      backgroundColor: "#E8DCC8",
      border: border0(),
      borderRadius: radius0(),
    },
    props: { direction: "horizontal", gapMode: "fixed", gap: "0" },
    bindings: {},
  });

  const currentBenefitsDefault = CURRENT_BENEFITS.map((b) => ({
    title: b.title,
    subtitle: b.subtitle,
    iconSrc: b.icon,
  }));
  const currentBenefitsMeta = {
    defaultItems: currentBenefitsDefault,
    meta: {
      label: "当前会员权益列表",
      description: "VIP 卡内当前权益栅格，固定 5 项。",
      itemFields: [
        { key: "title", label: "权益标题", valueType: "string", required: true },
        { key: "subtitle", label: "权益说明", valueType: "string", required: true },
        { key: "iconSrc", label: "图标地址", valueType: "image", required: true },
      ],
      minItems: 5,
      maxItems: 5,
    },
  };
  CURRENT_BENEFITS.forEach((item, i) => {
    addBenefitCell(
      currentBenefitCellIds[i],
      benefitsGrid,
      item,
      "currentMemberBenefits",
      i,
      currentBenefitsMeta,
    );
  });

  reg(benefitsGrid, "layout.container", "当前权益列表", {
    id: benefitsGrid,
    type: "layout",
    parentId: modVipCard,
    children: currentBenefitCellIds,
    wrapperStyle: wsBase(),
    props: {
      direction: "vertical",
      gapMode: "fixed",
      gap: themeRef("tokens.spacing.gap"),
    },
    bindings: {
      "props.gap": themeBinding("tokens.spacing.gap"),
    },
  });

  reg(cardDivider, "separator.divider", "卡内分隔线", {
    id: cardDivider,
    type: "divider",
    parentId: modVipCard,
    children: [],
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
      placement: placement("center", "center"),
      border: border0(),
      borderRadius: radius0(),
    },
    props: { color: "#C4B5A0", lineWidthMode: "fill", height: "1px" },
    bindings: {},
  });

  reg(activateIntro, "content.text", "激活引导语", {
    id: activateIntro,
    type: "text",
    parentId: modVipCard,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
    props: {
      content: "<p>Activate your membership now to receive the following benefits:</p>",
      textBody: textBodyRuns([
        { text: "Activate your membership now to receive the following benefits:" },
      ]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.body"),
      color: "#2C2416",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "activateIntroText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Activate your membership now to receive the following benefits:",
        allowExternal: true,
        fieldKind: "content",
        label: "激活引导语",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.body"),
    },
  });

  const activationBenefitsDefault = ACTIVATION_BENEFITS.map((b) => ({
    title: b.title,
    subtitle: b.subtitle,
    iconSrc: b.icon,
  }));
  const activationBenefitsMeta = {
    defaultItems: activationBenefitsDefault,
    meta: {
      label: "激活后可享权益",
      description: "激活区权益栅格，固定 2 项。",
      itemFields: [
        { key: "title", label: "权益标题", valueType: "string", required: true },
        { key: "subtitle", label: "权益说明", valueType: "string", required: true },
        { key: "iconSrc", label: "图标地址", valueType: "image", required: true },
      ],
      minItems: 2,
      maxItems: 2,
    },
  };
  ACTIVATION_BENEFITS.forEach((item, i) => {
    addBenefitCell(
      activateBenefitCellIds[i],
      activateGrid,
      item,
      "activationBenefits",
      i,
      activationBenefitsMeta,
    );
  });

  reg(activateGrid, "layout.container", "激活权益列表", {
    id: activateGrid,
    type: "layout",
    parentId: modVipCard,
    children: activateBenefitCellIds,
    wrapperStyle: wsBase(),
    props: {
      direction: "vertical",
      gapMode: "fixed",
      gap: themeRef("tokens.spacing.gap"),
    },
    bindings: {
      "props.gap": themeBinding("tokens.spacing.gap"),
    },
  });

  reg(ctaBtn, "action.button", "激活主按钮", {
    id: ctaBtn,
    type: "button",
    parentId: modVipCard,
    children: [],
    wrapperStyle: wsBase({
      contentAlign: { horizontal: "center", vertical: "top" },
      placement: placement("center", "start"),
    }),
    props: {
      text: "👉 I Agree and Activate My Benefits",
      link: "https://example.com/activate-membership",
      buttonStyle: {
        widthMode: "hug",
        backgroundColor: "#111111",
        textColor: "#C9A227",
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.body"),
        border: border0(),
        borderRadius: { mode: "unified", radius: themeRef("tokens.radius.cta") },
        bold: true,
        italic: false,
      },
    },
    bindings: {
      "props.text": {
        slotId: "ctaButtonText",
        mode: "variable",
        valueType: "string",
        defaultValue: "👉 I Agree and Activate My Benefits",
        allowExternal: true,
        fieldKind: "content",
        label: "激活按钮文案",
      },
      "props.link": {
        slotId: "ctaButtonUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/activate-membership",
        allowExternal: true,
        fieldKind: "content",
        label: "激活按钮链接",
      },
      "props.buttonStyle.fontFamily": themeBinding("fonts.body"),
      "props.buttonStyle.fontSize": themeBinding("tokens.typography.body"),
      "props.buttonStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
    },
  });

  reg(disclaimer, "content.text", "权益免责声明", {
    id: disclaimer,
    type: "text",
    parentId: modVipCard,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>*Actual membership benefits are as issued at the time of your activation.</p>",
      textBody: textBodyRuns([
        { text: "*Actual membership benefits are as issued at the time of your activation." },
      ]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.caption"),
      color: "#8A7B6A",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "disclaimerText",
        mode: "variable",
        valueType: "string",
        defaultValue: "*Actual membership benefits are as issued at the time of your activation.",
        allowExternal: true,
        fieldKind: "content",
        label: "权益免责声明",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.caption"),
    },
  });

  // --- 账户与联系 ---
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
      color: "#E5E7EB",
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
      color: "#E5E7EB",
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
      fontSize: themeRef("tokens.typography.caption"),
      color: "#9CA3AF",
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
      "props.fontSize": themeBinding("tokens.typography.caption"),
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
    emailId: "member_vip_update",
    templateId: "member_vip_update",
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
      heroVipImageSrc: HERO_VIP_SRC,
      heroVipImageAlt: "VIP membership",
      heroTitleText: "VIP",
      heroSubtitle: "Exclusive membership",
      greetingHiText: "Hi Member Name",
      introBodyText1:
        "We're thrilled to share that zyzshop1 Membership Services have been updated to bring more ease, clarity, and member-only features.",
      termsOfUseUrl: "https://example.com/terms",
      privacyPolicyUrl: "https://example.com/privacy",
      vipLevelBadge: "V1",
      vipLevelTitle: "VIP 1",
      progressText: "Spent $1000.00 more to reach VIP next level",
      currentMemberBenefits: CURRENT_BENEFITS.map((b) => ({
        title: b.title,
        subtitle: b.subtitle,
        iconSrc: b.icon,
      })),
      activateIntroText: "Activate your membership now to receive the following benefits:",
      activationBenefits: ACTIVATION_BENEFITS.map((b) => ({
        title: b.title,
        subtitle: b.subtitle,
        iconSrc: b.icon,
      })),
      ctaButtonText: "👉 I Agree and Activate My Benefits",
      ctaButtonUrl: "https://example.com/activate-membership",
      disclaimerText: "*Actual membership benefits are as issued at the time of your activation.",
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
        label: "VIP 会员更新预设",
        description: "黑金尊享主题、奶油 VIP 卡与标准间距档位。",
        tokens: normalizeTokenPresetTokens({
          colors: {
            primary: "#C9A227",
            secondary: "#9CA3AF",
            surface: "#0D0D0D",
          },
          fonts: {
            heading: "Georgia",
            body: "'Segoe UI'",
          },
          spacing: {
            section: "24px",
            gap: "14px",
            pageInline: "24px",
          },
          typography: {
            display: "40px",
            h1: "22px",
            body: "15px",
            caption: "13px",
          },
          radius: {
            panel: "12px",
            cta: "8px",
          },
        }),
      },
    },
    scopeSelections: {},
  };
}

function writeMeta() {
  return {
    displayName: "VIP 会员更新（Membership Update 学习模板）",
    description:
      "店铺 Logo、VIP 主视觉、问候与条款说明、VIP 状态卡（等级/进度/权益/激活 CTA）、账户与联系；样式经 tokenPresets 统一管理。",
    source: "agent",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    designSource: { type: "screenshot", url: "" },
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
    "data/emails/member-vip-update/layouts/default/template.json",
  ],
  { cwd: ROOT, stdio: "inherit" },
);
if (norm.status !== 0) process.exit(norm.status ?? 1);

console.log(`Wrote member-vip-update template to ${OUT_DIR}`);
