-- ════════════════════════════════════════════════════════════
-- multimodal-migration.sql
-- 多模態題目（圖片題/聽力題）的資料庫結構調整
--
-- 執行前現況確認（2026-07-13 用 SHOW CREATE TABLE 實際查過）：
--   questions.image_url   已經存在，不用動
--   questions.audio_url   存在但全部是 NULL、沒有任何程式碼在用，改名成 audio_text
--   questions.question_type ENUM 目前是
--     ('mcq','fill_blank','ordering','matching','listening')
--     已經有 listening，缺 image_choice
--   themes 表只到 theme_id=8，9/10 還不存在
--
-- 執行方式：
--   mysql -u root -p pk_english < multimodal-migration.sql
-- ════════════════════════════════════════════════════════════

USE pk_english;

-- 1. question_type 加上 image_choice
ALTER TABLE questions
  MODIFY question_type
  ENUM('mcq','fill_blank','ordering','matching','listening','image_choice')
  NOT NULL;

-- 2. audio_url 改名成 audio_text（全部都是 NULL，沒有程式碼在用，安全改名）
ALTER TABLE questions
  CHANGE audio_url audio_text VARCHAR(255) NULL;

-- 3. 新增主題 9、10
INSERT INTO themes (theme_id, theme_name, description, sort_order) VALUES
  (9,  'New Friends',   'Super Fun 第1冊 Topic 1：認識新朋友', 9),
  (10, 'We Can Help',   'Super Fun 第1冊 Topic 2：我們能幫忙', 10);

-- ────────────────────────────────────────────────────────────
-- 確認結果
-- ────────────────────────────────────────────────────────────
SHOW COLUMNS FROM questions LIKE 'audio_text';
SHOW COLUMNS FROM questions LIKE 'image_url';
SELECT theme_id, theme_name FROM themes WHERE theme_id IN (9, 10);
