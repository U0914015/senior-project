-- add-student-transfers.sql
-- 轉學生保留帳號機制：學生轉班（換到同一位老師底下的另一個班級）時，
-- 沿用同一個 user_id（帳號、歷史作答紀錄、獎章都不會斷），只是重新指定
-- class_id/group_id。這張表純粹是留一筆紀錄方便學姊寫論文方法論時交代
-- 「有幾個學生轉班、轉班當下實驗組別怎麼處理」，不影響任何遊戲邏輯。
--
-- 執行方式：
--   mysql -u root -p pk_english_senior < add-student-transfers.sql

CREATE TABLE IF NOT EXISTS student_transfers (
  transfer_id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id                INT NOT NULL,
  old_class_id           INT NOT NULL,
  new_class_id           INT NOT NULL,
  old_group_id           INT,
  new_group_id           INT,
  -- 轉班當下這個學生「有效」的實驗組別（覆寫值或沿用班級預設，取當下算出來的
  -- 結果），轉班時會把這個值明確寫進 users.experiment_group，避免因為轉去
  -- 一個預設組別不同的班級，實驗條件被意外換掉
  experiment_group_kept  ENUM('experimental', 'control') NOT NULL,
  transferred_by         INT NOT NULL,
  transferred_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)        REFERENCES users(user_id)     ON DELETE CASCADE,
  FOREIGN KEY (old_class_id)   REFERENCES classes(class_id),
  FOREIGN KEY (new_class_id)   REFERENCES classes(class_id),
  FOREIGN KEY (transferred_by) REFERENCES users(user_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
