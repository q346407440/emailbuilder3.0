#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "engagement_post_purchase_doubao_test_v2";
const P = "engageme";
const displayName = "测试ai";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/engagement_post_purchase_doubao_test_v2/.ai-staging/bd64257e-bc85-4f47-81da-fcc08f6d1960/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/engagement_post_purchase_doubao_test_v2-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/engagement_post_purchase_doubao_test_v2/.ai-staging/bd64257e-bc85-4f47-81da-fcc08f6d1960/layout-out";

const PEXELS = {
  "hero-grooming": "https://images.pexels.com/photos/19145876/pexels-photo-19145876.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "guide-yorkie": "https://images.pexels.com/photos/6734032/pexels-photo-6734032.jpeg?auto=compress&cs=tinysrgb&h=130",
  "shedding-service": "https://images.pexels.com/photos/6131578/pexels-photo-6131578.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "reward-benefit": "https://images.pexels.com/photos/6131576/pexels-photo-6131576.jpeg?auto=compress&cs=tinysrgb&h=350",
  "coupon-grooming": "https://images.pexels.com/photos/6816837/pexels-photo-6816837.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "grooming-scissors": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/scissors.svg",
  "icon-location": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/map-pin.svg",
  "icon-instagram": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
  "icon-facebook": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "icon-youtube": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/youtube.svg",
  "icon-appstore": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/apple.svg",
  "icon-googleplay": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/googleplay.svg",
};
/* @mjs-slot:COLORS */
const COLORS = {
  primary: '#E4212D',
  secondary: '#2563EB',
  surface: '#FFFFFF',
  cardBg: '#F5F5F5',
  textDark: '#111111',
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
  const sec = sectionShell(`${P}-s1`, '顶部通知栏', { bg: COLORS.primary, padTop: '12px', padBottom: '12px' });
  sec.children = [
    rowLayout(`${P}-s1-row`, '奖励通知行', [
      textBlock(`${P}-s1-amount`, '奖励金额', '$2', { fontSize: '24px', bold: true, color: COLORS.white, widthMode: 'hug', alignH: 'left' }),
      {
        id: `${P}-s1-divider`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '分割线' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '1px',
          heightMode: 'fixed',
          height: '32px',
          backgroundColor: 'rgba(255,255,255,0.3)',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [],
      },
      {
        id: `${P}-s1-text-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '通知文案' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '2px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(`${P}-s1-title`, '用户名', 'Smiles Davis', { fontSize: '16px', bold: true, color: COLORS.white, alignH: 'left' }),
          textBlock(`${P}-s1-subtitle`, '提示文案', 'Redeem your well-earned $2 now!', { fontSize: '14px', color: COLORS.white, alignH: 'left' }),
        ],
      },
      {
        id: `${P}-s1-member-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '会员标识' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '4px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'right', vertical: 'center' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          iconBlock(`${P}-s1-star`, '会员星标', '', { size: '24px', color: COLORS.white }),
          textBlock(`${P}-s1-member`, '会员文字', 'Member', { fontSize: '12px', bold: true, color: COLORS.white, widthMode: 'hug' }),
        ],
      },
    ], { alignH: 'space-between', alignV: 'center', gap: '12px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS1 */

/* @mjs-slot:buildS2 */
function buildS2() {
  const sec = sectionShell(`${P}-s2`, '首屏美容区', { bg: COLORS.surface, padTop: '24px', padBottom: '0' });
  sec.children = [
    rowLayout(`${P}-s2-title-row`, '美容标题行', [
      iconBlock(`${P}-s2-scissors`, '剪刀图标', ICON['grooming-scissors'], { size: '32px', color: COLORS.primary }),
      textBlock(`${P}-s2-title`, '美容标题', 'GROOMING', { fontSize: '32px', bold: true, color: COLORS.primary, widthMode: 'hug' }),
    ], { gap: '8px', alignV: 'center' }),
    textBlock(`${P}-s2-subtitle`, '副标题', 'Freshen up your pup', { fontSize: '28px', bold: true, color: COLORS.primary, alignH: 'center' }),
    coverImage(`${P}-s2-hero`, '首图', PEXELS['hero-grooming'], 'groomer brushing dog', '380px'),
  ];
  return sec;
}
/* @mjs-slot-end:buildS2 */

/* @mjs-slot:buildS3 */
function buildS3() {
  const sec = sectionShell(`${P}-s3`, '美容提示区', { bg: COLORS.surface, padTop: '24px' });
  sec.children = [
    textBlock(`${P}-s3-title`, '提示标题', "Here's how to know when your pup is overdue for a visit", { fontSize: '20px', bold: true, color: COLORS.primary, alignH: 'center' }),
    rowLayout(`${P}-s3-content`, '提示内容行', [
      {
        id: `${P}-s3-yorkie-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '约克夏图片容器' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '160px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          coverImage(`${P}-s3-yorkie`, '约克夏图片', PEXELS['guide-yorkie'], 'yorkshire terrier', '220px'),
        ],
      },
      {
        id: `${P}-s3-list-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '提示列表' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '20px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          rowLayout(`${P}-s3-item1`, '提示项1', [
            {
              id: `${P}-s3-badge1`,
              type: 'layout',
              blockMeta: { blockType: 'layout.container', name: '序号徽章' },
              wrapperStyle: {
                widthMode: 'fixed',
                width: '28px',
                heightMode: 'fixed',
                height: '28px',
                backgroundColor: COLORS.primary,
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '9999px' },
                contentAlign: { horizontal: 'center', vertical: 'center' },
              },
              children: [
                textBlock(`${P}-s3-badge1-text`, '序号1', '1', { fontSize: '16px', bold: true, color: COLORS.white, widthMode: 'hug' }),
              ],
            },
            textBlock(`${P}-s3-text1`, '提示1文字', 'You can hear the "click clack" of their nails on the floor', { fontSize: '16px', color: COLORS.textDark, alignH: 'left' }),
          ], { gap: '12px', alignH: 'left', alignV: 'center' }),
          rowLayout(`${P}-s3-item2`, '提示项2', [
            {
              id: `${P}-s3-badge2`,
              type: 'layout',
              blockMeta: { blockType: 'layout.container', name: '序号徽章' },
              wrapperStyle: {
                widthMode: 'fixed',
                width: '28px',
                heightMode: 'fixed',
                height: '28px',
                backgroundColor: COLORS.primary,
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '9999px' },
                contentAlign: { horizontal: 'center', vertical: 'center' },
              },
              children: [
                textBlock(`${P}-s3-badge2-text`, '序号2', '2', { fontSize: '16px', bold: true, color: COLORS.white, widthMode: 'hug' }),
              ],
            },
            textBlock(`${P}-s3-text2`, '提示2文字', 'They are scratching their ears & biting at their nails', { fontSize: '16px', color: COLORS.textDark, alignH: 'left' }),
          ], { gap: '12px', alignH: 'left', alignV: 'center' }),
          rowLayout(`${P}-s3-item3`, '提示项3', [
            {
              id: `${P}-s3-badge3`,
              type: 'layout',
              blockMeta: { blockType: 'layout.container', name: '序号徽章' },
              wrapperStyle: {
                widthMode: 'fixed',
                width: '28px',
                heightMode: 'fixed',
                height: '28px',
                backgroundColor: COLORS.primary,
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '9999px' },
                contentAlign: { horizontal: 'center', vertical: 'center' },
              },
              children: [
                textBlock(`${P}-s3-badge3-text`, '序号3', '3', { fontSize: '16px', bold: true, color: COLORS.white, widthMode: 'hug' }),
              ],
            },
            textBlock(`${P}-s3-text3`, '提示3文字', 'That "wet dog" smell won\'t go away', { fontSize: '16px', color: COLORS.textDark, alignH: 'left' }),
          ], { gap: '12px', alignH: 'left', alignV: 'center' }),
        ],
      },
    ], { gap: '20px', alignH: 'left', alignV: 'top' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS3 */

/* @mjs-slot:buildS4 */
function buildS4() {
  const sec = sectionShell(`${P}-s4`, '掉毛服务区', { bg: COLORS.surface, padTop: '0' });
  sec.children = [
    coverImage(`${P}-s4-shedding-img`, '掉毛服务图', PEXELS['shedding-service'], 'groomer holding corgi', '280px'),
    textBlock(`${P}-s4-title`, '标题', 'Keep your house fur-free this shedding season', { fontSize: '28px', bold: true, color: COLORS.primary, alignH: 'center' }),
    textBlock(`${P}-s4-desc`, '描述', 'Our FURminator services help reduce shedding up to 90% with a low-shed shampoo, deShedding conditioner, blow-out & extra brushing.**', { fontSize: '16px', color: COLORS.textDark, alignH: 'center' }),
    buttonBlock(`${P}-s4-cta`, '预约按钮', 'Book now', { bg: COLORS.secondary, textColor: COLORS.white, widthMode: 'fixed', width: '200px', radius: '4px' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS4 */

/* @mjs-slot:buildS5 */
function buildS5() {
  const sec = sectionShell(`${P}-s5`, '会员福利区', { bg: COLORS.cardBg, borderRadius: '16px' });
  sec.children = [
    imageContainer(`${P}-s5-reward-img`, '福利图', PEXELS['reward-benefit'], 'groomer trimming french bulldog nails', '240px', [
      {
        id: `${P}-s5-badge`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '新会员福利徽章' },
        wrapperStyle: {
          widthMode: 'hug',
          heightMode: 'hug',
          backgroundColor: COLORS.secondary,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '9999px' },
        },
        children: [
          textBlock(`${P}-s5-badge-text`, '徽章文字', 'NEW MEMBER BENEFIT', { fontSize: '14px', bold: true, color: COLORS.white, widthMode: 'hug' }),
        ],
      },
    ], 'center', 'top'),
    textBlock(`${P}-s5-title`, '福利标题', 'Salon Reward Certificates', { fontSize: '24px', bold: true, color: COLORS.primary, alignH: 'center' }),
    textBlock(`${P}-s5-desc`, '福利描述', 'Earn up to two $10 certificates per year. Just purchase a bath or groom & you\'ll receive your certificate the following month via email & the app.†', { fontSize: '16px', color: COLORS.textDark, alignH: 'center' }),
    rowLayout(`${P}-s5-cta-row`, '按钮行', [
      buttonBlock(`${P}-s5-cta1`, '预约按钮', 'Book now', { bg: COLORS.primary, textColor: COLORS.white, radius: '4px' }),
      buttonBlock(`${P}-s5-cta2`, '查看福利按钮', 'View all benefits', { bg: COLORS.primary, textColor: COLORS.white, radius: '4px' }),
    ], { gap: '16px', alignH: 'center' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS5 */

/* @mjs-slot:buildS6 */
function buildS6() {
  const sec = sectionShell(`${P}-s6`, '优惠券区', { bg: COLORS.primary, padTop: '0', padBottom: '0', pageInline: false });
  sec.children = [
    rowLayout(`${P}-s6-content`, '优惠券内容', [
      {
        id: `${P}-s6-text-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '文案容器' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          rowLayout(`${P}-s6-title-row`, '优惠券标题行', [
            iconBlock(`${P}-s6-scissors`, '剪刀图标', ICON['grooming-scissors'], { size: '24px', color: COLORS.white }),
            textBlock(`${P}-s6-title`, '优惠券标题', 'GROOMING', { fontSize: '20px', bold: true, color: COLORS.white, widthMode: 'hug' }),
          ], { gap: '8px', alignH: 'left', alignV: 'center' }),
          textBlock(`${P}-s6-amount`, '优惠金额', 'Save $20', { fontSize: '36px', bold: true, color: COLORS.white, alignH: 'left' }),
          textBlock(`${P}-s6-subtitle`, '优惠说明', 'on your pup\'s next bath or groom', { fontSize: '18px', color: COLORS.white, alignH: 'left' }),
          textBlock(`${P}-s6-expiry`, '有效期', 'thru 12/15‡‡', { fontSize: '14px', color: COLORS.white, alignH: 'left' }),
          buttonBlock(`${P}-s6-cta1`, '领券按钮', 'Get coupon', { bg: COLORS.white, textColor: COLORS.secondary, widthMode: 'fill', radius: '4px' }),
          buttonBlock(`${P}-s6-cta2`, '预约按钮', 'Book now', { bg: COLORS.white, textColor: COLORS.secondary, widthMode: 'fill', radius: '4px' }),
        ],
      },
      {
        id: `${P}-s6-img-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '图片容器' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '300px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          coverImage(`${P}-s6-coupon-img`, '优惠券图片', PEXELS['coupon-grooming'], 'groomer grooming terrier', '380px'),
        ],
      },
    ], { gap: '0', alignH: 'space-between', alignV: 'stretch' }),
  ];
  return sec;
}
/* @mjs-slot-end:buildS6 */

/* @mjs-slot:buildS7 */
function buildS7() {
  const sec = sectionShell(`${P}-s7`, '页脚区', { bg: COLORS.surface, padTop: '24px' });
  sec.children = [
    rowLayout(`${P}-s7-logo-row`, 'logo行', [
      textBlock(`${P}-s7-logo1`, 'PetSmart logo', 'PETSMART', { fontSize: '24px', bold: true, color: COLORS.primary, widthMode: 'hug' }),
      {
        id: `${P}-s7-divider`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '分割线' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '1px',
          heightMode: 'fixed',
          height: '24px',
          backgroundColor: COLORS.textLight,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [],
      },
      textBlock(`${P}-s7-logo2`, 'Treats logo', 'Treats rewards', { fontSize: '20px', bold: true, color: COLORS.primary, widthMode: 'hug' }),
    ], { gap: '16px', alignV: 'center' }),
    rowLayout(`${P}-s7-icon-row`, '图标行', [
      iconBlock(`${P}-s7-icon-location`, '位置图标', ICON['icon-location'], { size: '20px', color: COLORS.textDark }),
      iconBlock(`${P}-s7-icon-ig`, 'Instagram图标', ICON['icon-instagram'], { size: '20px', color: COLORS.textDark }),
      iconBlock(`${P}-s7-icon-fb`, 'Facebook图标', ICON['icon-facebook'], { size: '20px', color: COLORS.textDark }),
      iconBlock(`${P}-s7-icon-yt`, 'Youtube图标', ICON['icon-youtube'], { size: '20px', color: COLORS.textDark }),
      iconBlock(`${P}-s7-icon-appstore`, 'AppStore图标', ICON['icon-appstore'], { size: '20px', color: COLORS.textDark }),
      iconBlock(`${P}-s7-icon-googleplay`, 'GooglePlay图标', ICON['icon-googleplay'], { size: '20px', color: COLORS.textDark }),
    ], { gap: '24px', alignV: 'center' }),
    {
      id: `${P}-s7-divider-line`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '分割线' },
      wrapperStyle: {
        widthMode: 'fill',
        heightMode: 'fixed',
        height: '1px',
        backgroundColor: '#E5E5E5',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [],
    },
    textBlock(`${P}-s7-address`, '地址', 'PetSmart, 19601 N 27th Ave, Phoenix, AZ 85027, 888-839-9638.', { fontSize: '12px', color: COLORS.textLight, alignH: 'left' }),
    textBlock(`${P}-s7-trademark`, '商标声明', 'All featured trademarks, service marks and logos are the property of their respective owners. Prices and availability of products and services are subject to change without notice and selection may vary by location.', { fontSize: '12px', color: COLORS.textLight, alignH: 'left' }),
    textBlock(`${P}-s7-noreply`, '回复提示', 'Please do not reply directly to this message as we are not able to respond to messages sent to this address. For questions or concerns, please visit the Contact Us page on our site or app to reach our Customer Care team.', { fontSize: '12px', color: COLORS.textLight, alignH: 'left' }),
    textBlock(`${P}-s7-rewards`, '奖励说明', 'Treats Rewards points and redeemable dollars featured in this email reflect your account activity as of 9/3/24. Points history is available to view here. Treats Rewards terms & conditions apply. See petsmart.com/treats-rewards for details. Prices and selection may vary by store and online. While supplies last.', { fontSize: '12px', color: COLORS.textLight, alignH: 'left' }),
    textBlock(`${P}-s7-terms1`, '条款1', '**Terms & conditions apply. Click here for complete details.', { fontSize: '12px', color: COLORS.textLight, alignH: 'left' }),
    textBlock(`${P}-s7-terms2`, '条款2', '†Terms & conditions apply. Click here for complete details.', { fontSize: '12px', color: COLORS.textLight, alignH: 'left' }),
    textBlock(`${P}-s7-terms3`, '条款3', '‡‡Offer valid through 12/15/24 in stores only with Treats Rewards. Excludes Quick Wash. Must use Treats Rewards ID in stores at checkout to receive discount. Prices vary by store and may be higher for weekend appointments. At the sole discretion of PetSmart. Some pets, health & vaccination requirements apply for all services.', { fontSize: '12px', color: COLORS.textLight, alignH: 'left' }),
    rowLayout(`${P}-s7-footer-links`, '页脚链接', [
      textBlock(`${P}-s7-link1`, '浏览器查看', 'view in browser', { fontSize: '12px', color: COLORS.textDark, widthMode: 'hug', decoration: 'underline' }),
      {
        id: `${P}-s7-link-divider1`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '分割线' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '1px',
          heightMode: 'fixed',
          height: '12px',
          backgroundColor: COLORS.textLight,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [],
      },
      textBlock(`${P}-s7-link2`, '隐私政策', 'privacy policy', { fontSize: '12px', color: COLORS.textDark, widthMode: 'hug', decoration: 'underline' }),
      {
        id: `${P}-s7-link-divider2`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '分割线' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '1px',
          heightMode: 'fixed',
          height: '12px',
          backgroundColor: COLORS.textLight,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [],
      },
      textBlock(`${P}-s7-link3`, '退订', 'unsubscribe', { fontSize: '12px', color: COLORS.textDark, widthMode: 'hug', decoration: 'underline' }),
    ], { gap: '8px', alignH: 'center', alignV: 'center' }),
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
      description: 'PetSmart美容服务推广邮件模板，包含会员奖励、服务介绍、优惠活动等模块',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '36px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '16px', cta: '4px' },
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

