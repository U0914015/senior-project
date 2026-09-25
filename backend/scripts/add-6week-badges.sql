-- add-6week-badges.sql
-- 6週實驗規劃下的獎章擴充：原本的累積型獎章（3000分封頂）跟排行榜型獎章
-- （只有前1-10名拿得到）在6週的時間跨度下會有「動機斷層」風險——活躍
-- 學生可能第3-4週就把最高階獎章拿完，中後段學生則從第一週就知道排行榜
-- 獎章永遠拿不到。這批新增：
--   1. 累積型獎章延伸一階（5000分）撐滿6週
--   2. 里程碑獎章（只跟自己比，不跟別人排名）補中後段學生的動機
--   3. 小組共同社群獎章（新類別 social_team）對應 SDT「連結」構面，
--      用小組平均社群分（不是總和）避免組員人數不同造成不公平
--
-- 執行方式：
--   mysql -u root -p pk_english < add-6week-badges.sql

USE pk_english;

ALTER TABLE badges MODIFY badge_category
  ENUM('system_single','system_accum','system_rank','social_action','social_accum','social_rank','social_team')
  NOT NULL;

INSERT INTO badges (badge_id, badge_name, badge_category, badge_tier, condition_desc, condition_value, icon_emoji, is_active) VALUES
(26, '英文宗師',   'system_accum', 'legend', '累積系統分達 5000',                    5000, '🏆', 1),
(27, '社群傳奇',   'social_accum', 'legend', '累積社群分達 5000',                    5000, '💎', 1),
(28, '常客',       'system_accum', 'bronze', '累積完成 10 場PK',                     10,   '🎮', 1),
(29, '鐵粉',       'system_accum', 'silver', '累積完成 25 場PK',                     25,   '🎮', 1),
(30, '進步之星',   'system_single','silver', '本場正確率比上一場進步20個百分點以上', 20,   '📈', 1),
(31, '穩定發揮',   'system_accum', 'silver', '連續3場正確率都達50%以上',             3,    '🔥', 1),
(32, '學習不間斷', 'system_accum', 'bronze', '累積在5個不同日期參與PK',              5,    '📅', 1),
(33, '熱心腸',     'social_action','silver', '累積送出任意社群互動20次',             20,   '💌', 1),
(34, '人緣好',     'social_action','silver', '累積收到隊友互動15次',                 15,   '🎁', 1),
(35, '團結小隊',   'social_team',  'bronze', '小組平均社群分達100',                  100,  '🤝', 1),
(36, '最強後援會', 'social_team',  'silver', '小組平均社群分達500',                  500,  '🤝', 1),
(37, '傳奇戰隊',   'social_team',  'gold',   '小組平均社群分達1500',                 1500, '🤝', 1);

SELECT badge_id, badge_name, badge_category, badge_tier FROM badges WHERE badge_id >= 26 ORDER BY badge_id;
