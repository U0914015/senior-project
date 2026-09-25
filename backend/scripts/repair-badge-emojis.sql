-- 修復雲端獎章 emoji 顯示問號的問題
-- 根因：修 db.js 連線層級 utf8mb4 設定之前，emoji 已經用錯的 charset 寫進資料庫，
-- 資料本身已經壞了，只改連線設定救不回舊資料，要重新覆寫一次正確的 emoji。
-- 這是 repair-badge-emojis.js 的 SQL 版本，內容完全一致。

USE pk_english;

ALTER TABLE badges MODIFY icon_emoji VARCHAR(20) CHARACTER SET utf8mb4 NOT NULL;

UPDATE badges SET icon_emoji = '🎯' WHERE badge_id = 1;
UPDATE badges SET icon_emoji = '🔥' WHERE badge_id = 2;
UPDATE badges SET icon_emoji = '💥' WHERE badge_id = 3;
UPDATE badges SET icon_emoji = '⚡' WHERE badge_id = 4;
UPDATE badges SET icon_emoji = '📘' WHERE badge_id = 5;
UPDATE badges SET icon_emoji = '📗' WHERE badge_id = 6;
UPDATE badges SET icon_emoji = '📙' WHERE badge_id = 7;
UPDATE badges SET icon_emoji = '📕' WHERE badge_id = 8;
UPDATE badges SET icon_emoji = '🥉' WHERE badge_id = 9;
UPDATE badges SET icon_emoji = '🥈' WHERE badge_id = 10;
UPDATE badges SET icon_emoji = '🥇' WHERE badge_id = 11;
UPDATE badges SET icon_emoji = '👑' WHERE badge_id = 12;
UPDATE badges SET icon_emoji = '👍' WHERE badge_id = 13;
UPDATE badges SET icon_emoji = '💬' WHERE badge_id = 14;
UPDATE badges SET icon_emoji = '⭐' WHERE badge_id = 15;
UPDATE badges SET icon_emoji = '🌈' WHERE badge_id = 16;
UPDATE badges SET icon_emoji = '🌟' WHERE badge_id = 17;
UPDATE badges SET icon_emoji = '💖' WHERE badge_id = 18;
UPDATE badges SET icon_emoji = '🎖️' WHERE badge_id = 19;
UPDATE badges SET icon_emoji = '💎' WHERE badge_id = 20;
UPDATE badges SET icon_emoji = '🥉' WHERE badge_id = 21;
UPDATE badges SET icon_emoji = '🥈' WHERE badge_id = 22;
UPDATE badges SET icon_emoji = '🥇' WHERE badge_id = 23;
UPDATE badges SET icon_emoji = '🏅' WHERE badge_id = 24;

-- 確認結果
SELECT badge_id, badge_name, icon_emoji, HEX(icon_emoji) AS icon_hex FROM badges ORDER BY badge_id;
