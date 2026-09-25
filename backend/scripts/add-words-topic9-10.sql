-- ════════════════════════════════════════════════════════════
-- add-words-topic9-10.sql
-- New Friends(9)/We Can Help(10) 的單字複習翻卡資料
--
-- 背景：topic9/10 當初只匯入了 questions 表（PK題目），words 表
-- （單字複習翻卡用）完全沒有這兩個主題的資料，導致「單字複習」
-- 翻卡遊戲在 CH9/CH10 前面是空的。
--
-- words 表新增 image_url 欄位（跟 questions 表同款式），
-- 全部 18 個單字都有對應的 SVG 插圖了。
--
-- 執行方式：
--   mysql -u root -p pk_english < add-words-topic9-10.sql
-- ════════════════════════════════════════════════════════════

USE pk_english;

ALTER TABLE words ADD COLUMN image_url VARCHAR(255) NULL AFTER part_of_speech;

-- ── 主題 9：New Friends（人名 + 數字）──────────────────────
INSERT INTO words (english, chinese, word_no, grade, theme_id, part_of_speech, image_url) VALUES
  ('Mike',  '麥克',  901, 3, 9, 'noun', '/images/super-fun/mike.svg'),
  ('Ken',   '肯',    902, 3, 9, 'noun', '/images/super-fun/ken.svg'),
  ('Emma',  '艾瑪',  903, 3, 9, 'noun', '/images/super-fun/emma.svg'),
  ('Wendy', '溫蒂',  904, 3, 9, 'noun', '/images/super-fun/wendy.svg'),
  ('Alan',  '艾倫',  905, 3, 9, 'noun', '/images/super-fun/alan.svg'),
  ('six',   '六',    906, 3, 9, 'number', '/images/super-fun/six.svg'),
  ('seven', '七',    907, 3, 9, 'number', '/images/super-fun/seven.svg'),
  ('eight', '八',    908, 3, 9, 'number', '/images/super-fun/eight.svg'),
  ('nine',  '九',    909, 3, 9, 'number', '/images/super-fun/nine.svg'),
  ('ten',   '十',    910, 3, 9, 'number', '/images/super-fun/ten.svg');

-- ── 主題 10：We Can Help（外貌形容詞 + 情緒形容詞）──────────
INSERT INTO words (english, chinese, word_no, grade, theme_id, part_of_speech, image_url) VALUES
  ('tall',   '高的',   911, 3, 10, 'adjective', '/images/super-fun/tall.svg'),
  ('short',  '矮的',   912, 3, 10, 'adjective', '/images/super-fun/short.svg'),
  ('strong', '強壯的', 913, 3, 10, 'adjective', '/images/super-fun/strong.svg'),
  ('thin',   '瘦的',   914, 3, 10, 'adjective', '/images/super-fun/thin.svg'),
  ('happy',  '快樂的', 915, 3, 10, 'adjective', '/images/super-fun/happy.svg'),
  ('sad',    '傷心的', 916, 3, 10, 'adjective', '/images/super-fun/sad.svg'),
  ('angry',  '生氣的', 917, 3, 10, 'adjective', '/images/super-fun/angry.svg'),
  ('tired',  '累的',   918, 3, 10, 'adjective', '/images/super-fun/tired.svg');

-- ────────────────────────────────────────────────────────────
SELECT theme_id, COUNT(*) AS 單字數 FROM words WHERE theme_id IN (9,10) GROUP BY theme_id;
