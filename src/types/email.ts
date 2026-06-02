import type { CollectionDataSource } from "../payload-contract/collection-data-source";
import type { VisibilityRule } from "../visibility-contract/types";
import type { ThemeRef } from "./themeRef";

export type BindingMode = "literal" | "variable" | "theme" | "interpolate";

/**
 * 字段类别（来源胶囊体系核心约束）：
 * - style：样式类（颜色、字号、间距、圆角等），仅允许字面量 / theme。
 * - content：业务内容（文本、图片 URL、链接等），仅允许字面量 / variable / interpolate。
 * - structural：结构性配置（间距模式、布局方向等），仅允许字面量；不出胶囊。
 */
export type FieldKind = "style" | "content" | "structural";

/** 来源胶囊 UI 层枚举：interpolate 在 UI 上表达为「文中变量」。 */
export type FieldSource = "literal" | "theme" | "variable" | "inlineVariable";

export type BindingValueFormat = "email" | "url" | "phone" | "html";

/** 标量列类型；合法集合以 `src/payload-contract/value-types.ts` 为准；image 为存量兼容（等同 url） */
export type BindingCollectionScalarFieldValueType = "string" | "number" | "url" | "image";
export type BindingCollectionFieldValueType =
  | BindingCollectionScalarFieldValueType
  | "collection";

export type BindingCollectionScalarField = {
  key: string;
  label: string;
  valueType: BindingCollectionScalarFieldValueType;
  required?: boolean;
  placeholder?: string;
};

export type BindingCollectionNestedField = {
  key: string;
  label: string;
  valueType: "collection";
  required?: boolean;
  itemFields: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
  dataSource?: CollectionDataSource;
};

export type BindingCollectionField =
  | BindingCollectionScalarField
  | BindingCollectionNestedField;

export type BindingInterpolationSlotValueType = "string" | "url" | "image" | "color";

export type BindingInterpolationSlot = {
  slotId: string;
  valueType: BindingInterpolationSlotValueType;
  defaultValue?: string;
  allowExternal: true;
  label?: string;
  description?: string;
};

/**
 * BindingSpec：字段绑定规范，来源胶囊体系的核心数据。
 *
 * 字段分两类：
 * - 系统消费字段（必备）：mode / slotId / tokenPath / interpolationSlots / fieldKind / compound / fields / valueType / defaultValue / allowExternal
 * - 企业级 schema 元数据（前端 Inspector 渐进消费）：label / description / required / enum / min / max / format / groupTag
 */
export type BindingSpec = {
  /**
   * 唯一标识：variable 用外部 slot id；interpolate 用字段级 id；theme 沿用 tokenPath 便于反查；literal 通常不出现 binding。
   */
  slotId: string;
  mode: BindingMode;
  valueType?: string;
  defaultValue?: unknown;
  allowExternal?: boolean;
  /**
   * 当一个 payload 槽位承载对象或数组时，读取槽位内部的具体字段。
   * 例如 slotId=viewedItems、slotPath=0.imageSrc 会读取 payload.values.viewedItems[0].imageSrc。
   */
  slotPath?: string;
  /** valueType=collection 时，供变量赋值面板渲染数组编辑器。 */
  itemFields?: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;

  /** mode=theme 时引用的 token 路径，例如 "colors.brand" 或 "tokens.spacing.md" */
  tokenPath?: string;
  /** mode=interpolate 时，字段模板字符串中可外部赋值的原子变量定义。 */
  interpolationSlots?: BindingInterpolationSlot[];

  /** 字段分类（来源胶囊菜单选项判定） */
  fieldKind?: FieldKind;

  /** Phase E 组合 token：父级聚合多子字段 */
  compound?: boolean;
  /** compound=true 时聚合的子字段名（相对当前 bindPath 的子键） */
  fields?: string[];

  /** PayloadInspector 中文显示名（缺省回退 slotId） */
  label?: string;
  /** PayloadInspector hover 提示 */
  description?: string;
  /** 运营填值时强制校验 */
  required?: boolean;
  /** 值约束（渲染下拉） */
  enum?: unknown[];
  /** 数值或字符串长度下限 */
  min?: number;
  /** 数值或字符串长度上限 */
  max?: number;
  /** 显式声明 format=html 才允许 sanitize 后透传 HTML（Phase H.5） */
  format?: BindingValueFormat;
  /** PayloadInspector 分组标签 */
  groupTag?: string;
};

export type BlockBindings = Record<string, BindingSpec>;

export type RepeatFieldMapping = {
  id: string;
  /** collection 每一项中的字段路径，例如 title、imageSrc。 */
  sourcePath: string;
  /** 原型子树内被赋值的目标 block。 */
  targetBlockId: string;
  /** 目标 block 的具体字段路径，例如 props.content、wrapperStyle.backgroundImage.src。 */
  targetBindPath: string;
  label?: string;
  valueType?: BindingCollectionFieldValueType;
};

export type RepeatRegionBinding = {
  mode: "collection";
  slotId: string;
  /** 当前 collection 项中用于继续展开子列表的字段路径，例如 skus。 */
  itemPath?: string;
  /** 被按 collection 每一项复制的原型子树根节点。 */
  prototypeChildIds: string[];
  /** 解除列表绑定后恢复的静态子节点顺序。 */
  fallbackChildIds: string[];
  itemFields: BindingCollectionField[];
  /** collection 项字段到原型子树目标字段的显式映射。 */
  fieldMappings?: RepeatFieldMapping[];
  minItems?: number;
  maxItems?: number;
  label?: string;
  description?: string;
};

export type SpacingValue = {
  mode: "unified" | "separate";
  unified?: string | ThemeRef;
  top?: string | ThemeRef;
  right?: string | ThemeRef;
  bottom?: string | ThemeRef;
  left?: string | ThemeRef;
};

export type BorderStyle = "solid" | "dashed" | "dotted";

/** 描边：四边统一（覆盖 95% 场景） */
export type BorderUnified = {
  mode: "unified";
  width: string;
  style: BorderStyle;
  color: string;
};

/** 描边：颜色与样式四边通用，仅每边宽度独立（width: "0" 即不画该边） */
export type BorderCustom = {
  mode: "custom";
  style: BorderStyle;
  color: string;
  top: { width: string };
  right: { width: string };
  bottom: { width: string };
  left: { width: string };
};

export type BorderValue = BorderUnified | BorderCustom;

/** 圆角：四角统一 */
export type BorderRadiusUnified = {
  mode: "unified";
  radius: string;
};

/** 圆角：四角独立 */
export type BorderRadiusCorners = {
  mode: "corners";
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
};

export type BorderRadiusValue = BorderRadiusUnified | BorderRadiusCorners;

export type TextDecoration = "none" | "underline" | "line-through" | "overline";

/** 结构化正文中的最小片段：支持字符级样式与链接（相对区块默认样式的覆盖） */
export type TextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  decoration?: TextDecoration;
  /** 段内局部字色（字面量颜色值；不可绑 theme/variable，见 blockFieldClassification） */
  color?: string;
  /** 段内局部字号（如 `14px`；不可绑 theme/variable） */
  fontSize?: string;
  /** 非空时表示该片段为超链接（邮件场景常见：「在线查看」、段落内链） */
  link?: string;
};

export type TextParagraph = {
  runs: TextRun[];
};

/** 正文结构化模型：多段，每段由若干 run 组成（形态迭代由 template.schemaVersion + 迁移脚本负责，不在此嵌 version） */
export type TextBody = {
  paragraphs: TextParagraph[];
};

export type HorizontalAlign = "left" | "center" | "right";

/** 作为 flex/grid 子项时在父级交叉轴上的对齐；画布映射为 align-self */
export type SelfAlignCross = "stretch" | "start" | "center" | "end";

export type WrapperContentAlign = {
  horizontal?: HorizontalAlign;
  vertical?: "top" | "center" | "bottom";
};

/** 容器背景图上的叠放内容对齐（画布上映射为叠放层表格的 align / valign，语义与历史 flex 主轴/交叉轴一致） */
export type WrapperBackgroundContentAlign = {
  horizontal?: "left" | "center" | "right" | "stretch";
  vertical?: "top" | "center" | "bottom";
};

/** layout 容器背景图（底图 + 子区块叠放），替代原 overlay 区块类型 */
export type WrapperBackgroundImage = {
  src: string;
  alt?: string;
  link?: string;
  fit?: "cover" | "contain";
  position?: string;
  borderRadius?: BorderRadiusValue;
  border?: BorderValue;
};

/** 容器在父级中的宽度语义：跟随内容 / 铺满父级 / 固定尺寸 */
export type WrapperWidthMode = "hug" | "fill" | "fixed";
/** 容器在父级中的高度语义：跟随内容 / 铺满父级 / 固定尺寸 */
export type WrapperHeightMode = "hug" | "fill" | "fixed";

export type WrapperStyle = {
  widthMode?: WrapperWidthMode;
  width?: string;
  heightMode?: WrapperHeightMode;
  height?: string;
  backgroundColor?: string;
  borderRadius?: BorderRadiusValue;
  border?: BorderValue;
  padding?: SpacingValue;
  /** 当前区块外层容器内部的内容对齐（水平 + 竖直双轴）。 */
  contentAlign?: WrapperContentAlign;
  /** 设置后画布以「底图 + 子层叠放」渲染该 layout（与 JSON 契约一致，右侧面板可编辑） */
  backgroundImage?: WrapperBackgroundImage;
  [key: string]: unknown;
};

/** 布局主轴子项间距：`fixed` 使用 `gap` 像素；`auto` 将主轴剩余空间均分到相邻子项之间（画布横向表格下用等分列宽近似；纵向用间隔行策略，语义与历史 `space-between` 对齐）。 */
export type LayoutGapMode = "fixed" | "auto";

export type EmailRootProps = {
  backgroundColor?: string | ThemeRef;
  border?: BorderValue;
  width?: string;
  padding?: SpacingValue;
  gapMode?: LayoutGapMode;
  gap?: string | ThemeRef;
  [key: string]: unknown;
};

export type LayoutBlockProps = {
  direction?: "vertical" | "horizontal";
  gapMode?: LayoutGapMode;
  gap?: string;
  [key: string]: unknown;
};

export type TextBlockProps = {
  /** 结构化正文（分段 + run 级样式/链接）；画布预览与富文本编辑唯一真源 */
  textBody: TextBody;
  fontSize?: string;
  color?: string;
  bold: boolean;
  italic: boolean;
  decoration: TextDecoration;
};

/**
 * 图片块：`wrapperStyle.backgroundImage` 承载地址/裁切/描边；
 * `props` 仅承载叠放子内容的栈布局语义，与带底图 layout 保持一致。
 * 历史 `props.src` / `viewport` 等已废弃，由迁移脚本并入 wrapper。
 */
export type ImageBlockProps = Pick<LayoutBlockProps, "direction" | "gapMode" | "gap"> & {
  [key: string]: unknown;
};

export type ButtonStyleProps = {
  /** 按钮胶囊自身宽度；外层 block 容器宽度仍由 wrapperStyle.widthMode/width 控制 */
  widthMode?: WrapperWidthMode;
  width?: string;
  backgroundColor?: string;
  textColor?: string;
  /** 按钮文案字号；未设置时画布按 15px，与历史默认一致 */
  fontSize?: string;
  borderRadius?: BorderRadiusValue;
  border?: BorderValue;
  /** 控制整个按钮文案是否加粗；按钮内边距由渲染层统一固定。 */
  bold?: boolean;
  /** 控制整个按钮文案是否斜体。 */
  italic?: boolean;
  [key: string]: unknown;
};

export type ButtonBlockProps = {
  text?: string;
  link?: string;
  buttonStyle?: ButtonStyleProps;
  [key: string]: unknown;
};

export type DividerBlockProps = {
  color?: string;
  /** 线条自身宽度；外层 block 容器宽度仍由 wrapperStyle.widthMode/width 控制 */
  lineWidthMode?: "fill" | "fixed";
  lineWidth?: string;
  height?: string;
  [key: string]: unknown;
};

/** 横向进度条：槽/进度色、比例与「条带」几何在 props；外层占位与内边距等仍在 wrapperStyle */
export type ProgressBlockProps = {
  trackColor?: string;
  fillColor?: string;
  value?: number;
  max?: number;
  /** 条带自身宽度；外层 block 容器宽度仍由 wrapperStyle.widthMode/width 控制 */
  barWidthMode?: "fill" | "fixed";
  barWidth?: string;
  /** 条带厚度（与分割线 props.height 一致：样式语义，非外层容器 height） */
  barHeight?: string;
  /** 条带圆角（胶囊等）；与外层 wrapperStyle.borderRadius 分离 */
  barBorderRadius?: BorderRadiusValue;
  [key: string]: unknown;
};

export type GridCellWidthMode = "auto" | "fixed";
export type GridCellHeightMode = "content-max" | "fixed";

export type GridBlockProps = {
  columns?: number;
  gap?: string;
  /**
   * 栅格单元格宽度策略：
   * - auto：按栅格外壳宽度与列数均分
   * - fixed：使用 cellWidth 作为固定单元格宽度
   */
  cellWidthMode?: GridCellWidthMode;
  cellWidth?: string;
  /**
   * 栅格单元格高度策略：
   * - content-max：以该行内最大内容高度统一该行所有单元格高度（行间仍由 props.gap 控制）
   * - fixed：使用 cellHeight 作为固定单元格高度
   */
  cellHeightMode?: GridCellHeightMode;
  cellHeight?: string;
  [key: string]: unknown;
};

export type IconBlockProps = {
  /** 图标资源 URL（唯一地址真源；内置图标 / 文件管理器 / 用户粘贴均落此字段） */
  src?: string;
  /** 单色图标着色（线框 SVG 预览用 mask；品牌多色图可能无效） */
  color?: string;
  size?: string;
  link?: string;
  [key: string]: unknown;
};

type EmailBlockBase<TType extends string, TProps extends Record<string, unknown>> = {
  id: string;
  type: TType;
  parentId: string | null;
  children: string[];
  wrapperStyle?: WrapperStyle;
  props: TProps;
  bindings?: BlockBindings;
  repeat?: RepeatRegionBinding;
  visibility?: VisibilityRule;
};

export type EmailBlock =
  | EmailBlockBase<"emailRoot", EmailRootProps>
  | EmailBlockBase<"layout", LayoutBlockProps>
  | EmailBlockBase<"text", TextBlockProps>
  | EmailBlockBase<"image", ImageBlockProps>
  | EmailBlockBase<"button", ButtonBlockProps>
  | EmailBlockBase<"divider", DividerBlockProps>
  | EmailBlockBase<"progress", ProgressBlockProps>
  | EmailBlockBase<"grid", GridBlockProps>
  | EmailBlockBase<"icon", IconBlockProps>;

export type TextBlock = Extract<EmailBlock, { type: "text" }>;

/** EditorBlockGraph 内存投影 schema 版本（与 nested 落盘一致，非第二套持久化形态） */
export const EMAIL_TEMPLATE_SCHEMA_VERSION = "4.0.0" as const;

export type EmailTemplate = {
  /** EditorBlockGraph 内存投影；落盘/API 真源为 nested 4.0.0，经 templateTreeAdapter 转换 */
  schemaVersion: string;
  emailId?: string;
  templateId: string;
  templateVersion: number;
  locale?: string;
  meta?: Record<string, unknown>;
  rootBlockId: string;
  blockMeta?: Record<
    string,
    {
      blockType?: string;
      name?: string;
    }
  >;
  blocks: Record<string, EmailBlock>;
};

/** 与 payload-contract PayloadSlotDefinition 对齐；payload.slots 目录项 */
export type PayloadSlotDefinition = {
  label: string;
  valueType: string;
  description?: string;
  itemFields?: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
  dataSource?: CollectionDataSource;
  itemVisibility?: boolean[];
  /** 场景内置列表变量预设 id；有值时不使用粘贴 JSON 配置数据源 */
  sceneCollectionPresetId?: string;
  scene?: "loyalty-internal-admin" | "loyalty-merchant-admin";
};

export type EmailPayload = {
  schemaVersion: string;
  /**
   * 场景级变量目录（名称、标识、类型）；template 仅引用 slotId。
   */
  slots: Record<string, PayloadSlotDefinition>;
  /**
   * 变量赋值侧栏展示顺序（创建顺序）；未声明时按 slots 对象登记顺序。
   */
  slotOrder?: string[];
  values: Record<string, unknown>;
  /**
   * 已「解除跟随可替换内容」的槽位 id：合并预览时不再用 values 覆盖该槽位对应路径；
   * 编辑该路径时写入模板字面量。
   */
  detachedVariableSlotIds?: string[];
};

export type EmailListItem = {
  emailKey: string;
  displayName: string;
  templateId: string;
  templateVersion: number;
  hasPayload: boolean;
  hasTokenPresets?: boolean;
  /** 是否存在 layout-manifest.json（场景级多版式） */
  hasLayoutVariants?: boolean;
  /** 列表展示用：当前激活的版式 id */
  activeLayoutVariantId?: string;
  /** 列表排序用：模板创建时间（ISO） */
  createdAt?: string;
  updatedAt?: string;
};

/** meta.json 形态真源见 src/meta-contract/types.ts */
export type { EmailMeta, EmailMetaDelivery } from "../meta-contract/types";
