export type AssetResolveInput =
  | { kind: "pexels-photo"; query: string; orientation?: string; targetWidth?: number }
  | { kind: "icon-cdn"; pack: string; iconQuery: string };

export type AssetResolveResult =
  | { ok: true; url: string; alt?: string; tintable?: boolean }
  | { ok: false; reason: string; detail?: string };

/** 资产解析端口（B2/B4 统一）。 */
export type AssetResolver = {
  resolve(input: AssetResolveInput): Promise<AssetResolveResult>;
};
