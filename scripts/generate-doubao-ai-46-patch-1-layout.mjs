#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 46 底稿 patch 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/f92c5f38-a653-4860-a61b-1f1d5f664d7e/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/f92c5f38-a653-4860-a61b-1f1d5f664d7e/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/6567284/pexels-photo-6567284.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "product-ribbed-turtleneck-sweater": "https://images.pexels.com/photos/5493799/pexels-photo-5493799.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-embroidered-cat-pullover": "https://images.pexels.com/photos/6774862/pexels-photo-6774862.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-fleece-drop-sleeve-hoodie": "https://images.pexels.com/photos/5839965/pexels-photo-5839965.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-fleece-cargo-joggers": "https://images.pexels.com/photos/26274786/pexels-photo-26274786.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-pleated-twist-front-cami": "https://images.pexels.com/photos/16527704/pexels-photo-16527704.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-camo-print-jacket": "https://images.pexels.com/photos/16185661/pexels-photo-16185661.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
  "social-youtube": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/youtube.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "social-twitter": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/x.svg",
  "social-snapchat": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/google.svg",
  "social-fti": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/google.svg",
};
/* @mjs-slot:COLORS */
const COLORS = {
  primary: '#000000',
  secondary: '#000000',
  surface: '#FFFFFF',
  heroBg: '#D7E9F9',
  cardBg: '#FFF9E3',
  textLight: '#666666',
  white: '#FFFFFF',
  black: '#000000',
  star: '#FFD700',
  appBanner: '#C9A8E1',
  footerBar: '#000000'
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
  const sec = sectionShell(`${P}-s1`, '首屏', { bg: COLORS.heroBg, padTop: '24px', padBottom: '24px' });
  sec.children = [
    textBlock(`${P}-s1-pretitle`, '小标题', 'COME ON BACK FOR SOMETHING SHINY AND NEW', { fontSize: '12px', bold: true }),
    textBlock(`${P}-s1-title`, '主标题', 'The hottest new arrivals are right here', { fontSize: '24px', bold: true }),
    textBlock(`${P}-s1-subtitle`, '副标题', 'The stuff in your closet wants new friends', { fontSize: '14px' }),
    buttonBlock(`${P}-s1-cta`, '行动按钮', 'GET \'EM NOW', { bg: COLORS.black, textColor: COLORS.white, fontSize: '14px', bold: true, radius: '0' }),
    coverImage(`${P}-s1-hero`, '首屏图', PEXELS.hero, 'woman holding forever 21 bag', '360px')
  ];
  return sec;
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  const sec = sectionShell(`${P}-s2`, '新品三列', { bg: COLORS.surface, padTop: '32px', padBottom: '32px' });
  
  const product1 = {
    id: `${P}-s2-p1`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '罗纹高领毛衣' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '180px',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${P}-s2-p1-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '罗纹高领毛衣图' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'fixed',
          height: '240px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: PEXELS['product-ribbed-turtleneck-sweater'],
            alt: 'RIBBED TURTLENECK SWEATER',
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      },
      textBlock(`${P}-s2-p1-name`, '产品名', 'RIBBED TURTLENECK SWEATER', { fontSize: '12px', bold: true }),
      textBlock(`${P}-s2-p1-rating`, '评分', '★★★★☆', { color: COLORS.star, fontSize: '14px' }),
      textBlock(`${P}-s2-p1-price`, '价格', '$ 18.00', { fontSize: '14px' }),
      buttonBlock(`${P}-s2-p1-cta`, '查看按钮', 'CHECK IT OUT', { bg: COLORS.white, textColor: COLORS.black, fontSize: '12px', bold: true, radius: '0', stroke: { width: '1px', color: COLORS.black } })
    ]
  };

  const product2 = {
    id: `${P}-s2-p2`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '刺绣猫套头衫' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '180px',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${P}-s2-p2-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '刺绣猫套头衫图' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'fixed',
          height: '240px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: PEXELS['product-embroidered-cat-pullover'],
            alt: 'EMBROIDERED CAT PULLOVER',
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      },
      textBlock(`${P}-s2-p2-name`, '产品名', 'EMBROIDERED CAT PULLOVER', { fontSize: '12px', bold: true }),
      textBlock(`${P}-s2-p2-rating`, '评分', '★★★★★', { color: COLORS.star, fontSize: '14px' }),
      textBlock(`${P}-s2-p2-price`, '价格', '$ 19.99', { fontSize: '14px' }),
      buttonBlock(`${P}-s2-p2-cta`, '查看按钮', 'CHECK IT OUT', { bg: COLORS.white, textColor: COLORS.black, fontSize: '12px', bold: true, radius: '0', stroke: { width: '1px', color: COLORS.black } })
    ]
  };

  const product3 = {
    id: `${P}-s2-p3`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '抓绒落肩连帽衫' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '180px',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${P}-s2-p3-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '抓绒落肩连帽衫图' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'fixed',
          height: '240px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: PEXELS['product-fleece-drop-sleeve-hoodie'],
            alt: 'FLEECE DROP-SLEEVE HOODIE',
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      },
      textBlock(`${P}-s2-p3-name`, '产品名', 'FLEECE DROP-SLEEVE HOODIE', { fontSize: '12px', bold: true }),
      textBlock(`${P}-s2-p3-rating`, '评分', '★★★★★', { color: COLORS.star, fontSize: '14px' }),
      textBlock(`${P}-s2-p3-price`, '价格', '$ 14.00', { fontSize: '14px' }),
      buttonBlock(`${P}-s2-p3-cta`, '查看按钮', 'CHECK IT OUT', { bg: COLORS.white, textColor: COLORS.black, fontSize: '12px', bold: true, radius: '0', stroke: { width: '1px', color: COLORS.black } })
    ]
  };

  sec.children = [
    textBlock(`${P}-s2-title`, '标题', 'WANNA LOOK AGAIN?', { fontSize: '14px', bold: true }),
    gridBlock(`${P}-s2-grid`, '产品网格', 3, [product1, product2, product3], { gap: '16px', alignH: 'center' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  const sec = sectionShell(`${P}-s3`, '个性推荐', { bg: COLORS.surface, padTop: '24px', padBottom: '24px' });

  const rec1 = {
    id: `${P}-s3-r1`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '抓绒工装慢跑裤' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${P}-s3-r1-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '抓绒工装慢跑裤图' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '280px',
          heightMode: 'fixed',
          height: '320px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: PEXELS['product-fleece-cargo-joggers'],
            alt: 'FLEECE CARGO JOGGERS',
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      },
      {
        id: `${P}-s3-r1-info`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '产品信息' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'fixed',
          height: '320px',
          backgroundColor: COLORS.cardBg,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-r1-name`, '产品名', 'FLEECE CARGO JOGGERS', { fontSize: '14px', bold: true }),
          textBlock(`${P}-s3-r1-rating`, '评分', '★★★★☆', { color: COLORS.star, fontSize: '16px' }),
          textBlock(`${P}-s3-r1-price`, '价格', '$ 18.00', { fontSize: '14px' }),
          buttonBlock(`${P}-s3-r1-cta`, '查看按钮', 'CHECK IT OUT', { bg: COLORS.cardBg, textColor: COLORS.black, fontSize: '12px', bold: true, radius: '0', stroke: { width: '1px', color: COLORS.black } })
        ]
      }
    ]
  };

  const rec2 = {
    id: `${P}-s3-r2`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '褶皱扭纹短款吊带' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${P}-s3-r2-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '褶皱扭纹短款吊带我' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '280px',
          heightMode: 'fixed',
          height: '320px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: PEXELS['product-pleated-twist-front-cami'],
            alt: 'PLEATED TWIST-FRONT CROPPED CAMI',
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      },
      {
        id: `${P}-s3-r2-info`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '产品信息' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'fixed',
          height: '320px',
          backgroundColor: COLORS.cardBg,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-r2-name`, '产品名', 'PLEATED TWIST-FRONT CROPPED CAMI', { fontSize: '14px', bold: true }),
          textBlock(`${P}-s3-r2-price`, '价格', '$ 14.00', { fontSize: '14px' }),
          buttonBlock(`${P}-s3-r2-cta`, '查看按钮', 'CHECK IT OUT', { bg: COLORS.cardBg, textColor: COLORS.black, fontSize: '12px', bold: true, radius: '0', stroke: { width: '1px', color: COLORS.black } })
        ]
      }
    ]
  };

  const rec3 = {
    id: `${P}-s3-r3`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '磨边迷彩印花短夹克' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${P}-s3-r3-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '磨边迷彩印花短夹克图' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '280px',
          heightMode: 'fixed',
          height: '320px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: PEXELS['product-camo-print-jacket'],
            alt: 'FRAYED CAMO PRINT JACKET',
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      },
      {
        id: `${P}-s3-r3-info`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '产品信息' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'fixed',
          height: '320px',
          backgroundColor: COLORS.cardBg,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s3-r3-name`, '产品名', 'FRAYED CAMO PRINT JACKET', { fontSize: '14px', bold: true }),
          textBlock(`${P}-s3-r3-rating`, '评分', '★★★★★', { color: COLORS.star, fontSize: '16px' }),
          textBlock(`${P}-s3-r3-price`, '价格', '$ 34.99', { fontSize: '14px' }),
          buttonBlock(`${P}-s3-r3-cta`, '查看按钮', 'CHECK IT OUT', { bg: COLORS.cardBg, textColor: COLORS.black, fontSize: '12px', bold: true, radius: '0', stroke: { width: '1px', color: COLORS.black } })
        ]
      }
    ]
  };

  sec.children = [
    textBlock(`${P}-s3-title`, '标题', 'PICKED JUST FOR YOU', { fontSize: '14px', bold: true, marginBottom: '16px' }),
    rec1,
    rec2,
    rec3
  ];
  return sec;
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const sec = sectionShell(`${P}-s4`, '分类导航', { bg: COLORS.surface, padTop: '32px', padBottom: '32px' });
  const categories = [
    'SHOP WOMEN',
    'SHOP MEN',
    'SHOP PLUS + CURVE',
    'SHOP GIRLS',
    'SHOP ACCESSORIES',
    'SHOP BEAUTY'
  ];
  sec.children = categories.map((cat, idx) => 
    buttonBlock(`${P}-s4-cat-${idx}`, `${cat}按钮`, cat, { bg: COLORS.white, textColor: COLORS.black, fontSize: '14px', bold: true, radius: '0', widthMode: 'fill' })
  );
  return sec;
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  const sec = sectionShell(`${P}-s5`, '服务栏', { bg: COLORS.footerBar, padTop: '12px', padBottom: '12px', pageInline: false });
  sec.children = [
    textBlock(`${P}-s5-text`, '服务文字', 'FREE STANDARD SHIPPING (50+) | BUY NOW, PAY LATER WITH AFTERPAY', { color: COLORS.white, fontSize: '12px', bold: true })
  ];
  return sec;
}
/* @mjs-slot-end:buildS5 */

/* @mjs-slot:buildS6 */
function buildS6() {
  const sec = sectionShell(`${P}-s6`, '社交链接', { bg: COLORS.surface, padTop: '24px', padBottom: '24px' });
  sec.children = [
    rowLayout(`${P}-s6-social`, '社交图标', [
      iconBlock(`${P}-s6-ig`, 'Instagram', ICON.socialInstagram),
      iconBlock(`${P}-s6-yt`, 'Youtube', ICON.socialYoutube),
      iconBlock(`${P}-s6-fb`, 'Facebook', ICON.socialFacebook),
      iconBlock(`${P}-s6-tw`, 'Twitter', ICON.socialTwitter),
      iconBlock(`${P}-s6-sc`, 'Snapchat', ICON.socialSnapchat),
      iconBlock(`${P}-s6-fti`, 'Forever21', ICON.socialFti)
    ], { gap: '24px' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS6 */

/* @mjs-slot:buildS7 */
function buildS7() {
  const sec = sectionShell(`${P}-s7`, 'APP推广', { bg: COLORS.appBanner, padTop: '16px', padBottom: '16px' });
  sec.children = [
    textBlock(`${P}-s7-text`, '推广文案', 'DOWNLOAD THE APP FOR 20% OFF YOUR FIRST\n$65+ IN-APP PURCHASE, USE CODE MVP20', { fontSize: '12px', bold: true, alignH: 'left' }),
    rowLayout(`${P}-s7-badges`, '应用商店徽章', [
      {
        id: `${P}-s7-as`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: 'App Store' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '120px',
          heightMode: 'fixed',
          height: '40px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/appstore.svg',
            alt: 'App Store',
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      },
      {
        id: `${P}-s7-gp`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: 'Google Play' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '120px',
          heightMode: 'fixed',
          height: '40px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/googleplay.svg',
            alt: 'Google Play',
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      }
    ], { alignH: 'center', gap: '16px' })
  ];
  return sec;
}
/* @mjs-slot-end:buildS7 */

/* @mjs-slot:buildS8 */
function buildS8() {
  const sec = sectionShell(`${P}-s8`, '页脚', { bg: COLORS.surface, padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s8-logo`, '品牌名', 'FOREVER 21', { fontSize: '24px', bold: true }),
    textBlock(`${P}-s8-loc-title`, '门店标题', 'STORE LOCATIONS & EVENTS', { fontSize: '12px', bold: true }),
    textBlock(`${P}-s8-terms`, '条款文字', `*20% Off Your First In-App Purchase of $65 or More: Offer valid through 12/31/2020 11:59 pm PST.
Receive 20% off your first in-app purchase when you spend $65 or more in one single transaction before
taxes. To redeem in-app on the Forever 21 app, enter code MVP20 at checkout. Cannot be combined with
any other offer (excluding shipping promotions). Excludes Riley Rose products, Barbie Collection, Lotería x
F21 Collection, Forever Together Collection, Forever 21 Forever Proud Collection for The Trevor Project,
F21 x Princess Nokia, 7-Eleven Collection, Forever 21 x Project Level, Non-Medical Grade Face Masks, gift
cards, and e-gift cards. Does not apply to taxes, shipping or handling charges. Forever 21 reserves the
right to modify or cancel this promotion at any time without notice.

LIMITED TIME ONLY DEALS: Valid 10/10/20-10/12/20. Online/in-app on the Limited Time Only Deals page
only. Cannot be combined with any other offer (excluding shipping promotions). Customer must convert
the USD price points into their own local currency. Price point does not include taxes, shipping or handling
charges. In-store and online/in-app prices may vary. Applies to new purchases only. Forever 21 reserves
the right to modify or cancel this promotion at any time without notice (or if required under applicable
local law, upon notice).

View this email in your browser

This email may be considered an advertising or promotional message.
If you no longer wish to receive these emails, unsubscribe using the link below.

Please do not reply to this email. Replies to this address cannot be serviced.
To ensure delivery, add Forever21@i.forever21.com to your address book.

You received this message because you've registered or accepted our invitation
to receive emails from Forever 21, or you've made a purchase from Forever21.com.

Unsubscribe

Forever 21, Inc. 3880 N Mission Road Los Angeles, CA 90031`, { fontSize: '10px', color: COLORS.textLight })
  ];
  return sec;
}
/* @mjs-slot-end:buildS8 */

/* @mjs-slot:tokenPresets */
const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: displayName,
      description: 'Forever 21 新品推广邮件模板，含首屏广告、新品推荐、个性推荐、分类导航、社交链接、APP推广及页脚条款',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '36px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '0', cta: '0' },
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
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7(), buildS8()],
  },
};
/* @mjs-slot-end:template */

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

