# 🌷 TeamOps AI — Carlos 的主管工作助理

GitHub Pages 網站： https://a4544875-ship-it.github.io/teamops-ai/

單人主管用的案件管理、客戶與工程師資料、私人待辦、團隊日曆與行程提醒。

## 功能
- 奶油白／柔粉／深色主題，手機桌面 PWA
- 案件、筆記、待辦、行程、組員、客戶可新增、編輯、刪除
- 案件進度紀錄可修改與刪除；刪除案件會保留相關待辦／筆記並解除關聯
- 五位初始成員：Carlos、Ted、Duan、Beck、Danny；可自行新增或移除
- Google Calendar ICS 匯入；另提供 OAuth 唯讀同步（需額外設定）
- JSON 備份、還原；瀏覽器本機離線可用
- Supabase Auth 登入與私人雲端同步（先登入並完成首次資料遷移）

## 新版雲端資料
獨立 Supabase Free 專案 `teamops-ai`，資料存取以 authenticated 使用者 ID 的 RLS 控制，雲端資料與 GitHub 公開程式碼完全分離。登入後遇到雲端／本機資料差異會提示選擇；跨裝置版本衝突時會停止上傳以避免靜默覆蓋。

**目前狀態：** 雲端後端與介面已接入，但首次 Email 註冊／驗證、跨裝置實際測試尚待 Carlos 操作確認。參見 [完整設定步驟](supabase/DEPLOYMENT.md)。

## Google Calendar 唯讀
需 Carlos 自行建立 Google Cloud Web OAuth Client，允許來源 `https://a4544875-ship-it.github.io`，並啟用 Google Calendar API。填入 OAuth Client ID，授權後將 Google 日曆 ID 對應到工程師，再執行同步。OAuth 權杖僅在當前瀏覽器頁面記憶體保留，不會被寫入 GitHub 或資料庫。**本版不會在關閉網站後背景同步**，如需背景同步必須增加安全後端的授權管理。

## 安全
請勿上傳公司客戶資料、日曆 ICS、JSON 備份、任何密碼或 API Secret 到 GitHub。Supabase publishable key 可以放前端，但 secret / service_role key 絕不可放前端。登入過的共用電腦請登出並清除網站資料，定期匯出加密保存備份。
