-- add-badge-acknowledged.sql
-- 首頁「你有新獎章！」toast 提醒用：新獎章預設 acknowledged=0（未讀），
-- PK結果頁顯示過（社群類全螢幕彈窗收下、或系統類列在結果頁）之後會
-- 主動標記已讀；週排程（不敗王者/全班守護者）發放的獎章沒有經過結果頁，
-- 會維持未讀，首頁 toast 負責補這個提醒缺口。
--
-- 執行方式：
--   mysql -u root -p pk_english < add-badge-acknowledged.sql

USE pk_english;

ALTER TABLE user_badges ADD COLUMN acknowledged TINYINT(1) NOT NULL DEFAULT 0 AFTER session_id;

-- 部署當下已經存在的舊資料視為已讀，不要讓歷史獎章一次全部跳出來提醒
UPDATE user_badges SET acknowledged = 1;

SHOW COLUMNS FROM user_badges;
