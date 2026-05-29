import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  prepareEmailPreviewInnerHtmlForDelivery,
  stripForbiddenEmailPresentationInlineStyles,
} from "./emailDeliveryExport";
import {
  wrapperBackgroundImageCssUrl,
  wrapperBackgroundImageTdPresentationStyle,
} from "./wrapperBackgroundImagePresentation";

describe("wrapperBackgroundImagePresentation", () => {
  it("cover 时写入 background-size 与 background-position", () => {
    const style = wrapperBackgroundImageTdPresentationStyle(
      {
        src: "https://example.com/a.jpg",
        fit: "cover",
        position: "left center",
      },
      { height: "100px", fallbackColor: "#f0f0f0" }
    );
    assert.equal(style.backgroundSize, "cover");
    assert.equal(style.backgroundPosition, "left center");
    assert.equal(style.height, "100px");
    assert.match(wrapperBackgroundImageCssUrl("https://example.com/a.jpg"), /url\("https:\/\/example.com\/a.jpg"\)/);
  });

  it("contain 时 background-size 为 contain", () => {
    const style = wrapperBackgroundImageTdPresentationStyle(
      { src: "https://example.com/a.jpg", fit: "contain", position: "right bottom" },
      {}
    );
    assert.equal(style.backgroundSize, "contain");
    assert.equal(style.backgroundPosition, "center");
  });
});

describe("prepareEmailPreviewInnerHtmlForDelivery · 底图叠放", () => {
  it("剥离后仍保留 td 背景裁切，且无 object-fit / position:absolute", () => {
    if (typeof document === "undefined") return;
    const scope = document.createElement("div");
    scope.className = "email-preview-scope";
    scope.innerHTML = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;height:100px;border-collapse:collapse;">
        <tbody><tr>
          <td background="https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg"
              align="left" valign="middle"
              style="width:100%;height:100px;min-height:100px;background-image:url(&quot;https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg&quot;);background-size:cover;background-position:center;background-repeat:no-repeat;background-color:#f0f0f0;padding:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
              <tbody><tr>
                <td align="left" valign="middle" style="padding:0;vertical-align:middle;line-height:0;font-size:0;">
                  <div style="background-color:#0D9488;border-radius:4px;height:16px;width:61px;">
                    <div class="email-text-content"><p><strong>叠放子 hug</strong></p></div>
                  </div>
                </td>
              </tr></tbody>
            </table>
          </td>
        </tr></tbody>
      </table>`;
    document.body.appendChild(scope);
    const html = prepareEmailPreviewInnerHtmlForDelivery(scope);
    assert.match(html, /background-size:\s*cover/i);
    assert.match(html, /叠放子 hug/);
    assert.doesNotMatch(html, /object-fit/i);
    assert.doesNotMatch(html, /position:\s*absolute/i);
    scope.remove();
  });

  it("stripForbidden 不移除 background-size", () => {
    if (typeof document === "undefined") return;
    const root = document.createElement("div");
    root.innerHTML = `<td style="background-size:cover;background-position:center"></td>`;
    stripForbiddenEmailPresentationInlineStyles(root);
    const td = root.querySelector("td") as HTMLTableCellElement;
    assert.equal(td.style.backgroundSize, "cover");
  });
});
