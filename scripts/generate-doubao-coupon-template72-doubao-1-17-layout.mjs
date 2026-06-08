#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "行为 1（模板 17 · 验收）";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/0e70f9d4-4bd7-4206-be9a-8f338bbf5cca/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/0e70f9d4-4bd7-4206-be9a-8f338bbf5cca/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/10024310/pexels-photo-10024310.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "social-tiktok": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-tiktok.svg",
  "social-x": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-x.svg",
  "social-linkedin": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-linkedin.svg",
};
const COLORS = {
  primary: '#000000',
  secondary: '#9333EA',
  surface: '#F8F800',
  white: '#FFFFFF',
  black: '#000000',
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
  } = opts;
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
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: borderRadius },
    },
    children: [],
  };
}

function textBlock(id, name, content, opts = {}) {
  const {
    alignH = 'left',
    fontSize = '16px',
    color = COLORS.primary,
    bold = false,
    widthMode = 'fill',
    italic = false,
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
      italic,
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
    fontSize = '18px',
    radius = '12px',
    width = '300px',
    height = '56px',
  } = opts;
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
        border: borderNone(),
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

function imageContainer(id, name, src, alt, height, overlayChildren, alignV = 'center', borderRadius = '0') {
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
      borderRadius: { mode: 'unified', radius: borderRadius },
      backgroundImage: {
        src, alt, fit: 'cover', position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: borderRadius },
      },
    },
    children: overlayChildren,
  };
}

function rowLayout(id, name, children, opts = {}) {
  const { gap = '24px', alignH = 'center', alignV = 'center' } = opts;
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

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部品牌栏', { padTop: '32px', padBottom: '32px', pageInline: false });
  sec.children = [
    textBlock(`${P}-s1-logo`, '品牌标识', 'HORMBLES\nCHORMBLES', { alignH: 'center', fontSize: '28px', bold: true, widthMode: 'hug' }),
    textBlock(`${P}-s1-tagline`, '主标语', 'CANDY THAT\nMAKES SENSE.', { alignH: 'center', fontSize: '42px', bold: true, widthMode: 'hug' }),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '主内容卡片区', { padTop: '0', padBottom: '0' });
  const heroImage = imageContainer(
    `${P}-s2-hero`,
    '英雄图',
    PEXELS.hero,
    '两位开心的年轻女性在户外拿着能量棒',
    '480px',
    [
      textBlock(`${P}-s2-hero-logo`, '图内品牌标识', 'HORMBLES\nCHORMBLES', { color: COLORS.surface, fontSize: '32px', bold: true, alignH: 'center' })
    ],
    'center',
    '16px'
  );
  const contentCard = {
    id: `${P}-s2-content-card`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '内容卡片' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: COLORS.surface,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '16px' },
    },
    children: [
      textBlock(`${P}-s2-p1`, '第一段文案', 'Candy never really made sense.'),
      textBlock(`${P}-s2-p2`, '第二段文案', 'You eat it to feel happy. But it\'s just sugar. A ton of calories. Very little protein. Shortly after, you feel worse. Then you do it all over again. And again.'),
      textBlock(`${P}-s2-p3`, '第三段文案', 'That doesn\'t make sense.'),
      textBlock(`${P}-s2-p4`, '第四段文案', 'So, we got to work. We removed sugar and calories, then added protein. And made delicious candy like you remember, just way better.'),
      textBlock(`${P}-s2-p5`, '品牌标语', 'Hormbles Chormbles.\nCandy that makes sense.', { fontSize: '28px', bold: true }),
    ],
  };
  sec.children = [heroImage, contentCard];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '按钮区', { padTop: '32px', padBottom: '32px' });
  sec.children = [
    buttonBlock(`${P}-s3-cta`, '购买按钮', 'SHOP ALL CHORMBLES')
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '底部信息区', { padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s4-logo`, '底部品牌标识', 'HORMBLES\nCHORMBLES', { alignH: 'center', fontSize: '24px', bold: true, widthMode: 'hug' }),
    textBlock(`${P}-s4-subtitle`, '底部副标题', 'POWER CANDY', { alignH: 'center', fontSize: '16px', widthMode: 'hug' }),
    rowLayout(`${P}-s4-social-row`, '社交图标栏', [
      iconBlock(`${P}-s4-social-ig`, 'Instagram图标', ICON['social-instagram']),
      iconBlock(`${P}-s4-social-tiktok`, 'TikTok图标', ICON['social-tiktok']),
      iconBlock(`${P}-s4-social-x`, 'X图标', ICON['social-x']),
      iconBlock(`${P}-s4-social-linkedin`, 'LinkedIn图标', ICON['social-linkedin']),
    ]),
    textBlock(`${P}-s4-copyright`, '版权信息', '© 2025 HORMBLES CHORMBLES™', { alignH: 'center', fontSize: '14px', widthMode: 'hug' }),
    textBlock(`${P}-s4-address`, '地址信息', '1449 S Michigan Ave Ste 13110\nChicago, IL 60605', { alignH: 'center', fontSize: '12px', widthMode: 'hug' }),
    textBlock(`${P}-s4-unsubscribe`, '退订链接', 'Unsubscribe', { alignH: 'center', fontSize: '12px', decoration: 'underline', widthMode: 'hug' }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Hormbles Chormbles 能量糖果模板',
      description: '活力黄色系的能量糖果营销邮件模板',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '24px' },
        typography: { display: '42px', h1: '28px', body: '16px', caption: '12px' },
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
    children: [buildS1(), buildS2(), buildS3(), buildS4()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

