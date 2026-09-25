-- ════════════════════════════════════════════════════════════
-- topic9-new-friends-questions.sql
-- 主題 9：New Friends 新朋友 的所有題目
--
-- 內容架構（依照 Super Fun 第1冊 Topic 1）：
--   Lesson 1：人名 Mike/Ken/Emma/Wendy/Alan + 句型「What's your name? My name is ___.」
--   Lesson 2：數字 six~ten + 句型「How old are you? I'm ___ years old.」
--   Daily Talk：Thank you / You're welcome / Nice to meet you
--
-- 三個關卡的題型配置邏輯：
--   vocabulary（單字關）→ 以「圖片題」「聽力題」為主，因為單字學習重視「看到/聽到→理解」的直覺反應
--   sentence（句型關）→ 以「填空題」「排序題」為主，因為句型要練習「組裝句子」的能力
--   reading（課文關）→ 以「選擇題」為主，搭配一段小故事考閱讀理解
--
-- 執行方式：
--   mysql -u root -p pk_english < topic9-new-friends-questions.sql
-- ════════════════════════════════════════════════════════════

USE pk_english;

-- ════════════════════════════════════════════════════════════
-- 關卡一：vocabulary（單字挑戰）－ 8 題
-- 重點：認識人名與數字 6-10，搭配圖片和聽力
-- ════════════════════════════════════════════════════════════

INSERT INTO questions
  (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty, image_url, audio_text)
VALUES

-- 圖片題：看人物頭像選出正確名字（4題，對應 Mike/Ken/Emma/Wendy）
-- image_url 先用佔位圖示路徑，之後可替換成真實插圖
(9, 'vocabulary', 'image_choice',
 'Look at the picture. What is his name?',
 '["Mike", "Ken", "Emma", "Alan"]', 'Mike',
 'Mike 是故事裡戴眼鏡、會自我介紹的男孩。',
 1, '/images/super-fun/mike.png', NULL),

(9, 'vocabulary', 'image_choice',
 'Look at the picture. What is her name?',
 '["Wendy", "Emma", "Mike", "Ken"]', 'Emma',
 'Emma 是故事裡的女孩角色，喜歡在社群媒體上通知大家消息。',
 1, '/images/super-fun/emma.png', NULL),

(9, 'vocabulary', 'image_choice',
 'Look at the picture. What is her name?',
 '["Emma", "Wendy", "Alan", "Ken"]', 'Wendy',
 'Wendy 喜歡在公園裡播放音樂，發現了走失的小狗 Cody。',
 1, '/images/super-fun/wendy.png', NULL),

(9, 'vocabulary', 'image_choice',
 'Look at the picture. What is his name?',
 '["Ken", "Mike", "Alan", "Emma"]', 'Ken',
 'Ken 拿出狗狗零食，把走失的狗狗 Cody 從草叢中引誘出來。',
 1, '/images/super-fun/ken.png', NULL),

-- 聽力題：聽數字唸法，選出正確的數字（4題，對應 six/seven/eight/nine/ten 中選4個）
(9, 'vocabulary', 'listening',
 'Listen carefully. Which number do you hear?',
 '["six", "seven", "eight", "nine"]', 'seven',
 '聽到的單字是 seven（七）。',
 1, NULL, 'seven'),

(9, 'vocabulary', 'listening',
 'Listen carefully. Which number do you hear?',
 '["eight", "nine", "ten", "six"]', 'nine',
 '聽到的單字是 nine（九）。',
 1, NULL, 'nine'),

(9, 'vocabulary', 'listening',
 'Listen carefully. Which number do you hear?',
 '["ten", "six", "seven", "eight"]', 'ten',
 '聽到的單字是 ten（十）。',
 1, NULL, 'ten'),

(9, 'vocabulary', 'listening',
 'Listen carefully. Which number do you hear?',
 '["six", "eight", "nine", "ten"]', 'six',
 '聽到的單字是 six（六）。',
 1, NULL, 'six');


-- ════════════════════════════════════════════════════════════
-- 關卡二：sentence（句型挑戰）－ 8 題
-- 重點：練習自我介紹和詢問年齡的句型
-- ════════════════════════════════════════════════════════════

INSERT INTO questions
  (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty, image_url, audio_text)
VALUES

-- 排序題：把單字排成正確句子（3題）
(9, 'sentence', 'ordering',
 'Put the words in order to make a sentence.',
 '[]', 'What is your name',
 '正確句子：What is your name?（你叫什麼名字？）',
 2, NULL, NULL),

(9, 'sentence', 'ordering',
 'Put the words in order to make a sentence.',
 '[]', 'My name is Ken',
 '正確句子：My name is Ken.（我的名字是肯。）',
 2, NULL, NULL),

(9, 'sentence', 'ordering',
 'Put the words in order to make a sentence.',
 '[]', 'I am nine years old',
 '正確句子：I am nine years old.（我九歲了。）',
 2, NULL, NULL),

-- 填空題：依情境填入正確答案（3題）
(9, 'sentence', 'fill_blank',
 "Mike: Hi, I'm Kim. I'm nine years old.\nWendy: ___ are you, Alan?\nAlan: I'm ten.",
 '[]', 'How old',
 '完整句子是「How old are you, Alan?」，詢問年齡的句型。',
 2, NULL, NULL),

(9, 'sentence', 'fill_blank',
 "Emma: Hello, I'm Emma. What's your name?\nWendy: I'm ___.",
 '[]', 'Wendy',
 '依照故事情境，回答自己的名字 Wendy。',
 1, NULL, NULL),

(9, 'sentence', 'fill_blank',
 'Mike: Nice to meet you.\nKen: Nice to meet you, ___.',
 '[]', 'too',
 '完整句子是「Nice to meet you, too.」，禮貌回應用語。',
 1, NULL, NULL),

-- 選擇題：判斷正確句型（2題）
(9, 'sentence', 'mcq',
 'Which sentence is correct when you ask someone their age?',
 '["How old are you?", "How are you old?", "What old are you?", "You are how old?"]',
 'How old are you?',
 '詢問年齡的正確句型是 How old are you?',
 2, NULL, NULL),

(9, 'sentence', 'mcq',
 'Someone says "Thank you." What should you say?',
 '["You\'re welcome.", "Thank you too.", "I am fine.", "Nice to meet you."]',
 "You're welcome.",
 '當別人說 Thank you，禮貌的回應是 You\'re welcome.（不客氣）',
 1, NULL, NULL);


-- ════════════════════════════════════════════════════════════
-- 關卡三：reading（課文挑戰）－ 6 題
-- 重點：閱讀小故事並理解內容
-- ════════════════════════════════════════════════════════════

INSERT INTO questions
  (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty, image_url, audio_text)
VALUES

(9, 'reading', 'mcq',
 'Mike: Hi, I''m Kim. I''m nine years old.\nTed: I''m Ted. My name is Ann.\n\nWho says "I''m nine years old"?',
 '["Mike", "Ted", "Ann", "Kim"]', 'Mike',
 '從對話中可以看到，說「I''m nine years old」的是 Mike（自稱 Kim）。',
 2, NULL, NULL),

(9, 'reading', 'mcq',
 'Wendy: Hi, I''m Mike.\nEmma: Hello, I''m Emma. What''s your name?\nWendy: I''m Wendy.\nEmma: How old are you?\nWendy: I''m nine years old.\n\nHow old is Wendy?',
 '["nine", "ten", "eight", "seven"]', 'nine',
 '從對話中 Wendy 說「I''m nine years old」，所以 Wendy 九歲。',
 2, NULL, NULL),

(9, 'reading', 'mcq',
 'Mike: How old are you, Alan?\nAlan: I''m ten.\n\nHow old is Alan?',
 '["ten", "nine", "eight", "six"]', 'ten',
 'Alan 回答「I''m ten」，所以 Alan 十歲。',
 1, NULL, NULL),

(9, 'reading', 'mcq',
 "Wendy was in the park. She heard a dog barking. She found a stray dog that looked like Cody. Ken brought dog snacks to lure the dog out from the bushes. They found Cody!\n\nWhere was Wendy when she heard the dog?",
 '["in the park", "at school", "at home", "at the zoo"]', 'in the park',
 '故事提到 Wendy 在公園裡（in the park）聽到狗叫聲。',
 2, NULL, NULL),

(9, 'reading', 'mcq',
 "Wendy was in the park. She heard a dog barking. She found a stray dog that looked like Cody. Ken brought dog snacks to lure the dog out from the bushes. They found Cody!\n\nWho brought dog snacks?",
 '["Ken", "Mike", "Emma", "Alan"]', 'Ken',
 '故事提到 Ken 拿出狗狗零食（dog snacks）引誘小狗出來。',
 2, NULL, NULL),

(9, 'reading', 'mcq',
 'Mike, Ken, Emma, Wendy, and Alan are all new friends. They introduce themselves and ask each other questions like "What''s your name?" and "How old are you?"\n\nWhat do new friends usually ask each other?',
 '["What\'s your name? and How old are you?", "Where do you live?", "What do you eat?", "What time is it?"]',
 "What's your name? and How old are you?",
 '故事的主旨是新朋友見面時會互相詢問姓名和年齡。',
 1, NULL, NULL);


-- ────────────────────────────────────────────────────────────
-- 確認本主題的題目總數
-- ────────────────────────────────────────────────────────────
SELECT level, question_type, COUNT(*) AS 題數
FROM questions
WHERE theme_id = 9
GROUP BY level, question_type
ORDER BY level;
