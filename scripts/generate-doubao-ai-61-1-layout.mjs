#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 61 整段生成 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/f1e7a821-6ef1-4756-baff-53397faa65b9/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/f1e7a821-6ef1-4756-baff-53397faa65b9/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/12825611/pexels-photo-12825611.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
};

const ICON = {
  "adidas-logo": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/google.svg",
  "social-instagram": "https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/instagram.svg",
  "social-youtube": "https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/youtube.svg",
  "social-x": "https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/x.svg",
  "social-pinterest": "https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/pin.svg",
};
const COLORS = {
  primary: '#000000',
  secondary: '#F5F3EE',
  surface: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
  lightBeige: '#F5F3EE',
  textGray: '#333333',
  captionGray: '#666666',
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
      contentAlign: { horizontal: 'left', vertical: 'top' },
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
    alignH = 'left',
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
    alignH = 'left',
    bg = COLORS.black,
    textColor = COLORS.white,
    fontSize = '16px',
    radius = '0',
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
  const { size = '32px', color = COLORS.primary } = opts;
  return {
    id,
    type: 'icon',
    blockMeta: { blockType: 'content.icon', name },
    props: { src: src ?? '', size, color },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
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
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'hug',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      backgroundImage: {
        src, alt, fit: 'cover', position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
    },
    children: overlayChildren,
  };
}

function rowLayout(id, name, children, opts = {}) {
  const { gap = '16px', alignH = 'left', alignV = 'center' } = opts;
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

function promoCodeBlock(id, name, code) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fixed',
      width: '200px',
      heightMode: 'fixed',
      height: '60px',
      backgroundColor: COLORS.white,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${id}-code`, '优惠码文本', code, { alignH: 'center', bold: false }),
    ],
  };
}

function socialIconContainer(id, name, iconSrc) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fixed',
      width: '60px',
      heightMode: 'fixed',
      height: '60px',
      backgroundColor: COLORS.white,
      border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.black },
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [iconBlock(`${id}-icon`, `${name}图标`, iconSrc, { size: '32px' })],
  };
}

function buildS0() {
  const sec = sectionShell(`${P}-s0`, '顶部导航栏', { pageInline: false, padTop: '0', padBottom: '0', bg: COLORS.black });
  sec.props.gap = '0';
  sec.wrapperStyle.contentAlign = { horizontal: 'left', vertical: 'top' };
  sec.children = [
    rowLayout(`${P}-s0-nav`, '导航栏内容', [
      iconBlock(`${P}-s0-logo`, '阿迪达斯logo', ICON['adidas-logo'], { size: '40px', color: COLORS.white }),
      textBlock(`${P}-s0-men`, '男士导航', 'MEN', { color: COLORS.white, widthMode: 'hug', alignH: 'left' }),
      textBlock(`${P}-s0-women`, '女士导航', 'WOMEN', { color: COLORS.white, widthMode: 'hug', alignH: 'left' }),
      textBlock(`${P}-s0-kids`, '儿童导航', 'KIDS', { color: COLORS.white, widthMode: 'hug', alignH: 'left' }),
      textBlock(`${P}-s0-store`, '门店查找', 'STORE FINDER', { color: COLORS.white, widthMode: 'hug', alignH: 'left' }),
    ], { gap: '24px', alignH: 'left', alignV: 'center' }),
  ];
  sec.wrapperStyle.padding = { mode: 'separate', top: '16px', right: '24px', bottom: '16px', left: '24px' };
  return sec;
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部提示栏', { padTop: '12px', padBottom: '12px' });
  sec.props.gap = '0';
  sec.children = [
    rowLayout(`${P}-s1-row`, '提示栏内容', [
      textBlock(`${P}-s1-left`, '左侧提示', 'You can still get a voucher on your next purchase.', { fontSize: '12px', color: COLORS.textGray, widthMode: 'hug' }),
      textBlock(`${P}-s1-right`, '在线查看', 'View this email online', { fontSize: '12px', color: COLORS.textGray, widthMode: 'hug' }),
    ], { gap: '0', alignH: 'space-between' }),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '首图区域', { pageInline: false, padTop: '0', padBottom: '0' });
  sec.children = [
    imageContainer(`${P}-s2-hero`, '首图', PEXELS.hero, '两个穿阿迪达斯运动服的年轻人在户外大笑', '520px', [
      textBlock(`${P}-s2-adiclub`, 'adiClub标识', 'adiclub', { alignH: 'right', color: COLORS.white, fontSize: '32px', bold: true, widthMode: 'hug' }),
    ], 'right', 'top'),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '生日券提示区', { padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s3-title`, '主标题', 'YOUR BIRTHDAY\nVOUCHER IS STILL HERE', { fontSize: '48px', bold: true }),
    textBlock(`${P}-s3-desc1`, '祝福文案', 'We hope you\'ve had an unforgettable birthday. And remember, you can still get 15% off your next order.'),
    textBlock(`${P}-s3-desc2`, '引导文案', 'Head over to our website and find what\'s next'),
    buttonBlock(`${P}-s3-cta`, '立即购买按钮', 'SHOP NOW →'),
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '优惠码区域', { bg: COLORS.lightBeige, padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s4-title`, '优惠标题', '15% OFF. JUST FOR\nYOU.', { fontSize: '48px', bold: true }),
    textBlock(`${P}-s4-desc`, '兑换说明', 'To redeem offer, enter promo code below during online checkout.'),
    textBlock(`${P}-s4-valid`, '有效期说明', 'Limited time offer valid until October 08, 2025.', { color: COLORS.textGray }),
    rowLayout(`${P}-s4-row`, '优惠码与按钮', [
      promoCodeBlock(`${P}-s4-code`, '优惠码容器', 'BDAY-SMLS-DVS'),
      buttonBlock(`${P}-s4-cta`, '在线兑换按钮', 'REDEEM ONLINE →'),
    ], { gap: '24px', alignH: 'left' }),
  ];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '应用推广区', { padTop: '32px', padBottom: '32px', stroke: { width: '1px', color: COLORS.black } });
  sec.children = [
    rowLayout(`${P}-s5-row`, '推广内容', [
      {
        id: `${P}-s5-logo-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: 'logo容器' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '120px',
          heightMode: 'fixed',
          height: '100px',
          backgroundColor: COLORS.black,
          borderRadius: { mode: 'unified', radius: '16px' },
          border: borderNone(),
        },
        children: [iconBlock(`${P}-s5-logo`, '阿迪达斯logo', ICON['adidas-logo'], { size: '60px', color: COLORS.white })],
      },
      {
        id: `${P}-s5-text`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '推广文案' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s5-title`, '应用标题', 'THE WORLD\nOF ADIDAS APPS', { fontSize: '28px', bold: true }),
          textBlock(`${P}-s5-link`, '发现链接', 'DISCOVER', { fontSize: '20px', bold: true, decoration: 'underline' }),
        ],
      },
    ], { gap: '24px', alignV: 'center' }),
  ];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '社交媒体栏', { padTop: '32px', padBottom: '32px', stroke: { width: '1px', color: COLORS.black } });
  sec.wrapperStyle.contentAlign = { horizontal: 'center', vertical: 'top' };
  sec.children = [
    rowLayout(`${P}-s6-social`, '社交媒体图标', [
      socialIconContainer(`${P}-s6-ig`, 'Instagram', ICON['social-instagram']),
      socialIconContainer(`${P}-s6-yt`, 'Youtube', ICON['social-youtube']),
      socialIconContainer(`${P}-s6-x`, 'X', ICON['social-x']),
      socialIconContainer(`${P}-s6-pin`, 'Pinterest', ICON['social-pinterest']),
    ], { gap: '32px', alignH: 'center' }),
  ];
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '页脚链接区', { padTop: '24px', padBottom: '24px', stroke: { width: '1px', color: COLORS.black } });
  sec.wrapperStyle.contentAlign = { horizontal: 'center', vertical: 'top' };
  sec.children = [
    rowLayout(`${P}-s7-links`, '页脚链接', [
      textBlock(`${P}-s7-privacy`, '隐私声明', 'Privacy Statement', { fontSize: '12px', color: COLORS.textGray, widthMode: 'hug' }),
      textBlock(`${P}-s7-support`, '支持', 'Support', { fontSize: '12px', color: COLORS.textGray, widthMode: 'hug' }),
      textBlock(`${P}-s7-account`, '我的账户', 'My Account', { fontSize: '12px', color: COLORS.textGray, widthMode: 'hug' }),
      textBlock(`${P}-s7-unsubscribe`, '退订', 'Unsubscribe', { fontSize: '12px', color: COLORS.textGray, widthMode: 'hug' }),
      textBlock(`${P}-s7-home`, '官网', 'adidas.com', { fontSize: '12px', color: COLORS.textGray, widthMode: 'hug' }),
    ], { gap: '16px', alignH: 'center' }),
  ];
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, '免责声明区', { padTop: '0', padBottom: '32px' });
  sec.props.gap = '24px';
  sec.children = [
    textBlock(`${P}-s8-disclaimer`, '免责声明', '*Limited time offer valid for 8 days from the date of this email. Discount applied to product price at checkout and gives maximum discount value of $400. Must be logged in to adiClub account for voucher to apply to purchase. Cannot be combined with other vouchers or discount codes. Not valid on adidas gift cards and select products. Valid on domestic US orders and participating US stores only. adidas reserves the right to end or change promotions at any time.', { fontSize: '12px', color: COLORS.captionGray }),
    textBlock(`${P}-s8-copyright`, '版权信息', '© 2025 adidas America, Inc. adidas and the 3-Stripes mark are registered trademarks of adidas America 5055 N. Greeley Avenue Portland, OR 97217 www.adidas.com', { fontSize: '12px', color: COLORS.captionGray }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Adidas Birthday Voucher Reminder',
      description: 'Adidas adiClub birthday voucher reminder email template',
      tokens: {
        colors: { primary: COLORS.black, secondary: COLORS.lightBeige, surface: COLORS.white },
        spacing: { section: '24px', gap: '16px', pageInline: '24px' },
        typography: { display: '48px', h1: '28px', body: '16px', caption: '12px' },
        radius: { panel: '16px', cta: '0' },
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
    children: [
      buildS0(),
      buildS1(),
      buildS2(),
      buildS3(),
      buildS4(),
      buildS5(),
      buildS6(),
      buildS7(),
      buildS8(),
    ],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

