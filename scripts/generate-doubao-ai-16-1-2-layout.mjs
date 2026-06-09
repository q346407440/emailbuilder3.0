#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = "ai";
const P = "ai";
const displayName = "模板 16 整段生成 1";
const DESIGN_SRC = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/b594c192-c28f-4caf-8612-3080aa081194/design.png";
const DESIGN_DST = "/Users/hengliheng/Easy-Email/public/test-assets/ai-design.png";
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = "/Users/hengliheng/Easy-Email/data/emails/ai/.ai-staging/b594c192-c28f-4caf-8612-3080aa081194/layout-out";

const PEXELS = {
  hero: "https://images.pexels.com/photos/5482774/pexels-photo-5482774.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "guide-thumbnail": "https://images.pexels.com/photos/13604199/pexels-photo-13604199.jpeg?auto=compress&cs=tinysrgb&h=130",
  "product-joint-supplement": "https://images.pexels.com/photos/2671944/pexels-photo-2671944.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc1": "https://images.pexels.com/photos/12336479/pexels-photo-12336479.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc2": "https://images.pexels.com/photos/23523315/pexels-photo-23523315.png?auto=compress&cs=tinysrgb&h=130",
  "ugc3": "https://images.pexels.com/photos/19676044/pexels-photo-19676044.jpeg?auto=compress&cs=tinysrgb&h=130",
  "vet-testimonial1": "https://images.pexels.com/photos/15551426/pexels-photo-15551426.jpeg?auto=compress&cs=tinysrgb&h=130",
  "vet-testimonial2": "https://images.pexels.com/photos/32788235/pexels-photo-32788235.jpeg?auto=compress&cs=tinysrgb&h=130",
  "dog-playing": "https://images.pexels.com/photos/32383212/pexels-photo-32383212.jpeg?auto=compress&cs=tinysrgb&h=350",
  "guarantee-illustration": "https://images.pexels.com/photos/28452384/pexels-photo-28452384.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "icon-guarantee": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/calendar-check.svg",
  "icon-subscribe": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/stack.svg",
  "icon-customers": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/paw.svg",
  "social-facebook": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "social-instagram": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
};
const COLORS = {
  primary: '#1E3A33',
  secondary: '#A8E639',
  surface: '#F8F1E9',
  surfaceDark: '#1E3A33',
  textLight: '#FFFFFF',
  textDark: '#1E3A33',
  border: '#1E3A33',
  star: '#A8E639',
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
    color = COLORS.textDark,
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
    bg = COLORS.surfaceDark,
    textColor = COLORS.textLight,
    fontSize = '16px',
    radius = '9999px',
    widthMode = 'fixed',
    width = '240px',
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
  const { size = '32px', color = COLORS.primary } = opts;
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

function coverImage(id, name, src, alt, height, opts = {}) {
  const { borderRadius = '0px' } = opts;
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
      borderRadius: { mode: 'unified', radius: borderRadius },
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: borderRadius },
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

function imageContainer(id, name, src, alt, height, overlayChildren, alignH, alignV, opts = {}) {
  const { borderRadius = '0px' } = opts;
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
      borderRadius: { mode: 'unified', radius: borderRadius },
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: borderRadius },
      },
    },
    children: overlayChildren,
  };
}

function productRow(id, name, imgSrc, imgAlt, title) {
  const row = rowLayout(id, name, [], { gap: '16px', alignH: 'left', alignV: 'center' });
  const image = {
    id: `${id}-img`,
    type: 'image',
    blockMeta: { blockType: 'content.image', name: '产品图' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fixed',
      width: '100px',
      heightMode: 'fixed',
      height: '120px',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0px' },
      backgroundImage: {
        src: imgSrc,
        alt: imgAlt,
        fit: 'contain',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0px' },
      },
    },
    children: [],
  };
  const text = textBlock(`${id}-text`, '产品标题', title, { alignH: 'left', bold: false, decoration: 'underline' });
  row.children = [image, text];
  return row;
}

function ugcCard(id, name, imgSrc, imgAlt, title, content, author) {
  const card = sectionShell(id, name, { bg: '#FFFFFF', borderRadius: '8px', padTop: '0', padBottom: '16px', pageInline: false });
  const image = imageContainer(`${id}-img`, '用户晒图', imgSrc, imgAlt, '140px', [], 'center', 'top', { borderRadius: '8px 8px 0 0' });
  const titleText = textBlock(`${id}-title`, '评价标题', title, { fontSize: '14px', bold: true, alignH: 'left' });
  const contentText = textBlock(`${id}-content`, '评价内容', content, { fontSize: '12px', alignH: 'left' });
  const stars = textBlock(`${id}-stars`, '星级评分', '★★★★★', { fontSize: '14px', color: COLORS.star });
  const authorText = textBlock(`${id}-author`, '评价人', author, { fontSize: '12px', alignH: 'center' });
  card.children = [
    image,
    sectionShell(`${id}-content-wrap`, '评价内容容器', { pageInline: true, padTop: '8px', padBottom: '0' }),
  ];
  card.children[1].children = [titleText, contentText, stars, authorText];
  return card;
}

function vetTestimonialCard(id, name, imgSrc, imgAlt, quote, author, title) {
  const card = sectionShell(id, name, { bg: COLORS.surfaceDark, borderRadius: '8px', pageInline: false, padTop: '0', padBottom: '0' });
  const row = rowLayout(`${id}-row`, '评价行', [], { gap: '0', alignH: 'left', alignV: 'stretch' });
  const image = {
    id: `${id}-img`,
    type: 'image',
    blockMeta: { blockType: 'content.image', name: '兽医头像' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fixed',
      width: '180px',
      heightMode: 'fixed',
      height: '200px',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '8px 0 0 8px' },
      backgroundImage: {
        src: imgSrc,
        alt: imgAlt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '8px 0 0 8px' },
      },
    },
    children: [],
  };
  const contentWrap = sectionShell(`${id}-content`, '评价内容容器', { bg: COLORS.surfaceDark, borderRadius: '0 8px 8px 0', pageInline: true, padTop: '16px', padBottom: '16px' });
  const quoteMark = textBlock(`${id}-quote`, '引用标记', '“', { fontSize: '32px', color: COLORS.secondary, alignH: 'left', bold: true });
  const quoteText = textBlock(`${id}-text`, '评价内容', quote, { fontSize: '14px', color: COLORS.textLight, alignH: 'left' });
  const stars = textBlock(`${id}-stars`, '星级评分', '★★★★★', { fontSize: '14px', color: COLORS.star, alignH: 'left' });
  const authorText = textBlock(`${id}-author`, '评价人', author, { fontSize: '14px', color: COLORS.textLight, alignH: 'left', bold: true });
  const titleText = textBlock(`${id}-title`, '职称', title, { fontSize: '12px', color: COLORS.textLight, alignH: 'left' });
  contentWrap.children = [quoteMark, quoteText, stars, authorText, titleText];
  row.children = [image, contentWrap];
  card.children = [row];
  return card;
}

function featureCol(id, name, iconSrc, iconName, text) {
  const col = sectionShell(id, name, { bg: '#FFFFFF', padTop: '16px', padBottom: '16px' });
  const icon = iconBlock(`${id}-icon`, iconName, iconSrc, { size: '32px', color: COLORS.primary });
  const textEl = textBlock(`${id}-text`, '功能文本', text, { fontSize: '14px' });
  col.children = [icon, textEl];
  return col;
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '顶部导航栏', { bg: COLORS.surfaceDark, padTop: '16px', padBottom: '16px', pageInline: false });
  sec.children = [
    textBlock(`${P}-s1-logo`, '品牌logo', 'wuffes', { color: COLORS.secondary, bold: true, fontSize: '24px' }),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '首屏区域', { padTop: '0', padBottom: '32px' });
  sec.children = [
    coverImage(`${P}-s2-hero`, '首屏主图', PEXELS.hero, 'woman playing with dalmatian dog giving high five', '360px'),
    textBlock(`${P}-s2-title`, '主标题', "Don't forget to checkout so you can start improving your pup's health and mobility in as little as 3 weeks!*", { bold: true, fontSize: '24px' }),
    productRow(`${P}-s2-guide`, '关节健康指南产品', PEXELS['guide-thumbnail'], 'pet joint health guide ebook cover with dog', 'Joint Health Guide'),
    productRow(`${P}-s2-product`, '关节补充剂产品', PEXELS['product-joint-supplement'], 'green pet hip and joint support supplement jar for large dogs', 'Advanced Hip & Joint Support for Large Breeds'),
    buttonBlock(`${P}-s2-cta`, '结账按钮', 'CHECKOUT NOW'),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '用户信任区域', { padTop: '0', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s3-title`, '信任标题', "You're checking out Wuffes because you want the best for your pup and you're in the right place!", { bold: true, fontSize: '22px' }),
    textBlock(`${P}-s3-subtitle`, '信任说明', '99% of Wuffes joint chews customers saw improved mobility and decreased joint discomfort with 90 days of consistent use.*', { fontSize: '14px' }),
    gridBlock(`${P}-s3-ugc-grid`, '用户评价网格', 3, [
      ugcCard(`${P}-s3-ugc1`, '用户评价1', PEXELS.ugc1, 'white fluffy terrier dog outdoors happy', 'Our Georgina seems livelier than ever!', "This multivitamin works wonders, we've seen a huge improvement across energy levels, digestion (yep, no more runny poops) and overall happiness", 'Tanesha'),
      ugcCard(`${P}-s3-ugc2`, '用户评价2', PEXELS.ugc2, 'golden retriever dog playing in water', 'We started giving our Jason this multivitamin, AND the oil', "the Wuffes joint chews moves around with. If you have a big dog, have to give one chew a day. Super convenient, you can trust this product. I highly recommend!", 'Levi'),
      ugcCard(`${P}-s3-ugc3`, '用户评价3', PEXELS.ugc3, 'black and tan shepherd mix dog close up', 'Say goodbye to dry skin and dull fur!', 'We started giving Lucie this multivitamin about a couple of weeks ago and noticed less itching and way shinier fur even at 11 years old!', 'Mike'),
    ], { gap: '12px' }),
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '兽医推荐区域', { padTop: '0', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s4-title`, '兽医推荐标题', 'Recommended by Vets', { bold: true, fontSize: '22px' }),
    textBlock(`${P}-s4-subtitle1`, '兽医推荐说明1', 'Veterinarians across the nation are raving about the results they\'ve seen when recommending Wuffes products to their patients.', { fontSize: '14px' }),
    textBlock(`${P}-s4-subtitle2`, '兽医推荐说明2', 'Just imagine the results your pup could see to improve their quality of life.', { fontSize: '14px' }),
    vetTestimonialCard(`${P}-s4-testimonial1`, '兽医评价1', PEXELS['vet-testimonial1'], 'female veterinarian in white coat standing on farm', 'I 100% approve of the ingredients and the quality, and I haven\'t found one that I like any more than this. If you have a big dog, the other huge plus is that you only have to give one chew a day. Super convenient, you can trust this product. I highly recommend!', 'Dr. Carin Beene', 'DVM'),
    vetTestimonialCard(`${P}-s4-testimonial2`, '兽医评价2', PEXELS['vet-testimonial2'], 'female veterinarian smiling professional portrait', "I've had incredible results with my patients and with my own pet. There are higher concentrations of key ingredients that I recommend such as MSM and glucosamine.", 'Dr. Dawn Filos', 'DVM'),
  ];
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '狗狗玩耍展示区域', { padTop: '0', padBottom: '32px' });
  sec.children = [
    coverImage(`${P}-s5-img`, '狗狗玩耍图', PEXELS['dog-playing'], 'border collie dog playing catch frisbee on green grass lawn', '300px', { borderRadius: '12px' }),
  ];
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '保障区域', { padTop: '0', padBottom: '32px' });
  sec.children = [
    textBlock(`${P}-s6-title`, '保障标题', 'Our 90 Day Guarantee', { bold: true, fontSize: '22px' }),
    textBlock(`${P}-s6-subtitle`, '保障说明', 'With our 90-day money back guarantee, there is ZERO risk in trying out the brand trusted by thousands of pet parents, vets, and pet experts.', { fontSize: '14px' }),
    {
      id: `${P}-s6-illustration`,
      type: 'image',
      blockMeta: { blockType: 'content.image', name: '保障插画' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fixed',
        width: '300px',
        heightMode: 'fixed',
        height: '120px',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0px' },
        backgroundImage: {
          src: PEXELS['guarantee-illustration'],
          alt: 'cute running bulldog cartoon illustration',
          fit: 'contain',
          position: 'center',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0px' },
        },
      },
      children: [],
    },
    buttonBlock(`${P}-s6-cta`, '结账按钮', 'CHECKOUT NOW'),
    textBlock(`${P}-s6-disclaimer`, '免责说明', '*Based on an independent survey conducted in 2024 (n=200)', { fontSize: '12px' }),
  ];
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '功能特性区域', { bg: '#FFFFFF', padTop: '24px', padBottom: '24px' });
  sec.children = [
    textBlock(`${P}-s7-logo`, '底部品牌logo', 'wuffes', { color: COLORS.primary, bold: true, fontSize: '24px' }),
    gridBlock(`${P}-s7-features`, '功能特性网格', 3, [
      featureCol(`${P}-s7-feature1`, '90天保障', ICON['icon-guarantee'], '保障图标', '90 Day Guarantee'),
      featureCol(`${P}-s7-feature2`, '订阅优惠', ICON['icon-subscribe'], '订阅图标', 'Subscribe & Save'),
      featureCol(`${P}-s7-feature3`, '用户数', ICON['icon-customers'], '用户图标', '+770K Happy Pet Parents'),
    ], { gap: '24px' }),
  ];
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, '页脚区域', { bg: COLORS.surfaceDark, padTop: '16px', padBottom: '16px' });
  const socialRow = rowLayout(`${P}-s8-social`, '社交媒体行', [], { gap: '16px' });
  socialRow.children = [
    textBlock(`${P}-s8-fb`, 'Facebook链接', 'Facebook', { color: COLORS.secondary, fontSize: '12px' }),
    textBlock(`${P}-s8-fb-group`, 'Facebook群组链接', 'Facebook Group', { color: COLORS.secondary, fontSize: '12px' }),
    textBlock(`${P}-s8-ig`, 'Instagram链接', 'Instagram', { color: COLORS.secondary, fontSize: '12px' }),
    textBlock(`${P}-s8-website`, '官网链接', 'Website', { color: COLORS.secondary, fontSize: '12px' }),
  ];
  sec.children = [
    socialRow,
    textBlock(`${P}-s8-copyright`, '版权信息', '© 2025 wuffes. All Rights Reserved', { color: COLORS.textLight, fontSize: '12px' }),
    textBlock(`${P}-s8-address`, '地址', 'Wuffes 1603 Capital Ave Ste 31A, 125 Cheney, NY 82001', { color: COLORS.textLight, fontSize: '10px' }),
    textBlock(`${P}-s8-unsubscribe`, '退订说明', "No longer want to receive these emails? Unsubscribe", { color: COLORS.textLight, fontSize: '10px' }),
  ];
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: 'Wuffes Pet Health Template',
      description: 'Pet joint health supplement email template for Wuffes brand',
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

