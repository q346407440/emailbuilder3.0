import { useRef, useState, type ChangeEvent } from "react";
import { uploadProjectIconAsset, uploadProjectImageAsset } from "../../api/client";
import {
  isProjectIconUploadFile,
  isProjectImageUploadFile,
  toAbsoluteProjectAssetUrl,
} from "../../lib/projectAssetUpload";
import { ShopInput, ShopSecondaryButton } from "./ShopFormControls";

export type UrlAssetUploadKind = "image" | "icon";

type UrlAssetUploadInputProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  uploadKind: UrlAssetUploadKind;
  placeholder?: string;
};

const ACCEPT_BY_KIND: Record<UrlAssetUploadKind, string> = {
  icon: ".svg,image/svg+xml",
  image: "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif",
};

function validateLocalFile(file: File, kind: UrlAssetUploadKind): string | null {
  if (kind === "icon") {
    if (!isProjectIconUploadFile(file)) return "请选择 SVG 文件";
    return null;
  }
  if (!isProjectImageUploadFile(file)) return "请选择 JPG、PNG、WebP 或 GIF 图片";
  return null;
}

export function UrlAssetUploadInput({
  value,
  onChange,
  disabled = false,
  uploadKind,
  placeholder,
}: UrlAssetUploadInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pickFile = async (file: File | null) => {
    if (!file || disabled || uploading) return;
    const validationError = validateLocalFile(file, uploadKind);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const result =
        uploadKind === "icon"
          ? await uploadProjectIconAsset(file)
          : await uploadProjectImageAsset(file);
      onChange(toAbsoluteProjectAssetUrl(result.url));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "上传失败，请稍后重试");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    void pickFile(e.target.files?.[0] ?? null);
  };

  return (
    <div className="url-asset-upload-input">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_BY_KIND[uploadKind]}
        className="url-asset-upload-input__file"
        tabIndex={-1}
        aria-hidden
        onChange={onFileChange}
      />
      <ShopInput
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled || uploading}
        onChange={(e) => onChange(e.target.value)}
        addonAfter={
          <ShopSecondaryButton
            htmlType="button"
            className="url-asset-upload-input__btn"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "上传中…" : "本地上传"}
          </ShopSecondaryButton>
        }
      />
      {uploadError ? (
        <p className="url-asset-upload-input__error" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
