#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "左右复杂网格测试 5";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/15ac738d-a1a1-44aa-a47a-f58af22eaa22/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/15ac738d-a1a1-44aa-a47a-f58af22eaa22/layout-out";

const PEXELS = {
  "hero-home-office": "https://images.pexels.com/photos/4680356/pexels-photo-4680356.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "dark-blue-bedroom": "https://images.pexels.com/photos/4993094/pexels-photo-4993094.jpeg?auto=compress&cs=tinysrgb&h=350",
  "neutral-home-office": "https://images.pexels.com/photos/19410747/pexels-photo-19410747.jpeg?auto=compress&cs=tinysrgb&h=130",
  "warm-pink-entryway": "https://images.pexels.com/photos/5091343/pexels-photo-5091343.jpeg?auto=compress&cs=tinysrgb&h=350",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "social-tiktok": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-tiktok.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-facebook.svg",
  "social-pinterest": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-pinterest.svg",
};
const COLORS = {
  primary: '#1A2A3A',
  secondary: '#F5C242',
  surface: '#F6F4F0',
  cardBg: '#FFFFFF',
  darkFooter: '#0F3044',
  lightGrey: '#EAE7E0',
  swatchDailyGreens: '#809678',
  swatchDeepDive: '#365D73',
  swatchGoodnightMoon: '#243447',
  swatchOMGreen: '#B3CBB9',
  swatchFlatiron: '#E3E0DB',
  swatchLikeButtah: '#F3EFE9',
  swatchNeutralTerritory: '#EFE6DD',
  swatchDirtyChai: '#8D8881',
  swatchWingIt: '#F5EEE9',
  swatchHeadspace: '#E1EEF0',
  swatchGreenish: '#EFECE1',
  swatchWink: '#E7EAEE',
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
  const { size = '24px', color = COLORS.cardBg } = opts;
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
          backgroundColor: COLORS.lightGrey,
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
  const sec = sectionShell(`${P}-s1`, '顶部导航栏', { padTop: '16px', padBottom: '16px', bg: COLORS.cardBg });
  sec.children = [
    textBlock(`${P}-s1-logo`, '品牌Logo', 'CLARE', { fontSize: '24px', bold: true }),
    {
      id: `${P}-s1-banner`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '包邮提示条' },
      wrapperStyle: {
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.lightGrey,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s1-banner-text`, '提示文字', 'FREE SHIPPING ON 5+ SWATCHES AND ORDERS $200+', { fontSize: '12px' }),
      ],
    },
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '首屏英雄区', { padTop: '0', bg: COLORS.surface });
  sec.children = [
    textBlock(`${P}-s2-title`, '主标题', "You don't need more stuff—\njust a new paint color", { fontSize: '24px', bold: true, alignH: 'center' }),
    imageContainer(`${P}-s2-img`, '首屏办公场景图', PEXELS['hero-home-office'], 'bright modern home office', '380px', [
      colorBadge(`${P}-s2-badge`, 'Flatiron', COLORS.cardBg, COLORS.primary),
    ], 'right', 'bottom'),
    textBlock(`${P}-s2-desc1`, '说明文字1', "If your rooms are feeling cluttered, flat or stuck in neutral overload, the answer isn't more decor. It's smarter color."),
    textBlock(`${P}-s2-desc2`, '说明文字2', "A thoughtful paint choice can simplify your space, calm the visual noise and make everything feel intentionally pulled together."),
    buttonBlock(`${P}-s2-cta`, '查找颜色按钮', 'Find Your Color', { widthMode: 'fixed', width: '200px' }),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '深色系色块区', { bg: COLORS.cardBg });
  sec.children = [
    rowLayout(`${P}-s3-row`, '图文横排', [
      {
        id: `${P}-s3-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文案色块' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fixed',
          width: '260px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-title`, '区块标题', 'Choose one color—\nand commit', { fontSize: '20px', bold: true, alignH: 'left' }),
          textBlock(`${P}-s3-desc`, '区块说明', "Instead of breaking up a room with contrast, let one color do the heavy lifting. Color drenching creates cohesion and calm.", { alignH: 'left' }),
          gridBlock(`${P}-s3-colors`, '深色色卡网格', 2, [
            colorSwatch(`${P}-s3-s1`, 'Daily Greens', COLORS.swatchDailyGreens),
            colorSwatch(`${P}-s3-s2`, 'Deep Dive', COLORS.swatchDeepDive),
            colorSwatch(`${P}-s3-s3`, 'Goodnight Moon', COLORS.swatchGoodnightMoon),
            colorSwatch(`${P}-s3-s4`, 'OMGreen', COLORS.swatchOMGreen),
          ], { alignH: 'left', gap: '12px' }),
        ],
      },
      imageContainer(`${P}-s3-img`, '深蓝色卧室图', PEXELS['dark-blue-bedroom'], 'dark blue bedroom', '420px', [
        colorBadge(`${P}-s3-badge`, 'Goodnight Moon', COLORS.cardBg, COLORS.primary),
      ], 'left', 'top'),
    ], { alignH: 'space-between', gap: '20px', alignV: 'top' }),
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '中性色系色块区', { bg: COLORS.cardBg });
  sec.children = [
    rowLayout(`${P}-s4-row`, '图文横排', [
      imageContainer(`${P}-s4-img`, '浅色系办公场景图', PEXELS['neutral-home-office'], 'minimalist home office', '380px', [
        colorBadge(`${P}-s4-badge`, 'Flatiron', COLORS.cardBg, COLORS.primary),
      ], 'left', 'top'),
      {
        id: `${P}-s4-right`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '右侧文案色块' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fixed',
          width: '260px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s4-title`, '区块标题', 'Use color to define,\nnot decorate', { fontSize: '20px', bold: true, alignH: 'left' }),
          textBlock(`${P}-s4-desc`, '区块说明', "Paint built-ins, cabinetry or a nook to give it purpose, without adding clutter.", { alignH: 'left' }),
          gridBlock(`${P}-s4-colors`, '中性色卡网格', 2, [
            colorSwatch(`${P}-s4-s1`, 'Flatiron', COLORS.swatchFlatiron),
            colorSwatch(`${P}-s4-s2`, 'Like Buttah', COLORS.swatchLikeButtah),
            colorSwatch(`${P}-s4-s3`, 'Neutral Territory', COLORS.swatchNeutralTerritory),
            colorSwatch(`${P}-s4-s4`, 'Dirty Chai', COLORS.swatchDirtyChai),
          ], { alignH: 'left', gap: '12px' }),
        ],
      },
    ], { alignH: 'space-between', gap: '20px', alignV: 'top' }),
  ];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '暖色系色块区', { bg: COLORS.cardBg });
  sec.children = [
    rowLayout(`${P}-s5-row`, '图文横排', [
      {
        id: `${P}-s5-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文案色块' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fixed',
          width: '260px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s5-title`, '区块标题', 'Move beyond\nneutral overload', { fontSize: '20px', bold: true, alignH: 'left' }),
          textBlock(`${P}-s5-desc`, '区块说明', "Neutrals are timeless, but too many can feel flat. Soft, liveable color adds warmth and depth without overwhelming your space.", { alignH: 'left' }),
          gridBlock(`${P}-s5-colors`, '暖色色卡网格', 2, [
            colorSwatch(`${P}-s5-s1`, 'Wing It', COLORS.swatchWingIt),
            colorSwatch(`${P}-s5-s2`, 'Headspace', COLORS.swatchHeadspace),
            colorSwatch(`${P}-s5-s3`, 'Greenish', COLORS.swatchGreenish),
            colorSwatch(`${P}-s5-s4`, 'Wink', COLORS.swatchWink),
          ], { alignH: 'left', gap: '12px' }),
        ],
      },
      imageContainer(`${P}-s5-img`, '暖粉色玄关图', PEXELS['warm-pink-entryway'], 'soft warm pink entryway', '420px', [
        colorBadge(`${P}-s5-badge`, 'Wing It', COLORS.cardBg, COLORS.primary),
      ], 'left', 'top'),
    ], { alignH: 'space-between', gap: '20px', alignV: 'top' }),
    buttonBlock(`${P}-s5-cta`, '浏览全部颜色按钮', 'Shop All Colors', { widthMode: 'fixed', width: '200px' }),
  ];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '绘画工具区', { bg: COLORS.surface });
  sec.children = [
    textBlock(`${P}-s6-subtitle`, '子标题', 'PAINTING ESSENTIALS', { fontSize: '12px', bold: true }),
    textBlock(`${P}-s6-title`, '区块标题', 'Ready to prep and paint like the pros?', { fontSize: '20px', bold: true }),
    textBlock(`${P}-s6-desc`, '区块说明', 'Our premium supplies are your DIY VIPs.'),
    gridBlock(`${P}-s6-products`, '产品网格', 3, [
      productCard(`${P}-s6-p1`, '天花板漆', 'Ceiling Paint'),
      productCard(`${P}-s6-p2`, '室内底漆', 'Interior Primer'),
      productCard(`${P}-s6-p3`, '5件套工具包', '5-Piece Paint Kit'),
    ], { gap: '20px' }),
    buttonBlock(`${P}-s6-cta`, '浏览全部工具按钮', 'Shop All Supplies', { widthMode: 'fixed', width: '240px' }),
  ];
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '底部导航栏', { pageInline: false, padTop: '0', padBottom: '0', bg: COLORS.cardBg });
  sec.children = [
    rowLayout(`${P}-s7-nav`, '导航栏', [
      textBlock(`${P}-s7-nav1`, '导航项1', 'INTERIOR PAINT', { fontSize: '12px', bold: true, color: COLORS.cardBg, widthMode: 'hug' }),
      textBlock(`${P}-s7-nav2`, '导航项2', 'SUPPLIES', { fontSize: '12px', bold: true, color: COLORS.cardBg, widthMode: 'hug' }),
    ], { gap: '0' }),
    textBlock(`${P}-s7-info`, '服务说明', 'ORDERS $200+ SHIP FREE • SPEEDY DELIVERY', { fontSize: '12px' }),
  ];
  sec.wrapperStyle.backgroundColor = COLORS.darkFooter;
  sec.wrapperStyle.padding = { mode: 'separate', top: '12px', right: '20px', bottom: '12px', left: '20px' };
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, '页脚', { pageInline: false, padTop: '24px', padBottom: '24px', bg: COLORS.darkFooter });
  sec.children = [
    textBlock(`${P}-s8-logo`, '品牌Logo', 'CLARE', { fontSize: '24px', bold: true, color: COLORS.cardBg }),
    rowLayout(`${P}-s8-social`, '社媒图标组', [
      iconBlock(`${P}-s8-ig`, 'Instagram图标', ICON['social-instagram']),
      iconBlock(`${P}-s8-tiktok`, 'TikTok图标', ICON['social-tiktok']),
      iconBlock(`${P}-s8-fb`, 'Facebook图标', ICON['social-facebook']),
      iconBlock(`${P}-s8-pin`, 'Pinterest图标', ICON['social-pinterest']),
    ], { gap: '16px' }),
    textBlock(`${P}-s8-copyright`, '版权信息', '© 2026 Clare Paint, LLC. | Unsubscribe | View in Your Browser | Privacy Policy\n1521 Concord Pike Suite 101, Wilmington DE 19803', { fontSize: '10px', color: COLORS.cardBg }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Clare 涂料推荐模板',
      description: '家居涂料配色推广邮件模板，包含多个场景展示与色卡推荐',
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
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7(), buildS8()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

