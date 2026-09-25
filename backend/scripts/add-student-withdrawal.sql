-- add-student-withdrawal.sql
-- 學生中離機制：標記中離，不是刪帳號、不是鎖登入——中離學生仍然可以正常
-- 登入系統當一般學習工具用，只是：
--   1. 分析時可以用 withdrawn_at 排除
--   2. 小組共同總分/獎章（group_realtime_scores、badges.js 的小組平均）
--      不再把他算進去，避免他停在原地的分數一直拖累（或墊高）還在參與的
--      組員的小組能量條/共同獎章
-- 中離「之前」累積的個人分數、獎章、答題紀錄完全不動，只是不再持續影響
-- 團體計算。
--
-- 執行方式：
--   mysql -u root -p pk_english_senior < add-student-withdrawal.sql

ALTER TABLE users
  ADD COLUMN withdrawn_at DATETIME NULL
  COMMENT '學生中離時間，NULL 表示仍在研究中；中離後仍可登入，只是不計入小組平均/團體獎章'
  AFTER absent_date;

-- group_realtime_scores 加上「排除中離者」的條件，重新建立這個 VIEW
CREATE OR REPLACE VIEW group_realtime_scores AS
SELECT
  g.group_id,
  g.group_name,
  g.class_id,
  COALESCE(SUM(u.system_score), 0) AS total_score,
  COALESCE(AVG(u.social_score), 0) AS avg_social_score,
  COUNT(u.user_id)                 AS member_count
FROM `groups` g
LEFT JOIN users u
  ON u.group_id = g.group_id
 AND u.role = 'student'
 AND u.withdrawn_at IS NULL
GROUP BY g.group_id, g.group_name, g.class_id;
