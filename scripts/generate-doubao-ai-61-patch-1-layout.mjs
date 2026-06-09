#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 61 底稿 patch 修复 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/60927144-c72f-4063-999d-a9d74714bc90/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/60927144-c72f-4063-999d-a9d74714bc90/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/15981465/pexels-photo-15981465.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "social-youtube": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-youtube.svg",
  "social-x": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-x.svg",
  "social-pinterest": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-pinterest.svg",
};
/* @mjs-slot:COLORS */
const COLORS = {
  primary: '#000000',
  secondary: '#F5F3EE',
  surface: '#FFFFFF',
  white: '#FFFFFF',
  textLight: '#666666',
};
/* @mjs-slot-end:COLORS */

function borderNone() {
  return { mode: 'unified', width: '0', style: 'solid', color: 'rgba(0,0,0,0)' };
}

function sectionShell(id, name, opts = {}) {
  const {
    bg = COLORS.surface,
    pageInline = true,
    padTop = '24px',
    padBottom = '24px',
    borderRadius = '0',
    stroke,
  } = opts;
  const border = stroke
    ? { mode: 'unified', width: stroke.width ?? '1px', style: 'solid', color: stroke.color ?? COLORS.primary }
    : borderNone();
  const padding = pageInline
    ? { mode: 'separate', top: padTop, right: '20px', bottom: padBottom, left: '20px' }
    : { mode: 'separate', top: padTop, right: '0', bottom: padBottom, left: '0' };
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: bg,
      border: borderNone(),
      padding,
      border,
      borderRadius: { mode: 'unified', radius: borderRadius },
    },
    children: [],
  };
}

function textBlock(id, name, content, opts = {}) {
  const {
    alignH = 'center',
    fontSize = '16px',
    color = COLORS.primary,
    bold = false,
    widthMode = 'fill',
  } = opts;
  return {
    id,
    type: 'text',
    blockMeta: { blockType: 'content.text', name },
    props: {
      textBody: { paragraphs: [{ runs: [{ text: content }] }] },
      fontSize,
      color,
      bold,
      italic: false,
      decoration: 'none',
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'top' },
      widthMode,
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function buttonBlock(id, name, label, opts = {}) {
  const {
    alignH = 'center',
    bg = COLORS.secondary,
    textColor = COLORS.primary,
    fontSize = '16px',
    radius = '9999px',
    widthMode = 'hug',
    width,
    stroke,
  } = opts;
  const border = stroke
    ? {
        mode: 'unified',
        width: stroke.width ?? '1px',
        style: 'solid',
        color: stroke.color ?? textColor,
      }
    : borderNone();
  return {
    id,
    type: 'button',
    blockMeta: { blockType: 'action.button', name },
    props: {
      text: label,
      link: { href: '#', type: 'external' },
      buttonStyle: {
        fontSize,
        textColor,
        backgroundColor: bg,
        bold: false,
        italic: false,
        border,
        borderRadius: { mode: 'unified', radius },
      },
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'center' },
      widthMode,
      ...(widthMode === 'fixed' && width ? { width } : {}),
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function iconBlock(id, name, src, opts = {}) {
  const { size = '24px', color = COLORS.primary } = opts;
  return {
    id,
    type: 'icon',
    blockMeta: { blockType: 'content.icon', name },
    props: { src: src ?? '', size, color },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function coverImage(id, name, src, alt, height) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
    },
  };
}

/** height 须由 buildS* 按设计图传入，助手内不写默认 px */
function barcodeImage(id, name, height) {
  return coverImage(id, name, '#', 'barcode', height);
}

function imageContainer(id, name, src, alt, height, overlayChildren, alignH, alignV) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'fixed',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '8px' },
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '8px' },
      },
    },
    children: overlayChildren,
  };
}

function colorBadge(id, name, color, textColor) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '色名角标' },
    wrapperStyle: {
      widthMode: 'hug',
      heightMode: 'hug',
      backgroundColor: color,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '9999px' },
    },
    children: [
      textBlock(`${id}-text`, '角标文字', name, {
        fontSize: '12px',
        color: textColor ?? COLORS.primary,
        widthMode: 'hug',
      }),
    ],
  };
}

/** blobSize 为色块直径（宽高相同），须按设计图传入 */
function colorSwatch(id, name, color, blobSize) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '色卡项' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${id}-blob`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '色卡blob' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: blobSize,
          heightMode: 'fixed',
          height: blobSize,
          backgroundColor: color,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '9999px' },
        },
        children: [],
      },
      textBlock(`${id}-name`, '色卡名称', name, { fontSize: '14px', widthMode: 'hug' }),
    ],
  };
}

function gridBlock(id, name, columns, children, opts = {}) {
  const { gap = '16px', alignH = 'center', alignV = 'top' } = opts;
  return {
    id,
    type: 'grid',
    blockMeta: { blockType: 'layout.grid', name },
    props: { columns, gap, cellWidthMode: 'auto', cellHeightMode: 'content-max' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children,
  };
}

function rowLayout(id, name, children, opts = {}) {
  const { gap = '16px', alignH = 'center', alignV = 'top' } = opts;
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'horizontal', gapMode: 'fixed', gap },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children,
  };
}

/** imgWidth/imgHeight 须按设计图产品缩略图区域传入，助手内不写默认 px */
function productCard(id, cardName, productName, imageSrc, imageAlt, imgWidth, imgHeight) {
  const alt = imageAlt ?? productName;
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: cardName },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${id}-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: `${productName}图` },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: imgWidth,
          heightMode: 'fixed',
          height: imgHeight,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '8px' },
          backgroundImage: {
            src: imageSrc,
            alt,
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '8px' },
          },
        },
      },
      textBlock(`${id}-name`, '产品名称', productName, { fontSize: '14px' }),
      buttonBlock(`${id}-cta`, '购买按钮', 'Shop now', { fontSize: '12px', widthMode: 'hug' }),
    ],
  };
}

/* @mjs-slot:buildS1 */
function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部栏+导航栏+首屏图', { bg: COLORS.surface, padTop: '0', padBottom: '0', pageInline: false });
  const topBar = {
    id: `${P}-s1-top`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '顶部提示栏' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'space-between', vertical: 'center' },
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: COLORS.white,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s1-top-left`, '左侧提示', 'You can still get a voucher on your next purchase.', {
        alignH: 'left',
        fontSize: '12px',
        bold: false,
        widthMode: 'hug',
      }),
      textBlock(`${P}-s1-top-right`, '右侧链接', 'View this email online', {
        alignH: 'right',
        fontSize: '12px',
        bold: false,
        widthMode: 'hug',
      }),
    ],
  };
  const navBar = {
    id: `${P}-s1-nav`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '导航栏' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'center' },
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: COLORS.primary,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${P}-s1-nav-logo`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '阿迪达斯logo' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '60px',
          heightMode: 'fixed',
          height: '32px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: '#',
            alt: 'adidas logo',
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
        children: [],
      },
      textBlock(`${P}-s1-nav-men`, '导航-男士', 'MEN', {
        color: COLORS.white,
        bold: true,
        fontSize: '14px',
        alignH: 'left',
        widthMode: 'hug',
      }),
      textBlock(`${P}-s1-nav-women`, '导航-女士', 'WOMEN', {
        color: COLORS.white,
        bold: true,
        fontSize: '14px',
        alignH: 'left',
        widthMode: 'hug',
      }),
      textBlock(`${P}-s1-nav-kids`, '导航-儿童', 'KIDS', {
        color: COLORS.white,
        bold: true,
        fontSize: '14px',
        alignH: 'left',
        widthMode: 'hug',
      }),
      textBlock(`${P}-s1-nav-store`, '导航-门店', 'STORE FINDER', {
        color: COLORS.white,
        bold: true,
        fontSize: '14px',
        alignH: 'left',
        widthMode: 'hug',
      }),
    ],
  };
  const heroImg = imageContainer(`${P}-s1-hero`, '首屏主图', PEXELS.hero, 'two happy young people wearing adidas sportswear laughing outdoors', '480px', [
    textBlock(`${P}-s1-hero-badge`, '右上角adiclub标识', 'adiclub', {
      color: COLORS.white,
      bold: true,
      fontSize: '32px',
      alignH: 'right',
      widthMode: 'hug',
    }),
  ], 'right', 'top');
  sec.children = [topBar, navBar, heroImg];
  return sec;
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  const sec = sectionShell(`${P}-s2`, '生日券提示模块', { bg: COLORS.surface, padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s2-title`, '主标题', 'YOUR BIRTHDAY\nVOUCHER IS STILL HERE', {
      alignH: 'left',
      fontSize: '48px',
      bold: true,
    }),
    textBlock(`${P}-s2-desc1`, '描述1', "We hope you've had an unforgettable birthday. And remember, you can still get 15% off your next order.", {
      alignH: 'left',
      fontSize: '16px',
    }),
    textBlock(`${P}-s2-desc2`, '描述2', 'Head over to our website and find what\'s next', {
      alignH: 'left',
      fontSize: '16px',
    }),
    buttonBlock(`${P}-s2-cta`, '立即购买按钮', 'SHOP NOW →', {
      alignH: 'left',
      bg: COLORS.primary,
      textColor: COLORS.white,
      fontSize: '16px',
      radius: '0',
      widthMode: 'fixed',
      width: '220px',
      bold: true,
    }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  const sec = sectionShell(`${P}-s3`, '优惠码模块', { bg: COLORS.secondary, padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s3-title`, '优惠标题', '15% OFF. JUST FOR\nYOU.', {
      alignH: 'left',
      fontSize: '48px',
      bold: true,
    }),
    textBlock(`${P}-s3-desc1`, '兑换说明', 'To redeem offer, enter promo code below during online checkout.', {
      alignH: 'left',
      fontSize: '16px',
    }),
    textBlock(`${P}-s3-desc2`, '有效期说明', 'Limited time offer valid until October 08, 2025.', {
      alignH: 'left',
      fontSize: '16px',
      bold: true,
    }),
    rowLayout(`${P}-s3-code-row`, '优惠码与兑换按钮行', [
      {
        id: `${P}-s3-code`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '优惠码容器' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '220px',
          heightMode: 'fixed',
          height: '48px',
          backgroundColor: COLORS.white,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-code-text`, '优惠码', 'BDAY-SMLS-DVS', {
            fontSize: '14px',
            bold: true,
          }),
        ],
      },
      buttonBlock(`${P}-s3-cta`, '在线兑换按钮', 'REDEEM ONLINE →', {
        alignH: 'left',
        bg: COLORS.primary,
        textColor: COLORS.white,
        fontSize: '16px',
        radius: '0',
        widthMode: 'fixed',
        width: '280px',
        bold: true,
      }),
    ], { gap: '16px', alignH: 'left', alignV: 'center' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const sec = sectionShell(`${P}-s4`, '阿迪达斯APP推广模块', { bg: COLORS.surface, padTop: '32px', padBottom: '32px', stroke: { width: '1px', color: COLORS.primary } });
  sec.children = [
    rowLayout(`${P}-s4-app-row`, 'APP推广行', [
      {
        id: `${P}-s4-app-logo`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '阿迪达斯APPlogo' },
        wrapperStyle: {
  backgroundImage: {
    src: '#',
    alt: '',
    fit: 'contain',
    position: 'center',
    border: borderNone(),
    borderRadius: { mode: 'unified', radius: '0' },
  },
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '100px',
          heightMode: 'fixed',
          height: '100px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '16px' },
          backgroundColor: COLORS.primary,
        },
        children: [],
      },
      {
        id: `${P}-s4-app-text`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: 'APP推广文字' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s4-app-title`, 'APP标题', 'THE WORLD\nOF ADIDAS APPS', {
            alignH: 'left',
            fontSize: '32px',
            bold: true,
          }),
          textBlock(`${P}-s4-app-link`, '发现链接', 'DISCOVER', {
            alignH: 'left',
            fontSize: '20px',
            bold: true,
            decoration: 'underline',
          }),
        ],
      },
    ], { gap: '24px', alignH: 'left', alignV: 'center' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  const sec = sectionShell(`${P}-s5`, '社交媒体模块', { bg: COLORS.surface, padTop: '32px', padBottom: '32px', stroke: { width: '1px', color: COLORS.secondary } });
  sec.children = [
    rowLayout(`${P}-s5-social`, '社交媒体图标行', [
      iconBlock(`${P}-s5-ig`, 'Instagram图标', ICON["social-instagram"], { size: '32px' }),
      iconBlock(`${P}-s5-yt`, 'Youtube图标', ICON["social-youtube"], { size: '32px' }),
      iconBlock(`${P}-s5-x`, 'X图标', ICON["social-x"], { size: '32px' }),
      iconBlock(`${P}-s5-pin`, 'Pinterest图标', ICON["social-pinterest"], { size: '32px' }),
    ], { gap: '48px', alignH: 'center', alignV: 'center' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS5 */

/* @mjs-slot:buildS6 */
function buildS6() {
  const sec = sectionShell(`${P}-s6`, '页脚模块', { bg: COLORS.surface, padTop: '24px', padBottom: '24px', stroke: { width: '1px', color: COLORS.secondary } });
  const footerLinks = rowLayout(`${P}-s6-links`, '页脚链接行', [
    textBlock(`${P}-s6-link-privacy`, '隐私声明', 'Privacy Statement', {
      fontSize: '12px',
      widthMode: 'hug',
    }),
    textBlock(`${P}-s6-link-support`, '支持', 'Support', {
      fontSize: '12px',
      widthMode: 'hug',
    }),
    textBlock(`${P}-s6-link-account`, '我的账户', 'My Account', {
      fontSize: '12px',
      widthMode: 'hug',
    }),
    textBlock(`${P}-s6-link-unsubscribe`, '退订', 'Unsubscribe', {
      fontSize: '12px',
      widthMode: 'hug',
    }),
    textBlock(`${P}-s6-link-site`, '官网', 'adidas.com', {
      fontSize: '12px',
      widthMode: 'hug',
    }),
  ], { gap: '16px', alignH: 'left', alignV: 'top' });
  const terms = textBlock(`${P}-s6-terms`, '条款说明', '*Limited time offer valid for 8 days from the date of this email. Discount applied to product price at checkout and gives maximum discount value of $400. Must be logged in to adiClub account for voucher to apply to purchase. Cannot be combined with other vouchers or discount codes. Not valid on adidas gift cards and select products. Valid on domestic US orders and participating US stores only. adidas reserves the right to end or change promotions at any time.', {
    alignH: 'left',
    fontSize: '12px',
    color: COLORS.textLight,
  });
  const copyright = textBlock(`${P}-s6-copyright`, '版权信息', '© 2025 adidas America, Inc. adidas and the 3-Stripes mark are registered trademarks of adidas America 5055 N. Greeley Avenue Portland, OR 97217 www.adidas.com', {
    alignH: 'left',
    fontSize: '12px',
    color: COLORS.textLight,
  });
  sec.children = [footerLinks, terms, copyright];
  return sec;
}
/* @mjs-slot-end:buildS6 */





/* @mjs-slot:tokenPresets */
const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: displayName,
      description: '阿迪达斯生日优惠券提醒邮件模板，包含导航、首屏图、优惠信息、兑换码、APP推广、社交媒体和页脚',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '48px', h1: '32px', body: '16px', caption: '12px' },
        radius: { panel: '16px', cta: '0' },
      },
    },
  },
  scopeSelections: {},
};
/* @mjs-slot-end:tokenPresets */

/* @mjs-slot:template */
const template = {
  schemaVersion: '4.0.0',
  emailId: EMAIL,
  templateId: EMAIL,
  templateVersion: 1,
  locale: 'en-US',
  root: {
    id: `${P}-root`,
    type: 'emailRoot',
    blockMeta: { blockType: 'layout.container', name: '画布根' },
    props: {
      padding: { mode: 'unified', unified: '0' },
      backgroundColor: COLORS.surface,
      width: '600px',
      border: borderNone(),
      gapMode: 'fixed',
      gap: '0',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6()],
  },
};
/* @mjs-slot-end:template */

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

