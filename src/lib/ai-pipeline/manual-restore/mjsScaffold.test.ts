import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractMjsBodyFromLlm } from "./extractMjsFromLlm";
import { assembleMjsFromBody, buildMjsFooter, buildMjsHeader } from "./mjsScaffold";

const MIN_BODY = `
const COLORS = { primary: '#111111', surface: '#ffffff' };

function borderNone() {
  return { mode: 'unified', width: '0', style: 'solid', color: 'rgba(0,0,0,0)' };
}

function buildS1() {
  return { id: \`\${P}-s1\`, type: 'layout', blockMeta: { blockType: 'layout.container', name: '模块1' }, children: [] };
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: displayName,
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.primary, surface: COLORS.surface },
        spacing: { section: '20px', gap: '16px', pageInline: '24px' },
        typography: { display: '36px', h1: '22px', body: '15px', caption: '13px' },
        radius: { panel: '0', cta: '24px' },
      },
    },
  },
  scopeSelections: {},
};

const template = {
  schemaVersion: '4.0.0',
  emailId: EMAIL,
  templateId: EMAIL,
  templateVersion: 1,
  locale: 'zh-CN',
  root: {
    id: \`\${P}-root\`,
    type: 'emailRoot',
    blockMeta: { blockType: 'layout.container', name: '画布根' },
    props: { width: '600px', gap: '0' },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1()],
  },
};
`;

describe("mjsScaffold", () => {
  it("header 含 EMAIL 与资产占位替换", () => {
    const header = buildMjsHeader({
      emailKey: "demo_email",
      displayName: "演示",
      idPrefix: "demo",
      imagePath: "/tmp/design.png",
      designCopyPath: "/tmp/copy.png",
      persistMode: "full-email",
      outDirExpr: "join(EMAIL_DIR, 'layouts/default')",
    });
    assert.match(header, /const EMAIL = "demo_email"/);
    assert.match(header, /\/\/ __INJECTED_ASSETS__/);
  });

  it("footer 含 meta 与 writeFileSync", () => {
    const footer = buildMjsFooter();
    assert.match(footer, /const meta =/);
    assert.match(footer, /writeFileSync\(join\(OUT, 'template.json'\)/);
  });

  it("assembleMjsFromBody 拼出完整可执行形态", () => {
    const full = assembleMjsFromBody({
      body: MIN_BODY,
      scaffold: {
        emailKey: "demo_email",
        displayName: "演示",
        idPrefix: "demo",
        imagePath: "/tmp/design.png",
        designCopyPath: "/tmp/copy.png",
        persistMode: "full-email",
        outDirExpr: "join(EMAIL_DIR, 'layouts/default')",
      },
      injected: {
        pexelsBlock: "const PEXELS = { hero: 'https://example.com/h.jpg' };",
        iconBlock: "const ICON = { leaf: 'https://example.com/i.svg' };",
        slotGuide: "- PEXELS.hero",
      },
    });
    assert.match(full, /^#!\/usr\/bin\/env node/);
    assert.match(full, /const PEXELS =/);
    assert.match(full, /console\.log\(`Wrote \$\{OUT\}`\)/);
    assert.doesNotMatch(full, /\/\/ __INJECTED_ASSETS__/);
  });

  it("extractMjsBodyFromLlm 接受纯 body", () => {
    const body = extractMjsBodyFromLlm(MIN_BODY);
    assert.match(body, /const COLORS/);
    assert.doesNotMatch(body, /writeFileSync/);
  });
});
