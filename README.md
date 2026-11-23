# 實像媒體 AR 名片

《主編的紅色按鈕》的周邊：用手機掃名片，遊戲角色會從名片上浮出來，變成全息投影。

- 網址：https://cqh8959-lab.github.io/red-button-ar/
- 沒有名片也能看效果：https://cqh8959-lab.github.io/red-button-ar/?preview

## 怎麼用
1. 用手機掃名片背面的 QR Code（`assets/qr.png`），打開網頁。
2. 按「開啟相機，掃描名片」，允許使用相機。
3. 把鏡頭對準名片正面（`assets/card_front.jpg`），角色就會浮出來。
4. 上方的圓形按鈕可以切換角色；START 是重新投影一次。

建議用 iPhone 的 Safari、Android 的 Chrome。網頁要用 https 開（GitHub Pages 就是）。

## 檔案
| 檔案 | 用途 |
|---|---|
| `index.html`、`style.css`、`app.js` | 網頁本體 |
| `assets/card_front.jpg` | 名片正面（手機用來辨識的圖），1063×591，名片 90×50 mm、300 dpi |
| `assets/card.mind` | 名片正面的辨識特徵（換名片正面的圖，就要重新產生） |
| `assets/char1~3.png` | 角色立繪（去背 PNG） |
| `assets/qr.png` | 網址的 QR Code，印在名片背面 |
| `vendor/` | 用到的程式庫（MindAR、three.js），放在這裡就不用連外部網站 |

## 換角色
1. 把去背的角色 PNG 放進 `assets/`。
2. 打開 `app.js`，修改最上面的 `CHARACTERS`：名字、身分、介紹、圖片路徑。

## 換名片正面的圖
1. 新的圖要細節多、對比強，不要大片純色或重複的花紋；名片用霧面印刷比較好辨識。
2. 用 MindAR 的編譯工具把圖轉成 `.mind` 檔，取代 `assets/card.mind`：
   https://hiukim.github.io/mind-ar-js-doc/tools/compile
3. 同時更新 `assets/card_front.jpg`（預覽模式會用到）。

## 架站（GitHub Pages）
倉庫的 Settings → Pages → Branch 選 `main`、資料夾選 `/ (root)` → Save。等一兩分鐘，網址就能打開。

## 授權
- MindAR（`vendor/mindar`）：MIT License
- three.js（`vendor/three`）：MIT License
