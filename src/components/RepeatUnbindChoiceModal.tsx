import { Radio } from "antd";
import { useEffect, useId, useState } from "react";
import {
  defaultRepeatUnbindMode,
  repeatUnbindModeOptions,
  type RepeatUnbindMode,
} from "../lib/repeatUnbindMode";
import { ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

type Props = {
  visible: boolean;
  itemCount: number;
  /** 例如「子级列表循环将一并清除」 */
  nestedHint?: string;
  onClose: () => void;
  onChoose: (mode: RepeatUnbindMode) => void;
};

/**
 * 解除列表重复绑定前选择处理方式；选中后点「确定」生效。
 */
export function RepeatUnbindChoiceModal({
  visible,
  itemCount,
  nestedHint,
  onClose,
  onChoose,
}: Props) {
  const radioGroupName = useId();
  const options = repeatUnbindModeOptions(itemCount);
  const [selectedMode, setSelectedMode] = useState<RepeatUnbindMode>(() =>
    defaultRepeatUnbindMode(itemCount)
  );

  useEffect(() => {
    if (!visible) return;
    setSelectedMode(defaultRepeatUnbindMode(itemCount));
  }, [visible, itemCount]);

  const handleConfirm = () => {
    onChoose(selectedMode);
  };

  return (
    <ShopSectionModal
      title="解除列表绑定"
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton htmlType="button" onClick={handleConfirm}>
            确定
          </ShopPrimaryButton>
        </div>
      }
    >
      {nestedHint ? (
        <p className="shop-section-modal__selection-banner">{nestedHint}</p>
      ) : null}
      <div
        className="repeat-unbind-choice-modal__options"
        role="radiogroup"
        aria-label="解除方式"
      >
        {options.map((option) => {
          const checked = selectedMode === option.mode;
          return (
            <label
              key={option.mode}
              className={`repeat-unbind-choice-modal__option${
                checked ? " repeat-unbind-choice-modal__option--active" : ""
              }`}
            >
              <Radio
                name={radioGroupName}
                checked={checked}
                onChange={() => setSelectedMode(option.mode)}
                aria-label={option.title}
              />
              <span className="repeat-unbind-choice-modal__option-text">
                <span className="repeat-unbind-choice-modal__option-title">{option.title}</span>
                <span className="repeat-unbind-choice-modal__option-summary">{option.summary}</span>
              </span>
            </label>
          );
        })}
      </div>
    </ShopSectionModal>
  );
}
