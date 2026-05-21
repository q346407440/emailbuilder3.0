#!/usr/bin/env node
/**
 * 生成「好友加入获奖」学习模板到 data/emails/referral-friend-joined/
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "./lib/token-preset-standard-order.mjs";
import { defaultLayoutDir } from "./lib/email-layout-output.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "emails", "referral-friend-joined");
const LAYOUT_DIR = defaultLayoutDir(OUT_DIR);
const PREFIX = "rfj";

const TABLER = (name) =>
  `https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/${name}.svg`;
const PEX = (id, w = 400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const STORE_LOGO_SRC = TABLER("building-store");
const ICON_POINTS = TABLER("coins");
const ICON_COUPON = TABLER("tag");

const PICKED_PRODUCTS = [
  {
    imageSrc: PEX(1152077),
    imageAlt: "Everyday Crossbody Bag",
    name: "Everyday Crossbody Bag",
    salePrice: "$37",
    originalPrice: "$49",
    badge: "20% OFF",
    href: "https://example.com/products/crossbody-bag",
  },
  {
    imageSrc: PEX(2905238),
    imageAlt: "Everyday Crossbody Bag",
    name: "Everyday Crossbody Bag",
    salePrice: "$37",
    originalPrice: "$49",
    badge: "20% OFF",
    href: "https://example.com/products/crossbody-bag-2",
  },
  {
    imageSrc: PEX(1598507),
    imageAlt: "Everyday Crossbody Bag",
    name: "Everyday Crossbody Bag",
    salePrice: "$37",
    originalPrice: "$49",
    badge: "20% OFF",
    href: "https://example.com/products/crossbody-bag-3",
  },
  {
    imageSrc: PEX(2529148),
    imageAlt: "Everyday Crossbody Bag",
    name: "Everyday Crossbody Bag",
    salePrice: "$37",
    originalPrice: "$49",
    badge: "20% OFF",
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

  const addRewardStat = (baseId, parentId, iconSrc, label, valueSlotId, valueDefault, labelText) => {
    reg(baseId, "layout.container", labelText, {
      id: baseId,
      type: "layout",
      parentId,
      children: [`${baseId}-icon`, `${baseId}-lbl`, `${baseId}-val`],
      wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
      props: { direction: "vertical", gapMode: "fixed", gap: "6px" },
      bindings: {},
    });

    reg(`${baseId}-icon`, "content.icon", `${labelText} 图标`, {
      id: `${baseId}-icon`,
      type: "icon",
      parentId: baseId,
      children: [],
      wrapperStyle: {
        placement: placement("center", "start"),
        widthMode: "hug",
        heightMode: "hug",
        border: border0(),
        borderRadius: radius0(),
      },
      props: { src: iconSrc, color: "#6B4E2E", size: "28px", link: "" },
      bindings: {},
    });

    reg(`${baseId}-lbl`, "content.text", `${labelText} 标签`, {
      id: `${baseId}-lbl`,
      type: "text",
      parentId: baseId,
      children: [],
      wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
      props: {
        content: `<p>${label}</p>`,
        textBody: textBodyRuns([{ text: label }]),
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.caption"),
        color: "#9A7B4F",
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.caption"),
      },
    });

    reg(`${baseId}-val`, "content.text", `${labelText} 数值`, {
      id: `${baseId}-val`,
      type: "text",
      parentId: baseId,
      children: [],
      wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
      props: {
        content: `<p>${valueDefault}</p>`,
        textBody: textBodyRuns([{ text: valueDefault, bold: true }]),
        fontFamily: themeRef("fonts.heading"),
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
        "props.fontFamily": themeBinding("fonts.heading"),
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
  addMod(modHero, "模块 · 获奖主标题", [heroTitle, heroSub]);

  reg(heroTitle, "content.text", "获奖主标题", {
    id: heroTitle,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Your friend joined earn rewards.</p>",
      textBody: textBodyRuns([{ text: "Your friend joined earn rewards.", bold: true }]),
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
        defaultValue: "Your friend joined earn rewards.",
        allowExternal: true,
        fieldKind: "content",
        label: "获奖主标题",
      },
      "props.fontFamily": themeBinding("fonts.heading"),
      "props.fontSize": themeBinding("tokens.typography.display"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  reg(heroSub, "content.text", "获奖副标题", {
    id: heroSub,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content:
        "<p>Thanks for inviting — your points and coupon are now active in your account.</p>",
      textBody: textBodyRuns([
        {
          text: "Thanks for inviting — your points and coupon are now active in your account.",
        },
      ]),
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
        defaultValue:
          "Thanks for inviting — your points and coupon are now active in your account.",
        allowExternal: true,
        fieldKind: "content",
        label: "获奖副标题",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.secondary"),
    },
  });

  // --- 奖励摘要卡 ---
  const modRewards = `${PREFIX}-mod-rewards`;
  const youGetLabel = `${PREFIX}-you-get-label`;
  const youGetGrid = `${PREFIX}-you-get-grid`;
  const youPoints = `${PREFIX}-you-points`;
  const youCoupon = `${PREFIX}-you-coupon`;
  const codeBox = `${PREFIX}-code-box`;
  const codeLabel = `${PREFIX}-code-label`;
  const codeRow = `${PREFIX}-code-row`;
  const couponCodeText = `${PREFIX}-coupon-code`;
  const codeCopyBtn = `${PREFIX}-code-copy-btn`;

  addMod(
    modRewards,
    "模块 · 奖励摘要卡",
    [youGetLabel, youGetGrid, codeBox],
    {
      backgroundColor: "#FFF8E7",
      borderRadius: { mode: "unified", radius: themeRef("tokens.radius.panel") },
    },
    { "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel") },
  );

  reg(youGetLabel, "content.text", "YOU GET 标签", {
    id: youGetLabel,
    type: "text",
    parentId: modRewards,
    children: [],
    wrapperStyle: wsBase(),
    props: {
      content: "<p>YOU GET</p>",
      textBody: textBodyRuns([{ text: "YOU GET", bold: true }]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.caption"),
      color: "#9A7B4F",
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "youGetLabel",
        mode: "variable",
        valueType: "string",
        defaultValue: "YOU GET",
        allowExternal: true,
        fieldKind: "content",
        label: "YOU GET 标签",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.caption"),
    },
  });

  addRewardStat(
    youPoints,
    youGetGrid,
    ICON_POINTS,
    "POINTS EARNED",
    "referrerPointsReward",
    "100 Points",
    "积分奖励",
  );
  addRewardStat(
    youCoupon,
    youGetGrid,
    ICON_COUPON,
    "COUPON",
    "referrerCouponReward",
    "$10 Off",
    "优惠券奖励",
  );

  reg(youGetGrid, "layout.grid", "YOU GET 栅格", {
    id: youGetGrid,
    type: "grid",
    parentId: modRewards,
    children: [youPoints, youCoupon],
    wrapperStyle: wsBase(),
    props: {
      columns: 2,
      gap: themeRef("tokens.spacing.gap"),
      cellHeightMode: "content-max",
    },
    bindings: { "props.gap": themeBinding("tokens.spacing.gap") },
  });

  reg(codeBox, "layout.container", "优惠码白底区", {
    id: codeBox,
    type: "layout",
    parentId: modRewards,
    children: [codeLabel, codeRow],
    wrapperStyle: wsBase({
      backgroundColor: "#FFFFFF",
      borderRadius: { mode: "unified", radius: themeRef("tokens.radius.cta") },
      padding: {
        mode: "separate",
        top: "16px",
        right: "16px",
        bottom: "16px",
        left: "16px",
      },
    }),
    props: { direction: "vertical", gapMode: "fixed", gap: "10px" },
    bindings: {
      "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
    },
  });

  reg(codeLabel, "content.text", "优惠码标签", {
    id: codeLabel,
    type: "text",
    parentId: codeBox,
    children: [],
    wrapperStyle: wsBase(),
    props: {
      content: "<p>Coupon Code</p>",
      textBody: textBodyRuns([{ text: "Coupon Code" }]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.caption"),
      color: themeRef("colors.secondary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "couponCodeLabel",
        mode: "variable",
        valueType: "string",
        defaultValue: "Coupon Code",
        allowExternal: true,
        fieldKind: "content",
        label: "优惠码标签",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.caption"),
      "props.color": themeBinding("colors.secondary"),
    },
  });

  reg(codeRow, "layout.container", "优惠码与复制行", {
    id: codeRow,
    type: "layout",
    parentId: codeBox,
    children: [couponCodeText, codeCopyBtn],
    wrapperStyle: wsBase({ placement: placement("start", "center") }),
    props: { direction: "horizontal", gapMode: "fixed", gap: "12px" },
    bindings: {},
  });

  reg(couponCodeText, "content.text", "优惠码", {
    id: couponCodeText,
    type: "text",
    parentId: codeRow,
    children: [],
    wrapperStyle: wsBase({
      widthMode: "fill",
      contentAlign: { horizontal: "left", vertical: "center" },
    }),
    props: {
      content: "<p>REWARD-25</p>",
      textBody: textBodyRuns([{ text: "REWARD-25", bold: true }]),
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
        defaultValue: "REWARD-25",
        allowExternal: true,
        fieldKind: "content",
        label: "优惠码",
      },
      "props.fontFamily": themeBinding("fonts.heading"),
      "props.fontSize": themeBinding("tokens.typography.h1"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  reg(codeCopyBtn, "action.button", "优惠码复制按钮", {
    id: codeCopyBtn,
    type: "button",
    parentId: codeRow,
    children: [],
    wrapperStyle: {
      widthMode: "hug",
      heightMode: "hug",
      placement: placement("end", "center"),
      border: border0(),
      borderRadius: radius0(),
    },
    props: {
      text: "Copy",
      link: "https://example.com/shop?coupon=REWARD-25",
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
        slotId: "couponCopyButtonText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Copy",
        allowExternal: true,
        fieldKind: "content",
        label: "优惠码复制按钮文案",
      },
      "props.link": {
        slotId: "couponRedeemUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/shop?coupon=REWARD-25",
        allowExternal: true,
        fieldKind: "content",
        label: "优惠码兑换链接",
      },
      "props.buttonStyle.fontFamily": themeBinding("fonts.body"),
      "props.buttonStyle.fontSize": themeBinding("tokens.typography.caption"),
      "props.buttonStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
    },
  });

  // --- 精选商品 ---
  const modPicked = `${PREFIX}-mod-picked`;
  const pickedTitle = `${PREFIX}-picked-title`;
  const pickedDesc = `${PREFIX}-picked-desc`;
  const pickedGrid = `${PREFIX}-picked-grid`;
  const pickedCellIds = PICKED_PRODUCTS.map((_, i) => `${PREFIX}-picked-cell-${i + 1}`);

  addMod(modPicked, "模块 · 精选商品", [pickedTitle, pickedDesc, pickedGrid]);

  reg(pickedTitle, "content.text", "精选区标题", {
    id: pickedTitle,
    type: "text",
    parentId: modPicked,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Picked for you</p>",
      textBody: textBodyRuns([{ text: "Picked for you", bold: true }]),
      fontFamily: themeRef("fonts.heading"),
      fontSize: themeRef("tokens.typography.h1"),
      color: themeRef("colors.primary"),
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "pickedSectionTitle",
        mode: "variable",
        valueType: "string",
        defaultValue: "Picked for you",
        allowExternal: true,
        fieldKind: "content",
        label: "精选区标题",
      },
      "props.fontFamily": themeBinding("fonts.heading"),
      "props.fontSize": themeBinding("tokens.typography.h1"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  reg(pickedDesc, "content.text", "精选区说明", {
    id: pickedDesc,
    type: "text",
    parentId: modPicked,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content:
        "<p>Use the points and code below when you select the items you want.</p>",
      textBody: textBodyRuns([
        { text: "Use the points and code below when you select the items you want." },
      ]),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.secondary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "pickedSectionDesc",
        mode: "variable",
        valueType: "string",
        defaultValue: "Use the points and code below when you select the items you want.",
        allowExternal: true,
        fieldKind: "content",
        label: "精选区说明",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.secondary"),
    },
  });

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
      text: "SHOP WITH YOUR REWARDS ->",
      link: "https://example.com/shop",
      buttonStyle: {
        widthMode: "hug",
        backgroundColor: "#111111",
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
        defaultValue: "SHOP WITH YOUR REWARDS ->",
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
  const accountPara1 = `${PREFIX}-account-para-1`;
  const accountPara2 = `${PREFIX}-account-para-2`;
  const contactPara = `${PREFIX}-contact-para`;
  addMod(modFooter, "模块 · 页脚说明", [accountPara1, accountPara2, contactPara], {
    backgroundColor: "#FFFBF5",
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
    parentId: modFooter,
    children: [],
    wrapperStyle: wsBase(),
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
    parentId: modFooter,
    children: [],
    wrapperStyle: wsBase(),
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
    emailId: "referral_friend_joined",
    templateId: "referral_friend_joined",
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
      heroTitleText: "Your friend joined earn rewards.",
      heroSubtitle:
        "Thanks for inviting — your points and coupon are now active in your account.",
      youGetLabel: "YOU GET",
      referrerPointsReward: "100 Points",
      referrerCouponReward: "$10 Off",
      couponCodeLabel: "Coupon Code",
      couponCodeValue: "REWARD-25",
      couponCopyButtonText: "Copy",
      couponRedeemUrl: "https://example.com/shop?coupon=REWARD-25",
      pickedSectionTitle: "Picked for you",
      pickedSectionDesc: "Use the points and code below when you select the items you want.",
      pickedProducts: PICKED_PRODUCTS,
      shopCtaText: "SHOP WITH YOUR REWARDS ->",
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
        label: "好友加入获奖预设",
        description: "暖奶油奖励卡、商品栅格与标准间距档位。",
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
    displayName: "好友加入获奖（Friend Joined Rewards 学习模板）",
    description:
      "店铺 Logo、获奖主标题、奖励摘要卡（含优惠码）、精选商品栅格、购物 CTA、页脚账户与联系；样式经 tokenPresets 统一管理。",
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
    "data/emails/referral-friend-joined/layouts/default/template.json",
  ],
  { cwd: ROOT, stdio: "inherit" },
);
if (norm.status !== 0) process.exit(norm.status ?? 1);

console.log(`Wrote referral-friend-joined template to ${OUT_DIR}`);
