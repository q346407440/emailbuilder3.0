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
  hero: "https://images.pexels.com/photos/6946027/pexels-photo-6946027.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "productBoot": "https://images.pexels.com/photos/23319169/pexels-photo-23319169.jpeg?auto=compress&cs=tinysrgb&h=350",
  "storeInterior": "https://images.pexels.com/photos/37595187/pexels-photo-37595187.jpeg?auto=compress&cs=tinysrgb&h=350",
};

const ICON = {
  "mobileIcon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/device-mobile.svg",
  "printIcon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/printer.svg",
  "facebookIcon": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "twitterIcon": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/twitter.svg",
};
const COLORS = {
  red: '#C8102E',
  black: '#2A2A2A',
  lightBeige: '#E9E2D3',
  offWhite: '#F7F3E9',
  white: '#FFFFFF',
  darkGray: '#2D2D2D',
  grayText: '#444444',
};

function borderNone() {
  return { mode: 'unified', width: '0', style: 'solid', color: 'rgba(0,0,0,0)' };
}
function themeRef(path) {
  return { $themeRef: path };
}
function themeBinding(fieldPath, tokenPath) {
  return {
    [fieldPath]: { slotId: tokenPath, mode: 'theme', tokenPath, fieldKind: 'style' },
  };
}

function sectionShell(id, name, opts = {}) {
  const {
    bg = COLORS.lightBeige,
    pageInline = true,
    padTop = '24px',
    padBottom = '24px',
    borderRadius = '0',
  } = opts;
  const padding = pageInline
    ? {
        mode: 'separate',
        top: padTop,
        right: '24px',
        bottom: padBottom,
        left: '24px',
      }
    : { mode: 'separate', top: padTop, right: '0', bottom: padBottom, left: '0' };
  const bindings = {};
  if (pageInline) {
    Object.assign(bindings, themeBinding('wrapperStyle.padding.right', 'tokens.spacing.pageInline'));
    Object.assign(bindings, themeBinding('wrapperStyle.padding.left', 'tokens.spacing.pageInline'));
  }
  if (padBottom?.$themeRef) {
    Object.assign(bindings, themeBinding('wrapperStyle.padding.bottom', 'tokens.spacing.section'));
  }
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
    bindings,
    children: [],
  };
}

function textBlock(id, name, content, opts = {}) {
  const {
    alignH = 'center',
    fontSize = '14px',
    color = COLORS.black,
    fontSizePath = 'tokens.typography.body',
    colorPath = 'colors.primary',
    bold = false,
    widthMode = 'fill',
    italic = false,
    decoration = 'none',
  } = opts;
  const bindings = {};
  if (fontSize?.$themeRef) Object.assign(bindings, themeBinding('props.fontSize', fontSizePath));
  if (color?.$themeRef) Object.assign(bindings, themeBinding('props.color', colorPath));
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
    bindings,
  };
}

function buttonBlock(id, name, label, opts = {}) {
  const {
    alignH = 'center',
    bg = COLORS.surface,
    textColor = COLORS.primary,
    fontSize = '14px',
    fontSizePath = 'tokens.typography.body',
    radius = '0',
    radiusPath = 'tokens.radius.cta',
    width = '160px',
    height = '44px',
    bold = false,
  } = opts;
  const bindings = {};
  if (fontSize?.$themeRef) Object.assign(bindings, themeBinding('props.buttonStyle.fontSize', fontSizePath));
  if (radius?.$themeRef) Object.assign(bindings, themeBinding('props.buttonStyle.borderRadius.radius', radiusPath));
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
    bindings,
  };
}

function iconBlock(id, name, src, opts = {}) {
  const { size = '32px', color = COLORS.primary } = opts;
  return {
    id,
    type: 'icon',
    blockMeta: { blockType: 'content.icon', name },
    props: { src, size, color },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function imageContainer(id, name, src, alt, height, overlayChildren, alignV = 'center') {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
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

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '首屏英雄区', { padTop: '0', padBottom: '0', bg: COLORS.white, pageInline: false });
  const heroOverlay = {
    id: `${P}-s1-overlay`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '首屏文字覆盖层' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s1-title`, '大标题', 'SAVE BIG', { fontSize: '72px', color: COLORS.white, bold: true }),
      textBlock(`${P}-s1-subtitle`, '副标题', 'RED WING STORE SALE', { fontSize: '42px', color: COLORS.white, bold: true }),
      textBlock(`${P}-s1-date`, '活动日期', 'SATURDAY, NOV. 24TH UNTIL NOON', { fontSize: '18px', color: COLORS.white }),
    ],
  };
  sec.children = [
    imageContainer(`${P}-s1-hero`, '门店入口背景图', PEXELS.hero, 'Red Wing门店入口', '400px', [heroOverlay]),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '活动说明区', { padTop: '24px', bg: COLORS.lightBeige });
  const productRow = {
    id: `${P}-s2-product-row`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '产品与优惠行' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${P}-s2-product-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '产品展示区' },
        props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          {
            id: `${P}-s2-boot-img`,
            type: 'image',
            blockMeta: { blockType: 'content.image', name: '工装靴产品图' },
            wrapperStyle: {
              contentAlign: { horizontal: 'center', vertical: 'center' },
              widthMode: 'fixed',
              width: '220px',
              heightMode: 'fixed',
              height: '180px',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
              backgroundImage: {
                src: PEXELS.productBoot,
                alt: 'King Toe ADC工装靴',
                fit: 'contain',
                position: 'center',
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '0' },
              },
            },
          },
          {
            id: `${P}-s2-product-text`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '产品说明文字' },
            props: { direction: 'vertical', gapMode: 'fixed', gap: '4px' },
            wrapperStyle: {
              widthMode: 'hug',
              heightMode: 'hug',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
            children: [
              textBlock(`${P}-s2-product-title`, '产品标题', 'CHECK IT OUT', { fontSize: '20px', color: COLORS.red, bold: true, alignH: 'left', widthMode: 'hug' }),
              textBlock(`${P}-s2-product-name`, '产品名', 'KING TOE® ADC', { fontSize: '16px', color: COLORS.black, bold: true, alignH: 'left', widthMode: 'hug' }),
              textBlock(`${P}-s2-product-sku`, '产品型号', 'STYLE #4402', { fontSize: '16px', color: COLORS.black, alignH: 'left', widthMode: 'hug' }),
            ],
          },
        ],
      },
      {
        id: `${P}-s2-coupon-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '优惠信息区' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '320px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          {
            id: `${P}-s2-coupon-card`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '优惠卡片' },
            props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
            wrapperStyle: {
              widthMode: 'fill',
              heightMode: 'hug',
              backgroundColor: COLORS.red,
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
            children: [
              textBlock(`${P}-s2-coupon-title`, '优惠标题', 'GET READY TO SAVE 20%', { fontSize: '26px', color: COLORS.white, bold: true, alignH: 'left' }),
              textBlock(`${P}-s2-coupon-desc`, '优惠说明', 'off your entire purchase of regularly priced merchandise on Saturday, Nov. 24, 2018 until noon.*', { fontSize: '14px', color: COLORS.white, alignH: 'left' }),
            ],
          },
          textBlock(`${P}-s2-promo-label`, '优惠码标签', 'PROMO CODE: 161-53', { fontSize: '14px', color: COLORS.black, bold: true, alignH: 'center' }),
          {
            id: `${P}-s2-barcode`,
            type: 'image',
            blockMeta: { blockType: 'content.image', name: '条形码' },
            wrapperStyle: {
  backgroundImage: {
    src: '#',
    alt: '',
    fit: 'contain',
    position: 'center',
    border: borderNone(),
    borderRadius: { mode: 'unified', radius: '0' },
  },
              contentAlign: { horizontal: 'center', vertical: 'center' },
              widthMode: 'fill',
              heightMode: 'fixed',
              height: '40px',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
              backgroundColor: COLORS.black,
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
          },
        ],
      },
    ],
  };
  sec.children = [
    textBlock(`${P}-s2-headline`, '活动引导标题', 'PREPARE TO SAVE BIG ON FOOTWEAR & ACCESSORIES!', { fontSize: '22px', color: COLORS.black, bold: true }),
    productRow,
    {
      id: `${P}-s2-divider`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '分割线' },
      wrapperStyle: {
        widthMode: 'fill',
        heightMode: 'fixed',
        height: '2px',
        backgroundColor: COLORS.grayText,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
    },
    textBlock(`${P}-s2-redeem-title`, '兑换引导标题', 'Redeem your coupon at a participating store.', { fontSize: '20px', color: COLORS.black, bold: true }),
    {
      id: `${P}-s2-redeem-row`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '兑换方式行' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
      wrapperStyle: {
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        {
          id: `${P}-s2-mobile-option`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '手机出示选项' },
          props: { direction: 'horizontal', gapMode: 'fixed', gap: '12px' },
          wrapperStyle: {
            widthMode: 'hug',
            heightMode: 'hug',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            iconBlock(`${P}-s2-mobile-icon`, '手机图标', ICON.mobileIcon, { size: '32px', color: COLORS.red }),
            textBlock(`${P}-s2-mobile-text`, '手机出示文字', 'SHOW THIS OFFER\nON YOUR PHONE', { fontSize: '14px', color: COLORS.red, bold: true, alignH: 'left', widthMode: 'hug' }),
          ],
        },
        textBlock(`${P}-s2-or`, '或', 'or', { fontSize: '16px', color: COLORS.black, widthMode: 'hug' }),
        buttonBlock(`${P}-s2-print-btn`, '打印优惠按钮', 'PRINT OFFER', { bg: COLORS.red, textColor: COLORS.white, width: '180px', height: '40px', bold: true }),
      ],
    },
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '用户评价与分享区', { padTop: '16px', padBottom: '16px', bg: COLORS.darkGray });
  const row = {
    id: `${P}-s3-row`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '评价与分享行' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${P}-s3-testimonial-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '用户评价区' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '400px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-quote`, '评价内容', '"Best boots I\'ve ever owned! I\'m on my feet 10 to 12 hours a day and these boots are comfortable all day long."', { fontSize: '14px', color: COLORS.white, italic: true, alignH: 'center' }),
          textBlock(`${P}-s3-quote-author`, '评价作者', 'Doubled22 | Albany, NY | Transportation', { fontSize: '12px', color: COLORS.white, alignH: 'center' }),
        ],
      },
      {
        id: `${P}-s3-share-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '分享区' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          widthMode: 'hug',
          heightMode: 'hug',
          border: { mode: 'custom', style: 'solid', color: COLORS.grayText, top: { width: '0' }, right: { width: '0' }, bottom: { width: '0' }, left: { width: '1px' } },
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-share-title`, '分享标题', 'Share with your team', { fontSize: '14px', color: COLORS.white, bold: true, widthMode: 'hug' }),
          {
            id: `${P}-s3-social-icons`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '社交图标组' },
            props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
            wrapperStyle: {
              widthMode: 'hug',
              heightMode: 'hug',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
            children: [
              iconBlock(`${P}-s3-fb-icon`, 'Facebook图标', ICON.facebookIcon, { size: '28px', color: COLORS.white }),
              iconBlock(`${P}-s3-twitter-icon`, 'Twitter图标', ICON.twitterIcon, { size: '28px', color: COLORS.white }),
            ],
          },
        ],
      },
    ],
  };
  sec.children = [row];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '门店查找区', { padTop: '24px', bg: COLORS.offWhite });
  const row = {
    id: `${P}-s4-row`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '门店信息与图片行' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${P}-s4-store-text`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '门店信息文字' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '280px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s4-title`, '最近门店标题', 'YOUR NEAREST STORE', { fontSize: '26px', color: COLORS.red, bold: true, alignH: 'left' }),
          textBlock(`${P}-s4-subtitle`, '适配副标题', 'GET THE RIGHT FIT TODAY', { fontSize: '16px', color: COLORS.black, bold: true, alignH: 'left' }),
          textBlock(`${P}-s4-desc`, '门店说明', 'Stop in to a participating store near you to use your coupon and get the Ultimate Fit Experience', { fontSize: '14px', color: COLORS.black, alignH: 'left' }),
          buttonBlock(`${P}-s4-find-btn`, '查找最近门店按钮', 'FIND YOUR NEAREST STORE', { bg: COLORS.red, textColor: COLORS.white, width: '240px', height: '40px', alignH: 'left', bold: true }),
        ],
      },
      {
        id: `${P}-s4-store-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '门店内部图' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '260px',
          heightMode: 'fixed',
          height: '280px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: PEXELS.storeInterior,
            alt: 'Red Wing门店内部',
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      },
    ],
  };
  sec.children = [row];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '页脚区', { padTop: '24px', padBottom: '24px', bg: COLORS.darkGray });
  sec.children = [
    textBlock(`${P}-s5-validity`, '活动有效期', 'VALID IN PARTICIPATING STORES SATURDAY, NOVEMBER 24, 2018 UNTIL NOON', { fontSize: '12px', color: COLORS.white }),
    textBlock(`${P}-s5-find-link`, '查找参与门店链接', 'FIND PARTICIPATING STORES', { fontSize: '14px', color: COLORS.red, bold: true, decoration: 'underline' }),
    iconBlock(`${P}-s5-logo`, 'Red Wing标志', ICON.redWingLogo, { size: '32px', color: COLORS.red }),
    textBlock(`${P}-s5-address`, '公司地址', 'Red Wing Shoe Company, Inc.\n314 Main St. Red Wing, MN 55066', { fontSize: '12px', color: COLORS.white }),
    {
      id: `${P}-s5-divider`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '分割线' },
      wrapperStyle: {
        widthMode: 'fixed',
        width: '300px',
        heightMode: 'fixed',
        height: '1px',
        backgroundColor: COLORS.grayText,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
    },
    textBlock(`${P}-s5-terms`, '条款说明', `*Offer - Save 20% on your entire purchase of all regularly priced items in the store Saturday, November 24th until noon. Available at participating Red Wing Stores only. Offer not available for online purchases.
Not valid with other offers (Examples: past purchases, coupons, sales, discounts, or voucher programs). Some exclusions may apply. Limit one coupon per customer.`, { fontSize: '11px', color: COLORS.white }),
    {
      id: `${P}-s5-footer-links`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '页脚链接' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s5-unsubscribe`, '取消订阅链接', 'Unsubscribe', { fontSize: '12px', color: COLORS.white, widthMode: 'hug', decoration: 'underline' }),
        textBlock(`${P}-s5-privacy`, '隐私政策链接', 'Privacy Policy', { fontSize: '12px', color: COLORS.white, widthMode: 'hug', decoration: 'underline' }),
      ],
    },
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Red Wing促销邮件',
      description: 'Red Wing门店促销活动邮件模板',
      tokens: {
        colors: { primary: COLORS.black, secondary: COLORS.red, surface: COLORS.lightBeige },
        spacing: { section: '24px', gap: '16px', pageInline: '24px' },
        typography: { display: '72px', h1: '26px', body: '14px', caption: '12px' },
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
      backgroundColor: COLORS.white,
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

