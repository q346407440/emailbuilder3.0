#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 65 底稿 patch 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/b1d7fa0a-202e-4e8f-a4a6-3e463bb376ee/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/b1d7fa0a-202e-4e8f-a4a6-3e463bb376ee/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/9871955/pexels-photo-9871955.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
};

const ICON = {
  "lessons-icon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/music.svg",
  "financing-icon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/credit-card.svg",
  "daily-pick-icon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/pick.svg",
  "used-gear-icon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/guitar-pick.svg",
  "app-store-icon": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/apple.svg",
  "google-play-icon": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/googleplay.svg",
  "facebook-icon": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "twitter-icon": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/twitter.svg",
  "youtube-icon": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/youtube.svg",
  "instagram-icon": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
};
/* @mjs-slot:COLORS */
const COLORS = {
  primary: '#000000',
  secondary: '#E21935',
  surface: '#FFFFFF',
  textLight: '#666666',
  white: '#FFFFFF',
};
/* @mjs-slot-end:COLORS */

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

function productCard(id, cardName, productName, imageSrc, imageAlt) {
  const alt = imageAlt ?? productName;
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: cardName },
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
        type: 'image',
        blockMeta: { blockType: 'content.image', name: `${productName}图` },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '100px',
          heightMode: 'fixed',
          height: '100px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '8px' },
          backgroundImage: {
            src: imageSrc,
            alt,
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '8px' },
          },
        },
      },
      textBlock(`${id}-name`, '产品名称', productName, { fontSize: '14px' }),
      buttonBlock(`${id}-cta`, '购买按钮', 'Shop now', { fontSize: '12px', widthMode: 'fixed', width: '100px' }),
    ],
  };
}

/* @mjs-slot:buildS1 */
function buildS1() {
  const sec = sectionShell(`${P}-s1`, '首屏英雄图', { pageInline: false, padTop: '0', padBottom: '0' });
  sec.children = [
    coverImage(`${P}-s1-hero`, '合成器英雄图', PEXELS.hero, 'analog synthesizer keyboard with knobs on teal background', '600px'),
  ];
  return sec;
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  const sec = sectionShell(`${P}-s2`, '感谢文案', { padTop: '24px', padBottom: '16px' });
  sec.children = [
    textBlock(`${P}-s2-title`, '标题', 'THANK YOU FOR GETTING US UP TO SPEED', { alignH: 'left', bold: true, fontSize: '20px' }),
    textBlock(`${P}-s2-desc`, '描述', "Now you'll get all the deals and news you want. Just like we promised, here's your coupon for 15% off a single qualifying*, non-sale item, maximum discount $500 to use now thru 11/18/2023. Some exclusions and limitations apply. You can read up on those below.", { alignH: 'left', fontSize: '16px', color: COLORS.primary }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  const sec = sectionShell(`${P}-s3`, '优惠券区块', { padTop: '16px', padBottom: '24px' });
  const couponCard = {
    id: `${P}-s3-card`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '优惠券卡片' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: COLORS.white,
      border: { mode: 'unified', width: '2px', style: 'dashed', color: COLORS.primary },
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s3-discount`, '折扣', '15% OFF', { bold: true, fontSize: '64px' }),
      textBlock(`${P}-s3-desc`, '折扣描述', 'a single qualifying*, non-sale item', { fontSize: '20px' }),
      textBlock(`${P}-s3-valid`, '有效期', 'Valid thru 11/18/2023\nMaximum discount $500.', { fontSize: '16px' }),
      textBlock(`${P}-s3-code`, '优惠码', 'Coupon Code: r511c0673pxk8', { bold: true, fontSize: '18px' }),
      barcodeImage(`${P}-s3-barcode`, '条形码', '40px'),
      buttonBlock(`${P}-s3-cta`, '立即购买按钮', 'Shop Now', { bg: COLORS.secondary, textColor: COLORS.white, radius: '4px', fontSize: '18px', bold: true }),
      textBlock(`${P}-s3-disclaimer`, '免责声明', '* View exclusions and limitations', { fontSize: '14px', decoration: 'underline' }),
    ],
  };
  sec.children = [couponCard];
  return sec;
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const sec = sectionShell(`${P}-s4`, '页脚文案', { padTop: '16px', padBottom: '24px' });
  sec.children = [
    textBlock(`${P}-s4-text1`, '祝福文案', 'Whatever you decide to save on, we hope you love it.', { alignH: 'left', fontSize: '16px', color: COLORS.primary }),
    textBlock(`${P}-s4-text2`, '署名', 'The Guitar Center Team', { alignH: 'left', fontSize: '16px', color: COLORS.textLight }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  const sec = sectionShell(`${P}-s5`, '服务板块', { padTop: '16px', padBottom: '24px' });
  const serviceItem = (id, name, iconSrc, label) => ({
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
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
      iconBlock(`${id}-icon`, `${name}图标`, iconSrc, { size: '32px' }),
      textBlock(`${id}-label`, `${name}名称`, label, { fontSize: '16px', bold: true }),
    ],
  });
  sec.children = [
    gridBlock(`${P}-s5-grid`, '服务网格', 4, [
      serviceItem(`${P}-s5-s1`, '课程', ICON['lessons-icon'], 'Lessons'),
      serviceItem(`${P}-s5-s2`, '金融服务', ICON['financing-icon'], 'Financing'),
      serviceItem(`${P}-s5-s3`, '每日精选', ICON['daily-pick-icon'], 'Daily Pick'),
      serviceItem(`${P}-s5-s4`, '二手装备', ICON['used-gear-icon'], 'Used Gear'),
    ], { gap: '20px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS5 */

/* @mjs-slot:buildS6 */
function buildS6() {
  const sec = sectionShell(`${P}-s6`, '应用下载', { padTop: '16px', padBottom: '24px' });
  const appBadge = (id, name, iconSrc, alt) => ({
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fixed',
      width: '160px',
      heightMode: 'fixed',
      height: '50px',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '8px' },
      backgroundImage: {
        src: iconSrc,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '8px' },
      },
    },
  });
  sec.children = [
    rowLayout(`${P}-s6-badges`, '应用下载徽章行', [
      appBadge(`${P}-s6-apple`, 'App Store徽章', ICON['app-store-icon'], 'Download on the App Store'),
      appBadge(`${P}-s6-google`, 'Google Play徽章', ICON['google-play-icon'], 'Get it on Google Play'),
    ], { gap: '16px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS6 */

/* @mjs-slot:buildS7 */
function buildS7() {
  const sec = sectionShell(`${P}-s7`, '页脚链接', { padTop: '16px', padBottom: '24px' });
  const linkText = (id, name, content) => textBlock(id, name, content, { fontSize: '14px', color: COLORS.textLight, widthMode: 'hug' });
  const socialIcon = (id, name, iconSrc) => iconBlock(id, name, iconSrc, { size: '24px', color: COLORS.primary });
  sec.children = [
    rowLayout(`${P}-s7-links`, '页脚链接行', [
      linkText(`${P}-s7-l1`, '联系我们', 'Contact Us'),
      linkText(`${P}-s7-l2`, '竖线', '|'),
      linkText(`${P}-s7-l3`, '隐私政策', 'Privacy Policy'),
      linkText(`${P}-s7-l4`, '竖线', '|'),
      linkText(`${P}-s7-l5`, '邮件偏好', 'Email Preferences'),
      linkText(`${P}-s7-l6`, '竖线', '|'),
      linkText(`${P}-s7-l7`, '退订', 'Unsubscribe'),
    ], { gap: '16px' }),
    rowLayout(`${P}-s7-social`, '社交媒体图标行', [
      socialIcon(`${P}-s7-s1`, 'Facebook', ICON['facebook-icon']),
      socialIcon(`${P}-s7-s2`, 'Twitter', ICON['twitter-icon']),
      socialIcon(`${P}-s7-s3`, 'YouTube', ICON['youtube-icon']),
      socialIcon(`${P}-s7-s4`, 'Instagram', ICON['instagram-icon']),
    ], { gap: '20px' }),
    textBlock(`${P}-s7-copyright`, '版权信息', '© 2023 Guitar Center, Inc., P.O. Box 5111, Thousand Oaks, CA 91359-5111, USA. Call us at 877-687-5403 from 6 a.m. to 8 p.m. PT, Monday through Friday, and from 7 a.m. to 7 p.m. PT, Saturday and Sunday.', { fontSize: '12px', color: COLORS.textLight }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS7 */



/* @mjs-slot:tokenPresets */
const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: displayName,
      description: 'Guitar Center感恩节优惠券邮件模板，含15%折扣码与服务入口',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '64px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '8px', cta: '4px' },
      },
    },
  },
  scopeSelections: {},
};
/* @mjs-slot-end:tokenPresets */

/* @mjs-slot:template */
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
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7()],
  },
};
/* @mjs-slot-end:template */

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

