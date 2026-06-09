#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "左右复杂网格测试 7（xml 替换机制）";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/f12cabdc-14d2-4474-8329-354b7d8ac0a2/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/f12cabdc-14d2-4474-8329-354b7d8ac0a2/layout-out";

const PEXELS = {
  "hero-home-office": "https://images.pexels.com/photos/19410747/pexels-photo-19410747.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "dark-blue-bedroom": "https://images.pexels.com/photos/4993094/pexels-photo-4993094.jpeg?auto=compress&cs=tinysrgb&h=350",
  "neutral-home-office": "https://images.pexels.com/photos/19410747/pexels-photo-19410747.jpeg?auto=compress&cs=tinysrgb&h=350",
  "soft-pink-entryway": "https://images.pexels.com/photos/8086027/pexels-photo-8086027.jpeg?auto=compress&cs=tinysrgb&h=350",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "social-tiktok": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-tiktok.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-facebook.svg",
  "social-pinterest": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-pinterest.svg",
};
/* @mjs-slot:COLORS */
const COLORS = {
  primary: '#111111',
  secondary: '#F9C80E',
  surface: '#F5F5F0',
  cardBg: '#FFFFFF',
  textLight: '#666666',
  white: '#FFFFFF',
  darkBlue: '#0F3047',
  colorDailyGreens: '#809678',
  colorDeepDive: '#365D73',
  colorGoodnightMoon: '#243447',
  colorOMGreen: '#B3CBB9',
  colorFlatiron: '#E6E2DD',
  colorLikeButtah: '#F3EEE8',
  colorNeutralTerritory: '#F0E9E0',
  colorDirtyChai: '#979086',
  colorWingIt: '#F0E2DE',
  colorHeadspace: '#E1EEF0',
  colorGreenish: '#F0EFE7',
  colorWink: '#E3E9EF',
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

function barcodeImage(id, name, height = '80px') {
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

function colorSwatch(id, name, color) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '色卡项' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '120px',
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
          width: '60px',
          heightMode: 'fixed',
          height: '60px',
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

function productCard(id, name, productName) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '产品卡片' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '160px',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${id}-img`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '产品占位图' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '100px',
          heightMode: 'fixed',
          height: '100px',
          backgroundColor: COLORS.surface,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '8px' },
        },
        children: [],
      },
      textBlock(`${id}-name`, '产品名称', productName, { fontSize: '14px' }),
      buttonBlock(`${id}-cta`, '购买按钮', 'Shop now', { fontSize: '12px', widthMode: 'fixed', width: '100px' }),
    ],
  };
}

/* @mjs-slot:buildS1 */
function buildS1() {
  const sec = sectionShell(`${P}-s1`, '首屏模块', { bg: COLORS.surface, padTop: '0', padBottom: '32px' });
  sec.children = [
    {
      id: `${P}-s1-top-banner`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '顶部公告栏' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: '#E8E2D9',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s1-banner-text`, '公告文字', 'FREE SHIPPING ON 5+ SWATCHES AND ORDERS $200+', { fontSize: '12px', bold: true })
      ]
    },
    {
      id: `${P}-s1-logo`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '品牌logo' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.white,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s1-logo-text`, 'CLARE', 'CLARE', { fontSize: '28px', bold: true })
      ]
    },
    textBlock(`${P}-s1-title`, '主标题', 'You don\'t need more stuff—\njust a new paint color', { fontSize: '24px', bold: true }),
    imageContainer(`${P}-s1-hero`, '首屏家居图', PEXELS['hero-home-office'], 'bright home office with built in shelves', '380px', [
      colorBadge(`${P}-s1-badge`, 'Flatiron', COLORS.white, COLORS.textLight)
    ], 'right', 'bottom'),
    textBlock(`${P}-s1-desc1`, '描述1', 'If your rooms are feeling cluttered, flat or stuck in neutral overload, the answer isn\'t more decor. It\'s smarter color.', { fontSize: '14px', color: COLORS.textLight }),
    textBlock(`${P}-s1-desc2`, '描述2', 'A thoughtful paint choice can simplify your space, calm the visual noise and make everything feel intentionally pulled together.', { fontSize: '14px', color: COLORS.textLight }),
    buttonBlock(`${P}-s1-cta`, '查找颜色按钮', 'Find Your Color', { bg: COLORS.secondary, textColor: COLORS.primary, widthMode: 'fixed', width: '200px' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  const sec = sectionShell(`${P}-s2`, '单色系模块', { bg: COLORS.white, padTop: '32px', padBottom: '32px' });
  sec.children = [
    rowLayout(`${P}-s2-row`, '图文行', [
      {
        id: `${P}-s2-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文案色卡' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s2-title`, '模块标题', 'Choose one color—\nand commit', { alignH: 'left', fontSize: '20px', bold: true, widthMode: 'hug' }),
          textBlock(`${P}-s2-desc`, '模块描述', 'Instead of breaking up a room with contrast, let one color do the heavy lifting. Color drenching creates cohesion and calm.', { alignH: 'left', fontSize: '14px', color: COLORS.textLight }),
          gridBlock(`${P}-s2-colors`, '深色系色卡', 2, [
            colorSwatch(`${P}-s2-c1`, 'Daily Greens', COLORS.colorDailyGreens),
            colorSwatch(`${P}-s2-c2`, 'Deep Dive', COLORS.colorDeepDive),
            colorSwatch(`${P}-s2-c3`, 'Goodnight Moon', COLORS.colorGoodnightMoon),
            colorSwatch(`${P}-s2-c4`, 'OMGreen', COLORS.colorOMGreen),
          ], { alignH: 'left', gap: '16px' })
        ]
      },
      imageContainer(`${P}-s2-right-img`, '深蓝色卧室图', PEXELS['dark-blue-bedroom'], 'bedroom with dark blue accent wall', '420px', [
        colorBadge(`${P}-s2-badge`, 'Goodnight Moon', COLORS.white, COLORS.colorGoodnightMoon)
      ], 'left', 'top')
    ], { alignH: 'left', alignV: 'top', gap: '24px' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  const sec = sectionShell(`${P}-s3`, '中性色模块', { bg: COLORS.white, padTop: '0', padBottom: '32px' });
  sec.children = [
    rowLayout(`${P}-s3-row`, '图文行', [
      imageContainer(`${P}-s3-left-img`, '浅色家居办公室图', PEXELS['neutral-home-office'], 'minimalist home office with neutral paint', '420px', [
        colorBadge(`${P}-s3-badge`, 'Flatiron', COLORS.white, COLORS.textLight)
      ], 'left', 'top'),
      {
        id: `${P}-s3-right`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '右侧文案色卡' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-title`, '模块标题', 'Use color to define,\nnot decorate', { alignH: 'left', fontSize: '20px', bold: true, widthMode: 'hug' }),
          textBlock(`${P}-s3-desc`, '模块描述', 'Paint built-ins, cabinetry or a nook to give it purpose, without adding clutter.', { alignH: 'left', fontSize: '14px', color: COLORS.textLight }),
          gridBlock(`${P}-s3-colors`, '中性色色卡', 2, [
            colorSwatch(`${P}-s3-c1`, 'Flatiron', COLORS.colorFlatiron),
            colorSwatch(`${P}-s3-c2`, 'Like Buttah', COLORS.colorLikeButtah),
            colorSwatch(`${P}-s3-c3`, 'Neutral Territory', COLORS.colorNeutralTerritory),
            colorSwatch(`${P}-s3-c4`, 'Dirty Chai', COLORS.colorDirtyChai),
          ], { alignH: 'left', gap: '16px' })
        ]
      }
    ], { alignH: 'left', alignV: 'top', gap: '24px' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const sec = sectionShell(`${P}-s4`, '暖色系模块', { bg: COLORS.white, padTop: '0', padBottom: '32px' });
  sec.children = [
    rowLayout(`${P}-s4-row`, '图文行', [
      {
        id: `${P}-s4-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文案色卡' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s4-title`, '模块标题', 'Move beyond\nneutral overload', { alignH: 'left', fontSize: '20px', bold: true, widthMode: 'hug' }),
          textBlock(`${P}-s4-desc`, '模块描述', 'Neutrals are timeless, but too many can feel flat. Soft, liveable color adds warmth and depth without overwhelming your space.', { alignH: 'left', fontSize: '14px', color: COLORS.textLight }),
          gridBlock(`${P}-s4-colors`, '暖色系色卡', 2, [
            colorSwatch(`${P}-s4-c1`, 'Wing It', COLORS.colorWingIt),
            colorSwatch(`${P}-s4-c2`, 'Headspace', COLORS.colorHeadspace),
            colorSwatch(`${P}-s4-c3`, 'Greenish', COLORS.colorGreenish),
            colorSwatch(`${P}-s4-c4`, 'Wink', COLORS.colorWink),
          ], { alignH: 'left', gap: '16px' })
        ]
      },
      imageContainer(`${P}-s4-right-img`, '浅粉色玄关图', PEXELS['soft-pink-entryway'], 'entryway with soft warm pink paint', '420px', [
        colorBadge(`${P}-s4-badge`, 'Wing It', COLORS.white, COLORS.textLight)
      ], 'left', 'top')
    ], { alignH: 'left', alignV: 'top', gap: '24px' }),
    buttonBlock(`${P}-s4-cta`, '查看全部颜色按钮', 'Shop All Colors', { bg: COLORS.secondary, textColor: COLORS.primary, widthMode: 'fixed', width: '200px' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  const sec = sectionShell(`${P}-s5`, '绘画工具模块', { bg: COLORS.surface, padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s5-subtitle`, '子标题', 'PAINTING ESSENTIALS', { fontSize: '12px', bold: true }),
    textBlock(`${P}-s5-title`, '模块标题', 'Ready to prep and paint like the pros?', { fontSize: '22px', bold: true }),
    textBlock(`${P}-s5-desc`, '模块描述', 'Our premium supplies are your DIY VIPs.', { fontSize: '14px', color: COLORS.textLight }),
    gridBlock(`${P}-s5-products`, '产品网格', 3, [
      productCard(`${P}-s5-p1`, '天花板漆', 'Ceiling Paint'),
      productCard(`${P}-s5-p2`, '室内底漆', 'Interior Primer'),
      productCard(`${P}-s5-p3`, '五件套油漆工具', '5-Piece Paint Kit'),
    ], { gap: '16px' }),
    buttonBlock(`${P}-s5-cta`, '查看全部工具按钮', 'Shop All Supplies', { bg: COLORS.secondary, textColor: COLORS.primary, widthMode: 'fixed', width: '240px' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS5 */

/* @mjs-slot:buildS6 */
function buildS6() {
  const sec = sectionShell(`${P}-s6`, '底部导航模块', { bg: COLORS.white, padTop: '0', padBottom: '0', pageInline: false });
  sec.children = [
    rowLayout(`${P}-s6-nav`, '导航栏', [
      {
        id: `${P}-s6-nav-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧导航项' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'hug',
          backgroundColor: COLORS.darkBlue,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s6-nav-text1`, '导航文字1', 'INTERIOR PAINT', { color: COLORS.white, fontSize: '12px', bold: true })
        ]
      },
      {
        id: `${P}-s6-nav-right`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '右侧导航项' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'hug',
          backgroundColor: COLORS.darkBlue,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s6-nav-text2`, '导航文字2', 'SUPPLIES', { color: COLORS.white, fontSize: '12px', bold: true })
        ]
      }
    ], { gap: '1px', alignH: 'center', alignV: 'stretch' }),
    {
      id: `${P}-s6-info-bar`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '信息栏' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.white,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s6-info-text`, '信息文字', 'ORDERS $200+ SHIP FREE • SPEEDY DELIVERY', { fontSize: '12px', color: COLORS.textLight })
      ]
    },
    {
      id: `${P}-s6-footer`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '页脚' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.darkBlue,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s6-footer-logo`, '页脚logo', 'CLARE', { color: COLORS.white, fontSize: '24px', bold: true }),
        rowLayout(`${P}-s6-social`, '社交图标栏', [
          iconBlock(`${P}-s6-ig`, 'Instagram图标', ICON.socialInstagram, { size: '20px', color: COLORS.white }),
          iconBlock(`${P}-s6-tiktok`, 'TikTok图标', ICON.socialTiktok, { size: '20px', color: COLORS.white }),
          iconBlock(`${P}-s6-fb`, 'Facebook图标', ICON.socialFacebook, { size: '20px', color: COLORS.white }),
          iconBlock(`${P}-s6-pin`, 'Pinterest图标', ICON.socialPinterest, { size: '20px', color: COLORS.white }),
        ], { gap: '20px' }),
        textBlock(`${P}-s6-copyright`, '版权文字', '© 2026 Clare Paint, LLC. | Unsubscribe | View in Your Browser | Privacy Policy\n1521 Concord Pike Suite 101, Wilmington DE 19803', { color: COLORS.white, fontSize: '10px' })
      ]
    }
  ];
  return sec;
}
/* @mjs-slot-end:buildS6 */





/* @mjs-slot:tokenPresets */
const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: '油漆优惠券模板',
      description: 'Clare油漆品牌推广模板，包含颜色推荐与绘画工具促销',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '36px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '8px', cta: '9999px' },
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

