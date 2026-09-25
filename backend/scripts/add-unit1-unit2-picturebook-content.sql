-- add-unit1-unit2-picturebook-content.sql
-- 依學姊提供的權威教材原文（前測資料/四年級教科書內容.docx、前測資料/四年級補充繪本教材.docx）
-- 逐字核對 theme 11（The Big Wind／Unit1天氣＋繪本一《The Wind Blew》）跟
-- theme 12（Going Back Home／Unit2時間＋繪本二《What's the Time, Mr. Wolf?》）
-- 現有單字表，補齊教材有教但系統沒有的內容。
--
-- 這次順便修正兩個之前匯入前測時弄錯的地方：
--   1. wolf 原本掛在 theme 11（天氣），但它是繪本二《Mr. Wolf》的核心詞彙，
--      繪本二講的是時間，應該要在 theme 12——這裡改掉 words 跟相關 questions 的 theme_id
--   2. rabbit、frog 兩個字兩份權威教材都沒有出現，是當初從前測考卷「看圖選字」
--      題目的錯誤選項反推出來的，不是真的教材內容，直接刪掉
--
-- 新增 21 個單字（word_id 227-247）：
--   theme 11：wind, kite, blow(blew), take(took), fly(flew)
--   theme 12：one~twelve（12個基數）, eat, run, bed, class
-- 新增 38 道題目（question_id 327-364），涵蓋這些新單字的挑戰區/練習區內容，
-- 以及教材裡「天氣疊加句型」「it's time for bed/class」「地名替換問句」
-- 這幾個原本沒有題目練習到的句型。
--
-- 同時把 words.image_url 補上——WordReviewView.vue 的單字翻牌卡片本來就會讀
-- word.image_url 顯示插圖（沒有就退回字母圓圈），但這個欄位一直是空的，
-- 這次把 theme 11/12 所有「有對應插圖」的單字都補上，抽象詞（how/weather/
-- time/o'clock/snatch）沒有畫圖，保留退回字母圓圈的預設行為。
--
-- 執行方式：
--   mysql -u root -p pk_english_senior < add-unit1-unit2-picturebook-content.sql

-- ── 修正 wolf 分類、刪除 rabbit/frog ──────────────────────
UPDATE words SET theme_id = 12 WHERE word_id = 218; -- wolf
UPDATE questions SET theme_id = 12 WHERE question_id IN (287, 294); -- 三-3、五-2 都在考 wolf
DELETE FROM words WHERE word_id IN (219, 220); -- rabbit, frog（教材沒教過）

-- ── 補上 image_url（既有單字裡有對應插圖的）────────────────
UPDATE words SET image_url = '/images/senior/The_Big_Wind/cloudy.svg'      WHERE word_id = 168;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/rainy.svg'       WHERE word_id = 169;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/sunny.svg'       WHERE word_id = 170;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/windy.svg'       WHERE word_id = 171;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/cold.svg'        WHERE word_id = 172;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/hot.svg'         WHERE word_id = 173;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/newspaper.svg'   WHERE word_id = 212;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/umbrella.svg'    WHERE word_id = 213;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/scarf.svg'       WHERE word_id = 214;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/shirt.svg'       WHERE word_id = 215;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/balloon.svg'     WHERE word_id = 216;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/hat.svg'         WHERE word_id = 217;
UPDATE words SET image_url = '/images/senior/The_Big_Wind/wolf.svg'        WHERE word_id = 218; -- 圖檔位置不用跟著搬，路徑字串跟 theme_id 分類無關
UPDATE words SET image_url = '/images/senior/Going_Back_Home/fifteen.svg'    WHERE word_id = 176;
UPDATE words SET image_url = '/images/senior/Going_Back_Home/twenty.svg'     WHERE word_id = 177;
UPDATE words SET image_url = '/images/senior/Going_Back_Home/thirty.svg'     WHERE word_id = 178;
UPDATE words SET image_url = '/images/senior/Going_Back_Home/forty.svg'      WHERE word_id = 179;
UPDATE words SET image_url = '/images/senior/Going_Back_Home/fifty.svg'      WHERE word_id = 180;
UPDATE words SET image_url = '/images/senior/Going_Back_Home/twenty-five.svg' WHERE word_id = 181;
UPDATE words SET image_url = '/images/senior/Going_Back_Home/breakfast.svg'  WHERE word_id = 222;
UPDATE words SET image_url = '/images/senior/Going_Back_Home/lunch.svg'      WHERE word_id = 223;
UPDATE words SET image_url = '/images/senior/Going_Back_Home/dinner.svg'     WHERE word_id = 224;
UPDATE words SET image_url = '/images/senior/Going_Back_Home/school.svg'     WHERE word_id = 225;
UPDATE words SET image_url = '/images/senior/Going_Back_Home/clock.svg'      WHERE word_id = 226;

-- ── 新增 21 個單字 ─────────────────────────────────────────
INSERT INTO words (word_id, english, chinese, part_of_speech, word_no, grade, theme_id, image_url, is_active) VALUES
(227, 'wind',  '風',              'noun', 978, 3, 11, '/images/senior/The_Big_Wind/wind.svg', 1),
(228, 'kite',  '風箏',            'noun', 979, 3, 11, '/images/senior/The_Big_Wind/kite.svg', 1),
(229, 'blow',  '吹（過去式 blew）', 'verb', 980, 3, 11, '/images/senior/The_Big_Wind/blow.svg', 1),
(230, 'take',  '拿走；帶走（過去式 took）', 'verb', 981, 3, 11, '/images/senior/The_Big_Wind/take.svg', 1),
(231, 'fly',   '飛（過去式 flew）', 'verb', 982, 3, 11, '/images/senior/The_Big_Wind/fly.svg', 1),
(232, 'one',   '一', 'number', 983, 3, 12, '/images/senior/Going_Back_Home/one.svg', 1),
(233, 'two',   '二', 'number', 984, 3, 12, '/images/senior/Going_Back_Home/two.svg', 1),
(234, 'three', '三', 'number', 985, 3, 12, '/images/senior/Going_Back_Home/three.svg', 1),
(235, 'four',  '四', 'number', 986, 3, 12, '/images/senior/Going_Back_Home/four.svg', 1),
(236, 'five',  '五', 'number', 987, 3, 12, '/images/senior/Going_Back_Home/five.svg', 1),
(237, 'six',   '六', 'number', 988, 3, 12, '/images/senior/Going_Back_Home/six.svg', 1),
(238, 'seven', '七', 'number', 989, 3, 12, '/images/senior/Going_Back_Home/seven.svg', 1),
(239, 'eight', '八', 'number', 990, 3, 12, '/images/senior/Going_Back_Home/eight.svg', 1),
(240, 'nine',  '九', 'number', 991, 3, 12, '/images/senior/Going_Back_Home/nine.svg', 1),
(241, 'ten',   '十', 'number', 992, 3, 12, '/images/senior/Going_Back_Home/ten.svg', 1),
(242, 'eleven','十一', 'number', 993, 3, 12, '/images/senior/Going_Back_Home/eleven.svg', 1),
(243, 'twelve','十二', 'number', 994, 3, 12, '/images/senior/Going_Back_Home/twelve.svg', 1),
(244, 'eat',   '吃', 'verb', 995, 3, 12, '/images/senior/Going_Back_Home/eat.svg', 1),
(245, 'run',   '跑', 'verb', 996, 3, 12, '/images/senior/Going_Back_Home/run.svg', 1),
(246, 'bed',   '床', 'noun', 997, 3, 12, '/images/senior/Going_Back_Home/bed.svg', 1),
(247, 'class', '課；班級', 'noun', 998, 3, 12, '/images/senior/Going_Back_Home/class.svg', 1);

-- ── 新增 38 道題目 ─────────────────────────────────────────
INSERT INTO questions
  (question_id, theme_id, level, question_type, question_text, image_url, audio_text, options, correct_answer, explanation, difficulty, is_active) VALUES

-- theme 11 新單字圖片選字
(327, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/The_Big_Wind/wind.svg', NULL, JSON_ARRAY('wind','kite','umbrella'), 'wind', '圖片顯示風的波浪線，正確單字為「wind（風）」。', 1, 1),
(328, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/The_Big_Wind/kite.svg', NULL, JSON_ARRAY('kite','balloon','hat'), 'kite', '圖片顯示風箏，正確單字為「kite（風箏）」。', 1, 1),
(329, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/The_Big_Wind/newspaper.svg', NULL, JSON_ARRAY('newspaper','umbrella','scarf'), 'newspaper', '圖片顯示報紙，正確單字為「newspaper（報紙）」。', 1, 1),
(330, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/The_Big_Wind/umbrella.svg', NULL, JSON_ARRAY('umbrella','newspaper','balloon'), 'umbrella', '圖片顯示雨傘，正確單字為「umbrella（雨傘）」。', 1, 1),
(331, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/The_Big_Wind/scarf.svg', NULL, JSON_ARRAY('scarf','shirt','hat'), 'scarf', '圖片顯示圍巾，正確單字為「scarf（圍巾）」。', 1, 1),
(332, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/The_Big_Wind/shirt.svg', NULL, JSON_ARRAY('shirt','scarf','hat'), 'shirt', '圖片顯示襯衫，正確單字為「shirt（襯衫）」。', 1, 1),
(333, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/The_Big_Wind/balloon.svg', NULL, JSON_ARRAY('balloon','kite','hat'), 'balloon', '圖片顯示氣球，正確單字為「balloon（氣球）」。', 1, 1),
(334, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/The_Big_Wind/hat.svg', NULL, JSON_ARRAY('hat','shirt','scarf'), 'hat', '圖片顯示帽子，正確單字為「hat（帽子）」。', 1, 1),

-- theme 11 新動詞（字義選擇）
(335, 11, 'vocabulary', 'mcq', '選出正確的中文意思：blow (blew)', NULL, NULL, JSON_ARRAY('吹','拿走','飛'), '吹', '「blow」意指「吹」，過去式是「blew」。', 1, 1),
(336, 11, 'vocabulary', 'mcq', '選出正確的中文意思：take (took)', NULL, NULL, JSON_ARRAY('飛','吹','拿走'), '拿走', '「take」意指「拿走、帶走」，過去式是「took」。', 1, 1),
(337, 11, 'vocabulary', 'mcq', '選出正確的中文意思：fly (flew)', NULL, NULL, JSON_ARRAY('拿走','飛','吹'), '飛', '「fly」意指「飛」，過去式是「flew」。', 1, 1),

-- theme 12 數字 1-12（整點時鐘）圖片選字
(338, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/one.svg', NULL, JSON_ARRAY('one','two','three'), 'one', '時鐘顯示1點整，正確單字為「one」。', 1, 1),
(339, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/two.svg', NULL, JSON_ARRAY('two','one','three'), 'two', '時鐘顯示2點整，正確單字為「two」。', 1, 1),
(340, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/three.svg', NULL, JSON_ARRAY('three','two','four'), 'three', '時鐘顯示3點整，正確單字為「three」。', 1, 1),
(341, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/four.svg', NULL, JSON_ARRAY('four','three','five'), 'four', '時鐘顯示4點整，正確單字為「four」。', 1, 1),
(342, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/five.svg', NULL, JSON_ARRAY('five','four','six'), 'five', '時鐘顯示5點整，正確單字為「five」。', 1, 1),
(343, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/six.svg', NULL, JSON_ARRAY('six','five','seven'), 'six', '時鐘顯示6點整，正確單字為「six」。', 1, 1),
(344, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/seven.svg', NULL, JSON_ARRAY('seven','six','eight'), 'seven', '時鐘顯示7點整，正確單字為「seven」。', 1, 1),
(345, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/eight.svg', NULL, JSON_ARRAY('eight','seven','nine'), 'eight', '時鐘顯示8點整，正確單字為「eight」。', 1, 1),
(346, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/nine.svg', NULL, JSON_ARRAY('nine','eight','ten'), 'nine', '時鐘顯示9點整，正確單字為「nine」。', 1, 1),
(347, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/ten.svg', NULL, JSON_ARRAY('ten','nine','eleven'), 'ten', '時鐘顯示10點整，正確單字為「ten」。', 1, 1),
(348, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/eleven.svg', NULL, JSON_ARRAY('eleven','ten','twelve'), 'eleven', '時鐘顯示11點整，正確單字為「eleven」。', 1, 1),
(349, 12, 'vocabulary', 'image_choice', 'Which number matches the clock?', '/images/senior/Going_Back_Home/twelve.svg', NULL, JSON_ARRAY('twelve','eleven','one'), 'twelve', '時鐘顯示12點整，正確單字為「twelve」。', 1, 1),

-- theme 12 其他新單字圖片選字
(350, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/Going_Back_Home/eat.svg', NULL, JSON_ARRAY('eat','run','dinner'), 'eat', '圖片顯示吃東西的餐具，正確單字為「eat（吃）」。', 1, 1),
(351, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/Going_Back_Home/run.svg', NULL, JSON_ARRAY('run','eat','class'), 'run', '圖片顯示奔跑的動作，正確單字為「run（跑）」。', 1, 1),
(352, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/Going_Back_Home/bed.svg', NULL, JSON_ARRAY('bed','class','school'), 'bed', '圖片顯示床，正確單字為「bed（床）」。', 1, 1),
(353, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/Going_Back_Home/class.svg', NULL, JSON_ARRAY('class','bed','school'), 'class', '圖片顯示教室黑板，正確單字為「class（課；班級）」。', 1, 1),
(354, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/Going_Back_Home/school.svg', NULL, JSON_ARRAY('school','class','bed'), 'school', '圖片顯示學校建築，正確單字為「school（學校）」。', 1, 1),
(355, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/Going_Back_Home/lunch.svg', NULL, JSON_ARRAY('lunch','breakfast','dinner'), 'lunch', '圖片顯示正午用餐，正確單字為「lunch（午餐）」。', 1, 1),
(356, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/Going_Back_Home/dinner.svg', NULL, JSON_ARRAY('dinner','lunch','breakfast'), 'dinner', '圖片顯示夜晚用餐，正確單字為「dinner（晚餐）」。', 1, 1),
(357, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?', '/images/senior/Going_Back_Home/clock.svg', NULL, JSON_ARRAY('clock','time','o''clock'), 'clock', '圖片顯示時鐘，正確單字為「clock（時鐘）」。', 1, 1),

-- theme 11 天氣疊加句型（教科書「結合兩種天氣形容」）
(358, 11, 'sentence', 'mcq', 'Which sentence describes cloudy AND rainy weather?', NULL, NULL, JSON_ARRAY('It''s cloudy and rainy.','It''s sunny and hot.','It''s windy and cold.'), 'It''s cloudy and rainy.', '結合兩種天氣形容：cloudy（多雲的）+ rainy（下雨的）。', 2, 1),
(359, 11, 'sentence', 'mcq', 'Which sentence describes windy AND cold weather?', NULL, NULL, JSON_ARRAY('It''s sunny and hot.','It''s cloudy and rainy.','It''s windy and cold.'), 'It''s windy and cold.', '結合兩種天氣形容：windy（起風的）+ cold（寒冷的）。', 2, 1),
(360, 11, 'sentence', 'mcq', 'Which sentence describes sunny AND hot weather?', NULL, NULL, JSON_ARRAY('It''s windy and cold.','It''s sunny and hot.','It''s cloudy and rainy.'), 'It''s sunny and hot.', '結合兩種天氣形容：sunny（晴朗的）+ hot（炎熱的）。', 2, 1),

-- theme 12 "It's time for ___" 補 bed/class（原本只有 lunch）
(361, 12, 'sentence', 'listening', 'It''s time for __________.', NULL, 'It''s time for bed.', JSON_ARRAY('bed','class','lunch'), 'bed', '句子意思是「該睡覺的時候了」，日常活動類可替換單字之一。', 1, 1),
(362, 12, 'sentence', 'listening', 'It''s time for __________.', NULL, 'It''s time for class.', JSON_ARRAY('class','bed','school'), 'class', '句子意思是「該上課的時候了」，日常活動類可替換單字之一。', 1, 1),

-- theme 11 地名替換句型（教科書範例地名：Taipei, Chiayi, Kaohsiung, Taitung）
(363, 11, 'sentence', 'ordering', 'in / Taipei / the / weather / How''s / ?', NULL, NULL, JSON_ARRAY(), 'How''s the weather in Taipei?', '詢問特定地點天氣的句型，可替換地名：Taipei, Chiayi, Kaohsiung, Taitung。', 2, 1),
(364, 11, 'sentence', 'ordering', 'in / Kaohsiung / weather / the / How''s / ?', NULL, NULL, JSON_ARRAY(), 'How''s the weather in Kaohsiung?', '詢問特定地點天氣的句型，可替換地名：Taipei, Chiayi, Kaohsiung, Taitung。', 2, 1);

-- 完整性檢查
SELECT COUNT(*) AS new_words FROM words WHERE word_id BETWEEN 227 AND 247;
SELECT COUNT(*) AS new_questions FROM questions WHERE question_id BETWEEN 327 AND 364;
SELECT theme_id, COUNT(*) AS word_cnt FROM words WHERE theme_id IN (11,12) GROUP BY theme_id;
SELECT theme_id, COUNT(*) AS question_cnt FROM questions WHERE theme_id IN (11,12) GROUP BY theme_id;
