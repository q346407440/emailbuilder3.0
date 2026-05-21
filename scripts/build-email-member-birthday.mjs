#!/usr/bin/env node
/**
 * 生成「会员生日」学习模板到 data/emails/member-birthday/
 * 配置母版：模块壳 + tokenPresets 标准 14 键 + payload 变量。
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "./lib/token-preset-standard-order.mjs";
import { defaultLayoutDir } from "./lib/email-layout-output.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "emails", "member-birthday");
const LAYOUT_DIR = defaultLayoutDir(OUT_DIR);
const PREFIX = "bd";

const TABLER = (name) =>
  `https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/${name}.svg`;
const PEX = (id, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const STORE_LOGO_SRC = TABLER("building-store");
const HERO_BIRTHDAY_SRC = PEX(3609494, 800);

const COUPONS = [
  {
    offer: "10% OFF",
    title: "Order enjoys 10% off",
    desc: "Available when the order amount exceeds $300",
  },
  {
    offer: "10% OFF",
    title: "Product enjoys a 10% discount",
    desc: "Available when the order amount exceeds $10",
  },
  {
    offer: "FREE SHIPPING",
    title: "Order over $300 for free shipping",
    desc: "Available when the order amount exceeds $300",
  },
  {
    offer: "FREE PRODUCT",
    title: "Buy 1 Get 1 Free",
    desc: "No threshold",
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

const textBlock = (id, parentId, name, runs, opts) => ({
  id,
  type: "text",
  parentId,
  children: [],
  wrapperStyle: wsBase({
    contentAlign: { horizontal: opts.align ?? "center", vertical: "top" },
  }),
  props: {
    content: snapshotFromRuns(runs),
    textBody: textBodyRuns(runs),
    fontFamily: opts.fontFamily ?? themeRef("fonts.body"),
    fontSize: opts.fontSize ?? themeRef("tokens.typography.body"),
    color: opts.color ?? themeRef("colors.primary"),
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    decoration: opts.decoration ?? "none",
  },
  bindings: opts.bindings ?? {},
});

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

  // --- 模块 · 生日主视觉 ---
  const modHero = `${PREFIX}-mod-hero`;
  const heroImg = `${PREFIX}-hero-img`;
  const heroDear = `${PREFIX}-hero-dear`;
  const heroTitle = `${PREFIX}-hero-title`;
  const heroSub = `${PREFIX}-hero-sub`;
  addMod(modHero, "模块 · 生日主视觉", [heroImg, heroDear, heroTitle, heroSub]);

  reg(heroImg, "content.image", "生日头图", {
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
        src: HERO_BIRTHDAY_SRC,
        alt: "Happy Birthday",
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
        slotId: "heroBirthdayImageSrc",
        mode: "variable",
        valueType: "image",
        defaultValue: HERO_BIRTHDAY_SRC,
        allowExternal: true,
        fieldKind: "content",
        label: "生日主视觉头图",
      },
      "wrapperStyle.backgroundImage.alt": {
        slotId: "heroBirthdayImageAlt",
        mode: "variable",
        valueType: "string",
        defaultValue: "Happy Birthday",
        allowExternal: true,
        fieldKind: "content",
        label: "生日头图替代文字",
      },
      "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
      "wrapperStyle.backgroundImage.borderRadius.radius": themeBinding("tokens.radius.panel"),
    },
  });

  reg(heroDear, "content.text", "生日称呼", {
    ...textBlock(
      heroDear,
      modHero,
      "生日称呼",
      [{ text: "Dear member", italic: true }],
      {
        align: "center",
        fontFamily: themeRef("fonts.heading"),
        fontSize: themeRef("tokens.typography.h1"),
        italic: true,
        bindings: {
          "props.textBody.paragraphs.0.runs.0.text": {
            slotId: "heroDearText",
            mode: "variable",
            valueType: "string",
            defaultValue: "Dear member",
            allowExternal: true,
            fieldKind: "content",
            label: "生日称呼",
          },
          "props.fontFamily": themeBinding("fonts.heading"),
          "props.fontSize": themeBinding("tokens.typography.h1"),
          "props.color": themeBinding("colors.primary"),
        },
      },
    ),
    id: heroDear,
    parentId: modHero,
  });

  reg(heroTitle, "content.text", "生日大标题", {
    ...textBlock(heroTitle, modHero, "生日大标题", [{ text: "Happy Birthday", bold: true }], {
      align: "center",
      fontFamily: themeRef("fonts.heading"),
      fontSize: themeRef("tokens.typography.display"),
      bold: true,
        bindings: {
          "props.textBody.paragraphs.0.runs.0.text": {
            slotId: "heroTitleText",
            mode: "variable",
            valueType: "string",
            defaultValue: "Happy Birthday",
            allowExternal: true,
            fieldKind: "content",
            label: "生日大标题",
          },
          "props.fontFamily": themeBinding("fonts.heading"),
          "props.fontSize": themeBinding("tokens.typography.display"),
          "props.color": themeBinding("colors.primary"),
        },
    }),
    id: heroTitle,
    parentId: modHero,
  });

  reg(heroSub, "content.text", "生日副标题", {
    ...textBlock(
      heroSub,
      modHero,
      "生日副标题",
      [
        {
          text: "we provide you with more member services and discounts",
        },
      ],
      {
        align: "center",
        fontSize: themeRef("tokens.typography.caption"),
        color: themeRef("colors.secondary"),
        bindings: {
          "props.textBody.paragraphs.0.runs.0.text": {
            slotId: "heroSubtitle",
            mode: "variable",
            valueType: "string",
            defaultValue: "we provide you with more member services and discounts",
            allowExternal: true,
            fieldKind: "content",
            label: "生日副标题",
          },
          "props.fontFamily": themeBinding("fonts.body"),
          "props.fontSize": themeBinding("tokens.typography.caption"),
          "props.color": themeBinding("colors.secondary"),
        },
      },
    ),
    id: heroSub,
    parentId: modHero,
  });

  // --- 模块 · 问候与积分 ---
  const modGreeting = `${PREFIX}-mod-greeting`;
  const greetingText = `${PREFIX}-greeting-text`;
  const pointsBox = `${PREFIX}-points-box`;
  const pointsText = `${PREFIX}-points-text`;
  const pointsNote = `${PREFIX}-points-note`;
  addMod(modGreeting, "模块 · 问候与积分", [greetingText, pointsBox, pointsNote]);

  reg(greetingText, "content.text", "生日问候", {
    ...textBlock(
      greetingText,
      modGreeting,
      "生日问候",
      [
        {
          text: "Hi Member Name, wishing you a wonderful birthday. Here's something special to make your day even better.",
        },
      ],
      {
        align: "center",
        bindings: {
          "props.textBody.paragraphs.0.runs.0.text": {
            slotId: "greetingText",
            mode: "variable",
            valueType: "string",
            defaultValue:
              "Hi Member Name, wishing you a wonderful birthday. Here's something special to make your day even better.",
            allowExternal: true,
            fieldKind: "content",
            label: "问候正文",
          },
          "props.fontFamily": themeBinding("fonts.body"),
          "props.fontSize": themeBinding("tokens.typography.body"),
          "props.color": themeBinding("colors.primary"),
        },
      },
    ),
    id: greetingText,
    parentId: modGreeting,
  });

  reg(pointsBox, "layout.container", "积分高亮盒", {
    id: pointsBox,
    type: "layout",
    parentId: modGreeting,
    children: [pointsText],
    wrapperStyle: wsBase({
      backgroundColor: "#E8F2FA",
      borderRadius: {
        mode: "unified",
        radius: themeRef("tokens.radius.panel"),
      },
      padding: {
        mode: "separate",
        top: "16px",
        right: "20px",
        bottom: "16px",
        left: "20px",
      },
      placement: placement("center", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
    }),
    props: { direction: "vertical", gapMode: "fixed", gap: "0" },
    bindings: {
      "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
    },
  });

  const pointsRuns = [
    { text: "Reward points: " },
    { text: "888", bold: true },
  ];
  reg(pointsText, "content.text", "积分数值", {
    id: pointsText,
    type: "text",
    parentId: pointsBox,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Reward points: <strong>888</strong></p>",
      textBody: textBodyRuns(pointsRuns),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.1.text": {
        slotId: "rewardPoints",
        mode: "variable",
        valueType: "string",
        defaultValue: "888",
        allowExternal: true,
        fieldKind: "content",
        label: "奖励积分数",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  const pointsNoteRuns = [
    { text: "You can use your points to lower your order total or apply them toward member " },
    { text: "benefits", link: "https://example.com/benefits", decoration: "underline" },
    { text: "." },
  ];
  reg(pointsNote, "content.text", "积分说明", {
    id: pointsNote,
    type: "text",
    parentId: modGreeting,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: snapshotFromRuns(pointsNoteRuns),
      textBody: textBodyRuns(pointsNoteRuns),
      fontFamily: themeRef("fonts.body"),
      fontSize: themeRef("tokens.typography.caption"),
      color: themeRef("colors.secondary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.1.link": {
        slotId: "memberBenefitsUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/benefits",
        allowExternal: true,
        fieldKind: "content",
        label: "会员权益链接",
      },
      "props.fontFamily": themeBinding("fonts.body"),
      "props.fontSize": themeBinding("tokens.typography.caption"),
      "props.color": themeBinding("colors.secondary"),
    },
  });

  // --- 模块 · 优惠券 ---
  const modCoupons = `${PREFIX}-mod-coupons`;
  const couponCardIds = [];

  COUPONS.forEach((item, i) => {
    const n = i + 1;
    const cardId = `${PREFIX}-coupon-card-${n}`;
    const offerId = `${PREFIX}-coupon-offer-${n}`;
    const detailColId = `${PREFIX}-coupon-detail-${n}`;
    const titleId = `${PREFIX}-coupon-title-${n}`;
    const descId = `${PREFIX}-coupon-desc-${n}`;
    couponCardIds.push(cardId);

    reg(cardId, "layout.container", `优惠券卡 ${n}`, {
      id: cardId,
      type: "layout",
      parentId: modCoupons,
      children: [offerId, detailColId],
      wrapperStyle: wsBase({
        backgroundColor: "#FAF6F0",
        borderRadius: {
          mode: "unified",
          radius: themeRef("tokens.radius.panel"),
        },
        border: {
          mode: "unified",
          width: "1px",
          style: "solid",
          color: "#E8DFD0",
        },
        padding: {
          mode: "separate",
          top: "16px",
          right: "16px",
          bottom: "16px",
          left: "16px",
        },
      }),
      props: { direction: "horizontal", gapMode: "fixed", gap: themeRef("tokens.spacing.gap") },
      bindings: {
        "props.gap": themeBinding("tokens.spacing.gap"),
        "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
      },
    });

    reg(offerId, "content.text", `优惠券面额 ${n}`, {
      id: offerId,
      type: "text",
      parentId: cardId,
      children: [],
      wrapperStyle: {
        ...wsBase({ contentAlign: { horizontal: "center", vertical: "center" } }),
        widthMode: "fixed",
        width: "38%",
        placement: placement("start", "center"),
      },
      props: {
        content: `<p>${item.offer}</p>`,
        textBody: textBodyRuns([{ text: item.offer, bold: true }]),
        fontFamily: themeRef("fonts.heading"),
        fontSize: themeRef("tokens.typography.h1"),
        color: "#9A6B3F",
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: "birthdayCoupons",
          mode: "variable",
          valueType: "collection",
          defaultValue: COUPONS,
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.offer`,
          ...(i === 0
            ? {
                label: "生日优惠券列表",
                description: "驱动优惠券面额、标题与说明，固定 4 项。",
                itemFields: [
                  { key: "offer", label: "面额文案", valueType: "string", required: true },
                  { key: "title", label: "优惠标题", valueType: "string", required: true },
                  { key: "desc", label: "使用说明", valueType: "string", required: true },
                ],
                minItems: 4,
                maxItems: 4,
              }
            : {}),
        },
        "props.fontFamily": themeBinding("fonts.heading"),
        "props.fontSize": themeBinding("tokens.typography.h1"),
      },
    });

    reg(detailColId, "layout.container", `优惠券详情列 ${n}`, {
      id: detailColId,
      type: "layout",
      parentId: cardId,
      children: [titleId, descId],
      wrapperStyle: {
        ...wsBase({ widthMode: "fill", placement: placement("start", "center") }),
        border: {
          mode: "custom",
          style: "dashed",
          color: "#D4C4B0",
          top: { width: "0" },
          right: { width: "0" },
          bottom: { width: "0" },
          left: { width: "1px" },
        },
        padding: {
          mode: "separate",
          top: "0",
          right: "0",
          bottom: "0",
          left: "12px",
        },
      },
      props: { direction: "vertical", gapMode: "fixed", gap: themeRef("tokens.spacing.gap") },
      bindings: { "props.gap": themeBinding("tokens.spacing.gap") },
    });

    reg(titleId, "content.text", `优惠券标题 ${n}`, {
      id: titleId,
      type: "text",
      parentId: detailColId,
      children: [],
      wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
      props: {
        content: `<p>${item.title}</p>`,
        textBody: textBodyRuns([{ text: item.title, bold: true }]),
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.body"),
        color: themeRef("colors.primary"),
        bold: true,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: "birthdayCoupons",
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

    reg(descId, "content.text", `优惠券说明 ${n}`, {
      id: descId,
      type: "text",
      parentId: detailColId,
      children: [],
      wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
      props: {
        content: `<p>${item.desc}</p>`,
        textBody: textBodyRuns([{ text: item.desc }]),
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.caption"),
        color: themeRef("colors.secondary"),
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          slotId: "birthdayCoupons",
          mode: "variable",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: `${i}.desc`,
        },
        "props.fontFamily": themeBinding("fonts.body"),
        "props.fontSize": themeBinding("tokens.typography.caption"),
        "props.color": themeBinding("colors.secondary"),
      },
    });
  });

  addMod(modCoupons, "模块 · 优惠券", couponCardIds);

  // --- 模块 · 主按钮 ---
  const modCta = `${PREFIX}-mod-cta`;
  const ctaBtn = `${PREFIX}-cta-btn`;
  addMod(modCta, "模块 · 主按钮", [ctaBtn]);

  reg(ctaBtn, "action.button", "购物按钮", {
    id: ctaBtn,
    type: "button",
    parentId: modCta,
    children: [],
    wrapperStyle: {
      ...wsBase({
        contentAlign: { horizontal: "center", vertical: "top" },
        placement: placement("center", "start"),
      }),
    },
    props: {
      text: "Shop Now",
      link: "https://example.com/shop",
      buttonStyle: {
        widthMode: "hug",
        backgroundColor: "#C62828",
        textColor: "#FFFFFF",
        fontFamily: themeRef("fonts.body"),
        fontSize: themeRef("tokens.typography.body"),
        border: border0(),
        borderRadius: {
          mode: "unified",
          radius: themeRef("tokens.radius.cta"),
        },
        bold: true,
        italic: false,
      },
    },
    bindings: {
      "props.text": {
        slotId: "ctaButtonText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Shop Now",
        allowExternal: true,
        fieldKind: "content",
        label: "主按钮文案",
      },
      "props.link": {
        slotId: "ctaButtonUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/shop",
        allowExternal: true,
        fieldKind: "content",
        label: "主按钮链接",
      },
      "props.buttonStyle.fontFamily": themeBinding("fonts.body"),
      "props.buttonStyle.fontSize": themeBinding("tokens.typography.body"),
      "props.buttonStyle.borderRadius.radius": themeBinding("tokens.radius.cta"),
    },
  });

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
    emailId: "member_birthday",
    templateId: "member_birthday",
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
      heroBirthdayImageSrc: HERO_BIRTHDAY_SRC,
      heroBirthdayImageAlt: "Happy Birthday",
      heroDearText: "Dear member",
      heroTitleText: "Happy Birthday",
      heroSubtitle: "we provide you with more member services and discounts",
      greetingText:
        "Hi Member Name, wishing you a wonderful birthday. Here's something special to make your day even better.",
      rewardPoints: "888",
      memberBenefitsUrl: "https://example.com/benefits",
      birthdayCoupons: COUPONS,
      ctaButtonText: "Shop Now",
      ctaButtonUrl: "https://example.com/shop",
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
        label: "会员生日预设",
        description: "生日邮件：衬线标题、积分高亮、优惠券卡与主按钮圆角；与模板 $themeRef 对齐。",
        tokens: normalizeTokenPresetTokens({
          colors: {
            primary: "#6B1E2E",
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
            gap: "12px",
            pageInline: "24px",
          },
          typography: {
            display: "36px",
            h1: "20px",
            body: "15px",
            caption: "13px",
          },
          radius: {
            panel: "8px",
            cta: "6px",
          },
        }),
      },
    },
    scopeSelections: {},
  };
}

function writeMeta() {
  return {
    displayName: "会员生日（Birthday 学习模板）",
    description:
      "店铺 Logo、生日主视觉、问候与积分、四张优惠券、Shop Now 与账户说明；样式经 tokenPresets 统一管理。",
    source: "agent",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    designSource: { type: "screenshot", url: "" },
    defaultStylePresetSelection: "local",
  };
}

function writeConfigSchema() {
  return {
    schemaVersion: "1.0.0",
    scopes: [
      {
        scopeId: "template",
        kind: "template",
        label: "整封邮件",
        fields: [
          {
            key: "templateWidth",
            label: "邮件宽度",
            control: "text",
            target: {
              kind: "templatePath",
              path: "blocks.bd-root.props.width",
            },
          },
        ],
      },
    ],
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
writeFileSync(
  join(LAYOUT_DIR, "configSchema.json"),
  `${JSON.stringify(writeConfigSchema(), null, 2)}\n`,
);

const norm = spawnSync(
  "npx",
  [
    "tsx",
    "scripts/normalize-template-defaults.ts",
    "--write",
    "data/emails/member-birthday/layouts/default/template.json",
  ],
  { cwd: ROOT, stdio: "inherit" },
);
if (norm.status !== 0) process.exit(norm.status ?? 1);

console.log(`Wrote member-birthday template to ${OUT_DIR}`);
