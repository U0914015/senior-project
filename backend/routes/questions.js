/**
 * ═══════════════════════════════════════════════════════
 * routes/questions.js
 * 題目庫 API — 負責提供單字複習和練習題目
 *
 * 端點總覽：
 *  GET /api/questions/review   → 複習區：抽單字給翻牌複習用
 *  GET /api/questions/stage    → PK答題：抽題目給對戰用
 *  GET /api/questions/themes   → 取得所有學習主題清單
 *  GET /api/questions/stats    → 教師用：各題答對率統計
 * ═══════════════════════════════════════════════════════
 */

// 引入 Express 框架，用來建立路由
const express = require('express')
// 建立一個路由器物件，之後把所有路由掛在上面
const router  = express.Router()
// 引入資料庫連線池，用來執行 SQL 查詢
const db      = require('../db')
// 引入 JWT 驗證中介層，確保只有登入的人才能使用這些 API
const auth    = require('../middleware/auth')

// ══════════════════════════════════════════════════════════
//  GET /api/questions/review
//  複習區用：從指定主題抽取單字，給學習區的翻牌複習使用
//
//  Query 參數：
//    theme_id（選填）：主題編號，不填則從所有主題隨機抽
//    limit（選填）：要抽幾個單字，預設 10 個
//
//  回傳：
//    { words: [{ english, chinese, part_of_speech, theme_id }] }
// ══════════════════════════════════════════════════════════
router.get('/review', auth, async (req, res) => {
  try {
    // 從網址的 query 參數取得 theme_id 和 limit
    // 例如：/review?theme_id=1&limit=10
    const themeId = req.query.theme_id ? Number(req.query.theme_id) : null
    // 如果沒有指定數量，預設抽 10 個單字
    const limit   = Number(req.query.limit) || 10

    let sql    // 要執行的 SQL 語句
    let params // SQL 語句的參數（避免 SQL injection 攻擊）

    if (themeId) {
      // 如果有指定主題，只從那個主題抽單字
      // ORDER BY RAND() 是隨機排序，LIMIT 限制數量
      sql    = `SELECT w.word_id, w.english, w.chinese, w.part_of_speech,
                       w.theme_id, t.theme_name, w.image_url
                FROM words w
                JOIN themes t ON t.theme_id = w.theme_id
                WHERE w.theme_id = ? AND w.is_active = 1
                ORDER BY RAND()
                LIMIT ?`
      params = [themeId, limit]
    } else {
      // 如果沒有指定主題，從所有「這次實驗會用到」的主題隨機抽（theme_id IN (11,12,17,18)，
      // 理由同 /themes 那支的註解——theme 1-10 是舊教材，不該出現在學生畫面上）
      sql    = `SELECT w.word_id, w.english, w.chinese, w.part_of_speech,
                       w.theme_id, t.theme_name, w.image_url
                FROM words w
                JOIN themes t ON t.theme_id = w.theme_id
                WHERE w.is_active = 1 AND w.theme_id IN (11,12,17,18)
                ORDER BY RAND()
                LIMIT ?`
      params = [limit]
    }

    // 執行 SQL 查詢，db.query 回傳一個陣列
    // 第一個元素是查詢結果，第二個是欄位資訊（我們不需要）
    const [words] = await db.query(sql, params)

    // 回傳單字陣列給前端
    res.json({ words })

  } catch (e) {
    // 如果發生錯誤，印出錯誤訊息並回傳 500 錯誤
    console.error('[questions/review]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  GET /api/questions/stage
//  學習區練習用：依關卡類型抽題目（單字/句型/課文）
//  （注意：session/start 是 PK 對戰抽題，這支是給學習區練習模式用的）
//
//  Query 參數：
//    level：關卡類型（vocabulary / sentence / reading）
//    theme_id（選填）：指定主題
//    limit（選填）：要抽幾題，預設 5 題
//
//  回傳：
//    { questions: [...] }
//  這支是「練習模式」，沒有排名/計分的作弊疑慮，
//  所以會直接回傳 correct_answer/explanation 讓前端立即給回饋
//  （PK 對戰的 /game/session/start 才需要防作弊隱藏答案）
// ══════════════════════════════════════════════════════════
router.get('/stage', auth, async (req, res) => {
  try {
    // 取得關卡類型，必填
    const level   = req.query.level
    const themeId = req.query.theme_id ? Number(req.query.theme_id) : null
    const limit   = Number(req.query.limit) || 5

    // 如果沒有提供 level，回傳錯誤
    if (!level) {
      return res.status(400).json({ error: '請提供 level 參數（vocabulary / sentence / reading）' })
    }

    let sql
    let params

    if (themeId) {
      // 指定主題的題目
      sql = `SELECT question_id, question_text, question_type,
                    options, correct_answer, explanation,
                    difficulty, image_url, audio_text
             FROM questions
             WHERE level = ? AND theme_id = ? AND is_active = 1
             ORDER BY RAND()
             LIMIT ?`
      params = [level, themeId, limit]
    } else {
      // 所有「這次實驗會用到」的主題的題目（theme_id IN (11,12,17,18)，理由同 /themes）
      sql = `SELECT question_id, question_text, question_type,
                    options, correct_answer, explanation,
                    difficulty, image_url, audio_text
             FROM questions
             WHERE level = ? AND is_active = 1 AND theme_id IN (11,12,17,18)
             ORDER BY RAND()
             LIMIT ?`
      params = [level, limit]
    }

    const [questions] = await db.query(sql, params)

    // 處理 options 欄位：資料庫存的是 JSON 字串，需要轉成陣列
    const parsed = questions.map(q => ({
      question_id:    q.question_id,
      question_text:  q.question_text,
      question_type:  q.question_type,
      difficulty:     q.difficulty,
      image_url:      q.image_url || null,
      audio_text:     q.audio_text || null,
      correct_answer: q.correct_answer,
      explanation:    q.explanation || null,
      // 把 JSON 字串轉成陣列，如果失敗就回傳空陣列
      options: (() => {
        try {
          if (!q.options) return []
          if (Array.isArray(q.options)) return q.options
          return JSON.parse(q.options)
        } catch {
          return []
        }
      })(),
    }))

    res.json({ questions: parsed })

  } catch (e) {
    console.error('[questions/stage]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  GET /api/questions/themes
//  取得所有學習主題清單
//  學習區的元單元選擇頁面用這支 API 取得章節清單
//
//  只回傳 theme_id IN (11,12,17,18)（學姊教材第三冊六單元）：theme_id 1-10 是原系統
//  （pk-english-game）留下來的舊教材，不是這次實驗要考的內容，前端不需要
//  也不應該讓學生選到，直接在這裡擋掉，UnitSelectView/ChallengeView 兩個
//  單元選擇畫面都是靠這支 API 的回傳結果決定要顯示哪些單元，改這裡就夠了
//
//  回傳：
//    { themes: [{ theme_id, theme_name, description, word_count }] }
// ══════════════════════════════════════════════════════════
router.get('/themes', auth, async (req, res) => {
  try {
    // 查詢所有主題，並計算每個主題有幾個單字
    const [themes] = await db.query(
      `SELECT t.theme_id, t.theme_name, t.description, t.sort_order,
              COUNT(w.word_id) AS word_count
       FROM themes t
       LEFT JOIN words w ON w.theme_id = t.theme_id AND w.is_active = 1
       WHERE t.theme_id IN (11,12,17,18)
       GROUP BY t.theme_id
       ORDER BY t.sort_order ASC`
    )

    res.json({ themes })

  } catch (e) {
    console.error('[questions/themes]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  GET /api/questions/stats
//  教師後台用：統計各題目的答對率
//  老師可以看到哪些題目學生最常答錯
//
//  Query 參數：
//    class_id（選填）：指定班級，不填則看所有班級
//
//  回傳：各題目的答題統計資料
// ══════════════════════════════════════════════════════════
router.get('/stats', auth, async (req, res) => {
  try {
    // 只有教師才能看統計資料
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: '只有教師可以查看統計資料' })
    }

    const classId = req.query.class_id
      ? Number(req.query.class_id)
      : null

    // 查詢每題的答題次數和答對次數
    let sql
    let params

    if (classId) {
      sql = `SELECT
               q.question_id,
               q.question_text,
               q.question_type,
               q.level,
               q.difficulty,
               COUNT(gl.log_id)            AS total_attempts,
               SUM(gl.is_correct)          AS correct_count,
               ROUND(
                 SUM(gl.is_correct) / NULLIF(COUNT(gl.log_id), 0) * 100, 1
               )                           AS accuracy_rate
             FROM questions q
             LEFT JOIN game_logs gl ON gl.question_id = q.question_id
             LEFT JOIN users u ON u.user_id = gl.user_id
             WHERE u.class_id = ?
             GROUP BY q.question_id
             ORDER BY accuracy_rate ASC`
      params = [classId]
    } else {
      sql = `SELECT
               q.question_id,
               q.question_text,
               q.question_type,
               q.level,
               q.difficulty,
               COUNT(gl.log_id)            AS total_attempts,
               SUM(gl.is_correct)          AS correct_count,
               ROUND(
                 SUM(gl.is_correct) / NULLIF(COUNT(gl.log_id), 0) * 100, 1
               )                           AS accuracy_rate
             FROM questions q
             LEFT JOIN game_logs gl ON gl.question_id = q.question_id
             GROUP BY q.question_id
             ORDER BY accuracy_rate ASC`
      params = []
    }

    const [stats] = await db.query(sql, params)

    res.json({ stats })

  } catch (e) {
    console.error('[questions/stats]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  POST /api/questions/log-activity
//  記錄學習區操作次數，用來發放「單字複習狂／練習不手軟／聽力小耳朵」獎章
//
//  Body: { activity_type: 'word_review' | 'word_practice' | 'listening' }
// ══════════════════════════════════════════════════════════
router.post('/log-activity', auth, async (req, res) => {
  try {
    const { activity_type } = req.body
    const allowed = ['word_review', 'word_practice', 'listening']
    if (!allowed.includes(activity_type))
      return res.status(400).json({ error: 'activity_type 必須是 ' + allowed.join('/') })

    await db.query(
      'INSERT INTO activity_logs (user_id, activity_type) VALUES (?, ?)',
      [req.user.user_id, activity_type]
    )
    res.json({ ok: true })
  } catch (e) {
    console.error('[questions/log-activity]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// 把路由器匯出，讓 server.js 可以使用
module.exports = router
