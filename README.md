# TeamOps AI — GitHub Pages 測試版

這是 **純靜態網站**，用於 Carlos 個人測試案件記事、待辦、五位工程師行程及安排建議。預設不含任何真實客戶／組員私人行程。

## 部署至 GitHub Pages

1. 在 GitHub 建立一個新 repository，例如 `teamops-ai`。
2. 將本資料夾中的 **`index.html`、`manifest.webmanifest`、`icon.svg`、`sw.js`、`.nojekyll`** 上傳至 repository **根目錄**（不要多包一層資料夾）。README 與 .gitignore 也可以一起上傳。
3. 開啟 repository 的 **Settings → Pages**，在 **Build and deployment** 選 **Deploy from a branch**。
4. 選擇 `main`、`/(root)` 並 **Save**。
5. 網址通常是 `https://<你的帳號>.github.io/teamops-ai/`；請等 GitHub 顯示部署成功，再開啟。

也可以用 Git 指令：
```bash
git init
git add .
git commit -m "Deploy TeamOps AI static MVP"
git branch -M main
git remote add origin https://github.com/<你的帳號>/teamops-ai.git
git push -u origin main
```
（使用 Git 指令前，先在 GitHub 建立空 repository。）

## 注意：這不是有登入保護的私人網站

- **GitHub Pages 網址可被其他人開啟**。即使把 repo 設為 private，也不應視為 Pages 已受到身分驗證保護。
- 程式碼、範例及公開 assets 會提供給訪客；**不要上傳備份 JSON、ICS、客戶清單、密碼、金鑰、OAuth token 或真實案件資料**。
- 現階段案件資料只存在使用者自己的瀏覽器 `localStorage`，不會上傳 GitHub，也不會跨 Windows/iPhone 同步。若在別人的裝置開啟網站，該裝置的使用者可看到自己在該瀏覽器輸入的資料。
- 從 `file://` 版移到 GitHub Pages 後，資料**不會自動搬移**：先匯出 JSON，再到新網址匯入。請保管備份，不要提交到 GitHub。
- 若是公司真實機密資料，建議先僅使用原本離線 HTML；等未來做登入、存取控制及加密後再將正式資料移到線上。
- PWA／Service Worker 只快取**公用應用程式檔案**，不快取案件資料。第一次開啟需有網路，之後可嘗試離線開啟；Safari/iOS 的離線保存由瀏覽器政策決定，無法保證永久保存。
- 日曆是手動建立或匯入 ICS，**不會自動連 Google Calendar**；本機提醒不是推播通知，也未串接 AI 模型。

## 版本更新

更新檔案後 push 到 `main`，GitHub Pages 將重新部署。更新 `sw.js` 中的 CACHE_NAME 版本，避免離線快取保留舊版；請不要刪除使用者瀏覽器資料，必要時重新整理頁面。

## 測試清單

- [ ] 電腦開啟首頁；淺色、粉色、深色切換正常
- [ ] 建立案件、待辦、行程，再刷新頁面，資料仍在
- [ ] 載入示範資料（不是真實資料）
- [ ] JSON 匯出 → 匯入還原成功
- [ ] 五位成員 Carlos、Ted、Duan、Beck、Danny 都存在
- [ ] iPhone Safari 開啟並加入主畫面
- [ ] 第一次連線載入後斷網，再試離線打開
