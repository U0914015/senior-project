/**
 * ═══════════════════════════════════════════════════════
 * routes/game.js
 * 個人挑戰核心 API
 *
 * 2026-08-05 改版：拿掉「發起PK挑戰另一組、等對方答完才結算」的機制。
 * 依照學姊確認過的簡報內容，實驗組是「有社群評分功能、小組爬分，但不
 * 跟別組PK」，對照組是「更單純的個人挑戰，沒有隊友、沒有小組排行」。
 * 兩組現在都是任何人隨時可以發起自己的挑戰，答完直接結算，不用等任何
 * 人。原本「組長發起PK、組員等待加入、隊友呼救/搶救」這整套多人同步
 * 機制因此整個拿掉了（`/session/active`、`/session/:id/help-request*`
 * 這幾支API、前端的 `WaitingForPK.vue`、PKBattleView 的呼救UI都刪了）。
 *
 * 端點總覽：
 *  GET  /api/game/my-group              → 我的小組資訊
 *  GET  /api/game/groups                → 同班所有小組列表
 *  GET  /api/game/progress              → 今日學習進度
 *  POST /api/game/session/start         → 發起個人挑戰
 *  POST /api/game/session/submit        → 提交一題答案（答完最後一題自動結算）
 *  GET  /api/game/session/:id/resume    → 用 session_id 取得完整場次狀態（重進/斷線重連用）
 *  GET  /api/game/session/:id/status    → 場次狀態查詢
 *  GET  /api/game/session/:id/result    → 取得場次最終結果
 *  GET  /api/game/session/:id/group-contribution → 小組貢獻度（學姊系統新增）
 *  GET  /api/game/group-scores          → 小組即時總分，大字報/小組排行用（學姊系統新增）
 *  GET  /api/game/leaderboard           → 英雄榜資料
 * ═══════════════════════════════════════════════════════
 */

// 引入 Express 框架
const express = require('express')
// 建立路由器
const router  = express.Router()
// 引入資料庫連線池
const db      = require('../db')
// 引入 JWT 驗證中介層
const auth    = require('../middleware/auth')

// 每場挑戰幾題
const QUESTIONS_PER_SESSION = 10

// ══════════════════════════════════════════════════════
//  1. GET /api/game/my-group
//     回傳登入者的小組資訊 + 組員列表 + 歷史勝率
// ══════════════════════════════════════════════════════
router.get('/my-group', auth, async (req, res) => {
  try {
    const { user_id, class_id } = req.user

    // 取自己的 group_id、是否為組長、個人實驗組覆寫設定
    const [[me]] = await db.query(
      'SELECT group_id, is_leader, experiment_group FROM users WHERE user_id = ?',
      [user_id]
    )
    if (!me?.group_id)
      return res.status(404).json({ error: '尚未被分配到小組' })

    // 取小組基本資訊（JOIN classes 取班級名稱和實驗/對照組）
    const [[group]] = await db.query(
      `SELECT g.group_id, g.group_name,
              c.class_name, c.experiment_group
       FROM \`groups\` g
       JOIN classes c ON c.class_id = g.class_id
       WHERE g.group_id = ?`,
      [me.group_id]
    )
    // 個人若有被教師覆寫過實驗組身份，優先用個人設定
    if (group) group.experiment_group = me.experiment_group ?? group.experiment_group

    // 取組員列表，組長排第一
    const [members] = await db.query(
      `SELECT user_id, nickname, system_score, social_score, is_leader
       FROM users
       WHERE group_id = ? AND role = 'student'
       ORDER BY is_leader DESC, system_score DESC`,
      [me.group_id]
    )

    // 這個小組所有人一共完成過幾場個人挑戰（不再有勝負，2026-08-05 拿掉
    // PK對戰機制之後 win_rate 已經沒有意義，改成看「小組累積挑戰場次」）
    const [[roundStats]] = await db.query(
      `SELECT COUNT(*) AS total FROM game_sessions
       WHERE group_a_id = ? AND status = 'completed'`,
      [me.group_id]
    )

    // 給每位成員一個固定顏色（用 index 決定顏色）
    const COLORS = ['#FF8C00','#FF6B35','#FF6B35','#F59E0B',
                    '#4CAF50','#FF8C00','#EF4444','#FFB300']
    const membersWithColor = members.map((m, i) => ({
      ...m, color: COLORS[i % COLORS.length]
    }))

    res.json({
      group_id:         group.group_id,
      group_name:       group.group_name,
      class_name:       group.class_name,
      experiment_group: group.experiment_group,
      is_leader:        me.is_leader === 1,
      total_games:      roundStats.total,
      members:          membersWithColor,
    })

  } catch (e) {
    console.error('[my-group]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════
//  2. GET /api/game/groups
//     回傳同班所有小組（排除自己的組），含狀態
// ══════════════════════════════════════════════════════
router.get('/groups', auth, async (req, res) => {
  try {
    const { user_id, class_id } = req.user

    // 找自己的 group_id（用來排除自己的組）
    const [[me]] = await db.query(
      'SELECT group_id FROM users WHERE user_id = ?', [user_id]
    )

    // 取同班所有小組，排除自己的組
    const [groups] = await db.query(
      `SELECT g.group_id, g.group_name
       FROM \`groups\` g
       WHERE g.class_id = ? AND g.group_id != ?`,
      [class_id, me?.group_id ?? 0]
    )

    // 為每組查詢詳細資料（成員、勝率、對戰狀態）
    const result = await Promise.all(groups.map(async (g) => {

      // 取組員列表
      const [members] = await db.query(
        `SELECT user_id, nickname, system_score
         FROM users WHERE group_id = ? AND role = 'student'`,
        [g.group_id]
      )

      // 計算平均分
      const avgScore = members.length
        ? Math.round(members.reduce((s, m) => s + m.system_score, 0) / members.length) : 0

      // 計算勝率
      const [[ws]] = await db.query(
        `SELECT COUNT(*) AS total, SUM(winner_group_id = ?) AS wins
         FROM game_sessions
         WHERE (group_a_id = ? OR group_b_id = ?) AND status = 'completed'`,
        [g.group_id, g.group_id, g.group_id]
      )
      const winRate = ws.total > 0 ? Math.round((ws.wins / ws.total) * 100) : 0

      // 查詢這組現在有沒有在對戰中
      const [[active]] = await db.query(
        `SELECT session_id FROM game_sessions
         WHERE (group_a_id = ? OR group_b_id = ?) AND status = 'in_progress' LIMIT 1`,
        [g.group_id, g.group_id]
      )

      const COLORS = ['#FFB300','#E64A19','#F97316','#FF6B35',
                      '#FF8C00','#FF7A00','#EF4444','#F59E0B']
      const membersWithColor = members.map((m, i) => ({
        ...m, color: COLORS[i % COLORS.length]
      }))

      return {
        group_id:   g.group_id,
        group_name: g.group_name,
        members:    membersWithColor,
        avg_score:  avgScore,
        win_rate:   winRate,
        status:     active ? 'in_progress' : 'idle',
      }
    }))

    res.json(result)

  } catch (e) {
    console.error('[groups]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════
//  3. GET /api/game/progress
//     回傳登入者今日三個關卡的學習進度
// ══════════════════════════════════════════════════════
router.get('/progress', auth, async (req, res) => {
  try {
    const { user_id, class_id } = req.user

    // 查詢今天的答題紀錄，依關卡類型分組計算正確率
    const [logs] = await db.query(
      `SELECT q.level,
              COUNT(*) AS total,
              SUM(gl.is_correct) AS correct
       FROM game_logs gl
       JOIN questions q ON q.question_id = gl.question_id
       JOIN game_sessions gs ON gs.session_id = gl.session_id
       WHERE gl.user_id = ? AND DATE(gl.answered_at) = CURDATE()
       GROUP BY q.level`,
      [user_id]
    )

    // 把查詢結果轉成 { vocabulary: 80, sentence: 0, reading: 0 } 這樣的格式
    const progressMap = { vocabulary: 0, sentence: 0, reading: 0 }
    logs.forEach(row => {
      progressMap[row.level] = row.total > 0
        ? Math.round((row.correct / row.total) * 100) : 0
    })

    // 解鎖規則：前一關達 60% 才解鎖下一關
    const stages = [
      { type: 'vocabulary', progress: progressMap.vocabulary, locked: false },
      { type: 'sentence',   progress: progressMap.sentence,   locked: progressMap.vocabulary < 60 },
      { type: 'reading',    progress: progressMap.reading,    locked: progressMap.sentence < 60 },
    ]

    res.json({ todayUnit: 'Unit 3 — My Family', stages })

  } catch (e) {
    console.error('[progress]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════
//  4. POST /api/game/session/start
//     發起個人挑戰，建立 game_session，抽題
//
//  2026-08-05 改版：拿掉「發起PK挑戰另一組」的機制（學姊確認簡報內容後，
//  兩組都改成不用等對手——實驗組是有社群評分/小組爬分但不跟別組PK，
//  對照組更單純，個人挑戰、沒有隊友、沒有小組排行）。任何學生都能隨時
//  發起自己的挑戰，不用是組長、不用等任何人。
//
//  game_sessions.group_a_id / group_b_id 兩欄都是 NOT NULL（原本設計是
//  兩組對戰），為了不用改資料庫結構，這裡讓 group_b_id 直接等於
//  group_a_id（自己對自己），純粹是滿足外鍵約束的技術性欄位，程式邏輯上
//  完全不會把 group_b 當「對手」使用。對照組沒有 group_id 的話會直接
//  被擋掉（沒有小組概念的個人帳號，理論上還是要有教師指定一個小組，
//  只是不會顯示在任何小組相關的畫面上）。
//
//  Body: {
//    level: 'vocabulary'|'sentence'|'reading',
//    theme_id: number  （選填，指定單元）
//  }
// ══════════════════════════════════════════════════════
router.post('/session/start', auth, async (req, res) => {
  try {
    const { user_id, class_id } = req.user
    const { level, theme_id } = req.body

    if (!level)
      return res.status(400).json({ error: 'level 為必填' })

    const [[me]] = await db.query(
      'SELECT group_id FROM users WHERE user_id = ?', [user_id]
    )
    if (!me?.group_id)
      return res.status(404).json({ error: '尚未被分配到小組，請聯絡老師' })

    const group_a_id = me.group_id

    // 抽題：如果有指定單元就只抽那個單元的題，否則從所有單元隨機抽
    // 要在建立 session 之前先抽題——theme 17/18（補充繪本兩單元）目前只有 vocabulary/
    // sentence 的題目、沒有 reading（課文挑戰）的題庫，如果抽到 0 題還是照樣建一筆
    // game_sessions、回傳空題目陣列，前端會進到一個「1/0」的破損畫面，答不了任何題目
    // 卻直接判定 0 分「挑戰結束」——這是真的發生過的 bug，不是假設情境
    let questionSql
    let questionParams

    if (theme_id) {
      // 指定單元抽題
      questionSql = `SELECT question_id, question_text, question_type,
                            options, correct_answer, explanation, difficulty,
                            image_url, audio_text
                     FROM questions
                     WHERE level = ? AND theme_id = ? AND is_active = 1
                     ORDER BY RAND() LIMIT ?`
      questionParams = [level, theme_id, QUESTIONS_PER_SESSION]
    } else {
      // 從所有「這次實驗會用到」的單元隨機抽題（theme_id IN (11,12,17,18)，理由同
      // questions.js /themes 的註解——theme 1-10 是舊教材，不該出現在學生畫面上）
      questionSql = `SELECT question_id, question_text, question_type,
                            options, correct_answer, explanation, difficulty,
                            image_url, audio_text
                     FROM questions
                     WHERE level = ? AND is_active = 1 AND theme_id IN (11,12,17,18)
                     ORDER BY RAND() LIMIT ?`
      questionParams = [level, QUESTIONS_PER_SESSION]
    }

    const [questions] = await db.query(questionSql, questionParams)

    if (questions.length === 0) {
      return res.status(404).json({
        error: '這個單元目前沒有這個關卡的題目，請換一個單元或關卡試試看。',
      })
    }

    // 在資料庫建立一筆新的挑戰紀錄（group_b_id 見上方註解，純技術性欄位）
    // 一定要等確認有題目之後才建立，不然抽不到題也會留下一筆空場次
    const [sessionResult] = await db.query(
      `INSERT INTO game_sessions
         (class_id, group_a_id, group_b_id, level, status, started_at)
       VALUES (?, ?, ?, ?, 'in_progress', NOW())`,
      [class_id, group_a_id, group_a_id, level]
    )
    const session_id = sessionResult.insertId

    // 處理題目資料：解析 options JSON，排序題保留答案，其他題型隱藏答案
    const parsedQuestions = questions.map(q => ({
      question_id:   q.question_id,
      question_text: q.question_text,
      question_type: q.question_type,
      difficulty:    q.difficulty,
      image_url:     q.image_url || null,
      audio_text:    q.audio_text || null,
      // 解析 options：mysql2 可能已自動解析，也可能還是字串
      options: (() => {
        try {
          if (!q.options) return []
          if (Array.isArray(q.options)) return q.options
          return JSON.parse(q.options)
        } catch { return [] }
      })(),
      // 排序題需要答案來產生單字庫，其他題型不給答案（防作弊）
      correct_answer: q.question_type === 'ordering' ? q.correct_answer : undefined,
    }))

    // 把這場挑戰的題目存進 session_questions 表，重新整理/斷線重進時
    // 靠這張表拿到同一組題目
    if (questions.length > 0) {
      await db.query(
        `INSERT INTO session_questions (session_id, question_id, question_order)
         VALUES ${questions.map((_, i) => `(${session_id}, ${questions[i].question_id}, ${i+1})`).join(',')}`
      ).catch(() => {})  // 如果 session_questions 表不存在就忽略
    }

    res.status(201).json({
      session_id,
      level,
      group_id: group_a_id,
      questions: parsedQuestions,
    })

  } catch (e) {
    console.error('[session/start]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════
//  5. POST /api/game/session/submit
//     提交單題答案，寫入 game_logs，計算分數
// ══════════════════════════════════════════════════════
router.post('/session/submit', auth, async (req, res) => {
  try {
    const { user_id } = req.user
    const { session_id, question_id, user_answer, response_time = 0 } = req.body

    if (!session_id || !question_id || user_answer === undefined)
      return res.status(400).json({ error: '缺少必要欄位' })

    // 確認這場 PK 還在進行中
    const [[session]] = await db.query(
      'SELECT * FROM game_sessions WHERE session_id = ? AND status = ?',
      [session_id, 'in_progress']
    )
    if (!session)
      return res.status(404).json({ error: '找不到進行中的場次' })

    // 防止重複寫入：如果這題已經有紀錄了（例如計時器剛好在隊友救援
    // 答案送達的同時把空白答案送出，兩條路徑打架），就不要再插一筆
    const [[already]] = await db.query(
      'SELECT log_id FROM game_logs WHERE session_id = ? AND user_id = ? AND question_id = ?',
      [session_id, user_id, question_id]
    )
    if (already)
      return res.status(409).json({ error: '這題已經有作答紀錄了' })

    // 從資料庫取得這題的正確答案
    const [[question]] = await db.query(
      'SELECT correct_answer, difficulty FROM questions WHERE question_id = ?',
      [question_id]
    )
    if (!question)
      return res.status(404).json({ error: '找不到題目' })

    // 判斷對錯（不分大小寫，去掉前後空白）
    const is_correct = user_answer.trim().toLowerCase() ===
                       question.correct_answer.trim().toLowerCase() ? 1 : 0

    // 計算分數
    // 基礎分：答對 15 分（5題全對最高 75 分）
    // 速度加成：5秒內 +5，10秒內 +3，20秒內 +1（5題全速最高 +25 分）
    // 單場最高：75 + 25 = 100 分
    const base_score = is_correct ? 15 : 0
    let speed_bonus  = 0
    if (is_correct) {
      if (response_time <= 5)       speed_bonus = 5
      else if (response_time <= 10) speed_bonus = 3
      else if (response_time <= 20) speed_bonus = 1
    }

    // 取這是第幾題（用來記錄 round_number）
    const [[roundInfo]] = await db.query(
      `SELECT COUNT(DISTINCT question_id) + 1 AS round_number
       FROM game_logs WHERE session_id = ? AND user_id = ?`,
      [session_id, user_id]
    )
    const round_number = roundInfo?.round_number ?? 1

    // 把答題紀錄寫入 game_logs
    await db.query(
      `INSERT INTO game_logs
         (session_id, user_id, question_id, user_answer, is_correct,
          response_time, base_score, speed_bonus, round_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session_id, user_id, question_id, user_answer, is_correct,
       response_time, base_score, speed_bonus, round_number]
    )

    // 如果有得分，更新使用者的累積系統分
    if (base_score + speed_bonus > 0) {
      await db.query(
        'UPDATE users SET system_score = system_score + ? WHERE user_id = ?',
        [base_score + speed_bonus, user_id]
      )
    }

    // 挑戰是個人的、不用等任何人，答完這場的最後一題就直接結算——不用像
    // 以前的PK對戰那樣等對方小組也答完才能宣布結束
    const [[qCount]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM session_questions WHERE session_id = ?',
      [session_id]
    )
    const totalQuestions = qCount.cnt || QUESTIONS_PER_SESSION
    const [[answeredCount]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM game_logs WHERE session_id = ? AND user_id = ?',
      [session_id, user_id]
    )
    const session_completed = Number(answeredCount.cnt) >= totalQuestions
    if (session_completed) {
      await db.query(
        "UPDATE game_sessions SET status = 'completed', ended_at = NOW() WHERE session_id = ?",
        [session_id]
      )
    }

    // 回傳結果給前端（包含正確答案，讓前端顯示對錯動畫）
    res.json({
      is_correct:        is_correct === 1,
      correct_answer:    question.correct_answer,
      base_score,
      speed_bonus,
      round_score:        base_score + speed_bonus,
      session_completed,
    })

  } catch (e) {
    console.error('[session/submit]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════
//  GET /api/game/session/:id/resume
//  PK對戰頁用：不管是剛進場次還是中途重新整理/斷線重進，都靠這支
//  API 用 session_id 拿到完整狀態，不依賴 router state（history.state
//  在重新整理後就沒了，之前 WordPracticeView 就吃過這個虧）
// ══════════════════════════════════════════════════════
router.get('/session/:id/resume', auth, async (req, res) => {
  try {
    const session_id = Number(req.params.id)
    const { user_id } = req.user

    const [[session]] = await db.query(
      `SELECT gs.*, ga.group_name FROM game_sessions gs
       JOIN \`groups\` ga ON ga.group_id = gs.group_a_id
       WHERE gs.session_id = ?`,
      [session_id]
    )
    if (!session) return res.status(404).json({ error: '找不到場次' })

    // 確認這個人真的是這場的參賽者，不能查別人的場次
    const [[me]] = await db.query('SELECT group_id FROM users WHERE user_id = ?', [user_id])
    if (me.group_id !== session.group_a_id)
      return res.status(403).json({ error: '你不是這場的參賽者' })

    // 題目清單，PK 題不能先看到 correct_answer，ordering 例外
    // （排序題本來就是把答案拆散給你排，不算作弊）
    const [questions] = await db.query(
      `SELECT q.question_id, q.question_text, q.question_type,
              q.options, q.difficulty, q.image_url, q.audio_text,
              IF(q.question_type = 'ordering', q.correct_answer, NULL) AS correct_answer
       FROM session_questions sq
       JOIN questions q ON q.question_id = sq.question_id
       WHERE sq.session_id = ?
       ORDER BY sq.question_order`,
      [session_id]
    )
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: (() => {
        try {
          if (!q.options) return []
          if (Array.isArray(q.options)) return q.options
          return JSON.parse(q.options)
        } catch { return [] }
      })()
    }))

    // 這個人已經答過哪些題、答對幾題、目前累積分數——回來要接得上進度
    const [answeredLogs] = await db.query(
      `SELECT question_id, is_correct, base_score, speed_bonus
       FROM game_logs WHERE session_id = ? AND user_id = ?`,
      [session_id, user_id]
    )
    const answeredIds  = answeredLogs.map(a => a.question_id)
    const correctSoFar = answeredLogs.filter(a => a.is_correct).length
    const scoreSoFar    = answeredLogs.reduce(
      (sum, a) => sum + a.base_score + a.speed_bonus, 0
    )

    res.json({
      session_id,
      session_status:  session.status,          // in_progress / completed
      group_id:        session.group_a_id,
      group_name:      session.group_name,
      questions:       parsedQuestions,
      answered_question_ids: answeredIds,
      correct_so_far:  correctSoFar,
      score_so_far:    scoreSoFar,
    })

  } catch (e) {
    console.error('[session/resume]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════
//  7. GET /api/game/session/:id/result
//     取得場次最終結果——個人挑戰，沒有對手/隊友比較
// ══════════════════════════════════════════════════════
router.get('/session/:id/result', auth, async (req, res) => {
  try {
    const session_id = Number(req.params.id)

    const [[session]] = await db.query(
      'SELECT * FROM game_sessions WHERE session_id = ?', [session_id]
    )
    if (!session) return res.status(404).json({ error: '找不到場次' })

    const [[myScore]] = await db.query(
      `SELECT u.user_id, u.nickname, u.group_id,
              COUNT(gl.log_id) AS total_questions,
              SUM(gl.is_correct) AS correct_count,
              ROUND(AVG(gl.response_time), 1) AS avg_response_time,
              SUM(gl.base_score + gl.speed_bonus) AS session_score
       FROM game_logs gl JOIN users u ON u.user_id = gl.user_id
       WHERE gl.session_id = ? AND u.user_id = ?
       GROUP BY u.user_id`,
      [session_id, req.user.user_id]
    )

    const accuracy = myScore?.total_questions > 0
      ? Math.round((myScore.correct_count / myScore.total_questions) * 100) : 0

    res.json({
      session_id,
      level:    session.level,
      my_score: myScore ? { ...myScore, accuracy } : null,
    })

  } catch (e) {
    console.error('[session/result]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════
//  8. GET /api/game/session/:id/group-contribution
//     小組貢獻度：拿到這場所屬小組「累積至今」每個人貢獻了多少分、
//     佔比多少
//
//     2026-08-05 改版：以前這裡算的是「單一這場PK」裡每個人的貢獻，
//     PK拿掉之後每場都只有自己一個人在打，算出來永遠是「自己 100%」，
//     沒有意義了。改成算「這個小組從有紀錄以來，每個人一共貢獻了多少
//     系統分」，才能反映真正的小組協作情況。
// ══════════════════════════════════════════════════════
router.get('/session/:id/group-contribution', auth, async (req, res) => {
  try {
    const sessionId = Number(req.params.id)
    const [[session]] = await db.query(
      'SELECT group_a_id FROM game_sessions WHERE session_id = ?', [sessionId]
    )
    if (!session) return res.status(404).json({ error: '找不到場次' })

    const [members] = await db.query(
      `SELECT u.nickname,
              COALESCE(SUM(gl.base_score + gl.speed_bonus), 0) AS score
       FROM users u
       LEFT JOIN game_logs gl ON gl.user_id = u.user_id
       WHERE u.group_id = ? AND u.role = 'student'
       GROUP BY u.user_id, u.nickname
       ORDER BY score DESC`,
      [session.group_a_id]
    )

    // mysql2 對 SUM() 算出來的欄位預設回傳字串，不轉成 Number 直接加總
    // 會變成字串接龍（"15"+"20" 變 "1520" 不是 35），這裡先轉型再加總
    const membersNum = members.map(m => ({ ...m, score: Number(m.score) || 0 }))
    const total = membersNum.reduce((sum, m) => sum + m.score, 0)
    const result = membersNum.map(m => ({
      ...m,
      percentage: total > 0 ? Math.round(m.score / total * 100) : 0
    }))

    res.json({ total_score: total, members: result })
  } catch (e) {
    console.error('[group-contribution]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════
//  8.6 GET /api/game/group-scores
//     大字報／小組排行／小組能量條共用：查詢 group_realtime_scores view，
//     回傳全班小組即時總分
//
//     2026-09-25 更新：跟學姊確認過「請假的算法」——這支 API 原本排的是
//     `total_score`（全組系統分直接加總，不管有沒有人請假），改成排
//     `energy_score`（當天請假的組員不計分也不計人數，用在場組員的平均分
//     當作團隊能量值，公式跟學姊給的算例一致：(90+80+70)÷3=80，不是
//     90+80+70=240）。`total_score`／`member_count` 還是一起回傳，
//     維持「全組累積總分／全組人數」原意，之後如果哪裡需要看不排除請假的
//     原始總分還能用
// ══════════════════════════════════════════════════════
router.get('/group-scores', auth, async (req, res) => {
  try {
    // 老師帳號的 req.user.class_id 不代表任何意義（老師不屬於某個班級，
    // 是透過 classes.teacher_id 管理班級）——要用 query 帶的 class_id，
    // 沒帶的話退回這個老師名下第一個班級，跟 /teacher/dashboard 同一套邏輯
    let class_id = req.query.class_id ? Number(req.query.class_id) : null
    if (!class_id) {
      const [[first]] = await db.query(
        'SELECT class_id FROM classes WHERE teacher_id = ? ORDER BY created_at LIMIT 1',
        [req.user.user_id]
      )
      class_id = first?.class_id ?? null
    }

    const [rows] = await db.query(
      `SELECT group_id, group_name, total_score, member_count, energy_score, present_count
       FROM group_realtime_scores
       WHERE class_id = ?
       ORDER BY energy_score DESC`,
      [class_id]
    )
    res.json({ groups: rows })
  } catch (e) {
    console.error('[group-scores]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════
//  9. GET /api/game/leaderboard
//     英雄榜資料
//
//  ⚠️ 2026-09-16：對照組「完全看不到排行榜」原本只在前端擋（LeaderboardView.vue
//  用 isExperimental 判斷要不要顯示鎖住畫面），後端這支 API 本身沒有擋，
//  對照組帳號直接呼叫這支還是能拿到全班個人名次——這跟研究設計「對照組全程
//  不設個人排行榜」的初衷不符，系統整合測試時發現，這裡補上後端閘控。
// ══════════════════════════════════════════════════════
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const { class_id, user_id } = req.user

    const [[me]] = await db.query(
      `SELECT COALESCE(u.experiment_group, c.experiment_group) AS experiment_group
       FROM users u JOIN classes c ON c.class_id = u.class_id
       WHERE u.user_id = ?`,
      [user_id]
    )
    if (me?.experiment_group !== 'experimental')
      return res.json({ class_name: '', entries: [], locked: true })

    const [rows] = await db.query(
      `SELECT u.user_id, u.nickname, u.group_id, u.is_leader,
              u.system_score, u.social_score,
              g.group_name, c.class_name
       FROM users u
       LEFT JOIN \`groups\` g ON g.group_id = u.group_id
       LEFT JOIN classes c ON c.class_id = u.class_id
       WHERE u.class_id = ? AND u.role = 'student'
       ORDER BY u.system_score DESC`,
      [class_id]
    )

    // 每人的獎章
    const withBadges = await Promise.all(rows.map(async r => {
      const [badges] = await db.query(
        `SELECT b.badge_id, b.badge_name, b.icon_emoji
         FROM user_badges ub JOIN badges b ON b.badge_id = ub.badge_id
         WHERE ub.user_id = ?`, [r.user_id]
      )
      return { ...r, badges }
    }))

    res.json({ class_name: rows[0]?.class_name ?? '', entries: withBadges })

  } catch (e) {
    console.error('[leaderboard]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// 把路由器匯出給 server.js 使用
module.exports = router
