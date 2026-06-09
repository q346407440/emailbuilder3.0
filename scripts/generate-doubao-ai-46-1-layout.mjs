#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 46 整段生成 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/ff92ebd7-19f0-49f4-a331-a9994218be9e/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/ff92ebd7-19f0-49f4-a331-a9994218be9e/layout-out";

const PEXELS = {
  "hero-banner": "https://images.pexels.com/photos/6567284/pexels-photo-6567284.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "product-ribbed-turtleneck-sweater": "https://images.pexels.com/photos/19469745/pexels-photo-19469745.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-embroidered-cat-pullover": "https://images.pexels.com/photos/6774347/pexels-photo-6774347.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-fleece-drop-sleeve-hoodie": "https://images.pexels.com/photos/6311613/pexels-photo-6311613.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-fleece-cargo-joggers": "https://images.pexels.com/photos/15759623/pexels-photo-15759623.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-pleated-twist-front-cami": "https://images.pexels.com/photos/16527704/pexels-photo-16527704.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-frayed-camo-print-jacket": "https://images.pexels.com/photos/16185661/pexels-photo-16185661.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "social-instagram": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
  "social-youtube": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/youtube.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "social-twitter": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/twitter.svg",
  "social-snapchat": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/google.svg",
  "social-tiktok": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/tiktok.svg",
  "badge-app-store": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/apple.svg",
  "badge-google-play": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/googleplay.svg",
};
const COLORS = {
  primary: '#000000',
  secondary: '#FFDD00',
  surface: '#FFFFFF',
  lightBlue: '#E0F0FF',
  lightYellow: '#FFF9E0',
  black: '#000000',
  white: '#FFFFFF',
  purple: '#C7A0D9',
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
    borderRadius = '0px',
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
    bg = COLORS.surface,
    textColor = COLORS.primary,
    fontSize = '16px',
    radius = '0px',
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

function imageContainer(id, name, src, alt, height, overlayChildren, alignH, alignV) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'hug',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0px' },
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0px' },
      },
    },
    children: overlayChildren,
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

function productCardVertical(id, name, productName, price, rating, src, alt) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '竖向商品卡片' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '180px',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0px' },
    },
    children: [
      imageContainer(`${id}-img`, productName, src, alt, '240px', [], 'center', 'top'),
      textBlock(`${id}-name`, '商品名称', productName, { fontSize: '12px', bold: true }),
      textBlock(`${id}-rating`, '评分', rating, { fontSize: '14px', color: COLORS.secondary }),
      textBlock(`${id}-price`, '价格', price, { fontSize: '14px' }),
      buttonBlock(`${id}-cta`, '查看按钮', 'CHECK IT OUT', { fontSize: '12px', textColor: COLORS.white, bg: COLORS.black }),
    ],
  };
}

function productCardHorizontal(id, name, productName, price, rating, src, alt) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '横向商品卡片' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0px' },
    },
    children: [
      {
        id: `${id}-img-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '商品图容器' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '280px',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0px' },
        },
        children: [
          imageContainer(`${id}-img`, productName, src, alt, '280px', [], 'center', 'top'),
        ],
      },
      {
        id: `${id}-info-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '商品信息容器' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fill',
          heightMode: 'hug',
          backgroundColor: COLORS.lightYellow,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0px' },
        },
        children: [
          textBlock(`${id}-name`, '商品名称', productName, { fontSize: '12px', bold: true }),
          textBlock(`${id}-rating`, '评分', rating, { fontSize: '14px', color: COLORS.secondary }),
          textBlock(`${id}-price`, '价格', price, { fontSize: '14px' }),
          buttonBlock(`${id}-cta`, '查看按钮', 'CHECK IT OUT', { fontSize: '12px', textColor: COLORS.white, bg: COLORS.black }),
        ],
      },
    ],
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部导航栏', { padTop: '20px', padBottom: '20px' });
  sec.children = [
    textBlock(`${P}-s1-logo`, '品牌Logo', 'FOREVER 21', { fontSize: '48px', bold: true, color: COLORS.secondary }),
    textBlock(`${P}-s1-nav`, '导航栏', 'NEW ARRIVALS   WOMEN   PLUS   MEN   GIRLS   BEAUTY BY RileyRose   SALE   SPECIAL OFFERS', { fontSize: '10px' }),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '首屏横幅区', { bg: COLORS.lightBlue, padTop: '24px', padBottom: '24px' });
  sec.children = [
    textBlock(`${P}-s2-pretitle`, '副标题', 'COME ON BACK FOR SOMETHING SHINY AND NEW', { fontSize: '12px', bold: true }),
    textBlock(`${P}-s2-title`, '主标题', 'The hottest new arrivals are right here', { fontSize: '28px', bold: true }),
    textBlock(`${P}-s2-subtitle`, '描述文字', 'The stuff in your closet wants new friends', { fontSize: '14px' }),
    buttonBlock(`${P}-s2-cta`, '立即购买按钮', 'GET \'EM NOW', { bg: COLORS.black, textColor: COLORS.white, fontSize: '14px', pad: '12px 32px' }),
    imageContainer(`${P}-s2-img`, '首屏主图', PEXELS['hero-banner'], 'woman holding yellow forever 21 shopping bag', '320px', [], 'center', 'center'),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '热门新品区', { padTop: '32px', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s3-title`, '区域标题', 'WANNA LOOK AGAIN?', { fontSize: '14px', bold: true }),
    gridBlock(`${P}-s3-grid`, '新品网格', 3, [
      productCardVertical(`${P}-s3-p1`, '罗纹高领毛衣', 'RIBBED TURTLENECK SWEATER', '$ 18.00', '★★★★★', PEXELS['product-ribbed-turtleneck-sweater'], 'woman wearing white ribbed turtleneck sweater plaid skirt'),
      productCardVertical(`${P}-s3-p2`, '猫咪刺绣套头衫', 'EMBROIDERED CAT PULLOVER', '$ 19.99', '★★★★★', PEXELS['product-embroidered-cat-pullover'], 'woman wearing light purple embroidered cat pullover sweater'),
      productCardVertical(`${P}-s3-p3`, '抓绒落肩连帽衫', 'FLEECE DROP-SLEEVE HOODIE', '$ 14.00', '★★★★★', PEXELS['product-fleece-drop-sleeve-hoodie'], 'woman wearing beige fleece drop sleeve hoodie loungewear'),
    ], { gap: '20px' }),
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '为你推荐区', { padTop: '0', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s4-title`, '区域标题', 'PICKED JUST FOR YOU', { fontSize: '14px', bold: true }),
    productCardHorizontal(`${P}-s4-p1`, '抓绒工装慢跑裤', 'FLEECE CARGO JOGGERS', '$ 18.00', '★★★★★', PEXELS['product-fleece-cargo-joggers'], 'woman wearing beige fleece cargo joggers casual outfit'),
    productCardHorizontal(`${P}-s4-p2`, '扭结前短款吊带', 'PLEATED TWIST-FRONT CROPPED CAMI', '$ 14.00', '★★★★★', PEXELS['product-pleated-twist-front-cami'], 'woman wearing pink pleated twist front cropped cami top'),
    productCardHorizontal(`${P}-s4-p3`, '毛边迷彩印花夹克', 'FRAYED CAMO PRINT JACKET', '$ 34.99', '★★★★★', PEXELS['product-frayed-camo-print-jacket'], 'woman wearing frayed camo print jacket leather pants'),
  ];
  sec.props.gap = '16px';
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '分类导航区', { padTop: '20px', padBottom: '20px', stroke: { width: '1px', color: '#EEEEEE' } });
  sec.children = [
    textBlock(`${P}-s5-women`, '女装分类', 'SHOP WOMEN', { fontSize: '14px', bold: true }),
    textBlock(`${P}-s5-men`, '男装分类', 'SHOP MEN', { fontSize: '14px', bold: true }),
    textBlock(`${P}-s5-plus`, '大码分类', 'SHOP PLUS + CURVE', { fontSize: '14px', bold: true }),
    textBlock(`${P}-s5-girls`, '女童分类', 'SHOP GIRLS', { fontSize: '14px', bold: true }),
    textBlock(`${P}-s5-accessories`, '配饰分类', 'SHOP ACCESSORIES', { fontSize: '14px', bold: true }),
    textBlock(`${P}-s5-beauty`, '美妆分类', 'SHOP BEAUTY', { fontSize: '14px', bold: true }),
  ];
  sec.props.gap = '16px';
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '服务信息栏', { bg: COLORS.black, padTop: '12px', padBottom: '12px', pageInline: false });
  sec.children = [
    textBlock(`${P}-s6-info`, '服务信息', 'FREE STANDARD SHIPPING (50+)   |   BUY NOW, PAY LATER WITH AFTERPAY', { color: COLORS.white, fontSize: '12px' }),
  ];
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '社交与下载区', { padTop: '24px', padBottom: '24px' });
  sec.children = [
    rowLayout(`${P}-s7-social`, '社交媒体图标', [
      iconBlock(`${P}-s7-ig`, 'Instagram图标', ICON['social-instagram']),
      iconBlock(`${P}-s7-yt`, 'Youtube图标', ICON['social-youtube']),
      iconBlock(`${P}-s7-fb`, 'Facebook图标', ICON['social-facebook']),
      iconBlock(`${P}-s7-twitter`, 'Twitter图标', ICON['social-twitter']),
      iconBlock(`${P}-s7-snap`, 'Snapchat图标', ICON['social-snapchat']),
      iconBlock(`${P}-s7-tiktok`, 'TikTok图标', ICON['social-tiktok']),
    ], { gap: '20px' }),
    sectionShell(`${P}-s7-app`, '应用下载栏', { bg: COLORS.purple, padTop: '12px', padBottom: '12px', pageInline: false, borderRadius: '0px' }),
  ];
  const appSec = sec.children.find(c => c.id === `${P}-s7-app`);
  appSec.children = [
    textBlock(`${P}-s7-app-text`, '下载提示', 'DOWNLOAD THE APP FOR 20% OFF YOUR FIRST\n$65+ IN-APP PURCHASE, USE CODE MVP20', { color: COLORS.black, fontSize: '12px', bold: true }),
    rowLayout(`${P}-s7-badges`, '应用商店徽章', [
      {
        id: `${P}-s7-apple`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: 'App Store徽章' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '120px',
          heightMode: 'fixed',
          height: '40px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0px' },
          backgroundImage: {
            src: ICON['badge-app-store'],
            alt: 'App Store',
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0px' },
          },
        },
      },
      {
        id: `${P}-s7-google`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: 'Google Play徽章' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'center' },
          widthMode: 'fixed',
          width: '120px',
          heightMode: 'fixed',
          height: '40px',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0px' },
          backgroundImage: {
            src: ICON['badge-google-play'],
            alt: 'Google Play',
            fit: 'contain',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0px' },
          },
        },
      },
    ], { gap: '16px' }),
  ];
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, '页脚信息区', { padTop: '20px', padBottom: '40px' });
  sec.children = [
    textBlock(`${P}-s8-logo`, '底部Logo', 'FOREVER 21', { fontSize: '24px', bold: true }),
    textBlock(`${P}-s8-locations`, '门店信息', 'STORE LOCATIONS & EVENTS', { fontSize: '12px', bold: true }),
    textBlock(`${P}-s8-terms`, '条款信息', `*20% Off Your First In-App Purchase of $65 or More: Offer valid through 12/31/2020 11:59 pm PST.
Receive 20% off your first in-app purchase when you spend $65 or more in one single transaction before
taxes. To redeem in-app on the Forever 21 app, enter code MVP20 at checkout. Cannot be combined with
any other offer (excluding shipping promotions). Excludes Riley Rose products, Barbie Collection, Loteria x
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

View this email in your browser`, { fontSize: '10px' }),
    textBlock(`${P}-s8-legal`, '法律信息', 'This email may be considered an advertising or promotional message.\nIf you no longer wish to receive these emails, unsubscribe using the link below.\n\nPlease do not reply to this email. Replies to this address cannot be serviced.\nTo ensure delivery, add Forever21@i.forever21.com to your address book.\n\nYou received this message because you\'ve registered or accepted our invitation\nto receive emails from Forever 21, or you\'ve made a purchase from Forever21.com.', { fontSize: '10px', bold: false }),
    textBlock(`${P}-s8-unsubscribe`, '退订链接', 'Unsubscribe', { fontSize: '10px', decoration: 'underline' }),
    textBlock(`${P}-s8-copyright`, '版权信息', 'Forever 21, Inc. 3880 N Mission Road Los Angeles, CA 90031', { fontSize: '10px' }),
  ];
  sec.props.gap = '16px';
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Forever 21 新品邮件模板',
      description: 'Forever 21 新品推广邮件模板，包含首屏横幅、热门新品、为你推荐、分类导航等模块',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '48px', h1: '28px', body: '16px', caption: '10px' },
        radius: { panel: '0px', cta: '0px' },
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
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7(), buildS8()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

