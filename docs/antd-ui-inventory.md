# Easy-Email Ant Design UI 適配層索引

> 截至 2026-06-18：專案 UI 使用 **antd v6** + `@ant-design/icons`。業務程式碼優先透過 `Shop*` 封裝使用，避免散落直接依賴 antd API。

## 全域配置

| 入口 | 說明 |
|------|------|
| `src/components/ui/AppAntdProvider.tsx` | `ConfigProvider` + `zh_CN`  locale |
| `src/main.tsx` | 掛載 `AppAntdProvider` |
| `src/lib/appToast.ts` | 全站 Toast（`toastSuccess` / `toastError` / …）；`configureAppToast` 用於 `top`、`maxCount` |
| `src/antd-admin-field-overrides.css` | 編輯器/CRM 表單控件高度與緊湊輸入後綴樣式 |

## 適配層對照

| 封裝 | 底層 antd | 典型用途 |
|------|-----------|----------|
| `ShopInput` / `ShopTextArea` / `ShopSelect` 等 | Input、Select、Space.Compact | Inspector、Modal、頂欄 |
| `ShopSectionModal` | Modal | 業務彈窗（對外仍接受 `visible` 等舊 prop 名） |
| `ShopSolidButton` / `ShopSwitch` / `ShopDataTable` | Button、Switch、Table | CRM 商家郵件列表 |
| `ColorField`、`TextRichEditor` | ColorPicker | 顏色與富文本 |
| `TopTip` | Tooltip + `QuestionCircleOutlined` | 欄位說明 |
| `SelectablePickerTable` | Radio、Table | 變數/列表綁定向導 |

## 仍直接使用 antd 的邊界

- `RepeatUnbindChoiceModal`、`SelectablePickerRadioCell`：`Radio`
- `EmailCampaignPage` 表格「編輯」列：`Button type="link"`（其餘按鈕/開關/表格已走 `ShopDataControls`）
- `UrlAssetUploadInput`：`Space.Compact` 組合輸入與上傳按鈕

## 開發注意

1. **依賴變更後清 Vite 預構建快取**：`rm -rf node_modules/.vite`（`start.sh` 會在偵測到 lock 變更時提示）
2. **Select 棄用 API**：業務請用 `styles.popup.root`、`onOpenChange`；`ShopSelect` 內部仍映射舊 prop 以減少 diff
3. **PRD 區域截圖**：下拉容器選擇器為 `.ant-select-dropdown`（見 `scripts/prd-get-crop-rect.js`）

郵件 block、template、校驗與渲染核心**不依賴** antd。
