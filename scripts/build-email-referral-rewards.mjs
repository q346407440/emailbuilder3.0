#!/usr/bin/env node

import { contentAlignFromAxes, axesAlignRecord } from "./lib/content-align-axis.mjs";
/**
 * 生成「推荐有奖」学习模板到 data/emails/referral-rewards/
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "./lib/token-preset-standard-order.mjs";
import { defaultLayoutDir } from "./lib/email-layout-output.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "emails", "referral-rewards");
const LAYOUT_DIR = defaultLayoutDir(OUT_DIR);
const PREFIX = "rf";

const TABLER = (name) =>
  `https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/${name}.svg`;
const LUCIDE = (name) =>
  `https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/${name}.svg`;

const STORE_LOGO_SRC = TABLER("building-store");
const ICON_POINTS = TABLER("coins");
const ICON_COUPON = TABLER("tag");
const ICON_GIFT = LUCIDE("gift");

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

  const addRewardItem = (baseId, parentId, iconSrc, label, valueSlotId, valueDefault, labelText) => {
    const cellId = baseId;
    const iconId = `${baseId}-icon`;
    const labelId = `${baseId}-label`;
    const valueId = `${baseId}-value`;

    reg(cellId, "layout.container", labelText, {
      id: cellId,
      type: "layout",
      parentId,
      children: [iconId, labelId, valueId],
      wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
      props: { direction: "vertical", gapMode: "fixed", gap: "6px" },
      bindings: {},
    });

    reg(iconId, "content.icon", `${labelText} 图标`, {
      id: iconId,
      type: "icon",
      parentId: cellId,
      children: [],
      wrapperStyle: {
        contentAlign: contentAlignFromAxes("center", "start"),
        widthMode: "hug",
        heightMode: "hug",
        border: border0(),
        borderRadius: radius0(),
      },
      props: { src: iconSrc, color: "#6B4E2E", size: "28px", link: "" },
      bindings: {},
    });

    reg(labelId, "content.text", `${labelText} 标签`, {
      id: labelId,
      type: "text",
      parentId: cellId,
      children: [],
      wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
      props: {
        content: `<p>${label}</p>`,
        textBody: textBodyRuns([{ text: label }]),
        fontSize: themeRef("tokens.typography.caption"),
        color: "#9A7B4F",
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.fontSize": themeBinding("tokens.typography.caption"),
      },
    });

    reg(valueId, "content.text", `${labelText} 数值`, {
      id: valueId,
      type: "text",
      parentId: cellId,
      children: [],
      wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
      props: {
        content: `<p>${valueDefault}</p>`,
        textBody: textBodyRuns([{ text: valueDefault, bold: true }]),
        fontSize: themeRef("tokens.typography.body"),
        color: themeRef("colors.primary"),
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: valueSlotId,
          mode: "variable",
          valueType: "string",
          defaultValue: valueDefault,
          allowExternal: true,
          fieldKind: "content",
          label: `${labelText}数值`,
        },
        "props.fontSize": themeBinding("tokens.typography.body"),
        "props.color": themeBinding("colors.primary"),
      },
    });
  };

  // --- Logo ---
  const modLogo = `${PREFIX}-mod-logo`;
  const logoRow = `${PREFIX}-logo-row`;
  const logoImg = `${PREFIX}-logo-img`;
  addMod(modLogo, "模块 · 店铺 Logo", [logoRow]);

  reg(logoRow, "layout.container", "Logo 行", {
    id: logoRow,
    type: "layout",
    parentId: modLogo,
    children: [logoImg],
    wrapperStyle: wsBase({
      contentAlign: contentAlignFromAxes("start", "start"),
      contentAlign: { horizontal: "left", vertical: "top" },
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
      contentAlign: contentAlignFromAxes("start", "center"),
      widthMode: "fixed",
      width: "160px",
      heightMode: "fixed",
      height: "40px",
      border: border0(),
      borderRadius: radius0(),
      backgroundImage: {
        src: STORE_LOGO_SRC,
        alt: "Store logo",
        link: "",
        fit: "contain",
        position: "left",
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

  // --- 主标题 ---
  const modHero = `${PREFIX}-mod-hero`;
  const heroTitle = `${PREFIX}-hero-title`;
  const heroSub = `${PREFIX}-hero-sub`;
  addMod(modHero, "模块 · 推荐主标题", [heroTitle, heroSub]);

  reg(heroTitle, "content.text", "推荐主标题", {
    id: heroTitle,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Share your link earn rewards.</p>",
      textBody: textBodyRuns([{ text: "Share your link earn rewards.", bold: true }]),
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
        defaultValue: "Share your link earn rewards.",
        allowExternal: true,
        fieldKind: "content",
        label: "推荐主标题",
      },
      "props.fontSize": themeBinding("tokens.typography.display"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  reg(heroSub, "content.text", "推荐副标题", {
    id: heroSub,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content:
        "<p>Invite friends to discover products you love. You'll both get amazing rewards!</p>",
      textBody: textBodyRuns([
        {
          text: "Invite friends to discover products you love. You'll both get amazing rewards!",
        },
      ]),
      fontSize: themeRef("tokens.typography.body"),
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
        defaultValue:
          "Invite friends to discover products you love. You'll both get amazing rewards!",
        allowExternal: true,
        fieldKind: "content",
        label: "推荐副标题",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.secondary"),
    },
  });

  // --- 奖励摘要卡 ---
  const modRewards = `${PREFIX}-mod-rewards`;
  const youGetLabel = `${PREFIX}-you-get-label`;
  const youGetGrid = `${PREFIX}-you-get-grid`;
  const youPointsCell = `${PREFIX}-you-points`;
  const youCouponCell = `${PREFIX}-you-coupon`;
  const rewardsDivider = `${PREFIX}-rewards-divider`;
  const theyGetLabel = `${PREFIX}-they-get-label`;
  const theyGetRow = `${PREFIX}-they-get-row`;
  const theyGiftIcon = `${PREFIX}-they-gift-icon`;
  const theyGiftValue = `${PREFIX}-they-gift-value`;

  addMod(
    modRewards,
    "模块 · 奖励摘要卡",
    [youGetLabel, youGetGrid, rewardsDivider, theyGetLabel, theyGetRow],
    {
      backgroundColor: "#FFF8E7",
      borderRadius: { mode: "unified", radius: themeRef("tokens.radius.panel") },
    },
    { "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel") },
  );

  const sectionLabel = (id, parentId, name, defaultText, slotId) => {
    reg(id, "content.text", name, {
      id,
      type: "text",
      parentId,
      children: [],
      wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
      props: {
        content: `<p>${defaultText}</p>`,
        textBody: textBodyRuns([{ text: defaultText }]),
        fontSize: themeRef("tokens.typography.caption"),
        color: "#9A7B4F",
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId,
          mode: "variable",
          valueType: "string",
          defaultValue: defaultText,
          allowExternal: true,
          fieldKind: "content",
          label: name,
        },
        "props.fontSize": themeBinding("tokens.typography.caption"),
      },
    });
  };

  sectionLabel(youGetLabel, modRewards, "YOU GET 标签", "YOU GET", "youGetLabel");
  sectionLabel(theyGetLabel, modRewards, "THEY GET 标签", "THEY GET", "theyGetLabel");

  addRewardItem(
    youPointsCell,
    youGetGrid,
    ICON_POINTS,
    "POINTS EARNED",
    "referrerPointsReward",
    "100 Points",
    "推荐人积分",
  );
  addRewardItem(
    youCouponCell,
    youGetGrid,
    ICON_COUPON,
    "COUPON",
    "referrerCouponReward",
    "$10 Off",
    "推荐人优惠券",
  );

  reg(youGetGrid, "layout.grid", "YOU GET 栅格", {
    id: youGetGrid,
    type: "grid",
    parentId: modRewards,
    children: [youPointsCell, youCouponCell],
    wrapperStyle: wsBase(),
    props: {
      columns: 2,
      gap: themeRef("tokens.spacing.gap"),
      cellHeightMode: "content-max",
    },
    bindings: { "props.gap": themeBinding("tokens.spacing.gap") },
  });

  reg(rewardsDivider, "separator.divider", "奖励卡分隔线", {
    id: rewardsDivider,
    type: "divider",
    parentId: modRewards,
    children: [],
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
      contentAlign: contentAlignFromAxes("center", "center"),
      border: border0(),
      borderRadius: radius0(),
    },
    props: { color: "#D4C4A8", lineWidthMode: "fill", height: "1px" },
    bindings: {},
  });

  reg(theyGetRow, "layout.container", "THEY GET 行", {
    id: theyGetRow,
    type: "layout",
    parentId: modRewards,
    children: [theyGiftIcon, theyGiftValue],
    wrapperStyle: wsBase({
      contentAlign: contentAlignFromAxes("start", "center"),
      contentAlign: { horizontal: "left", vertical: "center" },
    }),
    props: { direction: "horizontal", gapMode: "fixed", gap: "12px" },
    bindings: {},
  });

  reg(theyGiftIcon, "content.icon", "好友奖励图标", {
    id: theyGiftIcon,
    type: "icon",
    parentId: theyGetRow,
    children: [],
    wrapperStyle: {
      contentAlign: contentAlignFromAxes("start", "center"),
      widthMode: "hug",
      heightMode: "hug",
      border: border0(),
      borderRadius: radius0(),
    },
    props: { src: ICON_GIFT, color: "#6B4E2E", size: "28px", link: "" },
    bindings: {},
  });

  reg(theyGiftValue, "content.text", "好友奖励说明", {
    id: theyGiftValue,
    type: "text",
    parentId: theyGetRow,
    children: [],
    wrapperStyle: wsBase({
      widthMode: "fill",
      contentAlign: { horizontal: "left", vertical: "center" },
    }),
    props: {
      content: "<p>$10 off COUPON</p>",
      textBody: textBodyRuns([{ text: "$10 off COUPON", bold: true }]),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "friendCouponReward",
        mode: "variable",
        valueType: "string",
        defaultValue: "$10 off COUPON",
        allowExternal: true,
        fieldKind: "content",
        label: "好友优惠券奖励",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  // --- 推荐链接 ---
  const modLink = `${PREFIX}-mod-link`;
  const shareLabel = `${PREFIX}-share-label`;
  const linkRow = `${PREFIX}-link-row`;
  const referralUrlText = `${PREFIX}-referral-url`;
  const copyBtn = `${PREFIX}-copy-btn`;

  addMod(
    modLink,
    "模块 · 推荐链接",
    [shareLabel, linkRow],
    {
      backgroundColor: "#1F2937",
      borderRadius: { mode: "unified", radius: themeRef("tokens.radius.panel") },
    },
    { "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel") },
  );

  reg(shareLabel, "content.text", "分享链接标签", {
    id: shareLabel,
    type: "text",
    parentId: modLink,
    children: [],
    wrapperStyle: wsBase(),
    props: {
      content: "<p>share link</p>",
      textBody: textBodyRuns([{ text: "share link" }]),
      fontSize: themeRef("tokens.typography.caption"),
      color: "#C9A227",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "shareLinkLabel",
        mode: "variable",
        valueType: "string",
        defaultValue: "share link",
        allowExternal: true,
        fieldKind: "content",
        label: "分享链接标签",
      },
      "props.fontSize": themeBinding("tokens.typography.caption"),
    },
  });

  reg(linkRow, "layout.container", "链接与复制行", {
    id: linkRow,
    type: "layout",
    parentId: modLink,
    children: [referralUrlText, copyBtn],
    wrapperStyle: wsBase({ contentAlign: contentAlignFromAxes("start", "center") }),
    props: { direction: "horizontal", gapMode: "fixed", gap: "12px" },
    bindings: {},
  });

  reg(referralUrlText, "content.text", "推荐链接", {
    id: referralUrlText,
    type: "text",
    parentId: linkRow,
    children: [],
    wrapperStyle: wsBase({
      widthMode: "fill",
      contentAlign: { horizontal: "left", vertical: "center" },
    }),
    props: {
      content: "<p>suvia-seven.com/referral?ref=emma-v...</p>",
      textBody: textBodyRuns([{ text: "suvia-seven.com/referral?ref=emma-v..." }]),
      fontSize: themeRef("tokens.typography.caption"),
      color: "#F9FAFB",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "referralLinkDisplay",
        mode: "variable",
        valueType: "string",
        defaultValue: "suvia-seven.com/referral?ref=emma-v...",
        allowExternal: true,
        fieldKind: "content",
        label: "推荐链接展示",
      },
      "props.fontSize": themeBinding("tokens.typography.caption"),
    },
  });

  reg(copyBtn, "action.button", "复制按钮", {
    id: copyBtn,
    type: "button",
    parentId: linkRow,
    children: [],
    wrapperStyle: {
      widthMode: "hug",
      heightMode: "hug",
      contentAlign: contentAlignFromAxes("end", "center"),
      contentAlign: { horizontal: "center", vertical: "center" },
      border: border0(),
      borderRadius: radius0(),
    },
    props: {
      text: "Copy",
      link: "https://suvia-seven.com/referral?ref=emma-v",
      buttonStyle: {
        widthMode: "hug",
        backgroundColor: "#F5E6C8",
        textColor: "#1F2937",
        fontSize: themeRef("tokens.typography.caption"),
        border: border0(),
        borderRadius: { mode: "unified", radius: themeRef("tokens.radius.cta") },
        bold: true,
        italic: false,
      },
    },
    bindings: {
      "props.text": {
        slotId: "copyButtonText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Copy",
        allowExternal: true,
        fieldKind: "content",
        label: "复制按钮文案",
      },
      "props.link": {
        slotId: "referralLinkUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://suvia-seven.com/referral?ref=emma-v",
        allowExternal: true,
        fieldKind: "content",
        label: "推荐链接地址",
      },
      "props.buttonStyle.fontSize": themeBinding("tokens.typography.caption"),
      "props.buttonStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
    },
  });

  // --- 页脚 ---
  const modFooter = `${PREFIX}-mod-footer`;
  const accountPara1 = `${PREFIX}-account-para-1`;
  const accountPara2 = `${PREFIX}-account-para-2`;
  const footerDivider = `${PREFIX}-footer-divider`;
  const contactPara = `${PREFIX}-contact-para`;

  addMod(
    modFooter,
    "模块 · 页脚说明",
    [accountPara1, accountPara2, footerDivider, contactPara],
    { backgroundColor: "#FFFBF5" },
  );

  const accountRuns1 = [
    {
      text: "You need to log into your store account to enjoy member services and savings. I don't have an account. ",
    },
    { text: "Create an account", link: "https://example.com/register", decoration: "underline" },
  ];
  reg(accountPara1, "content.text", "账户说明 1", {
    id: accountPara1,
    type: "text",
    parentId: modFooter,
    children: [],
    wrapperStyle: wsBase(),
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
    parentId: modFooter,
    children: [],
    wrapperStyle: wsBase(),
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

  reg(footerDivider, "separator.divider", "页脚分隔线", {
    id: footerDivider,
    type: "divider",
    parentId: modFooter,
    children: [],
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
      contentAlign: contentAlignFromAxes("center", "center"),
      border: border0(),
      borderRadius: radius0(),
    },
    props: { color: themeRef("colors.secondary"), lineWidthMode: "fill", height: "1px" },
    bindings: { "props.color": themeBinding("colors.secondary") },
  });

  const contactRuns = [
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
  reg(contactPara, "content.text", "联系说明", {
    id: contactPara,
    type: "text",
    parentId: modFooter,
    children: [],
    wrapperStyle: wsBase(),
    props: {
      content: snapshotFromRuns(contactRuns),
      textBody: textBodyRuns(contactRuns),
      fontSize: themeRef("tokens.typography.caption"),
      color: themeRef("colors.secondary"),
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
      "props.fontSize": themeBinding("tokens.typography.caption"),
      "props.color": themeBinding("colors.secondary"),
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
    emailId: "referral_rewards",
    templateId: "referral_rewards",
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
      heroTitleText: "Share your link earn rewards.",
      heroSubtitle:
        "Invite friends to discover products you love. You'll both get amazing rewards!",
      youGetLabel: "YOU GET",
      referrerPointsReward: "100 Points",
      referrerCouponReward: "$10 Off",
      theyGetLabel: "THEY GET",
      friendCouponReward: "$10 off COUPON",
      shareLinkLabel: "share link",
      referralLinkDisplay: "suvia-seven.com/referral?ref=emma-v...",
      referralLinkUrl: "https://suvia-seven.com/referral?ref=emma-v",
      copyButtonText: "Copy",
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
        label: "推荐有奖预设",
        description: "暖奶油奖励卡、深灰链接区与标准间距档位。",
        tokens: normalizeTokenPresetTokens({
          colors: {
            primary: "#1F2937",
            secondary: "#6B7280",
            surface: "#FFFFFF",
          },
          spacing: {
            section: "24px",
            gap: "16px",
            pageInline: "24px",
          },
          typography: {
            display: "30px",
            h1: "22px",
            body: "15px",
            caption: "12px",
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
    displayName: "推荐有奖（Referral Rewards 学习模板）",
    description:
      "店铺 Logo、推荐主标题、奖励摘要卡（YOU GET / THEY GET）、推荐链接与复制、页脚账户与联系；样式经 tokenPresets 统一管理。",
    source: "agent",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    "data/emails/referral-rewards/layouts/default/template.json",
  ],
  { cwd: ROOT, stdio: "inherit" },
);
if (norm.status !== 0) process.exit(norm.status ?? 1);

console.log(`Wrote referral-rewards template to ${OUT_DIR}`);
