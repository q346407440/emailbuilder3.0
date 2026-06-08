#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "coupon_template72_doubao";
const P = "couponte";
const displayName = "复杂左右网格测试 2";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/7437d1fd-156f-449b-9e88-caf564ed1607/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/coupon_template72_doubao-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/coupon_template72_doubao/.ai-staging/7437d1fd-156f-449b-9e88-caf564ed1607/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/19410747/pexels-photo-19410747.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "block1-dark-bedroom": "https://images.pexels.com/photos/4993094/pexels-photo-4993094.jpeg?auto=compress&cs=tinysrgb&h=350",
  "block2-neutral-office": "https://images.pexels.com/photos/11701950/pexels-photo-11701950.jpeg?auto=compress&cs=tinysrgb&h=350",
  "block3-soft-pink-room": "https://images.pexels.com/photos/6312075/pexels-photo-6312075.jpeg?auto=compress&cs=tinysrgb&h=350",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "social-tiktok": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-tiktok.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-facebook.svg",
  "social-pinterest": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-pinterest.svg",
};
const COLORS = {
  primary: '#1E293B',
  secondary: '#FCD34D',
  surface: '#F8F7F4',
  white: '#FFFFFF',
  darkBlue: '#0F344E',
  lightGray: '#E2E8F0',
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
    bg = COLORS.secondary,
    textColor = COLORS.primary,
    fontSize = '14px',
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
  const { size = '24px', color = COLORS.white } = opts;
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

function imageWithTag(id, name, src, alt, height, tagText, tagColor = COLORS.white, tagBg = COLORS.white) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'right', vertical: 'top' },
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
    children: [
      {
        id: `${id}-tag`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '标签容器' },
        props: { direction: 'horizontal', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'hug',
          heightMode: 'hug',
          backgroundColor: tagBg,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '9999px' },
        },
        children: [
          {
            id: `${id}-tag-dot`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '标签色点' },
            wrapperStyle: {
              widthMode: 'fixed',
              width: '16px',
              heightMode: 'fixed',
              height: '16px',
              backgroundColor: tagColor,
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '9999px' },
            },
          },
          textBlock(`${id}-tag-text`, '标签文案', tagText, {
            fontSize: '12px',
            color: COLORS.primary,
            widthMode: 'hug',
          }),
        ],
      },
    ],
  };
}

function productCard(id, name, imageSrc, productName) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      coverImage(`${id}-img`, `${productName}图片`, imageSrc, productName, '120px'),
      textBlock(`${id}-name`, '产品名称', productName, { fontSize: '14px' }),
      buttonBlock(`${id}-btn`, '购买按钮', 'Shop now', { fontSize: '12px', widthMode: 'hug' }),
    ],
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部通知栏', { bg: COLORS.lightGray, padTop: '8px', padBottom: '8px' });
  sec.children = [
    textBlock(`${P}-s1-notice`, '通知文案', 'FREE SHIPPING ON 5+ SWATCHES AND ORDERS $200+', {
      fontSize: '12px',
      bold: true,
    }),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '头部品牌区', { bg: COLORS.white, padTop: '16px', padBottom: '16px' });
  sec.children = [
    textBlock(`${P}-s2-logo`, '品牌logo', 'CLARE', { fontSize: '28px', bold: true, color: COLORS.primary }),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '主视觉模块', { bg: COLORS.surface, padTop: '0', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s3-title`, '主标题', 'You don\'t need more stuff—\njust a new paint color', {
      fontSize: '24px',
      bold: true,
    }),
    imageWithTag(`${P}-s3-img`, '主视觉图', PEXELS.hero, '现代家庭办公室', '420px', 'Flatiron', '#D6D0C8'),
    textBlock(`${P}-s3-desc1`, '描述1', 'If your rooms are feeling cluttered, flat or stuck in neutral overload, the answer isn\'t more decor. It\'s smarter color.', {
      alignH: 'left',
      fontSize: '15px',
    }),
    textBlock(`${P}-s3-desc2`, '描述2', 'A thoughtful paint choice can simplify your space, calm the visual noise and make everything feel intentionally pulled together.', {
      alignH: 'left',
      fontSize: '15px',
    }),
    buttonBlock(`${P}-s3-cta`, '找色按钮', 'Find Your Color', { widthMode: 'fixed', width: '220px' }),
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '深色卧室模块', { bg: COLORS.white, padTop: '24px', padBottom: '24px' });
  const row = rowLayout(`${P}-s4-row`, '图文横排', [], { alignV: 'center', gap: '24px' });

  const textCol = {
    id: `${P}-s4-text-col`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '文案列' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s4-title`, '模块标题', 'Choose one color—and commit', {
        alignH: 'left',
        fontSize: '20px',
        bold: true,
      }),
      textBlock(`${P}-s4-desc`, '模块描述', 'Instead of breaking up a room with contrast, let one color do the heavy lifting. Color drenching creates cohesion and calm.', {
        alignH: 'left',
        fontSize: '14px',
      }),
      gridBlock(`${P}-s4-colors`, '色卡网格', 2, [
        textBlock(`${P}-s4-color1`, '颜色1', 'Daily Greens', { alignH: 'left', fontSize: '14px' }),
        textBlock(`${P}-s4-color2`, '颜色2', 'Deep Dive', { alignH: 'left', fontSize: '14px' }),
        textBlock(`${P}-s4-color3`, '颜色3', 'Goodnight Moon', { alignH: 'left', fontSize: '14px' }),
        textBlock(`${P}-s4-color4`, '颜色4', 'OMGreen', { alignH: 'left', fontSize: '14px' }),
      ], { alignH: 'left', gap: '16px' }),
    ],
  };

  const imgCol = {
    id: `${P}-s4-img-col`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '图片列' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      imageWithTag(`${P}-s4-img`, '深色卧室图', PEXELS['block1-dark-bedroom'], '深蓝色卧室', '400px', 'Goodnight Moon', '#29394C'),
    ],
  };

  row.children = [textCol, imgCol];
  sec.children = [row];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '中性色办公室模块', { bg: COLORS.white, padTop: '24px', padBottom: '24px' });
  const row = rowLayout(`${P}-s5-row`, '图文横排', [], { alignV: 'center', gap: '24px' });

  const imgCol = {
    id: `${P}-s5-img-col`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '图片列' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      imageWithTag(`${P}-s5-img`, '中性色办公室图', PEXELS['block2-neutral-office'], '浅中性色办公室', '400px', 'Flatiron', '#D6D0C8'),
    ],
  };

  const textCol = {
    id: `${P}-s5-text-col`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '文案列' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s5-title`, '模块标题', 'Use color to define,\nnot decorate', {
        alignH: 'left',
        fontSize: '20px',
        bold: true,
      }),
      textBlock(`${P}-s5-desc`, '模块描述', 'Paint built-ins, cabinetry or a nook to give it purpose, without adding clutter.', {
        alignH: 'left',
        fontSize: '14px',
      }),
      gridBlock(`${P}-s5-colors`, '色卡网格', 2, [
        textBlock(`${P}-s5-color1`, '颜色1', 'Flatiron', { alignH: 'left', fontSize: '14px' }),
        textBlock(`${P}-s5-color2`, '颜色2', 'Like Buttah', { alignH: 'left', fontSize: '14px' }),
        textBlock(`${P}-s5-color3`, '颜色3', 'Neutral Territory', { alignH: 'left', fontSize: '14px' }),
        textBlock(`${P}-s5-color4`, '颜色4', 'Dirty Chai', { alignH: 'left', fontSize: '14px' }),
      ], { alignH: 'left', gap: '16px' }),
    ],
  };

  row.children = [imgCol, textCol];
  sec.children = [row];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '粉色玄关模块', { bg: COLORS.white, padTop: '24px', padBottom: '32px' });
  const row = rowLayout(`${P}-s6-row`, '图文横排', [], { alignV: 'center', gap: '24px' });

  const textCol = {
    id: `${P}-s6-text-col`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '文案列' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s6-title`, '模块标题', 'Move beyond\nneutral overload', {
        alignH: 'left',
        fontSize: '20px',
        bold: true,
      }),
      textBlock(`${P}-s6-desc`, '模块描述', 'Neutrals are timeless, but too many can feel flat. Soft, liveable color adds warmth and depth without overwhelming your space.', {
        alignH: 'left',
        fontSize: '14px',
      }),
      gridBlock(`${P}-s6-colors`, '色卡网格', 2, [
        textBlock(`${P}-s6-color1`, '颜色1', 'Wing It', { alignH: 'left', fontSize: '14px' }),
        textBlock(`${P}-s6-color2`, '颜色2', 'Headspace', { alignH: 'left', fontSize: '14px' }),
        textBlock(`${P}-s6-color3`, '颜色3', 'Greenish', { alignH: 'left', fontSize: '14px' }),
        textBlock(`${P}-s6-color4`, '颜色4', 'Wink', { alignH: 'left', fontSize: '14px' }),
      ], { alignH: 'left', gap: '16px' }),
    ],
  };

  const imgCol = {
    id: `${P}-s6-img-col`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '图片列' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      imageWithTag(`${P}-s6-img`, '粉色玄关图', PEXELS['block3-soft-pink-room'], '柔粉色玄关', '400px', 'Wing It', '#F3E8E2'),
    ],
  };

  row.children = [textCol, imgCol];
  sec.children = [
    row,
    buttonBlock(`${P}-s6-cta`, '所有颜色按钮', 'Shop All Colors', { widthMode: 'fixed', width: '220px' }),
  ];
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '绘画用品模块', { bg: '#EFF4F6', padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s7-subtitle`, '副标题', 'PAINTING ESSENTIALS', { fontSize: '12px', bold: true }),
    textBlock(`${P}-s7-title`, '模块标题', 'Ready to prep and paint like the pros?', { fontSize: '22px', bold: true }),
    textBlock(`${P}-s7-desc`, '模块描述', 'Our premium supplies are your DIY VIPs.', { fontSize: '14px' }),
    gridBlock(`${P}-s7-products`, '产品网格', 3, [
      productCard(`${P}-s7-p1`, '天花板漆', '#', 'Ceiling Paint'),
      productCard(`${P}-s7-p2`, '内墙底漆', '#', 'Interior Primer'),
      productCard(`${P}-s7-p3`, '5件套工具', '#', '5-Piece Paint Kit'),
    ], { gap: '24px' }),
    buttonBlock(`${P}-s7-cta`, '所有用品按钮', 'Shop All Supplies', { widthMode: 'fixed', width: '260px' }),
  ];
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, '导航栏', { bg: COLORS.white, padTop: '0', padBottom: '0' });
  const navRow = rowLayout(`${P}-s8-nav`, '导航横排', [], { gap: '0' });
  navRow.children = [
    {
      id: `${P}-s8-nav1`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '涂料导航' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.darkBlue,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s8-nav1-text`, '导航文本', 'INTERIOR PAINT', { fontSize: '14px', color: COLORS.white, bold: true }),
      ],
    },
    {
      id: `${P}-s8-nav2`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '用品导航' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.darkBlue,
        border: { mode: 'custom', style: 'solid', color: COLORS.white, top: { width: '0' }, right: { width: '0' }, bottom: { width: '0' }, left: { width: '1px' } },
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s8-nav2-text`, '导航文本', 'SUPPLIES', { fontSize: '14px', color: COLORS.white, bold: true }),
      ],
    },
  ];

  const infoRow = {
    id: `${P}-s8-info`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '配送信息栏' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: COLORS.white,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${P}-s8-info1`, '配送信息1', 'ORDERS $200+ SHIP FREE', { fontSize: '12px', widthMode: 'hug' }),
      {
        id: `${P}-s8-dot`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '分隔点' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '4px',
          heightMode: 'fixed',
          height: '4px',
          backgroundColor: COLORS.secondary,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '9999px' },
        },
      },
      textBlock(`${P}-s8-info2`, '配送信息2', 'SPEEDY DELIVERY', { fontSize: '12px', widthMode: 'hug' }),
    ],
  };

  sec.children = [navRow, infoRow];
  return sec;
}

function buildS9() {
  const sec = sectionShell(`${P}-s9`, '页脚', { bg: COLORS.darkBlue, padTop: '24px', padBottom: '24px' });
  sec.children = [
    textBlock(`${P}-s9-logo`, '品牌logo', 'CLARE', { fontSize: '24px', bold: true, color: COLORS.white }),
    rowLayout(`${P}-s9-social`, '社媒图标栏', [
      iconBlock(`${P}-s9-ig`, 'Instagram图标', ICON['social-instagram']),
      iconBlock(`${P}-s9-tt`, 'Tiktok图标', ICON['social-tiktok']),
      iconBlock(`${P}-s9-fb`, 'Facebook图标', ICON['social-facebook']),
      iconBlock(`${P}-s9-pi`, 'Pinterest图标', ICON['social-pinterest']),
    ], { gap: '24px' }),
    textBlock(`${P}-s9-copyright`, '版权信息', '© 2026 Clare Paint, LLC. | Unsubscribe | View in Your Browser | Privacy Policy\n1521 Concord Pike Suite 101, Wilmington DE 19803', {
      fontSize: '10px',
      color: COLORS.white,
    }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Clare Paint Template',
      description: '油漆品牌营销邮件模板',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '28px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '8px', cta: '9999px' },
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

