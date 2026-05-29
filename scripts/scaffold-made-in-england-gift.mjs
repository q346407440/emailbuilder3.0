import { contentAlignFromAxes, axesAlignRecord } from "./lib/content-align-axis.mjs";
/**
 * 一次性脚手架：按 Dr. Martens「Made in England」设计图生成 made-in-england-gift 邮件目录。
 * 运行：node scripts/scaffold-made-in-england-gift.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../data/emails/made-in-england-gift");

const P = "dme";
const EMAIL_ID = "made_in_england_gift";

const PRODUCT_ITEM_FIELDS = [
  { key: "imageSrc", label: "商品图片", valueType: "image", required: true },
  { key: "imageAlt", label: "图片替代文字", valueType: "string", required: true },
  { key: "title", label: "商品标题", valueType: "string", required: true },
  { key: "description", label: "商品描述", valueType: "string", required: true },
  { key: "newBadge", label: "NEW 角标（无则留空）", valueType: "string", required: false },
  { key: "href", label: "商品链接", valueType: "url", required: true },
];

const CATEGORY_ITEM_FIELDS = [
  { key: "label", label: "按钮文案", valueType: "string", required: true },
  { key: "href", label: "链接", valueType: "url", required: true },
  { key: "textColor", label: "文字颜色", valueType: "string", required: true },
  { key: "borderColor", label: "边框颜色", valueType: "string", required: true },
];

const SOCIAL_ITEM_FIELDS = [
  { key: "iconSrc", label: "图标地址", valueType: "image", required: true },
  { key: "href", label: "链接", valueType: "url", required: true },
  { key: "iconAlt", label: "替代文字", valueType: "string", required: true },
];

const FOOTER_LINK_FIELDS = [
  { key: "label", label: "链接文案", valueType: "string", required: true },
  { key: "href", label: "链接地址", valueType: "url", required: true },
];

const defaultProducts = [
  {
    imageSrc:
      "https://images.pexels.com/photos/112406/pexels-photo-112406.jpeg?auto=compress&cs=tinysrgb&w=600",
    imageAlt: "Harris Tweed label detail",
    title: "1460 Made in England",
    description: "Harris Tweed and Leather Boots >",
    newBadge: "",
    href: "https://www.drmartens.com/",
  },
  {
    imageSrc:
      "https://images.pexels.com/photos/1598508/pexels-photo-1598508.jpeg?auto=compress&cs=tinysrgb&w=600",
    imageAlt: "1460 Harris Tweed boots",
    title: "1460 Made in England",
    description: "Harris Tweed and Leather Boots >",
    newBadge: "NEW",
    href: "https://www.drmartens.com/",
  },
  {
    imageSrc:
      "https://images.pexels.com/photos/1456706/pexels-photo-1456706.jpeg?auto=compress&cs=tinysrgb&w=600",
    imageAlt: "1460 Soft Boa boots",
    title: "1460 Made in England",
    description: "Soft Boa Embossed Leather Bump Toe Boots >",
    newBadge: "NEW",
    href: "https://www.drmartens.com/",
  },
  {
    imageSrc:
      "https://images.pexels.com/photos/786003/pexels-photo-786003.jpeg?auto=compress&cs=tinysrgb&w=600",
    imageAlt: "1461 Soft Boa shoes",
    title: "1461 Made in England",
    description: "Soft Boa Embossed Leather Bump Toe Shoes >",
    newBadge: "NEW",
    href: "https://www.drmartens.com/",
  },
  {
    imageSrc:
      "https://images.pexels.com/photos/1018911/pexels-photo-1018911.jpeg?auto=compress&cs=tinysrgb&w=600",
    imageAlt: "2976 Chelsea boots",
    title: "2976 Made in England",
    description: "Wax Commander Chelsea Boots >",
    newBadge: "",
    href: "https://www.drmartens.com/",
  },
  {
    imageSrc:
      "https://images.pexels.com/photos/2286772/pexels-photo-2286772.jpeg?auto=compress&cs=tinysrgb&w=600",
    imageAlt: "1460 Wax Commander boots",
    title: "1460 Made in England",
    description: "Wax Commander Lace Up Boots >",
    newBadge: "",
    href: "https://www.drmartens.com/",
  },
];

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

function varBinding(slotId, valueType, opts = {}) {
  return {
    slotId,
    mode: "variable",
    valueType,
    allowExternal: true,
    fieldKind: "content",
    ...opts,
  };
}

function collBinding(slotId, slotPath, opts = {}) {
  return {
    slotId,
    mode: "variable",
    valueType: "collection",
    allowExternal: true,
    fieldKind: "content",
    slotPath,
    itemFields: opts.itemFields ?? PRODUCT_ITEM_FIELDS,
    defaultValue: opts.defaultValue ?? defaultProducts,
    minItems: opts.minItems,
    maxItems: opts.maxItems,
    label: opts.label,
    description: opts.description,
  };
}

function baseWrapper(overrides = {}) {
  return {
    contentAlign: contentAlignFromAxes("start", "start"),
    widthMode: "fill",
    heightMode: "hug",
    border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
    borderRadius: { mode: "unified", radius: "0" },
    contentAlign: { horizontal: "left", vertical: "top" },
    ...overrides,
  };
}

function modulePaddingBindings() {
  return {
    "wrapperStyle.padding.top": themeBinding("tokens.spacing.section"),
    "wrapperStyle.padding.bottom": themeBinding("tokens.spacing.section"),
    "wrapperStyle.padding.left": themeBinding("tokens.spacing.pageInline"),
    "wrapperStyle.padding.right": themeBinding("tokens.spacing.pageInline"),
    "props.gap": themeBinding("tokens.spacing.gap"),
  };
}

function moduleShell(id, name, parentId, children, bgColor, extra = {}) {
  const bg = typeof bgColor === "string" ? bgColor : bgColor;
  return {
    id,
    type: "layout",
    parentId,
    children,
    wrapperStyle: baseWrapper({
      backgroundColor: bg,
      padding: {
        mode: "separate",
        top: themeRef("tokens.spacing.section"),
        right: themeRef("tokens.spacing.pageInline"),
        bottom: themeRef("tokens.spacing.section"),
        left: themeRef("tokens.spacing.pageInline"),
      },
      ...extra.wrapperStyle,
    }),
    props: {
      direction: "vertical",
      gapMode: "fixed",
      gap: themeRef("tokens.spacing.gap"),
      ...extra.props,
    },
    bindings: {
      ...(typeof bgColor !== "string"
        ? { "wrapperStyle.backgroundColor": themeBinding("colors.surface") }
        : {}),
      ...modulePaddingBindings(),
      ...extra.bindings,
    },
  };
}

function textBlock(id, parentId, html, text, bindings, style = {}) {
  const hasBg = Boolean(style.backgroundColor);
  return {
    id,
    type: "text",
    parentId,
    children: [],
    wrapperStyle: baseWrapper({
      widthMode: style.widthMode ?? "fill",
      contentAlign:
        style.contentAlign ??
        axesAlignRecord(style.contentAlignAxes) ??
        { horizontal: "left", vertical: "top" },
      backgroundColor: style.backgroundColor,
      padding: style.padding,
      border: style.border ?? (hasBg ? { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" } : undefined),
      borderRadius: style.borderRadius ?? (hasBg ? { mode: "unified", radius: "0" } : undefined),
    }),
    props: {
      content: html,
      textBody: { paragraphs: [{ runs: [{ text, ...style.runStyle }] }] },
      fontSize: themeRef(style.fontSize ?? "tokens.typography.body"),
      color: style.color ? (typeof style.color === "string" ? style.color : themeRef(style.color)) : themeRef("colors.primary"),
      bold: style.bold ?? false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.fontSize": themeBinding(style.fontSize ?? "tokens.typography.body"),
      ...(typeof style.color === "string"
        ? {}
        : { "props.color": themeBinding(style.color ?? "colors.primary") }),
      ...bindings,
    },
  };
}

function buttonBlock(id, parentId, label, url, bindings, style = {}) {
  const bg =
    typeof style.backgroundColor === "string"
      ? style.backgroundColor
      : style.backgroundColor ?? themeRef("colors.primary");
  const radius =
    typeof style.borderRadius === "object" && style.borderRadius?.radius !== undefined
      ? style.borderRadius
      : { mode: "unified", radius: style.borderRadius ?? themeRef("tokens.radius.cta") };
  const border = style.border ?? { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" };
  return {
    id,
    type: "button",
    parentId,
    children: [],
    wrapperStyle: baseWrapper({
      widthMode: style.widthMode ?? "hug",
      contentAlign:
        style.contentAlign ??
        axesAlignRecord(style.contentAlignAxes) ??
        { horizontal: "center", vertical: "center" },
    }),
    props: {
      text: label,
      link: url,
      buttonStyle: {
        backgroundColor: bg,
        textColor: style.textColor ?? "#FFFFFF",
        fontSize: themeRef("tokens.typography.body"),
        border,
        borderRadius: radius,
        bold: true,
        italic: false,
        widthMode: style.buttonWidthMode ?? "hug",
      },
    },
    bindings: {
      ...(typeof style.backgroundColor !== "string" && !style.backgroundColor
        ? { "props.buttonStyle.backgroundColor": themeBinding("colors.primary") }
        : {}),
      "props.buttonStyle.fontSize": themeBinding("tokens.typography.body"),
      "props.buttonStyle.borderRadius.radius":
        typeof radius.radius === "object" && radius.radius?.$themeRef
          ? themeBinding("tokens.radius.cta")
          : undefined,
      ...Object.fromEntries(Object.entries(bindings).filter(([, v]) => v !== undefined)),
    },
  };
}

function imageBlock(id, parentId, { src, alt, link = "", width = "100%", height = "auto", fit = "cover" }, bindings) {
  return {
    id,
    type: "image",
    parentId,
    children: [],
    wrapperStyle: baseWrapper({
      widthMode: "fill",
      heightMode: "hug",
      backgroundImage: {
        src,
        alt,
        link,
        fit,
        position: "center",
        borderRadius: { mode: "unified", radius: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
      },
    }),
    props: {},
    bindings,
  };
}

function buildProductCell(cellId, index) {
  const imgWrap = `${cellId}-img`;
  const badge = `${cellId}-badge`;
  const title = `${cellId}-title`;
  const desc = `${cellId}-desc`;
  const item = defaultProducts[index] ?? defaultProducts[0];

  return {
    [cellId]: {
      id: cellId,
      type: "layout",
      parentId: `${P}-prod-grid`,
      children: [imgWrap, title, desc],
      wrapperStyle: baseWrapper(),
      props: { direction: "vertical", gapMode: "fixed", gap: "10px" },
      bindings: {},
    },
    [imgWrap]: {
      id: imgWrap,
      type: "layout",
      parentId: cellId,
      children: [badge],
      wrapperStyle: baseWrapper({
        heightMode: "fixed",
        height: "200px",
        backgroundColor: "#F0F0F0",
        backgroundImage: {
          src: item.imageSrc,
          alt: item.imageAlt,
          link: item.href,
          fit: "cover",
          position: "center",
          borderRadius: { mode: "unified", radius: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        },
        padding: { mode: "separate", top: "8px", right: "8px", bottom: "0", left: "0" },
        contentAlign: { horizontal: "right", vertical: "top" },
      }),
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {
        "wrapperStyle.backgroundImage.src": collBinding("products", `${index}.imageSrc`, {
          label: "Made in England 商品列表",
          description: "2×3 商品栅格循环列表。",
          maxItems: 6,
          minItems: 1,
        }),
        "wrapperStyle.backgroundImage.alt": collBinding("products", `${index}.imageAlt`),
        "wrapperStyle.backgroundImage.link": collBinding("products", `${index}.href`),
      },
    },
    [badge]: textBlock(
      badge,
      imgWrap,
      `<p>${item.newBadge || " "}</p>`,
      item.newBadge || " ",
      {
        "props.textBody.paragraphs.0.runs.0.text": collBinding("products", `${index}.newBadge`),
      },
      {
        widthMode: "hug",
        contentAlign: contentAlignFromAxes("end", "start"),
        contentAlign: { horizontal: "center", vertical: "top" },
        backgroundColor: "#FFF200",
        color: "#000000",
        fontSize: "tokens.typography.caption",
        bold: true,
        padding: { mode: "separate", top: "4px", right: "8px", bottom: "4px", left: "8px" },
        runStyle: { bold: true },
      }
    ),
    [title]: textBlock(
      title,
      cellId,
      `<p><strong>${item.title}</strong></p>`,
      item.title,
      {
        "props.textBody.paragraphs.0.runs.0.text": collBinding("products", `${index}.title`),
      },
      { fontSize: "tokens.typography.body", bold: true }
    ),
    [desc]: textBlock(
      desc,
      cellId,
      `<p>${item.description}</p>`,
      item.description,
      {
        "props.textBody.paragraphs.0.runs.0.text": collBinding("products", `${index}.description`),
      },
      { fontSize: "tokens.typography.caption", color: "colors.primary" }
    ),
  };
}

function buildCategoryCell(cellId, index, defaults) {
  const item = defaults[index];
  return {
    [cellId]: {
      id: cellId,
      type: "layout",
      parentId: `${P}-cat-grid`,
      children: [`${cellId}-btn`],
      wrapperStyle: baseWrapper(),
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {},
    },
    [`${cellId}-btn`]: buttonBlock(
      `${cellId}-btn`,
      cellId,
      item.label,
      item.href,
      {
        "props.text": collBinding("categoryNavItems", `${index}.label`, {
          itemFields: CATEGORY_ITEM_FIELDS,
          defaultValue: defaults,
          maxItems: 4,
          minItems: 4,
          label: "分类导航按钮",
        }),
        "props.link": collBinding("categoryNavItems", `${index}.href`, { itemFields: CATEGORY_ITEM_FIELDS }),
      },
      {
        widthMode: "fill",
        backgroundColor: "transparent",
        textColor: item.textColor,
        borderRadius: { mode: "unified", radius: "0" },
        padding: { mode: "separate", top: "16px", right: "12px", bottom: "16px", left: "12px" },
        contentAlign: contentAlignFromAxes("center", "center"),
        border: { mode: "unified", width: "1px", style: "solid", color: item.borderColor },
      }
    ),
  };
}

function buildTemplate() {
  const blockMeta = {};
  const metaEntry = (id, blockType, name) => {
    blockMeta[id] = { blockType, name };
  };

  const categoryDefaults = [
    { label: "NEW", href: "https://www.drmartens.com/", textColor: "#FFF200", borderColor: "#FFF200" },
    { label: "WOMEN", href: "https://www.drmartens.com/", textColor: "#FFFFFF", borderColor: "#FFFFFF" },
    { label: "MEN", href: "https://www.drmartens.com/", textColor: "#FFFFFF", borderColor: "#FFFFFF" },
    { label: "SALE", href: "https://www.drmartens.com/", textColor: "#E85D75", borderColor: "#E85D75" },
  ];

  const socialDefaults = [
    {
      iconSrc: "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
      href: "https://www.instagram.com/drmartens/",
      iconAlt: "Instagram",
    },
    {
      iconSrc: "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/tiktok.svg",
      href: "https://www.tiktok.com/@drmartens",
      iconAlt: "TikTok",
    },
    {
      iconSrc: "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/youtube.svg",
      href: "https://www.youtube.com/drmartens",
      iconAlt: "YouTube",
    },
    {
      iconSrc: "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
      href: "https://www.facebook.com/DrMartens",
      iconAlt: "Facebook",
    },
  ];

  const blocks = {};

  /** 将模块块或 { id: block } 映射写入 blocks，避免 Object.assign 把 layout 块摊平到顶层。 */
  function assignBlocks(...entries) {
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      if (entry.id && entry.type) {
        blocks[entry.id] = entry;
        continue;
      }
      for (const val of Object.values(entry)) {
        if (val?.id) blocks[val.id] = val;
      }
    }
  }

  const rootChildren = [
    `${P}-mod-shipping`,
    `${P}-mod-logo`,
    `${P}-mod-hero`,
    `${P}-mod-intro`,
    `${P}-mod-products`,
    `${P}-mod-gift`,
    `${P}-mod-category`,
    `${P}-mod-footer-top`,
    `${P}-mod-footer`,
  ];

  for (const id of [
    ...rootChildren,
    `${P}-shipping-text`,
    `${P}-logo-wrap`,
    `${P}-logo-mark`,
    `${P}-hero-title`,
    `${P}-hero-img`,
    `${P}-intro-body`,
    `${P}-intro-cta`,
    `${P}-prod-grid`,
    `${P}-prod-cell-1`,
    `${P}-prod-cell-1-img`,
    `${P}-prod-cell-1-badge`,
    `${P}-prod-cell-1-title`,
    `${P}-prod-cell-1-desc`,
    `${P}-gift-banner`,
    `${P}-gift-title`,
    `${P}-gift-cta`,
    `${P}-gift-img`,
    `${P}-cat-grid`,
    `${P}-cat-cell-1`,
    `${P}-cat-cell-1-btn`,
    `${P}-cat-cell-2`,
    `${P}-cat-cell-2-btn`,
    `${P}-cat-cell-3`,
    `${P}-cat-cell-3-btn`,
    `${P}-cat-cell-4`,
    `${P}-cat-cell-4-btn`,
    `${P}-ft-store-row`,
    `${P}-ft-store`,
    `${P}-ft-social`,
    `${P}-social-icon-1`,
    `${P}-ft-nav-col`,
    `${P}-ft-link-delivery`,
    `${P}-ft-link-returns`,
    `${P}-ft-link-size`,
    `${P}-ft-link-help`,
    `${P}-ft-info-date`,
    `${P}-ft-info-email`,
    `${P}-ft-utility`,
    `${P}-ft-address`,
    `${P}-ft-copy`,
    `${P}-root`,
  ]) {
    const type =
      id.endsWith("-root")
        ? "email.root"
        : id.includes("-cta") || id.includes("-btn")
          ? "action.button"
          : id.includes("-img") || id === `${P}-hero-img` || id === `${P}-gift-img`
            ? "content.image"
            : id.startsWith(`${P}-social-icon`)
              ? "content.icon"
              : id.includes("-grid")
                ? "layout.grid"
                : "layout.container";
    if (id.includes("-title") || id.includes("-body") || id.includes("-text") || id.includes("-badge") || id.includes("-store") || id.includes("-link-") || id.includes("-info-") || id.includes("-utility") || id.includes("-address") || id.includes("-copy") || id === `${P}-logo-mark` || id === `${P}-gift-title`) {
      metaEntry(id, "content.text", id);
    } else if (id.includes("-btn") || id.includes("-cta")) {
      metaEntry(id, "action.button", id);
    } else if (id.includes("-icon")) {
      metaEntry(id, "content.icon", id);
    } else if (id.includes("-grid")) {
      metaEntry(id, "layout.grid", id);
    } else if (id.endsWith("-root")) {
      metaEntry(id, "email.root", "画布根节点");
    } else {
      metaEntry(id, "layout.container", id);
    }
  }

  assignBlocks(
    moduleShell(`${P}-mod-shipping`, "模块 · 顶栏包邮", `${P}-root`, [`${P}-shipping-text`], "#000000", {
      wrapperStyle: { padding: { mode: "unified", unified: "10px" } },
      props: { gap: "0" },
      bindings: {},
    }),
    {
      [`${P}-shipping-text`]: textBlock(
        `${P}-shipping-text`,
        `${P}-mod-shipping`,
        "<p>FREE SHIPPING ON ORDERS OVER $50</p>",
        "FREE SHIPPING ON ORDERS OVER $50",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("shippingBannerText", "string", {
            defaultValue: "FREE SHIPPING ON ORDERS OVER $50",
            label: "顶栏包邮文案",
          }),
        },
        {
          contentAlign: { horizontal: "center", vertical: "center" },
          contentAlign: contentAlignFromAxes("center", "center"),
          color: "#FFF200",
          fontSize: "tokens.typography.caption",
          bold: true,
        }
      ),
    },
    moduleShell(`${P}-mod-logo`, "模块 · Logo", `${P}-root`, [`${P}-logo-wrap`], "#000000", {
      props: { gap: "0" },
      bindings: {},
    }),
    {
      [`${P}-logo-wrap`]: {
        id: `${P}-logo-wrap`,
        type: "layout",
        parentId: `${P}-mod-logo`,
        children: [`${P}-logo-mark`],
        wrapperStyle: baseWrapper({
          contentAlign: contentAlignFromAxes("center", "center"),
          contentAlign: { horizontal: "center", vertical: "center" },
          padding: { mode: "unified", unified: "20px" },
        }),
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
        bindings: {},
      },
      [`${P}-logo-mark`]: textBlock(
        `${P}-logo-mark`,
        `${P}-logo-wrap`,
        "<p><strong>DM</strong></p>",
        "DM",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("brandLogoText", "string", {
            defaultValue: "DM",
            label: "品牌 Logo 字样",
          }),
        },
        {
          widthMode: "hug",
          contentAlign: contentAlignFromAxes("center", "center"),
          contentAlign: { horizontal: "center", vertical: "center" },
          backgroundColor: "#FFF200",
          color: "#000000",
          fontSize: "tokens.typography.h1",
          bold: true,
          padding: {
            mode: "separate",
            top: "18px",
            right: "28px",
            bottom: "18px",
            left: "28px",
          },
          borderRadius: { mode: "unified", radius: "999px" },
        }
      ),
    },
    moduleShell(`${P}-mod-hero`, "模块 · Hero", `${P}-root`, [`${P}-hero-title`, `${P}-hero-img`], "#F4F2E9", {
      bindings: {},
    }),
    {
      [`${P}-hero-title`]: textBlock(
        `${P}-hero-title`,
        `${P}-mod-hero`,
        "<p><strong>Made in England</strong></p>",
        "Made in England",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("heroTitle", "string", {
            defaultValue: "Made in England",
            label: "主标题",
          }),
        },
        { fontSize: "tokens.typography.display", bold: true }
      ),
      [`${P}-hero-img`]: imageBlock(
        `${P}-hero-img`,
        `${P}-mod-hero`,
        {
          src: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800",
          alt: "Made in England boot hero",
          link: "https://www.drmartens.com/",
        },
        {
          "wrapperStyle.backgroundImage.src": varBinding("heroImageSrc", "image", {
            defaultValue:
              "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800",
            label: "主图地址",
          }),
          "wrapperStyle.backgroundImage.alt": varBinding("heroImageAlt", "string", {
            defaultValue: "Made in England boot hero",
            label: "主图替代文字",
          }),
          "wrapperStyle.backgroundImage.link": varBinding("heroImageLink", "url", {
            defaultValue: "https://www.drmartens.com/",
            label: "主图链接",
          }),
        }
      ),
    },
    moduleShell(`${P}-mod-intro`, "模块 · 导语与 CTA", `${P}-root`, [`${P}-intro-body`, `${P}-intro-cta`], themeRef("colors.surface"), {
      bindings: { "wrapperStyle.backgroundColor": themeBinding("colors.surface") },
    }),
    {
      [`${P}-intro-body`]: textBlock(
        `${P}-intro-body`,
        `${P}-mod-intro`,
        "<p>Give them a gift they can wear for years to come.</p>",
        "Give them a gift they can wear for years to come. Our high quality, handcrafted Made in England styles are built to last in our Northamptonshire factory.",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("introParagraph", "string", {
            defaultValue:
              "Give them a gift they can wear for years to come. Our high quality, handcrafted Made in England styles are built to last in our Northamptonshire factory.",
            label: "导语正文",
          }),
        },
        { contentAlign: { horizontal: "center", vertical: "top" } }
      ),
      [`${P}-intro-cta`]: buttonBlock(
        `${P}-intro-cta`,
        `${P}-mod-intro`,
        "SHOP NOW",
        "https://www.drmartens.com/",
        {
          "props.text": varBinding("introCtaText", "string", { defaultValue: "SHOP NOW", label: "主按钮文案" }),
          "props.link": varBinding("introCtaUrl", "url", { defaultValue: "https://www.drmartens.com/", label: "主按钮链接" }),
          "props.buttonStyle.backgroundColor": themeBinding("colors.primary"),
        },
        {
          backgroundColor: themeRef("colors.primary"),
          borderRadius: { mode: "unified", radius: "0" },
        }
      ),
    },
    moduleShell(`${P}-mod-products`, "模块 · 商品栅格", `${P}-root`, [`${P}-prod-grid`], themeRef("colors.surface"), {
      bindings: { "wrapperStyle.backgroundColor": themeBinding("colors.surface") },
    }),
    {
      [`${P}-prod-grid`]: {
        id: `${P}-prod-grid`,
        type: "grid",
        parentId: `${P}-mod-products`,
        children: [`${P}-prod-cell-1`],
        repeat: {
          mode: "collection",
          slotId: "products",
          prototypeChildIds: [`${P}-prod-cell-1`],
          fallbackChildIds: [`${P}-prod-cell-1`],
          itemFields: PRODUCT_ITEM_FIELDS,
          maxItems: 6,
          minItems: 1,
          label: "Made in England 商品",
          description: "2 列商品栅格，按 payload 循环展开。",
        },
        wrapperStyle: baseWrapper(),
        props: {
          columns: 2,
          gap: themeRef("tokens.spacing.gap"),
          cellWidthMode: "auto",
          cellHeightMode: "content-max",
        },
        bindings: { "props.gap": themeBinding("tokens.spacing.gap") },
      },
    },
    moduleShell(`${P}-mod-gift`, "模块 · Gift Guide", `${P}-root`, [`${P}-gift-banner`], themeRef("colors.surface"), {
      bindings: { "wrapperStyle.backgroundColor": themeBinding("colors.surface") },
    }),
    {
      [`${P}-gift-banner`]: {
        id: `${P}-gift-banner`,
        type: "layout",
        parentId: `${P}-mod-gift`,
        children: [`${P}-gift-title`, `${P}-gift-cta`, `${P}-gift-img`],
        wrapperStyle: baseWrapper({
          heightMode: "fixed",
          height: "160px",
          backgroundColor: "#D4B896",
          borderRadius: { mode: "unified", radius: themeRef("tokens.radius.panel") },
          border: { mode: "unified", width: "1px", style: "solid", color: "#FFFFFF" },
          padding: { mode: "separate", top: "20px", right: "20px", bottom: "20px", left: "20px" },
          contentAlign: { horizontal: "left", vertical: "center" },
        }),
        props: { direction: "horizontal", gapMode: "fixed", gap: "12px" },
        bindings: {
          "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
        },
      },
      [`${P}-gift-title`]: textBlock(
        `${P}-gift-title`,
        `${P}-gift-banner`,
        "<p><strong>THE Gift GUIDE</strong></p>",
        "THE Gift GUIDE",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("giftGuideTitle", "string", {
            defaultValue: "THE Gift GUIDE",
            label: "Gift Guide 标题",
          }),
        },
        { fontSize: "tokens.typography.h1", bold: true, widthMode: "hug" }
      ),
      [`${P}-gift-cta`]: buttonBlock(
        `${P}-gift-cta`,
        `${P}-gift-banner`,
        "GIFTS UNDER $150 >",
        "https://www.drmartens.com/",
        {
          "props.text": varBinding("giftGuideCtaText", "string", {
            defaultValue: "GIFTS UNDER $150 >",
            label: "Gift Guide 按钮文案",
          }),
          "props.link": varBinding("giftGuideCtaUrl", "url", { defaultValue: "https://www.drmartens.com/", label: "Gift Guide 链接" }),
        },
        {
          backgroundColor: "#FFF200",
          textColor: "#000000",
          borderRadius: { mode: "unified", radius: "0" },
          padding: { mode: "separate", top: "10px", right: "16px", bottom: "10px", left: "16px" },
          widthMode: "hug",
          contentAlign: contentAlignFromAxes("start", "start"),
        }
      ),
      [`${P}-gift-img`]: imageBlock(
        `${P}-gift-img`,
        `${P}-gift-banner`,
        {
          src: "https://images.pexels.com/photos/112406/pexels-photo-112406.jpeg?auto=compress&cs=tinysrgb&w=300",
          alt: "Gift guide shoes",
          width: "120px",
          height: "120px",
          fit: "cover",
        },
        {
          "wrapperStyle.backgroundImage.src": varBinding("giftGuideImageSrc", "image", {
            defaultValue:
              "https://images.pexels.com/photos/112406/pexels-photo-112406.jpeg?auto=compress&cs=tinysrgb&w=300",
            label: "Gift Guide 配图",
          }),
          "wrapperStyle.backgroundImage.alt": varBinding("giftGuideImageAlt", "string", {
            defaultValue: "Gift guide shoes",
            label: "Gift Guide 图替代文字",
          }),
        }
      ),
    },
    moduleShell(`${P}-mod-category`, "模块 · 分类导航", `${P}-root`, [`${P}-cat-grid`], "#000000", {
      props: { gap: "12px" },
      bindings: {},
    }),
    {
      [`${P}-cat-grid`]: {
        id: `${P}-cat-grid`,
        type: "grid",
        parentId: `${P}-mod-category`,
        children: [`${P}-cat-cell-1`, `${P}-cat-cell-2`, `${P}-cat-cell-3`, `${P}-cat-cell-4`],
        wrapperStyle: baseWrapper(),
        props: { columns: 2, gap: "12px", cellWidthMode: "auto", cellHeightMode: "content-max" },
        bindings: {},
      },
    },
    moduleShell(`${P}-mod-footer-top`, "模块 · 店址与社媒", `${P}-root`, [`${P}-ft-store-row`], "#000000", {
      props: { gap: "12px" },
      bindings: {},
    }),
    {
      [`${P}-ft-store-row`]: {
        id: `${P}-ft-store-row`,
        type: "layout",
        parentId: `${P}-mod-footer-top`,
        children: [`${P}-ft-store`, `${P}-ft-social`],
        wrapperStyle: baseWrapper(),
        props: { direction: "horizontal", gapMode: "fixed", gap: "12px" },
        bindings: {},
      },
      [`${P}-ft-store`]: textBlock(
        `${P}-ft-store`,
        `${P}-ft-store-row`,
        "<p>STORE FINDER &gt;</p>",
        "STORE FINDER >",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("storeFinderText", "string", {
            defaultValue: "STORE FINDER >",
            label: "门店查找文案",
          }),
          "props.textBody.paragraphs.0.runs.0.link": varBinding("storeFinderUrl", "url", {
            defaultValue: "https://www.drmartens.com/",
            label: "门店查找链接",
          }),
        },
        { color: "#FFFFFF", fontSize: "tokens.typography.body", bold: true, widthMode: "hug" }
      ),
      [`${P}-ft-social`]: {
        id: `${P}-ft-social`,
        type: "layout",
        parentId: `${P}-ft-store-row`,
        children: [`${P}-social-icon-1`],
        repeat: {
          mode: "collection",
          slotId: "footerSocialIcons",
          prototypeChildIds: [`${P}-social-icon-1`],
          fallbackChildIds: [`${P}-social-icon-1`],
          itemFields: SOCIAL_ITEM_FIELDS,
          maxItems: 4,
          minItems: 1,
          label: "页脚社媒图标",
        },
        wrapperStyle: baseWrapper({
          widthMode: "hug",
          contentAlign: contentAlignFromAxes("end", "center"),
          contentAlign: { horizontal: "right", vertical: "center" },
        }),
        props: { direction: "horizontal", gapMode: "fixed", gap: "12px" },
        bindings: {},
      },
      [`${P}-social-icon-1`]: {
        id: `${P}-social-icon-1`,
        type: "icon",
        parentId: `${P}-ft-social`,
        children: [],
        wrapperStyle: baseWrapper({ widthMode: "hug", heightMode: "hug" }),
        props: {
          src: socialDefaults[0].iconSrc,
          color: "#FFFFFF",
          size: "22px",
          link: socialDefaults[0].href,
        },
        bindings: {
          "props.src": collBinding("footerSocialIcons", "0.iconSrc", {
            itemFields: SOCIAL_ITEM_FIELDS,
            defaultValue: socialDefaults,
            maxItems: 4,
            label: "页脚社媒图标",
          }),
          "props.link": collBinding("footerSocialIcons", "0.href", { itemFields: SOCIAL_ITEM_FIELDS }),
        },
      },
    },
    moduleShell(
      `${P}-mod-footer`,
      "模块 · 页脚",
      `${P}-root`,
      [`${P}-ft-nav-col`, `${P}-ft-info-date`,
        `${P}-ft-info-email`,
        `${P}-ft-utility`,
        `${P}-ft-address`,
        `${P}-ft-copy`,
      ],
      "#000000",
      { props: { gap: "8px" }, bindings: {} }
    ),
    {
      [`${P}-ft-nav-col`]: {
        id: `${P}-ft-nav-col`,
        type: "layout",
        parentId: `${P}-mod-footer`,
        children: [`${P}-ft-link-delivery`, `${P}-ft-link-returns`, `${P}-ft-link-size`, `${P}-ft-link-help`],
        wrapperStyle: baseWrapper({ widthMode: "fill" }),
        props: { direction: "vertical", gapMode: "fixed", gap: "6px" },
        bindings: {},
      },
      [`${P}-ft-link-delivery`]: textBlock(
        `${P}-ft-link-delivery`,
        `${P}-ft-nav-col`,
        "<p>DELIVERY</p>",
        "DELIVERY",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("footerNavDelivery", "string", { defaultValue: "DELIVERY", label: "页脚链接 · 配送" }),
        },
        { color: "#FFFFFF", fontSize: "tokens.typography.caption", bold: true }
      ),
      [`${P}-ft-link-returns`]: textBlock(
        `${P}-ft-link-returns`,
        `${P}-ft-nav-col`,
        "<p>RETURNS</p>",
        "RETURNS",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("footerNavReturns", "string", { defaultValue: "RETURNS", label: "页脚链接 · 退货" }),
        },
        { color: "#FFFFFF", fontSize: "tokens.typography.caption", bold: true }
      ),
      [`${P}-ft-link-size`]: textBlock(
        `${P}-ft-link-size`,
        `${P}-ft-nav-col`,
        "<p>SIZE GUIDE</p>",
        "SIZE GUIDE",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("footerNavSizeGuide", "string", {
            defaultValue: "SIZE GUIDE",
            label: "页脚链接 · 尺码",
          }),
        },
        { color: "#FFFFFF", fontSize: "tokens.typography.caption", bold: true }
      ),
      [`${P}-ft-link-help`]: textBlock(
        `${P}-ft-link-help`,
        `${P}-ft-nav-col`,
        "<p>HELP &amp; FAQ</p>",
        "HELP & FAQ",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("footerNavHelp", "string", { defaultValue: "HELP & FAQ", label: "页脚链接 · 帮助" }),
        },
        { color: "#FFFFFF", fontSize: "tokens.typography.caption", bold: true }
      ),
      [`${P}-ft-info-date`]: textBlock(
        `${P}-ft-info-date`,
        `${P}-mod-footer`,
        "<p>November 4, 2023</p>",
        "November 4, 2023",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("emailSentDate", "string", {
            defaultValue: "November 4, 2023",
            label: "发送日期",
          }),
        },
        { color: "colors.secondary", fontSize: "tokens.typography.caption" }
      ),
      [`${P}-ft-info-email`]: textBlock(
        `${P}-ft-info-email`,
        `${P}-mod-footer`,
        "<p>This email was sent to hello@example.com</p>",
        "This email was sent to hello@SmileDavis.yeah",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("recipientEmailLine", "string", {
            defaultValue: "This email was sent to hello@SmileDavis.yeah",
            label: "收件人说明行",
          }),
        },
        { color: "colors.secondary", fontSize: "tokens.typography.caption" }
      ),
      [`${P}-ft-utility`]: textBlock(
        `${P}-ft-utility`,
        `${P}-mod-footer`,
        "<p>Manage Preferences | Unsubscribe</p>",
        "Manage Preferences | Unsubscribe | View in Browser | Privacy Policy",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("footerUtilityLine", "string", {
            defaultValue: "Manage Preferences | Unsubscribe | View in Browser | Privacy Policy",
            label: "页脚实用链接行",
          }),
        },
        { color: "colors.secondary", fontSize: "tokens.typography.caption" }
      ),
      [`${P}-ft-address`]: textBlock(
        `${P}-ft-address`,
        `${P}-mod-footer`,
        "<p>Dr. Martens US</p>",
        "Dr. Martens US | Airwair International Limited | 10 NW 5th Ave | Portland, OR 97209 | United States",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("footerAddressLine", "string", {
            defaultValue:
              "Dr. Martens US | Airwair International Limited | 10 NW 5th Ave | Portland, OR 97209 | United States",
            label: "公司地址",
          }),
        },
        { color: "colors.secondary", fontSize: "tokens.typography.caption" }
      ),
      [`${P}-ft-copy`]: textBlock(
        `${P}-ft-copy`,
        `${P}-mod-footer`,
        "<p>© 2023 Airwair International Limited.</p>",
        "© 2023 Airwair International Limited. All rights reserved.",
        {
          "props.textBody.paragraphs.0.runs.0.text": varBinding("footerCopyrightText", "string", {
            defaultValue: "© 2023 Airwair International Limited. All rights reserved.",
            label: "版权行",
          }),
        },
        { color: "colors.secondary", fontSize: "tokens.typography.caption" }
      ),
    },
    {
      [`${P}-root`]: {
        id: `${P}-root`,
        type: "emailRoot",
        parentId: null,
        children: rootChildren,
        wrapperStyle: {
          contentAlign: contentAlignFromAxes("center", "start"),
          widthMode: "fill",
          heightMode: "hug",
        },
        props: {
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          backgroundColor: themeRef("colors.surface"),
          width: "600px",
          padding: { mode: "unified", unified: "0" },
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {
          "props.backgroundColor": themeBinding("colors.surface"),
        },
      },
    }
  );

  // 修正 gift-banner 子块布局：标题+CTA 纵向叠放
  blocks[`${P}-gift-banner`].children = [`${P}-gift-copy-col`, `${P}-gift-img`];
  blocks[`${P}-gift-copy-col`] = {
    id: `${P}-gift-copy-col`,
    type: "layout",
    parentId: `${P}-gift-banner`,
    children: [`${P}-gift-title`, `${P}-gift-cta`],
    wrapperStyle: baseWrapper({ widthMode: "fill" }),
    props: { direction: "vertical", gapMode: "fixed", gap: "10px" },
    bindings: {},
  };
  blocks[`${P}-gift-title`].parentId = `${P}-gift-copy-col`;
  blocks[`${P}-gift-cta`].parentId = `${P}-gift-copy-col`;
  metaEntry(`${P}-gift-copy-col`, "layout.container", "Gift Guide 文案列");

  assignBlocks(buildProductCell(`${P}-prod-cell-1`, 0));
  for (let i = 0; i < 4; i++) {
    assignBlocks(buildCategoryCell(`${P}-cat-cell-${i + 1}`, i, categoryDefaults));
  }

  return {
    schemaVersion: "3.0.0",
    emailId: EMAIL_ID,
    templateId: EMAIL_ID,
    templateVersion: 1,
    locale: "en-US",
    rootBlockId: `${P}-root`,
    blockMeta,
    blocks,
  };
}

const tokenPresets = {
  schemaVersion: "1.0.0",
  activePresetId: "default",
  presets: {
    default: {
      label: "Dr. Martens Made in England",
      description: "黑底黄强调、奶油 Hero、白底商品区与标准 12 键间距字号。",
      tokens: {
        colors: {
          primary: "#000000",
          secondary: "#9CA3AF",
          surface: "#FFFFFF",
        },
        spacing: {
          section: "24px",
          gap: "16px",
          pageInline: "24px",
        },
        typography: {
          display: "42px",
          h1: "28px",
          body: "15px",
          caption: "12px",
        },
        radius: {
          panel: "12px",
          cta: "0px",
        },
      },
    },
  },
  scopeSelections: {},
};

const payload = {
  schemaVersion: "1.0.0",
  values: {
    shippingBannerText: "FREE SHIPPING ON ORDERS OVER $50",
    brandLogoText: "DM",
    heroTitle: "Made in England",
    heroImageSrc:
      "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800",
    heroImageAlt: "Made in England leather boot on tweed fabrics",
    heroImageLink: "https://www.drmartens.com/",
    introParagraph:
      "Give them a gift they can wear for years to come. Our high quality, handcrafted Made in England styles are built to last in our Northamptonshire factory.",
    introCtaText: "SHOP NOW",
    introCtaUrl: "https://www.drmartens.com/",
    products: defaultProducts,
    giftGuideTitle: "THE Gift GUIDE",
    giftGuideCtaText: "GIFTS UNDER $150 >",
    giftGuideCtaUrl: "https://www.drmartens.com/",
    giftGuideImageSrc:
      "https://images.pexels.com/photos/112406/pexels-photo-112406.jpeg?auto=compress&cs=tinysrgb&w=300",
    giftGuideImageAlt: "Tan fur-lined clogs",
    categoryNavItems: [
      { label: "NEW", href: "https://www.drmartens.com/", textColor: "#FFF200", borderColor: "#FFF200" },
      { label: "WOMEN", href: "https://www.drmartens.com/", textColor: "#FFFFFF", borderColor: "#FFFFFF" },
      { label: "MEN", href: "https://www.drmartens.com/", textColor: "#FFFFFF", borderColor: "#FFFFFF" },
      { label: "SALE", href: "https://www.drmartens.com/", textColor: "#E85D75", borderColor: "#E85D75" },
    ],
    storeFinderText: "STORE FINDER >",
    storeFinderUrl: "https://www.drmartens.com/",
    footerSocialIcons: [
      {
        iconSrc: "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
        href: "https://www.instagram.com/drmartens/",
        iconAlt: "Instagram",
      },
      {
        iconSrc: "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/tiktok.svg",
        href: "https://www.tiktok.com/@drmartens",
        iconAlt: "TikTok",
      },
      {
        iconSrc: "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/youtube.svg",
        href: "https://www.youtube.com/drmartens",
        iconAlt: "YouTube",
      },
      {
        iconSrc: "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
        href: "https://www.facebook.com/DrMartens",
        iconAlt: "Facebook",
      },
    ],
    footerNavDelivery: "DELIVERY",
    footerNavReturns: "RETURNS",
    footerNavSizeGuide: "SIZE GUIDE",
    footerNavHelp: "HELP & FAQ",
    emailSentDate: "November 4, 2023",
    recipientEmailLine: "This email was sent to hello@SmileDavis.yeah",
    footerUtilityLine: "Manage Preferences | Unsubscribe | View in Browser | Privacy Policy",
    footerAddressLine:
      "Dr. Martens US | Airwair International Limited | 10 NW 5th Ave | Portland, OR 97209 | United States",
    footerCopyrightText: "© 2023 Airwair International Limited. All rights reserved.",
  },
};

const meta = {
  displayName: "Dr. Martens · Made in England（设计图还原）",
  description:
    "按设计图还原：顶栏包邮、Logo、Hero、导语 CTA、2×3 商品循环列表、Gift Guide、分类 2×2、页脚社媒与法律信息。含样式预设与 payload 变量。",
  source: "agent",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  defaultStylePresetSelection: {
    presetId: "default",
    source: "email",
  },
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "template.json"), `${JSON.stringify(buildTemplate(), null, 2)}\n`);
fs.writeFileSync(path.join(OUT, "tokenPresets.json"), `${JSON.stringify(tokenPresets, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, "payload.json"), `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
