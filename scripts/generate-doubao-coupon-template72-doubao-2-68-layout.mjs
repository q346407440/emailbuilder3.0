#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "谢谢 2（模板 68 · 验收）";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/4873520d-cd6c-4db8-9477-0b3468fa4a19/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/4873520d-cd6c-4db8-9477-0b3468fa4a19/layout-out";

const PEXELS = {
  "ugc1": "https://images.pexels.com/photos/6969883/pexels-photo-6969883.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc2": "https://images.pexels.com/photos/34130782/pexels-photo-34130782.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc3": "https://images.pexels.com/photos/37099829/pexels-photo-37099829.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc4": "https://images.pexels.com/photos/6046492/pexels-photo-6046492.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc5": "https://images.pexels.com/photos/6969895/pexels-photo-6969895.jpeg?auto=compress&cs=tinysrgb&h=130",
  "turkey": "https://images.pexels.com/photos/33568904/pexels-photo-33568904.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-facebook.svg",
  "social-tiktok": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-tiktok.svg",
  "social-twitter": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-twitter.svg",
};
const COLORS = {
  primary: '#0B5A35',
  secondary: '#A81818',
  accent: '#57B946',
  yellow: '#FFCC00',
  surfaceDark: '#0B5A35',
  surfaceLight: '#FFF7D6',
  surfaceRed: '#A81818',
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
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: borderRadius },
    },
    children: [],
  };
}

function textBlock(id, name, content, opts = {}) {
  const {
    alignH = 'center',
    fontSize = '16px',
    color = COLORS.white,
    bold = false,
    widthMode = 'fill',
    width = '',
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
      width,
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
    textColor = COLORS.white,
    fontSize = '16px',
    radius = '9999px',
    width = '200px',
    height = '48px',
    bold = true,
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
        bold,
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
  const { size = '24px', color = COLORS.yellow, bg = COLORS.surfaceRed } = opts;
  return {
    id,
    type: 'icon',
    blockMeta: { blockType: 'content.icon', name },
    props: { src: src ?? '', size, color },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fixed',
      width: '40px',
      heightMode: 'fixed',
      height: '40px',
      backgroundColor: bg,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '9999px' },
    },
  };
}

function coverImage(id, name, src, alt, height, borderRadius = '12px') {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '270px',
      heightMode: 'fixed',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: borderRadius },
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: borderRadius },
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

function buildS0() {
  const sec = sectionShell(`${P}-s0`, '顶部通知栏', { bg: COLORS.white, padTop: '8px', padBottom: '8px' });
  sec.children = [
    textBlock(`${P}-s0-text`, '发货通知', 'Order by Nov. 25th for Nov. 27th shipping!', { color: COLORS.secondary, fontSize: '12px' })
  ];
  return sec;
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '感恩主题区', { bg: COLORS.surfaceDark, padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s1-logo`, '品牌Logo', 'adùn', { fontSize: '48px', color: COLORS.secondary, bold: true, italic: true }),
    textBlock(`${P}-s1-title1`, '主标题1', 'HEARTY', { fontSize: '64px', color: COLORS.accent, bold: true }),
    textBlock(`${P}-s1-title2`, '主标题2', 'gratitude', { fontSize: '48px', color: COLORS.accent, italic: true }),
    textBlock(`${P}-s1-title3`, '主标题3', 'FOR YOU 🤲', { fontSize: '64px', color: COLORS.accent, bold: true }),
    textBlock(`${P}-s1-desc`, '感恩说明', 'With SO much to be grateful for this year,\nthis community is at the top of our list.', { alignH: 'left', fontSize: '20px' }),
    rowLayout(`${P}-s1-row1`, 'UGC第一行', [
      coverImage(`${P}-s1-ugc1`, 'UGC1', PEXELS.ugc1, 'white plastic takeout container post', '320px'),
      coverImage(`${P}-s1-ugc2`, 'UGC2', PEXELS.ugc2, 'African food platter post', '320px'),
    ], { gap: '12px' }),
    rowLayout(`${P}-s1-ugc-author1`, 'UGC第一行作者', [
      textBlock(`${P}-s1-author1`, '作者1', '@enigivensunday', { fontSize: '12px', widthMode: 'fixed', width: '270px', alignH: 'left' }),
      textBlock(`${P}-s1-author2`, '作者2', '@carteridoko', { fontSize: '12px', widthMode: 'fixed', width: '270px', alignH: 'left' }),
    ], { gap: '12px' }),
    rowLayout(`${P}-s1-row2`, 'UGC第二行', [
      coverImage(`${P}-s1-ugc3`, 'UGC3', PEXELS.ugc3, 'bowls of African stew post', '320px'),
      coverImage(`${P}-s1-ugc4`, 'UGC4', PEXELS.ugc4, 'plate of cooked meat post', '320px'),
      coverImage(`${P}-s1-ugc5`, 'UGC5', PEXELS.ugc5, 'unboxing African food delivery post', '320px'),
    ], { gap: '12px' }),
    rowLayout(`${P}-s1-ugc-author2`, 'UGC第二行作者', [
      textBlock(`${P}-s1-author3`, '作者3', '@brunacious', { fontSize: '12px', widthMode: 'fixed', width: '172px', alignH: 'left' }),
      textBlock(`${P}-s1-author4`, '作者4', '@rimzzzeee', { fontSize: '12px', widthMode: 'fixed', width: '172px', alignH: 'left' }),
      textBlock(`${P}-s1-author5`, '作者5', '@l4ffii', { fontSize: '12px', widthMode: 'fixed', width: '172px', alignH: 'left' }),
    ], { gap: '12px' }),
    textBlock(`${P}-s1-thanks`, '感谢语', 'Thank you for letting us share the flavors of\nAfrica with you 😊', { alignH: 'left', fontSize: '20px' }),
    textBlock(`${P}-s1-slogan`, '品牌标语', 'Always,\nfrom our kitchen to your table.', { alignH: 'left', fontSize: '24px', italic: true }),
    buttonBlock(`${P}-s1-cta`, '购物按钮', 'SHOP ADÙN'),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '黑五优惠区', { bg: COLORS.surfaceLight, padTop: '60px', padBottom: '40px' });
  sec.children = [
    {
      id: `${P}-s2-turkey-wrap`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '火鸡图标容器' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fixed',
        width: '120px',
        heightMode: 'fixed',
        height: '120px',
        backgroundColor: COLORS.surfaceLight,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '9999px' },
      },
      children: [
        coverImage(`${P}-s2-turkey`, '火鸡插图', PEXELS.turkey, 'thanksgiving turkey', '100px', '0'),
      ]
    },
    textBlock(`${P}-s2-title`, '黑五标题', 'BLACK FRIDAY SAVINGS', { fontSize: '36px', color: COLORS.primary, bold: true }),
    textBlock(`${P}-s2-desc1`, '优惠说明1', 'Buy any 3+ pies & save $7!', { fontSize: '20px', color: COLORS.primary }),
    textBlock(`${P}-s2-desc2`, '优惠说明2', 'No code needed. Valid through Dec 17th.', { fontSize: '16px', color: COLORS.primary }),
    buttonBlock(`${P}-s2-cta`, '优惠按钮', 'SAVE ON PIES'),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '页脚区', { bg: COLORS.surfaceRed, padTop: '40px', padBottom: '40px' });
  sec.children = [
    textBlock(`${P}-s3-slogan`, '页脚标语', 'From our kitchen to your table.', { fontSize: '20px', color: COLORS.yellow }),
    {
      id: `${P}-s3-divider1`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '分隔线1' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        widthMode: 'fill',
        heightMode: 'fixed',
        height: '1px',
        backgroundColor: COLORS.primary,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [],
    },
    rowLayout(`${P}-s3-nav`, '导航栏', [
      textBlock(`${P}-s3-nav-shop`, '导航-购物', 'SHOP', { fontSize: '18px', bold: true, widthMode: 'hug' }),
      textBlock(`${P}-s3-nav-account`, '导航-账户', 'ACCOUNT', { fontSize: '18px', bold: true, widthMode: 'hug' }),
      textBlock(`${P}-s3-nav-about`, '导航-关于', 'ABOUT US', { fontSize: '18px', bold: true, widthMode: 'hug' }),
      textBlock(`${P}-s3-nav-recipes`, '导航-食谱', 'RECIPES', { fontSize: '18px', bold: true, widthMode: 'hug' }),
    ], { gap: '40px' }),
    {
      id: `${P}-s3-divider2`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '分隔线2' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        widthMode: 'fill',
        heightMode: 'fixed',
        height: '1px',
        backgroundColor: COLORS.primary,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [],
    },
    rowLayout(`${P}-s3-social`, '社交媒体栏', [
      iconBlock(`${P}-s3-ig`, 'Instagram图标', ICON['social-instagram']),
      iconBlock(`${P}-s3-fb`, 'Facebook图标', ICON['social-facebook']),
      iconBlock(`${P}-s3-tiktok`, 'TikTok图标', ICON['social-tiktok']),
      iconBlock(`${P}-s3-twitter`, 'Twitter图标', ICON['social-twitter']),
    ], { gap: '20px', alignH: 'right' }),
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '底部版权栏', { bg: COLORS.white, padTop: '16px', padBottom: '16px' });
  sec.children = [
    textBlock(`${P}-s4-brand`, '品牌说明', 'Adùn (previously All I Do Is Cook)', { color: COLORS.secondary, fontSize: '14px', bold: true }),
    textBlock(`${P}-s4-links`, '底部链接', 'View in Your Browser | Unsubscribe', { color: COLORS.secondary, fontSize: '12px', decoration: 'underline' }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'African Food Thanksgiving Promotion',
      description: 'Thanksgiving gratitude + Black Friday savings template for African food brand Adùn',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surfaceLight },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '64px', h1: '36px', body: '16px', caption: '12px' },
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
    children: [buildS0(), buildS1(), buildS2(), buildS3(), buildS4()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

