import type { TokenPresetStandardTokens } from "../token-preset-contract";

/**
 * AI 以图还原邮件版式 —— 第 0 步「词汇表」机器真源。
 *
 * AI 只输出 {@link RestoreAstDocument}：`theme`（13 个标准 token 值）+ `tree`（语义 AST）。
 * 两块**只含语义，零结构**——没有 blockMeta / type / id / widthMode / heightMode /
 * contentAlign 对象 / border|padding|borderRadius 对象形态 / schemaVersion / tokenPresets 形态。
 * 这些结构字段一律由后续「组装器」（第 1 步）确定性派生，AI 没有输入入口。
 *
 * 设计文档：docs/AI以图还原-AST契约-第0步词汇表.md
 * token 档位真源：src/token-preset-contract/（本文件的字面量类型与之同源，由 tokens.test.ts 守卫防漂移）。
 */

// ── 令牌（参数范围 = token 档位）；字面量与 token-preset-contract 同源 ──────────────

/** 颜色档（= colors scales）。 */
export type ToneToken = "primary" | "accent" | "secondary" | "surface";
/** 字号档（= typography scales）。 */
export type RoleToken = "display" | "h1" | "body" | "caption";
/** 间距档（= spacing scales）。 */
export type SpaceToken = "section" | "gap" | "pageInline";
/** 圆角档（= radius scales）。 */
export type RadiusToken = "panel" | "cta";

// ── 像素级逃生口：强模型/保真模式可用 px/hex 覆盖档位，仍经组装器，产物形状不变 ──────

/** 原始像素值逃生口。 */
export type PxValue = { px: number };
/** 原始颜色值逃生口。 */
export type HexValue = { hex: string };

/** 字号：档位或原始 px。 */
export type Role = RoleToken | PxValue;
/** 颜色：档位或原始 hex。 */
export type Tone = ToneToken | HexValue;
/** 间距：档位或原始 px。 */
export type Space = SpaceToken | PxValue;
/** 圆角：档位或原始 px。 */
export type Radius = RadiusToken | PxValue;

// ── 结构枚举（AI 必须做的结构决策，收成安全形态）────────────────────────────────

/** 主轴分布（row 用）。 */
export type AlignMain = "start" | "center" | "end" | "between";
/** 交叉轴对齐（stack 用）。 */
export type AlignCross = "start" | "center" | "end";
/** 图标包。 */
export type IconPack = "tabler" | "simple-icons" | "lucide";
/** 图标尺寸档或原始 px。 */
export type IconSize = "sm" | "md" | "lg" | PxValue;
/** 分割线粗细档。 */
export type DividerThickness = "hairline" | "thin";
/** 按钮胶囊宽度（映射 `buttonStyle.widthMode`；外层 wrapper 恒 fill）。 */
export type ButtonWidth = "fill" | "hug";

// ── 共享外壳（box）：对应 wrapperStyle 的语义旋钮，仅暴露极少数档位 ────────────

/**
 * 盒子修饰：所有基元共享（stack / row / grid / image 等可挂 box 的节点）。
 * widthMode/heightMode/contentAlign 对象/border|padding|borderRadius **对象形态**不在此暴露；
 * `border` / `borderTone` 为**语义档**（非 template 对象），由组装器构造 wrapperStyle.border。
 */
export type Box = {
  /** 背景色。 */
  tone?: Tone;
  /** 圆角。 */
  radius?: Radius;
  /** 内边距（统一四向）。 */
  pad?: Space;
  /**
   * 描边样式（**可选**；省略 = 无描边）。
   * 主要用于 stack / row / grid 容器；设计稿有明显边框/虚线框时才写。
   */
  border?: BorderStyleToken;
  /** 描边颜色档；省略时组装器默认 `secondary`。 */
  borderTone?: Tone;
};

/** 容器描边语义档（非 template border 对象）。 */
export type BorderStyleToken = "hairline" | "dashed-hairline" | "thin";

// ── 节点（9 基元 + email 根）；判别字段 `t` ─────────────────────────────────────

/** 邮件根。 */
export type EmailNode = { t: "email"; children: RestoreNode[] };

/** 纵向容器（→ layout.container 竖排）。 */
export type StackNode = {
  t: "stack";
  children: RestoreNode[];
  /** 业务模块名（编辑器区块树）；email 直接子 stack 建议必填。 */
  title?: string;
  gap?: Space;
  align?: AlignCross;
  box?: Box;
};

/** 横向容器（→ layout.container 横排）。方向由基元名承担，非参数。 */
export type RowNode = {
  t: "row";
  children: RestoreNode[];
  title?: string;
  gap?: Space;
  /** 主轴（水平）对齐。 */
  align?: AlignMain;
  /**
   * 交叉轴（竖直）对齐；省略 = `start`（贴顶）。
   * 左图右文且右侧相对图片竖直居中 → `center`。
   */
  crossAlign?: AlignCross;
  box?: Box;
};

/** 栅格（→ layout.grid）。children = 每格直接内容（stack / row / 叶子等），与 grid 一一对应落盘。 */
export type GridNode = {
  t: "grid";
  /** 列数，范围见 {@link GRID_MIN_COLUMNS}..{@link GRID_MAX_COLUMNS}。 */
  columns: number;
  children: RestoreNode[];
  title?: string;
  gap?: Space;
  box?: Box;
  /**
   * 格内商品图统一高度（px）。写了则本 grid 下所有 image 一律用此高度，忽略各 image.height；
   * 未写则各 image 自行 height（缺省 240）。
   */
  cellImageHeight?: PxValue;
};

/** 文本（→ content.text）。 */
export type TextNode = {
  t: "text";
  content: string;
  role: Role;
  tone?: Tone;
  bold?: boolean;
  italic?: boolean;
  /**
   * 水平对齐（可选）；省略 = 继承直接父 stack 的 `align`（非 stack 子级默认居中）。
   * 同 stack 内标题居中、正文左对齐等混排时，逐条写 `align`。
   */
  align?: AlignCross;
};

/** 宽:高 比例（row 内缩略图可选；组装器据此算 fixed 宽）。 */
export type AspectRatio = { w: number; h: number };

/** 图片（→ content.image，资源走 backgroundImage）。query 为搜索意图，非 URL。 */
export type ImageNode = {
  t: "image";
  query: string;
  /** 视觉高度（px）；通栏/栅格内宽由组装器 fill；row 内配合 aspect 算 fixed 宽。 */
  height?: PxValue;
  /** 宽:高 比例；横排 row 内缩略图建议填写（如竖图 `{ w: 3, h: 4 }`）。 */
  aspect?: AspectRatio;
  /** 标记必需资产（如品牌图），搜不到则报错。 */
  required?: boolean;
  box?: Box;
  /**
   * 叠放层在底图盒内的水平对齐（仅 `children` 非空时生效）。
   * 与 `crossAlign` 组合成九宫格定位（见 `mapImageOverlayAlign`）。
   */
  align?: AlignCross;
  /**
   * 叠放层在底图盒内的竖直对齐（仅 `children` 非空时生效，**可选**）。
   * 省略 = `center`（竖直居中）；角标贴顶写 `start`，贴底写 `end`。
   */
  crossAlign?: AlignCross;
  /** 图上叠放内容。 */
  children?: RestoreNode[];
};

/** 图标（→ content.icon）。query 为搜索意图，非 URL。 */
export type IconNode = {
  t: "icon";
  query: string;
  pack: IconPack;
  tone?: Tone;
  size?: IconSize;
  required?: boolean;
};

/**
 * 按钮（→ action.button）。无 variant 体系：默认即项目标准 pill 按钮——
 * 背景绑 `colors.primary`（CTA 色）、圆角绑 `radius.cta`；需要时用 tone / radius 覆盖。
 */
export type ButtonNode = {
  t: "button";
  label: string;
  href?: string;
  /** 覆盖默认 CTA 背景色。 */
  tone?: Tone;
  /** 覆盖默认 radius.cta 圆角。 */
  radius?: Radius;
  /**
   * 胶囊本体宽度（→ `props.buttonStyle.widthMode`）。
   * 未写或 `hug`：小胶囊；`fill`：占满父内容区宽（通栏 CTA 条）。
   */
  width?: ButtonWidth;
};

/** 分割线（→ separator.divider）。 */
export type DividerNode = {
  t: "divider";
  tone?: Tone;
  thickness?: DividerThickness;
};

/** 进度条（→ indicator.progress）。 */
export type ProgressNode = {
  t: "progress";
  /** 0..100，范围见 {@link PROGRESS_MIN}..{@link PROGRESS_MAX}。 */
  value: number;
};

/** AST 节点判别联合。 */
export type RestoreNode =
  | EmailNode
  | StackNode
  | RowNode
  | GridNode
  | TextNode
  | ImageNode
  | IconNode
  | ButtonNode
  | DividerNode
  | ProgressNode;

/** 节点判别标签集合。 */
export type RestoreNodeTag = RestoreNode["t"];

// ── 顶层文档（AI 的完整输出形态）────────────────────────────────────────────────

/** 主题：13 个标准 token 值，AI 从设计图读出；直接 emit 为 tokenPresets.json。 */
export type RestoreTheme = TokenPresetStandardTokens;

/** AI 以图还原的完整输出：theme + tree。 */
export type RestoreAstDocument = {
  theme: RestoreTheme;
  tree: EmailNode;
};

// ── 数值范围常量 ────────────────────────────────────────────────────────────────

export const GRID_MIN_COLUMNS = 1;
export const GRID_MAX_COLUMNS = 6;
export const PROGRESS_MIN = 0;
export const PROGRESS_MAX = 100;
