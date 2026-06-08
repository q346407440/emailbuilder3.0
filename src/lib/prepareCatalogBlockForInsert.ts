import type { EmailBlock } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import { deepMaterializeThemeRefs } from "./materializeThemeRefs";

/** 将母版块中的 `$themeRef` 展开为字面量，便于插入当前邮件画布。 */
export function prepareCatalogBlockForInsert(
  block: EmailBlock,
  tokenPresets: TokenPresets | null | undefined
): EmailBlock {
  return {
    ...block,
    props: deepMaterializeThemeRefs(block.props, tokenPresets) as EmailBlock["props"],
    wrapperStyle: deepMaterializeThemeRefs(block.wrapperStyle, tokenPresets) as EmailBlock["wrapperStyle"],
  } as EmailBlock;
}
