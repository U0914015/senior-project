const express = require('express')
const router  = express.Router()
const db      = require('../db')
const auth    = require('../middleware/auth')
const { checkAndAwardBadges } = require('./badges')

// 各互動類型的固定分數（伺服器端為唯一真實來源，不信任前端傳來的分數）
const ACTION_SCORES = { like: 10, sticker: 30, comment: 50 }

router.post('/interact', auth, async (req, res) => {
  const {
    session_id, receiver_id, action_type,
    sticker_tag, comment_text, comment_category,
    is_preset = 1
  } = req.body

  const sender_id = req.user.user_id
  const score_awarded = ACTION_SCORES[action_type]

  if (!score_awarded)
    return res.status(400).json({ error: '未知的互動類型' })
  if (sender_id === receiver_id)
    return res.status(400).json({ error: '不能對自己互動' })

  try {
    // 防偏袒輪替機制：不能連續兩次都送給同一個人（不分互動類型），逼
    // 大家至少雨露均霑輪過一輪隊友，不會整場只鼓勵固定同一個人
    const [[lastLog]] = await db.query(
      `SELECT receiver_id FROM social_logs
       WHERE session_id = ? AND sender_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [session_id, sender_id]
    )
    if (lastLog && lastLog.receiver_id === receiver_id)
      return res.status(400).json({ error: '不能連續送給同一位隊友，先鼓勵其他人吧！' })

    await db.query(
      `INSERT INTO social_logs
       (session_id, sender_id, receiver_id, action_type,
        sticker_tag, comment_text, comment_category, is_preset, score_awarded)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [session_id, sender_id, receiver_id, action_type,
       sticker_tag||null, comment_text||null,
       comment_category||null, is_preset, score_awarded]
    )

    // 同時更新 receiver 的 social_score
    await db.query(
      'UPDATE users SET social_score = social_score + ? WHERE user_id = ?',
      [score_awarded, receiver_id]
    )

    // 互動成功寫入後才檢查獎章，才能看到這次互動造成的最新分數/次數。
    // 回傳給「送出互動的人」的畫面時，只帶：
    //   (1) 這個人自己因為送出動作而拿到的獎章
    //   (2) 對方因此拿到、但屬於「小組共同」類的獎章（大家都有份，該讓送出的人也看到）
    // 對方自己拿到的個人類獎章（例如累積收到次數的門檻）不該出現在送出者畫面上，
    // 那是對方自己回自己的結果頁/首頁 toast 才會看到的東西
    const sentBadges     = await checkAndAwardBadges(sender_id, session_id)
    const receivedBadges = await checkAndAwardBadges(receiver_id, session_id)
    const sharedFromReceiver = receivedBadges.filter(b => b.badge_category === 'social_team')

    const badgeMap = new Map()
    for (const b of [...sentBadges, ...sharedFromReceiver]) badgeMap.set(b.badge_id, b)
    const new_badges = [...badgeMap.values()]

    res.json({ ok: true, score_awarded, new_badges })
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: '已經互動過了' })
    console.error(e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

module.exports = router