-- add-attendance-aware-team-energy.sql
-- 2026-09-25：學姊回饋「請假的算法」——團隊能量條目前是全組（扣掉中離者）系統分
-- 直接加總，沒有排除當天請假的組員。學姊給的例子：
--   第三週，第1組原本4人，A=90 B=80 C=缺席 D=70
--   團隊能量值 = 當週出席學生總積分 ÷ 當週出席學生人數 = (90+80+70)÷3 = 80
-- 這是一個「排除請假者、算在場組員平均分」的公式，不是原本的「全組總分」。
--
-- 系統裡「團隊能量條」這個詞在三個畫面（PKResultView 小組能量條／LeaderboardView 小組排行／
-- ScoreboardView 大字報）指的都是同一個底層數字（group_realtime_scores.total_score），
-- 所以照學姊的公式改，會同時影響這三個畫面顯示的數字，也會改變小組間排名的依據——這是刻意的，
-- 因為學姊明確給了完整的計算公式跟算例，不是含糊的建議。
--
-- 做法：不動原本的 total_score／member_count（維持「全組累積總分／全組人數」這個語意，
-- 給以後如果還需要「不看請假」的原始總分時用），新增 energy_score（當週出席組員的平均分，
-- 請假用既有的 users.absent_date 當天判斷——沒有請假歷史紀錄表，只有「今天有沒有請假」這個
-- 單日欄位，教師後台本來就是這樣用的），這次要顯示/排序的地方全部改用這個新欄位。
-- 全組都請假時 present_count=0，避免除以0，這種情況 energy_score 直接給 0。
-- 中離者（withdrawn_at 不是 NULL）維持原本邏輯，完全不算進任何欄位。

CREATE OR REPLACE VIEW group_realtime_scores AS
SELECT
  g.group_id,
  g.group_name,
  g.class_id,
  COALESCE(SUM(u.system_score), 0) AS total_score,
  COUNT(u.user_id) AS member_count,
  COALESCE(
    SUM(CASE WHEN u.absent_date IS NULL OR u.absent_date <> CURDATE() THEN u.system_score END),
    0
  ) AS present_score_sum,
  COUNT(CASE WHEN u.absent_date IS NULL OR u.absent_date <> CURDATE() THEN u.user_id END) AS present_count,
  COALESCE(
    ROUND(
      SUM(CASE WHEN u.absent_date IS NULL OR u.absent_date <> CURDATE() THEN u.system_score END)
      /
      NULLIF(
        COUNT(CASE WHEN u.absent_date IS NULL OR u.absent_date <> CURDATE() THEN u.user_id END),
        0
      )
    ),
    0
  ) AS energy_score
FROM `groups` g
LEFT JOIN users u
  ON u.group_id = g.group_id
  AND u.role = 'student'
  AND u.withdrawn_at IS NULL
GROUP BY g.group_id, g.group_name, g.class_id;
