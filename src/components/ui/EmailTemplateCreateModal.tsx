import { useEffect, useState } from "react";
import { ShopCountInput, ShopPrimaryButton, ShopSecondaryButton } from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";
import { META_DISPLAY_NAME_MAX_LENGTH } from "../../meta-contract/field-limits";

export type EmailTemplateCreateModalMode = "create" | "copy";

type EmailTemplateCreateModalProps = {
  visible: boolean;
  mode: EmailTemplateCreateModalMode;
  /** 复制模式下展示源模板名称 */
  copySourceDisplayName?: string;
  creating?: boolean;
  onCancel: () => void;
  onCreate: (displayName: string) => Promise<void>;
};

export function EmailTemplateCreateModal({
  visible,
  mode,
  copySourceDisplayName,
  creating,
  onCancel,
  onCreate,
}: EmailTemplateCreateModalProps) {
  const [draftName, setDraftName] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (mode === "copy" && copySourceDisplayName?.trim()) {
      setDraftName(`${copySourceDisplayName.trim()} 副本`);
    } else {
      setDraftName("");
    }
    setDraftError(null);
  }, [visible, mode, copySourceDisplayName]);

  const close = () => {
    if (creating) return;
    onCancel();
  };

  const submit = async () => {
    const normalized = draftName.trim();
    if (!normalized) {
      setDraftError("模板名称不能为空");
      return;
    }
    setDraftError(null);
    try {
      await onCreate(normalized);
    } catch {
      setDraftError(mode === "copy" ? "复制失败，请稍后重试" : "创建失败，请稍后重试");
    }
  };

  if (!visible) return null;

  const isCopy = mode === "copy";

  return (
    <ShopSectionModal
      visible
      title={isCopy ? "复制邮件模板" : "创建新模板"}
      onCancel={close}
      maskClosable={!creating}
      closable={!creating}
      destroyOnClose
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton onClick={close} disabled={creating}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton onClick={() => void submit()} loading={creating}>
            {isCopy ? "复制" : "创建"}
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="inspector-field">
        <span className="inspector-field__label">模板名称</span>
        <ShopCountInput
          autoFocus
          value={draftName}
          maxLength={META_DISPLAY_NAME_MAX_LENGTH}
          placeholder="请输入模板名称"
          onChange={setDraftName}
          onPressEnter={() => void submit()}
        />
        {isCopy ? (
          <span className="topbar__create-hint">
            将复制源模板的全部未删除版式（结构、样式预设、变量槽与取值、列表绑定与显影规则等），生成新的场景目录；副本模板与版式均为
            <strong> 未发布 </strong>
            状态。
            {copySourceDisplayName ? (
              <>
                <br />
                源模板：{copySourceDisplayName}
              </>
            ) : null}
          </span>
        ) : (
          <span className="topbar__create-hint">
            模板标识将根据名称自动生成；纯中文名称会使用自动编号。
          </span>
        )}
        {draftError ? <span className="topbar__rename-error">{draftError}</span> : null}
      </div>
    </ShopSectionModal>
  );
};
