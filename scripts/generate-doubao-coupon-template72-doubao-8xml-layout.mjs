#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "左右复杂网格测试 8（xml 替换机制）";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/82efc612-2637-4fff-b217-8e3b1b07a7a3/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/82efc612-2637-4fff-b217-8e3b1b07a7a3/layout-out";

const PEXELS = {
  "hero-home-office": "https://images.pexels.com/photos/24245784/pexels-photo-24245784.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "block1-bedroom-dark-blue": "https://images.pexels.com/photos/4993094/pexels-photo-4993094.jpeg?auto=compress&cs=tinysrgb&h=130",
  "block2-home-office-flatiron": "https://images.pexels.com/photos/19410747/pexels-photo-19410747.jpeg?auto=compress&cs=tinysrgb&h=130",
  "block3-entryway-wing-it": "https://images.pexels.com/photos/19467972/pexels-photo-19467972.jpeg?auto=compress&cs=tinysrgb&h=130",
  "supply-ceiling-paint": "https://images.pexels.com/photos/32936636/pexels-photo-32936636.jpeg?auto=compress&cs=tinysrgb&h=130",
  "supply-interior-primer": "https://images.pexels.com/photos/1669754/pexels-photo-1669754.jpeg?auto=compress&cs=tinysrgb&h=130",
  "supply-paint-kit": "https://images.pexels.com/photos/5691634/pexels-photo-5691634.jpeg?auto=compress&cs=tinysrgb&h=130",
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
  surface: '#F6F5F2',
  cardBg: '#FFFFFF',
  textLight: '#888888',
  white: '#FFFFFF',
  accentNavy: '#0A2432',
  // Color swatches
  dailyGreens: '#809678',
  deepDive: '#365D73',
  goodnightMoon: '#243447',
  OMGreen: '#B3CBB9',
  flatiron: '#E6E3DF',
  likeButtah: '#F4EFE6',
  neutralTerritory: '#F0E9DE',
  dirtyChai: '#8E8A86',
  wingIt: '#F7E7E3',
  headspace: '#E5EDF0',
  greenish: '#F1EDE1',
  wink: '#E6EAF0',
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

function productCard(id, cardName, productName, imageSrc, imageAlt) {
  const alt = imageAlt ?? productName;
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: cardName },
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
        type: 'image',
        blockMeta: { blockType: 'content.image', name: `${productName}图` },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '100px',
          heightMode: 'fixed',
          height: '100px',
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
      buttonBlock(`${id}-cta`, '购买按钮', 'Shop now', { fontSize: '12px', widthMode: 'fixed', width: '100px' }),
    ],
  };
}

/* @mjs-slot:buildS1 */
function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部栏', { bg: COLORS.white, padTop: '16px', padBottom: '16px' });
  sec.children = [
    textBlock(`${P}-s1-logo`, '品牌标识', 'CLARE', { fontSize: '24px', bold: true, widthMode: 'hug' }),
    {
      id: `${P}-s1-banner`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '免邮横幅' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.surface,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s1-banner-text`, '免邮提示', 'FREE SHIPPING ON 5+ SWATCHES AND ORDERS $200+', { fontSize: '12px', bold: true }),
      ],
    },
    textBlock(`${P}-s1-title`, '主标题', 'You don\'t need more stuff—\njust a new paint color', { fontSize: '28px', bold: true }),
    imageContainer(`${P}-s1-hero`, '首屏主图', PEXELS['hero-home-office'], 'modern home office', '360px', [
      colorBadge(`${P}-s1-badge`, 'Flatiron', COLORS.white),
    ], 'right', 'bottom'),
    textBlock(`${P}-s1-desc1`, '说明1', 'If your rooms are feeling cluttered, flat or stuck in neutral overload, the answer isn\'t more decor. It\'s smarter color.', { alignH: 'left' }),
    textBlock(`${P}-s1-desc2`, '说明2', 'A thoughtful paint choice can simplify your space, calm the visual noise and make everything feel intentionally pulled together.', { alignH: 'left' }),
    buttonBlock(`${P}-s1-cta`, '找色按钮', 'Find Your Color', { bg: COLORS.secondary, fontSize: '16px', widthMode: 'fixed', width: '220px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  const sec = sectionShell(`${P}-s2`, '选色模块', { bg: COLORS.white });
  sec.children = [
    rowLayout(`${P}-s2-row`, '图文横排', [
      {
        id: `${P}-s2-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文字色卡' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s2-title`, '模块标题', 'Choose one color—\nand commit', { alignH: 'left', fontSize: '22px', bold: true }),
          textBlock(`${P}-s2-desc`, '模块说明', 'Instead of breaking up a room with contrast, let one color do the heavy lifting. Color drenching creates cohesion and calm.', { alignH: 'left' }),
          gridBlock(`${P}-s2-colors`, '色卡网格', 2, [
            colorSwatch(`${P}-s2-c1`, 'Daily Greens', COLORS.dailyGreens),
            colorSwatch(`${P}-s2-c2`, 'Deep Dive', COLORS.deepDive),
            colorSwatch(`${P}-s2-c3`, 'Goodnight Moon', COLORS.goodnightMoon),
            colorSwatch(`${P}-s2-c4`, 'OMGreen', COLORS.OMGreen),
          ], { gap: '16px', alignH: 'left' }),
        ],
      },
      imageContainer(`${P}-s2-img`, '深蓝色卧室图', PEXELS['block1-bedroom-dark-blue'], 'dark blue bedroom', '420px', [
        colorBadge(`${P}-s2-badge`, 'Goodnight Moon', COLORS.white),
      ], 'left', 'top'),
    ], { gap: '24px', alignH: 'left', alignV: 'top' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  const sec = sectionShell(`${P}-s3`, '空间定义模块', { bg: COLORS.white });
  sec.children = [
    rowLayout(`${P}-s3-row`, '图文横排', [
      imageContainer(`${P}-s3-img`, '浅色调办公室图', PEXELS['block2-home-office-flatiron'], 'light neutral home office', '420px', [
        colorBadge(`${P}-s3-badge`, 'Flatiron', COLORS.white),
      ], 'left', 'top'),
      {
        id: `${P}-s3-right`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '右侧文字色卡' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-title`, '模块标题', 'Use color to define,\nnot decorate', { alignH: 'left', fontSize: '22px', bold: true }),
          textBlock(`${P}-s3-desc`, '模块说明', 'Paint built-ins, cabinetry or a nook to give it purpose, without adding clutter.', { alignH: 'left' }),
          gridBlock(`${P}-s3-colors`, '色卡网格', 2, [
            colorSwatch(`${P}-s3-c1`, 'Flatiron', COLORS.flatiron),
            colorSwatch(`${P}-s3-c2`, 'Like Buttah', COLORS.likeButtah),
            colorSwatch(`${P}-s3-c3`, 'Neutral Territory', COLORS.neutralTerritory),
            colorSwatch(`${P}-s3-c4`, 'Dirty Chai', COLORS.dirtyChai),
          ], { gap: '16px', alignH: 'left' }),
        ],
      },
    ], { gap: '24px', alignH: 'left', alignV: 'top' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const sec = sectionShell(`${P}-s4`, '中性色升级模块', { bg: COLORS.white });
  sec.children = [
    rowLayout(`${P}-s4-row`, '图文横排', [
      {
        id: `${P}-s4-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文字色卡' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s4-title`, '模块标题', 'Move beyond\nneutral overload', { alignH: 'left', fontSize: '22px', bold: true }),
          textBlock(`${P}-s4-desc`, '模块说明', 'Neutrals are timeless, but too many can feel flat. Soft, liveable color adds warmth and depth without overwhelming your space.', { alignH: 'left' }),
          gridBlock(`${P}-s4-colors`, '色卡网格', 2, [
            colorSwatch(`${P}-s4-c1`, 'Wing It', COLORS.wingIt),
            colorSwatch(`${P}-s4-c2`, 'Headspace', COLORS.headspace),
            colorSwatch(`${P}-s4-c3`, 'Greenish', COLORS.greenish),
            colorSwatch(`${P}-s4-c4`, 'Wink', COLORS.wink),
          ], { gap: '16px', alignH: 'left' }),
        ],
      },
      imageContainer(`${P}-s4-img`, '浅粉色玄关图', PEXELS['block3-entryway-wing-it'], 'soft pink entryway', '420px', [
        colorBadge(`${P}-s4-badge`, 'Wing It', COLORS.white),
      ], 'left', 'top'),
    ], { gap: '24px', alignH: 'left', alignV: 'top' }),
    buttonBlock(`${P}-s4-cta`, '全色按钮', 'Shop All Colors', { bg: COLORS.secondary, fontSize: '16px', widthMode: 'fixed', width: '220px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  const sec = sectionShell(`${P}-s5`, '绘画用品模块', { bg: COLORS.surface });
  sec.children = [
    textBlock(`${P}-s5-subtitle`, '子标题', 'PAINTING ESSENTIALS', { fontSize: '14px', bold: true }),
    textBlock(`${P}-s5-title`, '模块标题', 'Ready to prep and paint like the pros?', { fontSize: '22px', bold: true }),
    textBlock(`${P}-s5-desc`, '模块说明', 'Our premium supplies are your DIY VIPs.'),
    gridBlock(`${P}-s5-products`, '产品网格', 3, [
      productCard(`${P}-s5-p1`, '天花板漆', 'Ceiling Paint', PEXELS['supply-ceiling-paint'], 'dark blue ceiling paint can'),
      productCard(`${P}-s5-p2`, '室内底漆', 'Interior Primer', PEXELS['supply-interior-primer'], 'light blue interior primer can'),
      productCard(`${P}-s5-p3`, '工具包', '5-Piece Paint Kit', PEXELS['supply-paint-kit'], '5 piece paint tool kit'),
    ], { gap: '24px' }),
    buttonBlock(`${P}-s5-cta`, '全用品按钮', 'Shop All Supplies', { bg: COLORS.secondary, fontSize: '16px', widthMode: 'fixed', width: '220px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS5 */

/* @mjs-slot:buildS6 */
function buildS6() {
  const sec = sectionShell(`${P}-s6`, '底部导航', { bg: COLORS.white, padTop: '0', padBottom: '0' });
  sec.children = [
    rowLayout(`${P}-s6-nav`, '导航栏', [
      {
        id: `${P}-s6-nav1`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '涂料导航' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'hug',
          backgroundColor: COLORS.accentNavy,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s6-nav1-text`, '导航文字', 'INTERIOR PAINT', { color: COLORS.white, fontSize: '14px', bold: true }),
        ],
      },
      {
        id: `${P}-s6-nav2`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '用品导航' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'hug',
          backgroundColor: COLORS.accentNavy,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s6-nav2-text`, '导航文字', 'SUPPLIES', { color: COLORS.white, fontSize: '14px', bold: true }),
        ],
      },
    ], { gap: '1px', alignH: 'stretch' }),
    {
      id: `${P}-s6-promo`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '促销信息栏' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.white,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s6-promo-text`, '促销文字', 'ORDERS $200+ SHIP FREE • SPEEDY DELIVERY', { fontSize: '12px' }),
      ],
    },
    {
      id: `${P}-s6-footer`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '页脚' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.accentNavy,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
      children: [
        textBlock(`${P}-s6-footer-logo`, '品牌标识', 'CLARE', { fontSize: '24px', bold: true, color: COLORS.white, widthMode: 'hug' }),
        rowLayout(`${P}-s6-social`, '社交媒体图标', [
          iconBlock(`${P}-s6-social-ig`, 'Instagram', ICON['social-instagram'], { size: '20px', color: COLORS.white }),
          iconBlock(`${P}-s6-social-tiktok`, 'TikTok', ICON['social-tiktok'], { size: '20px', color: COLORS.white }),
          iconBlock(`${P}-s6-social-fb`, 'Facebook', ICON['social-facebook'], { size: '20px', color: COLORS.white }),
          iconBlock(`${P}-s6-social-pin`, 'Pinterest', ICON['social-pinterest'], { size: '20px', color: COLORS.white }),
        ], { gap: '24px' }),
        textBlock(`${P}-s6-footer-copyright`, '版权信息', '© 2025 Clare Paint, LLC. | Unsubscribe | View in Your Browser | Privacy Policy\n1521 Concord Pike Suite 101, Wilmington DE 19803', { fontSize: '10px', color: COLORS.white }),
      ],
    },
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
      label: displayName,
      description: 'Clare paint product promotion email template with color swatches and painting supplies.',
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

