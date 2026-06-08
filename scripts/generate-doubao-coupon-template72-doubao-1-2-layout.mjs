#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "中等复杂测试 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/b9850b29-feab-4874-9922-8a3f89067cc9/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/b9850b29-feab-4874-9922-8a3f89067cc9/layout-out";

const PEXELS = {
  "restaurantBulgogi": "https://images.pexels.com/photos/7491952/pexels-photo-7491952.jpeg?auto=compress&cs=tinysrgb&h=130",
  "restaurantIceCream": "https://images.pexels.com/photos/22809638/pexels-photo-22809638.jpeg?auto=compress&cs=tinysrgb&h=130",
  "restaurantLatinFood": "https://images.pexels.com/photos/27244303/pexels-photo-27244303.jpeg?auto=compress&cs=tinysrgb&h=130",
  "restaurantIndianGrill": "https://images.pexels.com/photos/35539324/pexels-photo-35539324.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "appStoreBadge": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/apple.svg",
  "starFilled": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/star.svg",
  "starHalf": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/star-half.svg",
};
const COLORS = {
  primary: '#222222',
  secondary: '#666666',
  surface: '#ffffff',
  accent: '#d32323',
  light: '#f0f0f0',
  white: '#ffffff',
  black: '#000000'
};

const RESTAURANTS = [
  {
    id: 'bulgogi',
    name: 'Bulgogi',
    image: PEXELS.restaurantBulgogi,
    alt: 'korean bibimbap with fried egg on hot stone plate',
    rating: 4.5,
    reviews: 69,
    price: '$$',
    category: 'Korean',
    location: 'Greenville, SC'
  },
  {
    id: 'icecream',
    name: 'Molly and Myles Ice Cream',
    image: PEXELS.restaurantIceCream,
    alt: 'person holding large ice cream cone in casual dessert shop',
    rating: 5,
    reviews: 46,
    price: '$$',
    category: 'Ice Cream & Frozen Yogurt',
    location: 'Greenville, SC'
  },
  {
    id: 'latin',
    name: 'Sabor Latin Street Grill - Greenville',
    image: PEXELS.restaurantLatinFood,
    alt: 'loaded nachos with ground beef lettuce sour cream',
    rating: 4.5,
    reviews: 35,
    price: '',
    category: 'Latin American',
    location: 'Greenville, SC'
  },
  {
    id: 'indian',
    name: 'Persis Indian Grill',
    image: PEXELS.restaurantIndianGrill,
    alt: 'indian thali platter with multiple curries rice and papadum',
    rating: 4.5,
    reviews: 122,
    price: '$$',
    category: 'Indian, Buffets',
    location: 'Greenville, SC'
  }
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

function iconBlock(id, name, src, opts = {}) {
  const { size = '16px', color = COLORS.accent } = opts;
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

function coverImage(id, name, src, alt, height = '220px') {
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

function ratingStars(id, rating) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 !== 0;
  for (let i = 0; i < fullStars; i++) {
    stars.push(iconBlock(`${id}-star-${i}`, '满星', ICON.starFilled));
  }
  if (hasHalf) {
    stars.push(iconBlock(`${id}-star-half`, '半星', ICON.starHalf));
  }
  const emptyCount = 5 - stars.length;
  for (let i = 0; i < emptyCount; i++) {
    stars.push(iconBlock(`${id}-star-empty-${i}`, '空星', ICON.starFilled, { color: COLORS.light }));
  }
  return rowLayout(`${id}-stars`, '评分星星', stars, { gap: '2px', alignH: 'left' });
}

function restaurantCard(id, restaurant) {
  const card = sectionShell(`${P}-${id}`, restaurant.name, { pageInline: false, padTop: '0', padBottom: '24px' });
  card.children = [
    coverImage(`${P}-${id}-img`, `${restaurant.name}菜品`, restaurant.image, restaurant.alt),
    textBlock(`${P}-${id}-name`, '餐厅名称', restaurant.name, { bold: true, fontSize: '18px' }),
    rowLayout(`${P}-${id}-rating-row`, '评分行', [
      ratingStars(`${P}-${id}-rating`, restaurant.rating),
      textBlock(`${P}-${id}-reviews`, '评论数', `${restaurant.reviews} reviews`, { fontSize: '14px', color: COLORS.secondary, widthMode: 'hug' })
    ], { alignH: 'left', gap: '8px' }),
    textBlock(`${P}-${id}-meta`, '餐厅信息', `${restaurant.price ? restaurant.price + ' • ' : ''}${restaurant.category}`, { fontSize: '14px', color: COLORS.secondary }),
    textBlock(`${P}-${id}-location`, '餐厅位置', restaurant.location, { fontSize: '14px', color: COLORS.secondary }),
  ];
  return card;
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '头部区域', { padTop: '32px', padBottom: '24px' });
  sec.children = [
    iconBlock(`${P}-s1-logo`, 'Yelp标志', ICON.yelpLogo, { size: '48px', color: COLORS.accent }),
    textBlock(`${P}-s1-title`, '主标题', 'Places everyone’s ordering from right now', { fontSize: '36px', bold: true }),
    textBlock(`${P}-s1-desc`, '描述文案', 'As if by magic, this email will attempt to read your mind... Here are some trending delivery and takeout spots that we also think you’ll love. Don\'t forget, you can always check business pages for their latest health & safety updates, like curbside pickup and mask requirements.', { color: COLORS.secondary, lineHeight: '24px' })
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '餐厅列表区域', { padTop: '0' });
  sec.props.gap = '24px';
  const row1 = rowLayout(`${P}-s2-row1`, '第一行餐厅', [
    restaurantCard('restaurant1', RESTAURANTS[0]),
    restaurantCard('restaurant2', RESTAURANTS[1])
  ], { alignH: 'left', gap: '20px' });
  const row2 = rowLayout(`${P}-s2-row2`, '第二行餐厅', [
    restaurantCard('restaurant3', RESTAURANTS[2]),
    restaurantCard('restaurant4', RESTAURANTS[3])
  ], { alignH: 'left', gap: '20px' });
  sec.children = [row1, row2];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '下载应用区域', {
    padTop: '32px',
    padBottom: '32px',
    stroke: { width: '1px', color: COLORS.light }
  });
  sec.children = [
    textBlock(`${P}-s3-title`, '下载区域标题', 'Bring Yelp with you', { fontSize: '24px', bold: true }),
    textBlock(`${P}-s3-subtitle`, '下载区域副标题', 'The fastest way to search for businesses near you.', { color: COLORS.secondary }),
    rowLayout(`${P}-s3-badges`, '应用下载徽章', [
      {
        id: `${P}-s3-appstore`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: 'App Store下载徽章' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '160px',
          heightMode: 'fixed',
          height: '48px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '8px' },
          backgroundColor: COLORS.black,
          backgroundImage: {
            src: '#',
            alt: '',
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
        children: [
          rowLayout(`${P}-s3-appstore-content`, 'App Store内容', [
            iconBlock(`${P}-s3-appstore-icon`, 'App Store图标', ICON.appStoreBadge, { size: '28px', color: COLORS.white }),
            textBlock(`${P}-s3-appstore-text`, 'App Store文字', 'Download on the App Store', { color: COLORS.white, fontSize: '12px', widthMode: 'hug' })
          ], { gap: '8px', alignV: 'center' })
        ]
      },
      {
        id: `${P}-s3-googleplay`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: 'Google Play下载徽章' },
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
          widthMode: 'fixed',
          width: '160px',
          heightMode: 'fixed',
          height: '48px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '8px' },
          backgroundColor: COLORS.black,
        },
        children: [
          rowLayout(`${P}-s3-googleplay-content`, 'Google Play内容', [
            iconBlock(`${P}-s3-googleplay-icon`, 'Google Play图标', ICON.googlePlayBadge, { size: '28px', color: COLORS.white }),
            textBlock(`${P}-s3-googleplay-text`, 'Google Play文字', 'GET IT ON Google Play', { color: COLORS.white, fontSize: '12px', widthMode: 'hug' })
          ], { gap: '8px', alignV: 'center' })
        ]
      }
    ], { alignH: 'left', gap: '16px' })
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '页脚区域', { padTop: '24px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s4-links`, '页脚链接', 'Update preferences | Unsubscribe', { fontSize: '14px', color: COLORS.secondary, alignH: 'center' }),
    textBlock(`${P}-s4-copyright`, '版权信息', 'Copyright © 2020 Yelp Inc., 140 New Montgomery, San Francisco, CA 94105, U.S.A.', { fontSize: '12px', color: COLORS.secondary, alignH: 'center' })
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Yelp热门餐厅推荐',
      description: 'Yelp本地热门外卖和堂食餐厅推荐邮件模板',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '36px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '8px', cta: '8px' },
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
    children: [buildS1(), buildS2(), buildS3(), buildS4()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

