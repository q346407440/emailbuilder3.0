import type { TokenFamilyName } from "./tokenPreset";

export type ConfigScopeKind = "template" | "section" | "block";

export type ConfigControl =
  | "text"
  | "textarea"
  | "url"
  | "image"
  | "color"
  | "number"
  | "select"
  | "toggle"
  | "tokenScale";

export type ConfigTarget =
  | {
      kind: "templatePath";
      /** 相对整份 template 的点路径，例如 blocks.hero.props.text */
      path: string;
    }
  | {
      kind: "blockPath";
      blockId: string;
      /** 相对 block 的点路径，例如 props.text 或 wrapperStyle.padding.unified */
      path: string;
    }
  | {
      kind: "payload";
      slotId: string;
    }
  | {
      kind: "tokenPreset";
      /** 相对 tokenPresets 的点路径，仅高级场景使用。 */
      path: string;
    };

export type ConfigFieldOption = {
  label: string;
  value: string | number | boolean;
};

export type ConfigField = {
  key: string;
  label: string;
  description?: string;
  control: ConfigControl;
  target: ConfigTarget;
  tokenFamily?: TokenFamilyName;
  defaultScale?: string;
  allowCustom?: boolean;
  required?: boolean;
  options?: ConfigFieldOption[];
  group?: string;
};

export type ConfigScope = {
  scopeId: string;
  kind: ConfigScopeKind;
  label: string;
  description?: string;
  blockIds?: string[];
  masterRef?: {
    kind: "section" | "block" | "template";
    id: string;
    version?: string;
  };
  fields: ConfigField[];
};

/**
 * 受控配置面：声明模板、section、block 对用户开放哪些字段。
 */
export type ConfigSchema = {
  schemaVersion: "1.0.0";
  scopes: ConfigScope[];
};
