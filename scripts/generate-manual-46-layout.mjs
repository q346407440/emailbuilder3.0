#!/usr/bin/env node
/**
 * 手工还原「后续 2（模板 46）」Forever 21 — 模拟 pipeline 产物形态，不经 LLM。
 */
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = 'engagement_followup_template46';
const P = 'eft46';
const OUT = join(__dirname, `../data/emails/${EMAIL}/layouts/default`);
const DESIGN_SRC = '/Users/hengliheng/Downloads/邮件学习模板/后续 2（模板 46）.png';
const DESIGN_DST = join(__dirname, '../public/test-assets/followup-template-46.png');

const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  yellow: '#FFD100',
  heroBlue: '#C8E6F5',
  rowYellow: '#FFF9E6',
  appPurple: '#E8D4F0',
  grey: '#6B7280',
  star: '#FFD100',
};

const PEXELS = {
  hero: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=600',
  grid3: [
    'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1884584/pexels-photo-1884584.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=400',
  ],
  picked: [
    'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1485031/pexels-photo-1485031.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=400',
  ],
};

const ICON = {
  instagram: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg',
  youtube: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/youtube.svg',
  facebook: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg',
  x: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/x.svg',
  snapchat: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/snapchat.svg',
  linkedin: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/linkedin.svg',
};

const GRID3 = [
  { name: 'HOODED TURTLENECK SWEATER', price: '$ 18.00' },
  { name: 'OVERSIZED KNIT PULLOVER', price: '$ 22.00' },
  { name: 'FLEECE ZIP HOODIE', price: '$ 24.00' },
];

const PICKED = [
  { name: 'FLEECE CARGO JOGGERS', price: '$ 29.99' },
  { name: 'PLEATED TWIST-FRONT CROPPED CAMI', price: '$ 14.99' },
  { name: 'FRAYED CAMO PRINT JACKET', price: '$ 34.99' },
];

const CATEGORIES = [
  'SHOP WOMEN',
  'SHOP MEN',
  'SHOP PLUS + CURVE',
  'SHOP GIRLS',
  'SHOP ACCESSORIES',
  'SHOP BEAUTY',
];

let seq = 0;
const nid = (suffix) => `${P}-${suffix}-${++seq}`.replace(/-+/g, '-');

function borderNone() {
  return { mode: 'unified', width: '0', style: 'solid', color: 'rgba(0,0,0,0)' };
}

function themeRef(path) {
  return { $themeRef: path };
}

function themeBinding(fieldPath, tokenPath) {
  return {
    [fieldPath]: {
      slotId: tokenPath,
      mode: 'theme',
      tokenPath,
      fieldKind: 'style',
    },
  };
}

function sectionShell(id, name, opts = {}) {
  const { bg = null, pageInline = true, padTop = '0', padBottom = themeRef('tokens.spacing.section') } = opts;
  const padding = {
    mode: 'separate',
    top: padTop,
    right: pageInline ? themeRef('tokens.spacing.pageInline') : '0',
    bottom: padBottom,
    left: pageInline ? themeRef('tokens.spacing.pageInline') : '0',
  };
  const bindings = pageInline
    ? {
        ...themeBinding('wrapperStyle.padding.bottom', 'tokens.spacing.section'),
        ...themeBinding('wrapperStyle.padding.left', 'tokens.spacing.pageInline'),
        ...themeBinding('wrapperStyle.padding.right', 'tokens.spacing.pageInline'),
      }
    : {};
  const ws = {
    contentAlign: { horizontal: 'center', vertical: 'top' },
    widthMode: 'fill',
    heightMode: 'hug',
    border: borderNone(),
    borderRadius: { mode: 'unified', radius: '0' },
    padding,
  };
  if (bg) ws.backgroundColor = bg;
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: ws,
    bindings,
    children: [],
  };
}

function coverImage(id, src, alt, height) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name: '配图' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'fixed',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      height,
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

function textBlock(id, name, content, opts = {}) {
  const {
    alignH = 'center',
    fontSize = themeRef('tokens.typography.body'),
    color = themeRef('colors.primary'),
    bold = false,
    decoration = 'none',
    fontSizePath = 'tokens.typography.body',
    colorPath = 'colors.primary',
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
      italic: false,
      decoration,
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings,
  };
}

function buttonBlock(id, name, label, opts = {}) {
  const { alignH = 'center', bg = COLORS.black, textColor = COLORS.white, radius = '0' } = opts;
  return {
    id,
    type: 'button',
    blockMeta: { blockType: 'action.button', name },
    props: {
      text: label,
      link: '',
      buttonStyle: {
        widthMode: 'hug',
        backgroundColor: bg,
        textColor,
        fontSize: themeRef('tokens.typography.body'),
        border: borderNone(),
        borderRadius: { mode: 'unified', radius },
        bold: true,
        italic: false,
      },
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings: themeBinding('props.buttonStyle.fontSize', 'tokens.typography.body'),
  };
}

function dividerBlock(id, color = '#D1D5DB') {
  return {
    id,
    type: 'divider',
    blockMeta: { blockType: 'separator.divider', name: '分隔线' },
    props: { color, height: '1px', lineWidthMode: 'fill' },
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      contentAlign: { horizontal: 'center', vertical: 'top' },
    },
  };
}

function starsText(id) {
  return textBlock(id, '评分', '★★★★★', {
    fontSize: themeRef('tokens.typography.caption'),
    fontSizePath: 'tokens.typography.caption',
    color: COLORS.star,
    bold: false,
  });
}

function productCard3(id, img, item) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '商品卡' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      coverImage(`${id}-img`, img, item.name, '180px'),
      textBlock(`${id}-name`, '标题', item.name, {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        bold: true,
      }),
      starsText(`${id}-stars`),
      textBlock(`${id}-price`, '价格', item.price, { bold: true }),
      textBlock(`${id}-link`, '链接', 'CHECK IT OUT', { bold: true, decoration: 'underline' }),
    ],
  };
}

function pickedRow(id, img, item) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '推荐行' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'center' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      backgroundColor: COLORS.rowYellow,
      padding: { mode: 'unified', unified: '16px' },
    },
    children: [
      {
        id: `${id}-img-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '布局' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          heightMode: 'hug',
          width: '140px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [coverImage(`${id}-img`, img, item.name, '140px')],
      },
      {
        id: `${id}-copy`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '布局' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '6px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${id}-name`, '标题', item.name, {
            fontSize: themeRef('tokens.typography.caption'),
            fontSizePath: 'tokens.typography.caption',
            bold: true,
          }),
          starsText(`${id}-stars`),
          textBlock(`${id}-price`, '价格', item.price, { bold: true }),
          textBlock(`${id}-link`, '链接', 'CHECK IT OUT', { bold: true, decoration: 'underline' }),
        ],
      },
    ],
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '品牌头部', { padTop: '20px' });
  sec.children.push(
    textBlock(`${P}-s1-logo`, '标题', 'FOREVER 21', {
      fontSize: themeRef('tokens.typography.display'),
      fontSizePath: 'tokens.typography.display',
      color: COLORS.yellow,
      bold: true,
    }),
    textBlock(
      `${P}-s1-nav`,
      '导航',
      'NEW ARRIVALS  ·  WOMEN  ·  PLUS  ·  MEN  ·  GIRLS  ·  BEAUTY  ·  SALE  ·  SPECIAL OFFERS',
      {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: themeRef('colors.primary'),
      },
    ),
  );
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '首屏促销', { pageInline: false, padBottom: '0' });
  const hero = sectionShell(`${P}-s2-hero`, '首屏蓝底区', {
    pageInline: false,
    bg: COLORS.heroBlue,
    padTop: '24px',
    padBottom: '0',
  });
  hero.wrapperStyle.padding = {
    mode: 'separate',
    top: '24px',
    right: '24px',
    bottom: '0',
    left: '24px',
  };
  hero.bindings = {};
  hero.children.push({
    id: `${P}-s2-inner`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: themeRef('tokens.spacing.gap') },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings: themeBinding('props.gap', 'tokens.spacing.gap'),
    children: [
      textBlock(`${P}-s2-kicker`, '说明', 'COME ON BACK FOR SOMETHING SHINY AND NEW', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        bold: true,
      }),
      textBlock(`${P}-s2-h1`, '标题', 'The hottest new arrivals are right here', {
        fontSize: themeRef('tokens.typography.h1'),
        fontSizePath: 'tokens.typography.h1',
        bold: true,
      }),
      textBlock(`${P}-s2-sub`, '正文', 'The stuff in your closet wants new friends', {}),
      buttonBlock(`${P}-s2-cta`, '按钮', "GET 'EM NOW"),
      coverImage(
        `${P}-s2-img`,
        PEXELS.hero,
        'Model holding yellow shopping bag with white sneakers',
        '220px',
      ),
    ],
  });
  sec.children.push(hero);
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '再看一眼', { padTop: '24px' });
  sec.children.push(
    textBlock(`${P}-s3-title`, '标题', 'WANNA LOOK AGAIN?', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      bold: true,
    }),
    {
      id: `${P}-s3-grid`,
      type: 'grid',
      blockMeta: { blockType: 'layout.grid', name: '栅格' },
      props: { columns: 3, gap: '12px', cellWidthMode: 'auto', cellHeightMode: 'content-max' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        padding: { mode: 'unified', unified: '0' },
      },
      children: GRID3.map((item, i) => productCard3(`${P}-s3-c${i}`, PEXELS.grid3[i], item)),
    },
  );
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '为你精选', { padTop: '24px' });
  const rows = {
    id: `${P}-s4-rows`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: PICKED.map((item, i) => pickedRow(`${P}-s4-r${i}`, PEXELS.picked[i], item)),
  };
  sec.children.push(
    textBlock(`${P}-s4-title`, '标题', 'PICKED JUST FOR YOU', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      bold: true,
    }),
    rows,
  );
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '分类导航', { padTop: '24px' });
  const children = [];
  for (let i = 0; i < CATEGORIES.length; i++) {
    if (i > 0) children.push(dividerBlock(`${P}-s5-div-${i}`));
    children.push(
      textBlock(`${P}-s5-c${i}`, '链接', CATEGORIES[i], {
        fontSize: themeRef('tokens.typography.body'),
        bold: true,
        decoration: 'underline',
      }),
    );
  }
  sec.children.push({
    id: `${P}-s5-inner`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children,
  });
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '包邮横幅', {
    pageInline: false,
    bg: COLORS.black,
    padTop: '12px',
    padBottom: '12px',
  });
  sec.wrapperStyle.padding = {
    mode: 'separate',
    top: '12px',
    right: '16px',
    bottom: '12px',
    left: '16px',
  };
  sec.bindings = {};
  sec.children.push(
    textBlock(
      `${P}-s6-txt`,
      '说明',
      'FREE STANDARD SHIPPING $50+ | BUY NOW, PAY LATER WITH AFTERPAY',
      {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.white,
        bold: true,
      },
    ),
  );
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '社交媒体', { padTop: '20px', padBottom: '16px' });
  sec.children.push({
    id: `${P}-s7-row`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '20px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${P}-s7-ig`,
        type: 'icon',
        blockMeta: { blockType: 'content.icon', name: '图标' },
        props: { src: ICON.instagram, color: COLORS.black, size: '22px', link: '' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
      },
      {
        id: `${P}-s7-yt`,
        type: 'icon',
        blockMeta: { blockType: 'content.icon', name: '图标' },
        props: { src: ICON.youtube, color: COLORS.black, size: '22px', link: '' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
      },
      {
        id: `${P}-s7-fb`,
        type: 'icon',
        blockMeta: { blockType: 'content.icon', name: '图标' },
        props: { src: ICON.facebook, color: COLORS.black, size: '22px', link: '' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
      },
      {
        id: `${P}-s7-x`,
        type: 'icon',
        blockMeta: { blockType: 'content.icon', name: '图标' },
        props: { src: ICON.x, color: COLORS.black, size: '22px', link: '' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
      },
      {
        id: `${P}-s7-sc`,
        type: 'icon',
        blockMeta: { blockType: 'content.icon', name: '图标' },
        props: { src: ICON.snapchat, color: COLORS.black, size: '22px', link: '' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
      },
      {
        id: `${P}-s7-li`,
        type: 'icon',
        blockMeta: { blockType: 'content.icon', name: '图标' },
        props: { src: ICON.linkedin, color: COLORS.black, size: '22px', link: '' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
      },
    ],
  });
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, 'App 推广', {
    pageInline: false,
    bg: COLORS.appPurple,
    padTop: '16px',
    padBottom: '16px',
  });
  sec.wrapperStyle.padding = {
    mode: 'separate',
    top: '16px',
    right: '20px',
    bottom: '16px',
    left: '20px',
  };
  sec.bindings = {};
  sec.children.push(
    textBlock(
      `${P}-s8-txt`,
      '说明',
      'DOWNLOAD THE APP FOR 20% OFF YOUR FIRST $65+ IN-APP PURCHASE. USE CODE MVP20',
      {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        bold: true,
      },
    ),
    textBlock(`${P}-s8-badges`, '说明', 'App Store  ·  Google Play', {
      fontSize: themeRef('tokens.typography.caption'),
      fontSizePath: 'tokens.typography.caption',
      bold: true,
    }),
  );
  return sec;
}

function buildS9() {
  const sec = sectionShell(`${P}-s9`, '页脚信息', { padTop: '20px', padBottom: '24px' });
  sec.children.push({
    id: `${P}-s9-inner`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '10px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s9-logo`, '标题', 'FOREVER 21', {
        fontSize: themeRef('tokens.typography.h1'),
        fontSizePath: 'tokens.typography.h1',
        bold: true,
      }),
      textBlock(`${P}-s9-store`, '链接', 'STORE LOCATIONS & EVENTS', {
        bold: true,
        decoration: 'underline',
      }),
      textBlock(
        `${P}-s9-legal`,
        '正文',
        'Prices and promotions are subject to change. Offer valid for a limited time. See store or forever21.com for details. Exclusions may apply.',
        {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.grey,
        },
      ),
      textBlock(`${P}-s9-browser`, '链接', 'View this email in your browser', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.grey,
        decoration: 'underline',
      }),
      textBlock(`${P}-s9-unsub`, '链接', 'Unsubscribe', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.grey,
        decoration: 'underline',
      }),
      textBlock(
        `${P}-s9-addr`,
        '正文',
        'Forever 21, Inc. 3880 N Mission Road Los Angeles, CA 90031',
        {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.grey,
        },
      ),
    ],
  });
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: '模板46手工还原（Forever 21）',
      description: '后续 2 设计图手工还原；图源 Pexels、图标 jsDelivr。',
      tokens: {
        colors: { primary: '#000000', secondary: '#6B7280', surface: '#FFFFFF' },
        spacing: { section: '16px', gap: '12px', pageInline: '24px' },
        typography: { display: '32px', h1: '20px', body: '14px', caption: '11px' },
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
  locale: 'zh-CN',
  root: {
    id: `${P}-root`,
    type: 'emailRoot',
    blockMeta: { blockType: 'layout.container', name: '画布根' },
    props: {
      backgroundColor: COLORS.white,
      width: '600px',
      padding: { mode: 'unified', unified: '0' },
      border: borderNone(),
      gapMode: 'fixed',
      gap: '0',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [
      buildS1(),
      buildS2(),
      buildS3(),
      buildS4(),
      buildS5(),
      buildS6(),
      buildS7(),
      buildS8(),
      buildS9(),
    ],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);

try {
  copyFileSync(DESIGN_SRC, DESIGN_DST);
} catch {
  console.warn('设计图未复制到 public/test-assets（源路径不可读则跳过）');
}

console.log(`Wrote ${OUT}`);
