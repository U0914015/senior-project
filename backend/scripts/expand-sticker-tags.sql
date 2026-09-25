-- expand-sticker-tags.sql
-- 貼紙互動原本只有 3 種（brave/clear/helpful），社群互評彈窗補到 9 種，
-- social_logs.sticker_tag 的 ENUM 要跟著擴充，不然新貼紙送出時會被
-- MySQL 拒絕寫入（ENUM 值不在允許清單內）。
--
-- 執行方式：
--   mysql -u root -p pk_english < expand-sticker-tags.sql

USE pk_english;

ALTER TABLE social_logs
  MODIFY sticker_tag
  ENUM('brave','clear','helpful','awesome','keep_going','smart','fast','teamwork','creative')
  NULL;

SHOW COLUMNS FROM social_logs LIKE 'sticker_tag';
