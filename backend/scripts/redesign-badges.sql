-- redesign-badges.sql
-- 獎章系統改版：整包重新種子 badges/user_badges
-- 舊37個獎章（badge_id 1-37）全部報廢，改用新的競爭/社群/共同三大類、
-- 參與/技巧(影響力)/鼓勵三分類、銅銀金傳說四級制，共25個家族、100筆獎章。
--
-- 這份是從 pk-english-game 那邊的獎章改版（原本規劃36個家族、144筆）
-- 移植過來，但刪掉了 11 個跟本專案機制對不上的家族（共44筆）：
--   1. 呼救/搶救機制已在 2026-08-05 整個拿掉（help_requests 不會再有新資料）：
--      敢求救、神隊友、雪中送炭、互助小隊
--   2. 小組互打PK已在 2026-08-05 拿掉，winner_group_id／group_a_id vs
--      group_b_id 的輸贏比較不再有意義（group_b_id 永遠等於 group_a_id）：
--      逆風而戰、屢敗屢戰、常勝小隊、連勝小隊
--   3. 每場PK現在都只有發起人自己一個人在打（不用等組員），「全員到齊」
--      （同一場次要有多個不同user_id出賽）結構上不可能再發生：全員到齊
--   4. 依 2026-08-26 學姊博班進度報告（實驗一自變項設計）：對照組是
--      「個人獎章＋全程不設個人排行榜」，實驗組是「共同獎章＋組內無排名、
--      組間才有競爭」——不管哪一組，「個人在班上的名次」都不該再被強調，
--      所以個人排名類獎章也一併拿掉：排行常勝軍、社群排行王
--
-- user_badges 是測試帳號資料（正式實驗尚未開始），直接清空重來。
--
-- 執行方式：
--   mysql -u root -p pk_english_senior < redesign-badges.sql

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE user_badges;
TRUNCATE TABLE badges;

ALTER TABLE badges MODIFY badge_category ENUM(
  'competitive_participation',
  'competitive_skill',
  'competitive_encouragement',
  'social_participation',
  'social_influence',
  'social_encouragement',
  'social_team'
) NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO badges (badge_id, badge_name, badge_category, badge_tier, condition_desc, condition_value, icon_emoji, is_active) VALUES
-- 競爭獎章／參與類
(1, '經驗收藏家', 'competitive_participation', 'bronze', '累積系統分數達到 100', 100, '📘', 1),
(2, '經驗收藏家', 'competitive_participation', 'silver', '累積系統分數達到 500', 500, '📘', 1),
(3, '經驗收藏家', 'competitive_participation', 'gold', '累積系統分數達到 1000', 1000, '📘', 1),
(4, '經驗收藏家', 'competitive_participation', 'legend', '累積系統分數達到 3000', 3000, '📘', 1),
(5, '賽場常客', 'competitive_participation', 'bronze', '累積完成PK場次達到 10', 10, '🎮', 1),
(6, '賽場常客', 'competitive_participation', 'silver', '累積完成PK場次達到 25', 25, '🎮', 1),
(7, '賽場常客', 'competitive_participation', 'gold', '累積完成PK場次達到 50', 50, '🎮', 1),
(8, '賽場常客', 'competitive_participation', 'legend', '累積完成PK場次達到 100', 100, '🎮', 1),
(9, '持續學習者', 'competitive_participation', 'bronze', '累積不同日期參與達到 5', 5, '📅', 1),
(10, '持續學習者', 'competitive_participation', 'silver', '累積不同日期參與達到 10', 10, '📅', 1),
(11, '持續學習者', 'competitive_participation', 'gold', '累積不同日期參與達到 20', 20, '📅', 1),
(12, '持續學習者', 'competitive_participation', 'legend', '累積不同日期參與達到 40', 40, '📅', 1),
(13, '單字複習狂', 'competitive_participation', 'bronze', '累積使用單字翻牌複習次數達到 10', 10, '🔄', 1),
(14, '單字複習狂', 'competitive_participation', 'silver', '累積使用單字翻牌複習次數達到 30', 30, '🔄', 1),
(15, '單字複習狂', 'competitive_participation', 'gold', '累積使用單字翻牌複習次數達到 60', 60, '🔄', 1),
(16, '單字複習狂', 'competitive_participation', 'legend', '累積使用單字翻牌複習次數達到 100', 100, '🔄', 1),
(17, '練習不手軟', 'competitive_participation', 'bronze', '累積使用單字選擇題練習次數達到 10', 10, '💪', 1),
(18, '練習不手軟', 'competitive_participation', 'silver', '累積使用單字選擇題練習次數達到 30', 30, '💪', 1),
(19, '練習不手軟', 'competitive_participation', 'gold', '累積使用單字選擇題練習次數達到 60', 60, '💪', 1),
(20, '練習不手軟', 'competitive_participation', 'legend', '累積使用單字選擇題練習次數達到 100', 100, '💪', 1),
(21, '聽力小耳朵', 'competitive_participation', 'bronze', '累積點擊聽力發音次數達到 10', 10, '👂', 1),
(22, '聽力小耳朵', 'competitive_participation', 'silver', '累積點擊聽力發音次數達到 30', 30, '👂', 1),
(23, '聽力小耳朵', 'competitive_participation', 'gold', '累積點擊聽力發音次數達到 60', 60, '👂', 1),
(24, '聽力小耳朵', 'competitive_participation', 'legend', '累積點擊聽力發音次數達到 100', 100, '👂', 1),
(25, '主題探索家', 'competitive_participation', 'bronze', '累積挑戰過的不同主題數達到 3', 3, '🧭', 1),
(26, '主題探索家', 'competitive_participation', 'silver', '累積挑戰過的不同主題數達到 5', 5, '🧭', 1),
(27, '主題探索家', 'competitive_participation', 'gold', '累積挑戰過的不同主題數達到 7', 7, '🧭', 1),
(28, '主題探索家', 'competitive_participation', 'legend', '累積挑戰過的不同主題數達到 10', 10, '🧭', 1),
-- 競爭獎章／技巧類
(29, '單場高手', 'competitive_skill', 'bronze', '單場得分達到 60', 60, '🎯', 1),
(30, '單場高手', 'competitive_skill', 'silver', '單場得分達到 80', 80, '🎯', 1),
(31, '單場高手', 'competitive_skill', 'gold', '單場得分達到 100', 100, '🎯', 1),
(32, '單場高手', 'competitive_skill', 'legend', '單場得分連續兩場都達到100分', 2, '🎯', 1),
(33, '極速應答王', 'competitive_skill', 'bronze', '5秒內連續答對題數達到 5', 5, '⚡', 1),
(34, '極速應答王', 'competitive_skill', 'silver', '5秒內連續答對題數達到 10', 10, '⚡', 1),
(35, '極速應答王', 'competitive_skill', 'gold', '5秒內連續答對題數達到 15', 15, '⚡', 1),
(36, '極速應答王', 'competitive_skill', 'legend', '5秒內連續答對題數達到 20', 20, '⚡', 1),
(37, '正確率之王', 'competitive_skill', 'bronze', '歷史累積答對題數達到 50', 50, '🎓', 1),
(38, '正確率之王', 'competitive_skill', 'silver', '歷史累積答對題數達到 150', 150, '🎓', 1),
(39, '正確率之王', 'competitive_skill', 'gold', '歷史累積答對題數達到 300', 300, '🎓', 1),
(40, '正確率之王', 'competitive_skill', 'legend', '歷史累積答對題數達到 600', 600, '🎓', 1),
(41, '單場飛躍', 'competitive_skill', 'bronze', '本場正確率較上一場進步10個百分點以上', 10, '📈', 1),
(42, '單場飛躍', 'competitive_skill', 'silver', '本場正確率較上一場進步20個百分點以上', 20, '📈', 1),
(43, '單場飛躍', 'competitive_skill', 'gold', '本場正確率較上一場進步30個百分點以上', 30, '📈', 1),
(44, '單場飛躍', 'competitive_skill', 'legend', '本場正確率較上一場進步40個百分點以上', 40, '📈', 1),
(45, '穩紮穩打', 'competitive_skill', 'bronze', '連續2場正確率都達50%以上', 2, '🔥', 1),
(46, '穩紮穩打', 'competitive_skill', 'silver', '連續3場正確率都達50%以上', 3, '🔥', 1),
(47, '穩紮穩打', 'competitive_skill', 'gold', '連續5場正確率都達50%以上', 5, '🔥', 1),
(48, '穩紮穩打', 'competitive_skill', 'legend', '連續10場正確率都達50%以上', 10, '🔥', 1),
(49, '主題精通者', 'competitive_skill', 'bronze', '單一主題正確率90%以上的場次數達到 1', 1, '🧠', 1),
(50, '主題精通者', 'competitive_skill', 'silver', '單一主題正確率90%以上的場次數達到 3', 3, '🧠', 1),
(51, '主題精通者', 'competitive_skill', 'gold', '單一主題正確率90%以上的場次數達到 5', 5, '🧠', 1),
(52, '主題精通者', 'competitive_skill', 'legend', '單一主題正確率90%以上的場次數達到 10', 10, '🧠', 1),
-- 競爭獎章／鼓勵類
(53, '越挫越勇', 'competitive_encouragement', 'bronze', '累積答錯題數達到 20', 20, '💥', 1),
(54, '越挫越勇', 'competitive_encouragement', 'silver', '累積答錯題數達到 50', 50, '💥', 1),
(55, '越挫越勇', 'competitive_encouragement', 'gold', '累積答錯題數達到 100', 100, '💥', 1),
(56, '越挫越勇', 'competitive_encouragement', 'legend', '累積答錯題數達到 200', 200, '💥', 1),
(57, '逆轉勝', 'competitive_encouragement', 'bronze', '累積「單場進步超過20個百分點」的次數達到 1', 1, '🔁', 1),
(58, '逆轉勝', 'competitive_encouragement', 'silver', '累積「單場進步超過20個百分點」的次數達到 3', 3, '🔁', 1),
(59, '逆轉勝', 'competitive_encouragement', 'gold', '累積「單場進步超過20個百分點」的次數達到 5', 5, '🔁', 1),
(60, '逆轉勝', 'competitive_encouragement', 'legend', '累積「單場進步超過20個百分點」的次數達到 10', 10, '🔁', 1),
(61, '全勤挑戰', 'competitive_encouragement', 'bronze', '連續3天都完成至少一場PK', 3, '🗓️', 1),
(62, '全勤挑戰', 'competitive_encouragement', 'silver', '連續7天都完成至少一場PK', 7, '🗓️', 1),
(63, '全勤挑戰', 'competitive_encouragement', 'gold', '連續14天都完成至少一場PK', 14, '🗓️', 1),
(64, '全勤挑戰', 'competitive_encouragement', 'legend', '連續30天都完成至少一場PK', 30, '🗓️', 1),
-- 社群獎章／參與類
(65, '拍拍手達人', 'social_participation', 'bronze', '累積送出按讚次數達到 10', 10, '👍', 1),
(66, '拍拍手達人', 'social_participation', 'silver', '累積送出按讚次數達到 30', 30, '👍', 1),
(67, '拍拍手達人', 'social_participation', 'gold', '累積送出按讚次數達到 60', 60, '👍', 1),
(68, '拍拍手達人', 'social_participation', 'legend', '累積送出按讚次數達到 100', 100, '👍', 1),
(69, '暖心留言家', 'social_participation', 'bronze', '累積送出留言次數達到 5', 5, '💬', 1),
(70, '暖心留言家', 'social_participation', 'silver', '累積送出留言次數達到 15', 15, '💬', 1),
(71, '暖心留言家', 'social_participation', 'gold', '累積送出留言次數達到 30', 30, '💬', 1),
(72, '暖心留言家', 'social_participation', 'legend', '累積送出留言次數達到 60', 60, '💬', 1),
(73, '貼紙收藏家', 'social_participation', 'bronze', '累積送出貼紙次數達到 10', 10, '⭐', 1),
(74, '貼紙收藏家', 'social_participation', 'silver', '累積送出貼紙次數達到 30', 30, '⭐', 1),
(75, '貼紙收藏家', 'social_participation', 'gold', '累積送出貼紙次數達到 60', 60, '⭐', 1),
(76, '貼紙收藏家', 'social_participation', 'legend', '累積送出貼紙次數達到 100', 100, '⭐', 1),
(77, '全能社交家', 'social_participation', 'bronze', '累積送出任意社群互動總次數達到 20', 20, '💌', 1),
(78, '全能社交家', 'social_participation', 'silver', '累積送出任意社群互動總次數達到 60', 60, '💌', 1),
(79, '全能社交家', 'social_participation', 'gold', '累積送出任意社群互動總次數達到 120', 120, '💌', 1),
(80, '全能社交家', 'social_participation', 'legend', '累積送出任意社群互動總次數達到 240', 240, '💌', 1),
-- 社群獎章／影響力類
(81, '人氣指數', 'social_influence', 'bronze', '累積收到社群分數達到 100', 100, '🌟', 1),
(82, '人氣指數', 'social_influence', 'silver', '累積收到社群分數達到 500', 500, '🌟', 1),
(83, '人氣指數', 'social_influence', 'gold', '累積收到社群分數達到 1000', 1000, '🌟', 1),
(84, '人氣指數', 'social_influence', 'legend', '累積收到社群分數達到 3000', 3000, '🌟', 1),
(85, '被隊友喜愛', 'social_influence', 'bronze', '累積收到隊友互動次數達到 15', 15, '🎁', 1),
(86, '被隊友喜愛', 'social_influence', 'silver', '累積收到隊友互動次數達到 30', 30, '🎁', 1),
(87, '被隊友喜愛', 'social_influence', 'gold', '累積收到隊友互動次數達到 60', 60, '🎁', 1),
(88, '被隊友喜愛', 'social_influence', 'legend', '累積收到隊友互動次數達到 120', 120, '🎁', 1),
-- 社群獎章／鼓勵類
(89, '全能鼓勵家', 'social_encouragement', 'bronze', '按讚／留言／貼紙三種互動各自累積次數達到 5', 5, '🌈', 1),
(90, '全能鼓勵家', 'social_encouragement', 'silver', '按讚／留言／貼紙三種互動各自累積次數達到 10', 10, '🌈', 1),
(91, '全能鼓勵家', 'social_encouragement', 'gold', '按讚／留言／貼紙三種互動各自累積次數達到 20', 20, '🌈', 1),
(92, '全能鼓勵家', 'social_encouragement', 'legend', '按讚／留言／貼紙三種互動各自累積次數達到 40', 40, '🌈', 1),
-- 小組共同獎章
(93, '團結小隊', 'social_team', 'bronze', '小組平均社群分達到 100', 100, '🤝', 1),
(94, '團結小隊', 'social_team', 'silver', '小組平均社群分達到 500', 500, '🤝', 1),
(95, '團結小隊', 'social_team', 'gold', '小組平均社群分達到 1500', 1500, '🤝', 1),
(96, '團結小隊', 'social_team', 'legend', '小組平均社群分達到 2000', 2000, '🤝', 1),
(97, '學霸小隊', 'social_team', 'bronze', '小組平均系統分達到 100', 100, '📚', 1),
(98, '學霸小隊', 'social_team', 'silver', '小組平均系統分達到 500', 500, '📚', 1),
(99, '學霸小隊', 'social_team', 'gold', '小組平均系統分達到 1000', 1000, '📚', 1),
(100, '學霸小隊', 'social_team', 'legend', '小組平均系統分達到 3000', 3000, '📚', 1);

-- 完整性檢查
SELECT badge_category, COUNT(*) AS cnt FROM badges GROUP BY badge_category;
SELECT COUNT(*) AS total FROM badges;
