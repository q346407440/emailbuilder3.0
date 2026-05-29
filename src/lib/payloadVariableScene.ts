export type PayloadVariableScene = "loyalty-internal-admin" | "loyalty-merchant-admin";

const PAYLOAD_VARIABLE_SCENE_STORAGE_KEY = "easy-email:payload-variable-scene";
const DEFAULT_PAYLOAD_VARIABLE_SCENE: PayloadVariableScene = "loyalty-internal-admin";

export const PAYLOAD_VARIABLE_SCENE_OPTIONS: Array<{ value: PayloadVariableScene; label: string }> = [
  { value: "loyalty-internal-admin", label: "loyalty 内部后台" },
  { value: "loyalty-merchant-admin", label: "loyalty 商家端后台" },
];

function isPayloadVariableScene(value: string): value is PayloadVariableScene {
  return PAYLOAD_VARIABLE_SCENE_OPTIONS.some((option) => option.value === value);
}

/** 读取变量场景；若本地无值则写入默认场景。 */
export function getPayloadVariableScene(): PayloadVariableScene {
  try {
    const raw = window.localStorage.getItem(PAYLOAD_VARIABLE_SCENE_STORAGE_KEY);
    if (raw && isPayloadVariableScene(raw)) return raw;
    window.localStorage.setItem(PAYLOAD_VARIABLE_SCENE_STORAGE_KEY, DEFAULT_PAYLOAD_VARIABLE_SCENE);
    return DEFAULT_PAYLOAD_VARIABLE_SCENE;
  } catch {
    return DEFAULT_PAYLOAD_VARIABLE_SCENE;
  }
}

/** 持久化变量场景；异常时静默忽略。 */
export function setPayloadVariableScene(scene: PayloadVariableScene): void {
  try {
    window.localStorage.setItem(PAYLOAD_VARIABLE_SCENE_STORAGE_KEY, scene);
  } catch {
    // 某些受限环境可能禁用 localStorage，保持静默即可。
  }
}

export function payloadVariableSceneLabel(scene: PayloadVariableScene): string {
  return PAYLOAD_VARIABLE_SCENE_OPTIONS.find((option) => option.value === scene)?.label ?? scene;
}
