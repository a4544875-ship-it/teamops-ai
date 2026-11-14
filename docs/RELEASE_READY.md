# TeamOps AI 2.0 正式發布準備

狀態：程式與本機驗證完成，**正式 Supabase 升級被自動核准審查拒絕；尚未合併 main 或發布正式站**。需要使用者明確核准正式資料庫升級／資料遷移後，才能進行後續步驟。

## 已完成

- 對既有正式 workspace 做唯讀備份。備份及轉換資料只在本機 `work/private`，不進入 GitHub、PR、公開網站或預覽 HTML。
- 盤點：revision 9，2 案件、5 組員、371 事件。轉換後事件逐筆深度相等，原始資料另保留 legacyArchive。
- 正式網址才啟用正式雲端，localhost／單檔預覽仍保持隔離；正式入口登入前不顯示資料、不產生示範案件。
- 正式資料以登入者 UUID 隔離本機暫存；載入雲端後才啟用自動儲存，CAS 衝突停止上傳、保留本機修改。
- 已測試未同步暫存遇到較新雲端時不覆蓋／不上傳，登出後回到登入畫面。
- 原資料表只在完整遷移核對成功後撤銷舊版寫入權限，避免舊快取頁面與新版同時寫入不同來源。

## 核准後的固定順序

1. 再次唯讀確認 legacy revision／fingerprint；如有變動，重新備份與轉換，不能沿用舊快照。
2. 套用已在本機 PostgreSQL 驗證的 `supabase/migrations/20261114094224_teamops_v2_isolated.sql`，新增 11 張表及 RLS／RPC。保留原表及所有事件。
3. 使用本機私有備份執行 `node scripts/prepare-release.cjs <private-backup.json>`。它只產生私有 backfill SQL，不連線、不發布。於核准的正式資料庫執行該 SQL；來源 fingerprint／revision 不符會中止，已初始化的 v2 會拒絕重跑。
4. 用 owner RLS 角色讀取新資料，核對案件／組員／事件筆數、ID 關聯、events 與 legacyArchive 精確相等；在 rollback 交易中驗證錯誤 revision、匿名與另一 UUID 不能改寫資料。
5. 套用 `supabase/migrations/20261114113900_release_guardrails.sql`：先取得原表寫入鎖，驗證新版封存與原表完全相同，再撤銷原表 authenticated DML。任一差異會整批中止，不凍結原版。
6. 執行 Supabase security advisors，處理新增資料表／函式問題。既有 Auth 外洩密碼檢查未啟用是原有設定，不在此次任意修改。
7. 合併經測試的開發分支到 main，等待 GitHub Pages 部署完成；驗證正式網址是小熊 2.0、登入入口、資源無 404、未登入不顯示資料、日常 Google Calendar 不載入。
8. 使用者以原帳密登入驗收。跨實體裝置與真實 Email 登入需使用者完成；不捏造這部分的驗證結果。

## 回復

若發布或遷移失敗，停止切換。保留新增表與私有備份；正式前端回到 `dcfcb79501f432d808c7ff47b2683e7467846102`。若已撤銷舊表寫入，只有在決定回復舊版、確認 v2 新資料已備份及差異已核對後，才恢復原 authenticated insert/update/delete grants。不得清空表、刪除事件或同時開放新舊版本寫入。

## 驗證結果

32/32 測試通過：原 23 項加上正式登入／同步／衝突／未同步暫存／登出、來源不一致的切換拒絕、舊版唯讀切換與私有 backfill 準備。真實正式資料庫尚未升級，真實登入及正式網址驗證要在獲准切換後執行；不把模擬測試當成正式上線驗證。
