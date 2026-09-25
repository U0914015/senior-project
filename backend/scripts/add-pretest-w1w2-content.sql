-- add-pretest-w1w2-content.sql
-- 把學姊「國小四年級教科書+補充教材前測考卷」(2026-08-21更新) 的內容匯入成練習題，
-- 對應到既有 theme_id 11（The Big Wind／天氣）跟 12（Going Back Home／時間），
-- 因為這份前測本來就是在考這兩個單元的內容。
--
-- 資料來源：前測資料/(20260821更新)國小四年級教科書+補充教材前測考卷.docx（原始空白考卷）
--          前測資料/解答-(20260821更新)國小四年級教科書+補充教材前測考卷.docx（答案卷）
--          前測資料/四年級前測詳解.docx（逐題詳解，用來寫 explanation 欄位）
-- 這三份都是學姊提供的，答案是她給的，不是我自己看圖猜的。
--
-- ⚠️ 這份考卷本身有些圖片選擇題（原本用3張手繪圖當選項，例如「一、三」聽力選圖、
-- 「六」讀字選圖）沒有寫下聽力稿／看圖判讀的依據，只有答案卷跟詳解檔能確認答案，
-- 過程中發現「四年級前測詳解.docx」在七-1/七-2兩題的詳解文字（sunny/cold）跟答案卷
-- 及原始圖片（image52=雲朵、image53=太陽）對不上，答案卷跟圖片一致認為是
-- cloudy/sunny，這份 SQL 採用答案卷+圖片的版本（cloudy/sunny），詳解文字本身有誤，
-- 之後跟學姊核對時記得帶這個發現。
--
-- 沒有直接照抄考卷原本「3張圖選1張」的版面配置——那個格式跟系統既有的
-- image_choice（給1張圖選文字答案）方向相反，因此改成呼應既有做法：
-- 有既有/新畫美術的題目一律用「給1張圖、選文字」的 image_choice 格式；
-- 「九」裡兩題純粹讀時鐘數字的題目（9:40 / 4:55）沒有另外畫時鐘美術，
-- 改成純文字 mcq（讀句子選時間），避免畫太多張視覺上難以一眼分辨的類似時鐘圖。
-- 「十二」對話填空原本一格題目有兩個空格，拆成兩筆 fill_blank（跟 七/八/十一
-- 現有的「一格一題」顆粒度一致）。
--
-- 新增 15 個單字（10 個給 theme 11、5 個給 theme 12，word_id 212-226，
-- word_no 963-977）、50 道新題目（question_id 277-326）。
--
-- 執行方式：
--   mysql -u root -p pk_english_senior < add-pretest-w1w2-content.sql

INSERT INTO words (word_id, english, chinese, part_of_speech, word_no, grade, theme_id, is_active) VALUES
(212, 'newspaper', '報紙',        'noun', 963, 3, 11, 1),
(213, 'umbrella',  '雨傘',        'noun', 964, 3, 11, 1),
(214, 'scarf',     '圍巾',        'noun', 965, 3, 11, 1),
(215, 'shirt',     '襯衫',        'noun', 966, 3, 11, 1),
(216, 'balloon',   '氣球',        'noun', 967, 3, 11, 1),
(217, 'hat',       '帽子',        'noun', 968, 3, 11, 1),
(218, 'wolf',      '狼',          'noun', 969, 3, 11, 1),
(219, 'rabbit',    '兔子',        'noun', 970, 3, 11, 1),
(220, 'frog',      '青蛙',        'noun', 971, 3, 11, 1),
(221, 'snatch',    '搶走；奪走',   'verb', 972, 3, 11, 1),
(222, 'breakfast', '早餐',        'noun', 973, 3, 12, 1),
(223, 'lunch',     '午餐',        'noun', 974, 3, 12, 1),
(224, 'dinner',    '晚餐',        'noun', 975, 3, 12, 1),
(225, 'school',    '學校',        'noun', 976, 3, 12, 1),
(226, 'clock',     '時鐘',        'noun', 977, 3, 12, 1);

INSERT INTO questions
  (question_id, theme_id, level, question_type, question_text, image_url, audio_text, options, correct_answer, explanation, difficulty, is_active) VALUES

-- 一、Listen and Choose：聽單字選圖（考卷原本是圖選項，改成文字選項）
(277, 11, 'vocabulary', 'listening', 'Listen carefully. Which word do you hear?', NULL, 'rainy',
 JSON_ARRAY('sunny','rainy','windy'), 'rainy', '「rainy」意指「下雨的、多雨的」。', 1, 1),
(278, 12, 'vocabulary', 'listening', 'Listen carefully. Which word do you hear?', NULL, 'dinner',
 JSON_ARRAY('breakfast','dinner','lunch'), 'dinner', '「dinner」意指「晚餐」，對應晚上六點的用餐情境。', 1, 1),
(279, 12, 'vocabulary', 'listening', 'Listen carefully. Which word do you hear?', NULL, 'fifty',
 JSON_ARRAY('fifty','fifteen','forty'), 'fifty', '「fifty」意指數字「50」。', 1, 1),
(280, 11, 'vocabulary', 'listening', 'Listen carefully. Which word do you hear?', NULL, 'scarf',
 JSON_ARRAY('scarf','shirt','umbrella'), 'scarf', '「scarf」意指「圍巾」，是被大風吹走的物品之一。', 1, 1),

-- 二、Listen and Choose：聽句子選單字
(281, 11, 'sentence', 'listening', 'The big wind blows a __________.', NULL, 'The big wind blows a newspaper.',
 JSON_ARRAY('newspaper','umbrella','news'), 'newspaper', '句子意思是「大風吹走了一份報紙」。', 1, 1),
(282, 11, 'sentence', 'listening', 'It''s __________.', NULL, 'It''s windy.',
 JSON_ARRAY('windy','sunny','rainy'), 'windy', '句子意思是「風很大」。', 1, 1),
(283, 12, 'sentence', 'listening', 'It''s ten __________.', NULL, 'It''s ten forty.',
 JSON_ARRAY('fifty','four','forty'), 'forty', '句子意思是「現在是十點四十分」。', 1, 1),
(284, 12, 'sentence', 'listening', 'It''s time for __________.', NULL, 'It''s time for lunch.',
 JSON_ARRAY('breakfast','lunch','school'), 'lunch', '句子意思是「是吃午餐的時候了」，片語「time for lunch」意指「午餐時間」。', 1, 1),

-- 三、Listen and Choose：聽句子/對話選圖（改成聽句子選單字，部分保留代表圖）
(285, 11, 'sentence', 'listening', 'A: How''s the weather in Hualien? B: It''s cloudy.',
 '/images/senior/The_Big_Wind/cloudy.svg', 'A: How''s the weather in Hualien? B: It''s cloudy.',
 JSON_ARRAY('cloudy','rainy','windy'), 'cloudy', '問句詢問花蓮的天氣，回答「It''s cloudy（是多雲的）」。', 2, 1),
(286, 12, 'sentence', 'listening', 'A: What is it? B: It''s a clock.', NULL, 'A: What is it? B: It''s a clock.',
 JSON_ARRAY('clock','hat','balloon'), 'clock', '問句詢問「這是什麼？」，回答「這是一個時鐘」。', 2, 1),
(287, 11, 'sentence', 'listening', 'A: What is that? B: It''s a wolf.',
 '/images/senior/The_Big_Wind/wolf.svg', 'A: What is that? B: It''s a wolf.',
 JSON_ARRAY('wolf','clock','lunch'), 'wolf', '問句詢問「那是什麼？」，回答「那是一隻狼」。', 2, 1),
(288, 12, 'sentence', 'listening', 'A: What time is it? B: It''s twelve-fifteen.', NULL, 'A: What time is it? B: It''s twelve-fifteen.',
 JSON_ARRAY('It''s twelve-fifteen.','It''s eleven-fifteen.','It''s eleven-fifty.'), 'It''s twelve-fifteen.',
 '問句詢問時間，回答「現在是十二點十五分」。', 2, 1),

-- 四、Listen and Choose：聽句子選適當回應句
(289, 11, 'sentence', 'listening', 'A: Let''s go to Tainan. B: OK. How''s the weather in Tainan?', NULL,
 'A: Let''s go to Tainan. B: OK. How''s the weather in Tainan?',
 JSON_ARRAY('It''s rainy.','It''s cloudy.','It''s sunny.'), 'It''s sunny.',
 '對方詢問臺南的天氣時，應回答天氣狀況，「It''s sunny（天氣晴朗）」為最適當的回應。', 2, 1),
(290, 11, 'sentence', 'listening', 'How''s the weather in Yilan?', NULL, 'How''s the weather in Yilan?',
 JSON_ARRAY('It''s green.','No, it''s not.','It''s windy.'), 'It''s windy.',
 '詢問宜蘭的天氣狀況，「It''s windy（風很大的）」用來描述天氣。', 2, 1),
(291, 12, 'sentence', 'listening', 'What time is it?', NULL, 'What time is it?',
 JSON_ARRAY('It''s cold.','It''s eleven thirty.','I''m eleven.'), 'It''s eleven thirty.',
 '詢問「現在幾點？」，回答應包含時間，「It''s eleven thirty（現在十一點半）」符合題意。', 2, 1),
(292, 12, 'sentence', 'listening', 'What time is it?', NULL, 'What time is it?',
 JSON_ARRAY('It''s twelve fifteen.','It''s windy.','It''s blue.'), 'It''s twelve fifteen.',
 '詢問時間，「It''s twelve fifteen（現在十二點十五分）」為正確的時間回答。', 2, 1),

-- 五、Look and Choose：看圖選單字
(293, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?',
 '/images/senior/The_Big_Wind/cloudy.svg', NULL,
 JSON_ARRAY('rainy','sunny','cloudy'), 'cloudy', '圖片顯示天空有許多雲朵，正確單字為「cloudy（多雲的）」。', 1, 1),
(294, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?',
 '/images/senior/The_Big_Wind/wolf.svg', NULL,
 JSON_ARRAY('wolf','rabbit','frog'), 'wolf', '圖片繪製的動物為「wolf（狼）」。', 1, 1),
(295, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?',
 '/images/senior/Going_Back_Home/breakfast.svg', NULL,
 JSON_ARRAY('breakfast','lunch','dinner'), 'breakfast', '早晨搭配吐司、雞蛋與牛奶，代表「breakfast（早餐）」。', 1, 1),
(296, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?',
 '/images/senior/Going_Back_Home/twenty-five.svg', NULL,
 JSON_ARRAY('fifty','twenty','twenty-five'), 'twenty-five', '圖片上的數字為 25，英文拼法為「twenty-five（二十五）」。', 1, 1),

-- 六、Read and Choose：看單字選圖（改成給圖選單字，方向對調但概念相同）
(297, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?',
 '/images/senior/The_Big_Wind/sunny.svg', NULL,
 JSON_ARRAY('cloudy','rainy','sunny','windy'), 'sunny', '「sunny」意指「晴朗的」，圖片顯示太陽高掛。', 1, 1),
(298, 11, 'vocabulary', 'image_choice', 'Which word matches the picture?',
 '/images/senior/The_Big_Wind/hot.svg', NULL,
 JSON_ARRAY('cold','hot','rainy','windy'), 'hot', '「hot」意指「炎熱的」，圖片人物滿頭大汗、溫度計數值很高。', 1, 1),
(299, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?',
 '/images/senior/Going_Back_Home/forty.svg', NULL,
 JSON_ARRAY('twenty','thirty','forty','fifty'), 'forty', '「forty」意指數字「40」。', 1, 1),
(300, 12, 'vocabulary', 'image_choice', 'Which word matches the picture?',
 '/images/senior/Going_Back_Home/thirty.svg', NULL,
 JSON_ARRAY('fifteen','twenty','thirty','forty'), 'thirty', '「thirty」意指數字「30」。', 1, 1),

-- 七、Look and Write：看圖寫單字
(301, 11, 'vocabulary', 'fill_blank', '(Look at the picture and write the word.)',
 '/images/senior/The_Big_Wind/cloudy.svg', NULL, JSON_ARRAY(), 'cloudy',
 '圖片顯示多雲的天空，正確拼寫為「cloudy」。', 1, 1),
(302, 11, 'vocabulary', 'fill_blank', '(Look at the picture and write the word.)',
 '/images/senior/The_Big_Wind/sunny.svg', NULL, JSON_ARRAY(), 'sunny',
 '圖片顯示晴朗的太陽，正確拼寫為「sunny」。', 1, 1),
(303, 12, 'vocabulary', 'fill_blank', '(Look at the picture and write the word.)',
 '/images/senior/Going_Back_Home/fifteen.svg', NULL, JSON_ARRAY(), 'fifteen',
 '數字 15 的英文拼寫為「fifteen」。', 1, 1),
(304, 12, 'vocabulary', 'fill_blank', '(Look at the picture and write the word.)',
 '/images/senior/Going_Back_Home/twenty.svg', NULL, JSON_ARRAY(), 'twenty',
 '數字 20 的英文拼寫為「twenty」。', 1, 1),

-- 八、Look and Spell：依提示字母拼出單字
(305, 11, 'vocabulary', 'fill_blank', '報紙（提示字母：e, p, e, a, s, p, n, w, r）', NULL, NULL,
 JSON_ARRAY(), 'newspaper', '「報紙」的英文單字為「newspaper」。', 1, 1),
(306, 11, 'vocabulary', 'fill_blank', '寒冷的（提示字母：d, l, c, o）', NULL, NULL,
 JSON_ARRAY(), 'cold', '「寒冷的」英文單字為「cold」。', 1, 1),
(307, 12, 'vocabulary', 'fill_blank', '三十（提示字母：t, h, t, y, i, r）', NULL, NULL,
 JSON_ARRAY(), 'thirty', '「三十」的英文數字為「thirty」。', 1, 1),
(308, 11, 'vocabulary', 'fill_blank', '一把搶走／奪走（提示字母：t, n, h, s, a, c）', NULL, NULL,
 JSON_ARRAY(), 'snatch', '「搶走、奪走」的動詞為「snatch」。', 2, 1),

-- 九、Read and Choose：讀句子/對話選圖（天氣題保留圖，讀時鐘數字的兩題改純文字）
(309, 11, 'sentence', 'image_choice', 'A: How''s the weather? B: It''s cold.',
 '/images/senior/The_Big_Wind/cold.svg', NULL,
 JSON_ARRAY('cold','hot','rainy'), 'cold', '句子描述天氣很冷，圖片人物穿戴厚重保暖衣物，表示寒冷的天氣。', 2, 1),
(310, 11, 'sentence', 'image_choice', 'A: How''s the weather in Yilan? B: It''s hot.',
 '/images/senior/The_Big_Wind/hot.svg', NULL,
 JSON_ARRAY('cold','hot','rainy'), 'hot', '句子描述宜蘭天氣很熱，圖片人物滿頭大汗、太陽高掛，代表炎熱。', 2, 1),
(311, 12, 'sentence', 'mcq', 'It''s nine forty. Which clock shows this time?', NULL, NULL,
 JSON_ARRAY('6:40','9:40','4:20'), '9:40', '句子意指「現在是九點四十分」，對應時間為 9:40。', 2, 1),
(312, 12, 'sentence', 'mcq', 'A: What time is it? B: It''s four fifty-five. Which clock shows this time?', NULL, NULL,
 JSON_ARRAY('4:55','11:50','12:25'), '4:55', '回答時間為「四點五十五分」，對應時間為 4:55。', 2, 1),

-- 十、Read and Choose：文法選擇
(313, 11, 'sentence', 'mcq', 'It ＿＿＿ sunny.', NULL, NULL,
 JSON_ARRAY('am','is','can'), 'is', '主詞「It」為第三人稱單數，be動詞應使用「is」。', 2, 1),
(314, 11, 'sentence', 'mcq', 'A: ＿＿＿ the weather? B: It''s cold.', NULL, NULL,
 JSON_ARRAY('What''s','How','How''s'), 'How''s', '詢問天氣的固定句型為「How is...」，縮寫為「How''s the weather?」。', 2, 1),
(315, 12, 'sentence', 'mcq', 'A: What''s the time? B: It''s one _____ .', NULL, NULL,
 JSON_ARRAY('o''clock','clock','time'), 'o''clock', '整點時間的表達方式為數字加上「o''clock」。', 2, 1),
(316, 12, 'sentence', 'mcq', '＿＿＿ time is it?', NULL, NULL,
 JSON_ARRAY('What','Who','How'), 'What', '詢問時間的固定問句為「What time is it?」。', 2, 1),
(317, 12, 'sentence', 'mcq', 'A: What time is it? B: ＿＿＿ five forty.', NULL, NULL,
 JSON_ARRAY('It','Its','It''s'), 'It''s', '回答時間時，主詞與be動詞常縮寫為「It''s」（It is）。', 2, 1),
(318, 11, 'sentence', 'mcq', 'The big wind blows an _______ .', NULL, NULL,
 JSON_ARRAY('balloon','umbrella','scarf'), 'umbrella', '冠詞使用「an」，後面接的名詞須以母音音素開頭，「umbrella」以母音開頭。', 2, 1),

-- 十一、Unscramble：重組句子
(319, 11, 'sentence', 'ordering', 'blew / wind /. /The', NULL, NULL,
 JSON_ARRAY(), 'The wind blew.', '主詞為 The wind（風），動詞為 blew（吹動）。', 2, 1),
(320, 11, 'sentence', 'ordering', 'How / ? / weather / the / is', NULL, NULL,
 JSON_ARRAY(), 'How is the weather?', '詢問天氣狀況的標準問句結構。', 2, 1),
(321, 12, 'sentence', 'ordering', '? / is / time / What / it', NULL, NULL,
 JSON_ARRAY(), 'What time is it?', '詢問時間的標準問句結構。', 2, 1),
(322, 11, 'sentence', 'ordering', 'the /were/ the/ in /up/ things /wind/! /All /mixed', NULL, NULL,
 JSON_ARRAY(), 'All the things were mixed up in the wind!', '句子意思是「所有的東西都在風中被搞得亂七八糟！」。', 3, 1),

-- 十二、Look, Read, and Write：對話填空（一格拆一題，跟七/八/十一顆粒度一致）
(323, 11, 'sentence', 'fill_blank', 'A: ______________ the weather? B: It''s hot.',
 '/images/senior/The_Big_Wind/hot.svg', NULL, JSON_ARRAY(), 'How''s',
 '根據對話架構，詢問天氣應使用「How''s」。', 2, 1),
(324, 11, 'sentence', 'fill_blank', 'A: How''s the weather? B: It''s ______________.',
 '/images/senior/The_Big_Wind/hot.svg', NULL, JSON_ARRAY(), 'hot',
 '根據對話內容，回答天氣炎熱應填入「hot」。', 2, 1),
(325, 12, 'sentence', 'fill_blank', 'A: ______________ time is it? B: It''s eleven twenty.', NULL, NULL,
 JSON_ARRAY(), 'What', '根據對話架構，詢問時間應使用「What」。', 2, 1),
(326, 12, 'sentence', 'fill_blank', 'A: What time is it? B: It''s eleven ______________.', NULL, NULL,
 JSON_ARRAY(), 'twenty', '十一點二十分的「二十」拼寫為「twenty」。', 2, 1);

-- 完整性檢查
SELECT COUNT(*) AS new_words FROM words WHERE word_id BETWEEN 212 AND 226;
SELECT COUNT(*) AS new_questions FROM questions WHERE question_id BETWEEN 277 AND 326;
SELECT theme_id, question_type, COUNT(*) AS cnt FROM questions WHERE question_id BETWEEN 277 AND 326 GROUP BY theme_id, question_type;
