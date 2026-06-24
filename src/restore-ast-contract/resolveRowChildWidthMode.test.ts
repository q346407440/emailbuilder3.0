import assert from "node:assert/strict";
import test from "node:test";
import { astToTemplate } from "./astToTemplate";
import {
  isContentPanelStack,
  isDecorativeBoxStack,
  nodeHasIntrinsicWidthCap,
  resolveBetweenRowFlexibleStackWidthMode,
  resolveDirectRowChildWrapperWidthMode,
  resolveLeafWrapperWidthMode,
  restoreNodeHasWidthAnchor,
  resolveStackWrapperWidthMode,
  resolveVerticalStackChildLayoutWidthMode,
  rowPeerHasIntrinsicWidthCap,
  stackHasIntrinsicWidthCap,
  stackHasMultipleDirectTextChildren,
} from "./resolveRowChildWidthMode";
import type { RestoreAstDocument } from "./types";

const theme: RestoreAstDocument["theme"] = {
  colors: { primary: "#111", accent: "#222", secondary: "#999", surface: "#fff" },
  spacing: { section: "24px", gap: "16px", pageInline: "20px" },
  typography: { display: "28px", h1: "22px", body: "14px", caption: "12px" },
  radius: { panel: "8px", cta: "24px" },
};

test("resolveDirectRowChildWrapperWidthMode：between 横排直子 → hug", () => {
  assert.equal(
    resolveDirectRowChildWrapperWidthMode({ inDirectRow: true, rowAlign: "between" }),
    "hug"
  );
});

test("resolveDirectRowChildWrapperWidthMode：start 横排直子 → fill", () => {
  assert.equal(
    resolveDirectRowChildWrapperWidthMode({ inDirectRow: true, rowAlign: "start" }),
    "fill"
  );
});

test("resolveDirectRowChildWrapperWidthMode：forceFill 覆盖 between", () => {
  assert.equal(
    resolveDirectRowChildWrapperWidthMode(
      { inDirectRow: true, rowAlign: "between" },
      { forceFill: true }
    ),
    "fill"
  );
});

test("resolveStackWrapperWidthMode：横排 start 下无 box 栏位 stack → fill", () => {
  assert.equal(
    resolveStackWrapperWidthMode(
      {
        t: "stack",
        title: "左侧文案色卡区",
        align: "start",
        gap: "gap",
        children: [
          { t: "text", content: "标题", role: "h1" },
          {
            t: "grid",
            title: "色卡网格",
            columns: 2,
            gap: "gap",
            children: [],
          },
        ],
      },
      { inDirectRow: true, rowAlign: "start" }
    ),
    "fill"
  );
});

test("resolveStackWrapperWidthMode：格内 tone+radius 色块 → hug", () => {
  const node = {
    t: "stack" as const,
    align: "center" as const,
    box: { tone: { hex: "#33556A" }, radius: { px: 999 }, pad: { px: 20 } },
    children: [{ t: "text" as const, content: " ", role: "body" as const }],
  };
  assert.equal(isDecorativeBoxStack(node), true);
  assert.equal(resolveStackWrapperWidthMode(node, {}), "hug");
});

test("nodeHasIntrinsicWidthCap：定高或 aspect 的 image → true", () => {
  assert.equal(
    nodeHasIntrinsicWidthCap({
      t: "image",
      query: "dog",
      height: { px: 90 },
      aspect: { w: 4, h: 3 },
    }),
    true
  );
  assert.equal(
    nodeHasIntrinsicWidthCap({ t: "image", query: "hero", height: { px: 200 } }),
    true
  );
  assert.equal(nodeHasIntrinsicWidthCap({ t: "image", query: "banner" }), false);
});

test("nodeHasIntrinsicWidthCap：text / grid / fill button → false", () => {
  assert.equal(
    nodeHasIntrinsicWidthCap({ t: "text", content: "hi", role: "body" }),
    false
  );
  assert.equal(
    nodeHasIntrinsicWidthCap({
      t: "grid",
      columns: 2,
      children: [],
    }),
    false
  );
  assert.equal(
    nodeHasIntrinsicWidthCap({
      t: "button",
      label: "CTA",
      width: "fill",
    }),
    false
  );
});

test("stackHasIntrinsicWidthCap：仅含可算宽 image 的 stack → true", () => {
  assert.equal(
    stackHasIntrinsicWidthCap({
      t: "stack",
      title: "右侧晒图双列",
      children: [
        {
          t: "image",
          query: "a",
          height: { px: 90 },
          aspect: { w: 4, h: 3 },
        },
        {
          t: "image",
          query: "b",
          height: { px: 90 },
          aspect: { w: 4, h: 3 },
        },
      ],
    }),
    true
  );
});

test("stackHasIntrinsicWidthCap：image + text 栏 → false", () => {
  assert.equal(
    stackHasIntrinsicWidthCap({
      t: "stack",
      children: [
        { t: "image", query: "a", height: { px: 220 }, aspect: { w: 3, h: 4 } },
        { t: "text", content: "caption", role: "caption" },
      ],
    }),
    false
  );
});

test("resolveStackWrapperWidthMode：横排 center 下自含媒体 stack → hug", () => {
  assert.equal(
    resolveStackWrapperWidthMode(
      {
        t: "stack",
        title: "右侧晒图双列",
        align: "center",
        gap: "gap",
        children: [
          {
            t: "image",
            query: "two dogs",
            height: { px: 90 },
            aspect: { w: 4, h: 3 },
          },
          {
            t: "image",
            query: "dog food",
            height: { px: 90 },
            aspect: { w: 4, h: 3 },
          },
        ],
      },
      { inDirectRow: true, rowAlign: "center" }
    ),
    "hug"
  );
});

test("astToTemplate：三列晒图行中纯图 stack → hug", () => {
  const doc: RestoreAstDocument = {
    theme,
    tree: {
      t: "email",
      children: [
        {
          t: "stack",
          title: "晒图区",
          align: "center",
          children: [
            {
              t: "row",
              title: "三列晒图行",
              align: "center",
              crossAlign: "center",
              gap: "gap",
              children: [
                {
                  t: "image",
                  query: "dogs on bed",
                  height: { px: 120 },
                  aspect: { w: 1, h: 1 },
                },
                {
                  t: "image",
                  query: "golden doodle",
                  height: { px: 220 },
                  aspect: { w: 3, h: 4 },
                },
                {
                  t: "stack",
                  title: "右侧晒图双列",
                  align: "center",
                  gap: "gap",
                  children: [
                    {
                      t: "image",
                      query: "two dogs package",
                      height: { px: 90 },
                      aspect: { w: 4, h: 3 },
                    },
                    {
                      t: "image",
                      query: "dog product",
                      height: { px: 90 },
                      aspect: { w: 4, h: 3 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const { template } = astToTemplate(doc, {
    emailId: "test",
    templateId: "test",
    locale: "en-US",
    idPrefix: "t",
  });

  const stackId = Object.keys(template.blocks).find(
    (id) => template.blockMeta?.[id]?.name === "右侧晒图双列"
  );
  assert.ok(stackId);
  assert.equal(template.blocks[stackId!]!.wrapperStyle?.widthMode, "hug");
});

test("astToTemplate：横排 start 文案+色卡 grid 栏 fill、grid fill、色块 hug", () => {
  const doc: RestoreAstDocument = {
    theme,
    tree: {
      t: "email",
      children: [
        {
          t: "stack",
          title: "单色区",
          align: "center",
          box: { pad: "section" },
          gap: "gap",
          children: [
            {
              t: "row",
              title: "文案与效果图行",
              align: "start",
              crossAlign: "start",
              gap: "gap",
              children: [
                {
                  t: "stack",
                  title: "左侧文案色卡区",
                  align: "start",
                  gap: "gap",
                  children: [
                    { t: "text", content: "Choose one color", role: "h1" },
                    {
                      t: "grid",
                      title: "色卡网格",
                      columns: 2,
                      gap: "gap",
                      children: [
                        {
                          t: "stack",
                          title: "Daily Greens色卡",
                          align: "center",
                          gap: "gap",
                          children: [
                            {
                              t: "stack",
                              align: "center",
                              box: {
                                tone: { hex: "#7A9373" },
                                radius: { px: 999 },
                                pad: { px: 20 },
                              },
                              children: [{ t: "text", content: " ", role: "body" }],
                            },
                            { t: "text", content: "Daily Greens", role: "caption" },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  t: "image",
                  query: "bedroom",
                  height: { px: 400 },
                  aspect: { w: 3, h: 4 },
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const { template } = astToTemplate(doc, {
    emailId: "test",
    templateId: "test",
    locale: "en-US",
    idPrefix: "t",
  });

  const findByName = (name: string) =>
    Object.keys(template.blocks).find((id) => template.blockMeta?.[id]?.name === name);

  const columnId = findByName("左侧文案色卡区");
  const gridId = findByName("色卡网格");
  const pillId = Object.keys(template.blocks).find(
    (id) => template.blocks[id]?.wrapperStyle?.backgroundColor === "#7A9373"
  );
  const pillTextId = pillId ? template.blocks[pillId]?.children?.[0] : undefined;

  assert.ok(columnId);
  assert.ok(gridId);
  assert.ok(pillId);
  assert.equal(template.blocks[columnId!]!.wrapperStyle?.widthMode, "fill");
  assert.equal(template.blocks[gridId!]!.wrapperStyle?.widthMode, "fill");
  assert.equal(template.blocks[pillId!]!.wrapperStyle?.widthMode, "hug");
  assert.equal(template.blocks[pillTextId!]!.wrapperStyle?.widthMode, "hug");
});

test("isContentPanelStack：双 CTA 卡片为 true，pill 色块为 false", () => {
  assert.equal(
    isContentPanelStack({
      t: "stack",
      title: "免费试用卡片",
      box: { tone: "surface", radius: "panel", pad: "section" },
      children: [
        { t: "text", content: "Title", role: "h1" },
        { t: "text", content: "Body", role: "body" },
        { t: "button", label: "Go" },
      ],
    }),
    true
  );
  assert.equal(
    isContentPanelStack({
      t: "stack",
      align: "center",
      box: { tone: { hex: "#33556A" }, radius: { px: 999 }, pad: { px: 20 } },
      children: [{ t: "text", content: " ", role: "body" }],
    }),
    false
  );
});

test("resolveStackWrapperWidthMode：between 下内容面板 stack → fill", () => {
  assert.equal(
    resolveStackWrapperWidthMode(
      {
        t: "stack",
        title: "免费试用卡片",
        box: { tone: "surface", radius: "panel", pad: "section" },
        children: [
          { t: "text", content: "Title", role: "h1" },
          { t: "button", label: "Go" },
        ],
      },
      { inDirectRow: true, rowAlign: "between" }
    ),
    "fill"
  );
});

test("resolveLeafWrapperWidthMode：内容面板内 text → fill（即使父 stack hug）", () => {
  assert.equal(
    resolveLeafWrapperWidthMode({ parentWidthHug: true, inContentPanelStack: true }),
    "fill"
  );
});

test("astToTemplate：双 CTA between 行面板 fill、卡内 text fill", () => {
  const doc: RestoreAstDocument = {
    theme,
    tree: {
      t: "email",
      children: [
        {
          t: "stack",
          title: "双CTA区块",
          align: "center",
          box: { pad: "section" },
          children: [
            {
              t: "row",
              title: "双CTA行",
              align: "between",
              crossAlign: "start",
              gap: "gap",
              children: [
                {
                  t: "stack",
                  title: "免费试用卡片",
                  align: "start",
                  gap: "gap",
                  box: { tone: "surface", radius: "panel", pad: "section" },
                  children: [
                    {
                      t: "text",
                      content: "It's time to make email one less thing to worry about",
                      role: "h1",
                    },
                    {
                      t: "text",
                      content: "Start your 15-day free trial and see all Beefree has to offer.",
                      role: "body",
                    },
                    { t: "button", label: "Start your trial", width: "hug" },
                  ],
                },
                {
                  t: "stack",
                  title: "自助导览卡片",
                  align: "start",
                  gap: "gap",
                  box: { tone: "accent", radius: "panel", pad: "section" },
                  children: [
                    {
                      t: "row",
                      title: "导览标题行",
                      align: "start",
                      crossAlign: "center",
                      gap: "gap",
                      children: [
                        { t: "icon", query: "play", pack: "tabler", size: "md" },
                        {
                          t: "text",
                          content: "Take our self-guided tour",
                          role: "body",
                          bold: true,
                        },
                      ],
                    },
                    {
                      t: "image",
                      query: "product screenshot",
                      height: { px: 200 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const { template } = astToTemplate(doc, {
    emailId: "test",
    templateId: "test",
    locale: "en-US",
    idPrefix: "t",
  });

  const findByName = (name: string) =>
    Object.keys(template.blocks).find((id) => template.blockMeta?.[id]?.name === name);

  const leftCard = findByName("免费试用卡片");
  const rightCard = findByName("自助导览卡片");
  const titleText = findByName("It's time to make email one …");
  const tourText = findByName("Take our self-guided tour");

  assert.ok(leftCard);
  assert.ok(rightCard);
  assert.equal(template.blocks[leftCard!]!.wrapperStyle?.widthMode, "fill");
  assert.equal(template.blocks[rightCard!]!.wrapperStyle?.widthMode, "fill");
  assert.equal(template.blocks[titleText!]!.wrapperStyle?.widthMode, "fill");
  assert.equal(template.blocks[tourText!]!.wrapperStyle?.widthMode, "fill");
});

test("resolveVerticalStackChildLayoutWidthMode：hug 纵排父下 row → hug", () => {
  assert.equal(resolveVerticalStackChildLayoutWidthMode({ parentWidthHug: true }), "hug");
  assert.equal(resolveVerticalStackChildLayoutWidthMode({}), "fill");
});

test("astToTemplate：页脚徽章列内横排行 → hug（避免 hug 父 + fill 子坍缩）", () => {
  const doc: RestoreAstDocument = {
    theme,
    tree: {
      t: "email",
      children: [
        {
          t: "row",
          title: "Footer Details",
          align: "between",
          children: [
            {
              t: "stack",
              title: "Legal Links",
              children: [{ t: "text", content: "Privacy", role: "caption" }],
            },
            {
              t: "stack",
              title: "Badges Container",
              children: [
                {
                  t: "row",
                  title: "Badges Top",
                  gap: "gap",
                  children: [
                    { t: "image", query: "badge-a", height: { px: 48 } },
                    { t: "image", query: "badge-b", height: { px: 48 } },
                  ],
                },
                {
                  t: "row",
                  title: "Badges Bottom",
                  gap: "gap",
                  children: [
                    { t: "image", query: "badge-c", height: { px: 48 } },
                    { t: "image", query: "badge-d", height: { px: 48 } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const { template } = astToTemplate(doc, {
    emailId: "test",
    templateId: "52",
    locale: "en-US",
    idPrefix: "t",
  });

  const findByName = (name: string) =>
    Object.keys(template.blocks).find((id) => template.blockMeta?.[id]?.name === name);

  const badgesContainer = findByName("Badges Container");
  const badgesTop = findByName("Badges Top");
  const badgesBottom = findByName("Badges Bottom");

  assert.ok(badgesContainer);
  assert.equal(template.blocks[badgesContainer!]!.wrapperStyle?.widthMode, "hug");
  assert.equal(template.blocks[badgesTop!]!.wrapperStyle?.widthMode, "hug");
  assert.equal(template.blocks[badgesBottom!]!.wrapperStyle?.widthMode, "hug");

  const legalLinks = findByName("Legal Links");
  assert.ok(legalLinks);
  assert.equal(template.blocks[legalLinks!]!.wrapperStyle?.widthMode, "fill");
});

test("restoreNodeHasWidthAnchor：嵌套 row 内的定高 image 栈 → true", () => {
  assert.equal(
    restoreNodeHasWidthAnchor({
      t: "stack",
      title: "Badges Container",
      children: [
        {
          t: "row",
          children: [
            { t: "image", query: "badge-a", height: { px: 48 } },
            { t: "image", query: "badge-b", height: { px: 48 } },
          ],
        },
      ],
    }),
    true
  );
  assert.equal(
    restoreNodeHasWidthAnchor({
      t: "stack",
      title: "Legal Links",
      children: [{ t: "text", content: "Privacy", role: "caption" }],
    }),
    false
  );
});

test("resolveBetweenRowFlexibleStackWidthMode：兄弟有固有宽 → fill；双短文案 → hug", () => {
  const legalStack = {
    t: "stack" as const,
    title: "Legal Links",
    children: [{ t: "text" as const, content: "Privacy", role: "caption" as const }],
  };
  const badgeStack = {
    t: "stack" as const,
    title: "Badges",
    children: [{ t: "image" as const, query: "badge", height: { px: 48 } }],
  };
  const siblings = [legalStack, badgeStack];

  assert.equal(
    resolveBetweenRowFlexibleStackWidthMode(legalStack, siblings, 0),
    "fill"
  );
  assert.equal(rowPeerHasIntrinsicWidthCap(siblings, 0), true);

  const navLeft = {
    t: "stack" as const,
    children: [{ t: "text" as const, content: "LOGO", role: "h1" as const }],
  };
  const navRight = {
    t: "stack" as const,
    children: [{ t: "text" as const, content: "View", role: "caption" as const }],
  };
  const navSiblings = [navLeft, navRight];

  assert.equal(
    resolveBetweenRowFlexibleStackWidthMode(navLeft, navSiblings, 0),
    "hug"
  );
  assert.equal(rowPeerHasIntrinsicWidthCap(navSiblings, 0), false);
});

test("resolveStackWrapperWidthMode：between 下多段文案 + 徽章兄弟 → fill", () => {
  const legalStack = {
    t: "stack" as const,
    title: "左侧免责文本",
    children: [
      { t: "text" as const, content: "Line 1", role: "caption" as const },
      { t: "text" as const, content: "Line 2", role: "caption" as const },
      { t: "text" as const, content: "Line 3", role: "caption" as const },
      { t: "text" as const, content: "Line 4", role: "caption" as const },
    ],
  };
  const badgeStack = {
    t: "stack" as const,
    title: "右侧资质徽章组",
    children: [
      {
        t: "row" as const,
        children: [{ t: "image" as const, query: "badge-a", height: { px: 45 } }],
      },
    ],
  };
  const siblings = [legalStack, badgeStack];

  assert.equal(stackHasMultipleDirectTextChildren(legalStack), true);
  assert.equal(
    resolveStackWrapperWidthMode(legalStack, {
      inDirectRow: true,
      rowAlign: "between",
      rowSiblings: siblings,
      rowSiblingIndex: 0,
    }),
    "fill"
  );
  assert.equal(
    resolveStackWrapperWidthMode(badgeStack, {
      inDirectRow: true,
      rowAlign: "between",
      rowSiblings: siblings,
      rowSiblingIndex: 1,
    }),
    "hug"
  );
});

test("astToTemplate：页脚长文案 + 徽章 between 行左 fill 右 hug", () => {
  const doc: RestoreAstDocument = {
    theme,
    tree: {
      t: "email",
      children: [
        {
          t: "row",
          title: "法律条文与徽章横排",
          align: "between",
          crossAlign: "start",
          gap: "gap",
          children: [
            {
              t: "stack",
              title: "左侧免责文本",
              align: "start",
              gap: "gap",
              children: [
                {
                  t: "text",
                  content: "You received this message because hello@example.com signed up.",
                  role: "caption",
                  tone: "secondary",
                },
                { t: "text", content: "View in browser", role: "caption", tone: "primary" },
                {
                  t: "text",
                  content: "Privacy Policy | Terms of Service",
                  role: "caption",
                  tone: "secondary",
                },
              ],
            },
            {
              t: "stack",
              title: "右侧资质徽章组",
              align: "end",
              gap: "gap",
              children: [
                {
                  t: "row",
                  title: "资质行1",
                  align: "end",
                  gap: "gap",
                  children: [
                    { t: "image", query: "badge-a", height: { px: 45 }, aspect: { w: 45, h: 45 } },
                    { t: "image", query: "badge-b", height: { px: 45 }, aspect: { w: 45, h: 45 } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const { template } = astToTemplate(doc, {
    emailId: "template-mqhos2xu",
    templateId: "55",
    locale: "en-US",
    idPrefix: "t",
  });

  const findByName = (name: string) =>
    Object.keys(template.blocks).find((id) => template.blockMeta?.[id]?.name === name);

  const legalStack = findByName("左侧免责文本");
  const badgeStack = findByName("右侧资质徽章组");
  const firstText = findByName("You received this message becau…");

  assert.ok(legalStack);
  assert.ok(badgeStack);
  assert.equal(template.blocks[legalStack!]!.wrapperStyle?.widthMode, "fill");
  assert.equal(template.blocks[badgeStack!]!.wrapperStyle?.widthMode, "hug");
  if (firstText) {
    assert.equal(template.blocks[firstText]!.wrapperStyle?.widthMode, "fill");
  }
});
