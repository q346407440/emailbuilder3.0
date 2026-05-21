export type ProjectIconAsset = {
  id: string;
  label: string;
  src: string;
  /** 是否适合用单色 mask 着色（线框类 SVG） */
  tintable?: boolean;
};

export type ProjectIconManifest = {
  version: string;
  items: ProjectIconAsset[];
};
