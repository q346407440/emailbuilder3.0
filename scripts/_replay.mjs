#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "engagement_behavior4_template20_doubao";
const P = "engageme";
const displayName = "行为 4（模板 20 · 豆包手工还原）";
const DESIGN_SRC = "/x.png";
const DESIGN_DST = "/y.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = join(EMAIL_DIR, 'layouts/default');

// __INJECTED_ASSETS__
const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  gray: '#E5E5E5',
  textDark: '#000000',
  textLight: '#FFFFFF',
  textMuted: '#666666',
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
  const { bg = COLORS.white, pageInline = true, padTop = '32px', padBottom = '32px', borderRadius = '16px' } = opts;
  const padding = pageInline
    ? { mode: 'separate', top: padTop, right: themeRef('tokens.spacing.pageInline'), bottom: padBottom, left: themeRef('tokens.spacing.pageInline') }
    : { mode: 'separate', top: padTop, right: '0', bottom: padBottom, left: '0' };
  const bindings = pageInline ? {
    ...themeBinding('wrapperStyle.padding.right', 'tokens.spacing.pageInline'),
    ...themeBinding('wrapperStyle.padding.left', 'tokens.spacing.pageInline'),
  } : {};
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '24px' },
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
    fontSize = themeRef('tokens.typography.body'),
    color = themeRef('colors.primary'),
    bold = false,
    italic = false,
    decoration = 'none',
    widthMode = 'fill',
  } = opts;
  const bindings = {};
  if (fontSize.$themeRef) {
    Object.assign(bindings, themeBinding('props.fontSize', fontSize.$themeRef));
  }
  if (color.$themeRef) {
    Object.assign(bindings, themeBinding('props.color', color.$themeRef));
  }
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

function buttonBlock(id, name, text) {
  return {
    id,
    type: 'button',
    blockMeta: { blockType: 'content.button', name },
    props: {
      text,
      link: { href: '#', type: 'external' },
      buttonStyle: {
        fontSize: '16px',
        fontWeight: 'normal',
        fontColor: COLORS.black,
        backgroundColor: COLORS.white,
        border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.black },
        borderRadius: { mode: 'unified', radius: '9999px' },
        padding: { mode: 'separate', top: '12px', right: '24px', bottom: '12px', left: '24px' },
      },
    },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fixed',
      width: '160px',
      heightMode: 'fixed',
      height: '44px',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function iconBlock(id, name, src, size = '40px') {
  return {
    id,
    type: 'icon',
    blockMeta: { blockType: 'content.icon', name },
    props: {
      src,
      size,
      color: COLORS.black,
    },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function productCard(id, name, productName, imgSrc, imgAlt) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: `${id}-img`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: `${productName}图片` },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '200px',
          heightMode: 'fixed',
          height: '220px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: imgSrc,
            alt: imgAlt,
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      },
      textBlock(`${id}-name`, `${productName}名称`, productName, { bold: false, fontSize: '16px' }),
      buttonBlock(`${id}-btn`, `${productName}购买按钮`, 'BUY NOW'),
    ],
  };
}

function categoryCard(id, name, categoryName, iconSrc) {
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
      iconBlock(`${id}-icon`, `${categoryName}图标`, iconSrc, '32px'),
      textBlock(`${id}-name`, `${categoryName}名称`, categoryName, { fontSize: '14px' }),
    ],
  };
}

function benefitCard(id, name, title, desc) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      padding: { mode: 'unified', unified: '8px' },
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${id}-title`, `${title}标题`, title, { color: COLORS.textLight, bold: true, fontSize: '18px' }),
      textBlock(`${id}-desc`, `${title}描述`, desc, { color: COLORS.textLight, fontSize: '14px' }),
    ],
  };
}

function socialIconBlock(id, name, iconSrc) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fixed',
      width: '40px',
      heightMode: 'fixed',
      height: '40px',
      backgroundColor: 'rgba(0,0,0,0)',
      border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.textMuted },
      borderRadius: { mode: 'unified', radius: '9999px' },
    },
    children: [
      {
        id: `${id}-icon`,
        type: 'icon',
        blockMeta: { blockType: 'content.icon', name: `${name}图标` },
        props: {
          src: iconSrc,
          size: '20px',
          color: COLORS.textMuted,
        },
        wrapperStyle: {
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
      }
    ],
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '头部横幅栏', { bg: COLORS.black, padTop: '20px', padBottom: '20px', borderRadius: '16px 16px 0 0' });
  sec.children = [
    textBlock(`${P}-s1-logo`, '三星Logo', 'SΛMSUNG', { bold: true, fontSize: '28px', color: COLORS.white })
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '主推Note20产品模块', { padTop: '40px', padBottom: '40px', borderRadius: '0' });
  sec.children = [
    textBlock(`${P}-s2-title1`, '主标题第一行', 'High in demand.', { bold: true, fontSize: themeRef('tokens.typography.display') }),
    textBlock(`${P}-s2-title2`, '主标题第二行', 'Even higher in value.', { bold: true, fontSize: themeRef('tokens.typography.display') }),
    textBlock(`${P}-s2-desc`, '副标题描述', 'Come back and see if there are new ways to save\non your next favorite product.'),
    {
      id: `${P}-s2-img`,
      type: 'image',
      blockMeta: { blockType: 'content.image', name: 'Galaxy Note20 5G图片' },
      wrapperStyle: {
        widthMode: 'fixed',
        width: '220px',
        heightMode: 'fixed',
        height: '240px',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        backgroundImage: {
          src: PEXELS['hero-galaxy-note20-5g'],
          alt: 'Galaxy Note20 5G',
          fit: 'contain',
          position: 'center',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
      },
    },
    textBlock(`${P}-s2-product-name`, '产品名称', 'Galaxy Note20 5G', { bold: false, fontSize: '18px' }),
    buttonBlock(`${P}-s2-btn`, '购买按钮', 'BUY NOW'),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '相似产品推荐模块', { borderRadius: '0' });
  sec.children = [
    textBlock(`${P}-s3-title1`, '推荐标题第一行', 'Not the perfect fit?', { bold: true, fontSize: themeRef('tokens.typography.h1') }),
    textBlock(`${P}-s3-title2`, '推荐标题第二行', 'Shop similar must-have products.', { bold: true, fontSize: themeRef('tokens.typography.h1') }),
    {
      id: `${P}-s3-products-row`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '产品行' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '32px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        productCard(`${P}-s3-product1`, 'Galaxy S20 FE 5G卡片', 'Galaxy S20 FE 5G', PEXELS['product-galaxy-s20-fe-5g'], 'Galaxy S20 FE 5G'),
        productCard(`${P}-s3-product2`, 'Galaxy S20+ 5G卡片', 'Galaxy S20+ 5G', PEXELS['product-galaxy-s20-plus-5g'], 'Galaxy S20+ 5G'),
      ],
    },
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '全品类入口模块', { padBottom: '40px', borderRadius: '0 0 16px 16px' });
  sec.children = [
    textBlock(`${P}-s4-title`, '品类入口标题', 'Or discover our latest offers', { bold: true, fontSize: themeRef('tokens.typography.h1') }),
    {
      id: `${P}-s4-categories-row`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '品类入口行' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        categoryCard(`${P}-s4-cat1`, '手机品类', 'Phones', ICON['category-phone']),
        categoryCard(`${P}-s4-cat2`, '电视品类', 'TV & Home\nTheater', ICON['category-tv']),
        categoryCard(`${P}-s4-cat3`, '平板可穿戴品类', 'Tablets &\nWearables', ICON['category-tablet-wearable']),
        categoryCard(`${P}-s4-cat4`, '电脑品类', 'Computing', ICON['category-computing']),
        categoryCard(`${P}-s4-cat5`, '家电品类', 'Appliances &\nSmarthome', ICON['category-appliance']),
      ],
    },
  ];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '服务权益模块', { bg: COLORS.black, padTop: '40px', padBottom: '40px', borderRadius: '16px' });
  sec.props.gap = '0';
  sec.children = [
    {
      id: `${P}-s5-benefits-row`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '权益行' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        benefitCard(`${P}-s5-benefit1`, '免费配送权益', 'Free shipping', 'Get your favorite items,\ndelivered right to your\ndoorstep.'),
        {
          id: `${P}-s5-divider1`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '分隔线1' },
          wrapperStyle: {
            widthMode: 'fixed',
            width: '1px',
            heightMode: 'fill',
            backgroundColor: 'rgba(255,255,255,0.3)',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [],
        },
        benefitCard(`${P}-s5-benefit2`, '积分奖励权益', 'Get rewarded', 'Earn points on eligible\npurchases, then redeem for\nSamsung products & more.'),
        {
          id: `${P}-s5-divider2`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '分隔线2' },
          wrapperStyle: {
            widthMode: 'fixed',
            width: '1px',
            heightMode: 'fill',
            backgroundColor: 'rgba(255,255,255,0.3)',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [],
        },
        benefitCard(`${P}-s5-benefit3`, '分期付款权益', 'Pay later', 'Convenient financing\navailable with $0 down.'),
      ],
    },
  ];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '页脚模块', { bg: COLORS.gray, padTop: '32px', padBottom: '32px', borderRadius: '0' });
  sec.props.gap = '24px';
  sec.children = [
    {
      id: `${P}-s6-social-row`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '社交媒体图标行' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        socialIconBlock(`${P}-s6-social1`, 'Facebook', ICON['social-facebook']),
        socialIconBlock(`${P}-s6-social2`, 'Twitter', ICON['social-twitter']),
        socialIconBlock(`${P}-s6-social3`, 'Youtube', ICON['social-youtube']),
        socialIconBlock(`${P}-s6-social4`, 'Instagram', ICON['social-instagram']),
        socialIconBlock(`${P}-s6-social5`, 'LinkedIn', ICON['social-linkedin']),
      ],
    },
    textBlock(`${P}-s6-links`, '页脚链接', 'Contact Us | Privacy Policy | Legal | Unsubscribe | View In Browser', { fontSize: '14px', color: COLORS.textMuted }),
    textBlock(`${P}-s6-copyright`, '版权信息', '© 2021 Samsung Electronics Co., Ltd.', { fontSize: '14px', color: COLORS.textMuted }),
    textBlock(`${P}-s6-disclaimer1`, '库存提示', 'Quantities may be limited.', { fontSize: '12px', color: COLORS.textMuted }),
    textBlock(`${P}-s6-disclaimer2`, '修改权声明', 'Samsung reserves the right to modify pricing or promotions at any time, without prior notice.', { fontSize: '12px', color: COLORS.textMuted }),
    textBlock(`${P}-s6-disclaimer3`, '免责声明', 'Not responsible for errors and/or omissions.', { fontSize: '12px', color: COLORS.textMuted }),
    textBlock(`${P}-s6-subscription-notice`, '订阅说明', 'You received this email as a valued subscriber of Samsung updates and promotions.\nTo ensure delivery, please add MySamsung@email.samsungusa.com to your address book. Learn how.', { fontSize: '12px', color: COLORS.textMuted }),
    textBlock(`${P}-s6-no-reply`, '请勿回复说明', 'Please do not reply to this email. If you need to contact us with questions or feedback,\nplease contact Customer Service.', { fontSize: '12px', color: COLORS.textMuted }),
    textBlock(`${P}-s6-address`, '公司地址', 'Samsung Electronics America, 85 Challenger Road, Ridgefield Park, NJ 07660', { fontSize: '12px', color: COLORS.textMuted }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: '三星产品推广邮件模板',
      description: '三星热门产品推广，含相似推荐与全品类入口',
      tokens: {
        colors: { primary: COLORS.textDark, secondary: COLORS.black, surface: COLORS.gray },
        spacing: { section: '24px', gap: '16px', pageInline: '32px' },
        typography: { display: '36px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '16px', cta: '9999px' },
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
      backgroundColor: COLORS.gray,
      width: '600px',
      padding: { mode: 'unified', unified: '0' },
      border: borderNone(),
      gapMode: 'fixed',
      gap: '24px',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6()],
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
