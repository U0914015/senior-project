/**
 * routes/users.js
 * 使用者個人頁 API
 *
 * GET /api/users/:userId/profile        → 個人頁完整資料
 * GET /api/users/:userId/group-members  → 同組組員名單（不含自己）
 */

const express = require('express')
const router  = express.Router()
const db      = require('../db')
const auth    = require('../middleware/auth')

// ══════════════════════════════════════════════════════════
//  GET /api/users/:userId/profile
//  回傳：個人資料 + 答題統計 + 社群數據 + 獎章 + 近期紀錄
// ══════════════════════════════════════════════════════════
router.get('/:userId/profile', auth, async (req, res) => {
  try {
    const targetId = Number(req.params.userId)
    const { class_id } = req.user

    // ── 1. 基本資料 + 班級排名 ──────────────────────────
    const [[user]] = await db.query(
      `SELECT
         u.user_id, u.nickname, u.student_id,
         u.group_id, u.is_leader,
         u.system_score, u.social_score,
         u.class_id, u.created_at,
         g.group_name,
         c.class_name, COALESCE(u.experiment_group, c.experiment_group) AS experiment_group,
         (
           SELECT COUNT(*) + 1
           FROM users u2
           WHERE u2.class_id = u.class_id
             AND u2.role = 'student'
             AND u2.system_score > u.system_score
         ) AS class_rank
       FROM users u
       LEFT JOIN \`groups\` g ON g.group_id = u.group_id
       LEFT JOIN classes    c ON c.class_id  = u.class_id
       WHERE u.user_id = ?`,
      [targetId]
    )

    if (!user)
      return res.status(404).json({ error: '找不到使用者' })

    // ── 2. 答題統計 ─────────────────────────────────────
    // total_games 算全部場次（不管有沒有被隊友救過都算有玩到這場）；
    // 但 total_questions/correct_count/accuracy/avg_response_time 這些
    // 代表「個人能力」的統計要排除被隊友救援的題目（rescued_by_user_id
    // 不是 NULL），不然隊友的知識會混進這個人自己的正確率，污染前後測
    // 比對用的個人資料
    const [[stats]] = await db.query(
      `SELECT
         COUNT(DISTINCT gl.session_id) AS total_games,
         SUM(gl.rescued_by_user_id IS NULL) AS total_questions,
         COALESCE(SUM(IF(gl.rescued_by_user_id IS NULL, gl.is_correct, 0)), 0) AS correct_count,
         COALESCE(
           ROUND(AVG(IF(gl.rescued_by_user_id IS NULL, gl.response_time, NULL)), 1), 0
         ) AS avg_response_time,
         COALESCE(
           ROUND(
             SUM(IF(gl.rescued_by_user_id IS NULL, gl.is_correct, 0))
             / NULLIF(SUM(gl.rescued_by_user_id IS NULL), 0) * 100, 1
           ), 0
         ) AS accuracy
       FROM game_logs gl
       WHERE gl.user_id = ?`,
      [targetId]
    )

    // ── 3. 社群數據（送出 & 收到）───────────────────────
    const [[socSent]] = await db.query(
      `SELECT
         COALESCE(SUM(action_type = 'like'),    0) AS likes_sent,
         COALESCE(SUM(action_type = 'sticker'), 0) AS stickers_sent,
         COALESCE(SUM(action_type = 'comment'), 0) AS comments_sent,
         COALESCE(SUM(score_awarded), 0)           AS total_sent_score
       FROM social_logs
       WHERE sender_id = ?`,
      [targetId]
    )

    const [[socRecv]] = await db.query(
      `SELECT
         COALESCE(COUNT(*), 0)          AS total_received,
         COALESCE(SUM(score_awarded), 0) AS total_received_score
       FROM social_logs
       WHERE receiver_id = ?`,
      [targetId]
    )

    // 收到的互動明細（誰、做了什麼、留言/貼紙內容），只有自己查自己的個人頁
    // 才給，避免同學互相偷看別人收到什麼（隱私考量）
    let receivedLogs = []
    if (targetId === req.user.user_id) {
      const [logs] = await db.query(
        `SELECT sl.social_id, sl.action_type, sl.sticker_tag,
                sl.comment_text, sl.comment_category, sl.created_at,
                u.nickname AS sender_nickname
         FROM social_logs sl
         JOIN users u ON u.user_id = sl.sender_id
         WHERE sl.receiver_id = ?
         ORDER BY sl.created_at DESC
         LIMIT 30`,
        [targetId]
      )
      receivedLogs = logs
    }

    // ── 4. 獎章（含是否已獲得）──────────────────────────
    const [badges] = await db.query(
      `SELECT
         b.badge_id, b.badge_name, b.badge_category,
         b.badge_tier, b.condition_desc,
         b.condition_value, b.icon_emoji,
         IF(ub.badge_id IS NOT NULL, 1, 0) AS earned,
         ub.awarded_at
       FROM badges b
       LEFT JOIN user_badges ub
         ON ub.badge_id = b.badge_id AND ub.user_id = ?
       WHERE b.is_active = 1
       ORDER BY b.badge_category, b.badge_tier`,
      [targetId]
    )

    // ── 5. 近期 PK 紀錄（最近 10 場）────────────────────
    const [recentGames] = await db.query(
      `SELECT
         gs.session_id,
         gs.level,
         gs.winner_group_id,
         gs.ended_at,
         DATE_FORMAT(gs.ended_at, '%m/%d') AS date,
         -- 對手小組名
         IF(u.group_id = gs.group_a_id, gb.group_name, ga.group_name)
                                            AS opponent_group,
         -- 個人本場得分
         COALESCE(SUM(gl.base_score + gl.speed_bonus), 0) AS score,
         -- 正確率
         COALESCE(
           ROUND(SUM(gl.is_correct) / COUNT(gl.log_id) * 100), 0
         )                                  AS accuracy,
         -- 勝負
         CASE
           WHEN gs.winner_group_id IS NULL     THEN 'draw'
           WHEN gs.winner_group_id = u.group_id THEN 'win'
           ELSE 'lose'
         END AS result
       FROM game_sessions gs
       JOIN users u ON u.user_id = ?
       LEFT JOIN \`groups\` ga ON ga.group_id = gs.group_a_id
       LEFT JOIN \`groups\` gb ON gb.group_id = gs.group_b_id
       LEFT JOIN game_logs gl
         ON gl.session_id = gs.session_id AND gl.user_id = ?
       WHERE (gs.group_a_id = u.group_id OR gs.group_b_id = u.group_id)
         AND gs.status = 'completed'
       GROUP BY gs.session_id
       ORDER BY gs.ended_at DESC
       LIMIT 10`,
      [targetId, targetId, targetId]
    )

    // ── 組合回傳 ─────────────────────────────────────────
    res.json({
      profile: {
        ...user,
        total_games:       stats?.total_games       ?? 0,
        total_questions:   stats?.total_questions   ?? 0,
        correct_count:     stats?.correct_count     ?? 0,
        avg_response_time: stats?.avg_response_time ?? 0,
        accuracy:          stats?.accuracy          ?? 0,
        likes_sent:        socSent?.likes_sent      ?? 0,
        stickers_sent:     socSent?.stickers_sent   ?? 0,
        comments_sent:     socSent?.comments_sent   ?? 0,
        total_received:    socRecv?.total_received  ?? 0,
      },
      badges,
      recent_games:      recentGames,
      received_interactions: receivedLogs,
    })

  } catch (e) {
    console.error('[users/profile]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  GET /api/users/:userId/group-members
//  同組組員名單（不含自己）——小組共同獎章要顯示「跟誰一起獲得」，
//  需要知道當時同組的其他人是誰
// ══════════════════════════════════════════════════════════
router.get('/:userId/group-members', auth, async (req, res) => {
  try {
    const targetId = Number(req.params.userId)

    const [[target]] = await db.query(
      'SELECT group_id FROM users WHERE user_id = ?', [targetId]
    )
    if (!target) return res.status(404).json({ error: '找不到使用者' })
    if (!target.group_id) return res.json({ members: [] })

    const [members] = await db.query(
      `SELECT user_id, nickname
       FROM users
       WHERE group_id = ? AND role = 'student' AND user_id != ?
       ORDER BY is_leader DESC, nickname`,
      [target.group_id, targetId]
    )

    res.json({ members })
  } catch (e) {
    console.error('[users/group-members]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

module.exports = router
