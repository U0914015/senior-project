const db = require('../db')

// Kept by badge_id so data damaged by an old non-utf8mb4 connection can be
// restored deterministically.
const emojiByBadgeId = new Map([
  [1, '🎯'], [2, '🔥'], [3, '💥'], [4, '⚡'],
  [5, '📘'], [6, '📗'], [7, '📙'], [8, '📕'],
  [9, '🥉'], [10, '🥈'], [11, '🥇'], [12, '👑'],
  [13, '👍'], [14, '💬'], [15, '⭐'], [16, '🌈'],
  [17, '🌟'], [18, '💖'], [19, '🎖️'], [20, '💎'],
  [21, '🥉'], [22, '🥈'], [23, '🥇'], [24, '🏅'],
])

async function main() {
  await db.query(
    'ALTER TABLE badges MODIFY icon_emoji VARCHAR(20) CHARACTER SET utf8mb4 NOT NULL'
  )

  for (const [badgeId, emoji] of emojiByBadgeId) {
    await db.query(
      'UPDATE badges SET icon_emoji = ? WHERE badge_id = ?',
      [emoji, badgeId]
    )
  }

  const [rows] = await db.query(
    `SELECT badge_id, badge_name, icon_emoji, HEX(icon_emoji) AS icon_hex
     FROM badges
     ORDER BY badge_id`
  )
  console.table(rows)
  console.log('Badge emoji repair complete.')
  await db.end()
}

main().catch(async (error) => {
  console.error(error)
  await db.end()
  process.exitCode = 1
})
