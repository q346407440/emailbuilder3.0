#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 38 整段生成 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/87dbb6de-16bf-4e26-bf39-c5f88fa98005/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/87dbb6de-16bf-4e26-bf39-c5f88fa98005/layout-out";

const PEXELS = {
  "hero-home-office": "https://images.pexels.com/photos/19410747/pexels-photo-19410747.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "block1-blue-bedroom": "https://images.pexels.com/photos/15667603/pexels-photo-15667603.jpeg?auto=compress&cs=tinysrgb&h=130",
  "block2-home-office": "https://images.pexels.com/photos/7546637/pexels-photo-7546637.jpeg?auto=compress&cs=tinysrgb&h=130",
  "block3-light-pink-entryway": "https://images.pexels.com/photos/7546318/pexels-photo-7546318.jpeg?auto=compress&cs=tinysrgb&h=130",
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
const COLORS = {
  primary: '#1A1A1A',
  secondary: '#0F344A',
  accent: '#F8C82A',
  surface: '#F7F5F2',
  white: '#FFFFFF',
  lightBg: '#EDF2F5',
  darkFooter: '#0F344A',
  green1: '#809678',
  green2: '#365D73',
  green3: '#243447',
  green4: '#B3CBB9',
  neutral1: '#E3E0DB',
  neutral2: '#F1EDE4',
  neutral3: '#F0E6D9',
  neutral4: '#8F8D89',
  pink1: '#F3EAE4',
  blue1: '#E2EEF0',
  cream1: '#EDE9DE',
  gray1: '#E3E8EE',
};

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
    ? { mode: 'separate', top: padTop, right: '24px', bottom: padBottom, left: '24px' }
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
    bg = COLORS.accent,
    textColor = COLORS.primary,
    fontSize = '14px',
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
        bold: true,
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
  const { size = '24px', color = COLORS.white } = opts;
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

function imageContainer(id, name, src, alt, height, overlayChildren, alignH, alignV) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'hug',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '8px' },
      backgroundImage: {
        src, alt, fit: 'cover', position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '8px' },
      },
    },
    children: overlayChildren,
  };
}

function colorBadge(id, name, color, text, textColor = COLORS.primary) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '色名标签' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'center' },
      widthMode: 'hug',
      heightMode: 'hug',
      backgroundColor: COLORS.white,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '9999px' },
    },
    children: [
      {
        id: `${id}-dot`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '色点' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '14px',
          heightMode: 'fixed',
          height: '14px',
          backgroundColor: color,
          border: { mode: 'unified', width: '1px', style: 'solid', color: '#E0E0E0' },
          borderRadius: { mode: 'unified', radius: '9999px' },
        },
        children: [],
      },
      textBlock(`${id}-text`, '色名', text, { fontSize: '12px', color: textColor, bold: false, widthMode: 'hug' }),
    ],
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

function colorSwatch(id, name, color) {
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
          width: '64px',
          heightMode: 'fixed',
          height: '56px',
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

function productCard(id, name, productName, src, alt) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '产品卡片' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${id}-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '产品图' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '100px',
          heightMode: 'fixed',
          height: '120px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src,
            alt,
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
        children: [],
      },
      textBlock(`${id}-name`, '产品名称', productName, { fontSize: '14px' }),
      buttonBlock(`${id}-cta`, '购买按钮', 'Shop now', { fontSize: '12px', widthMode: 'fixed', width: '100px' }),
    ],
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部导航栏', { pageInline: false, padTop: '24px', padBottom: '16px', bg: COLORS.white });
  sec.children = [
    textBlock(`${P}-s1-logo`, '品牌logo', 'CLARE', { fontSize: '28px', bold: true }),
    {
      id: `${P}-s1-banner`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '免邮横幅' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: '#E8E2D9',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s1-free-shipping`, '免邮提示', 'FREE SHIPPING ON 5+ SWATCHES AND ORDERS $200+', { fontSize: '12px' }),
      ],
    },
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '首屏模块', { padTop: '0', padBottom: '32px', bg: COLORS.surface });
  sec.children = [
    textBlock(`${P}-s2-title`, '首屏标题', "You don't need more stuff—\njust a new paint color", { fontSize: '28px', bold: true }),
    imageContainer(`${P}-s2-hero`, '首屏主图', PEXELS['hero-home-office'], 'bright modern home office', '380px', [
      colorBadge(`${P}-s2-badge`, 'Flatiron标签', COLORS.neutral1, 'Flatiron'),
    ], 'right', 'bottom'),
    textBlock(`${P}-s2-desc1`, '首屏描述1', "If your rooms are feeling cluttered, flat or stuck in neutral overload, the answer isn't more decor. It's smarter color.", { alignH: 'left' }),
    textBlock(`${P}-s2-desc2`, '首屏描述2', "A thoughtful paint choice can simplify your space, calm the visual noise and make everything feel intentionally pulled together.", { alignH: 'left' }),
    buttonBlock(`${P}-s2-cta`, '找颜色按钮', 'Find Your Color'),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '蓝色卧室模块', { padTop: '24px', padBottom: '24px', bg: COLORS.white });
  const row = rowLayout(`${P}-s3-row`, '图文横排', [], { gap: '24px', alignV: 'top' });
  const leftCol = {
    id: `${P}-s3-left`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '左侧文字区' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fixed',
      width: '264px',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s3-title`, '模块标题', 'Choose one color—\nand commit', { alignH: 'left', fontSize: '20px', bold: true }),
      textBlock(`${P}-s3-desc`, '模块描述', 'Instead of breaking up a room with contrast, let one color do the heavy lifting. Color drenching creates cohesion and calm.', { alignH: 'left', fontSize: '14px' }),
      gridBlock(`${P}-s3-colors`, '色卡网格', 2, [
        colorSwatch(`${P}-s3-s1`, 'Daily Greens', COLORS.green1),
        colorSwatch(`${P}-s3-s2`, 'Deep Dive', COLORS.green2),
        colorSwatch(`${P}-s3-s3`, 'Goodnight Moon', COLORS.green3),
        colorSwatch(`${P}-s3-s4`, 'OMGreen', COLORS.green4),
      ], { alignH: 'left', gap: '24px' }),
    ],
  };
  const rightCol = imageContainer(`${P}-s3-right`, '蓝色卧室图', PEXELS['block1-blue-bedroom'], 'cozy dark blue bedroom', '440px', [
    colorBadge(`${P}-s3-badge`, 'Goodnight Moon标签', COLORS.green3, 'Goodnight Moon', COLORS.white),
  ], 'left', 'top');
  row.children = [leftCol, rightCol];
  sec.children = [row];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '中性色工作室模块', { padTop: '24px', padBottom: '24px', bg: COLORS.white });
  const row = rowLayout(`${P}-s4-row`, '图文横排', [], { gap: '24px', alignV: 'top' });
  const leftCol = imageContainer(`${P}-s4-left`, '工作室图', PEXELS['block2-home-office'], 'minimalist home office', '440px', [
    colorBadge(`${P}-s4-badge`, 'Flatiron标签', COLORS.neutral1, 'Flatiron'),
  ], 'left', 'top');
  const rightCol = {
    id: `${P}-s4-right`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '右侧文字区' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fixed',
      width: '264px',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s4-title`, '模块标题', 'Use color to define,\nnot decorate', { alignH: 'left', fontSize: '20px', bold: true }),
      textBlock(`${P}-s4-desc`, '模块描述', 'Paint built-ins, cabinetry or a nook to give it purpose, without adding clutter.', { alignH: 'left', fontSize: '14px' }),
      gridBlock(`${P}-s4-colors`, '色卡网格', 2, [
        colorSwatch(`${P}-s4-s1`, 'Flatiron', COLORS.neutral1),
        colorSwatch(`${P}-s4-s2`, 'Like Buttah', COLORS.neutral2),
        colorSwatch(`${P}-s4-s3`, 'Neutral Territory', COLORS.neutral3),
        colorSwatch(`${P}-s4-s4`, 'Dirty Chai', COLORS.neutral4),
      ], { alignH: 'left', gap: '24px' }),
    ],
  };
  row.children = [leftCol, rightCol];
  sec.children = [row];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '粉色玄关模块', { padTop: '24px', padBottom: '32px', bg: COLORS.white });
  const row = rowLayout(`${P}-s5-row`, '图文横排', [], { gap: '24px', alignV: 'top' });
  const leftCol = {
    id: `${P}-s5-left`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '左侧文字区' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fixed',
      width: '264px',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s5-title`, '模块标题', 'Move beyond\nneutral overload', { alignH: 'left', fontSize: '20px', bold: true }),
      textBlock(`${P}-s5-desc`, '模块描述', 'Neutrals are timeless, but too many can feel flat. Soft, liveable color adds warmth and depth without overwhelming your space.', { alignH: 'left', fontSize: '14px' }),
      gridBlock(`${P}-s5-colors`, '色卡网格', 2, [
        colorSwatch(`${P}-s5-s1`, 'Wing It', COLORS.pink1),
        colorSwatch(`${P}-s5-s2`, 'Headspace', COLORS.blue1),
        colorSwatch(`${P}-s5-s3`, 'Greenish', COLORS.cream1),
        colorSwatch(`${P}-s5-s4`, 'Wink', COLORS.gray1),
      ], { alignH: 'left', gap: '24px' }),
    ],
  };
  const rightCol = imageContainer(`${P}-s5-right`, '粉色玄关图', PEXELS['block3-light-pink-entryway'], 'soft light pink entryway', '440px', [
    colorBadge(`${P}-s5-badge`, 'Wing It标签', COLORS.pink1, 'Wing It'),
  ], 'left', 'top');
  row.children = [leftCol, rightCol];
  sec.children = [row, buttonBlock(`${P}-s5-cta`, '浏览所有颜色按钮', 'Shop All Colors')];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '绘画用品模块', { padTop: '32px', padBottom: '32px', bg: COLORS.lightBg });
  sec.children = [
    textBlock(`${P}-s6-subtitle`, '子标题', 'PAINTING ESSENTIALS', { fontSize: '14px', bold: true }),
    textBlock(`${P}-s6-title`, '标题', 'Ready to prep and paint like the pros?', { fontSize: '24px', bold: true }),
    textBlock(`${P}-s6-desc`, '描述', 'Our premium supplies are your DIY VIPs.', { fontSize: '14px' }),
    gridBlock(`${P}-s6-products`, '产品网格', 3, [
      productCard(`${P}-s6-p1`, '天花板漆', 'Ceiling Paint', PEXELS['supply-ceiling-paint'], 'dark blue ceiling paint can'),
      productCard(`${P}-s6-p2`, '室内底漆', 'Interior Primer', PEXELS['supply-interior-primer'], 'light blue interior primer can'),
      productCard(`${P}-s6-p3`, '工具包', '5-Piece Paint Kit', PEXELS['supply-paint-kit'], '5 piece paint roller tray kit'),
    ], { gap: '16px' }),
    buttonBlock(`${P}-s6-cta`, '浏览所有用品按钮', 'Shop All Supplies'),
  ];
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '底部导航栏', { pageInline: false, padTop: '0', padBottom: '0', bg: COLORS.white });
  const navRow = rowLayout(`${P}-s7-nav-row`, '导航行', [], { gap: '0' });
  navRow.children = [
    {
      id: `${P}-s7-nav1`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '油漆导航' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fixed',
        width: '300px',
        heightMode: 'hug',
        backgroundColor: COLORS.secondary,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s7-nav1-text`, '导航文本', 'INTERIOR PAINT', { fontSize: '14px', bold: true, color: COLORS.white }),
      ],
    },
    {
      id: `${P}-s7-nav2`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '用品导航' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fixed',
        width: '300px',
        heightMode: 'hug',
        backgroundColor: COLORS.secondary,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s7-nav2-text`, '导航文本', 'SUPPLIES', { fontSize: '14px', bold: true, color: COLORS.white }),
      ],
    },
  ];
  const infoRow = {
    id: `${P}-s7-info`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '服务信息行' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: COLORS.white,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s7-info1`, '免邮信息', 'ORDERS $200+ SHIP FREE', { fontSize: '12px', widthMode: 'hug' }),
      {
        id: `${P}-s7-dot`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '分隔点' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '4px',
          heightMode: 'fixed',
          height: '4px',
          backgroundColor: COLORS.accent,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '9999px' },
        },
        children: [],
      },
      textBlock(`${P}-s7-info2`, '配送信息', 'SPEEDY DELIVERY', { fontSize: '12px', widthMode: 'hug' }),
    ],
  };
  sec.children = [navRow, infoRow];
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, '页脚', { pageInline: false, padTop: '24px', padBottom: '24px', bg: COLORS.darkFooter });
  sec.children = [
    textBlock(`${P}-s8-logo`, '品牌logo', 'CLARE', { fontSize: '24px', bold: true, color: COLORS.white }),
    rowLayout(`${P}-s8-social`, '社交图标行', [
      iconBlock(`${P}-s8-ig`, 'Instagram图标', ICON['social-instagram']),
      iconBlock(`${P}-s8-tiktok`, 'TikTok图标', ICON['social-tiktok']),
      iconBlock(`${P}-s8-fb`, 'Facebook图标', ICON['social-facebook']),
      iconBlock(`${P}-s8-pin`, 'Pinterest图标', ICON['social-pinterest']),
    ], { gap: '24px' }),
    textBlock(`${P}-s8-copyright`, '版权信息', '© 2025 Clare Paint, LLC. | Unsubscribe | View in Your Browser | Privacy Policy\n1521 Concord Pike Suite 101, Wilmington DE 19803', { fontSize: '10px', color: COLORS.white }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Clare 油漆推广模板',
      description: '简约风格油漆产品推广邮件模板，含色彩展示与用品推荐',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '24px' },
        typography: { display: '28px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '8px', cta: '9999px' },
      },
    },
  },
  scopeSelections: {},
};

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
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7(), buildS8()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

