#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "engagement_behavior4_template20_doubao_v2";
const P = "engageme";
const displayName = "行为 4（模板 20 · 豆包手工还原 v2）";
const DESIGN_SRC = "/Users/hengliheng/Downloads/邮件学习模板/行为 4（模板 20）.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/engagement_behavior4_template20_doubao_v2-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = join(EMAIL_DIR, 'layouts/default');

const PEXELS = {
  "hero-note20": "https://images.pexels.com/photos/34353879/pexels-photo-34353879.jpeg?auto=compress&cs=tinysrgb&h=350",
  "product-s20fe": "https://images.pexels.com/photos/34353879/pexels-photo-34353879.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-s20plus": "https://images.pexels.com/photos/34353879/pexels-photo-34353879.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "category-phones": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/device-mobile.svg",
  "category-tv": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/device-tv.svg",
  "category-tablets-wearables": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/device-tablet.svg",
  "category-computing": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/device-laptop.svg",
  "category-appliances": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/fridge.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "social-twitter": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/twitter.svg",
  "social-youtube": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/youtube.svg",
  "social-instagram": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
  "social-linkedin": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/linkedin.svg",
};
const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  gray: '#E5E5E5',
  textGray: '#666666',
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
    bg = COLORS.white,
    pageInline = true,
    padTop = '32px',
    padBottom = themeRef('tokens.spacing.section'),
    borderRadius = themeRef('tokens.radius.panel'),
  } = opts;
  const padding = pageInline
    ? {
        mode: 'separate',
        top: padTop,
        right: themeRef('tokens.spacing.pageInline'),
        bottom: padBottom,
        left: themeRef('tokens.spacing.pageInline'),
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
  if (borderRadius?.$themeRef) {
    Object.assign(bindings, themeBinding('wrapperStyle.borderRadius.radius', 'tokens.radius.panel'));
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
    fontSize = themeRef('tokens.typography.body'),
    color = themeRef('colors.primary'),
    fontSizePath = 'tokens.typography.body',
    colorPath = 'colors.primary',
    bold = false,
    widthMode = 'fill',
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
      decoration: 'none',
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
    bg = COLORS.white,
    textColor = COLORS.black,
    fontSize = themeRef('tokens.typography.body'),
    fontSizePath = 'tokens.typography.body',
    radius = themeRef('tokens.radius.cta'),
    radiusPath = 'tokens.radius.cta',
    width = '160px',
    height = '44px',
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
        bold: false,
        italic: false,
        border: { mode: 'unified', width: '1px', style: 'solid', color: textColor },
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
  const { size = '32px', color = COLORS.black } = opts;
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

function productCard(id, name, productName, imageSrc, imageAlt) {
  const card = {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
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
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: '200px',
          heightMode: 'fixed',
          height: '240px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
          backgroundImage: {
            src: imageSrc,
            alt: imageAlt,
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
        },
      },
      textBlock(`${id}-name`, `${productName}名称`, productName, { bold: true, widthMode: 'hug' }),
      buttonBlock(`${id}-cta`, `${productName}购买按钮`, 'BUY NOW', { width: '140px', height: '40px' }),
    ],
  };
  return card;
}

function categoryItem(id, name, iconSrc, label) {
  const item = {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      iconBlock(`${id}-icon`, `${label}图标`, iconSrc, { size: '32px' }),
      textBlock(`${id}-label`, `${label}名称`, label, { fontSize: '14px', widthMode: 'hug' }),
    ],
  };
  return item;
}

function benefitItem(id, name, title, desc) {
  const item = {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      padding: { mode: 'unified', unified: '0' },
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(`${id}-title`, `${title}标题`, title, { color: COLORS.white, bold: true, fontSize: '18px' }),
      textBlock(`${id}-desc`, `${title}描述`, desc, { color: COLORS.white, fontSize: '12px' }),
    ],
  };
  return item;
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '头部导航栏', { padTop: '16px', padBottom: '16px', bg: COLORS.black, borderRadius: '16px 16px 0 0' });
  sec.props.gap = '0';
  sec.children = [
    textBlock(`${P}-s1-logo`, '三星Logo', 'SΛMSUNG', { color: COLORS.white, bold: true, fontSize: '24px' }),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '主推Note20模块', { padTop: '24px' });
  sec.children = [
    textBlock(`${P}-s2-title1`, '主标题第一行', 'High in demand.', { fontSize: themeRef('tokens.typography.h1'), fontSizePath: 'tokens.typography.h1', bold: true }),
    textBlock(`${P}-s2-title2`, '主标题第二行', 'Even higher in value.', { fontSize: themeRef('tokens.typography.h1'), fontSizePath: 'tokens.typography.h1', bold: true }),
    textBlock(`${P}-s2-subtitle`, '副标题', 'Come back and see if there are new ways to save\non your next favorite product.', { fontSize: '16px' }),
    {
      id: `${P}-s2-product`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: 'Note20产品区' },
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
          id: `${P}-s2-img`,
          type: 'image',
          blockMeta: { blockType: 'content.image', name: 'Note20产品图' },
          wrapperStyle: {
            contentAlign: { horizontal: 'center', vertical: 'top' },
            widthMode: 'fixed',
            width: '240px',
            heightMode: 'fixed',
            height: '280px',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
            backgroundImage: {
              src: PEXELS['hero-note20'],
              alt: 'Galaxy Note20 5G',
              fit: 'contain',
              position: 'center',
              border: borderNone(),
              borderRadius: { mode: 'unified', radius: '0' },
            },
          },
        },
        textBlock(`${P}-s2-product-name`, 'Note20产品名称', 'Galaxy Note20 5G', { bold: true, widthMode: 'hug' }),
        buttonBlock(`${P}-s2-cta`, 'Note20购买按钮', 'BUY NOW'),
      ],
    },
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '相似产品推荐模块');
  sec.children = [
    textBlock(`${P}-s3-title1`, '推荐标题第一行', 'Not the perfect fit?', { fontSize: '20px', bold: true }),
    textBlock(`${P}-s3-title2`, '推荐标题第二行', 'Shop similar must-have products.', { fontSize: '20px', bold: true }),
    {
      id: `${P}-s3-products-row`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '相似产品行' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '32px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        padding: { mode: 'unified', unified: '0' },
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        productCard(`${P}-s3-card1`, 'S20 FE产品卡', 'Galaxy S20 FE 5G', PEXELS['product-s20fe'], 'Galaxy S20 FE 5G'),
        productCard(`${P}-s3-card2`, 'S20+产品卡', 'Galaxy S20+ 5G', PEXELS['product-s20plus'], 'Galaxy S20+ 5G'),
      ],
    },
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '全品类导航模块');
  sec.children = [
    textBlock(`${P}-s4-title`, '品类标题', 'Or discover our latest offers', { fontSize: '20px', bold: true }),
    {
      id: `${P}-s4-categories-row`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '品类导航行' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '32px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        padding: { mode: 'unified', unified: '0' },
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        categoryItem(`${P}-s4-cat1`, '手机品类', ICON['category-phones'], 'Phones'),
        categoryItem(`${P}-s4-cat2`, '电视品类', ICON['category-tv'], 'TV & Home\nTheater'),
        categoryItem(`${P}-s4-cat3`, '平板穿戴品类', ICON['category-tablets-wearables'], 'Tablets &\nWearables'),
        categoryItem(`${P}-s4-cat4`, '电脑品类', ICON['category-computing'], 'Computing'),
        categoryItem(`${P}-s4-cat5`, '家电品类', ICON['category-appliances'], 'Appliances &\nSmarthome'),
      ],
    },
  ];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '服务权益模块', { bg: COLORS.black, borderRadius: '0 0 16px 16px', padBottom: '32px' });
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
        padding: { mode: 'unified', unified: '0' },
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        {
          id: `${P}-s5-divider1`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '分隔线1容器' },
          props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
          wrapperStyle: {
            contentAlign: { horizontal: 'center', vertical: 'center' },
            widthMode: 'hug',
            heightMode: 'fill',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            {
              id: `${P}-s5-divider1-line`,
              type: 'layout',
              blockMeta: { blockType: 'layout.container', name: '分隔线1' },
              props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
              wrapperStyle: {
                widthMode: 'fixed',
                width: '1px',
                heightMode: 'fixed',
                height: '80px',
                backgroundColor: COLORS.white,
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '0' },
              },
              children: [],
            },
          ],
        },
        benefitItem(`${P}-s5-benefit1`, '免费配送权益', 'Free shipping', 'Get your favorite items,\ndelivered right to your\ndoorstep.'),
        {
          id: `${P}-s5-divider2`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '分隔线2容器' },
          props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
          wrapperStyle: {
            contentAlign: { horizontal: 'center', vertical: 'center' },
            widthMode: 'hug',
            heightMode: 'fill',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            {
              id: `${P}-s5-divider2-line`,
              type: 'layout',
              blockMeta: { blockType: 'layout.container', name: '分隔线2' },
              props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
              wrapperStyle: {
                widthMode: 'fixed',
                width: '1px',
                heightMode: 'fixed',
                height: '80px',
                backgroundColor: COLORS.white,
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '0' },
              },
              children: [],
            },
          ],
        },
        benefitItem(`${P}-s5-benefit2`, '积分奖励权益', 'Get rewarded', 'Earn points on eligible\npurchases, then redeem for\nSamsung products & more.'),
        {
          id: `${P}-s5-divider3`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '分隔线3容器' },
          props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
          wrapperStyle: {
            contentAlign: { horizontal: 'center', vertical: 'center' },
            widthMode: 'hug',
            heightMode: 'fill',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            {
              id: `${P}-s5-divider3-line`,
              type: 'layout',
              blockMeta: { blockType: 'layout.container', name: '分隔线3' },
              props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
              wrapperStyle: {
                widthMode: 'fixed',
                width: '1px',
                heightMode: 'fixed',
                height: '80px',
                backgroundColor: COLORS.white,
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '0' },
              },
              children: [],
            },
          ],
        },
        benefitItem(`${P}-s5-benefit3`, '延期付款权益', 'Pay later', 'Convenient financing\navailable with $0 down.'),
      ],
    },
  ];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '页脚模块', { bg: COLORS.gray, padTop: '24px' });
  sec.props.gap = '16px';
  sec.children = [
    {
      id: `${P}-s6-social-row`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '社媒图标行' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        padding: { mode: 'unified', unified: '0' },
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        iconBlock(`${P}-s6-social1`, 'Facebook图标', ICON['social-facebook'], { size: '24px', color: COLORS.textGray }),
        iconBlock(`${P}-s6-social2`, 'Twitter图标', ICON['social-twitter'], { size: '24px', color: COLORS.textGray }),
        iconBlock(`${P}-s6-social3`, 'YouTube图标', ICON['social-youtube'], { size: '24px', color: COLORS.textGray }),
        iconBlock(`${P}-s6-social4`, 'Instagram图标', ICON['social-instagram'], { size: '24px', color: COLORS.textGray }),
        iconBlock(`${P}-s6-social5`, 'LinkedIn图标', ICON['social-linkedin'], { size: '24px', color: COLORS.textGray }),
      ],
    },
    textBlock(`${P}-s6-links`, '页脚链接', 'Contact Us | Privacy Policy | Legal | Unsubscribe | View In Browser', { fontSize: '12px', color: COLORS.textGray }),
    textBlock(`${P}-s6-copyright`, '版权声明', '© 2021 Samsung Electronics Co., Ltd.', { fontSize: '12px', color: COLORS.textGray }),
    textBlock(`${P}-s6-disclaimer1`, '库存声明', 'Quantities may be limited.', { fontSize: '12px', color: COLORS.textGray }),
    textBlock(`${P}-s6-disclaimer2`, '定价声明', 'Samsung reserves the right to modify pricing or promotions at any time, without prior notice.', { fontSize: '12px', color: COLORS.textGray }),
    textBlock(`${P}-s6-disclaimer3`, '错误声明', 'Not responsible for errors and/or omissions.', { fontSize: '12px', color: COLORS.textGray }),
    textBlock(`${P}-s6-subscribe-note`, '订阅说明', 'You received this email as a valued subscriber of Samsung updates and promotions.\nTo ensure delivery, please add MySamsung@email.samsungusa.com to your address book. Learn how.', { fontSize: '12px', color: COLORS.textGray }),
    textBlock(`${P}-s6-reply-note`, '回复说明', 'Please do not reply to this email. If you need to contact us with questions or feedback,\nplease contact Customer Service.', { fontSize: '12px', color: COLORS.textGray }),
    textBlock(`${P}-s6-address`, '公司地址', 'Samsung Electronics America, 85 Challenger Road, Ridgefield Park, NJ 07660', { fontSize: '12px', color: COLORS.textGray }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Samsung High Demand Promotion',
      description: 'Samsung product promotion email template for high demand devices',
      tokens: {
        colors: { primary: COLORS.black, secondary: COLORS.white, surface: COLORS.gray },
        spacing: { section: '24px', gap: '16px', pageInline: '24px' },
        typography: { display: '32px', h1: '28px', body: '14px', caption: '12px' },
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
      gap: '16px',
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

