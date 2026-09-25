-- split-picturebook-units.sql
-- 依學姊指示：補充繪本教材的教學內容要另外設兩個單元，不要混在教科書
-- Unit1（theme 11 The Big Wind）/ Unit2（theme 12 Going Back Home）底下。
--
-- 前測資料/四年級補充繪本教材.docx 講的是兩本繪本：
--   繪本一《The Wind Blew》→ 新 theme_id 17
--   繪本二《What's the Time, Mr. Wolf?》→ 新 theme_id 18
--
-- 判斷「這個字/這題屬於繪本還是教科書」的依據是逐字比對兩份權威文件
-- （四年級教科書內容.docx、四年級補充繪本教材.docx）：只出現在繪本文件、
-- 教科書文件完全沒提到的，才算繪本專屬內容。容易搞混的兩種情況：
--   1. 教科書 Unit2 自己的「It's time for [三餐/活動]」句型本來就有教
--      breakfast/lunch/dinner/bed/class/school，這些字繪本二雖然也有
--      重複用到，但因為教科書本來就教過，維持留在 theme 12，不搬動
--   2. 教科書 Unit2 的數字只到「fifteen/twenty/twenty-five/thirty/forty/
--      fifty」（拿來報分鐘用），1-12 這組基數只有繪本二的「It's [1-12]
--      o'clock」句型在教，教科書完全沒有，所以整組搬到 theme 18；
--      o'clock／time 兩份文件都有教，維持留在 theme 12
--
-- 執行方式：
--   mysql -u root -p pk_english_senior < split-picturebook-units.sql

INSERT INTO themes (theme_id, theme_name, description, sort_order) VALUES
(17, 'The Wind Blew',
 '補充繪本一：《The Wind Blew》教學單字與句型——風把大家的帽子、氣球、報紙都吹跑了的故事',
 17),
(18, 'What''s the Time, Mr. Wolf?',
 '補充繪本二：《What''s the Time, Mr. Wolf?》教學單字與句型——問大野狼先生現在幾點的故事',
 18);

-- ── 搬單字：theme 11 → theme 17（繪本一） ──────────────────
UPDATE words SET theme_id = 17
WHERE word_id IN (212, 213, 214, 215, 216, 217, 221, 227, 228, 229, 230, 231);
-- newspaper, umbrella, scarf, shirt, balloon, hat, snatch, wind, kite, blow, take, fly

-- ── 搬單字：theme 12 → theme 18（繪本二） ──────────────────
UPDATE words SET theme_id = 18
WHERE word_id IN (218, 226, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245);
-- wolf, clock, one~twelve, eat, run

-- ── 搬題目：theme 11 → theme 17（繪本一） ──────────────────
UPDATE questions SET theme_id = 17
WHERE question_id IN (280, 281, 305, 308, 318, 319, 322, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337);

-- ── 搬題目：theme 12 → theme 18（繪本二） ──────────────────
UPDATE questions SET theme_id = 18
WHERE question_id IN (286, 287, 294, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 357);

-- 完整性檢查
SELECT theme_id, COUNT(*) AS word_cnt FROM words WHERE theme_id IN (11,12,17,18) GROUP BY theme_id ORDER BY theme_id;
SELECT theme_id, COUNT(*) AS question_cnt FROM questions WHERE theme_id IN (11,12,17,18) GROUP BY theme_id ORDER BY theme_id;
