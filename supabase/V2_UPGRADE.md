> 最新要求：日曆不帶入新版。本文件前述歷史規劃以 docs/RELEASE_READY.md 的最新工作資料遷移流程為準；舊表 371 事件保留，新版事件搬移為 0。

# 2.0 隔離資料升級

升級 SQL 已在本機 PostgreSQL 執行並驗證；**未套用正式 Supabase，未切換正式站**。

## 本次保護邊界

- 正式 `teamops_workspaces` 保持原樣，migration 沒有讀取／更新／刪除該表的敘述。
- 唯讀盤點：revision 9、2 案件、5 組員、371 事件；不取得實際工作內容。
- 預覽硬性拒絕正式 project ref，只接受另外的 `https://<ref>.supabase.co` 與 `sb_publishable_` 金鑰。
- 沒有 Google OAuth、Google API 或舊版自動同步。
- `schema.sql`／`DEPLOYMENT.md` 是舊版文件，2.0 測試不要重跑舊版建表。

## 隔離雲端測試（後續）

1. 建立或指定另外一個 Supabase 測試專案，費用／建立決定由使用者確認。
2. 備份測試專案，檢查 migration 狀態，只在測試專案執行 `migrations/20261114094224_teamops_v2_isolated.sql` 一次。
3. 建立兩個測試登入者。在預覽填寫測試 URL 與 publishable key，不使用 secret／service_role。
4. 先登入並載入雲端確認版本。雲端空白時可取消匯入，再選擇上傳示範資料；已有資料時先備份並檢查預覽。
5. 以匿名、A、B 驗證存取／跨帳號關聯及 30 天邊界；執行 Supabase security advisors，處理新增警告。
6. 兩裝置先讀同 revision，A 儲存後 B 應中止上傳；先備份 B 才重新載入。

## 結構與安全

- workspace 儲存 revision、設定、規則／提醒處理與不可變 events／legacyArchive。
- members、clients、work_items、tasks、notes、work_logs 使用 owner＋UUID 複合主鍵、typed／generated 搜尋欄位及 deleted_at，JSONB 保留額外舊欄位。
- member_skills、work_assignments、task_members 正規化專長、多組員及主要／協助角色。
- audit_logs 保存 revision、時間與筆數；不是逐欄位歷史版本。
- 所有 exposed 表啟用 RLS，僅授權 owner SELECT，不允許客戶端直接 DML。
- 公開 save RPC 為 SECURITY INVOKER 薄包裝；寫入限非 exposed `teamops_private.save_snapshot`，固定空 search_path、不接受 owner 參數、先驗證 auth.uid()，每個敘述限定 owner。
- row lock＋workspace revision，正規化資料整批提交或回滾；read RPC 為 STABLE，避免混合不同版本。
- 未滿 30 天資料不可從 snapshot 消失，刪除時間由伺服器設定，滿 30 天不可復原。清理 child-first，任何不安全參照使整批回滾。
- 首次上傳後 events／legacyArchive 不可改動，保護日曆歷史。
- 使用 workspace 全域 revision，並非逐列自動合併；資料量大時可再做細粒度 RPC。

## 舊資料轉換

匯入預覽保留原始 legacyArchive 與事件原文，產生 UUID 並保留 legacyId、姓名轉 UUID，狀態對應「已安排→待安排、潛在需求→待確認、暫停→已暫停」，進度 text／at 對應 content／createdAt。先顯示筆數，確認後下載現有備份才取代本機測試資料。

本機以 371 筆合成事件驗證逐筆深度相等；正式資料未複製到 repo、未實際遷移。正式遷移前須備份雲端與各裝置最新資料，記錄 SHA-256、筆數與 ID 對照，核對真實內容及日期。

## 正式切換／回復（本次不執行）

驗收及另行確認後，凍結舊寫入、備份原 workspace 與本機，於核准環境套用已驗證 migration，單次遷移及筆數／關聯／events hash 比對，驗證 RLS／advisors，再切正式前端。預覽對正式 ref 的封鎖僅在此時經審查調整。

回復時停止新版寫入，先匯出新版資料與 audit，再回切換前 main 和舊 workspace，核對事件 hash／revision。保留新舊表及備份，不同時雙寫；新版已新增資料時須先復核差異，不能靜默覆蓋。

本版未設背景 purge。到期由主管在回收桶手動清理並備份，排程另做權限與備份驗證。

參考：[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)、[Database functions](https://supabase.com/docs/guides/database/functions)。
