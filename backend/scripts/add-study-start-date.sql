-- add-study-start-date.sql
-- 轉學生（從別校轉進來、沒經歷過前測/沒被隨機分派過）處理機制的第一步：
-- 讓教師可以標記「這個班級的研究/前測正式開始日」，用來自動判斷哪些學生
-- 是研究開始後才加入的「晚加入」學生——不是拿來擋他們使用系統，是讓學姊
-- 之後跑分析時，可以清楚知道誰缺前測基準值，決定要不要排除。
--
-- 執行方式：
--   mysql -u root -p pk_english_senior < add-study-start-date.sql

ALTER TABLE classes
  ADD COLUMN study_start_date DATE NULL
  COMMENT '這個班級的研究/前測正式開始日，用來判斷晚加入的轉學生；NULL 表示還沒設定'
  AFTER experiment_group;
