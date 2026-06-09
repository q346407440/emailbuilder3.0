#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 16 整段生成 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/cff08968-3843-43ad-aacf-9736c1070370/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/cff08968-3843-43ad-aacf-9736c1070370/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/5482774/pexels-photo-5482774.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "guide-ebook": "https://images.pexels.com/photos/5163801/pexels-photo-5163801.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-joint-support": "https://images.pexels.com/photos/17820730/pexels-photo-17820730.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc1": "https://images.pexels.com/photos/7053469/pexels-photo-7053469.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc2": "https://images.pexels.com/photos/34664698/pexels-photo-34664698.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc3": "https://images.pexels.com/photos/36952295/pexels-photo-36952295.jpeg?auto=compress&cs=tinysrgb&h=130",
  "vet1": "https://images.pexels.com/photos/6234980/pexels-photo-6234980.jpeg?auto=compress&cs=tinysrgb&h=130",
  "vet2": "https://images.pexels.com/photos/31043312/pexels-photo-31043312.jpeg?auto=compress&cs=tinysrgb&h=130",
  "dog-playing": "https://images.pexels.com/photos/32383212/pexels-photo-32383212.jpeg?auto=compress&cs=tinysrgb&h=350",
  "guarantee-badge": "https://images.pexels.com/photos/29082285/pexels-photo-29082285.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "icon-guarantee": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/calendar-check.svg",
  "icon-subscribe": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/coins.svg",
  "icon-customers": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/paw.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "social-instagram": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
};
/* @mjs-slot:COLORS */
const COLORS = {
  primary: '#1A3D37',
  secondary: '#24594F',
  surface: '#F7EEE2',
  cardBg: '#FFFFFF',
  textLight: '#555555',
  white: '#FFFFFF',
  accent: '#9AE564',
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
  const sec = sectionShell(`${P}-s1`, '首屏模块', { bg: COLORS.surface, padTop: '0' });
  sec.children = [
    coverImage(`${P}-s1-hero`, '首屏主图', PEXELS.hero, 'woman high fiving dalmatian dog at home', '380px'),
    textBlock(`${P}-s1-title`, '首屏标题', "Don't forget to checkout so you can start improving your pup's health and mobility in as little as 3 weeks!*", { fontSize: '22px', bold: true }),
    rowLayout(`${P}-s1-guide-row`, '健康指南行', [
      {
        id: `${P}-s1-guide-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '健康指南封面' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '80px',
          heightMode: 'fixed',
          height: '100px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '4px' },
          backgroundImage: {
            src: PEXELS['guide-ebook'],
            alt: 'pet joint health guide ebook cover',
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '4px' },
          },
        },
      },
      textBlock(`${P}-s1-guide-text`, '健康指南文字', 'Joint Health Guide', { fontSize: '18px', bold: true, decoration: 'underline', alignH: 'left' }),
    ], { alignH: 'left', gap: '24px' }),
    rowLayout(`${P}-s1-product-row`, '产品行', [
      {
        id: `${P}-s1-product-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '关节支持产品图' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '100px',
          heightMode: 'fixed',
          height: '100px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '4px' },
          backgroundImage: {
            src: PEXELS['product-joint-support'],
            alt: 'green dog hip and joint supplement jar product',
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '4px' },
          },
        },
      },
      textBlock(`${P}-s1-product-text`, '产品文字', 'Advanced Hip & Joint Support for Large Breeds', { fontSize: '18px', bold: true, decoration: 'underline', alignH: 'left' }),
    ], { alignH: 'left', gap: '24px' }),
    buttonBlock(`${P}-s1-cta`, '结账按钮', 'CHECKOUT NOW', { bg: COLORS.primary, textColor: COLORS.white, widthMode: 'fixed', width: '300px', bold: true }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  const sec = sectionShell(`${P}-s2`, '用户评价模块', { bg: COLORS.surface });
  sec.children = [
    textBlock(`${P}-s2-title`, '模块标题', "You're checking out Wuffes because you want the best for your pup and you're in the right place!", { fontSize: '22px', bold: true }),
    textBlock(`${P}-s2-desc`, '统计说明', '99% of Wuffes joint chews customers saw improved mobility and decreased joint discomfort with 90 days of consistent use.*', { fontSize: '14px', color: COLORS.textLight }),
    gridBlock(`${P}-s2-ugc-grid`, '用户评价网格', 3, [
      {
        id: `${P}-s2-card1`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '用户评价卡片1' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          backgroundColor: COLORS.cardBg,
          widthMode: 'fill',
          heightMode: 'hug',
          border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.primary },
          borderRadius: { mode: 'unified', radius: '8px' },
        },
        children: [
          imageContainer(`${P}-s2-card1-img`, '用户图1', PEXELS.ugc1, 'white terrier dog with pet supplement bottle', '120px', [], 'center', 'top'),
          textBlock(`${P}-s2-card1-title`, '评价标题1', 'Our Georgina seems livelier than ever!', { fontSize: '14px', bold: true }),
          textBlock(`${P}-s2-card1-text`, '评价内容1', "This multivitamin works wonders, we've seen a huge improvement across energy levels, digestion (yep, no more runny poops) and overall happiness", { fontSize: '12px' }),
          textBlock(`${P}-s2-card1-stars`, '评分1', '⭐⭐⭐⭐⭐', { fontSize: '12px' }),
          textBlock(`${P}-s2-card1-author`, '作者1', 'Tanesha', { fontSize: '12px', bold: true }),
        ],
      },
      {
        id: `${P}-s2-card2`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '用户评价卡片2' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          backgroundColor: COLORS.cardBg,
          widthMode: 'fill',
          heightMode: 'hug',
          border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.primary },
          borderRadius: { mode: 'unified', radius: '8px' },
        },
        children: [
          imageContainer(`${P}-s2-card2-img`, '用户图2', PEXELS.ugc2, 'golden retriever dog playing in water with pet supplement products', '120px', [], 'center', 'top'),
          textBlock(`${P}-s2-card2-title`, '评价标题2', 'We started giving our Jason this multivitamin, AND the oil', { fontSize: '14px', bold: true }),
          textBlock(`${P}-s2-card2-text`, '评价内容2', "the Wuffes joint chews moves around with newfound ease. I was so happy when I started to notice an improvement, I could've cried. Thanks so much Wuffes, you made one happy dog momma.", { fontSize: '12px' }),
          textBlock(`${P}-s2-card2-stars`, '评分2', '⭐⭐⭐⭐⭐', { fontSize: '12px' }),
          textBlock(`${P}-s2-card2-author`, '作者2', 'Levi', { fontSize: '12px', bold: true }),
        ],
      },
      {
        id: `${P}-s2-card3`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '用户评价卡片3' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          backgroundColor: COLORS.cardBg,
          widthMode: 'fill',
          heightMode: 'hug',
          border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.primary },
          borderRadius: { mode: 'unified', radius: '8px' },
        },
        children: [
          imageContainer(`${P}-s2-card3-img`, '用户图3', PEXELS.ugc3, 'german shepherd mix dog with pet supplement bottle', '120px', [], 'center', 'top'),
          textBlock(`${P}-s2-card3-title`, '评价标题3', 'Say goodbye to dry skin and dull fur!', { fontSize: '14px', bold: true }),
          textBlock(`${P}-s2-card3-text`, '评价内容3', "We started giving Lucie this multivitamin about a couple of weeks ago and noticed less itching and way shinier fur even at 11 years old!", { fontSize: '12px' }),
          textBlock(`${P}-s2-card3-stars`, '评分3', '⭐⭐⭐⭐⭐', { fontSize: '12px' }),
          textBlock(`${P}-s2-card3-author`, '作者3', 'Mike', { fontSize: '12px', bold: true }),
        ],
      },
    ], { gap: '12px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  const sec = sectionShell(`${P}-s3`, '兽医推荐模块', { bg: COLORS.surface });
  sec.children = [
    textBlock(`${P}-s3-title`, '模块标题', 'Recommended by Vets', { fontSize: '22px', bold: true, color: COLORS.primary }),
    textBlock(`${P}-s3-desc1`, '说明1', 'Veterinarians across the nation are raving about the results they\'ve seen when recommending Wuffes products to their patients.', { fontSize: '14px', color: COLORS.textLight }),
    textBlock(`${P}-s3-desc2`, '说明2', 'Just imagine the results your pup could see to improve their quality of life.', { fontSize: '14px', color: COLORS.textLight }),
    {
      id: `${P}-s3-vet1-card`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '兽医推荐卡片1' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        backgroundColor: COLORS.secondary,
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '8px' },
      },
      children: [
        {
          id: `${P}-s3-vet1-img-wrap`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '兽医图1容器' },
          wrapperStyle: {
            widthMode: 'fixed',
            width: '180px',
            heightMode: 'hug',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            coverImage(`${P}-s3-vet1-img`, '兽医图1', PEXELS.vet1, 'female veterinarian in white coat on farm', '220px'),
          ],
        },
        {
          id: `${P}-s3-vet1-content`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '兽医1内容' },
          props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
          wrapperStyle: {
            widthMode: 'fill',
            heightMode: 'hug',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            textBlock(`${P}-s3-vet1-quote`, '引言', '"', { fontSize: '32px', bold: true, color: COLORS.accent, alignH: 'left' }),
            textBlock(`${P}-s3-vet1-text`, '推荐内容', "I 100% approve of the ingredients and the quality, and I haven't found one that I like any more than this. If you have a big dog, the other huge plus is that you only have to give one chew a day. Super convenient, you can trust this product. I highly recommend!", { fontSize: '14px', color: COLORS.white, alignH: 'left' }),
            textBlock(`${P}-s3-vet1-stars`, '评分', '⭐⭐⭐⭐⭐', { fontSize: '14px', alignH: 'left' }),
            textBlock(`${P}-s3-vet1-author`, '作者', 'Dr. Carin Beene\nDVM', { fontSize: '14px', bold: true, color: COLORS.white, alignH: 'left' }),
          ],
        },
      ],
    },
    {
      id: `${P}-s3-vet2-card`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '兽医推荐卡片2' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        backgroundColor: COLORS.secondary,
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '8px' },
      },
      children: [
        {
          id: `${P}-s3-vet2-img-wrap`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '兽医图2容器' },
          wrapperStyle: {
            widthMode: 'fixed',
            width: '180px',
            heightMode: 'hug',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            coverImage(`${P}-s3-vet2-img`, '兽医图2', PEXELS.vet2, 'female veterinarian in black scrubs smiling', '220px'),
          ],
        },
        {
          id: `${P}-s3-vet2-content`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '兽医2内容' },
          props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
          wrapperStyle: {
            widthMode: 'fill',
            heightMode: 'hug',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            textBlock(`${P}-s3-vet2-quote`, '引言', '"', { fontSize: '32px', bold: true, color: COLORS.accent, alignH: 'left' }),
            textBlock(`${P}-s3-vet2-text`, '推荐内容', "I've had incredible results with my patients and with my own pet. There are higher concentrations of ingredients that I recommend such as MSM and glucosamine.", { fontSize: '14px', color: COLORS.white, alignH: 'left' }),
            textBlock(`${P}-s3-vet2-stars`, '评分', '⭐⭐⭐⭐⭐', { fontSize: '14px', alignH: 'left' }),
            textBlock(`${P}-s3-vet2-author`, '作者', 'Dr. Dawn Filos\nDVM', { fontSize: '14px', bold: true, color: COLORS.white, alignH: 'left' }),
          ],
        },
      ],
    },
  ];
  return sec;
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const sec = sectionShell(`${P}-s4`, '担保模块', { bg: COLORS.surface });
  sec.children = [
    imageContainer(`${P}-s4-dog-img`, '狗狗玩耍图', PEXELS['dog-playing'], 'border collie dog catching frisbee on grass lawn', '280px', [], 'center', 'top'),
    textBlock(`${P}-s4-title`, '担保标题', 'Our 90 Day Guarantee', { fontSize: '22px', bold: true, color: COLORS.primary }),
    textBlock(`${P}-s4-desc`, '担保说明', 'With our 90-day money back guarantee, there is ZERO risk in trying out the brand trusted by thousands of pet parents, vets, and pet experts.', { fontSize: '14px', color: COLORS.textLight }),
    {
      id: `${P}-s4-badge`,
      type: 'image',
      blockMeta: { blockType: 'content.image', name: '担保徽章' },
      wrapperStyle: {
        widthMode: 'fixed',
        width: '200px',
        heightMode: 'fixed',
        height: '120px',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        backgroundImage: {
          src: PEXELS['guarantee-badge'],
          alt: 'cartoon bulldog running illustration',
          fit: 'contain',
          position: 'center',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
      },
    },
    buttonBlock(`${P}-s4-cta`, '结账按钮', 'CHECKOUT NOW', { bg: COLORS.primary, textColor: COLORS.white, widthMode: 'fixed', width: '300px', bold: true }),
    textBlock(`${P}-s4-disclaimer`, '免责声明', '*Based on an independent survey conducted in 2024 (n=200)', { fontSize: '12px', color: COLORS.textLight }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  const sec = sectionShell(`${P}-s5`, '页脚模块', { bg: COLORS.white, padTop: '32px', padBottom: '0' });
  sec.children = [
    textBlock(`${P}-s5-logo`, '品牌Logo', 'wuffes', { fontSize: '24px', bold: true, color: COLORS.primary }),
    gridBlock(`${P}-s5-footer-grid`, '页脚功能网格', 3, [
      {
        id: `${P}-s5-col1`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '担保列' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          iconBlock(`${P}-s5-icon1`, '担保图标', ICON['icon-guarantee'], { size: '32px', color: COLORS.primary }),
          textBlock(`${P}-s5-text1`, '担保文字', '90 Day Guarantee', { fontSize: '12px' }),
        ],
      },
      {
        id: `${P}-s5-col2`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '订阅列' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          iconBlock(`${P}-s5-icon2`, '订阅图标', ICON['icon-subscribe'], { size: '32px', color: COLORS.primary }),
          textBlock(`${P}-s5-text2`, '订阅文字', 'Subscribe & Save', { fontSize: '12px' }),
        ],
      },
      {
        id: `${P}-s5-col3`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '用户列' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          iconBlock(`${P}-s5-icon3`, '用户图标', ICON['icon-customers'], { size: '32px', color: COLORS.primary }),
          textBlock(`${P}-s5-text3`, '用户文字', '+770K Happy Pet Parents', { fontSize: '12px' }),
        ],
      },
    ], { gap: '16px' }),
    {
      id: `${P}-s5-social-bar`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '社交栏' },
      wrapperStyle: {
        backgroundColor: COLORS.primary,
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s5-social-text`, '社交链接', 'Facebook | Facebook Group | Instagram | Website', { fontSize: '12px', color: COLORS.accent }),
      ],
    },
    textBlock(`${P}-s5-copyright`, '版权信息', '© 2025 wuffes. All Rights Reserved.', { fontSize: '12px', color: COLORS.textLight }),
    textBlock(`${P}-s5-address`, '地址', 'Wuffes 1603 Capital Ave Ste 31A, 125 Cheney, NY 82001', { fontSize: '12px', color: COLORS.textLight }),
    textBlock(`${P}-s5-unsubscribe`, '退订链接', "No longer want to receive these emails? Unsubscribe", { fontSize: '12px', color: COLORS.textLight, decoration: 'underline' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS5 */







/* @mjs-slot:tokenPresets */
const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: displayName,
      description: '宠物健康产品营销邮件模板，暖米色底，绿色品牌色，含用户评价、兽医推荐、担保承诺模块',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '36px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '8px', cta: '9999px' },
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
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5()],
  },
};
/* @mjs-slot-end:template */

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

