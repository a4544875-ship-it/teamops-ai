# TeamOps AI 2.0 正式發布準備

狀態：使用者已於排除日曆後核准正式上線。正式資料表、僅工作資料遷移及 owner 讀寫／隔離／版本保護已完成驗證，接續執行舊表唯讀與 GitHub Pages 發布。

## 已完成

- 對既有正式 workspace 做唯讀備份。備份及轉換資料只在本機 `work/private`，不進入 GitHub、PR、公開網站或預覽 HTML。
- 盤點：revision 9，舊系統有 2 案件、5 組員、371 筆 Google 日曆副本。依最新要求，新版只搬工作資料，日曆搬移數為 0；371 筆只留在原表與私有原始備份。新版 legacyArchive 也排除 events，避免隱藏副本被帶入。
- 正式網址才啟用正式雲端，localhost／單檔預覽仍保持隔離；正式入口登入前不顯示資料、不產生示範案件。
- 正式資料以登入者 UUID 隔離本機暫存；載入雲端後才啟用自動儲存，CAS 衝突停止上傳、保留本機修改。
- 已測試未同步暫存遇到較新雲端時不覆蓋／不上傳，登出後回到登入畫面。
- 原資料表只在完整遷移核對成功後撤銷舊版寫入權限，避免舊快取頁面與新版同時寫入不同來源。

## 核准後的固定順序

1. 再次唯讀確認 legacy revision／fingerprint；如有變動，重新備份與轉換，不能沿用舊快照。
2. 套用已在本機 PostgreSQL 驗證的 `supabase/migrations/20261114094224_teamops_v2_isolated.sql`，新增 11 張表及 RLS／RPC。保留原表及所有舊事件，不把事件複製到新版。
3. 使用本機私有備份執行 `node scripts/prepare-release.cjs <private-backup.json>`。它只產生私有 backfill SQL，不連線、不發布。於核准的正式資料庫執行該 SQL；來源 fingerprint／revision 不符會中止，已初始化的 v2 會拒絕重跑。
4. 用 owner RLS 角色讀取新資料，核對案件／組員筆數、ID 關聯、新版 events 為空、legacyArchive 等於原資料去除 events、settings、reminders；原表 371 筆事件及原始指紋不變；在 rollback 交易中驗證錯誤 revision、匿名與另一 UUID 不能改寫資料。
5. 套用 `supabase/migrations/20261114113900_release_guardrails.sql`：先取得原表寫入鎖，驗證新版工作資料封存等於原表去除 events、settings、reminders，且新版事件陣列為空，再撤銷原表 authenticated DML。任一差異會整批中止，不凍結原版。
6. 執行 Supabase security advisors，處理新增資料表／函式問題。既有 Auth 外洩密碼檢查未啟用是原有設定，不在此次任意修改。
7. 合併經測試的開發分支到 main，等待 GitHub Pages 部署完成；驗證正式網址是小熊 2.0、登入入口、資源無 404、未登入不顯示資料、日常 Google Calendar 不載入。
8. 使用者以原帳密登入驗收。跨實體裝置與真實 Email 登入需使用者完成；不捏造這部分的驗證結果。

## 回復

若發布或遷移失敗，停止切換。保留新增表與私有備份；正式前端回到 `dcfcb79501f432d808c7ff47b2683e7467846102`。若已撤銷舊表寫入，只有在決定回復舊版、確認 v2 新資料已備份及差異已核對後，才恢復原 authenticated insert/update/delete grants。不得清空表、刪除事件或同時開放新舊版本寫入。

## 驗證結果

34/34 測試通過：原 23 項加上正式登入／同步／衝突／未同步暫存／登出、來源不一致的切換拒絕、舊版唯讀切換與私有 backfill 準備。正式資料庫已升級且 RLS／版本／讀寫驗證完成，真實登入及正式網址驗證接續執行；不把模擬測試當成正式上線驗證。

最新範圍：使用者明確要求日曆不要同步上去。前端同步與資料庫 save RPC 都拒絕任何非空日曆事件（包括 legacyArchive 內的副本）；這不授權刪除舊事件，正式切換已在此次後續訊息取得核准。

## 執行紀錄

正式 v2 revision 1：2 案件、5 組員、0 日曆。原表 revision 9、371 事件及指紋未變。自動核准審查曾擋下含日曆設定的 archive，因此已改為只保留工作欄位；Google client 設定、日曆對應信箱、舊提醒不進入新版，新增回歸測試通過後才成功搬移。原表和私有原始備份仍保留完整原文。

Security advisors 無新增資料表／RLS 問題，僅有原有的 [Leaked Password Protection Disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)，此帳號安全設定未在本次任意修改。
