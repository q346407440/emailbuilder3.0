#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "复杂左右网格测试 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/6e961916-a341-497f-848f-868053773e71/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/6e961916-a341-497f-848f-868053773e71/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/19410747/pexels-photo-19410747.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "block1-dark-blue-bedroom": "https://images.pexels.com/photos/10847192/pexels-photo-10847192.jpeg?auto=compress&cs=tinysrgb&h=350",
  "block2-neutral-office": "https://images.pexels.com/photos/11125356/pexels-photo-11125356.jpeg?auto=compress&cs=tinysrgb&h=350",
  "block3-soft-pink-room": "https://images.pexels.com/photos/8218184/pexels-photo-8218184.jpeg?auto=compress&cs=tinysrgb&h=350",
  "essentials-ceiling-paint": "https://images.pexels.com/photos/32936636/pexels-photo-32936636.jpeg?auto=compress&cs=tinysrgb&h=130",
  "essentials-interior-primer": "https://images.pexels.com/photos/1669754/pexels-photo-1669754.jpeg?auto=compress&cs=tinysrgb&h=130",
  "essentials-paint-kit": "https://images.pexels.com/photos/5691634/pexels-photo-5691634.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "social-tiktok": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-tiktok.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-facebook.svg",
  "social-pinterest": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-pinterest.svg",
};
const COLORS = {
  primary: '#101828',
  secondary: '#0B3246',
  accent: '#FBC107',
  surface: '#F7F5F0',
  surfaceLight: '#F0F4F5',
  white: '#FFFFFF',
  textLight: '#667085',
  footerBg: '#0A3247'
};

const PRODUCTS = [
  {
    id: 'ceiling-paint',
    name: 'Ceiling Paint',
    image: PEXELS['essentials-ceiling-paint'],
    alt: 'dark blue paint can for ceiling'
  },
  {
    id: 'interior-primer',
    name: 'Interior Primer',
    image: PEXELS['essentials-interior-primer'],
    alt: 'light blue interior primer paint can'
  },
  {
    id: 'paint-kit',
    name: '5-Piece Paint Kit',
    image: PEXELS['essentials-paint-kit'],
    alt: 'paint roller tray brush kit set'
  }
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
    bg = COLORS.accent,
    textColor = COLORS.primary,
    fontSize = '16px',
    radius = '9999px',
    width = '200px',
    height = '48px',
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
      widthMode: 'fixed',
      width,
      heightMode: 'fixed',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function smallButtonBlock(id, name, label, opts = {}) {
  const {
    alignH = 'center',
    bg = COLORS.accent,
    textColor = COLORS.primary,
    fontSize = '12px',
    radius = '9999px',
    width = '80px',
    height = '28px',
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
      widthMode: 'fixed',
      width,
      heightMode: 'fixed',
      height,
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

function imageContainer(id, name, src, alt, height, overlayChildren, alignV = 'top', alignH = 'center') {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'fixed',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '12px' },
      backgroundImage: {
        src, alt, fit: 'cover', position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '12px' },
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
    wrapperStyle: {
      widthMode: 'hug',
      heightMode: 'hug',
      backgroundColor: COLORS.white,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '9999px' },
    },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '6px' },
    children: [
      {
        id: `${id}-dot`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '颜色圆点' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '16px',
          heightMode: 'fixed',
          height: '16px',
          backgroundColor: bgColor,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '9999px' },
        },
        children: []
      },
      textBlock(`${id}-text`, '颜色名称', colorName, { fontSize: '12px', bold: true, widthMode: 'hug' })
    ]
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
      width: '100px',
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
          width: '70px',
          heightMode: 'fixed',
          height: '60px',
          backgroundColor: color,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '9999px' },
        },
        children: []
      },
      textBlock(`${id}-name`, '色卡名称', name, { fontSize: '14px', widthMode: 'hug' })
    ]
  };
}

function twoColumnLayout(id, name, leftCol, rightCol, gap = '20px') {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'horizontal', gapMode: 'fixed', gap },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [leftCol, rightCol],
  };
}

function productCard(id, product) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '产品卡片' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '170px',
      heightMode: 'hug',
      backgroundColor: COLORS.white,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '12px' },
    },
    children: [
      imageContainer(`${id}-img`, '产品图', product.image, product.alt, '120px', [], 'center', 'center'),
      textBlock(`${id}-name`, '产品名称', product.name, { fontSize: '14px', bold: true }),
      smallButtonBlock(`${id}-cta`, '购买按钮', 'Shop now')
    ]
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部通知栏', { bg: COLORS.accent, padTop: '12px', padBottom: '12px' });
  sec.children = [
    textBlock(`${P}-s1-text`, '通知文本', 'FREE SHIPPING ON 5+ SWATCHES AND ORDERS $200+', {
      fontSize: '12px',
      bold: true
    })
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, 'Logo区域', { bg: COLORS.white, padTop: '20px', padBottom: '20px' });
  sec.children = [
    textBlock(`${P}-s2-logo`, '品牌Logo', 'CLARE', {
      fontSize: '28px',
      bold: true
    })
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '头部区域', { bg: COLORS.surface, padTop: '0', padBottom: '40px' });
  sec.children = [
    textBlock(`${P}-s3-title`, '头部标题', "You don't need more stuff—\njust a new paint color", {
      fontSize: '28px',
      bold: true
    }),
    imageContainer(`${P}-s3-img`, '主图', PEXELS.hero, 'modern home office with built in shelves and neutral wall paint', '420px', [
      colorBadge(`${P}-s3-badge`, 'Flatiron', '#E6E2DD')
    ], 'bottom', 'right'),
    textBlock(`${P}-s3-desc1`, '描述1', "If your rooms are feeling cluttered, flat or stuck in neutral overload, the answer isn't more decor. It's smarter color.", {
      fontSize: '15px',
      color: COLORS.textLight
    }),
    textBlock(`${P}-s3-desc2`, '描述2', "A thoughtful paint choice can simplify your space, calm the visual noise and make everything feel intentionally pulled together.", {
      fontSize: '15px',
      color: COLORS.textLight
    }),
    buttonBlock(`${P}-s3-cta`, '查找颜色按钮', 'Find Your Color')
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '深色卧室区块', { bg: COLORS.white, padTop: '40px', padBottom: '40px' });
  const leftCol = {
    id: `${P}-s4-left`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '左侧文字区块' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '20px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fixed',
      width: '260px',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s4-title`, '区块标题', 'Choose one color—\nand commit', {
        alignH: 'left',
        fontSize: '24px',
        bold: true
      }),
      textBlock(`${P}-s4-desc`, '区块描述', "Instead of breaking up a room with contrast, let one color do the heavy lifting. Color drenching creates cohesion and calm.", {
        alignH: 'left',
        fontSize: '15px',
        color: COLORS.textLight
      }),
      {
        id: `${P}-s4-swatches`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '色卡网格' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '24px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          {
            id: `${P}-s4-row1`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '色卡行1' },
            props: { direction: 'horizontal', gapMode: 'fixed', gap: '20px' },
            wrapperStyle: {
              contentAlign: { horizontal: 'left', vertical: 'top' },
              widthMode: 'fill',
              heightMode: 'hug',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
            children: [
              colorSwatch(`${P}-s4-s1`, 'Daily Greens', '#809678'),
              colorSwatch(`${P}-s4-s2`, 'Deep Dive', '#365D73')
            ]
          },
          {
            id: `${P}-s4-row2`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '色卡行2' },
            props: { direction: 'horizontal', gapMode: 'fixed', gap: '20px' },
            wrapperStyle: {
              contentAlign: { horizontal: 'left', vertical: 'top' },
              widthMode: 'fill',
              heightMode: 'hug',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
            children: [
              colorSwatch(`${P}-s4-s3`, 'Goodnight\nMoon', '#243447'),
              colorSwatch(`${P}-s4-s4`, 'OMGreen', '#B3CBB9')
            ]
          }
        ]
      }
    ]
  };
  const rightCol = imageContainer(`${P}-s4-img`, '深色卧室图', PEXELS['block1-dark-blue-bedroom'], 'bedroom with dark blue ceiling and wall paint', '480px', [
    colorBadge(`${P}-s4-badge`, 'Goodnight Moon', '#243447')
  ], 'top', 'left');
  sec.children = [twoColumnLayout(`${P}-s4-cols`, '双列布局', leftCol, rightCol)];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '中性色办公室区块', { bg: COLORS.white, padTop: '0', padBottom: '40px' });
  const leftCol = imageContainer(`${P}-s5-img`, '中性色办公室图', PEXELS['block2-neutral-office'], 'bright home office with neutral light paint on walls', '480px', [
    colorBadge(`${P}-s5-badge`, 'Flatiron', '#E6E2DD')
  ], 'top', 'left');
  const rightCol = {
    id: `${P}-s5-right`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '右侧文字区块' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '20px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fixed',
      width: '260px',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s5-title`, '区块标题', 'Use color to define,\nnot decorate', {
        alignH: 'left',
        fontSize: '24px',
        bold: true
      }),
      textBlock(`${P}-s5-desc`, '区块描述', "Paint built-ins, cabinetry or a nook to give it purpose, without adding clutter.", {
        alignH: 'left',
        fontSize: '15px',
        color: COLORS.textLight
      }),
      {
        id: `${P}-s5-swatches`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '色卡网格' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '24px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          {
            id: `${P}-s5-row1`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '色卡行1' },
            props: { direction: 'horizontal', gapMode: 'fixed', gap: '20px' },
            wrapperStyle: {
              contentAlign: { horizontal: 'left', vertical: 'top' },
              widthMode: 'fill',
              heightMode: 'hug',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
            children: [
              colorSwatch(`${P}-s5-s1`, 'Flatiron', '#E6E2DD'),
              colorSwatch(`${P}-s5-s2`, 'Like Buttah', '#F6F0E7')
            ]
          },
          {
            id: `${P}-s5-row2`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '色卡行2' },
            props: { direction: 'horizontal', gapMode: 'fixed', gap: '20px' },
            wrapperStyle: {
              contentAlign: { horizontal: 'left', vertical: 'top' },
              widthMode: 'fill',
              heightMode: 'hug',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
            children: [
              colorSwatch(`${P}-s5-s3`, 'Neutral\nTerritory', '#F0E8DD'),
              colorSwatch(`${P}-s5-s4`, 'Dirty Chai', '#8D877D')
            ]
          }
        ]
      }
    ]
  };
  sec.children = [twoColumnLayout(`${P}-s5-cols`, '双列布局', leftCol, rightCol)];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '粉色房间区块', { bg: COLORS.white, padTop: '0', padBottom: '40px' });
  const leftCol = {
    id: `${P}-s6-left`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '左侧文字区块' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '20px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fixed',
      width: '260px',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s6-title`, '区块标题', 'Move beyond\nneutral overload', {
        alignH: 'left',
        fontSize: '24px',
        bold: true
      }),
      textBlock(`${P}-s6-desc`, '区块描述', "Neutrals are timeless, but too many can feel flat. Soft, liveable color adds warmth and depth without overwhelming your space.", {
        alignH: 'left',
        fontSize: '15px',
        color: COLORS.textLight
      }),
      {
        id: `${P}-s6-swatches`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '色卡网格' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '24px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          {
            id: `${P}-s6-row1`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '色卡行1' },
            props: { direction: 'horizontal', gapMode: 'fixed', gap: '20px' },
            wrapperStyle: {
              contentAlign: { horizontal: 'left', vertical: 'top' },
              widthMode: 'fill',
              heightMode: 'hug',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
            children: [
              colorSwatch(`${P}-s6-s1`, 'Wing It', '#F6ECE6'),
              colorSwatch(`${P}-s6-s2`, 'Headspace', '#DEECEF')
            ]
          },
          {
            id: `${P}-s6-row2`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '色卡行2' },
            props: { direction: 'horizontal', gapMode: 'fixed', gap: '20px' },
            wrapperStyle: {
              contentAlign: { horizontal: 'left', vertical: 'top' },
              widthMode: 'fill',
              heightMode: 'hug',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
            children: [
              colorSwatch(`${P}-s6-s3`, 'Greenish', '#EBE9D9'),
              colorSwatch(`${P}-s6-s4`, 'Wink', '#E2E6EE')
            ]
          }
        ]
      }
    ]
  };
  const rightCol = imageContainer(`${P}-s6-img`, '粉色房间图', PEXELS['block3-soft-pink-room'], 'room with soft light pink wall paint and wooden mirror', '480px', [
    colorBadge(`${P}-s6-badge`, 'Wing It', '#F6ECE6')
  ], 'top', 'left');
  sec.children = [
    twoColumnLayout(`${P}-s6-cols`, '双列布局', leftCol, rightCol),
    buttonBlock(`${P}-s6-cta`, '浏览所有颜色按钮', 'Shop All Colors')
  ];
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '绘画用品区块', { bg: COLORS.surfaceLight, padTop: '40px', padBottom: '40px' });
  sec.children = [
    textBlock(`${P}-s7-subtitle`, '子标题', 'PAINTING ESSENTIALS', {
      fontSize: '14px',
      color: COLORS.textLight,
      bold: true
    }),
    textBlock(`${P}-s7-title`, '区块标题', 'Ready to prep and paint like the pros?', {
      fontSize: '24px',
      bold: true
    }),
    textBlock(`${P}-s7-desc`, '区块描述', 'Our premium supplies are your DIY VIPs.', {
      fontSize: '15px',
      color: COLORS.textLight
    }),
    {
      id: `${P}-s7-products`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '产品网格' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: PRODUCTS.map((prod, idx) => productCard(`${P}-s7-prod-${idx}`, prod))
    },
    buttonBlock(`${P}-s7-cta`, '浏览所有用品按钮', 'Shop All Supplies')
  ];
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, '底部导航栏', { bg: COLORS.white, padTop: '0', padBottom: '0', pageInline: false });
  sec.children = [
    {
      id: `${P}-s8-nav`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '导航栏' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        {
          id: `${P}-s8-nav1`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '油漆导航项' },
          wrapperStyle: {
            contentAlign: { horizontal: 'center', vertical: 'center' },
            widthMode: 'fixed',
            width: '300px',
            heightMode: 'fixed',
            height: '48px',
            backgroundColor: COLORS.secondary,
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            textBlock(`${P}-s8-nav1-text`, '导航文本1', 'INTERIOR PAINT', {
              fontSize: '14px',
              color: COLORS.white,
              bold: true
            })
          ]
        },
        {
          id: `${P}-s8-nav2`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '用品导航项' },
          wrapperStyle: {
            contentAlign: { horizontal: 'center', vertical: 'center' },
            widthMode: 'fixed',
            width: '300px',
            heightMode: 'fixed',
            height: '48px',
            backgroundColor: COLORS.secondary,
            border: {
              mode: 'custom',
              style: 'solid',
              color: COLORS.white,
              top: { width: '0' },
              right: { width: '0' },
              bottom: { width: '0' },
              left: { width: '1px' },
            },
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            textBlock(`${P}-s8-nav2-text`, '导航文本2', 'SUPPLIES', {
              fontSize: '14px',
              color: COLORS.white,
              bold: true
            })
          ]
        }
      ]
    },
    {
      id: `${P}-s8-info`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '底部信息栏' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '12px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s8-info1`, '免费配送信息', 'ORDERS $200+ SHIP FREE', {
          fontSize: '12px',
          widthMode: 'hug'
        }),
        {
          id: `${P}-s8-dot`,
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
          children: []
        },
        textBlock(`${P}-s8-info2`, '配送时效', 'SPEEDY DELIVERY', {
          fontSize: '12px',
          widthMode: 'hug'
        })
      ]
    }
  ];
  return sec;
}

function buildS9() {
  const sec = sectionShell(`${P}-s9`, '页脚', { bg: COLORS.footerBg, padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s9-logo`, '页脚Logo', 'CLARE', {
      fontSize: '24px',
      color: COLORS.white,
      bold: true
    }),
    {
      id: `${P}-s9-social`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '社交媒体图标' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        iconBlock(`${P}-s9-ig`, 'Instagram图标', ICON['social-instagram']),
        iconBlock(`${P}-s9-tiktok`, 'TikTok图标', ICON['social-tiktok']),
        iconBlock(`${P}-s9-fb`, 'Facebook图标', ICON['social-facebook']),
        iconBlock(`${P}-s9-pin`, 'Pinterest图标', ICON['social-pinterest'])
      ]
    },
    textBlock(`${P}-s9-copyright`, '版权信息', '© 2026 Clare Paint, LLC. | Unsubscribe | View in Your Browser | Privacy Policy\n1521 Concord Pike Suite 101, Wilmington DE 19803', {
      fontSize: '11px',
      color: COLORS.white
    })
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Clare Paint Promotion',
      description: 'Paint color promotion email template for Clare',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '36px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '12px', cta: '9999px' },
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
      backgroundColor: COLORS.white,
      width: '600px',
      border: borderNone(),
      gapMode: 'fixed',
      gap: '0',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7(), buildS8(), buildS9()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

