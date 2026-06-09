#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 16 底稿 patch 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/836e33e9-75c1-4b9d-8143-d731fad8a11c/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/836e33e9-75c1-4b9d-8143-d731fad8a11c/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/5482615/pexels-photo-5482615.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "guide-ebook": "https://images.pexels.com/photos/5163801/pexels-photo-5163801.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-joint-support": "https://images.pexels.com/photos/8844557/pexels-photo-8844557.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc1": "https://images.pexels.com/photos/5205381/pexels-photo-5205381.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc2": "https://images.pexels.com/photos/23523315/pexels-photo-23523315.png?auto=compress&cs=tinysrgb&h=130",
  "ugc3": "https://images.pexels.com/photos/14874691/pexels-photo-14874691.jpeg?auto=compress&cs=tinysrgb&h=130",
  "vet-testimonial1": "https://images.pexels.com/photos/6234975/pexels-photo-6234975.jpeg?auto=compress&cs=tinysrgb&h=130",
  "vet-testimonial2": "https://images.pexels.com/photos/32788235/pexels-photo-32788235.jpeg?auto=compress&cs=tinysrgb&h=130",
  "dog-running": "https://images.pexels.com/photos/32383212/pexels-photo-32383212.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "guarantee-illustration": "https://images.pexels.com/photos/28452384/pexels-photo-28452384.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "icon-guarantee": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/calendar-event.svg",
  "icon-subscribe": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/stack.svg",
  "icon-customers": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/paw.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "social-instagram": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
  "social-website": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/globe.svg",
};
/* @mjs-slot:COLORS */
const COLORS = { primary: '#1A3A31', secondary: '#A4E864', surface: '#F7EFE5', cardBg: '#FFFFFF', textDark: '#111111', textLight: '#666666', white: '#FFFFFF', greenDark: '#1A3A31', greenAccent: '#A4E864' };
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
  const sec = sectionShell(`${P}-s1`, '首屏', { bg: COLORS.surface, padTop: '0', padBottom: '24px' });
  sec.children = [
    coverImage(`${P}-s1-hero`, '首屏主图', PEXELS.hero, 'woman playing with dalmatian dog', '420px'),
    textBlock(`${P}-s1-title`, '首屏标题', "Don't forget to checkout so you can start improving your pup's health and mobility in as little as 3 weeks!*", { bold: true, fontSize: '24px', color: COLORS.textDark }),
    rowLayout(`${P}-s1-guide-row`, '指南行', [
      {
        id: `${P}-s1-guide-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '关节健康指南图' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '100px',
          heightMode: 'fixed',
          height: '150px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: PEXELS['guide-ebook'],
            alt: 'Joint Health Guide',
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
        children: [],
      },
      textBlock(`${P}-s1-guide-text`, '指南名称', 'Joint Health Guide', { alignH: 'left', bold: false, fontSize: '18px', color: COLORS.textDark, widthMode: 'hug', decoration: 'underline' }),
    ], { gap: '24px', alignH: 'left', alignV: 'center' }),
    rowLayout(`${P}-s1-product-row`, '产品行', [
      {
        id: `${P}-s1-product-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: '关节支持产品图' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '100px',
          heightMode: 'fixed',
          height: '100px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: PEXELS['product-joint-support'],
            alt: 'Advanced Hip & Joint Support for Large Breeds',
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
        children: [],
      },
      textBlock(`${P}-s1-product-text`, '产品名称', 'Advanced Hip & Joint Support for Large Breeds', { alignH: 'left', bold: false, fontSize: '18px', color: COLORS.textDark, widthMode: 'hug', decoration: 'underline' }),
    ], { gap: '24px', alignH: 'left', alignV: 'center' }),
    buttonBlock(`${P}-s1-cta`, '结账按钮', 'CHECKOUT NOW', { bg: COLORS.primary, textColor: COLORS.white, fontSize: '16px', radius: '9999px', widthMode: 'fixed', width: '240px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  const sec = sectionShell(`${P}-s2`, '用户评价', { bg: COLORS.surface, padTop: '0', padBottom: '24px' });
  function reviewCard(id, imgSrc, imgAlt, title, content, author) {
    return {
      id,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '用户评价卡片' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'left', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.white,
        border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.primary },
        borderRadius: { mode: 'unified', radius: '8px' },
      },
      children: [
        imageContainer(`${id}-img`, '用户狗狗图', imgSrc, imgAlt, '120px', [], 'center', 'top'),
        textBlock(`${id}-title`, '评价标题', title, { alignH: 'left', fontSize: '14px', bold: true, color: COLORS.textDark }),
        textBlock(`${id}-content`, '评价内容', content, { alignH: 'left', fontSize: '12px', color: COLORS.textDark }),
        textBlock(`${id}-rating`, '五星评分', '★★★★★', { alignH: 'left', fontSize: '14px', color: COLORS.greenAccent }),
        textBlock(`${id}-author`, '评价作者', author, { alignH: 'left', fontSize: '12px', bold: true, color: COLORS.textDark }),
      ],
    };
  }
  sec.children = [
    textBlock(`${P}-s2-title`, '模块标题', "You're checking out Wuffes because you want the best for your pup and you're in the right place!", { bold: true, fontSize: '24px', color: COLORS.textDark }),
    textBlock(`${P}-s2-subtitle`, '模块副标题', '99% of Wuffes joint chews customers saw improved mobility and decreased joint discomfort with 90 days of consistent use.*', { fontSize: '14px', color: COLORS.textDark }),
    gridBlock(`${P}-s2-reviews`, '评价网格', 3, [
      reviewCard(`${P}-s2-r1`, PEXELS.ugc1, 'happy white terrier', 'Our Georgina seems livelier than ever!', "This multivitamin works wonders, we've seen a huge improvement across energy levels, digestion (yep, no more runny poops) and overall happiness", 'Tanesha'),
      reviewCard(`${P}-s2-r2`, PEXELS.ugc2, 'golden retriever in lake', 'We started giving our Jason this multivitamin, the Wuffes joint chews AND the oil', "and our aging boy now moves around with newfound ease. I was so happy when I started to notice an improvement, I could've cried. Thanks so much Wuffes, you made one happy dog momma.", 'Levi'),
      reviewCard(`${P}-s2-r3`, PEXELS.ugc3, 'german shepherd close up', 'Say goodbye to dry skin and dull fur!', "We started giving Lucie this multivitamin about a couple of weeks ago and noticed less itching and way shinier fur even at 11 years old!", 'Mike'),
    ], { gap: '16px', alignH: 'center' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  const sec = sectionShell(`${P}-s3`, '兽医推荐', { bg: COLORS.surface, padTop: '0', padBottom: '24px' });
  function vetCard(id, imgSrc, imgAlt, quote, name, title) {
    return {
      id,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '兽医评价卡片' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'left', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.primary,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '8px' },
      },
      children: [
        {
          id: `${id}-img`,
          type: 'image',
          blockMeta: { blockType: 'content.image', name: '兽医照片' },
          wrapperStyle: {
            contentAlign: { horizontal: 'center', vertical: 'top' },
            widthMode: 'fixed',
            width: '180px',
            heightMode: 'fixed',
            height: '220px',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '8px' },
            backgroundImage: {
              src: imgSrc,
              alt: imgAlt,
              fit: 'cover',
              position: 'center',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '8px' },
            },
          },
          children: [],
        },
        {
          id: `${id}-content`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '评价内容' },
          props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
          wrapperStyle: {
            contentAlign: { horizontal: 'left', vertical: 'top' },
            widthMode: 'fill',
            heightMode: 'hug',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            textBlock(`${id}-quote-mark`, '引号', '“', { alignH: 'left', fontSize: '32px', bold: true, color: COLORS.greenAccent, widthMode: 'hug' }),
            textBlock(`${id}-quote`, '评价内容', quote, { alignH: 'left', fontSize: '14px', color: COLORS.white }),
            textBlock(`${id}-rating`, '五星评分', '★★★★★', { alignH: 'left', fontSize: '14px', color: COLORS.greenAccent }),
            textBlock(`${id}-name`, '兽医姓名', name, { alignH: 'left', fontSize: '14px', bold: true, color: COLORS.white }),
            textBlock(`${id}-title`, '兽医职称', title, { alignH: 'left', fontSize: '12px', color: COLORS.white }),
          ],
        },
      ],
    };
  }
  sec.children = [
    textBlock(`${P}-s3-title`, '模块标题', 'Recommended by Vets', { bold: true, fontSize: '24px', color: COLORS.primary }),
    textBlock(`${P}-s3-sub1`, '副标题1', 'Veterinarians across the nation are raving about the results they\'ve seen when recommending Wuffes products to their patients.', { fontSize: '14px', color: COLORS.textDark }),
    textBlock(`${P}-s3-sub2`, '副标题2', 'Just imagine the results your pup could see to improve their quality of life.', { fontSize: '14px', color: COLORS.textDark }),
    vetCard(`${P}-s3-v1`, PEXELS['vet-testimonial1'], 'Dr. Carin Beene', 'I 100% approve of the ingredients and the quality, and I haven\'t found one that I like any more than this. If you have a big dog, the other huge plus is that you only have to give one chew a day. Super convenient, you can trust this product. I highly recommend!', 'Dr. Carin Beene', 'DVM'),
    vetCard(`${P}-s3-v2`, PEXELS['vet-testimonial2'], 'Dr. Dawn Filos', "I've had incredible results with my patients and with my own pet. There are higher concentrations of key ingredients that I recommend such as MSM and glucosamine.", 'Dr. Dawn Filos', 'DVM'),
  ];
  return sec;
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const sec = sectionShell(`${P}-s4`, '保障模块', { bg: COLORS.surface, padTop: '0', padBottom: '24px' });
  sec.children = [
    coverImage(`${P}-s4-dog`, '奔跑的狗狗', PEXELS['dog-running'], 'border collie catching toy', '280px'),
    textBlock(`${P}-s4-title`, '保障标题', 'Our 90 Day Guarantee', { bold: true, fontSize: '24px', color: COLORS.primary }),
    textBlock(`${P}-s4-desc`, '保障说明', 'With our 90-day money back guarantee, there is ZERO risk in trying out the brand trusted by thousands of pet parents, vets, and pet experts.', { fontSize: '14px', color: COLORS.textDark }),
    {
      id: `${P}-s4-guarantee-img`,
      type: 'image',
      blockMeta: { blockType: 'content.image', name: '保障插画' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fixed',
        width: '200px',
        heightMode: 'fixed',
        height: '120px',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        backgroundImage: {
          src: PEXELS['guarantee-illustration'],
          alt: '90 day guarantee illustration',
          fit: 'contain',
          position: 'center',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
      },
      children: [],
    },
    buttonBlock(`${P}-s4-cta`, '结账按钮', 'CHECKOUT NOW', { bg: COLORS.primary, textColor: COLORS.white, fontSize: '16px', radius: '9999px', widthMode: 'fixed', width: '240px' }),
    textBlock(`${P}-s4-disclaimer`, '免责说明', '*Based on an independent survey conducted in 2024 (n=200)', { fontSize: '12px', color: COLORS.textLight }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  const sec = sectionShell(`${P}-s5`, '页脚', { bg: COLORS.white, padTop: '24px', padBottom: '24px' });
  function featureCol(id, icon, title) {
    return {
      id,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '特色项' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        iconBlock(`${id}-icon`, '特色图标', icon, { size: '24px', color: COLORS.primary }),
        textBlock(`${id}-text`, '特色文字', title, { fontSize: '12px', color: COLORS.textDark }),
      ],
    };
  }
  sec.children = [
    textBlock(`${P}-s5-logo`, '品牌logo', 'wuffes', { fontSize: '24px', bold: true, color: COLORS.primary }),
    gridBlock(`${P}-s5-features`, '特色网格', 3, [
      featureCol(`${P}-s5-f1`, ICON['icon-guarantee'], '90 Day Guarantee'),
      featureCol(`${P}-s5-f2`, ICON['icon-subscribe'], 'Subscribe & Save'),
      featureCol(`${P}-s5-f3`, ICON['icon-customers'], '+770K Happy Pet Parents'),
    ], { gap: '16px', alignH: 'center' }),
    {
      id: `${P}-s5-social-bar`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '社交媒体栏' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.primary,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        rowLayout(`${P}-s5-social-row`, '社交媒体链接', [
          textBlock(`${P}-s5-social-fb`, 'Facebook链接', 'Facebook', { alignH: 'center', fontSize: '12px', color: COLORS.greenAccent, widthMode: 'hug' }),
          textBlock(`${P}-s5-social-fb-group`, 'Facebook群组链接', 'Facebook Group', { alignH: 'center', fontSize: '12px', color: COLORS.greenAccent, widthMode: 'hug' }),
          textBlock(`${P}-s5-social-ig`, 'Instagram链接', 'Instagram', { alignH: 'center', fontSize: '12px', color: COLORS.greenAccent, widthMode: 'hug' }),
          textBlock(`${P}-s5-social-web`, '官网链接', 'Website', { alignH: 'center', fontSize: '12px', color: COLORS.greenAccent, widthMode: 'hug' }),
        ], { gap: '16px', alignH: 'center' }),
      ],
    },
    textBlock(`${P}-s5-copyright`, '版权声明', '© 2025 wuffes. All Rights Reserved.', { fontSize: '12px', color: COLORS.textLight }),
    textBlock(`${P}-s5-address`, '地址', 'Wuffes 1603 Capitol Ave Ste 310 A125 Cheyenne, WY 82001', { fontSize: '12px', color: COLORS.textLight }),
    textBlock(`${P}-s5-unsubscribe`, '退订链接', 'No longer want to receive these emails? Unsubscribe', { fontSize: '12px', color: COLORS.textLight, decoration: 'underline' }),
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
      description: 'Wuffes宠物关节保健产品营销邮件模板，清新暖米色配色，含用户评价、兽医推荐、90天保障模块',
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

