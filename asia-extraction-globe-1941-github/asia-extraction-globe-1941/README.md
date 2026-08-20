# 帝國的輸血線 · 1941—1945

一個可旋轉、可縮放的歷史互動地球，用復古航空畫報的視覺語言重構 1941—1945 年亞洲與太平洋的佔領、資源攫取、海運、空運、戰略轟炸與抗戰時間線。

這是批判性的歷史可視化，不是逐船、逐航班的精確航跡，也不替殖民宣傳語言背書。線路、控制區與事件節點均為依據公開史料整理的解釋性示意。

## 功能

- Three.js 高精度地球：亞洲主視角、拖曳旋轉、滾輪／雙指縮放與晝夜線。
- 深藍資源輸入、淺藍商品輸出、紅色佔領高弧、黃色日軍作戰高弧、冰藍盟軍航空與戰略轟炸航線。
- 1941—1945 時間線自動循環，城市會按失守、收復與受降事件變色。
- 中途島海戰、帛琉盟軍反攻／貝里琉、臺灣沖航空戰（臺灣沖海戰）、塞班、提尼安與廣島／長崎事件標記。
- 清邁、昆明、重慶、成都、桂林、溫州、廣州節點長按 1.5 秒進入城市檔案頁。
- 可嵌入 React 遊戲介面，或獨立作為網站運行。

## 本地運行

要求：Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

開啟 `http://localhost:3000`（若端口被占用，vinext 會提示實際端口）。

## 建置與驗證

```bash
npm run build
npm test
npm run lint
```

建置會生成 Sites／vinext 所需的 `dist/`；`dist/`、`.next/`、`.vinext/`、`.wrangler/` 與 `node_modules/` 已列入 `.gitignore`，不應提交到 GitHub。

## 嵌入 React

```tsx
import { ExtractionGlobe } from "./app/components";

export function GameMapPanel() {
  return <ExtractionGlobe embedded className="game-map" />;
}
```

容器必須有明確高度。透過 `ref` 可調用 `setDensity`、`setTransport`、`setPaused`、`setTimeline`、`focusAsia`、`focusPacific`、`focusAtlantic`、`zoomIn` 與 `zoomOut`。

獨立掛載方式：

```ts
import { mountExtractionGlobe } from "./app/components";

const handle = mountExtractionGlobe(document.querySelector("#globe")!);
handle.controller?.setDensity(1.5);
// handle.unmount();
```

## 目錄說明

| 路徑 | 用途 |
| --- | --- |
| `app/components/ExtractionGlobe.tsx` | Three.js 地球、航線、事件、城市命中與互動控制 |
| `app/page.tsx` | 主頁、圖例、歷史時間線與控制面板 |
| `app/cities/[slug]/page.tsx` | 七個城市檔案頁 |
| `app/data/` | 生成後的海運路線資料 |
| `public/` | 地球、邊界、佔領圖層與史料地圖資源 |
| `scripts/` | 路線、地形與佔領紋理生成腳本 |
| `.openai/hosting.json` | Sites 專案部署綁定（不含密鑰） |

## 生成資產

`public/` 中已包含可直接運行的生成資產。若要重新生成邊界、佔領時間線或海運路線，請先安裝對應 Python 依賴，再執行 `scripts/` 下的腳本；生成後重新執行 `npm run build`。

## GitHub 上傳

本包已排除依賴、編譯輸出與本地快取。可直接解壓後建立 GitHub repository，再執行：

```bash
git init
git add .
git commit -m "Initial import: Asia extraction globe 1941-1945"
git branch -M main
git remote add origin https://github.com/<your-account>/<your-repository>.git
git push -u origin main
```

若使用 GitHub 的網頁上傳，請上傳解壓後的專案內容，而不是把壓縮檔再套一層目錄。

## 資產與史料說明

歷史地圖掃描、NASA 地球影像與 Natural Earth 邊界資料各自保留原始來源與授權條件。公開發布前，請依你的 GitHub repository 需求補充相應的來源連結與授權聲明。
