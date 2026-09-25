-- add-activity-logs.sql
-- 獎章系統改版新增：記錄「單字複習翻牌」「單字選擇題練習」「聽力發音點擊」
-- 這三種學習區操作次數，用來發放「單字複習狂」「練習不手軟」「聽力小耳朵」獎章。
--
-- 執行方式：
--   mysql -u root -p pk_english_senior < add-activity-logs.sql

CREATE TABLE IF NOT EXISTS activity_logs (
  log_id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  activity_type ENUM('word_review', 'word_practice', 'listening') NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_activity (user_id, activity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
