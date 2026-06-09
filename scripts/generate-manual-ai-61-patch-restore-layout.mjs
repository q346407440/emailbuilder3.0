#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const EMAIL = "ai";
const P = "ai61manual";
const layoutVariantId = "61--patch-manual-restore";
const displayName = "模板 61 底稿 patch 手工还原";
const createdAt = "2026-06-09T05:58:00.000Z";
const emailDir = join(__dirname, `../data/emails/${EMAIL}`);
const layoutDir = join(emailDir, "layouts", layoutVariantId);
const manifestPath = join(emailDir, "layout-manifest.json");

const ASSETS = {
  hero:
    "https://images.pexels.com/photos/15981465/pexels-photo-15981465.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  adidas: "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/adidas.svg",
  instagram: "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  youtube: "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-youtube.svg",
  x: "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-x.svg",
  pinterest: "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-pinterest.svg",
};

/* @mjs-slot:COLORS */
const COLORS = {
  primary: "#000000",
  secondary: "#F4F3EA",
  surface: "#FFFFFF",
  white: "#FFFFFF",
  line: "#D8D8D8",
  muted: "#5F5F5F",
};
/* @mjs-slot-end:COLORS */

function borderNone() {
  return { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" };
}

function border(width = "1px", color = COLORS.primary) {
  return { mode: "unified", width, style: "solid", color };
}

function radius(value = "0") {
  return { mode: "unified", radius: value };
}

function padding(top, right = top, bottom = top, left = right) {
  return { mode: "separate", top, right, bottom, left };
}

function layout(id, name, children = [], opts = {}) {
  const {
    direction = "vertical",
    gap = "0",
    alignH = "left",
    alignV = "top",
    widthMode = "fill",
    width,
    heightMode = "hug",
    height,
    bg,
    pad,
    stroke,
    rounded = "0",
  } = opts;

  return {
    id,
    type: "layout",
    blockMeta: { blockType: "layout.container", name },
    props: { direction, gapMode: "fixed", gap },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode,
      ...(width ? { width } : {}),
      heightMode,
      ...(height ? { height } : {}),
      ...(bg ? { backgroundColor: bg } : {}),
      ...(pad ? { padding: pad } : {}),
      border: stroke ?? borderNone(),
      borderRadius: radius(rounded),
    },
    children,
  };
}

function textBlock(id, name, content, opts = {}) {
  const {
    alignH = "left",
    alignV = "top",
    fontSize = "12px",
    color = COLORS.primary,
    bold = false,
    italic = false,
    decoration = "none",
    widthMode = "fill",
    width,
    heightMode = "hug",
  } = opts;

  return {
    id,
    type: "text",
    blockMeta: { blockType: "content.text", name },
    props: {
      textBody: { paragraphs: [{ runs: [{ text: content }] }] },
      fontSize,
      color,
      bold,
      italic,
      decoration,
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode,
      ...(width ? { width } : {}),
      heightMode,
      border: borderNone(),
      borderRadius: radius("0"),
    },
  };
}

function buttonBlock(id, name, label, opts = {}) {
  const {
    alignH = "left",
    bg = COLORS.primary,
    textColor = COLORS.white,
    fontSize = "10px",
    widthMode = "fixed",
    width = "100px",
    bold = false,
    rounded = "0",
    stroke,
  } = opts;

  return {
    id,
    type: "button",
    blockMeta: { blockType: "action.button", name },
    props: {
      text: label,
      link: { href: "#", type: "external" },
      buttonStyle: {
        widthMode,
        ...(widthMode === "fixed" ? { width } : {}),
        fontSize,
        textColor,
        backgroundColor: bg,
        bold,
        italic: false,
        border: stroke ?? borderNone(),
        borderRadius: radius(rounded),
      },
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: "center" },
      widthMode,
      ...(widthMode === "fixed" ? { width } : {}),
      heightMode: "hug",
      border: borderNone(),
      borderRadius: radius("0"),
    },
  };
}

function iconBlock(id, name, src, opts = {}) {
  const {
    size = "18px",
    color = COLORS.primary,
    alignH = "center",
    alignV = "center",
    widthMode = "hug",
  } = opts;

  return {
    id,
    type: "icon",
    blockMeta: { blockType: "content.icon", name },
    props: { src, color, size },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode,
      heightMode: "hug",
      border: borderNone(),
      borderRadius: radius("0"),
    },
  };
}

function heroBlock() {
  return {
    id: `${P}-hero`,
    type: "layout",
    blockMeta: { blockType: "layout.container", name: "首屏头图" },
    props: { direction: "vertical", gapMode: "fixed", gap: "0" },
    wrapperStyle: {
      contentAlign: { horizontal: "right", vertical: "top" },
      widthMode: "fill",
      heightMode: "fixed",
      height: "246px",
      padding: padding("16px", "20px", "0", "20px"),
      border: borderNone(),
      borderRadius: radius("0"),
      backgroundImage: {
        src: ASSETS.hero,
        alt: "adidas birthday voucher hero",
        fit: "cover",
        position: "center",
        border: borderNone(),
        borderRadius: radius("0"),
      },
    },
    children: [
      textBlock(`${P}-hero-adiclub`, "右上角 adiclub 标识", "adiclub", {
        alignH: "right",
        fontSize: "18px",
        color: COLORS.white,
        bold: true,
        widthMode: "hug",
      }),
    ],
  };
}

function divider(id, color = COLORS.line, height = "1px") {
  return layout(id, "分隔线", [], {
    widthMode: "fill",
    heightMode: "fixed",
    height,
    bg: color,
  });
}

function socialIcon(id, name, src) {
  return layout(
    `${P}-social-${id}-box`,
    `${name} 外框`,
    [iconBlock(`${P}-social-${id}`, `${name} 图标`, src, { size: "16px" })],
    {
      alignH: "center",
      alignV: "center",
      widthMode: "fixed",
      width: "28px",
      heightMode: "fixed",
      height: "28px",
      stroke: border("1px", COLORS.primary),
    }
  );
}

/* @mjs-slot:buildS1 */
function buildS1() {
  const topBar = layout(
    `${P}-preheader`,
    "顶部提示栏",
    [
      textBlock(`${P}-preheader-left`, "左侧提示", "You can still get a voucher on your next purchase.", {
        fontSize: "8px",
        decoration: "underline",
        widthMode: "fill",
      }),
      textBlock(`${P}-preheader-right`, "右侧在线查看", "View this email online", {
        alignH: "right",
        fontSize: "8px",
        decoration: "underline",
        widthMode: "hug",
      }),
    ],
    {
      direction: "horizontal",
      alignH: "left",
      alignV: "center",
      heightMode: "fixed",
      height: "25px",
      bg: COLORS.surface,
      pad: padding("0", "22px", "0", "22px"),
    }
  );

  const nav = layout(
    `${P}-nav`,
    "黑色导航栏",
    [
      iconBlock(`${P}-nav-logo`, "导航 adidas 标志", ASSETS.adidas, {
        color: COLORS.white,
        size: "31px",
      }),
      textBlock(`${P}-nav-men`, "导航 MEN", "MEN", {
        color: COLORS.white,
        fontSize: "8px",
        bold: true,
        widthMode: "hug",
      }),
      textBlock(`${P}-nav-women`, "导航 WOMEN", "WOMEN", {
        color: COLORS.white,
        fontSize: "8px",
        bold: true,
        widthMode: "hug",
      }),
      textBlock(`${P}-nav-kids`, "导航 KIDS", "KIDS", {
        color: COLORS.white,
        fontSize: "8px",
        bold: true,
        widthMode: "hug",
      }),
      textBlock(`${P}-nav-store`, "导航 STORE FINDER", "STORE FINDER", {
        color: COLORS.white,
        fontSize: "8px",
        bold: true,
        widthMode: "hug",
      }),
    ],
    {
      direction: "horizontal",
      gap: "12px",
      alignH: "left",
      alignV: "center",
      heightMode: "fixed",
      height: "40px",
      bg: COLORS.primary,
      pad: padding("0", "22px", "0", "22px"),
    }
  );

  return layout(`${P}-s1`, "顶部导航与头图模块", [topBar, nav, heroBlock()], {
    gap: "0",
    bg: COLORS.surface,
  });
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  return layout(
    `${P}-s2`,
    "生日券提示模块",
    [
      textBlock(`${P}-s2-title`, "主标题", "YOUR BIRTHDAY\nVOUCHER IS STILL HERE", {
        fontSize: "26px",
        bold: true,
      }),
      textBlock(
        `${P}-s2-desc1`,
        "生日券说明",
        "We hope you've had an unforgettable birthday. And remember, you can still\nget 15% off your next order.",
        { fontSize: "9px" }
      ),
      textBlock(`${P}-s2-desc2`, "下一步说明", "Head over to our website and find what's next", {
        fontSize: "10px",
      }),
      buttonBlock(`${P}-s2-cta`, "SHOP NOW 按钮", "SHOP NOW    ->", {
        width: "102px",
        fontSize: "10px",
      }),
    ],
    {
      gap: "13px",
      bg: COLORS.surface,
      pad: padding("18px", "22px", "16px", "22px"),
    }
  );
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  return layout(
    `${P}-s3`,
    "优惠码模块",
    [
      textBlock(`${P}-s3-title`, "优惠标题", "15% OFF. JUST FOR\nYOU.", {
        fontSize: "28px",
        bold: true,
      }),
      textBlock(`${P}-s3-desc`, "兑换说明", "To redeem offer, enter promo code below during online checkout.", {
        fontSize: "9px",
      }),
      textBlock(`${P}-s3-limit`, "有效期说明", "Limited time offer valid until October 08, 2025.", {
        fontSize: "9px",
        italic: true,
      }),
      layout(
        `${P}-s3-code-row`,
        "优惠码与兑换按钮行",
        [
          layout(
            `${P}-s3-code-box`,
            "优惠码白色块",
            [
              textBlock(`${P}-s3-code`, "优惠码", "BDAY-SMLS-DVS", {
                alignH: "center",
                fontSize: "7px",
                widthMode: "hug",
              }),
            ],
            {
              alignH: "center",
              alignV: "center",
              widthMode: "fixed",
              width: "83px",
              heightMode: "fixed",
              height: "31px",
              bg: COLORS.white,
            }
          ),
          buttonBlock(`${P}-s3-cta`, "REDEEM ONLINE 按钮", "REDEEM ONLINE    ->", {
            width: "121px",
            fontSize: "8px",
            bold: true,
          }),
        ],
        {
          direction: "horizontal",
          gap: "16px",
          alignH: "left",
          alignV: "center",
        }
      ),
    ],
    {
      gap: "13px",
      bg: COLORS.secondary,
      pad: padding("14px", "22px", "22px", "22px"),
    }
  );
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const appLogo = layout(
    `${P}-app-logo-box`,
    "App 黑底 adidas 图标",
    [
      iconBlock(`${P}-app-logo`, "App adidas 标志", ASSETS.adidas, {
        color: COLORS.white,
        size: "38px",
      }),
    ],
    {
      alignH: "center",
      alignV: "center",
      widthMode: "fixed",
      width: "59px",
      heightMode: "fixed",
      height: "59px",
      bg: COLORS.primary,
      rounded: "9px",
    }
  );

  const appText = layout(
    `${P}-app-text`,
    "App 推广文字",
    [
      textBlock(`${P}-app-title`, "App 标题", "THE WORLD\nOF ADIDAS APPS", {
        fontSize: "18px",
        bold: true,
      }),
      textBlock(`${P}-app-link`, "Discover 链接", "DISCOVER", {
        fontSize: "12px",
        bold: true,
        decoration: "underline",
        widthMode: "hug",
      }),
    ],
    {
      gap: "3px",
      widthMode: "fill",
    }
  );

  return layout(
    `${P}-s4`,
    "App 推广模块",
    [
      divider(`${P}-s4-top`, COLORS.primary),
      layout(`${P}-app-row`, "App 推广行", [appLogo, appText], {
        direction: "horizontal",
        gap: "23px",
        alignH: "left",
        alignV: "center",
        bg: COLORS.surface,
        pad: padding("24px", "22px", "23px", "22px"),
      }),
      divider(`${P}-s4-bottom`, COLORS.line),
    ],
    {
      gap: "0",
      bg: COLORS.surface,
    }
  );
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  return layout(
    `${P}-s5`,
    "社媒图标模块",
    [
      layout(
        `${P}-social-row`,
        "社媒图标行",
        [
          socialIcon("instagram", "Instagram", ASSETS.instagram),
          socialIcon("youtube", "YouTube", ASSETS.youtube),
          socialIcon("x", "X", ASSETS.x),
          socialIcon("pinterest", "Pinterest", ASSETS.pinterest),
        ],
        {
          direction: "horizontal",
          gap: "27px",
          alignH: "center",
          alignV: "center",
        }
      ),
    ],
    {
      alignH: "center",
      bg: COLORS.surface,
      pad: padding("22px", "22px", "22px", "22px"),
    }
  );
}
/* @mjs-slot-end:buildS5 */

/* @mjs-slot:buildS6 */
function buildS6() {
  const links = layout(
    `${P}-footer-links`,
    "页脚链接行",
    [
      textBlock(`${P}-footer-privacy`, "Privacy Statement", "Privacy Statement", {
        fontSize: "6px",
        decoration: "underline",
        widthMode: "hug",
      }),
      textBlock(`${P}-footer-support`, "Support", "Support", {
        fontSize: "6px",
        decoration: "underline",
        widthMode: "hug",
      }),
      textBlock(`${P}-footer-account`, "My Account", "My Account", {
        fontSize: "6px",
        decoration: "underline",
        widthMode: "hug",
      }),
      textBlock(`${P}-footer-unsubscribe`, "Unsubscribe", "Unsubscribe", {
        fontSize: "6px",
        decoration: "underline",
        widthMode: "hug",
      }),
      textBlock(`${P}-footer-site`, "adidas.com", "adidas.com", {
        fontSize: "6px",
        decoration: "underline",
        widthMode: "hug",
      }),
    ],
    {
      direction: "horizontal",
      gap: "8px",
      alignH: "left",
      alignV: "top",
    }
  );

  const terms =
    "*Limited time offer valid for 8 days from the date of this email. Discount applied to product price\n" +
    "at checkout and gives maximum discount value of $400. Must be logged in to adiClub account\n" +
    "for voucher to apply to purchase. Cannot be combined with other vouchers or discount codes.\n" +
    "Not valid on adidas gift cards and select products. Valid on domestic US orders and\n" +
    "participating US stores only. adidas reserves the right to end or change promotions at any\n" +
    "time.";

  const copyright =
    "© 2025 adidas America, Inc. adidas and the 3-Stripes mark are registered trademarks of\n" +
    "adidas America 5055 N. Greeley Avenue Portland, OR 97217 www.adidas.com";

  return layout(
    `${P}-s6`,
    "页脚合规模块",
    [
      divider(`${P}-footer-top`, COLORS.line),
      layout(
        `${P}-footer-body`,
        "页脚正文",
        [
          links,
          textBlock(`${P}-footer-terms`, "条款说明", terms, {
            fontSize: "6px",
            color: COLORS.muted,
          }),
          textBlock(`${P}-footer-copyright`, "版权信息", copyright, {
            fontSize: "6px",
            color: COLORS.muted,
          }),
        ],
        {
          gap: "8px",
          bg: COLORS.surface,
          pad: padding("20px", "22px", "18px", "22px"),
        }
      ),
    ],
    {
      gap: "0",
      bg: COLORS.surface,
    }
  );
}
/* @mjs-slot-end:buildS6 */

/* @mjs-slot:tokenPresets */
const tokenPresets = {
  schemaVersion: "1.0.0",
  activePresetId: "default",
  presets: {
    default: {
      label: displayName,
      description: "按设计图手工还原的 adidas 生日券留存提醒邮件，用于对照豆包底稿 patch 工作流。",
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: "22px", gap: "13px", pageInline: "22px" },
        typography: { display: "28px", h1: "26px", body: "10px", caption: "6px" },
        radius: { panel: "9px", cta: "0" },
      },
    },
  },
  scopeSelections: {},
};
/* @mjs-slot-end:tokenPresets */

/* @mjs-slot:template */
const template = {
  schemaVersion: "4.0.0",
  emailId: EMAIL,
  templateId: EMAIL,
  templateVersion: 1,
  locale: "en-US",
  root: {
    id: `${P}-root`,
    type: "emailRoot",
    blockMeta: { blockType: "layout.container", name: "画布根" },
    props: {
      padding: { mode: "unified", unified: "0" },
      backgroundColor: COLORS.surface,
      width: "600px",
      border: borderNone(),
      gapMode: "fixed",
      gap: "0",
    },
    wrapperStyle: { widthMode: "fill", heightMode: "hug" },
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6()],
  },
};
/* @mjs-slot-end:template */

function updateManifest() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.activeLayoutVariantId = layoutVariantId;
  const existing = manifest.variants.find((variant) => variant.id === layoutVariantId);
  const variant = {
    id: layoutVariantId,
    label: displayName,
    description: "手工按设计图还原，用于对照豆包底稿 patch 工作流",
    createdAt,
    publishStatus: "draft",
  };

  if (existing) {
    Object.assign(existing, variant);
  } else {
    manifest.variants.push(variant);
  }

  return manifest;
}

mkdirSync(layoutDir, { recursive: true });
writeFileSync(join(layoutDir, "tokenPresets.json"), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(layoutDir, "template.json"), `${JSON.stringify(template, null, 2)}\n`);
writeFileSync(manifestPath, `${JSON.stringify(updateManifest(), null, 2)}\n`);
console.log(`Wrote ${layoutDir}`);
