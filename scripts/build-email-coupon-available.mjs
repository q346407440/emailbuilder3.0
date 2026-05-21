#!/usr/bin/env node
/**
 * 生成「优惠券可用」学习模板到 data/emails/coupon-available/
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "./lib/token-preset-standard-order.mjs";
import { defaultLayoutDir } from "./lib/email-layout-output.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "emails", "coupon-available");
const LAYOUT_DIR = defaultLayoutDir(OUT_DIR);
const PREFIX = "ca";

const TABLER = (name) =>
  `https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/${name}.svg`;
const LUCIDE = (name) =>
  `https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/${name}.svg`;
const PEX = (id, w = 400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const STORE_LOGO_SRC = TABLER("building-store");
const ICON_GIFT = LUCIDE("gift");
const ICON_CLOCK = TABLER("clock");

const PICKED_PRODUCTS = [
  {
    imageSrc: PEX(1152077),
    imageAlt: "Everyday Crossbody Bag",
    name: "Everyday Crossbody Bag",
    salePrice: "$37",
    originalPrice: "$49",
    badge: "Hot",
    href: "https://example.com/products/crossbody-bag",
  },
  {
    imageSrc: PEX(2905238),
    imageAlt: "Everyday Crossbody Bag",
    name: "Everyday Crossbody Bag",
    salePrice: "$37",
    originalPrice: "$49",
    badge: "Hot",
    href: "https://example.com/products/crossbody-bag-2",
  },
  {
    imageSrc: PEX(1598507),
    imageAlt: "Everyday Crossbody Bag",
    name: "Everyday Crossbody Bag",
    salePrice: "$37",
    originalPrice: "$49",
    badge: "Hot",
    href: "https://example.com/products/crossbody-bag-3",
  },
  {
    imageSrc: PEX(2529148),
    imageAlt: "Everyday Crossbody Bag",
    name: "Everyday Crossbody Bag",
    salePrice: "$37",
    originalPrice: "$49",
    badge: "Hot",
    href: "https://example.com/products/crossbody-bag-4",
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
      if (r.bold) return `<strong>${r.text}</strong>`;
      if (r.decoration === "line-through") return `<s>${r.text}</s>`;
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
    wrapperStyle: wsBase({ placement: placement("start", "start") }),
    props: { direction: "horizontal", gapMode: "fixed", gap: "0" },
    bindings: {},
  });

  reg(logoImg, "content.image", "店铺 Logo", {
    id: logoImg,
    type: "image",
    parentId: logoRow,
    children: [],
    wrapperStyle: {
      placement: placement("start", "center"),
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
  addMod(modHero, "模块 · 优惠券主标题", [heroTitle, heroSub]);

  reg(heroTitle, "content.text", "优惠券主标题", {
    id: heroTitle,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>🎉 Your have Coupon code available</p>",
      textBody: textBodyRuns([{ text: "🎉 Your have Coupon code available", bold: true }]),
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
        defaultValue: "🎉 Your have Coupon code available",
        allowExternal: true,
        fieldKind: "content",
        label: "优惠券主标题",
      },
      "props.fontFamily": themeBinding("fonts.heading"),
      "props.fontSize": themeBinding("tokens.typography.display"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  reg(heroSub, "content.text", "优惠券副标题", {
    id: heroSub,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Use the code below when you check out.</p>",
      textBody: textBodyRuns([{ text: "Use the code below when you check out." }]),
      fontFamily: themeRef("fonts.body"),
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
        defaultValue: "Use the code below when you check out.",
        allowExternal: true,
        fieldKind: "content",
        label: "优惠券副标题",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.secondary"),
    },
  });

  // --- 优惠券卡 ---
  const modCoupon = `${PREFIX}-mod-coupon`;
  const couponSplit = `${PREFIX}-coupon-split`;
  const couponLeft = `${PREFIX}-coupon-left`;
  const couponDivider = `${PREFIX}-coupon-divider`;
  const couponRight = `${PREFIX}-coupon-right`;
  const giftBadgeRow = `${PREFIX}-gift-badge-row`;
  const giftIcon = `${PREFIX}-gift-icon`;
  const giftBadgeText = `${PREFIX}-gift-badge-text`;
  const discountText = `${PREFIX}-discount-text`;
  const expiryRow = `${PREFIX}-expiry-row`;
  const expiryIcon = `${PREFIX}-expiry-icon`;
  const expiryText = `${PREFIX}-expiry-text`;
  const codeLabel = `${PREFIX}-code-label`;
  const codeValue = `${PREFIX}-code-value`;
  const copyBtn = `${PREFIX}-copy-btn`;

  addMod(
    modCoupon,
    "模块 · 优惠券卡",
    [couponSplit],
    {
      backgroundColor: "#FFF0F3",
      borderRadius: { mode: "unified", radius: themeRef("tokens.radius.panel") },
    },
    { "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel") },
  );

  reg(couponSplit, "layout.container", "优惠券左右分栏", {
    id: couponSplit,
    type: "layout",
    parentId: modCoupon,
    children: [couponLeft, couponDivider, couponRight],
    wrapperStyle: wsBase({ placement: placement("start", "start") }),
    props: { direction: "horizontal", gapMode: "fixed", gap: "0" },
    bindings: {},
  });

  reg(couponLeft, "layout.container", "优惠左侧", {
    id: couponLeft,
    type: "layout",
    parentId: couponSplit,
    children: [giftBadgeRow, discountText, expiryRow],
    wrapperStyle: wsBase({
      widthMode: "fill",
      contentAlign: { horizontal: "center", vertical: "top" },
      padding: { mode: "separate", top: "8px", right: "12px", bottom: "8px", left: "8px" },
    }),
    props: { direction: "vertical", gapMode: "fixed", gap: "10px" },
    bindings: {},
  });

  reg(giftBadgeRow, "layout.container", "邀请礼徽章行", {
    id: giftBadgeRow,
    type: "layout",
    parentId: couponLeft,
    children: [giftIcon, giftBadgeText],
    wrapperStyle: {
      ...wsBase({
        placement: placement("center", "start"),
        contentAlign: { horizontal: "center", vertical: "center" },
      }),
      backgroundColor: "#FFFFFF",
      borderRadius: { mode: "unified", radius: "9999px" },
      padding: { mode: "separate", top: "6px", right: "12px", bottom: "6px", left: "10px" },
    },
    props: { direction: "horizontal", gapMode: "fixed", gap: "6px" },
    bindings: {},
  });

  reg(giftIcon, "content.icon", "礼物图标", {
    id: giftIcon,
    type: "icon",
    parentId: giftBadgeRow,
    children: [],
    wrapperStyle: { placement: placement("center", "center"), widthMode: "hug", heightMode: "hug" },
    props: { src: ICON_GIFT, color: "#DC2626", size: "16px", link: "" },
    bindings: {},
  });

  reg(giftBadgeText, "content.text", "邀请礼标签", {
    id: giftBadgeText,
    type: "text",
    parentId: giftBadgeRow,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "center" } }),
    props: {
      content: "<p>INVITATION GIFT</p>",
      textBody: textBodyRuns([{ text: "INVITATION GIFT", bold: true }]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.caption"),
      color: "#DC2626",
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "invitationGiftLabel",
        mode: "variable",
        valueType: "string",
        defaultValue: "INVITATION GIFT",
        allowExternal: true,
        fieldKind: "content",
        label: "邀请礼标签",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.caption"),
    },
  });

  reg(discountText, "content.text", "折扣力度", {
    id: discountText,
    type: "text",
    parentId: couponLeft,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>10 % OFF</p>",
      textBody: textBodyRuns([{ text: "10 % OFF", bold: true }]),
      fontFamily: themeRef("fonts.heading"),
      fontSize: themeRef("tokens.typography.display"),
      color: "#DC2626",
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "discountAmount",
        mode: "variable",
        valueType: "string",
        defaultValue: "10 % OFF",
        allowExternal: true,
        fieldKind: "content",
        label: "折扣力度",
      },
      "props.fontFamily": themeBinding("fonts.heading"),
      "props.fontSize": themeBinding("tokens.typography.display"),
    },
  });

  reg(expiryRow, "layout.container", "过期说明行", {
    id: expiryRow,
    type: "layout",
    parentId: couponLeft,
    children: [expiryIcon, expiryText],
    wrapperStyle: wsBase({
      placement: placement("center", "start"),
      contentAlign: { horizontal: "center", vertical: "center" },
    }),
    props: { direction: "horizontal", gapMode: "fixed", gap: "6px" },
    bindings: {},
  });

  reg(expiryIcon, "content.icon", "时钟图标", {
    id: expiryIcon,
    type: "icon",
    parentId: expiryRow,
    children: [],
    wrapperStyle: { widthMode: "hug", heightMode: "hug", placement: placement("center", "center") },
    props: { src: ICON_CLOCK, color: "#9CA3AF", size: "14px", link: "" },
    bindings: {},
  });

  reg(expiryText, "content.text", "过期说明", {
    id: expiryText,
    type: "text",
    parentId: expiryRow,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "center" } }),
    props: {
      content: "<p>Expires in 14 days</p>",
      textBody: textBodyRuns([{ text: "Expires in 14 days" }]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.caption"),
      color: themeRef("colors.secondary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "couponExpiryText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Expires in 14 days",
        allowExternal: true,
        fieldKind: "content",
        label: "优惠券过期说明",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.caption"),
      "props.color": themeBinding("colors.secondary"),
    },
  });

  reg(couponDivider, "layout.container", "优惠券竖分隔", {
    id: couponDivider,
    type: "layout",
    parentId: couponSplit,
    children: [],
    wrapperStyle: {
      widthMode: "fixed",
      width: "1px",
      heightMode: "fill",
      backgroundColor: "#F0C4CF",
      border: border0(),
      borderRadius: radius0(),
    },
    props: { direction: "vertical", gapMode: "fixed", gap: "0" },
    bindings: {},
  });

  reg(couponRight, "layout.container", "优惠码右侧", {
    id: couponRight,
    type: "layout",
    parentId: couponSplit,
    children: [codeLabel, codeValue, copyBtn],
    wrapperStyle: wsBase({
      widthMode: "fill",
      contentAlign: { horizontal: "center", vertical: "top" },
      padding: { mode: "separate", top: "12px", right: "12px", bottom: "12px", left: "12px" },
    }),
    props: { direction: "vertical", gapMode: "fixed", gap: "10px" },
    bindings: {},
  });

  reg(codeLabel, "content.text", "优惠码标签", {
    id: codeLabel,
    type: "text",
    parentId: couponRight,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>YOUR CODE</p>",
      textBody: textBodyRuns([{ text: "YOUR CODE" }]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.caption"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "couponCodeLabel",
        mode: "variable",
        valueType: "string",
        defaultValue: "YOUR CODE",
        allowExternal: true,
        fieldKind: "content",
        label: "优惠码标签",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.caption"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  reg(codeValue, "content.text", "优惠码", {
    id: codeValue,
    type: "text",
    parentId: couponRight,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>GTLHGTYY</p>",
      textBody: textBodyRuns([{ text: "GTLHGTYY", bold: true }]),
      fontFamily: themeRef("fonts.heading"),
      fontSize: themeRef("tokens.typography.h1"),
      color: themeRef("colors.primary"),
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "couponCodeValue",
        mode: "variable",
        valueType: "string",
        defaultValue: "GTLHGTYY",
        allowExternal: true,
        fieldKind: "content",
        label: "优惠码",
      },
      "props.fontFamily": themeBinding("fonts.heading"),
      "props.fontSize": themeBinding("tokens.typography.h1"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  reg(copyBtn, "action.button", "复制按钮", {
    id: copyBtn,
    type: "button",
    parentId: couponRight,
    children: [],
    wrapperStyle: wsBase({
      contentAlign: { horizontal: "center", vertical: "top" },
      placement: placement("center", "start"),
    }),
    props: {
      text: "COPY",
      link: "https://example.com/shop?coupon=GTLHGTYY",
      buttonStyle: {
        widthMode: "hug",
        backgroundColor: "#111111",
        textColor: "#FFFFFF",
        fontFamily: themeRef("fonts.body"),
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
        defaultValue: "COPY",
        allowExternal: true,
        fieldKind: "content",
        label: "复制按钮文案",
      },
      "props.link": {
        slotId: "couponRedeemUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/shop?coupon=GTLHGTYY",
        allowExternal: true,
        fieldKind: "content",
        label: "优惠券兑换链接",
      },
      "props.buttonStyle.fontFamily": themeBinding("fonts.body"),
      "props.buttonStyle.fontSize": themeBinding("tokens.typography.caption"),
      "props.buttonStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
    },
  });

  // --- 精选商品 ---
  const modPicked = `${PREFIX}-mod-picked`;
  const pickedGrid = `${PREFIX}-picked-grid`;
  const pickedCellIds = PICKED_PRODUCTS.map((_, i) => `${PREFIX}-picked-cell-${i + 1}`);
  addMod(modPicked, "模块 · 精选商品", [pickedGrid]);

  const pickedMeta = {
    defaultItems: PICKED_PRODUCTS,
    meta: {
      label: "精选商品列表",
      description: "2×2 商品栅格，固定 4 项。",
      itemFields: [
        { key: "imageSrc", label: "商品图", valueType: "image", required: true },
        { key: "imageAlt", label: "图片替代文字", valueType: "string", required: true },
        { key: "name", label: "商品名", valueType: "string", required: true },
        { key: "salePrice", label: "现价", valueType: "string", required: true },
        { key: "originalPrice", label: "原价", valueType: "string", required: true },
        { key: "badge", label: "角标", valueType: "string", required: true },
        { key: "href", label: "商品链接", valueType: "url", required: true },
      ],
      minItems: 4,
      maxItems: 4,
    },
  };

  PICKED_PRODUCTS.forEach((item, i) => {
    const cellId = pickedCellIds[i];
    const imgWrapId = `${cellId}-img-wrap`;
    const badgeId = `${cellId}-badge`;
    const nameId = `${cellId}-name`;
    const priceRowId = `${cellId}-price-row`;
    const saleId = `${cellId}-sale`;
    const origId = `${cellId}-original`;

    reg(cellId, "layout.container", `商品卡 ${i + 1}`, {
      id: cellId,
      type: "layout",
      parentId: pickedGrid,
      children: [imgWrapId, nameId, priceRowId],
      wrapperStyle: wsBase(),
      props: { direction: "vertical", gapMode: "fixed", gap: "8px" },
      bindings: {},
    });

    reg(imgWrapId, "layout.container", `商品图 ${i + 1}`, {
      id: imgWrapId,
      type: "layout",
      parentId: cellId,
      children: [badgeId],
      wrapperStyle: {
        placement: placement("center", "start"),
        widthMode: "fill",
        heightMode: "fixed",
        height: "140px",
        border: border0(),
        borderRadius: { mode: "unified", radius: themeRef("tokens.radius.panel") },
        backgroundImage: {
          src: item.imageSrc,
          alt: item.imageAlt,
          link: item.href,
          fit: "cover",
          position: "center",
          borderRadius: { mode: "unified", radius: themeRef("tokens.radius.panel") },
          border: border0(),
        },
        backgroundContentAlign: { horizontal: "left", vertical: "top" },
        padding: { mode: "separate", top: "8px", right: "0", bottom: "0", left: "8px" },
      },
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {
        "wrapperStyle.backgroundImage.src": {
          slotId: "pickedProducts",
          mode: "variable",
          valueType: "collection",
          defaultValue: pickedMeta.defaultItems,
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.imageSrc`,
          ...(i === 0 ? pickedMeta.meta : {}),
        },
        "wrapperStyle.backgroundImage.alt": {
          slotId: "pickedProducts",
          mode: "variable",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.imageAlt`,
        },
        "wrapperStyle.backgroundImage.link": {
          slotId: "pickedProducts",
          mode: "variable",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.href`,
        },
        "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
        "wrapperStyle.backgroundImage.borderRadius.radius": themeBinding("tokens.radius.panel"),
      },
    });

    reg(badgeId, "content.text", `商品角标 ${i + 1}`, {
      id: badgeId,
      type: "text",
      parentId: imgWrapId,
      children: [],
      wrapperStyle: wsBase({
        widthMode: "hug",
        heightMode: "hug",
        contentAlign: { horizontal: "center", vertical: "center" },
        backgroundColor: "#DC2626",
        borderRadius: { mode: "unified", radius: "6px" },
        padding: { mode: "separate", top: "4px", right: "8px", bottom: "4px", left: "8px" },
      }),
      props: {
        content: `<p>${item.badge}</p>`,
        textBody: textBodyRuns([{ text: item.badge, bold: true }]),
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.caption"),
        color: "#FFFFFF",
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: "pickedProducts",
          mode: "variable",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.badge`,
        },
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.caption"),
      },
    });

    reg(nameId, "content.text", `商品名 ${i + 1}`, {
      id: nameId,
      type: "text",
      parentId: cellId,
      children: [],
      wrapperStyle: wsBase(),
      props: {
        content: `<p>${item.name}</p>`,
        textBody: textBodyRuns([{ text: item.name }]),
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.body"),
        color: themeRef("colors.primary"),
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: "pickedProducts",
          mode: "variable",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.name`,
        },
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.body"),
        "props.color": themeBinding("colors.primary"),
      },
    });

    reg(priceRowId, "layout.container", `商品价格行 ${i + 1}`, {
      id: priceRowId,
      type: "layout",
      parentId: cellId,
      children: [saleId, origId],
      wrapperStyle: wsBase(),
      props: { direction: "horizontal", gapMode: "fixed", gap: "6px" },
      bindings: {},
    });

    reg(saleId, "content.text", `现价 ${i + 1}`, {
      id: saleId,
      type: "text",
      parentId: priceRowId,
      children: [],
      wrapperStyle: wsBase({ widthMode: "hug" }),
      props: {
        content: `<p><strong>${item.salePrice}</strong></p>`,
        textBody: textBodyRuns([{ text: item.salePrice, bold: true }]),
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.body"),
        color: themeRef("colors.primary"),
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: "pickedProducts",
          mode: "variable",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.salePrice`,
        },
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.body"),
        "props.color": themeBinding("colors.primary"),
      },
    });

    reg(origId, "content.text", `原价 ${i + 1}`, {
      id: origId,
      type: "text",
      parentId: priceRowId,
      children: [],
      wrapperStyle: wsBase({ widthMode: "hug" }),
      props: {
        content: `<p><s>${item.originalPrice}</s></p>`,
        textBody: textBodyRuns([{ text: item.originalPrice, decoration: "line-through" }]),
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.body"),
        color: themeRef("colors.secondary"),
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: "pickedProducts",
          mode: "variable",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.originalPrice`,
        },
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.body"),
        "props.color": themeBinding("colors.secondary"),
      },
    });
  });

  reg(pickedGrid, "layout.grid", "精选商品栅格", {
    id: pickedGrid,
    type: "grid",
    parentId: modPicked,
    children: pickedCellIds,
    wrapperStyle: wsBase(),
    props: {
      columns: 2,
      gap: themeRef("tokens.spacing.gap"),
      cellHeightMode: "content-max",
    },
    bindings: { "props.gap": themeBinding("tokens.spacing.gap") },
  });

  // --- 主按钮 ---
  const modCta = `${PREFIX}-mod-cta`;
  const shopBtn = `${PREFIX}-shop-btn`;
  addMod(modCta, "模块 · 购物主按钮", [shopBtn]);

  reg(shopBtn, "action.button", "购物主按钮", {
    id: shopBtn,
    type: "button",
    parentId: modCta,
    children: [],
    wrapperStyle: wsBase({
      contentAlign: { horizontal: "center", vertical: "top" },
      placement: placement("center", "start"),
    }),
    props: {
      text: "SHOP NOW →",
      link: "https://example.com/shop",
      buttonStyle: {
        widthMode: "hug",
        backgroundColor: "#DC2626",
        textColor: "#FFFFFF",
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
        slotId: "shopCtaText",
        mode: "variable",
        valueType: "string",
        defaultValue: "SHOP NOW →",
        allowExternal: true,
        fieldKind: "content",
        label: "购物主按钮文案",
      },
      "props.link": {
        slotId: "shopCtaUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/shop",
        allowExternal: true,
        fieldKind: "content",
        label: "购物主按钮链接",
      },
      "props.buttonStyle.fontFamily": themeBinding("fonts.body"),
      "props.buttonStyle.fontSize": themeBinding("tokens.typography.body"),
      "props.buttonStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
    },
  });

  // --- 页脚 ---
  const modFooter = `${PREFIX}-mod-footer`;
  const accountPara = `${PREFIX}-account-para`;
  const contactPara = `${PREFIX}-contact-para`;
  addMod(modFooter, "模块 · 页脚说明", [accountPara, contactPara], {
    backgroundColor: "#FFFBF5",
  });

  const accountRuns = [
    {
      text: "You need to log into your store account to enjoy member discounts and points redemption benefits. I don't have an account. ",
    },
    { text: "Create an account", link: "https://example.com/register", decoration: "underline" },
    {
      text: " If you agree to join the membership during Checkout, we have created an account for you. ",
    },
    { text: "Reset password", link: "https://example.com/reset-password", decoration: "underline" },
  ];
  reg(accountPara, "content.text", "账户说明", {
    id: accountPara,
    type: "text",
    parentId: modFooter,
    children: [],
    wrapperStyle: wsBase(),
    props: {
      content: snapshotFromRuns(accountRuns),
      textBody: textBodyRuns(accountRuns),
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
      "props.textBody.paragraphs.0.runs.3.link": {
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
      fontFamily: themeRef("fonts.body"),
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
      "props.fontFamily": themeBinding("fonts.body"),
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
    emailId: "coupon_available",
    templateId: "coupon_available",
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
      heroTitleText: "🎉 Your have Coupon code available",
      heroSubtitle: "Use the code below when you check out.",
      invitationGiftLabel: "INVITATION GIFT",
      discountAmount: "10 % OFF",
      couponExpiryText: "Expires in 14 days",
      couponCodeLabel: "YOUR CODE",
      couponCodeValue: "GTLHGTYY",
      copyButtonText: "COPY",
      couponRedeemUrl: "https://example.com/shop?coupon=GTLHGTYY",
      pickedProducts: PICKED_PRODUCTS,
      shopCtaText: "SHOP NOW →",
      shopCtaUrl: "https://example.com/shop",
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
        label: "优惠券可用预设",
        description: "浅粉优惠券卡、红色 CTA 与标准间距档位。",
        tokens: normalizeTokenPresetTokens({
          colors: {
            primary: "#1F2937",
            secondary: "#6B7280",
            surface: "#FFFFFF",
          },
          fonts: {
            heading:
              "'Segoe UI'",
            body:
              "'Segoe UI'",
          },
          spacing: {
            section: "24px",
            gap: "16px",
            pageInline: "24px",
          },
          typography: {
            display: "28px",
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
    displayName: "优惠券可用（Coupon Available 学习模板）",
    description:
      "店铺 Logo、优惠券主标题、左右分栏优惠券卡、精选商品栅格、红色购物 CTA、页脚账户与联系；样式经 tokenPresets 统一管理。",
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
    "data/emails/coupon-available/layouts/default/template.json",
  ],
  { cwd: ROOT, stdio: "inherit" },
);
if (norm.status !== 0) process.exit(norm.status ?? 1);

console.log(`Wrote coupon-available template to ${OUT_DIR}`);
