import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyEmailTextContentParagraphReset,
  bakeDeliveryExportMeasuredBoxes,
  computeDeliveryExportMeasuredBoxPatch,
  finalizePresentationLeafShellsForDelivery,
  hasExplicitCssLength,
  prepareEmailPreviewInnerHtmlForDelivery,
} from "./emailDeliveryExport";
import { deliveryExportBoxModeDataAttrs } from "../render-defaults-contract/deliveryExport";
import { getRenderDefaultRule } from "../render-defaults-contract";

describe("deliveryExportBoxModeDataAttrs", () => {
  it("从 wrapperStyle 派生 data-ee-*Mode", () => {
    assert.deepEqual(
      deliveryExportBoxModeDataAttrs({ heightMode: "hug", widthMode: "fill" }),
      {
        "data-ee-height-mode": "hug",
        "data-ee-width-mode": "fill",
      }
    );
    assert.deepEqual(deliveryExportBoxModeDataAttrs(null), {});
  });
});

describe("computeDeliveryExportMeasuredBoxPatch", () => {
  it("hug 且无显式 height/width 时写入实测 px", () => {
    assert.deepEqual(
      computeDeliveryExportMeasuredBoxPatch(
        { heightMode: "hug", widthMode: "hug" },
        { width: 61.4, height: 16.2 },
        {}
      ),
      { height: "16px", width: "61px" }
    );
  });

  it("fixed 或已有显式长度时不覆盖", () => {
    assert.deepEqual(
      computeDeliveryExportMeasuredBoxPatch(
        { heightMode: "fixed", widthMode: "hug" },
        { width: 576, height: 100 },
        { height: "100px", width: "fit-content" }
      ),
      { width: "576px" }
    );
    assert.deepEqual(
      computeDeliveryExportMeasuredBoxPatch(
        { heightMode: "hug" },
        { width: 10, height: 49 },
        { height: "120px" }
      ),
      {}
    );
  });

  it("fill 模式不烘焙", () => {
    assert.deepEqual(
      computeDeliveryExportMeasuredBoxPatch(
        { heightMode: "fill", widthMode: "fill" },
        { width: 600, height: 200 },
        {}
      ),
      {}
    );
  });
});

describe("bakeDeliveryExportMeasuredBoxes · 叶壳背景 td", () => {
  it("hug 高时以带背景的 inner td 实测并同步写入 clone td", () => {
    if (typeof document === "undefined") return;
    const scope = document.createElement("div");
    scope.innerHTML = `
      <div data-ee-height-mode="hug" data-ee-width-mode="hug" style="display:inline-block;line-height:1.3;font-size:12px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
          <tbody><tr>
            <td style="background-color:#3B82F6;padding:4px 8px;line-height:0;font-size:0;">
              <div class="email-text-content" style="font-size:12px;line-height:1.3;">标签</div>
            </td>
          </tr></tbody>
        </table>
      </div>`;
    document.body.appendChild(scope);
    const outer = scope.firstElementChild as HTMLElement;
    const td = outer.querySelector("td") as HTMLTableCellElement;
    Object.defineProperty(td, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ width: 48, height: 24, top: 0, left: 0, right: 48, bottom: 24, x: 0, y: 0, toJSON: () => ({}) }),
    });
    Object.defineProperty(outer, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ width: 50, height: 28, top: 0, left: 0, right: 50, bottom: 28, x: 0, y: 0, toJSON: () => ({}) }),
    });

    const clone = scope.cloneNode(true) as HTMLElement;
    bakeDeliveryExportMeasuredBoxes(scope, clone);
    const cloneTd = clone.querySelector("td") as HTMLTableCellElement;
    const cloneOuter = clone.firstElementChild as HTMLElement;
    assert.equal(cloneTd.style.height, "24px");
    assert.equal(cloneOuter.style.height, "24px");
    assert.equal(cloneTd.style.lineHeight, "0");
    assert.equal(cloneTd.style.fontSize, "0");
    scope.remove();
  });
});

describe("finalizePresentationLeafShellsForDelivery", () => {
  it("带背景叶壳同步 anti-strut、烘焙高度，并剥离外层重复 appearance", () => {
    if (typeof document === "undefined") return;
    const scope = document.createElement("div");
    scope.className = "email-preview-scope";
    scope.innerHTML = `
      <div data-ee-height-mode="hug" data-ee-width-mode="hug"
           style="display:inline-block;line-height:1.3;font-size:12px;background-color:#3B82F6;border:1px solid #000;padding:8px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
          <tbody><tr>
            <td style="background-color:#3B82F6;padding:4px 8px;border:1px solid #000;line-height:0;font-size:0;">
              <div class="email-text-content" style="font-size:12px;line-height:1.3;">
                <p><strong>A</strong></p>
              </div>
            </td>
          </tr></tbody>
        </table>
      </div>`;
    document.body.appendChild(scope);
    const outer = scope.firstElementChild as HTMLElement;
    const td = outer.querySelector("td") as HTMLTableCellElement;
    Object.defineProperty(td, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ width: 20, height: 16, top: 0, left: 0, right: 20, bottom: 16, x: 0, y: 0, toJSON: () => ({}) }),
    });
    const html = prepareEmailPreviewInnerHtmlForDelivery(scope);
    assert.match(html, /line-height:\s*0/);
    assert.match(html, /height:\s*16px/);
    assert.doesNotMatch(html, /display:\s*inline-block[^>]*background-color:\s*#3B82F6/i);
    assert.doesNotMatch(html, /display:\s*inline-block[^>]*border:\s*1px/i);
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const p = wrap.querySelector(".email-text-content p") as HTMLElement;
    assert.equal(p.style.margin, "0px");
    assert.equal(p.style.padding, "0px");
    scope.remove();
  });
});

describe("applyEmailTextContentParagraphReset", () => {
  it("为 .email-text-content 内 p 写入 margin/padding 0", () => {
    if (typeof document === "undefined") return;
    const root = document.createElement("div");
    root.innerHTML = `<div class="email-text-content"><p>字</p></div>`;
    applyEmailTextContentParagraphReset(root);
    const p = root.querySelector("p") as HTMLElement;
    assert.equal(p.style.margin, "0px");
    assert.equal(p.style.padding, "0px");
  });
});

describe("hasExplicitCssLength", () => {
  it("fit-content / auto 视为未显式定长", () => {
    assert.equal(hasExplicitCssLength("fit-content"), false);
    assert.equal(hasExplicitCssLength("auto"), false);
    assert.equal(hasExplicitCssLength("120px"), true);
  });
});

describe("render-defaults 规则目录", () => {
  it("semantic.deliveryExportMeasuredBox 存在", () => {
    const rule = getRenderDefaultRule("semantic.deliveryExportMeasuredBox");
    assert.ok(rule);
    assert.equal(rule?.kind, "specialSemantic");
    assert.match(rule?.summary ?? "", /hug/);
  });
});
