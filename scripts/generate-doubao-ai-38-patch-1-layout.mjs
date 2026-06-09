#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 38 底稿 patch 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/b791995f-2f74-4164-9fb0-2d8796bf5d16/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/b791995f-2f74-4164-9fb0-2d8796bf5d16/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/19410747/pexels-photo-19410747.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "block1-bedroom": "https://images.pexels.com/photos/7031218/pexels-photo-7031218.jpeg?auto=compress&cs=tinysrgb&h=130",
  "block2-office": "https://images.pexels.com/photos/19410747/pexels-photo-19410747.jpeg?auto=compress&cs=tinysrgb&h=130",
  "block3-entryway": "https://images.pexels.com/photos/19467972/pexels-photo-19467972.jpeg?auto=compress&cs=tinysrgb&h=130",
  "supply-ceiling-paint": "https://images.pexels.com/photos/9222200/pexels-photo-9222200.jpeg?auto=compress&cs=tinysrgb&h=130",
  "supply-interior-primer": "https://images.pexels.com/photos/5642093/pexels-photo-5642093.jpeg?auto=compress&cs=tinysrgb&h=130",
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
  surface: '#F5F3EF',
  cardBg: '#FFFFFF',
  textLight: '#666666',
  white: '#FFFFFF',
  darkBlue: '#0A3D62',
  swatchDailyGreens: '#809678',
  swatchDeepDive: '#365D73',
  swatchGoodnightMoon: '#243447',
  swatchOMGreen: '#B3CBB9',
  swatchFlatiron: '#D8D4CF',
  swatchLikeButtah: '#F1ECE6',
  swatchNeutralTerritory: '#F0E6DD',
  swatchDirtyChai: '#9A948E',
  swatchWingIt: '#F2E5D7',
  swatchHeadspace: '#E3EEF0',
  swatchGreenish: '#EBEAE0',
  swatchWink: '#E4E7EE',
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
  const sec = sectionShell(`${P}-s1`, '顶部导航与首屏', { bg: COLORS.cardBg, padTop: '0', padBottom: '24px' });
  sec.children = [
    {
      id: `${P}-s1-header`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '品牌栏' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.cardBg,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s1-logo`, '品牌logo', 'CLARE', { fontSize: '24px', bold: true }),
        {
          id: `${P}-s1-notice`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '免邮通知条' },
          wrapperStyle: {
            contentAlign: { horizontal: 'center', vertical: 'center' },
            widthMode: 'fill',
            heightMode: 'hug',
            backgroundColor: '#E2DAD0',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            textBlock(`${P}-s1-notice-text`, '免邮通知', 'FREE SHIPPING ON 5+ SWATCHES AND ORDERS $200+', { fontSize: '12px' }),
          ],
        },
      ],
    },
    textBlock(`${P}-s1-title`, '主标题', "You don't need more stuff—\njust a new paint color", { fontSize: '24px', bold: true }),
    imageContainer(`${P}-s1-hero`, '首屏家庭办公室图', PEXELS.hero, 'bright modern home office', '400px', [
      {
        id: `${P}-s1-badge-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '角标容器' },
        wrapperStyle: {
          contentAlign: { horizontal: 'right', vertical: 'bottom' },
          widthMode: 'fill',
          heightMode: 'fill',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '8px' },
        },
        children: [
          colorBadge(`${P}-s1-badge`, 'Flatiron', COLORS.white, COLORS.textLight),
        ],
      },
    ], 'left', 'top'),
    textBlock(`${P}-s1-desc1`, '描述文案1', "If your rooms are feeling cluttered, flat or stuck in neutral overload, the answer isn't more decor. It's smarter color.", { fontSize: '14px', alignH: 'left' }),
    textBlock(`${P}-s1-desc2`, '描述文案2', "A thoughtful paint choice can simplify your space, calm the visual noise and make everything feel intentionally pulled together.", { fontSize: '14px', alignH: 'left' }),
    buttonBlock(`${P}-s1-cta`, '找颜色按钮', 'Find Your Color', { bg: COLORS.secondary, textColor: COLORS.primary, widthMode: 'fixed', width: '200px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  const sec = sectionShell(`${P}-s2`, '深色配色模块', { bg: COLORS.cardBg, padTop: '24px', padBottom: '24px' });
  sec.children = [
    rowLayout(`${P}-s2-row`, '图文行', [
      {
        id: `${P}-s2-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文案色卡区' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s2-title`, '模块标题', 'Choose one color—\nand commit', { fontSize: '20px', bold: true, alignH: 'left' }),
          textBlock(`${P}-s2-desc`, '模块描述', 'Instead of breaking up a room with contrast, let one color do the heavy lifting. Color drenching creates cohesion and calm.', { fontSize: '14px', alignH: 'left' }),
          gridBlock(`${P}-s2-swatches`, '深色系色卡网格', 2, [
            colorSwatch(`${P}-s2-s1`, 'Daily Greens', COLORS.swatchDailyGreens),
            colorSwatch(`${P}-s2-s2`, 'Deep Dive', COLORS.swatchDeepDive),
            colorSwatch(`${P}-s2-s3`, 'Goodnight Moon', COLORS.swatchGoodnightMoon),
            colorSwatch(`${P}-s2-s4`, 'OMGreen', COLORS.swatchOMGreen),
          ], { gap: '16px', alignH: 'left' }),
        ],
      },
      {
        id: `${P}-s2-right`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '右侧图片区' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          imageContainer(`${P}-s2-img`, '深蓝色卧室图', PEXELS['block1-bedroom'], 'bedroom with dark blue ceiling', '400px', [
            {
              id: `${P}-s2-badge-wrap`,
              type: 'layout',
              blockMeta: { blockType: 'layout.container', name: '角标容器' },
              wrapperStyle: {
                contentAlign: { horizontal: 'left', vertical: 'top' },
                widthMode: 'fill',
                heightMode: 'fill',
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '8px' },
              },
              children: [
                colorBadge(`${P}-s2-badge`, 'Goodnight Moon', COLORS.white, COLORS.swatchGoodnightMoon),
              ],
            },
          ], 'left', 'top'),
        ],
      },
    ], { alignH: 'left', alignV: 'top', gap: '24px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  const sec = sectionShell(`${P}-s3`, '中性色配色模块', { bg: COLORS.cardBg, padTop: '24px', padBottom: '24px' });
  sec.children = [
    rowLayout(`${P}-s3-row`, '图文行', [
      {
        id: `${P}-s3-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧图片区' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          imageContainer(`${P}-s3-img`, '浅灰色办公室图', PEXELS['block2-office'], 'cozy home office with neutral paint', '400px', [
            {
              id: `${P}-s3-badge-wrap`,
              type: 'layout',
              blockMeta: { blockType: 'layout.container', name: '角标容器' },
              wrapperStyle: {
                contentAlign: { horizontal: 'left', vertical: 'top' },
                widthMode: 'fill',
                heightMode: 'fill',
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '8px' },
              },
              children: [
                colorBadge(`${P}-s3-badge`, 'Flatiron', COLORS.white, COLORS.textLight),
              ],
            },
          ], 'left', 'top'),
        ],
      },
      {
        id: `${P}-s3-right`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '右侧文案色卡区' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-title`, '模块标题', 'Use color to define,\nnot decorate', { fontSize: '20px', bold: true, alignH: 'left' }),
          textBlock(`${P}-s3-desc`, '模块描述', 'Paint built-ins, cabinetry or a nook to give it purpose, without adding clutter.', { fontSize: '14px', alignH: 'left' }),
          gridBlock(`${P}-s3-swatches`, '中性系色卡网格', 2, [
            colorSwatch(`${P}-s3-s1`, 'Flatiron', COLORS.swatchFlatiron),
            colorSwatch(`${P}-s3-s2`, 'Like Buttah', COLORS.swatchLikeButtah),
            colorSwatch(`${P}-s3-s3`, 'Neutral Territory', COLORS.swatchNeutralTerritory),
            colorSwatch(`${P}-s3-s4`, 'Dirty Chai', COLORS.swatchDirtyChai),
          ], { gap: '16px', alignH: 'left' }),
        ],
      },
    ], { alignH: 'left', alignV: 'top', gap: '24px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const sec = sectionShell(`${P}-s4`, '浅粉色配色模块', { bg: COLORS.cardBg, padTop: '24px', padBottom: '24px' });
  sec.children = [
    rowLayout(`${P}-s4-row`, '图文行', [
      {
        id: `${P}-s4-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文案色卡区' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s4-title`, '模块标题', 'Move beyond\nneutral overload', { fontSize: '20px', bold: true, alignH: 'left' }),
          textBlock(`${P}-s4-desc`, '模块描述', 'Neutrals are timeless, but too many can feel flat. Soft, liveable color adds warmth and depth without overwhelming your space.', { fontSize: '14px', alignH: 'left' }),
          gridBlock(`${P}-s4-swatches`, '暖色系色卡网格', 2, [
            colorSwatch(`${P}-s4-s1`, 'Wing It', COLORS.swatchWingIt),
            colorSwatch(`${P}-s4-s2`, 'Headspace', COLORS.swatchHeadspace),
            colorSwatch(`${P}-s4-s3`, 'Greenish', COLORS.swatchGreenish),
            colorSwatch(`${P}-s4-s4`, 'Wink', COLORS.swatchWink),
          ], { gap: '16px', alignH: 'left' }),
        ],
      },
      {
        id: `${P}-s4-right`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '右侧图片区' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          imageContainer(`${P}-s4-img`, '浅粉色玄关图', PEXELS['block3-entryway'], 'small entryway with soft peach pink paint', '400px', [
            {
              id: `${P}-s4-badge-wrap`,
              type: 'layout',
              blockMeta: { blockType: 'layout.container', name: '角标容器' },
              wrapperStyle: {
                contentAlign: { horizontal: 'left', vertical: 'top' },
                widthMode: 'fill',
                heightMode: 'fill',
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '8px' },
              },
              children: [
                colorBadge(`${P}-s4-badge`, 'Wing It', COLORS.white, COLORS.textLight),
              ],
            },
          ], 'left', 'top'),
        ],
      },
    ], { alignH: 'left', alignV: 'top', gap: '24px' }),
    buttonBlock(`${P}-s4-cta`, '看全部颜色按钮', 'Shop All Colors', { bg: COLORS.secondary, textColor: COLORS.primary, widthMode: 'fixed', width: '200px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  const sec = sectionShell(`${P}-s5`, '绘画工具模块', { bg: '#EDF2F5', padTop: '24px', padBottom: '24px' });
  sec.children = [
    textBlock(`${P}-s5-subtitle`, '子标题', 'PAINTING ESSENTIALS', { fontSize: '14px', bold: true }),
    textBlock(`${P}-s5-title`, '模块标题', 'Ready to prep and paint like the pros?', { fontSize: '20px', bold: true }),
    textBlock(`${P}-s5-desc`, '模块描述', 'Our premium supplies are your DIY VIPs.', { fontSize: '14px' }),
    gridBlock(`${P}-s5-products`, '产品网格', 3, [
      productCard(`${P}-s5-p1`, '天花板漆', 'Ceiling Paint', PEXELS['supply-ceiling-paint'], 'dark blue paint can product'),
      productCard(`${P}-s5-p2`, '室内底漆', 'Interior Primer', PEXELS['supply-interior-primer'], 'light blue primer paint can product'),
      productCard(`${P}-s5-p3`, '工具包', '5-Piece Paint Kit', PEXELS['supply-paint-kit'], '5 piece paint roller tray kit product'),
    ], { gap: '16px' }),
    buttonBlock(`${P}-s5-cta`, '看全部工具按钮', 'Shop All Supplies', { bg: COLORS.secondary, textColor: COLORS.primary, widthMode: 'fixed', width: '220px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS5 */

/* @mjs-slot:buildS6 */
function buildS6() {
  const sec = sectionShell(`${P}-s6`, '底部导航与页脚', { bg: COLORS.cardBg, padTop: '0', padBottom: '0' });
  sec.children = [
    gridBlock(`${P}-s6-nav`, '底部导航栏', 2, [
      {
        id: `${P}-s6-nav1`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '油漆导航' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'hug',
          backgroundColor: COLORS.darkBlue,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s6-nav1-text`, '导航文字', 'INTERIOR PAINT', { fontSize: '14px', color: COLORS.white }),
        ],
      },
      {
        id: `${P}-s6-nav2`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '工具导航' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'hug',
          backgroundColor: COLORS.darkBlue,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s6-nav2-text`, '导航文字', 'SUPPLIES', { fontSize: '14px', color: COLORS.white }),
        ],
      },
    ], { gap: '1px' }),
    {
      id: `${P}-s6-info`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '服务信息栏' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.cardBg,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s6-info-text`, '服务信息', 'ORDERS $200+ SHIP FREE • SPEEDY DELIVERY', { fontSize: '12px', color: COLORS.textLight }),
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
        backgroundColor: COLORS.darkBlue,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s6-logo`, '品牌logo', 'CLARE', { fontSize: '24px', bold: true, color: COLORS.white }),
        rowLayout(`${P}-s6-social`, '社媒图标行', [
          iconBlock(`${P}-s6-social-ig`, 'Instagram图标', ICON['social-instagram'], { size: '20px', color: COLORS.white }),
          iconBlock(`${P}-s6-social-tk`, 'TikTok图标', ICON['social-tiktok'], { size: '20px', color: COLORS.white }),
          iconBlock(`${P}-s6-social-fb`, 'Facebook图标', ICON['social-facebook'], { size: '20px', color: COLORS.white }),
          iconBlock(`${P}-s6-social-pi`, 'Pinterest图标', ICON['social-pinterest'], { size: '20px', color: COLORS.white }),
        ], { gap: '16px' }),
        textBlock(`${P}-s6-copyright`, '版权信息', '© 2026 Clare Paint, LLC. | Unsubscribe | View in Your Browser | Privacy Policy\n1521 Concord Pike Suite 101, Wilmington DE 19803', { fontSize: '10px', color: COLORS.white }),
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
      description: 'Clare油漆品牌宣传邮件，展示配色方案与绘画工具',
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

