#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 61 底稿 patch 豆包还原测试 3（5.5 修复后）";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/46cc6aca-cbe1-4c9c-b148-801222844dfd/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/46cc6aca-cbe1-4c9c-b148-801222844dfd/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/15981465/pexels-photo-15981465.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
};

const ICON = {
  "adidasLogo": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/google.svg",
  "adidasAppIcon": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/google.svg",
  "instagramIcon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-instagram.svg",
  "youtubeIcon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-youtube.svg",
  "twitterIcon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-x.svg",
  "pinterestIcon": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/brand-pinterest.svg",
};
const COLORS = {
  primary: '#000000',
  secondary: '#F5F3EE',
  surface: '#FFFFFF',
  white: '#FFFFFF'
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
    ? { mode: 'separate', top: padTop, right: '24px', bottom: padBottom, left: '24px' }
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
      border: borderNone(),
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
    decoration = 'none'
  } = opts;
  return {
    id,
    type: 'text',
    blockMeta: { blockType: 'content.text', name },
    props: {
      textBody: { paragraphs: [{ runs: [{ text: content }] }] },

        decoration: 'none',
      fontSize,
      color,
      bold,
      italic: false,
      decoration,
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
    alignH = 'left',
    bg = COLORS.primary,
    textColor = COLORS.white,
    fontSize = '16px',
    radius = '0',
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
  const { size = '32px', color = COLORS.primary, wrapperStyle = {} } = opts;
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
      ...wrapperStyle
    },
  };
}

function imageContainer(id, name, src, alt, height, overlayChildren, alignH, alignV) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
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
    children: overlayChildren,
  };
}

function rowLayout(id, name, children, opts = {}) {
  const { gap = '16px', alignH = 'center', alignV = 'center' } = opts;
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

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部提示与导航栏', { padTop: '12px', padBottom: '0', pageInline: true });
  
  const topHint = rowLayout(`${P}-s1-top-hint`, '顶部提示行', [
    textBlock(`${P}-s1-hint-left`, '左侧提示', 'You can still get a voucher on your next purchase.', {
      fontSize: '12px',
      decoration: 'underline',
      widthMode: 'hug'
    }),
    textBlock(`${P}-s1-hint-right`, '右侧查看邮件', 'View this email online', {
      fontSize: '12px',
      decoration: 'underline',
      widthMode: 'hug'
    })
  ], { alignH: 'space-between', gap: '0' });
  
  const navBar = rowLayout(`${P}-s1-navbar`, '导航栏', [
    iconBlock(`${P}-s1-logo`, '阿迪达斯Logo', ICON["adidasLogo"], {
      size: '32px',
      color: COLORS.white
    }),
    textBlock(`${P}-s1-nav-men`, '男士导航', 'MEN', {
      color: COLORS.white,
      bold: true,
      widthMode: 'hug',
      fontSize: '14px'
    }),
    textBlock(`${P}-s1-nav-women`, '女士导航', 'WOMEN', {
      color: COLORS.white,
      bold: true,
      widthMode: 'hug',
      fontSize: '14px'
    }),
    textBlock(`${P}-s1-nav-kids`, '儿童导航', 'KIDS', {
      color: COLORS.white,
      bold: true,
      widthMode: 'hug',
      fontSize: '14px'
    }),
    textBlock(`${P}-s1-nav-store`, '门店查找', 'STORE FINDER', {
      color: COLORS.white,
      bold: true,
      widthMode: 'hug',
      fontSize: '14px'
    })
  ], { gap: '24px', alignH: 'left' });

  navBar.wrapperStyle = { 
    ...navBar.wrapperStyle, 
    backgroundColor: COLORS.primary, 
    widthMode: 'fill', 
    heightMode: 'hug', 
    border: borderNone(), 
    borderRadius: { mode: 'unified', radius: '0' } 
  };

  sec.children = [topHint, navBar];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '头图区域', { padTop: '0', padBottom: '0', pageInline: false });
  
  const adiclubBadge = textBlock(`${P}-s2-adiclub`, 'Adiclub标识', 'adiclub', {
    color: COLORS.white,
    fontSize: '32px',
    bold: true,
    widthMode: 'hug',
    alignH: 'right'
  });
  adiclub.wrapperStyle.padding = { mode: 'separate', top: '24px', right: '24px', bottom: '0', left: '0' };

  const heroImg = imageContainer(
    `${P}-s2-hero`,
    '首屏人物头图',
    PEXELS.hero,
    'two happy young people wearing adidas sportswear laughing',
    '400px',
    [adiclubBadge],
    'right',
    'top'
  );

  sec.children = [heroImg];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '生日优惠券提示区', { padTop: '32px', padBottom: '32px' });
  
  sec.children = [
    textBlock(`${P}-s3-title`, '优惠券标题', 'YOUR BIRTHDAY VOUCHER IS STILL HERE', {
      fontSize: '40px',
      bold: true,
      alignH: 'left'
    }),
    textBlock(`${P}-s3-desc1`, '祝福说明', 'We hope you\'ve had an unforgettable birthday. And remember, you can still get 15% off your next order.', {
      fontSize: '16px'
    }),
    textBlock(`${P}-s3-desc2`, '引导文案', 'Head over to our website and find what\'s next', {
      fontSize: '16px'
    }),
    buttonBlock(`${P}-s3-cta`, '立即购买按钮', 'SHOP NOW →', {
      fontSize: '16px',
      width: '200px'
    })
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '优惠码兑换区', { padTop: '32px', padBottom: '32px', bg: COLORS.secondary });
  
  const codeRow = rowLayout(`${P}-s4-code-row`, '优惠码行', [
    {
      id: `${P}-s4-code-box`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '优惠码容器' },
      wrapperStyle: {
        widthMode: 'fixed',
        width: '200px',
        heightMode: 'hug',
        backgroundColor: COLORS.white,
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s4-code`, '优惠码', 'BDAY-SMLS-DVS', {
          alignH: 'center',
          bold: true
        })
      ]
    },
    buttonBlock(`${P}-s4-cta`, '兑换按钮', 'REDEEM ONLINE →', {
      width: '240px'
    })
  ], { alignH: 'left', gap: '16px' });

  sec.children = [
    textBlock(`${P}-s4-title`, '折扣标题', '15% OFF. JUST FOR YOU.', {
      fontSize: '40px',
      bold: true,
      alignH: 'left'
    }),
    textBlock(`${P}-s4-desc1`, '兑换说明', 'To redeem offer, enter promo code below during online checkout.', {
      fontSize: '16px'
    }),
    textBlock(`${P}-s4-desc2`, '有效期说明', 'Limited time offer valid until October 08, 2025.', {
      fontSize: '16px',
      italic: true
    }),
    codeRow
  ];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, 'App推广区', { padTop: '32px', padBottom: '32px', stroke: { width: '1px', color: COLORS.primary } });
  
  const appRow = rowLayout(`${P}-s5-app-row`, 'App推广行', [
    iconBlock(`${P}-s5-app-icon`, 'App图标', ICON["adidasAppIcon"], {
      size: '48px',
      color: COLORS.white,
      wrapperStyle: {
        backgroundColor: COLORS.primary,
        borderRadius: { mode: 'unified', radius: '12px' }
      }
    }),
    {
      id: `${P}-s5-text-col`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: 'App文字列' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'left', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        textBlock(`${P}-s5-title`, 'App标题', 'THE WORLD OF ADIDAS APPS', {
          fontSize: '24px',
          bold: true
        }),
        textBlock(`${P}-s5-link`, '发现链接', 'DISCOVER', {
          fontSize: '20px',
          bold: true,
          decoration: 'underline'
        })
      ]
    }
  ], { alignH: 'left', gap: '24px' });

  sec.children = [appRow];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '社媒链接区', { padTop: '24px', padBottom: '24px', stroke: { width: '1px', color: COLORS.primary } });
  
  function socialIcon(id, name, src) {
    return {
      id,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: `${name}容器` },
      wrapperStyle: {
        widthMode: 'fixed',
        width: '48px',
        heightMode: 'fixed',
        height: '48px',
        border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.primary },
        borderRadius: { mode: 'unified', radius: '0' },
        contentAlign: { horizontal: 'center', vertical: 'center' }
      },
      children: [
        iconBlock(`${id}-icon`, name, src, { size: '24px' })
      ]
    };
  }

  const socialRow = rowLayout(`${P}-s6-social-row`, '社媒图标行', [
    socialIcon(`${P}-s6-ig`, 'Instagram图标', ICON["instagramIcon"]),
    socialIcon(`${P}-s6-yt`, 'Youtube图标', ICON["youtubeIcon"]),
    socialIcon(`${P}-s6-x`, 'Twitter图标', ICON["twitterIcon"]),
    socialIcon(`${P}-s6-pin`, 'Pinterest图标', ICON["pinterestIcon"])
  ], { gap: '32px' });

  sec.children = [socialRow];
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '页脚条款区', { padTop: '24px', padBottom: '24px' });
  
  const footerLinks = rowLayout(`${P}-s7-links`, '页脚功能链接', [
    textBlock(`${P}-s7-link-privacy`, '隐私声明', 'Privacy Statement', { fontSize: '12px', widthMode: 'hug' }),
    textBlock(`${P}-s7-link-support`, '支持', 'Support', { fontSize: '12px', widthMode: 'hug' }),
    textBlock(`${P}-s7-link-account`, '我的账户', 'My Account', { fontSize: '12px', widthMode: 'hug' }),
    textBlock(`${P}-s7-link-unsubscribe`, '退订', 'Unsubscribe', { fontSize: '12px', widthMode: 'hug' }),
    textBlock(`${P}-s7-link-site`, '官网', 'adidas.com', { fontSize: '12px', widthMode: 'hug' })
  ], { gap: '16px', alignH: 'left' });

  sec.children = [
    footerLinks,
    textBlock(`${P}-s7-terms`, '活动规则', `*Limited time offer valid for 8 days from the date of this email. Discount applied to product price at checkout and gives maximum discount value of $400. Must be logged in to adiClub account for voucher to apply to purchase. Cannot be combined with other vouchers or discount codes. Not valid on adidas gift cards and select products. Valid on domestic US orders and participating US stores only. adidas reserves the right to end or change promotions at any time.`, {
      fontSize: '12px',
      color: '#666666'
    }),
    textBlock(`${P}-s7-copyright`, '版权信息', `© 2025 adidas America, Inc. adidas and the 3-Stripes mark are registered trademarks of adidas America 5055 N. Greeley Avenue Portland, OR 97217 www.adidas.com`, {
      fontSize: '12px',
      color: '#666666'
    })
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Adidas Birthday Voucher Template',
      description: 'Adidas birthday coupon promotion email template',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '24px' },
        typography: { display: '40px', h1: '32px', body: '16px', caption: '12px' },
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

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);

