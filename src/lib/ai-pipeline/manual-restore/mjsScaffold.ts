import {
  formatInjectedAssetsForMjs,
  INJECTED_ASSETS_MARKER,
  type InjectedMjsAssets,
} from "./injectedMjsAssets";
import type { ManualRestorePersistMode } from "./types";

/** 程序拼进 mjs header 的运行时常量（豆包 body 不输出）。 */
export type MjsScaffoldContext = {
  emailKey: string;
  displayName: string;
  idPrefix: string;
  imagePath: string;
  designCopyPath: string;
  persistMode: ManualRestorePersistMode;
  /** mjs 内 OUT 常量：full-email 为 join(EMAIL_DIR,'layouts/default')；layout-only 为 staging 绝对路径 */
  outDirExpr: string;
};

export function deriveMjsIdPrefix(emailKey: string): string {
  return emailKey.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
}

/** shebang + import + 路径常量 + 资产占位（占位符由调用方替换为 PEXELS/ICON）。 */
export function buildMjsHeader(ctx: MjsScaffoldContext): string {
  const outLine =
    ctx.persistMode === "layout-only"
      ? `const OUT = ${JSON.stringify(ctx.outDirExpr)};`
      : `const OUT = join(EMAIL_DIR, 'layouts/default');`;

  return `#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = ${JSON.stringify(ctx.emailKey)};
const P = ${JSON.stringify(ctx.idPrefix)};
const displayName = ${JSON.stringify(ctx.displayName)};
const DESIGN_SRC = ${JSON.stringify(ctx.imagePath)};
const DESIGN_DST = ${JSON.stringify(ctx.designCopyPath)};
const EMAIL_DIR = join(__dirname, \`../data/emails/\${EMAIL}\`);
${outLine}

${INJECTED_ASSETS_MARKER}
`;
}

/** 固定落盘 footer（依赖 body 内 \`tokenPresets\` / \`template\` 变量名）。 */
export function buildMjsFooter(): string {
  return `
const meta = { schemaVersion: '1.0.0', emailKey: EMAIL, displayName, publishStatus: 'published' };
const layoutManifest = {
  schemaVersion: '1.0.0',
  activeLayoutVariantId: 'default',
  variants: [{ id: 'default', label: displayName, publishStatus: 'published' }],
};
const payload = { schemaVersion: '1.0.0', slots: {}, values: {} };

mkdirSync(OUT, { recursive: true });
mkdirSync(EMAIL_DIR, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), \`\${JSON.stringify(tokenPresets, null, 2)}\\n\`);
writeFileSync(join(OUT, 'template.json'), \`\${JSON.stringify(template, null, 2)}\\n\`);
writeFileSync(join(EMAIL_DIR, 'meta.json'), \`\${JSON.stringify(meta, null, 2)}\\n\`);
writeFileSync(join(EMAIL_DIR, 'layout-manifest.json'), \`\${JSON.stringify(layoutManifest, null, 2)}\\n\`);
writeFileSync(join(EMAIL_DIR, 'payload.json'), \`\${JSON.stringify(payload, null, 2)}\\n\`);
try {
  copyFileSync(DESIGN_SRC, DESIGN_DST);
} catch {
  /* 设计图复制失败则跳过 */
}
console.log(\`Wrote \${OUT}\`);
`;
}

/** 仅写 template + tokenPresets 到 OUT（HTTP 以图创建版式 staging）。 */
export function buildMjsFooterLayoutOnly(): string {
  return `
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), \`\${JSON.stringify(tokenPresets, null, 2)}\\n\`);
writeFileSync(join(OUT, 'template.json'), \`\${JSON.stringify(template, null, 2)}\\n\`);
console.log(\`Wrote \${OUT}\`);
`;
}

/** header + 豆包 body + footer，并注入 PEXELS/ICON。 */
export function assembleMjsFromBody(opts: {
  body: string;
  scaffold: MjsScaffoldContext;
  injected: InjectedMjsAssets;
}): string {
  const header = buildMjsHeader(opts.scaffold).replace(
    INJECTED_ASSETS_MARKER,
    formatInjectedAssetsForMjs(opts.injected)
  );
  const body = opts.body.trim();
  const footer =
    opts.scaffold.persistMode === "layout-only"
      ? buildMjsFooterLayoutOnly().trimStart()
      : buildMjsFooter().trimStart();
  return `${header}${body}\n\n${footer}\n`;
}
