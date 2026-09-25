-- add-rescue-mechanic.sql
-- PK 呼救/搶救機制：每人一樣要先面對自己被指派到的題目（維持個人強制作答，
-- 不重蹈搶答制讓弱的學生沒機會作答的覆轍），但卡住時可以丟出來讓隊友來救，
-- 解決「搭便車問題」的同時又比純粹各自作答更有 PK 臨場感，也讓「幫隊友」
-- 變成一個真實可觀察、可頒獎章的社群支持行為（不是只有PK結束後補評的
-- 按讚/貼紙/留言）。
--
-- 執行方式：
--   mysql -u root -p pk_english < add-rescue-mechanic.sql

USE pk_english;

-- 記錄「這題其實是隊友幫忙答的」，方便：
--   1. 團隊 PK 總分照常計入（SUM 不分是不是被救的）
--   2. 但這題要從當事人自己的「個人正確率」統計裡排除，不然個人能力
--      資料會被隊友的知識污染，破壞前後測比對的資料基礎
ALTER TABLE game_logs ADD COLUMN rescued_by_user_id INT NULL AFTER user_id;

-- 呼救/搶救流程的狀態機：open（開放求救中）→ claimed（有人搶到，正在答）
-- → resolved（答完了，不管對錯）；requester 也可以主動取消變成 cancelled
CREATE TABLE help_requests (
  request_id   INT AUTO_INCREMENT PRIMARY KEY,
  session_id   INT NOT NULL,
  question_id  INT NOT NULL,
  requester_id INT NOT NULL,
  status       ENUM('open','claimed','resolved','cancelled') NOT NULL DEFAULT 'open',
  claimed_by   INT NULL,
  is_correct   TINYINT(1) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at  DATETIME NULL,
  INDEX idx_session (session_id),
  INDEX idx_requester (session_id, requester_id)
);

-- 新獎章：神隊友——成功幫隊友解圍達 3 次。屬於 social_action 類別，
-- 跟按讚/貼紙/留言那些「社群主動付出」獎章同一掛，只有實驗組看得到、
-- 拿得到（呼救機制本身就是社群支持功能，只在實驗組開放，跟
-- SocialModal 的邏輯一致）。
INSERT INTO badges (badge_id, badge_name, badge_category, badge_tier, condition_desc, condition_value, icon_emoji, is_active)
VALUES (25, '神隊友', 'social_action', 'gold', '成功幫隊友解圍達 3 次', 3, '🦸', 1);

SHOW COLUMNS FROM game_logs LIKE 'rescued_by_user_id';
SHOW TABLES LIKE 'help_requests';
