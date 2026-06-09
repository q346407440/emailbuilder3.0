#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "左右复杂网格测试 6（xml 替换机制）";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/f07ad4ce-0216-42fa-951c-71ca64480464/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/f07ad4ce-0216-42fa-951c-71ca64480464/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/19410747/pexels-photo-19410747.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "block1-bedroom": "https://images.pexels.com/photos/15667603/pexels-photo-15667603.jpeg?auto=compress&cs=tinysrgb&h=350",
  "block2-office": "https://images.pexels.com/photos/7546637/pexels-photo-7546637.jpeg?auto=compress&cs=tinysrgb&h=350",
  "block3-entryway": "https://images.pexels.com/photos/14714643/pexels-photo-14714643.jpeg?auto=compress&cs=tinysrgb&h=350",
  "supply-ceiling-paint": "https://images.pexels.com/photos/9222200/pexels-photo-9222200.jpeg?auto=compress&cs=tinysrgb&h=130",
  "supply-primer": "https://images.pexels.com/photos/5642093/pexels-photo-5642093.jpeg?auto=compress&cs=tinysrgb&h=130",
  "supply-paint-kit": "https://images.pexels.com/photos/5691634/pexels-photo-5691634.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "social-twitter": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-twitter.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-facebook.svg",
  "social-pinterest": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-pinterest.svg",
};
/* @mjs-slot:COLORS */
const COLORS = {
  primary: '#111111',
  secondary: '#F9C80E',
  surface: '#F5F2EF',
  cardBg: '#FFFFFF',
  textLight: '#888888',
  accentDark: '#0A3D5B',
  white: '#FFFFFF',
  swatchDailyGreens: '#7A8F70',
  swatchDeepDive: '#365D73',
  swatchGoodnightMoon: '#243447',
  swatchOMGreen: '#B3CBB9',
  swatchFlatiron: '#E1DDD8',
  swatchLikeButtah: '#F6EFE6',
  swatchNeutralTerritory: '#F0E7DD',
  swatchDirtyChai: '#928D88',
  swatchWingIt: '#F0E8E2',
  swatchHeadspace: '#E0EAED',
  swatchGreenish: '#EDE9DE',
  swatchWink: '#E6EBF1',
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
  const sec = sectionShell(`${P}-s1`, '首屏模块', { bg: COLORS.surface, padTop: '32px' });
  sec.children = [
    textBlock(`${P}-s1-title`, '主标题', "You don't need more stuff—\njust a new paint color", { fontSize: '28px', bold: true }),
    imageContainer(`${P}-s1-hero`, '首屏主图', PEXELS.hero, 'modern home office', '360px', [
      colorBadge(`${P}-s1-badge`, 'Flatiron', COLORS.white, COLORS.primary),
    ], 'right', 'bottom'),
    textBlock(`${P}-s1-desc1`, '描述1', "If your rooms are feeling cluttered, flat or stuck in neutral overload, the answer isn't more decor. It's smarter color.", { alignH: 'left' }),
    textBlock(`${P}-s1-desc2`, '描述2', "A thoughtful paint choice can simplify your space, calm the visual noise and make everything feel intentionally pulled together.", { alignH: 'left' }),
    buttonBlock(`${P}-s1-cta`, '找颜色按钮', 'Find Your Color', { bg: COLORS.secondary, textColor: COLORS.primary, widthMode: 'fixed', width: '200px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  const sec = sectionShell(`${P}-s2`, '深蓝色卧室模块', { bg: COLORS.white, padTop: '32px' });
  sec.children = [
    rowLayout(`${P}-s2-row`, '图文横排', [
      {
        id: `${P}-s2-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文案' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fixed',
          width: '260px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s2-title`, '标题', 'Choose one color—\nand commit', { alignH: 'left', fontSize: '20px', bold: true }),
          textBlock(`${P}-s2-desc`, '描述', "Instead of breaking up a room with contrast, let one color do the heavy lifting. Color drenching creates cohesion and calm.", { alignH: 'left', fontSize: '14px' }),
          gridBlock(`${P}-s2-swatches`, '色卡网格', 2, [
            colorSwatch(`${P}-s2-s1`, 'Daily Greens', COLORS.swatchDailyGreens),
            colorSwatch(`${P}-s2-s2`, 'Deep Dive', COLORS.swatchDeepDive),
            colorSwatch(`${P}-s2-s3`, 'Goodnight Moon', COLORS.swatchGoodnightMoon),
            colorSwatch(`${P}-s2-s4`, 'OMGreen', COLORS.swatchOMGreen),
          ], { alignH: 'left', gap: '16px' }),
        ],
      },
      imageContainer(`${P}-s2-img`, '深蓝色卧室', PEXELS['block1-bedroom'], 'modern bedroom with dark blue ceiling', '480px', [
        colorBadge(`${P}-s2-badge`, 'Goodnight Moon', COLORS.white, COLORS.primary),
      ], 'left', 'top'),
    ], { alignH: 'space-between', gap: '20px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  const sec = sectionShell(`${P}-s3`, '中性色办公室模块', { bg: COLORS.white, padTop: '32px' });
  sec.children = [
    rowLayout(`${P}-s3-row`, '图文横排', [
      imageContainer(`${P}-s3-img`, '浅灰色办公室', PEXELS['block2-office'], 'minimalist home office', '480px', [
        colorBadge(`${P}-s3-badge`, 'Flatiron', COLORS.white, COLORS.primary),
      ], 'left', 'top'),
      {
        id: `${P}-s3-right`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '右侧文案' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fixed',
          width: '260px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-title`, '标题', 'Use color to define,\nnot decorate', { alignH: 'left', fontSize: '20px', bold: true }),
          textBlock(`${P}-s3-desc`, '描述', "Paint built-ins, cabinetry or a nook to give it purpose, without adding clutter.", { alignH: 'left', fontSize: '14px' }),
          gridBlock(`${P}-s3-swatches`, '色卡网格', 2, [
            colorSwatch(`${P}-s3-s1`, 'Flatiron', COLORS.swatchFlatiron),
            colorSwatch(`${P}-s3-s2`, 'Like Buttah', COLORS.swatchLikeButtah),
            colorSwatch(`${P}-s3-s3`, 'Neutral Territory', COLORS.swatchNeutralTerritory),
            colorSwatch(`${P}-s3-s4`, 'Dirty Chai', COLORS.swatchDirtyChai),
          ], { alignH: 'left', gap: '16px' }),
        ],
      },
    ], { alignH: 'space-between', gap: '20px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const sec = sectionShell(`${P}-s4`, '浅粉色玄关模块', { bg: COLORS.white, padTop: '32px', padBottom: '32px' });
  sec.children = [
    rowLayout(`${P}-s4-row`, '图文横排', [
      {
        id: `${P}-s4-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文案' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fixed',
          width: '260px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s4-title`, '标题', 'Move beyond\nneutral overload', { alignH: 'left', fontSize: '20px', bold: true }),
          textBlock(`${P}-s4-desc`, '描述', "Neutrals are timeless, but too many can feel flat. Soft, liveable color adds warmth and depth without overwhelming your space.", { alignH: 'left', fontSize: '14px' }),
          gridBlock(`${P}-s4-swatches`, '色卡网格', 2, [
            colorSwatch(`${P}-s4-s1`, 'Wing It', COLORS.swatchWingIt),
            colorSwatch(`${P}-s4-s2`, 'Headspace', COLORS.swatchHeadspace),
            colorSwatch(`${P}-s4-s3`, 'Greenish', COLORS.swatchGreenish),
            colorSwatch(`${P}-s4-s4`, 'Wink', COLORS.swatchWink),
          ], { alignH: 'left', gap: '16px' }),
        ],
      },
      imageContainer(`${P}-s4-img`, '浅粉色玄关', PEXELS['block3-entryway'], 'soft pink painted entryway', '480px', [
        colorBadge(`${P}-s4-badge`, 'Wing It', COLORS.white, COLORS.primary),
      ], 'left', 'top'),
    ], { alignH: 'space-between', gap: '20px' }),
    buttonBlock(`${P}-s4-cta`, '看所有颜色按钮', 'Shop All Colors', { bg: COLORS.secondary, textColor: COLORS.primary, widthMode: 'fixed', width: '200px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  const sec = sectionShell(`${P}-s5`, '绘画用品模块', { bg: '#EDF2F5', padTop: '32px' });
  sec.children = [
    textBlock(`${P}-s5-subtitle`, '子标题', 'PAINTING ESSENTIALS', { fontSize: '12px', color: COLORS.accentDark, bold: true }),
    textBlock(`${P}-s5-title`, '标题', 'Ready to prep and paint like the pros?', { fontSize: '24px', bold: true }),
    textBlock(`${P}-s5-desc`, '描述', 'Our premium supplies are your DIY VIPs.', { fontSize: '14px' }),
    gridBlock(`${P}-s5-products`, '产品网格', 3, [
      {
        id: `${P}-s5-p1`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '天花板油漆产品' },
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
            id: `${P}-s5-p1-img`,
            type: 'image',
            blockMeta: { blockType: 'content.image', name: '天花板油漆图' },
            wrapperStyle: {
              contentAlign: { horizontal: 'center', vertical: 'top' },
              widthMode: 'fixed',
              width: '100px',
              heightMode: 'fixed',
              height: '100px',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '8px' },
              backgroundImage: {
                src: PEXELS['supply-ceiling-paint'],
                alt: 'dark blue ceiling paint can',
                fit: 'cover',
                position: 'center',
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '8px' },
              },
            },
          },
          textBlock(`${P}-s5-p1-name`, '产品名', 'Ceiling Paint', { fontSize: '14px' }),
          buttonBlock(`${P}-s5-p1-cta`, '购买按钮', 'Shop now', { bg: COLORS.secondary, textColor: COLORS.primary, fontSize: '12px', widthMode: 'fixed', width: '100px' }),
        ],
      },
      {
        id: `${P}-s5-p2`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '室内底漆产品' },
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
            id: `${P}-s5-p2-img`,
            type: 'image',
            blockMeta: { blockType: 'content.image', name: '室内底漆图' },
            wrapperStyle: {
              contentAlign: { horizontal: 'center', vertical: 'top' },
              widthMode: 'fixed',
              width: '100px',
              heightMode: 'fixed',
              height: '100px',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '8px' },
              backgroundImage: {
                src: PEXELS['supply-primer'],
                alt: 'light blue primer can',
                fit: 'cover',
                position: 'center',
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '8px' },
              },
            },
          },
          textBlock(`${P}-s5-p2-name`, '产品名', 'Interior Primer', { fontSize: '14px' }),
          buttonBlock(`${P}-s5-p2-cta`, '购买按钮', 'Shop now', { bg: COLORS.secondary, textColor: COLORS.primary, fontSize: '12px', widthMode: 'fixed', width: '100px' }),
        ],
      },
      {
        id: `${P}-s5-p3`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '油漆工具包产品' },
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
            id: `${P}-s5-p3-img`,
            type: 'image',
            blockMeta: { blockType: 'content.image', name: '油漆工具包图' },
            wrapperStyle: {
              contentAlign: { horizontal: 'center', vertical: 'top' },
              widthMode: 'fixed',
              width: '100px',
              heightMode: 'fixed',
              height: '100px',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '8px' },
              backgroundImage: {
                src: PEXELS['supply-paint-kit'],
                alt: 'paint roller tray brush kit',
                fit: 'cover',
                position: 'center',
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '8px' },
              },
            },
          },
          textBlock(`${P}-s5-p3-name`, '产品名', '5-Piece Paint Kit', { fontSize: '14px' }),
          buttonBlock(`${P}-s5-p3-cta`, '购买按钮', 'Shop now', { bg: COLORS.secondary, textColor: COLORS.primary, fontSize: '12px', widthMode: 'fixed', width: '100px' }),
        ],
      },
    ], { gap: '20px' }),
    buttonBlock(`${P}-s5-cta`, '看所有用品按钮', 'Shop All Supplies', { bg: COLORS.secondary, textColor: COLORS.primary, widthMode: 'fixed', width: '220px' }),
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
        id: `${P}-s6-nav1`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '油漆导航项' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '300px',
          heightMode: 'fixed',
          height: '40px',
          backgroundColor: COLORS.accentDark,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s6-nav1-text`, '导航文字', 'INTERIOR PAINT', { color: COLORS.white, fontSize: '12px', bold: true }),
        ],
      },
      {
        id: `${P}-s6-nav2`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '用品导航项' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '300px',
          heightMode: 'fixed',
          height: '40px',
          backgroundColor: COLORS.accentDark,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s6-nav2-text`, '导航文字', 'SUPPLIES', { color: COLORS.white, fontSize: '12px', bold: true }),
        ],
      },
    ], { gap: '0' }),
    {
      id: `${P}-s6-promo`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '配送说明' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.white,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s6-promo-text`, '配送文字', 'ORDERS $200+ SHIP FREE • SPEEDY DELIVERY', { fontSize: '12px' }),
      ],
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
        backgroundColor: COLORS.accentDark,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s6-footer-logo`, 'Logo文字', 'CLARE', { color: COLORS.white, fontSize: '24px', bold: true }),
        rowLayout(`${P}-s6-social`, '社交图标栏', [
          iconBlock(`${P}-s6-social-ig`, 'Instagram图标', ICON['social-instagram'], { color: COLORS.white, size: '20px' }),
          iconBlock(`${P}-s6-social-tw`, 'Twitter图标', ICON['social-twitter'], { color: COLORS.white, size: '20px' }),
          iconBlock(`${P}-s6-social-fb`, 'Facebook图标', ICON['social-facebook'], { color: COLORS.white, size: '20px' }),
          iconBlock(`${P}-s6-social-pi`, 'Pinterest图标', ICON['social-pinterest'], { color: COLORS.white, size: '20px' }),
        ], { gap: '16px' }),
        textBlock(`${P}-s6-footer-copyright`, '版权文字', '© 2025 Clare Paint, LLC', { color: COLORS.white, fontSize: '12px' }),
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
      description: '油漆产品推广邮件模板，包含产品展示、色卡推荐、绘画用品介绍',
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

