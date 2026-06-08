#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "复杂测试 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/ec62ef8f-0966-41d5-805f-ea8b4446270b/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/ec62ef8f-0966-41d5-805f-ea8b4446270b/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/5447100/pexels-photo-5447100.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  products: [
    "https://images.pexels.com/photos/30406049/pexels-photo-30406049.jpeg?auto=compress&cs=tinysrgb&h=350",
    "https://images.pexels.com/photos/15245007/pexels-photo-15245007.jpeg?auto=compress&cs=tinysrgb&h=350",
    "https://images.pexels.com/photos/7705665/pexels-photo-7705665.jpeg?auto=compress&cs=tinysrgb&h=350",
    "https://images.pexels.com/photos/34363709/pexels-photo-34363709.jpeg?auto=compress&cs=tinysrgb&h=350",
    "https://images.pexels.com/photos/30993174/pexels-photo-30993174.jpeg?auto=compress&cs=tinysrgb&h=350",
    "https://images.pexels.com/photos/566887/pexels-photo-566887.jpeg?auto=compress&cs=tinysrgb&h=350",
  ],
};

const ICON = {

};
const COLORS = {
  primary: '#000000',
  secondary: '#CC1111',
  accent: '#F07A87',
  surface: '#FFFFFF',
  lightGray: '#E0E0E0',
  darkGray: '#333333',
  red: '#C00000',
  darkBg: '#333333',
  footerBg: '#DDDDDD',
};

const PRODUCTS = [
  {
    id: 'p1',
    name: 'Carbon Steel Half Griddle | Griddle + Press / Standard',
    img: PEXELS.products[0],
    alt: 'carbon steel half griddle with press',
  },
  {
    id: 'p2',
    name: 'ProCoat Non Stick Set | 6-Piece Set / Graphite',
    img: PEXELS.products[1],
    alt: 'nonstick cookware set 6 piece graphite',
  },
  {
    id: 'p3',
    name: 'Multi-Material Frying Pan Set | 12" / Sand',
    img: PEXELS.products[2],
    alt: 'multi material frying pan set 12 inch',
  },
  {
    id: 'p4',
    name: 'Round Enameled Cast Iron Dutch Oven | 5.5 QT / Blood Orange / Standard',
    img: PEXELS.products[3],
    alt: 'orange enameled cast iron dutch oven 5.5 quart',
  },
  {
    id: 'p5',
    name: 'Flatware | 8 Place Settings',
    img: PEXELS.products[4],
    alt: '8 piece flatware cutlery set',
  },
  {
    id: 'p6',
    name: 'Tabletop Set | Essentials / Red Rim',
    img: PEXELS.products[5],
    alt: 'red rim tableware dinner set essentials',
  },
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
    bg = COLORS.surface,
    textColor = COLORS.primary,
    fontSize = '16px',
    radius = '0',
    width = '280px',
    height = '52px',
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

function coverImage(id, name, src, alt, height) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'fixed',
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

function countdownItem(id, label) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '倒计时项' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '120px',
      heightMode: 'hug',
      border: {
        mode: 'unified',
        width: '4px',
        style: 'solid',
        color: COLORS.accent,
      },
      borderRadius: { mode: 'unified', radius: '9999px' },
      backgroundColor: 'rgba(255,255,255,0.85)',
    },
    children: [
      textBlock(`${id}-num`, '倒计时数字', '0', { fontSize: '36px', bold: true }),
      textBlock(`${id}-label`, '倒计时标签', label, { fontSize: '14px' }),
    ],
  };
}

function productCard(id, product) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: product.name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '176px',
      heightMode: 'hug',
      border: {
        mode: 'unified',
        width: '1px',
        style: 'solid',
        color: COLORS.primary,
      },
      borderRadius: { mode: 'unified', radius: '0' },
      backgroundColor: COLORS.surface,
    },
    children: [
      {
        id: `${id}-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: `${product.name}图片` },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '150px',
          heightMode: 'fixed',
          height: '150px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: product.img,
            alt: product.alt,
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      },
      textBlock(`${id}-name`, '产品名称', product.name, {
        fontSize: '14px',
        color: COLORS.red,
        decoration: 'underline',
      }),
    ],
  };
}

function dashedSeparator(id) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '虚线分隔线' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'fixed',
      height: '1px',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      backgroundImage: {
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAABCAYAAADn9T9+AAAAFklEQVQIW2P8//8/AwMDEwMDAwMDAwAkCgUB+r3TKgAAAABJRU5ErkJggg==',
        alt: 'dashed line',
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
    },
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部品牌栏', { padTop: '12px', padBottom: '12px', pageInline: false });
  sec.children = [
    textBlock(`${P}-s1-brand`, '品牌名', 'MADE IN', { fontSize: '24px', bold: true, letterSpacing: '2px' }),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '英雄横幅区', { padTop: '0', padBottom: '0', pageInline: false });
  const heroImage = {
    id: `${P}-s2-hero`,
    type: 'image',
    blockMeta: { blockType: 'content.image', name: '英雄横幅' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'bottom' },
      widthMode: 'fill',
      heightMode: 'fixed',
      height: '480px',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      backgroundImage: {
        src: PEXELS.hero,
        alt: 'various stainless steel and nonstick cookware pots and pans on light background',
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
    },
    children: [
      rowLayout(`${P}-s2-countdown`, '倒计时行', [
        countdownItem(`${P}-s2-countdown-hr`, 'HOURS'),
        countdownItem(`${P}-s2-countdown-min`, 'MINUTES'),
        countdownItem(`${P}-s2-countdown-sec`, 'SECONDS'),
      ], { gap: '24px' }),
    ],
  };
  sec.children = [heroImage];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '活动说明区', { padTop: '24px', padBottom: '24px', gap: '12px' });
  sec.children = [
    textBlock(`${P}-s3-p1`, '第一段说明', 'The Presidents\' Day Sale is ending in just HOURS! (And no, we won\'t be extending the sale.)', { alignH: 'left' }),
    textBlock(`${P}-s3-p2`, '第二段说明', 'Enjoy a Mixed Material Bundle curated by real chefs, or shop our a la carte deals.', { alignH: 'left' }),
    textBlock(`${P}-s3-p3`, '第三段说明', 'This is your chance to stock up on favorites or try something new and save—we won\'t be having another sale anytime soon!', { alignH: 'left' }),
    buttonBlock(`${P}-s3-cta`, '最后机会按钮', 'LAST CHANCE TO SAVE', { bg: COLORS.red, textColor: COLORS.surface }),
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '产品推荐区', { padTop: '24px', padBottom: '24px', gap: '24px' });
  sec.children = [
    dashedSeparator(`${P}-s4-sep-top`),
    textBlock(`${P}-s4-title`, '推荐标题', 'Picked Just For Sara', { fontSize: '24px', italic: true, color: COLORS.darkGray }),
    rowLayout(`${P}-s4-row1`, '产品第一行', [
      productCard(`${P}-s4-p1`, PRODUCTS[0]),
      productCard(`${P}-s4-p2`, PRODUCTS[1]),
      productCard(`${P}-s4-p3`, PRODUCTS[2]),
    ], { gap: '16px' }),
    rowLayout(`${P}-s4-row2`, '产品第二行', [
      productCard(`${P}-s4-p4`, PRODUCTS[3]),
      productCard(`${P}-s4-p5`, PRODUCTS[4]),
      productCard(`${P}-s4-p6`, PRODUCTS[5]),
    ], { gap: '16px' }),
    buttonBlock(`${P}-s4-cta`, '不要错过按钮', 'DON\'T MISS OUT!', { bg: COLORS.darkBg, textColor: COLORS.surface, width: '220px', height: '48px' }),
  ];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '页脚区', { bg: COLORS.footerBg, padTop: '32px', padBottom: '32px', gap: '24px' });
  sec.children = [
    textBlock(`${P}-s5-logo`, '页脚Logo', 'Ⓜ', { fontSize: '48px', color: COLORS.darkGray }),
    textBlock(`${P}-s5-links`, '页脚链接', 'Privacy  Help', { fontSize: '14px', color: COLORS.darkGray, decoration: 'underline' }),
    textBlock(`${P}-s5-address`, '地址', '1005 East St. Elmo Rd Building 2\nAustin, TX 78745', { fontSize: '12px', color: COLORS.darkGray }),
    textBlock(`${P}-s5-copyright`, '版权', 'Copyright 2025 Made In Cookware', { fontSize: '12px', color: COLORS.darkGray }),
    textBlock(`${P}-s5-unsubscribe`, '退订链接', 'Unsubscribe', { fontSize: '12px', color: COLORS.darkGray, decoration: 'underline' }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Presidents Day Sale Countdown',
      description: 'Cookware sale template with countdown timer and product recommendations',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '36px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '0', cta: '0' },
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
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

