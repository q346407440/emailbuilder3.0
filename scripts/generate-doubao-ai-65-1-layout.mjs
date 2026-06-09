#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 65 整段生成 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/fb238ad3-78b7-4c65-b69b-f0c5ce7faeb6/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/fb238ad3-78b7-4c65-b69b-f0c5ce7faeb6/layout-out";

const PEXELS = {
  "hero-synthesizer": "https://images.pexels.com/photos/9871955/pexels-photo-9871955.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
};

const ICON = {
  "icon-lessons": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/music.svg",
  "icon-financing": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/credit-card.svg",
  "icon-daily-pick": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/guitar-pick.svg",
  "icon-used-gear": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/ad.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "social-twitter": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/twitter.svg",
  "social-youtube": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/youtube.svg",
  "social-instagram": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
  "badge-appstore": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/apple.svg",
  "badge-googleplay": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/googleplay.svg",
};
const COLORS = {
  primary: '#000000',
  secondary: '#00b4d8',
  surface: '#ffffff',
  accent: '#e60000',
  lightGray: '#eeeeee',
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
    bg = COLORS.accent,
    textColor = COLORS.surface,
    fontSize = '16px',
    radius = '4px',
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
  const { size = '32px', color = COLORS.primary } = opts;
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

function barcodeImage(id, name, height = '60px') {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '240px',
      heightMode: 'fixed',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      backgroundImage: {
        src: 'https://images.pexels.com/photos/9871955/pexels-photo-9871955.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
        alt: 'barcode',
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

function serviceItem(id, name, iconSrc, label) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      iconBlock(`${id}-icon`, `${label}图标`, iconSrc, { size: '32px' }),
      textBlock(`${id}-label`, `${label}名称`, label, { fontSize: '14px', bold: true, widthMode: 'hug' }),
    ],
  };
}

function badgeImage(id, name, src, alt) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '160px',
      heightMode: 'fixed',
      height: '50px',
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

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '首屏英雄区', { padTop: '0', padBottom: '0', pageInline: false });
  sec.children = [
    coverImage(`${P}-s1-hero`, '合成器英雄图', PEXELS['hero-synthesizer'], '黑色模拟合成器键盘', '500px'),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '感谢说明区', { padTop: '24px', padBottom: '16px' });
  sec.children = [
    textBlock(`${P}-s2-title`, '感谢标题', 'THANK YOU FOR GETTING US UP TO SPEED', { fontSize: '22px', bold: true, alignH: 'left' }),
    textBlock(`${P}-s2-desc`, '感谢描述', 'Now you\'ll get all the deals and news you want. Just like we promised, here\'s your coupon for 15% off a single qualifying*, non-sale item, maximum discount $500 to use now thru 11/18/2023. Some exclusions and limitations apply. You can read up on those below.', { fontSize: '14px', alignH: 'left' }),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '优惠券区', { padTop: '24px', padBottom: '24px', stroke: { width: '2px', color: COLORS.lightGray, style: 'dashed' } });
  sec.children = [
    textBlock(`${P}-s3-discount`, '折扣额度', '15% OFF', { fontSize: '64px', bold: true }),
    textBlock(`${P}-s3-condition`, '折扣条件', 'a single qualifying*, non-sale item', { fontSize: '20px' }),
    textBlock(`${P}-s3-valid`, '有效期', 'Valid thru 11/18/2023\nMaximum discount $500.', { fontSize: '14px' }),
    textBlock(`${P}-s3-code`, '优惠码', 'Coupon Code: r511c0673pxk8', { fontSize: '16px', bold: true }),
    barcodeImage(`${P}-s3-barcode`, '优惠券条形码', '60px'),
    buttonBlock(`${P}-s3-cta`, '立即购物按钮', 'Shop Now'),
    textBlock(`${P}-s3-exclusions`, '免责提示', '* View exclusions and limitations', { fontSize: '12px', decoration: 'underline' }),
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '底部说明区', { padTop: '16px', padBottom: '24px' });
  sec.children = [
    textBlock(`${P}-s4-note`, '祝福文案', 'Whatever you decide to save on, we hope you love it.', { fontSize: '14px', alignH: 'left' }),
    textBlock(`${P}-s4-signature`, '签名', 'The Guitar Center Team', { fontSize: '14px', alignH: 'left' }),
  ];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '服务入口区', { padTop: '0', padBottom: '24px' });
  sec.children = [
    gridBlock(`${P}-s5-grid`, '服务网格', 4, [
      serviceItem(`${P}-s5-item1`, '课程服务', ICON['icon-lessons'], 'Lessons'),
      serviceItem(`${P}-s5-item2`, '金融服务', ICON['icon-financing'], 'Financing'),
      serviceItem(`${P}-s5-item3`, '每日精选', ICON['icon-daily-pick'], 'Daily Pick'),
      serviceItem(`${P}-s5-item4`, '二手装备', ICON['icon-used-gear'], 'Used Gear'),
    ], { gap: '32px' }),
  ];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '应用下载区', { padTop: '0', padBottom: '24px' });
  sec.children = [
    rowLayout(`${P}-s6-badges`, '下载徽章行', [
      badgeImage(`${P}-s6-appstore`, 'App Store徽章', ICON['badge-appstore'], 'Download on the App Store'),
      badgeImage(`${P}-s6-googleplay`, 'Google Play徽章', ICON['badge-googleplay'], 'Get it on Google Play'),
    ], { gap: '16px' }),
  ];
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '底部链接区', { padTop: '0', padBottom: '16px' });
  sec.children = [
    rowLayout(`${P}-s7-links`, '底部链接行', [
      textBlock(`${P}-s7-contact`, '联系我们', 'Contact Us', { fontSize: '12px', widthMode: 'hug' }),
      textBlock(`${P}-s7-privacy`, '隐私政策', 'Privacy Policy', { fontSize: '12px', widthMode: 'hug' }),
      textBlock(`${P}-s7-preferences`, '邮件偏好', 'Email Preferences', { fontSize: '12px', widthMode: 'hug' }),
      textBlock(`${P}-s7-unsubscribe`, '退订', 'Unsubscribe', { fontSize: '12px', widthMode: 'hug' }),
    ], { gap: '24px' }),
  ];
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, '社交媒体区', { padTop: '0', padBottom: '24px' });
  sec.children = [
    rowLayout(`${P}-s8-social`, '社交媒体图标行', [
      iconBlock(`${P}-s8-facebook`, 'Facebook图标', ICON['social-facebook'], { size: '24px' }),
      iconBlock(`${P}-s8-twitter`, 'Twitter图标', ICON['social-twitter'], { size: '24px' }),
      iconBlock(`${P}-s8-youtube`, 'YouTube图标', ICON['social-youtube'], { size: '24px' }),
      iconBlock(`${P}-s8-instagram`, 'Instagram图标', ICON['social-instagram'], { size: '24px' }),
    ], { gap: '24px' }),
  ];
  return sec;
}

function buildS9() {
  const sec = sectionShell(`${P}-s9`, '版权信息区', { padTop: '0', padBottom: '16px' });
  sec.children = [
    textBlock(`${P}-s9-copyright`, '版权信息', '© 2023 Guitar Center, Inc., P.O. Box 5111, Thousand Oaks, CA 91359-5111, USA. Call us at 877-687-5403 from 6 a.m. to 8 p.m. PT, Monday through Friday, and from 7 a.m. to 7 p.m. PT, Saturday and Sunday.', { fontSize: '10px' }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Guitar Center 感谢优惠券模板',
      description: '吉他中心感谢用户订阅优惠券邮件模板',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '64px', h1: '22px', body: '14px', caption: '10px' },
        radius: { panel: '0', cta: '4px' },
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
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7(), buildS8(), buildS9()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

