#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 61 底稿patch";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/e3c907fa-33ca-4bff-b428-8af740957773/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/e3c907fa-33ca-4bff-b428-8af740957773/layout-out";

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
  secondary: '#F5F1E9',
  surface: '#FFFFFF',
  textLight: '#666666',
  white: '#FFFFFF',
  black: '#000000',
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
  const sec = sectionShell(`${P}-s1`, '顶部通知栏', { bg: COLORS.white, padTop: '8px', padBottom: '8px' });
  sec.children = [
    rowLayout(`${P}-s1-topbar`, '顶部栏', [
      textBlock(`${P}-s1-notice`, '通知文字', 'You can still get a voucher on your next purchase.', {
        fontSize: '12px',
        color: COLORS.black,
        alignH: 'left',
        widthMode: 'fill',
      }),
      textBlock(`${P}-s1-view`, '在线查看链接', 'View this email online', {
        fontSize: '12px',
        color: COLORS.black,
        alignH: 'right',
        widthMode: 'hug',
      }),
    ], { alignH: 'space-between', gap: '0' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  const sec = sectionShell(`${P}-s2`, '导航栏', { bg: COLORS.black, pageInline: false, padTop: '12px', padBottom: '12px' });
  sec.children = [
    rowLayout(`${P}-s2-nav`, '导航内容', [
      {
        id: `${P}-s2-logo`,
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
            src: 'https://assets.adidas.com/images/w_80,f_auto,q_auto,fl_lossy/55a56f2393a949009f1daed6009e8a81_9366/adidas_originals_logo_black.png',
            alt: 'adidas logo',
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
        children: [],
      },
      textBlock(`${P}-s2-men`, '男装导航', 'MEN', { fontSize: '14px', color: COLORS.white, widthMode: 'hug' }),
      textBlock(`${P}-s2-women`, '女装导航', 'WOMEN', { fontSize: '14px', color: COLORS.white, widthMode: 'hug' }),
      textBlock(`${P}-s2-kids`, '童装导航', 'KIDS', { fontSize: '14px', color: COLORS.white, widthMode: 'hug' }),
      textBlock(`${P}-s2-store`, '门店导航', 'STORE FINDER', { fontSize: '14px', color: COLORS.white, widthMode: 'hug' }),
    ], { alignH: 'left', gap: '24px' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  const sec = sectionShell(`${P}-s3`, '首屏海报', { bg: COLORS.white, pageInline: false, padTop: '0', padBottom: '0' });
  sec.children = [
    imageContainer(`${P}-s3-hero`, '首屏图', PEXELS.hero, 'young people wearing adidas sportswear', '480px', [
      textBlock(`${P}-s3-adiclub`, 'adiclub标识', 'adiclub', {
        fontSize: '32px',
        color: COLORS.white,
        bold: true,
        alignH: 'right',
        widthMode: 'hug',
      }),
    ], 'right', 'top')
  ];
  return sec;
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const sec = sectionShell(`${P}-s4`, '生日券提醒', { bg: COLORS.white, padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s4-title`, '主标题', 'YOUR BIRTHDAY\nVOUCHER IS STILL HERE', {
      fontSize: '48px',
      bold: true,
      alignH: 'left',
    }),
    textBlock(`${P}-s4-desc1`, '祝福文案', 'We hope you\'ve had an unforgettable birthday. And remember, you can still get 15% off your next order.', {
      fontSize: '16px',
      alignH: 'left',
    }),
    textBlock(`${P}-s4-desc2`, '引导文案', 'Head over to our website and find what\'s next', {
      fontSize: '16px',
      alignH: 'left',
    }),
    buttonBlock(`${P}-s4-cta`, '立即购买按钮', 'SHOP NOW →', {
      alignH: 'left',
      bg: COLORS.black,
      textColor: COLORS.white,
      fontSize: '16px',
      radius: '0',
      widthMode: 'fixed',
      width: '200px',
    }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  const sec = sectionShell(`${P}-s5`, '优惠码区块', { bg: COLORS.secondary, padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s5-title`, '优惠标题', '15% OFF. JUST FOR\nYOU.', {
      fontSize: '48px',
      bold: true,
      alignH: 'left',
    }),
    textBlock(`${P}-s5-desc1`, '兑换说明', 'To redeem offer, enter promo code below during online checkout.', {
      fontSize: '16px',
      alignH: 'left',
    }),
    textBlock(`${P}-s5-desc2`, '有效期说明', 'Limited time offer valid until October 08, 2025.', {
      fontSize: '16px',
      alignH: 'left',
    }),
    rowLayout(`${P}-s5-code-row`, '优惠码行', [
      {
        id: `${P}-s5-code-box`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '优惠码容器' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '200px',
          heightMode: 'fixed',
          height: '48px',
          backgroundColor: COLORS.white,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s5-code`, '优惠码', 'BDAY-SMLS-DVS', { fontSize: '14px', bold: true })
        ],
      },
      buttonBlock(`${P}-s5-redeem`, '线上兑换按钮', 'REDEEM ONLINE →', {
        alignH: 'left',
        bg: COLORS.black,
        textColor: COLORS.white,
        fontSize: '16px',
        radius: '0',
        widthMode: 'fixed',
        width: '240px',
      }),
    ], { alignH: 'left', gap: '16px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS5 */

/* @mjs-slot:buildS6 */
function buildS6() {
  const sec = sectionShell(`${P}-s6`, 'APP推广区块', { bg: COLORS.white, padTop: '32px', padBottom: '32px', stroke: { width: '1px', color: COLORS.black } });
  sec.children = [
    rowLayout(`${P}-s6-app-row`, 'APP推广内容', [
      {
        id: `${P}-s6-app-logo`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: 'APP图标' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '100px',
          heightMode: 'fixed',
          height: '80px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '16px' },
          backgroundImage: {
            src: 'https://assets.adidas.com/images/w_100,f_auto,q_auto,fl_lossy/6f6b8d97e8f84a2380e0ac5200f43c1a_9366/adidas_app_icon.png',
            alt: 'adidas app icon',
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '16px' },
          },
        },
        children: [],
      },
      {
        id: `${P}-s6-app-text`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: 'APP文字' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s6-app-title`, 'APP标题', 'THE WORLD\nOF ADIDAS APPS', {
            fontSize: '24px',
            bold: true,
            alignH: 'left',
          }),
          textBlock(`${P}-s6-app-cta`, 'APP按钮', 'DISCOVER', {
            fontSize: '16px',
            bold: true,
            decoration: 'underline',
            alignH: 'left',
          }),
        ],
      },
    ], { alignH: 'left', gap: '24px' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS6 */

/* @mjs-slot:buildS7 */
function buildS7() {
  const sec = sectionShell(`${P}-s7`, '社媒图标栏', { bg: COLORS.white, padTop: '24px', padBottom: '24px', stroke: { width: '1px', color: COLORS.secondary } });
  sec.children = [
    rowLayout(`${P}-s7-social`, '社媒图标', [
      iconBlock(`${P}-s7-ig`, 'instagram图标', ICON["social-instagram"], { size: '24px', color: COLORS.black }),
      iconBlock(`${P}-s7-yt`, 'youtube图标', ICON["social-youtube"], { size: '24px', color: COLORS.black }),
      iconBlock(`${P}-s7-x`, 'x图标', ICON["social-x"], { size: '24px', color: COLORS.black }),
      iconBlock(`${P}-s7-pin`, 'pinterest图标', ICON["social-pinterest"], { size: '24px', color: COLORS.black }),
    ], { alignH: 'center', gap: '40px' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS7 */

/* @mjs-slot:buildS8 */
function buildS8() {
  const sec = sectionShell(`${P}-s8`, '页脚', { bg: COLORS.white, padTop: '24px', padBottom: '24px' });
  sec.children = [
    rowLayout(`${P}-s8-links`, '页脚链接', [
      textBlock(`${P}-s8-privacy`, '隐私声明', 'Privacy Statement', { fontSize: '12px', widthMode: 'hug' }),
      textBlock(`${P}-s8-support`, '支持', 'Support', { fontSize: '12px', widthMode: 'hug' }),
      textBlock(`${P}-s8-account`, '我的账户', 'My Account', { fontSize: '12px', widthMode: 'hug' }),
      textBlock(`${P}-s8-unsubscribe`, '退订', 'Unsubscribe', { fontSize: '12px', widthMode: 'hug' }),
      textBlock(`${P}-s8-site`, '官网', 'adidas.com', { fontSize: '12px', widthMode: 'hug' }),
    ], { alignH: 'left', gap: '16px' }),
    textBlock(`${P}-s8-terms`, '条款说明', '*Limited time offer valid for 8 days from the date of this email. Discount applied to product price at checkout and gives maximum discount value of $400. Must be logged in to adiClub account for voucher to apply to purchase. Cannot be combined with other vouchers or discount codes. Not valid on adidas gift cards and select products. Valid on domestic US orders and participating US stores only. adidas reserves the right to end or change promotions at any time.', {
      fontSize: '12px',
      color: COLORS.textLight,
      alignH: 'left',
    }),
    textBlock(`${P}-s8-copyright`, '版权信息', '© 2025 adidas America, Inc. adidas and the 3-Stripes mark are registered trademarks of adidas America 5055 N. Greeley Avenue Portland, OR 97217 www.adidas.com', {
      fontSize: '12px',
      color: COLORS.textLight,
      alignH: 'left',
    }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS8 */

/* @mjs-slot:tokenPresets */
const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'adidas Birthday Voucher Reminder',
      description: 'Adidas adiClub birthday voucher reminder email with 15% off promotion',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '48px', h1: '24px', body: '16px', caption: '12px' },
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
      borderRadius: { mode: 'unified', radius: '0' },
      width: '600px',
      border: borderNone(),
      gapMode: 'fixed',
      gap: '0',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7(), buildS8()],
  },
};
/* @mjs-slot-end:template */

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

