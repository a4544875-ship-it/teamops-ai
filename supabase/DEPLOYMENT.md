# TeamOps AI — Supabase 雲端部署紀錄

## 已完成（2026-11-12）
- 為 TeamOps AI 建立獨立 Supabase Free 專案 `edoupxohgamzvixlepiw`，建立報價為 USD 0／月，位於 Tokyo。
- 已執行 `create_secure_teamops_workspace` migration。
- `public.teamops_workspaces` 啟用 RLS；資料依 `auth.uid() = owner_id` 限制存取，未登入禁止查詢。
- GitHub Pages 新增 `cloud.js`：Email/Password Auth、登入、註冊、私人雲端讀寫、revision 衝突偵測。
- 初次登入時會詢問採用雲端或本機資料，不會自動覆蓋本機；離線 JSON 備份仍可使用。
- 安全掃描 `get_advisors(type=security)` 回傳無警告。

## 仍需要使用者完成的設定
1. Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `https://a4544875-ship-it.github.io/teamops-ai/`
   - Redirect URLs 加入同一個 HTTPS 網址及需要的路徑。
2. Authentication → Providers → Email，確認 Email/password 登入及註冊、驗證信設定。首次請由 Carlos 建立並驗證帳號，再考慮停用公開註冊。
3. 使用者以 Email/密碼登入 TeamOps AI，在 Settings → 私人雲端同步完成第一次資料遷移，再用另一個瀏覽器驗證同步。
4. 不要將真實客戶資訊、資料備份或 service_role 金鑰存入 GitHub。

## Google Calendar
- 網站已加入 `google-calendar.js` 唯讀整合入口，但沒有事先設定或取得 OAuth Client ID。
- 請在 Google Cloud 建立 Web OAuth Client；Authorized JavaScript origins 設為 `https://a4544875-ship-it.github.io`。
- Google OAuth Consent Screen 需啟用 Calendar readonly scope；若 Testing 狀態需將 Carlos 加為測試使用者。
- Google Calendar API 須在該 Google Cloud 專案啟用。
- 網頁設定中輸入 Google OAuth Client ID；授權後列出可見日曆，將日曆 ID 各自對應到 Carlos、Ted、Duan、Beck、Danny。
- 點擊「立即同步」：目前取過去 30 天到未來 90 天的已授權日曆事件，保持唯讀，並在授權網頁中保存副本到本機與已登入雲端。
- Google OAuth access token 僅存在頁面記憶體，本版不會在關閉網站後背景自動同步；要做真正排程同步，需要額外後端安全保存 refresh token 與 Google OAuth Client Secret。

## 雲端已啟用但未驗證的項目
- 使用者尚未親自完成首次註冊登入；故實際 Auth 電子郵件驗證、跨裝置同步及 Google 同步尚未端對端測試。
- 須先備份目前本機資料再做首次上雲。
- 第一版以 JSON workspace 方式保存，後續可改成正規化表格及衝突合併。
