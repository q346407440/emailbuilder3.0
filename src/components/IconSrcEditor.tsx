import { useEffect, useState, type ReactNode } from "react";
import type { EmailBlock } from "../types/email";
import type { ProjectIconAsset, ProjectIconManifest } from "../types/iconAsset";
import { listProjectIconAssets } from "../api/client";
import { readIconBlockProps } from "../lib/iconBlock";
import { Field } from "./ui/Field";
import { ShopSegmented, ShopSelect } from "./ui/ShopFormControls";
import { UrlAssetUploadInput } from "./ui/UrlAssetUploadInput";

type IconSrcUiMode = "url" | "library";

type IconSrcEditorProps = {
  block: Extract<EmailBlock, { type: "icon" }>;
  srcValue: string;
  srcLocked: boolean;
  srcHeaderExtra?: ReactNode;
  onPatch: (patch: Record<string, string>) => void;
};

const MODE_OPTIONS = [
  { value: "url", label: "链接地址" },
  { value: "library", label: "内置图标" },
] as const;

function findLibraryItemBySrc(items: ProjectIconAsset[], src: string): ProjectIconAsset | undefined {
  const trimmed = src.trim();
  if (!trimmed) return undefined;
  return items.find((item) => item.src.trim() === trimmed);
}

function inferUiMode(src: string, items: ProjectIconAsset[], manual: IconSrcUiMode | null): IconSrcUiMode {
  if (manual) return manual;
  if (findLibraryItemBySrc(items, src)) return "library";
  return "url";
}

export function IconSrcEditor({
  block,
  srcValue,
  srcLocked,
  srcHeaderExtra,
  onPatch,
}: IconSrcEditorProps) {
  const props = readIconBlockProps(block);
  const [libraryItems, setLibraryItems] = useState<ProjectIconAsset[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState<IconSrcUiMode | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listProjectIconAssets()
      .then((manifest: ProjectIconManifest) => {
        if (!cancelled) {
          setLibraryItems(manifest.items ?? []);
          setLibraryError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLibraryItems([]);
          setLibraryError("无法加载内置图标列表");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displaySrc = (srcLocked ? srcValue : props.src) || "";
  const uiMode = inferUiMode(displaySrc, libraryItems, manualMode);
  const selectedLibrary = findLibraryItemBySrc(libraryItems, displaySrc);

  useEffect(() => {
    setManualMode(null);
  }, [block.id]);

  const onModeChange = (mode: IconSrcUiMode) => {
    setManualMode(mode);
    if (mode === "library") {
      const first = libraryItems[0];
      if (first) onPatch({ "props.src": first.src });
    }
  };

  const onLibraryPick = (assetId: string) => {
    const item = libraryItems.find((i) => i.id === assetId);
    if (!item) return;
    setManualMode("library");
    onPatch({ "props.src": item.src });
  };

  return (
    <>
      <Field
        label="图标来源"
        hint={
          srcLocked
            ? "图标地址已绑定变量或样式令牌时，来源模式不可切换。"
            : "仅作编辑入口；保存到 JSON 的始终是图标 URL（src）。"
        }
      >
        <ShopSegmented<IconSrcUiMode>
          value={uiMode}
          disabled={srcLocked}
          options={[...MODE_OPTIONS]}
          onChange={onModeChange}
        />
      </Field>

      {uiMode === "url" ? (
        <Field
          label="图标链接"
          hint={
            srcLocked
              ? "当前跟随绑定；可在赋值面板修改，或通过右侧胶囊解除跟随后再改链接。"
              : "支持 http(s) 或线上文件管理器返回的 URL；线框 SVG 可配合「图标颜色」着色。"
          }
          headerExtra={srcHeaderExtra}
        >
          <UrlAssetUploadInput
            uploadKind="icon"
            value={srcValue}
            disabled={srcLocked}
            onChange={(next) => onPatch({ "props.src": next })}
          />
        </Field>
      ) : null}

      {uiMode === "library" ? (
        <Field label="内置图标" hint={libraryError ?? "从预置图标目录选择，写入对应 URL。"}>
          <ShopSelect
            value={selectedLibrary?.id || undefined}
            disabled={srcLocked || libraryItems.length === 0}
            onChange={(v) => onLibraryPick(String(v))}
          >
            {libraryItems.map((item) => (
              <ShopSelect.Option key={item.id} value={item.id}>
                {item.label}
                {item.tintable === false ? "（品牌色，不建议改色）" : ""}
              </ShopSelect.Option>
            ))}
          </ShopSelect>
        </Field>
      ) : null}
    </>
  );
}
