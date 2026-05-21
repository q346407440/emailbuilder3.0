#!/usr/bin/env node
/**
 * 一次性生成「弃购挽留 / On 风格」学习模板到 data/emails/on-cart-abandon-2/
 * 模板字面量：模块壳 padding 24px、主布局 gap 16px、紧凑行 gap 8px；字号 26/15/11。
 * 样式预设：颜色主/副/表面、字号四档、间距三档、面板容器/主按钮圆角；生成后由绑定脚本写入 $themeRef。
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "./lib/token-preset-standard-order.mjs";
import { defaultLayoutDir } from "./lib/email-layout-output.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "emails", "on-cart-abandon-2");
const LAYOUT_DIR = defaultLayoutDir(OUT_DIR);

const S = {
  modPad: "24px",
  gapMd: "16px",
  gapSm: "8px",
  /** 邮件首屏大标题（600px 宽内不宜过大） */
  fsDisplay: "36px",
  fsH: "26px",
  /** 样式预设「小标题」档，介于大标题与正文之间 */
  fsTitleS: "20px",
  fsBody: "15px",
  fsMicro: "11px",
};

/** 与 src/lib/emailFontFamily.ts 默认栈及样式预设 fonts.* 一致 */
const FONT_HEADING = "'Source Sans 3'";
const FONT_BODY = "'Source Sans 3'";

const border0 = () => ({
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
});

const radius0 = () => ({ mode: "unified", radius: "0" });

const padMod = () => ({
  mode: "separate",
  top: S.modPad,
  right: S.modPad,
  bottom: S.modPad,
  left: S.modPad,
});

/** 栅格外层容器默认内边距（与校验/Inspector 统一+分边模式对齐；0 也须显式写出） */
const pad0 = () => ({ mode: "unified", unified: "0" });

const placement = (h, v) => ({
  horizontal: h,
  vertical: v,
});

const wsText = (align, wm = "fill") => ({
  placement: placement("start", "start"),
  contentAlign: { horizontal: align, vertical: "top" },
  widthMode: wm,
  heightMode: "hug",
  border: border0(),
  borderRadius: radius0(),
});

const wsLayout = (extra = {}) => ({
  placement: placement("start", "start"),
  contentAlign: { horizontal: "left", vertical: "top" },
  widthMode: "fill",
  heightMode: "hug",
  border: border0(),
  borderRadius: radius0(),
  backgroundColor: "#ffffff",
  ...extra,
});

/** 标准栅格外壳：含显式 wrapperStyle.padding，宫格间距仍由 props.gap 控制 */
const wsGrid = (extra = {}) => ({
  placement: placement("start", "start"),
  contentAlign: { horizontal: "left", vertical: "top" },
  widthMode: "fill",
  heightMode: "hug",
  border: border0(),
  borderRadius: radius0(),
  padding: pad0(),
  ...extra,
});

const textBody = (t) => ({
  version: 1,
  paragraphs: [{ runs: [{ text: t }] }],
});

const textBlock = (id, parentId, name, content, opts) => ({
  id,
  type: "text",
  parentId,
  children: [],
  wrapperStyle: wsText(opts.align, opts.widthMode ?? "fill"),
  props: {
    content: `<p>${content}</p>`,
    textBody: textBody(content.replace(/<[^>]+>/g, "")),
    fontFamily: opts.fontFamily ?? FONT_BODY,
    fontSize: opts.fontSize,
    color: opts.color,
    bold: opts.bold ?? false,
    italic: false,
    decoration: "none",
  },
  bindings: {},
});

const btnGhost = (id, parentId, name, text) => ({
  id,
  type: "button",
  parentId,
  children: [],
  wrapperStyle: {
    ...wsText("center", "fill"),
    placement: placement("center", "start"),
  },
  props: {
    text,
    link: "https://example.com",
    buttonStyle: {
      widthMode: "hug",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      fontFamily: FONT_BODY,
      fontSize: "15px",
      border: { mode: "unified", width: "1px", style: "solid", color: "#000000" },
      borderRadius: radius0(),
      bold: false,
      italic: false,
    },
  },
  bindings: {},
});

const variableBinding = (slotId, valueType, defaultValue, extra = {}) => ({
  slotId,
  mode: "variable",
  valueType,
  defaultValue,
  allowExternal: true,
  fieldKind: "content",
  ...extra,
});

const viewedItemsFields = [
  { key: "imageSrc", label: "图片地址", valueType: "image", required: true },
  { key: "imageAlt", label: "图片 alt", valueType: "string", placeholder: "可为空" },
  { key: "name", label: "商品名称", valueType: "string", required: true },
  { key: "href", label: "商品链接", valueType: "url", required: true },
];

const viewedItemsBinding = (slotPath, defaultValue, includeMeta = false) =>
  variableBinding("viewedItems", "collection", includeMeta ? defaultValue : undefined, {
    slotPath,
    ...(includeMeta
      ? {
          label: "最近浏览商品列表",
          description: "用于驱动最近浏览 6 宫格的商品图片、名称与跳转链接。",
          itemFields: viewedItemsFields,
          minItems: 6,
          maxItems: 6,
        }
      : {}),
  });

const collectionBinding = (slotId, slotPath, defaultValue, meta) =>
  variableBinding(slotId, "collection", meta ? defaultValue : undefined, {
    slotPath,
    ...(meta ?? {}),
  });

const featuredProductBinding = (slotPath, defaultValue, includeMeta = false) =>
  collectionBinding("featuredProduct", slotPath, defaultValue, includeMeta
    ? {
        label: "主推商品列表",
        description: "用于驱动主推灰底容器的商品图、名称与跳转链接（固定 1 项）。",
        itemFields: viewedItemsFields,
        minItems: 1,
        maxItems: 1,
      }
    : undefined);

const categoryItemsBinding = (slotPath, defaultValue, includeMeta = false) =>
  collectionBinding("categoryItems", slotPath, defaultValue, includeMeta
    ? {
        label: "分类商品列表",
        description: "用于驱动分类栅格 2×2 宫格的背景图、叠字标题与跳转链接。",
        itemFields: viewedItemsFields,
        minItems: 4,
        maxItems: 4,
      }
    : undefined);

const footerSocialIconFields = [
  { key: "iconSrc", label: "图标地址", valueType: "image", required: true },
];

const footerUtilityLinkFields = [
  { key: "label", label: "链接文案", valueType: "string", required: true },
  { key: "href", label: "链接地址", valueType: "url", required: true },
];

const footerSocialIconsBinding = (slotPath, defaultValue, includeMeta = false) =>
  collectionBinding("footerSocialIcons", slotPath, defaultValue, includeMeta
    ? {
        label: "页脚社媒图标",
        description: "页脚社媒图标行，固定 4 项（图标 CDN 地址）。",
        itemFields: footerSocialIconFields,
        minItems: 4,
        maxItems: 4,
      }
    : undefined);

const footerUtilityLinksBinding = (slotPath, defaultValue, includeMeta = false) =>
  collectionBinding("footerUtilityLinks", slotPath, defaultValue, includeMeta
    ? {
        label: "页脚实用链接",
        description: "页脚「浏览器查看 / 退订」等实用链接，固定 2 项。",
        itemFields: footerUtilityLinkFields,
        minItems: 2,
        maxItems: 2,
      }
    : undefined);

const imgBlock = (id, parentId, name, src, alt, w, h) => ({
  id,
  type: "image",
  parentId,
  children: [],
  wrapperStyle: {
    placement: placement("start", "start"),
    contentAlign: { horizontal: "center", vertical: "top" },
    widthMode: "fill",
    heightMode: "fixed",
    height: h,
    border: border0(),
    borderRadius: radius0(),
    backgroundImage: {
      src,
      alt,
      link: "",
      fit: "cover",
      position: "center",
      borderRadius: radius0(),
      border: border0(),
    },
  },
  props: {},
  bindings: {},
});

const iconBlk = (id, parentId, name, src) => ({
  id,
  type: "icon",
  parentId,
  children: [],
  wrapperStyle: {
    placement: placement("start", "start"),
    contentAlign: { horizontal: "center", vertical: "center" },
    widthMode: "hug",
    heightMode: "hug",
    border: border0(),
    borderRadius: radius0(),
  },
  props: {
    src: src,
    color: { $themeRef: "colors.primary" },
    size: "20px",
  },
  bindings: {
    "props.color": {
      slotId: "colors.primary",
      mode: "theme",
      tokenPath: "colors.primary",
      fieldKind: "style",
    },
  },
});

const PEX = (id, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const SI = (slug) => `https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/${slug}.svg`;

function build() {
  const blockMeta = {};
  const blocks = {};
  const reg = (id, blockType, name, block) => {
    blockMeta[id] = { blockType, name };
    blocks[id] = block;
  };

  const ROOT_ID = "oca-root";
  const children = [];

  const addMod = (modId, title, innerIds) => {
    children.push(modId);
    reg(modId, "layout.container", title, {
      id: modId,
      type: "layout",
      parentId: ROOT_ID,
      children: innerIds,
      wrapperStyle: wsLayout({
        backgroundColor: "#ffffff",
        padding: padMod(),
      }),
      props: { direction: "vertical", gapMode: "fixed", gap: S.gapMd },
      bindings: {},
    });
  };

  // --- Header module ---
  const modHeader = "oca-mod-header";
  const hdrLogoRow = "oca-header-logo-row";
  const hdrLogo = "oca-header-logo-text";
  const hdrH1 = "oca-header-h1";
  const hdrSub = "oca-header-sub";

  addMod(modHeader, "模块 · 顶栏文案", [hdrLogoRow, hdrH1, hdrSub]);

  reg(hdrLogoRow, "layout.container", "顶栏 Logo 行", {
    id: hdrLogoRow,
    type: "layout",
    parentId: modHeader,
    children: [hdrLogo],
    wrapperStyle: {
      ...wsLayout({ backgroundColor: "#ffffff", padding: undefined }),
      widthMode: "fill",
      heightMode: "hug",
      placement: placement("center", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
    },
    props: { direction: "horizontal", gapMode: "fixed", gap: "0" },
    bindings: {},
  });

  reg(hdrLogo, "content.text", "品牌字标", {
    id: hdrLogo,
    type: "text",
    parentId: hdrLogoRow,
    children: [],
    wrapperStyle: {
      ...wsText("center", "hug"),
      placement: placement("center", "center"),
    },
    props: {
      content: "<p>on</p>",
      textBody: textBody("on"),
      fontFamily: FONT_HEADING,
      fontSize: S.fsBody,
      color: "#000000",
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {},
  });

  reg(
    hdrH1,
    "content.text",
    "主标题",
    textBlock(hdrH1, modHeader, "主标题", "Your viewed items are selling fast", {
      align: "center",
      fontSize: S.fsH,
      color: "#000000",
      bold: false,
    })
  );
  blocks[hdrH1].bindings = {
    "props.textBody.paragraphs.0.runs.0.text": variableBinding(
      "viewedItemsHeadline",
      "string",
      "Your viewed items are selling fast",
      {
        label: "主标题文案",
        description: "弃购挽留邮件首屏标题。",
      }
    ),
  };
  reg(
    hdrSub,
    "content.text",
    "副标题",
    textBlock(hdrSub, modHeader, "副标题", "Add them to your cart with free shipping.", {
      align: "center",
      fontSize: S.fsBody,
      color: "#666666",
      bold: false,
    })
  );
  blocks[hdrSub].bindings = {
    "props.textBody.paragraphs.0.runs.0.text": variableBinding(
      "viewedItemsSubheadline",
      "string",
      "Add them to your cart with free shipping.",
      {
        label: "副标题文案",
        description: "弃购挽留邮件首屏副标题。",
      }
    ),
  };

  const defaultFeaturedProduct = [
    {
      imageSrc: PEX(2529148),
      imageAlt: "Cloud",
      name: "Cloud",
      href: "https://example.com/",
    },
  ];

  // --- Featured Cloud ---
  const modHero = "oca-mod-hero";
  const heroInner = "oca-hero-inner";
  const heroImg = "oca-hero-img";
  const heroName = "oca-hero-name";
  const heroBtn = "oca-hero-btn";

  addMod(modHero, "模块 · 主推商品", [heroInner]);

  reg(heroInner, "layout.container", "主推灰底容器", {
    id: heroInner,
    type: "layout",
    parentId: modHero,
    children: [heroImg, heroName, heroBtn],
    wrapperStyle: wsLayout({
      backgroundColor: "#f6f6f6",
      padding: padMod(),
    }),
    props: { direction: "vertical", gapMode: "fixed", gap: S.gapMd },
    bindings: {},
  });

  reg(
    heroImg,
    "content.image",
    "主推鞋图",
    imgBlock(heroImg, heroInner, "主推鞋图", PEX(2529148), "Running shoe product", "100%", "280px")
  );
  blocks[heroImg].bindings = {
    "wrapperStyle.backgroundImage.src": featuredProductBinding("0.imageSrc", defaultFeaturedProduct, true),
    "wrapperStyle.backgroundImage.alt": featuredProductBinding("0.imageAlt", defaultFeaturedProduct),
  };
  reg(
    heroName,
    "content.text",
    "主推款名",
    textBlock(heroName, heroInner, "主推款名", "Cloud", {
      align: "center",
      fontSize: S.fsBody,
      color: "#000000",
      bold: true,
    })
  );
  blocks[heroName].bindings = {
    "props.textBody.paragraphs.0.runs.0.text": featuredProductBinding("0.name", defaultFeaturedProduct),
  };
  reg(heroBtn, "action.button", "主推按钮", btnGhost(heroBtn, heroInner, "主推按钮", "Shop now"));
  blocks[heroBtn].props.link = "https://example.com/";
  blocks[heroBtn].bindings = {
    "props.text": variableBinding("featuredProductCtaText", "string", "Shop now", {
      label: "主推按钮文案",
      description: "主推商品卡片按钮文案。",
    }),
    "props.link": featuredProductBinding("0.href", defaultFeaturedProduct),
  };

  // --- Recently viewed grid ---
  const modRv = "oca-mod-recent";
  const rvTitle = "oca-rv-title";
  const rvGrid = "oca-rv-grid";
  addMod(modRv, "模块 · 最近浏览", [rvTitle, rvGrid]);

  reg(
    rvTitle,
    "content.text",
    "最近浏览标题",
    textBlock(rvTitle, modRv, "最近浏览标题", "Your recently viewed products", {
      align: "center",
      fontSize: S.fsH,
      color: "#000000",
      bold: false,
    })
  );
  blocks[rvTitle].bindings = {
    "props.textBody.paragraphs.0.runs.0.text": variableBinding(
      "recentlyViewedTitle",
      "string",
      "Your recently viewed products",
      {
        label: "最近浏览区标题",
        description: "最近浏览商品栅格上方标题文案。",
      }
    ),
  };

  const rvProductSpecs = [
    { id: "rv1", name: "Cloud", img: PEX(2529148), href: "https://example.com/products/cloud" },
    { id: "rv2", name: "Cloud", img: PEX(1598508), href: "https://example.com/products/cloud-2" },
    { id: "rv3", name: "Cloudventure", img: PEX(1456706), href: "https://example.com/products/cloudventure" },
    { id: "rv4", name: "Cloudventure", img: PEX(786003), href: "https://example.com/products/cloudventure-2" },
    { id: "rv5", name: "Cloudflow", img: PEX(1018911), href: "https://example.com/products/cloudflow" },
    { id: "rv6", name: "Cloud 5", img: PEX(2286772), href: "https://example.com/products/cloud-5" },
  ];
  const defaultViewedItems = rvProductSpecs.map((spec) => ({
    imageSrc: spec.img,
    imageAlt: spec.name,
    name: spec.name,
    href: spec.href,
  }));

  const rvCellIds = [];
  for (let i = 0; i < rvProductSpecs.length; i++) {
    const spec = rvProductSpecs[i];
    const cell = `oca-rv-cell-${i + 1}`;
    const im = `oca-rv-img-${i + 1}`;
    const tx = `oca-rv-name-${i + 1}`;
    const bt = `oca-rv-btn-${i + 1}`;
    rvCellIds.push(cell);
    reg(cell, "layout.container", `最近浏览商品卡 ${i + 1}`, {
      id: cell,
      type: "layout",
      parentId: rvGrid,
      children: [im, tx, bt],
      wrapperStyle: wsLayout({ backgroundColor: "#ffffff" }),
      props: { direction: "vertical", gapMode: "fixed", gap: S.gapSm },
      bindings: {},
    });
    reg(
      im,
      "content.image",
      `最近浏览图 ${i + 1}`,
      imgBlock(im, cell, `最近浏览图 ${i + 1}`, spec.img, spec.name, "100%", "140px")
    );
    blocks[im].wrapperStyle.backgroundImage.link = spec.href;
    blocks[im].bindings = {
      "wrapperStyle.backgroundImage.src": viewedItemsBinding(`${i}.imageSrc`, defaultViewedItems, i === 0),
      "wrapperStyle.backgroundImage.alt": viewedItemsBinding(`${i}.imageAlt`, defaultViewedItems),
      "wrapperStyle.backgroundImage.link": viewedItemsBinding(`${i}.href`, defaultViewedItems),
    };
    reg(
      tx,
      "content.text",
      `最近浏览款名 ${i + 1}`,
      textBlock(tx, cell, `最近浏览款名 ${i + 1}`, spec.name, {
        align: "center",
        fontSize: S.fsBody,
        color: "#000000",
        bold: false,
      })
    );
    blocks[tx].bindings = {
      "props.textBody.paragraphs.0.runs.0.text": viewedItemsBinding(`${i}.name`, defaultViewedItems),
    };
    reg(
      bt,
      "action.button",
      `最近浏览按钮 ${i + 1}`,
      btnGhost(bt, cell, `最近浏览按钮 ${i + 1}`, "Check availability")
    );
    blocks[bt].props.link = spec.href;
    blocks[bt].bindings = {
      "props.text": variableBinding("viewedItemsCtaText", "string", "Check availability", {
        label: "最近浏览按钮文案",
        description: "最近浏览商品卡片共用的按钮文案。",
      }),
      "props.link": viewedItemsBinding(`${i}.href`, defaultViewedItems),
    };
  }

  reg(rvGrid, "layout.grid", "最近浏览栅格", {
    id: rvGrid,
    type: "grid",
    parentId: modRv,
    children: rvCellIds,
    wrapperStyle: wsGrid(),
    props: { columns: 2, gap: S.gapMd, cellHeightMode: "content-max" },
    bindings: {},
  });

  // --- Category 2x2 ---
  const modCat = "oca-mod-category";
  const catTitle = "oca-cat-title";
  const catGrid = "oca-cat-grid";
  addMod(modCat, "模块 · 分类入口", [catTitle, catGrid]);

  reg(
    catTitle,
    "content.text",
    "分类标题",
    textBlock(catTitle, modCat, "分类标题", "Shop by category", {
      align: "center",
      fontSize: S.fsH,
      color: "#000000",
      bold: false,
    })
  );
  blocks[catTitle].bindings = {
    "props.textBody.paragraphs.0.runs.0.text": variableBinding(
      "categorySectionTitle",
      "string",
      "Shop by category",
      {
        label: "分类区标题",
        description: "分类栅格上方标题文案。",
      }
    ),
  };

  const catTiles = [
    { id: 1, label: "Men's shoes", src: PEX(1478477), href: "https://example.com/categories/mens-shoes" },
    { id: 2, label: "Women's shoes", src: PEX(1552242), href: "https://example.com/categories/womens-shoes" },
    { id: 3, label: "Men's apparel", src: PEX(416475), href: "https://example.com/categories/mens-apparel" },
    { id: 4, label: "Women's apparel", src: PEX(1040893), href: "https://example.com/categories/womens-apparel" },
  ];
  const defaultCategoryItems = catTiles.map((t) => ({
    imageSrc: t.src,
    imageAlt: t.label,
    name: t.label,
    href: t.href,
  }));

  const catCellIds = [];
  for (let i = 0; i < catTiles.length; i++) {
    const t = catTiles[i];
    const tid = `oca-cat-tile-${t.id}`;
    const txt = `oca-cat-txt-${t.id}`;
    catCellIds.push(tid);
    reg(tid, "layout.container", `分类宫格 ${t.id}`, {
      id: tid,
      type: "layout",
      parentId: catGrid,
      children: [txt],
      wrapperStyle: {
        placement: placement("start", "start"),
        contentAlign: { horizontal: "center", vertical: "center" },
        widthMode: "fill",
        heightMode: "fixed",
        height: "268px",
        border: border0(),
        borderRadius: radius0(),
        backgroundImage: {
          src: t.src,
          alt: t.label,
          link: "",
          fit: "cover",
          position: "center",
          borderRadius: radius0(),
          border: border0(),
        },
        backgroundContentAlign: { horizontal: "center", vertical: "center" },
      },
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {},
    });
    blocks[tid].wrapperStyle.backgroundImage.link = t.href;
    blocks[tid].bindings = {
      "wrapperStyle.backgroundImage.src": categoryItemsBinding(`${i}.imageSrc`, defaultCategoryItems, i === 0),
      "wrapperStyle.backgroundImage.alt": categoryItemsBinding(`${i}.imageAlt`, defaultCategoryItems),
      "wrapperStyle.backgroundImage.link": categoryItemsBinding(`${i}.href`, defaultCategoryItems),
    };
    reg(
      txt,
      "content.text",
      `分类叠字 ${t.id}`,
      textBlock(txt, tid, `分类叠字 ${t.id}`, t.label, {
        align: "center",
        fontSize: S.fsH,
        color: "#ffffff",
        bold: true,
        widthMode: "fill",
      })
    );
    blocks[txt].wrapperStyle.placement = placement("center", "center");
    blocks[txt].bindings = {
      "props.textBody.paragraphs.0.runs.0.text": categoryItemsBinding(`${i}.name`, defaultCategoryItems),
    };
  }

  reg(catGrid, "layout.grid", "分类栅格", {
    id: catGrid,
    type: "grid",
    parentId: modCat,
    children: catCellIds,
    wrapperStyle: wsGrid(),
    props: { columns: 2, gap: S.gapMd, cellHeightMode: "content-max" },
    bindings: {},
  });

  // --- Footer ---
  const modFt = "oca-mod-footer";
  const ftShip = "oca-ft-ship";
  const ftLogoRow = "oca-ft-logo-row";
  const ftLogo = "oca-ft-logo";
  const ftIcons = "oca-ft-icons";
  const ftLinks = "oca-ft-links";
  const ftCopy = "oca-ft-copy";
  const ftLegal = "oca-ft-legal";

  addMod(modFt, "模块 · 页脚", [ftShip, ftLogoRow, ftIcons, ftLinks, ftCopy, ftLegal]);

  reg(
    ftShip,
    "content.text",
    "包邮说明",
    textBlock(ftShip, modFt, "包邮说明", "FREE STANDARD SHIPPING", {
      align: "center",
      fontSize: S.fsMicro,
      color: "#000000",
      bold: false,
    })
  );
  blocks[ftShip].props.bold = true;
  blocks[ftShip].bindings = {
    "props.textBody.paragraphs.0.runs.0.text": variableBinding(
      "footerShippingBanner",
      "string",
      "FREE STANDARD SHIPPING",
      {
        label: "页脚包邮横幅",
        description: "页脚顶部包邮说明文案。",
      }
    ),
  };

  reg(ftLogoRow, "layout.container", "页脚 Logo 行", {
    id: ftLogoRow,
    type: "layout",
    parentId: modFt,
    children: [ftLogo],
    wrapperStyle: {
      ...wsLayout({ backgroundColor: "#ffffff" }),
      placement: placement("center", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
    },
    props: { direction: "horizontal", gapMode: "fixed", gap: "0" },
    bindings: {},
  });
  reg(
    ftLogo,
    "content.text",
    "页脚品牌字标",
    textBlock(ftLogo, ftLogoRow, "页脚品牌字标", "on", {
      align: "center",
      fontSize: S.fsBody,
      color: "#000000",
      bold: true,
      widthMode: "hug",
    })
  );
  blocks[ftLogo].wrapperStyle.placement = placement("center", "center");
  blocks[ftLogo].bindings = {
    "props.textBody.paragraphs.0.runs.0.text": variableBinding("footerBrandWordmark", "string", "on", {
      label: "页脚品牌字标",
      description: "页脚居中品牌字样（如 on）。",
    }),
  };

  const iconIds = ["fb", "ig", "strava", "yt"].map((s, i) => `oca-ft-icon-${s}`);
  reg(ftIcons, "layout.container", "社媒图标行", {
    id: ftIcons,
    type: "layout",
    parentId: modFt,
    children: iconIds,
    wrapperStyle: {
      ...wsLayout({ backgroundColor: "#ffffff" }),
      placement: placement("center", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
      widthMode: "hug",
      heightMode: "hug",
    },
    props: { direction: "horizontal", gapMode: "fixed", gap: S.gapSm },
    bindings: {},
  });
  const iconSrcs = [SI("facebook"), SI("instagram"), SI("strava"), SI("youtube")];
  const defaultFooterSocialIcons = iconSrcs.map((iconSrc) => ({ iconSrc }));
  for (let i = 0; i < 4; i++) {
    reg(
      iconIds[i],
      "content.icon",
      `社媒 ${i + 1}`,
      iconBlk(iconIds[i], ftIcons, `社媒 ${i + 1}`, iconSrcs[i])
    );
    blocks[iconIds[i]].wrapperStyle.placement = placement("start", "center");
    blocks[iconIds[i]].bindings = {
      "props.src": footerSocialIconsBinding(`${i}.iconSrc`, defaultFooterSocialIcons, i === 0),
    };
  }

  const defaultFooterUtilityLinks = [
    { label: "VIEW IN BROWSER", href: "https://example.com/" },
    { label: "UNSUBSCRIBE", href: "https://example.com/" },
  ];

  const linkParagraph = {
    version: 1,
    paragraphs: [
      {
        runs: [
          { text: "VIEW IN BROWSER", link: "https://example.com" },
          { text: "  |  " },
          { text: "UNSUBSCRIBE", link: "https://example.com" },
        ],
      },
    ],
  };
  reg(ftLinks, "content.text", "页脚链接行", {
    id: ftLinks,
    type: "text",
    parentId: modFt,
    children: [],
    wrapperStyle: { ...wsText("center", "fill"), placement: placement("center", "start") },
    props: {
      content: "<p><a href=\"https://example.com\">VIEW IN BROWSER</a>  |  <a href=\"https://example.com\">UNSUBSCRIBE</a></p>",
      textBody: linkParagraph,
      fontFamily: FONT_BODY,
      fontSize: S.fsMicro,
      color: "#000000",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {},
  });
  blocks[ftLinks].bindings = {
    "props.textBody.paragraphs.0.runs.0.text": footerUtilityLinksBinding(
      "0.label",
      defaultFooterUtilityLinks,
      true
    ),
    "props.textBody.paragraphs.0.runs.0.link": footerUtilityLinksBinding("0.href", defaultFooterUtilityLinks),
    "props.textBody.paragraphs.0.runs.2.text": footerUtilityLinksBinding("1.label", defaultFooterUtilityLinks),
    "props.textBody.paragraphs.0.runs.2.link": footerUtilityLinksBinding("1.href", defaultFooterUtilityLinks),
  };

  reg(
    ftCopy,
    "content.text",
    "版权年份",
    textBlock(ftCopy, modFt, "版权年份", "© 2022", {
      align: "center",
      fontSize: S.fsMicro,
      color: "#666666",
      bold: false,
    })
  );
  blocks[ftCopy].bindings = {
    "props.textBody.paragraphs.0.runs.0.text": variableBinding("footerCopyrightText", "string", "© 2022", {
      label: "页脚版权文案",
      description: "页脚版权年份或版权声明。",
    }),
  };
  reg(
    ftLegal,
    "content.text",
    "法律脚注",
    textBlock(ftLegal, modFt, "法律脚注", "*Free standard shipping applies only to orders above $35.", {
      align: "center",
      fontSize: S.fsMicro,
      color: "#888888",
      bold: false,
    })
  );
  blocks[ftLegal].bindings = {
    "props.textBody.paragraphs.0.runs.0.text": variableBinding(
      "footerLegalDisclaimer",
      "string",
      "*Free standard shipping applies only to orders above $35.",
      {
        label: "页脚法律脚注",
        description: "页脚底部小字免责声明。",
      }
    ),
  };

  reg(ROOT_ID, "layout.container", "画布根节点", {
    id: ROOT_ID,
    type: "emailRoot",
    parentId: null,
    children,
    wrapperStyle: {
      placement: { horizontal: "center" },
      widthMode: "fill",
      heightMode: "hug",
    },
    props: {
      border: border0(),
      backgroundColor: "#ffffff",
      width: "600px",
      padding: { mode: "unified", unified: "0" },
      gapMode: "fixed",
      gap: "0",
    },
    bindings: {},
  });

  const template = {
    schemaVersion: "3.0.0",
    emailId: "on_cart_abandon_2",
    templateId: "on_cart_abandon_2",
    templateVersion: 1,
    locale: "en-US",
    rootBlockId: ROOT_ID,
    blockMeta,
    blocks,
  };

  const meta = {
    displayName: "弃购挽留 2（On 风格学习模板）",
    description: "按设计图分模块还原：顶栏、主推、最近浏览 3×2、分类 2×2、页脚。间距 24/16/8px，字号 26/15/11px。",
    source: "agent",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    designSource: { type: "screenshot", url: "" },
  };

  const payload = {
    schemaVersion: "1.0.0",
    values: {
      viewedItemsHeadline: "Your viewed items are selling fast",
      viewedItemsSubheadline: "Add them to your cart with free shipping.",
      recentlyViewedTitle: "Your recently viewed products",
      categorySectionTitle: "Shop by category",
      featuredProductCtaText: "Shop now",
      featuredProduct: defaultFeaturedProduct,
      viewedItemsCtaText: "Check availability",
      viewedItems: defaultViewedItems,
      categoryItems: defaultCategoryItems,
      footerShippingBanner: "FREE STANDARD SHIPPING",
      footerBrandWordmark: "on",
      footerSocialIcons: defaultFooterSocialIcons,
      footerUtilityLinks: defaultFooterUtilityLinks,
      footerCopyrightText: "© 2022",
      footerLegalDisclaimer: "*Free standard shipping applies only to orders above $35.",
    },
  };

  const tokenPresets = {
    schemaVersion: "1.0.0",
    activePresetId: "default",
    presets: {
      default: {
        label: "弃购挽留 2 预设",
        description:
          "颜色主/副/表面、标题/正文字体、四档字号、三档间距、面板容器/主按钮圆角；生成后由 bind-on-cart-abandon-2-theme-refs 写入模板 $themeRef。",
        tokens: normalizeTokenPresetTokens({
          colors: {
            primary: "#111827",
            secondary: "#6b7280",
            surface: "#ffffff",
          },
          fonts: {
            heading: FONT_HEADING,
            body: FONT_BODY,
          },
          spacing: {
            section: S.modPad,
            gap: S.gapMd,
            pageInline: S.modPad,
          },
          typography: {
            display: S.fsDisplay,
            h1: S.fsH,
            body: S.fsBody,
            /** 与 `data/token-presets/public-neutral-saas` 及迁移脚本对齐 */
            caption: "12px",
          },
          radius: {
            panel: "10px",
            cta: "9999px",
          },
        }),
      },
    },
    scopeSelections: {},
    appliedGlobalPresetId: "public-neutral-saas",
  };

  const configSchema = {
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
            target: { kind: "templatePath", path: `blocks.${ROOT_ID}.props.width` },
          },
        ],
      },
    ],
  };

  mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(LAYOUT_DIR, { recursive: true });
  writeFileSync(join(LAYOUT_DIR, "template.json"), JSON.stringify(template, null, 2), "utf8");
  writeFileSync(join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
  writeFileSync(join(OUT_DIR, "payload.json"), JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(join(LAYOUT_DIR, "tokenPresets.json"), JSON.stringify(tokenPresets, null, 2), "utf8");
  writeFileSync(join(LAYOUT_DIR, "configSchema.json"), JSON.stringify(configSchema, null, 2), "utf8");
  const bindScript = join(__dirname, "bind-on-cart-abandon-2-theme-refs.mjs");
  const bind = spawnSync(process.execPath, [bindScript], { stdio: "inherit" });
  if (bind.status !== 0) process.exit(bind.status ?? 1);
  process.stdout.write(`Wrote ${OUT_DIR}\n`);
}

build();
