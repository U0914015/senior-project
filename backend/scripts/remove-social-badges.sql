-- remove-social-badges.sql
-- 2026-09-16：跟學姊確認過，完全照 2026-08-26 進度報告的設計走——對照組
-- 「個人獎章、全程不設排行榜」，實驗組「小組組間積分解鎖共同獎章、有排行
-- 榜」，簡報裡完全沒有提到社群互評/社群分。這份 SQL 把整個社群互評相關的
-- 獎章都拿掉，只留下跟社群互動無關的競爭類獎章（1-64）跟學霸小隊（小組
-- 平均系統分，重新編號成 65-68）。
--
-- 拿掉的獎章家族（共32個，id 65-96）：
--   拍拍手達人、暖心留言家、貼紙收藏家、全能社交家（social_participation）
--   人氣指數、被隊友喜愛（social_influence）
--   全能鼓勵家（social_encouragement）
--   團結小隊（social_team，小組平均社群分）
-- 學霸小隊（social_team，小組平均系統分）保留，從 97-100 重新編號成 65-68。
--
-- 執行方式：
--   mysql -u root -p pk_english_senior < remove-social-badges.sql

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE user_badges;
DELETE FROM badges WHERE badge_id BETWEEN 65 AND 100;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO badges (badge_id, badge_name, badge_category, badge_tier, condition_desc, condition_value, icon_emoji, is_active) VALUES
(65, '學霸小隊', 'social_team', 'bronze', '小組平均系統分達到 100', 100, '📚', 1),
(66, '學霸小隊', 'social_team', 'silver', '小組平均系統分達到 500', 500, '📚', 1),
(67, '學霸小隊', 'social_team', 'gold', '小組平均系統分達到 1000', 1000, '📚', 1),
(68, '學霸小隊', 'social_team', 'legend', '小組平均系統分達到 3000', 3000, '📚', 1);

-- group_realtime_scores 拿掉 avg_social_score 欄位——這支 VIEW 是大字報／
-- 小組排行共用的資料來源，小組社群分整個拿掉之後這個欄位沒有意義了
CREATE OR REPLACE VIEW group_realtime_scores AS
SELECT
  g.group_id,
  g.group_name,
  g.class_id,
  COALESCE(SUM(u.system_score), 0) AS total_score,
  COUNT(u.user_id)                 AS member_count
FROM `groups` g
LEFT JOIN users u
  ON u.group_id = g.group_id
 AND u.role = 'student'
 AND u.withdrawn_at IS NULL
GROUP BY g.group_id, g.group_name, g.class_id;

-- 完整性檢查
SELECT badge_category, COUNT(*) AS cnt FROM badges GROUP BY badge_category;
SELECT COUNT(*) AS total FROM badges;
