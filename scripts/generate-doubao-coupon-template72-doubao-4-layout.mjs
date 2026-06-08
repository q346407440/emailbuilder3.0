#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "左右复杂网格测试 4";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/0c85cb03-be79-429c-ba8d-5510e9c0af00/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/0c85cb03-be79-429c-ba8d-5510e9c0af00/layout-out";

const PEXELS = {
  "hero-office": "https://images.pexels.com/photos/9119325/pexels-photo-9119325.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "blue-bedroom": "https://images.pexels.com/photos/7168017/pexels-photo-7168017.jpeg?auto=compress&cs=tinysrgb&h=350",
  "neutral-office": "https://images.pexels.com/photos/11125356/pexels-photo-11125356.jpeg?auto=compress&cs=tinysrgb&h=350",
  "light-pink-room": "https://images.pexels.com/photos/8218184/pexels-photo-8218184.jpeg?auto=compress&cs=tinysrgb&h=350",
  "ceiling-paint-product": "https://images.pexels.com/photos/32936636/pexels-photo-32936636.jpeg?auto=compress&cs=tinysrgb&h=130",
  "primer-product": "https://images.pexels.com/photos/5642093/pexels-photo-5642093.jpeg?auto=compress&cs=tinysrgb&h=130",
  "paint-kit-product": "https://images.pexels.com/photos/5691634/pexels-photo-5691634.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "instagram-icon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "tiktok-icon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-tiktok.svg",
  "facebook-icon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-facebook.svg",
  "pinterest-icon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-pinterest.svg",
};
const COLORS = {
  primary: '#1A2A3A',
  secondary: '#FFCC00',
  surface: '#F5F2EE',
  white: '#FFFFFF',
  darkBlue: '#0F3047',
  lightGray: '#EFEFEF'
};

const DISPLAY_NAME = 'Clare Paint Color Campaign';

const COLORS_GREEN = [
  { name: 'Daily Greens', hex: '#809678' },
  { name: 'Deep Dive', hex: '#365D73' },
  { name: 'Goodnight Moon', hex: '#243447' },
  { name: 'OMGreen', hex: '#B3CBB9' },
];

const COLORS_NEUTRAL = [
  { name: 'Flatiron', hex: '#E8E3DE' },
  { name: 'Like Buttah', hex: '#F7F1E9' },
  { name: 'Neutral Territory', hex: '#F0E6DD' },
  { name: 'Dirty Chai', hex: '#8C8681' },
];

const COLORS_SOFT = [
  { name: 'Wing It', hex: '#F6EFEA' },
  { name: 'Headspace', hex: '#E1EEF0' },
  { name: 'Greenish', hex: '#F1EDE2' },
  { name: 'Wink', hex: '#E8EDF2' },
];

const PRODUCTS = [
  { name: 'Ceiling Paint', image: PEXELS['ceiling-paint-product'] },
  { name: 'Interior Primer', image: PEXELS['primer-product'] },
  { name: '5-Piece Paint Kit', image: PEXELS['paint-kit-product'] },
];

function borderNone() {
  return { mode: 'unified', width: '0', style: 'solid', color: 'rgba(0,0,0,0)' };
}

function sectionShell(id, name, opts = {}) {
  const {
    bg = COLORS.surface,
    pageInline = true,
    padTop = '24px',
    padBottom = '24px',
    borderRadius = '0px',
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
  };
}

function imageContainer(id, name, src, alt, height, overlayChildren, alignV = 'top') {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'right', vertical: alignV },
      widthMode: 'fill',
      heightMode: 'fixed',
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

function colorBadge(id, colorName, bgColor) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '颜色标签' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '6px' },
    wrapperStyle: {
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
        blockMeta: { blockType: 'layout.container', name: '颜色点' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '16px',
          heightMode: 'fixed',
          height: '16px',
          backgroundColor: bgColor,
          border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.lightGray },
          borderRadius: { mode: 'unified', radius: '9999px' },
        },
        children: [],
      },
      textBlock(`${id}-text`, '颜色名称', colorName, { alignH: 'left', fontSize: '12px', widthMode: 'hug' }),
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
      widthMode: 'fill',
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

function productCard(id, name, image) {
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
      coverImage(`${id}-img`, name, image, name, '120px'),
      textBlock(`${id}-name`, '产品名称', name, { fontSize: '14px' }),
      buttonBlock(`${id}-cta`, '购买按钮', 'Shop now', { fontSize: '12px', widthMode: 'fixed', width: '100px' }),
    ],
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部通知栏', { padTop: '8px', padBottom: '8px', bg: COLORS.lightGray });
  sec.children = [
    textBlock(`${P}-s1-text`, '免费配送说明', 'FREE SHIPPING ON 5+ SWATCHES AND ORDERS $200+', { fontSize: '12px', bold: true })
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '品牌头部', { padTop: '16px', padBottom: '16px' });
  sec.children = [
    textBlock(`${P}-s2-logo`, '品牌Logo', 'CLARE', { fontSize: '28px', bold: true, letterSpacing: '2px' })
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, 'Hero区域', { padTop: '0', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s3-title`, '主标题', 'You don\'t need more stuff—\njust a new paint color', { fontSize: '24px', bold: true, lineHeight: '1.3' }),
    imageContainer(`${P}-s3-img`, 'Hero图', PEXELS['hero-office'], 'modern home office', '360px', [
      {
        id: `${P}-s3-img-badge`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '标签容器' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
        wrapperStyle: {
          contentAlign: { horizontal: 'right', vertical: 'bottom' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [colorBadge(`${P}-s3-badge`, 'Flatiron', '#E8E3DE')]
      }
    ], 'bottom'),
    textBlock(`${P}-s3-desc1`, '描述1', 'If your rooms are feeling cluttered, flat or stuck in neutral overload, the answer isn\'t more decor. It\'s smarter color.', { fontSize: '14px', lineHeight: '1.5' }),
    textBlock(`${P}-s3-desc2`, '描述2', 'A thoughtful paint choice can simplify your space, calm the visual noise and make everything feel intentionally pulled together.', { fontSize: '14px', lineHeight: '1.5' }),
    buttonBlock(`${P}-s3-cta`, '找颜色按钮', 'Find Your Color', { widthMode: 'fixed', width: '180px' })
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '深色调模块', { bg: COLORS.white, padTop: '32px', padBottom: '32px', borderRadius: '8px' });
  const row = rowLayout(`${P}-s4-row`, '图文横排', [
    {
      id: `${P}-s4-left`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '左侧文案色卡' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' }
      },
      children: [
        textBlock(`${P}-s4-title`, '模块标题', 'Choose one color—and commit', { alignH: 'left', fontSize: '18px', bold: true }),
        textBlock(`${P}-s4-desc`, '模块描述', 'Instead of breaking up a room with contrast, let one color do the heavy lifting. Color drenching creates cohesion and calm.', { alignH: 'left', fontSize: '14px' }),
        gridBlock(`${P}-s4-colors`, '深色色卡', 2, COLORS_GREEN.map((c, i) => colorSwatch(`${P}-s4-c${i}`, c.name, c.hex)), { gap: '24px', alignH: 'left' })
      ]
    },
    imageContainer(`${P}-s4-img`, '深蓝色卧室', PEXELS['blue-bedroom'], 'dark blue bedroom', '400px', [
      {
        id: `${P}-s4-img-badge-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '标签容器' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
        wrapperStyle: {
          contentAlign: { horizontal: 'right', vertical: 'top' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [colorBadge(`${P}-s4-badge`, 'Goodnight Moon', '#243447')]
      }
    ], 'top')
  ], { gap: '20px', alignH: 'left' });
  sec.children = [row];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '中性色模块', { bg: COLORS.white, padTop: '32px', padBottom: '32px', borderRadius: '8px' });
  const row = rowLayout(`${P}-s5-row`, '图文横排', [
    imageContainer(`${P}-s5-img`, '中性色办公室', PEXELS['neutral-office'], 'neutral home office', '400px', [
      {
        id: `${P}-s5-img-badge-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '标签容器' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [colorBadge(`${P}-s5-badge`, 'Flatiron', '#E8E3DE')]
      }
    ], 'top'),
    {
      id: `${P}-s5-right`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '右侧文案色卡' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' }
      },
      children: [
        textBlock(`${P}-s5-title`, '模块标题', 'Use color to define,\nnot decorate', { alignH: 'left', fontSize: '18px', bold: true }),
        textBlock(`${P}-s5-desc`, '模块描述', 'Paint built-ins, cabinetry or a nook to give it purpose, without adding clutter.', { alignH: 'left', fontSize: '14px' }),
        gridBlock(`${P}-s5-colors`, '中性色色卡', 2, COLORS_NEUTRAL.map((c, i) => colorSwatch(`${P}-s5-c${i}`, c.name, c.hex)), { gap: '24px', alignH: 'left' })
      ]
    }
  ], { gap: '20px', alignH: 'left' });
  sec.children = [row];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '柔色调模块', { bg: COLORS.white, padTop: '32px', padBottom: '32px', borderRadius: '8px' });
  const row = rowLayout(`${P}-s6-row`, '图文横排', [
    {
      id: `${P}-s6-left`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '左侧文案色卡' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' }
      },
      children: [
        textBlock(`${P}-s6-title`, '模块标题', 'Move beyond\nneutral overload', { alignH: 'left', fontSize: '18px', bold: true }),
        textBlock(`${P}-s6-desc`, '模块描述', 'Neutrals are timeless, but too many can feel flat. Soft, liveable color adds warmth and depth without overwhelming your space.', { alignH: 'left', fontSize: '14px' }),
        gridBlock(`${P}-s6-colors`, '柔色色卡', 2, COLORS_SOFT.map((c, i) => colorSwatch(`${P}-s6-c${i}`, c.name, c.hex)), { gap: '24px', alignH: 'left' })
      ]
    },
    imageContainer(`${P}-s6-img`, '浅粉色房间', PEXELS['light-pink-room'], 'soft pink room', '400px', [
      {
        id: `${P}-s6-img-badge-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '标签容器' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
        wrapperStyle: {
          contentAlign: { horizontal: 'right', vertical: 'top' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [colorBadge(`${P}-s6-badge`, 'Wing It', '#F6EFEA')]
      }
    ], 'top')
  ], { gap: '20px', alignH: 'left' });
  sec.children = [row, buttonBlock(`${P}-s6-cta`, '查看所有颜色按钮', 'Shop All Colors', { widthMode: 'fixed', width: '180px' })];
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '绘画工具模块', { bg: '#EFF3F5', padTop: '32px', padBottom: '32px', borderRadius: '8px' });
  sec.children = [
    textBlock(`${P}-s7-subtitle`, '子标题', 'PAINTING ESSENTIALS', { fontSize: '12px', bold: true, letterSpacing: '1px' }),
    textBlock(`${P}-s7-title`, '标题', 'Ready to prep and paint like the pros?', { fontSize: '20px', bold: true }),
    textBlock(`${P}-s7-desc`, '描述', 'Our premium supplies are your DIY VIPs.', { fontSize: '14px' }),
    gridBlock(`${P}-s7-products`, '产品网格', 3, PRODUCTS.map((p, i) => productCard(`${P}-s7-p${i}`, p.name, p.image)), { gap: '20px' }),
    buttonBlock(`${P}-s7-cta`, '查看所有工具按钮', 'Shop All Supplies', { widthMode: 'fixed', width: '200px' })
  ];
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, '底部导航栏', { bg: COLORS.darkBlue, pageInline: false, padTop: '16px', padBottom: '16px' });
  sec.children = [
    rowLayout(`${P}-s8-nav`, '导航栏', [
      textBlock(`${P}-s8-nav1`, '导航项1', 'INTERIOR PAINT', { color: COLORS.white, fontSize: '12px', bold: true, widthMode: 'hug' }),
      textBlock(`${P}-s8-nav2`, '导航项2', 'SUPPLIES', { color: COLORS.white, fontSize: '12px', bold: true, widthMode: 'hug' }),
    ], { gap: '80px' })
  ];
  return sec;
}

function buildS9() {
  const sec = sectionShell(`${P}-s9`, '底部信息栏', { bg: COLORS.darkBlue, padTop: '16px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s9-info`, '配送信息', 'ORDERS $200+ SHIP FREE • SPEEDY DELIVERY', { color: COLORS.white, fontSize: '12px' }),
    textBlock(`${P}-s9-logo`, '底部Logo', 'CLARE', { color: COLORS.white, fontSize: '24px', bold: true, letterSpacing: '2px', marginTop: '16px' }),
    rowLayout(`${P}-s9-social`, '社交媒体图标', [
      iconBlock(`${P}-s9-ig`, 'Instagram', ICON['instagram-icon']),
      iconBlock(`${P}-s9-tt`, 'TikTok', ICON['tiktok-icon']),
      iconBlock(`${P}-s9-fb`, 'Facebook', ICON['facebook-icon']),
      iconBlock(`${P}-s9-pi`, 'Pinterest', ICON['pinterest-icon']),
    ], { gap: '24px', marginTop: '16px' }),
    textBlock(`${P}-s9-copyright`, '版权信息', '© 2025 Clare Paint, LLC. | Unsubscribe | View in Your Browser | Privacy Policy\n1521 Concord Pike Suite 101, Wilmington DE 19803', { color: COLORS.white, fontSize: '10px', lineHeight: '1.4', marginTop: '16px' })
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: DISPLAY_NAME,
      description: 'Clare paint color promotion email template',
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
      gap: '16px',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7(), buildS8(), buildS9()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

