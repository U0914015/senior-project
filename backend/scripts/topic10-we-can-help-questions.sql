-- ════════════════════════════════════════════════════════════
-- topic10-we-can-help-questions.sql
-- 主題 10：We Can Help 我們能幫忙 的所有題目
--
-- 內容架構（依照 Super Fun 第1冊 Topic 2）：
--   Lesson 3：外貌形容詞 strong/thin/short/tall + 句型「I'm short. You're tall. He's strong. She's thin.」
--   Lesson 4：情緒形容詞 tired/angry/happy/sad + 句型「Are you tired? Yes, I am. / No, I'm not. I'm sad.」
--   Daily Talk：How are you? / I'm fine. / Good job. / Try again.
--
-- 題型配置邏輯與主題9相同：
--   vocabulary → 圖片題 + 聽力題
--   sentence   → 排序題 + 填空題 + 選擇題
--   reading    → 選擇題（含小故事閱讀理解）
--
-- 執行方式：
--   mysql -u root -p pk_english < topic10-we-can-help-questions.sql
-- ════════════════════════════════════════════════════════════

USE pk_english;

-- ════════════════════════════════════════════════════════════
-- 關卡一：vocabulary（單字挑戰）－ 8 題
-- 重點：認識外貌形容詞與情緒形容詞
-- ════════════════════════════════════════════════════════════

INSERT INTO questions
  (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty, image_url, audio_text)
VALUES

-- 圖片題：看圖選出正確的外貌形容詞（4題）
(10, 'vocabulary', 'image_choice',
 'Look at the picture. How does he look?',
 '["tall", "short", "thin", "tired"]', 'tall',
 '圖片中的人物身高很高，所以是 tall（高的）。',
 1, '/images/super-fun/tall.svg', NULL),

(10, 'vocabulary', 'image_choice',
 'Look at the picture. How does she look?',
 '["short", "tall", "strong", "angry"]', 'short',
 '圖片中的人物身高比較矮，所以是 short（矮的）。',
 1, '/images/super-fun/short.svg', NULL),

(10, 'vocabulary', 'image_choice',
 'Look at the picture. How does he look?',
 '["strong", "thin", "sad", "happy"]', 'strong',
 '圖片中的人物看起來很有力氣，所以是 strong（強壯的）。',
 1, '/images/super-fun/strong.svg', NULL),

(10, 'vocabulary', 'image_choice',
 'Look at the picture. How does she look?',
 '["thin", "strong", "tall", "tired"]', 'thin',
 '圖片中的人物身材瘦瘦的，所以是 thin（瘦的）。',
 1, '/images/super-fun/thin.svg', NULL),

-- 聽力題：聽情緒形容詞發音，選出正確答案（4題）
(10, 'vocabulary', 'listening',
 'Listen carefully. Which word do you hear?',
 '["happy", "sad", "angry", "tired"]', 'happy',
 '聽到的單字是 happy（快樂的）。',
 1, NULL, 'happy'),

(10, 'vocabulary', 'listening',
 'Listen carefully. Which word do you hear?',
 '["sad", "happy", "tired", "angry"]', 'sad',
 '聽到的單字是 sad（傷心的）。',
 1, NULL, 'sad'),

(10, 'vocabulary', 'listening',
 'Listen carefully. Which word do you hear?',
 '["angry", "tired", "happy", "sad"]', 'angry',
 '聽到的單字是 angry（生氣的）。',
 1, NULL, 'angry'),

(10, 'vocabulary', 'listening',
 'Listen carefully. Which word do you hear?',
 '["tired", "sad", "angry", "happy"]', 'tired',
 '聽到的單字是 tired（累的）。',
 1, NULL, 'tired');


-- ════════════════════════════════════════════════════════════
-- 關卡二：sentence（句型挑戰）－ 8 題
-- 重點：練習描述外貌和詢問情緒的句型
-- ════════════════════════════════════════════════════════════

INSERT INTO questions
  (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty, image_url, audio_text)
VALUES

-- 排序題（3題）
(10, 'sentence', 'ordering',
 'Put the words in order to make a sentence.',
 '[]', "I'm short",
 "正確句子：I'm short.（我很矮。）",
 2, NULL, NULL),

(10, 'sentence', 'ordering',
 'Put the words in order to make a sentence.',
 '[]', "He's strong",
 "正確句子：He's strong.（他很強壯。）",
 2, NULL, NULL),

(10, 'sentence', 'ordering',
 'Put the words in order to make a sentence.',
 '[]', 'Are you tired',
 '正確句子：Are you tired?（你累了嗎？）',
 2, NULL, NULL),

-- 填空題（3題）
(10, 'sentence', 'fill_blank',
 "Mike: Are you tired?\nKen: Yes, I ___.",
 '[]', 'am',
 '完整句子是「Yes, I am.」，肯定回答的標準句型。',
 2, NULL, NULL),

(10, 'sentence', 'fill_blank',
 "Wendy: Are you angry?\nEmma: No, I'm not. I'm ___.",
 '[]', 'sad',
 '依照情境，Emma 不是生氣而是傷心（sad）。',
 2, NULL, NULL),

(10, 'sentence', 'fill_blank',
 'Alan: ___ are you?\nMike: I am fine.',
 '[]', 'How',
 '完整句子是「How are you?」，日常問候用語。',
 1, NULL, NULL),

-- 選擇題（2題）
(10, 'sentence', 'mcq',
 'Which sentence describes someone who is very tall?',
 '["He is tall.", "He is short.", "He is thin.", "He is tired."]',
 'He is tall.',
 '描述身高高的正確句子是 He is tall.',
 1, NULL, NULL),

(10, 'sentence', 'mcq',
 'Your friend did a great job. What do you say?',
 '["Good job!", "Try again.", "I am sad.", "How old are you?"]',
 'Good job!',
 '稱讚別人做得好，要說 Good job!（做得好！）',
 1, NULL, NULL);


-- ════════════════════════════════════════════════════════════
-- 關卡三：reading（課文挑戰）－ 6 題
-- 重點：閱讀「We Can Help」社區服務隊的故事
-- ════════════════════════════════════════════════════════════

INSERT INTO questions
  (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty, image_url, audio_text)
VALUES

(10, 'reading', 'mcq',
 'Mike: Hi, I''m Mike. We can help, too.\nEmma: Hello, I''m Emma. What''s your name?\nWendy: I''m Wendy.\n\nWhat does Mike say they can do?',
 '["help", "sing", "dance", "cook"]', 'help',
 'Mike 說「We can help, too.」，表示他們也能幫忙。',
 2, NULL, NULL),

(10, 'reading', 'mcq',
 'Mike: How old are you, Alan?\nAlan: I''m ten.\nMike: Nice to meet you.\nAlan: Nice to meet you, too.\n\nHow old is Alan in this story?',
 '["ten", "nine", "eight", "seven"]', 'ten',
 'Alan 回答「I''m ten」，所以 Alan 十歲。',
 1, NULL, NULL),

(10, 'reading', 'mcq',
 'Christmas is here. We Can Help is celebrating Christmas at the old lady''s house. Mike even dresses like Santa Claus.\n\nWhat does Mike dress like?',
 '["Santa Claus", "a reindeer", "an elf", "a snowman"]', 'Santa Claus',
 '故事提到 Mike 打扮成聖誕老人（Santa Claus）。',
 2, NULL, NULL),

(10, 'reading', 'mcq',
 'Ken and Wendy are decorating the Christmas tree. Alan is preparing the meal. There are salad, an apple pie, and roast turkey.\n\nWho is preparing the meal?',
 '["Alan", "Ken", "Wendy", "Mike"]', 'Alan',
 '故事提到 Alan 負責準備餐點（preparing the meal）。',
 2, NULL, NULL),

(10, 'reading', 'mcq',
 'The old lady lost her dog, Cody. Wendy found a stray dog in the bushes. Ken used dog snacks to lure it out. It was Cody!\n\nWhose dog is Cody?',
 '["the old lady\'s", "Wendy\'s", "Ken\'s", "Mike\'s"]', "the old lady's",
 '故事提到 Cody 是老奶奶（the old lady）的狗。',
 2, NULL, NULL),

(10, 'reading', 'mcq',
 'We Can Help is a group of friends who help others in the community. They help find lost pets and celebrate holidays with people who need company.\n\nWhat does "We Can Help" do?',
 '["help others in the community", "play video games", "study at school", "go shopping"]',
 'help others in the community',
 '故事主旨是「We Can Help」是一群在社區中互助的朋友。',
 1, NULL, NULL);


-- ────────────────────────────────────────────────────────────
-- 確認本主題的題目總數
-- ────────────────────────────────────────────────────────────
SELECT level, question_type, COUNT(*) AS 題數
FROM questions
WHERE theme_id = 10
GROUP BY level, question_type
ORDER BY level;
