-- add-attendance-and-resume.sql
-- 支援「小組有人未到班」跟「PK中途離線重進」兩個問題的共用底層機制：
-- 用 users.absent_date 記錄某學生今天請假，PK場次判斷「還要幾人才算
-- 完成」時排除掉。只存單一日期欄位，不做成歷史紀錄表——目前只是要
-- 解決卡場次的問題，不是要做出席分析。
--
-- 執行方式：
--   mysql -u root -p pk_english < add-attendance-and-resume.sql

USE pk_english;

ALTER TABLE users ADD COLUMN absent_date DATE NULL AFTER experiment_group;

SHOW COLUMNS FROM users LIKE 'absent_date';
