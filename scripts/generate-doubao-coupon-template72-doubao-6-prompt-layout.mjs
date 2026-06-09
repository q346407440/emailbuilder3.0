#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "左右复杂网格测试 6（修改策略的 prompt）";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/15607312-140e-4867-a46c-ebb17c5a4bee/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/15607312-140e-4867-a46c-ebb17c5a4bee/layout-out";

const PEXELS = {
  "hero-home-office": "https://images.pexels.com/photos/4680356/pexels-photo-4680356.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "block1-blue-bedroom": "https://images.pexels.com/photos/4993094/pexels-photo-4993094.jpeg?auto=compress&cs=tinysrgb&h=350",
  "block2-neutral-office": "https://images.pexels.com/photos/19410747/pexels-photo-19410747.jpeg?auto=compress&cs=tinysrgb&h=350",
  "block3-soft-pink-room": "https://images.pexels.com/photos/11532912/pexels-photo-11532912.jpeg?auto=compress&cs=tinysrgb&h=350",
  "supply-ceiling-paint": "https://images.pexels.com/photos/32936636/pexels-photo-32936636.jpeg?auto=compress&cs=tinysrgb&h=130",
  "supply-interior-primer": "https://images.pexels.com/photos/1669754/pexels-photo-1669754.jpeg?auto=compress&cs=tinysrgb&h=130",
  "supply-paint-kit": "https://images.pexels.com/photos/9222200/pexels-photo-9222200.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "social-tiktok": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-tiktok.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-facebook.svg",
  "social-pinterest": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-pinterest.svg",
};
const COLORS = {
  primary: '#111820',
  secondary: '#F9C22E',
  surface: '#F5F2EE',
  cardBg: '#FFFFFF',
  textLight: '#666666',
  white: '#FFFFFF',
  navy: '#0A364A',
  goodnightMoon: '#243447',
  deepDive: '#365D73',
  dailyGreens: '#809678',
  omGreen: '#B3CBB9',
  flatiron: '#E6E2DE',
  likeButtah: '#F5F0E9',
  neutralTerritory: '#F1E7DD',
  dirtyChai: '#99938E',
  wingIt: '#F3E4DD',
  headspace: '#E5F0F2',
  greenish: '#F0ECE1',
  wink: '#E6EBF0',
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

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部导航栏', { bg: COLORS.white, padTop: '24px', padBottom: '8px' });
  sec.children = [
    textBlock(`${P}-s1-logo`, '品牌Logo', 'CLARE', { fontSize: '28px', bold: true }),
    sectionShell(`${P}-s1-banner`, '免费配送横幅', { bg: COLORS.surface, padTop: '12px', padBottom: '12px', pageInline: false }),
    textBlock(`${P}-s1-title`, '主标题', "You don't need more stuff—\njust a new paint color", { fontSize: '24px', bold: true, alignH: 'center' }),
    imageContainer(`${P}-s1-hero`, '首图家居办公', PEXELS['hero-home-office'], 'modern home office', '380px', [
      colorBadge(`${P}-s1-badge`, 'Flatiron', COLORS.white, COLORS.primary),
    ], 'right', 'bottom'),
    textBlock(`${P}-s1-desc1`, '首段描述1', "If your rooms are feeling cluttered, flat or stuck in neutral overload, the answer isn't more decor. It's smarter color.", { alignH: 'left', fontSize: '14px', color: COLORS.textLight }),
    textBlock(`${P}-s1-desc2`, '首段描述2', "A thoughtful paint choice can simplify your space, calm the visual noise and make everything feel intentionally pulled together.", { alignH: 'left', fontSize: '14px', color: COLORS.textLight }),
    buttonBlock(`${P}-s1-cta`, '找色按钮', 'Find Your Color', { bg: COLORS.secondary, textColor: COLORS.primary, alignH: 'center', radius: '9999px', widthMode: 'fixed', width: '200px' }),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '深色系色卡模块', { bg: COLORS.white });
  sec.children = [
    rowLayout(`${P}-s2-row`, '深色系图文并排', [
      sectionShell(`${P}-s2-left`, '左侧文字区', { bg: COLORS.white, pageInline: false, padTop: '0', padBottom: '0' }),
      sectionShell(`${P}-s2-right`, '右侧图片区', { bg: COLORS.white, pageInline: false, padTop: '0', padBottom: '0' }),
    ], { alignH: 'left', gap: '24px' }),
  ];
  const leftSec = sec.children[0].children[0];
  leftSec.children = [
    textBlock(`${P}-s2-title`, '深色系标题', 'Choose one color—\nand commit', { alignH: 'left', fontSize: '20px', bold: true }),
    textBlock(`${P}-s2-desc`, '深色系描述', "Instead of breaking up a room with contrast, let one color do the heavy lifting. Color drenching creates cohesion and calm.", { alignH: 'left', fontSize: '14px', color: COLORS.textLight }),
    gridBlock(`${P}-s2-colors`, '深色系色卡', 2, [
      colorSwatch(`${P}-s2-c1`, 'Daily Greens', COLORS.dailyGreens),
      colorSwatch(`${P}-s2-c2`, 'Deep Dive', COLORS.deepDive),
      colorSwatch(`${P}-s2-c3`, 'Goodnight Moon', COLORS.goodnightMoon),
      colorSwatch(`${P}-s2-c4`, 'OMGreen', COLORS.omGreen),
    ], { alignH: 'left', gap: '16px' }),
  ];
  const rightSec = sec.children[0].children[1];
  rightSec.children = [
    imageContainer(`${P}-s2-img`, '深蓝色卧室', PEXELS['block1-blue-bedroom'], 'dark blue bedroom', '420px', [
      colorBadge(`${P}-s2-badge`, 'Goodnight Moon', COLORS.white, COLORS.primary),
    ], 'left', 'top'),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '中性色系模块', { bg: COLORS.white, padTop: '32px' });
  sec.children = [
    rowLayout(`${P}-s3-row`, '中性色系图文并排', [
      sectionShell(`${P}-s3-left`, '左侧图片区', { bg: COLORS.white, pageInline: false, padTop: '0', padBottom: '0' }),
      sectionShell(`${P}-s3-right`, '右侧文字区', { bg: COLORS.white, pageInline: false, padTop: '0', padBottom: '0' }),
    ], { alignH: 'left', gap: '24px' }),
  ];
  const leftSec = sec.children[0].children[0];
  leftSec.children = [
    imageContainer(`${P}-s3-img`, '中性色系办公室', PEXELS['block2-neutral-office'], 'minimalist home office', '420px', [
      colorBadge(`${P}-s3-badge`, 'Flatiron', COLORS.white, COLORS.primary),
    ], 'left', 'top'),
  ];
  const rightSec = sec.children[0].children[1];
  rightSec.children = [
    textBlock(`${P}-s3-title`, '中性色系标题', 'Use color to define,\nnot decorate', { alignH: 'left', fontSize: '20px', bold: true }),
    textBlock(`${P}-s3-desc`, '中性色系描述', "Paint built-ins, cabinetry or a nook to give it purpose, without adding clutter.", { alignH: 'left', fontSize: '14px', color: COLORS.textLight }),
    gridBlock(`${P}-s3-colors`, '中性色系色卡', 2, [
      colorSwatch(`${P}-s3-c1`, 'Flatiron', COLORS.flatiron),
      colorSwatch(`${P}-s3-c2`, 'Like Buttah', COLORS.likeButtah),
      colorSwatch(`${P}-s3-c3`, 'Neutral Territory', COLORS.neutralTerritory),
      colorSwatch(`${P}-s3-c4`, 'Dirty Chai', COLORS.dirtyChai),
    ], { alignH: 'left', gap: '16px' }),
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '暖色系模块', { bg: COLORS.white, padTop: '32px' });
  sec.children = [
    rowLayout(`${P}-s4-row`, '暖色系图文并排', [
      sectionShell(`${P}-s4-left`, '左侧文字区', { bg: COLORS.white, pageInline: false, padTop: '0', padBottom: '0' }),
      sectionShell(`${P}-s4-right`, '右侧图片区', { bg: COLORS.white, pageInline: false, padTop: '0', padBottom: '0' }),
    ], { alignH: 'left', gap: '24px' }),
    buttonBlock(`${P}-s4-cta`, '全色按钮', 'Shop All Colors', { bg: COLORS.secondary, textColor: COLORS.primary, alignH: 'center', radius: '9999px', widthMode: 'fixed', width: '200px' }),
  ];
  const leftSec = sec.children[0].children[0];
  leftSec.children = [
    textBlock(`${P}-s4-title`, '暖色系标题', 'Move beyond\nneutral overload', { alignH: 'left', fontSize: '20px', bold: true }),
    textBlock(`${P}-s4-desc`, '暖色系描述', "Neutrals are timeless, but too many can feel flat. Soft, liveable color adds warmth and depth without overwhelming your space.", { alignH: 'left', fontSize: '14px', color: COLORS.textLight }),
    gridBlock(`${P}-s4-colors`, '暖色系色卡', 2, [
      colorSwatch(`${P}-s4-c1`, 'Wing It', COLORS.wingIt),
      colorSwatch(`${P}-s4-c2`, 'Headspace', COLORS.headspace),
      colorSwatch(`${P}-s4-c3`, 'Greenish', COLORS.greenish),
      colorSwatch(`${P}-s4-c4`, 'Wink', COLORS.wink),
    ], { alignH: 'left', gap: '16px' }),
  ];
  const rightSec = sec.children[0].children[1];
  rightSec.children = [
    imageContainer(`${P}-s4-img`, '暖粉色房间', PEXELS['block3-soft-pink-room'], 'soft pink room', '420px', [
      colorBadge(`${P}-s4-badge`, 'Wing It', COLORS.white, COLORS.primary),
    ], 'left', 'top'),
  ];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '绘画工具模块', { bg: COLORS.surface, padTop: '32px' });
  function supplyCard(id, name, src, productName) {
    return {
      id,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '工具卡片' },
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
        imageContainer(`${id}-img`, productName, src, productName, '120px', [], 'center', 'center'),
        textBlock(`${id}-name`, '工具名称', productName, { fontSize: '14px' }),
        buttonBlock(`${id}-cta`, '购买按钮', 'Shop now', { fontSize: '12px', bg: COLORS.secondary, textColor: COLORS.primary, widthMode: 'fixed', width: '100px' }),
      ],
    };
  }
  sec.children = [
    textBlock(`${P}-s5-subtitle`, '子标题', 'PAINTING ESSENTIALS', { fontSize: '12px', bold: true, color: COLORS.textLight }),
    textBlock(`${P}-s5-title`, '工具模块标题', 'Ready to prep and paint like the pros?', { fontSize: '20px', bold: true }),
    textBlock(`${P}-s5-desc`, '工具模块描述', 'Our premium supplies are your DIY VIPs.', { fontSize: '14px', color: COLORS.textLight }),
    gridBlock(`${P}-s5-supplies`, '工具卡片网格', 3, [
      supplyCard(`${P}-s5-c1`, '天花板漆', PEXELS['supply-ceiling-paint'], 'Ceiling Paint'),
      supplyCard(`${P}-s5-c2`, '室内底漆', PEXELS['supply-interior-primer'], 'Interior Primer'),
      supplyCard(`${P}-s5-c3`, '绘画套装', PEXELS['supply-paint-kit'], '5-Piece Paint Kit'),
    ], { gap: '16px' }),
    buttonBlock(`${P}-s5-cta`, '全工具按钮', 'Shop All Supplies', { bg: COLORS.secondary, textColor: COLORS.primary, alignH: 'center', radius: '9999px', widthMode: 'fixed', width: '220px' }),
  ];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '底部导航栏', { bg: COLORS.white, padTop: '0', padBottom: '0', pageInline: false });
  sec.children = [
    gridBlock(`${P}-s6-nav`, '底部导航网格', 2, [
      sectionShell(`${P}-s6-nav1`, '油漆导航', { bg: COLORS.navy, pageInline: false, padTop: '12px', padBottom: '12px' }),
      sectionShell(`${P}-s6-nav2`, '工具导航', { bg: COLORS.navy, pageInline: false, padTop: '12px', padBottom: '12px' }),
    ], { gap: '0' }),
    textBlock(`${P}-s6-desc`, '服务说明', 'ORDERS $200+ SHIP FREE • SPEEDY DELIVERY', { fontSize: '12px', color: COLORS.textLight }),
    sectionShell(`${P}-s6-footer`, '页脚', { bg: COLORS.navy, pageInline: true, padTop: '24px', padBottom: '24px' }),
  ];
  sec.children[0].children[0].children = [
    textBlock(`${P}-s6-nav1-text`, '油漆导航文字', 'INTERIOR PAINT', { color: COLORS.white, fontSize: '14px', bold: true }),
  ];
  sec.children[0].children[1].children = [
    textBlock(`${P}-s6-nav2-text`, '工具导航文字', 'SUPPLIES', { color: COLORS.white, fontSize: '14px', bold: true }),
  ];
  const footerSec = sec.children[2];
  footerSec.children = [
    textBlock(`${P}-s6-footer-logo`, '页脚Logo', 'CLARE', { color: COLORS.white, fontSize: '24px', bold: true, alignH: 'left' }),
    rowLayout(`${P}-s6-social`, '社交图标', [
      iconBlock(`${P}-s6-ig`, 'Instagram', ICON['social-instagram'], { color: COLORS.white }),
      iconBlock(`${P}-s6-tiktok`, 'TikTok', ICON['social-tiktok'], { color: COLORS.white }),
      iconBlock(`${P}-s6-fb`, 'Facebook', ICON['social-facebook'], { color: COLORS.white }),
      iconBlock(`${P}-s6-pin`, 'Pinterest', ICON['social-pinterest'], { color: COLORS.white }),
    ], { alignH: 'left', gap: '16px' }),
    textBlock(`${P}-s6-copyright`, '版权声明', '© 2026 Clare Paint, LLC. | Unsubscribe | View in Your Browser | Privacy Policy\n1521 Concord Pike Suite 101, Wilmington DE 19803', { color: COLORS.white, fontSize: '10px', alignH: 'left' }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: displayName,
      description: '__MOTHER_DESCRIPTION__',
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

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
copyFileSync(DESIGN_SRC, DESIGN_DST);
console.log(`Wrote ${OUT}`);
=======
const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: displayName,
      description: 'Clare 油漆新品推广邮件模板，主打简约配色与家居场景展示',
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

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: displayName,
      description: '__MOTHER_DESCRIPTION__',
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

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

