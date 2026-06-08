#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "模板 17 修复描边后测试 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/d3bef568-6cf4-4da6-aa48-812229003844/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/d3bef568-6cf4-4da6-aa48-812229003844/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/31850049/pexels-photo-31850049.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "social-tiktok": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-tiktok.svg",
  "social-x": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-x.svg",
  "social-linkedin": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-linkedin.svg",
};
const COLORS = {
  primary: '#000000',
  secondary: '#9955FF',
  surface: '#F8F023',
  white: '#FFFFFF',
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
    borderRadius = '16px',
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
    decoration = 'none',
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
      decoration,
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
    radius = '12px',
    width = '320px',
    height = '56px',
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
  const { size = '28px', color = COLORS.primary } = opts;
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

function rowLayout(id, name, children, opts = {}) {
  const { gap = '24px', alignH = 'center', alignV = 'top' } = opts;
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

function imageContainer(id, name, src, alt, height, overlayChildren, alignV = 'center') {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: alignV },
      widthMode: 'fill',
      heightMode: 'fixed',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '16px' },
      backgroundImage: {
        src, alt, fit: 'cover', position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '16px' },
      },
    },
    children: overlayChildren,
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '头部区域', {
    padTop: '32px',
    padBottom: '48px',
    borderRadius: '0',
    pageInline: false,
  });
  sec.children = [
    textBlock(`${P}-s1-logo`, '品牌Logo', 'HORMBLES\nCHORMBLES', {
      fontSize: '24px',
      bold: true,
      alignH: 'center',
    }),
    textBlock(`${P}-s1-title`, '主标题', 'CANDY THAT\nMAKES SENSE.', {
      fontSize: '44px',
      bold: true,
      alignH: 'center',
    }),
  ];
  const contentCard = sectionShell(`${P}-s1-content-card`, '内容卡片', {
    pageInline: true,
    padTop: '0',
    padBottom: '40px',
    borderRadius: '16px',
    stroke: { width: '1px', color: COLORS.primary },
  });
  const heroOverlay = textBlock(`${P}-s1-hero-overlay`, '英雄图叠加文字', 'HORMBLES\nCHORMBLES', {
    fontSize: '32px',
    bold: true,
    color: COLORS.surface,
    alignH: 'center',
    widthMode: 'hug',
  });
  const heroImage = imageContainer(`${P}-s1-hero`, '英雄图', PEXELS.hero, '两位开心的年轻女性拿着糖果', '500px', [heroOverlay], 'center');
  contentCard.children = [
    heroImage,
    textBlock(`${P}-s1-p1`, '第一段文案', 'Candy never really made sense.', {
      alignH: 'left',
      fontSize: '18px',
    }),
    textBlock(`${P}-s1-p2`, '第二段文案', `You eat it to feel happy. But it's
just sugar. A ton of calories. Very
little protein. Shortly after, you
feel worse. Then you do it all over
again. And again.`, {
      alignH: 'left',
      fontSize: '18px',
    }),
    textBlock(`${P}-s1-p3`, '第三段文案', "That doesn't make sense.", {
      alignH: 'left',
      fontSize: '18px',
    }),
    textBlock(`${P}-s1-p4`, '第四段文案', `So, we got to work. We removed
sugar and calories, then added
protein. And made delicious candy
like you remember, just way better.`, {
      alignH: 'left',
      fontSize: '18px',
    }),
    textBlock(`${P}-s1-slogan`, '底部标语', 'Hormbles Chormbles.\nCandy that makes sense.', {
      bold: true,
      fontSize: '28px',
      alignH: 'left',
    }),
  ];
  sec.children.push(contentCard);
  sec.children.push(buttonBlock(`${P}-s1-cta`, '购物按钮', 'SHOP ALL CHORMBLES', {
    stroke: { width: '1px', color: COLORS.primary },
    bg: COLORS.surface,
    fontSize: '20px',
  }));
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '页脚区域', {
    padTop: '32px',
    padBottom: '32px',
    borderRadius: '0',
  });
  sec.children = [
    textBlock(`${P}-s2-logo`, '页脚Logo', 'HORMBLES\nCHORMBLES', {
      fontSize: '24px',
      bold: true,
    }),
    textBlock(`${P}-s2-tagline`, '品牌标语', 'POWER CANDY', {
      fontSize: '16px',
    }),
    rowLayout(`${P}-s2-social-row`, '社交媒体图标行', [
      iconBlock(`${P}-s2-ig`, 'Instagram图标', ICON['social-instagram']),
      iconBlock(`${P}-s2-tiktok`, 'TikTok图标', ICON['social-tiktok']),
      iconBlock(`${P}-s2-x`, 'X图标', ICON['social-x']),
      iconBlock(`${P}-s2-linkedin`, 'LinkedIn图标', ICON['social-linkedin']),
    ], { gap: '28px' }),
    textBlock(`${P}-s2-copyright`, '版权信息', '© 2025 HORMBLES CHORMBLES™', {
      fontSize: '14px',
    }),
    textBlock(`${P}-s2-address`, '地址信息', '1449 S Michigan Ave Ste 13110\nChicago, IL 60605', {
      fontSize: '12px',
    }),
    textBlock(`${P}-s2-unsubscribe`, '退订链接', 'Unsubscribe', {
      fontSize: '12px',
      decoration: 'underline',
    }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Hormbles Chormbles Coupon Template',
      description: '黄色活力风格的蛋白质糖果促销模板',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '44px', h1: '28px', body: '18px', caption: '12px' },
        radius: { panel: '16px', cta: '12px' },
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
    children: [buildS1(), buildS2()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

