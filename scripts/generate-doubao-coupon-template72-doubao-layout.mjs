#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "优惠券 2（模板 72 · 豆包手工还原）";
const DESIGN_SRC = "/Users/hengliheng/Downloads/邮件学习模板/优惠券 2（模板 72）.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = join(EMAIL_DIR, 'layouts/default');

const PEXELS = {
  hero: "https://images.pexels.com/photos/30256468/pexels-photo-30256468.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "productWorkBoot": "https://images.pexels.com/photos/23319169/pexels-photo-23319169.jpeg?auto=compress&cs=tinysrgb&h=350",
  "storeInterior": "https://images.pexels.com/photos/31280344/pexels-photo-31280344.jpeg?auto=compress&cs=tinysrgb&h=350",
};

const ICON = {
  "iconMobile": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/device-mobile.svg",
  "iconPrint": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/printer.svg",
  "iconFacebook": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "iconTwitter": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/twitter.svg",
};
const COLORS = {
  primary: '#222222',
  secondary: '#D12121',
  surface: '#E8E2D6',
  surfaceLight: '#F5F1E6',
  dark: '#2A2A2A',
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
    textColor = COLORS.white,
    fontSize = '16px',
    radius = '0',
    width = '160px',
    height = '44px',
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

function barcodeImage(id, name, height = '60px') {
  return coverImage(id, name, '#', 'barcode', height);
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部宣传横幅', { padTop: '0', padBottom: '0', pageInline: false });
  const overlayContent = {
    id: `${P}-s1-overlay`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '横幅文字层' },
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: 'rgba(0,0,0,0)',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    children: [
      textBlock(`${P}-s1-title`, '大标题', 'SAVE BIG', { fontSize: '80px', color: COLORS.white, bold: true }),
      textBlock(`${P}-s1-subtitle`, '副标题', 'RED WING STORE SALE', { fontSize: '40px', color: COLORS.white, bold: true }),
      textBlock(`${P}-s1-date`, '活动时间', 'SATURDAY, NOV. 24TH UNTIL NOON', { fontSize: '20px', color: COLORS.white }),
    ],
  };
  sec.children = [imageContainer(`${P}-s1-img`, '门店门头图', PEXELS.hero, 'Red Wing门店门头', '400px', [overlayContent])];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '活动说明区域', { bg: COLORS.surface });
  sec.children = [
    textBlock(`${P}-s2-title`, '活动预告', 'PREPARE TO SAVE BIG ON FOOTWEAR & ACCESSORIES!', { fontSize: '22px', bold: true }),
    rowLayout(`${P}-s2-row`, '产品与优惠行', [
      {
        id: `${P}-s2-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '产品展示区' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fixed',
          width: '270px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          coverImage(`${P}-s2-product`, '工装靴产品图', PEXELS.productWorkBoot, 'King Toe工装靴', '200px'),
          textBlock(`${P}-s2-product-title`, '产品名称', 'CHECK IT OUT', { fontSize: '20px', color: COLORS.secondary, bold: true, alignH: 'left' }),
          textBlock(`${P}-s2-product-sub1`, '产品系列', 'KING TOE® ADC', { fontSize: '16px', alignH: 'left' }),
          textBlock(`${P}-s2-product-sub2`, '产品型号', 'STYLE #4402', { fontSize: '16px', alignH: 'left' }),
        ],
      },
      {
        id: `${P}-s2-right`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '优惠信息区' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '270px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          {
            id: `${P}-s2-discount-box`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '折扣说明框' },
            props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
            wrapperStyle: {
              contentAlign: { horizontal: 'left', vertical: 'top' },
              widthMode: 'fill',
              heightMode: 'hug',
              backgroundColor: COLORS.secondary,
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
            children: [
              textBlock(`${P}-s2-discount-title`, '折扣标题', 'GET READY TO SAVE 20%', { fontSize: '24px', color: COLORS.white, bold: true, alignH: 'left' }),
              textBlock(`${P}-s2-discount-desc`, '折扣说明', 'off your entire purchase of regularly priced merchandise on Saturday, Nov. 24, 2018 until noon.*', { fontSize: '14px', color: COLORS.white, alignH: 'left' }),
            ],
          },
          textBlock(`${P}-s2-promo-label`, '优惠码标签', 'PROMO CODE: 161-53', { fontSize: '14px', bold: true }),
          barcodeImage(`${P}-s2-barcode`, '优惠码条形码'),
        ],
      },
    ], { gap: '20px' }),
    {
      id: `${P}-s2-divider`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '分割线' },
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
    textBlock(`${P}-s2-redeem-title`, '兑换说明标题', 'Redeem your coupon at a participating store.', { fontSize: '20px', bold: true }),
    rowLayout(`${P}-s2-redeem-row`, '兑换方式行', [
      rowLayout(`${P}-s2-redeem-mobile`, '移动端兑换', [
        iconBlock(`${P}-s2-icon-mobile`, '手机图标', ICON.iconMobile, { size: '28px', color: COLORS.secondary }),
        textBlock(`${P}-s2-redeem-mobile-text`, '移动端说明', 'SHOW THIS OFFER\nON YOUR PHONE', { fontSize: '14px', bold: true, alignH: 'left', widthMode: 'hug' }),
      ], { gap: '8px', alignH: 'left', alignV: 'center' }),
      textBlock(`${P}-s2-or`, '或', 'or', { fontSize: '16px', bold: true, widthMode: 'hug' }),
      buttonBlock(`${P}-s2-print-btn`, '打印按钮', 'PRINT OFFER', { width: '180px', height: '40px' }),
    ], { gap: '24px', alignH: 'center', alignV: 'center' }),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '用户评价与分享区', { bg: COLORS.dark, padTop: '20px', padBottom: '20px' });
  sec.children = [
    rowLayout(`${P}-s3-row`, '评价与分享行', [
      {
        id: `${P}-s3-quote`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '用户评价' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '380px',
          heightMode: 'hug',
          border: { mode: 'custom', style: 'solid', color: COLORS.secondary, top: { width: '0' }, right: { width: '1px' }, bottom: { width: '0' }, left: { width: '0' } },
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-quote-text`, '评价内容', '"Best boots I\'ve ever owned! I\'m on my feet 10 to 12 hours a day and these boots are comfortable all day long."', { fontSize: '14px', color: COLORS.white, alignH: 'left' }),
          textBlock(`${P}-s3-quote-author`, '评价作者', 'Doubled22 | Albany, NY | Transportation', { fontSize: '12px', color: COLORS.white }),
        ],
      },
      {
        id: `${P}-s3-share`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '分享区域' },
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
          textBlock(`${P}-s3-share-title`, '分享标题', 'Share with your team', { fontSize: '16px', color: COLORS.white }),
          rowLayout(`${P}-s3-share-icons`, '分享图标行', [
            iconBlock(`${P}-s3-icon-fb`, 'Facebook图标', ICON.iconFacebook, { size: '24px', color: COLORS.white }),
            iconBlock(`${P}-s3-icon-twitter`, 'Twitter图标', ICON.iconTwitter, { size: '24px', color: COLORS.white }),
          ], { gap: '16px' }),
        ],
      },
    ], { gap: '20px', alignH: 'center', alignV: 'top' }),
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '门店查找区域', { bg: COLORS.surfaceLight, padTop: '24px', padBottom: '24px', pageInline: false });
  sec.children = [
    rowLayout(`${P}-s4-row`, '门店信息与图片行', [
      {
        id: `${P}-s4-left`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '门店信息' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fixed',
          width: '270px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s4-title`, '区域标题', 'YOUR NEAREST STORE', { fontSize: '24px', color: COLORS.secondary, bold: true, alignH: 'left' }),
          textBlock(`${P}-s4-subtitle`, '区域副标题', 'GET THE RIGHT FIT TODAY', { fontSize: '16px', bold: true, alignH: 'left' }),
          textBlock(`${P}-s4-desc`, '区域说明', 'Stop in to a participating store near you to use your coupon and get the Ultimate Fit Experience', { fontSize: '14px', alignH: 'left' }),
          buttonBlock(`${P}-s4-store-btn`, '查找门店按钮', 'FIND YOUR NEAREST STORE', { width: '230px', height: '40px', alignH: 'left' }),
        ],
      },
      coverImage(`${P}-s4-store-img`, '门店内景图', PEXELS.storeInterior, 'Red Wing门店内景', '320px'),
    ], { gap: '20px', alignH: 'left', alignV: 'top' }),
  ];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '底部信息区域', { bg: COLORS.dark, padTop: '20px', padBottom: '20px' });
  sec.children = [
    textBlock(`${P}-s5-valid`, '活动有效说明', 'VALID IN PARTICIPATING STORES SATURDAY, NOVEMBER 24, 2018 UNTIL NOON', { fontSize: '14px', color: COLORS.white }),
    buttonBlock(`${P}-s5-participate-btn`, '参与门店按钮', 'FIND PARTICIPATING STORES', { width: '260px', height: '36px', bg: 'transparent', textColor: COLORS.secondary }),
    coverImage(`${P}-s5-logo`, 'Red Wing小Logo', '#', 'Red Wing Logo', '40px'),
    textBlock(`${P}-s5-address`, '公司地址', 'Red Wing Shoe Company, Inc.\n314 Main St. Red Wing, MN 55066', { fontSize: '12px', color: COLORS.white }),
    {
      id: `${P}-s5-divider`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '分割线' },
      wrapperStyle: {
        widthMode: 'fixed',
        width: '200px',
        heightMode: 'fixed',
        height: '1px',
        backgroundColor: COLORS.white,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [],
    },
    textBlock(`${P}-s5-terms`, '条款说明', '*Offer - Save 20% on your entire purchase of all regularly priced items in the store Saturday, November 24th until noon. Available at participating Red Wing Stores only. Offer not available for online purchases.\nNot valid with other offers (Examples: past purchases, coupons, sales, discounts, or voucher programs). Some exclusions may apply. Limit one coupon per customer.', { fontSize: '12px', color: COLORS.white }),
    rowLayout(`${P}-s5-links`, '底部链接行', [
      textBlock(`${P}-s5-unsubscribe`, '取消订阅', 'Unsubscribe', { fontSize: '12px', color: COLORS.white, decoration: 'underline', widthMode: 'hug' }),
      textBlock(`${P}-s5-privacy`, '隐私政策', 'Privacy Policy', { fontSize: '12px', color: COLORS.white, decoration: 'underline', widthMode: 'hug' }),
    ], { gap: '16px' }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Red Wing优惠邮件模板',
      description: 'Red Wing门店促销活动优惠邮件模板',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '80px', h1: '24px', body: '16px', caption: '12px' },
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

const meta = { schemaVersion: '1.0.0', emailKey: EMAIL, displayName, publishStatus: 'published' };
const layoutManifest = {
  schemaVersion: '1.0.0',
  activeLayoutVariantId: 'default',
  variants: [{ id: 'default', label: displayName, publishStatus: 'published' }],
};
const payload = { schemaVersion: '1.0.0', slots: {}, values: {} };

mkdirSync(OUT, { recursive: true });
mkdirSync(EMAIL_DIR, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
writeFileSync(join(EMAIL_DIR, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
writeFileSync(join(EMAIL_DIR, 'layout-manifest.json'), `${JSON.stringify(layoutManifest, null, 2)}\n`);
writeFileSync(join(EMAIL_DIR, 'payload.json'), `${JSON.stringify(payload, null, 2)}\n`);
try {
  copyFileSync(DESIGN_SRC, DESIGN_DST);
} catch {
  /* 设计图复制失败则跳过 */
}
console.log(`Wrote ${OUT}`);

