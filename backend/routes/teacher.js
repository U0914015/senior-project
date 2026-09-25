/**
 * routes/teacher.js
 * 教師後台 API
 *
 * GET /api/teacher/dashboard   → 班級完整儀表板資料
 * GET /api/teacher/classes     → 教師管理的班級清單
 */

const express = require('express')
const router  = express.Router()
const db      = require('../db')
const auth    = require('../middleware/auth')

// ── 教師權限 Middleware ──────────────────────────────────
function teacherOnly(req, res, next) {
  if (req.user.role !== 'teacher')
    return res.status(403).json({ error: '僅限教師使用' })
  next()
}

// ── 確認這個 class_id 是不是這位教師管理的班級 ───────────
async function verifyClassOwnership(classId, teacherId) {
  const [[cls]] = await db.query(
    'SELECT class_id FROM classes WHERE class_id = ? AND teacher_id = ?',
    [classId, teacherId]
  )
  return !!cls
}

// ══════════════════════════════════════════════════════════
//  GET /api/teacher/classes
//  取得這位教師管理的所有班級
// ══════════════════════════════════════════════════════════
router.get('/classes', auth, teacherOnly, async (req, res) => {
  try {
    const [classes] = await db.query(
      `SELECT class_id, class_name, class_code,
              experiment_group, study_start_date, max_group_size, created_at
       FROM classes
       WHERE teacher_id = ?
       ORDER BY created_at DESC`,
      [req.user.user_id]
    )
    res.json({ classes })
  } catch (e) {
    console.error('[teacher/classes]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  GET /api/teacher/dashboard?class_id=1
//  教師後台完整儀表板資料
//
//  回傳：
//   - classes      班級清單（下拉選單用）
//   - students     全班學生完整數據
//   - summary      班級統計摘要
//   - trend        近7場分數趨勢
//   - level_stats  各關卡正確率
//   - social_stats 社群互動次數
// ══════════════════════════════════════════════════════════
router.get('/dashboard', auth, teacherOnly, async (req, res) => {
  try {
    const teacherId = req.user.user_id

    // 預設用第一個班級
    let classId = req.query.class_id ? Number(req.query.class_id) : null

    // ── 教師管理的班級清單 ───────────────────────────────
    const [classes] = await db.query(
      `SELECT class_id, class_name, class_code, experiment_group, study_start_date
       FROM classes WHERE teacher_id = ? ORDER BY created_at`,
      [teacherId]
    )

    if (!classId && classes.length > 0)
      classId = classes[0].class_id

    if (!classId)
      return res.json({ classes: [], students: [], summary: {}, trend: [], level_stats: [], social_stats: [] })

    // ── 全班學生 + 各項數據 ──────────────────────────────
    // 2026-09-16 拿掉整個社群互評功能後，social_score/support_sent/
    // support_received 這些欄位永遠是 0，已經從這裡拿掉，不再查詢
    const [students] = await db.query(
      `SELECT
         u.user_id, u.nickname, u.student_id,
         u.group_id, u.is_leader,
         u.system_score,
         g.group_name,
         COALESCE(u.experiment_group, c.experiment_group) AS experiment_group,
         (u.experiment_group IS NOT NULL)  AS is_group_override,
         (u.absent_date = CURDATE())       AS is_absent_today,
         u.withdrawn_at,
         (u.withdrawn_at IS NOT NULL)      AS is_withdrawn,
         u.created_at                      AS joined_at,
         -- 晚加入（例如從別校轉進來）：班級有設定研究開始日，且這個帳號是
         -- 那天之後才建立的，代表沒有經歷過正式前測、沒被隨機分派過。這裡
         -- 只是標記出來給老師/學姊參考，不會限制這個學生使用系統的任何功能
         (c.study_start_date IS NOT NULL AND u.created_at > c.study_start_date)
                                            AS is_late_joiner,
         -- 答題統計
         COALESCE(ag.total_games, 0)       AS total_games,
         COALESCE(ag.correct_count, 0)     AS correct_count,
         COALESCE(ag.total_questions, 0)   AS total_questions,
         COALESCE(
           ROUND(ag.correct_count / NULLIF(ag.total_questions,0) * 100), 0
         )                                 AS accuracy
       FROM users u
       LEFT JOIN \`groups\` g ON g.group_id = u.group_id
       LEFT JOIN classes    c ON c.class_id  = u.class_id
       -- 答題彙整——total_questions/correct_count（拿去算正確率）要排除
       -- 被隊友救援的題目，不然這個學生的正確率會混進隊友的知識，
       -- total_games 維持算全部場次（有玩到這場就算，跟救援與否無關）
       LEFT JOIN (
         SELECT gl.user_id,
                COUNT(DISTINCT gl.session_id)          AS total_games,
                SUM(gl.rescued_by_user_id IS NULL)      AS total_questions,
                SUM(IF(gl.rescued_by_user_id IS NULL, gl.is_correct, 0)) AS correct_count
         FROM game_logs gl
         GROUP BY gl.user_id
       ) ag ON ag.user_id = u.user_id
       WHERE u.class_id = ? AND u.role = 'student'
       ORDER BY u.system_score DESC`,
      [classId]
    )

    // ── 心理韌性雙軌指標：PERR（挫折後重試率）/ STD（自我超越時數） ──
    // 兩個指標完全從既有的 game_logs 算出來，不需要學生多做任何操作、
    // 不用改資料庫結構。round_number 是這個人在這場PK裡第幾次作答
    // （1,2,3...連續遞增，中間不會跳號），拿來當「這場答到第幾題」的
    // 時間軸座標：
    //   - PERR：這個人答錯的那些題目裡，有多少比例「後面那場PK還有
    //     繼續答下去」（而不是錯在那題後就沒再作答，直接放棄那場）
    //   - STD：答錯之後，那場還繼續撐了幾題才停——撐越多題代表越有
    //     韌性把挫折轉成繼續投入
    // 被隊友救援的題目（rescued_by_user_id 不是 NULL）排除，因為
    // is_correct 反映的是救援者的作答結果，不是這個人自己面對挫折時
    // 的反應，跟正確率統計排除救援題是同一個理由
    const [perrStd] = await db.query(
      `SELECT user_id,
              COUNT(*)                                    AS wrong_count,
              ROUND(AVG(round_number < max_round) * 100)  AS perr,
              ROUND(AVG(max_round - round_number), 1)     AS std
       FROM (
         SELECT gl.user_id, gl.round_number, gl.is_correct,
                MAX(gl.round_number) OVER (PARTITION BY gl.user_id, gl.session_id) AS max_round
         FROM game_logs gl
         JOIN users u ON u.user_id = gl.user_id
         WHERE u.class_id = ? AND gl.rescued_by_user_id IS NULL
       ) t
       WHERE is_correct = 0
       GROUP BY user_id`,
      [classId]
    )
    const perrStdMap = new Map(perrStd.map(r => [r.user_id, r]))
    students.forEach(s => {
      const r = perrStdMap.get(s.user_id)
      s.perr = r ? Number(r.perr) : null   // null = 這個人還沒有答錯過任何題目，樣本數不足
      s.std  = r ? Number(r.std)  : null
    })

    // ── 班級統計摘要 ─────────────────────────────────────
    const total = students.length
    const expStudents  = students.filter(s => s.experiment_group === 'experimental')
    const ctrlStudents = students.filter(s => s.experiment_group === 'control')

    function avg(arr, key) {
      const withVal = arr.filter(r => r[key] !== null && r[key] !== undefined)
      return withVal.length
        ? Math.round(withVal.reduce((s, r) => s + (Number(r[key]) || 0), 0) / withVal.length)
        : 0
    }

    const summary = {
      total_students:    total,
      avg_system_score:  avg(students, 'system_score'),
      avg_accuracy:      avg(students, 'accuracy'),
      total_pk_sessions: students.reduce((s, r) => s + (Number(r.total_games) || 0), 0),
      // 實驗組 vs 對照組
      exp_count:         expStudents.length,
      ctrl_count:        ctrlStudents.length,
      exp_avg_system:    avg(expStudents,  'system_score'),
      ctrl_avg_system:   avg(ctrlStudents, 'system_score'),
      exp_avg_accuracy:  avg(expStudents,  'accuracy'),
      ctrl_avg_accuracy: avg(ctrlStudents, 'accuracy'),
      exp_avg_games:     avg(expStudents,  'total_games'),
      ctrl_avg_games:    avg(ctrlStudents, 'total_games'),
      exp_avg_perr:      avg(expStudents,  'perr'),
      ctrl_avg_perr:     avg(ctrlStudents, 'perr'),
      exp_avg_std:       avg(expStudents,  'std'),
      ctrl_avg_std:      avg(ctrlStudents, 'std'),
      // 晚加入（轉學生）人數——沒有經歷過前測、沒被隨機分派過，分析時可能要排除
      late_joiner_count: students.filter(s => s.is_late_joiner).length,
      // 中離人數——仍可登入使用系統，但已經不計入小組平均/團體獎章，分析時排除
      withdrawn_count:   students.filter(s => s.is_withdrawn).length,
    }

    // ── 近 7 場分數趨勢 ──────────────────────────────────
    // 2026-09-16 拿掉社群互評後，這裡不再需要 social_logs 的 avg_social 那條線，
    // 原本另外還有一支用 subquery 寫的版本，從沒被實際用到（下面回傳的一直是
    // trendSimple），順便一起清掉
    const [trendSimple] = await db.query(
      `SELECT
         DATE_FORMAT(gs.ended_at, '%m/%d') AS date,
         ROUND(AVG(u_score.session_score), 0) AS avg_system
       FROM game_sessions gs
       LEFT JOIN (
         SELECT gl.session_id,
                SUM(gl.base_score + gl.speed_bonus) AS session_score
         FROM game_logs gl
         JOIN users u ON u.user_id = gl.user_id AND u.class_id = ?
         GROUP BY gl.session_id
       ) u_score ON u_score.session_id = gs.session_id
       WHERE gs.class_id = ? AND gs.status = 'completed'
       GROUP BY DATE_FORMAT(gs.ended_at, '%m/%d'), gs.ended_at
       ORDER BY gs.ended_at DESC
       LIMIT 7`,
      [classId, classId]
    )

    // ── 各關卡正確率 ─────────────────────────────────────
    const [levelStats] = await db.query(
      `SELECT
         q.level,
         COUNT(gl.log_id)                               AS total_attempts,
         COALESCE(SUM(gl.is_correct), 0)                AS correct_count,
         ROUND(
           COALESCE(SUM(gl.is_correct), 0)
           / NULLIF(COUNT(gl.log_id), 0) * 100
         )                                              AS accuracy
       FROM game_logs gl
       JOIN questions q  ON q.question_id  = gl.question_id
       JOIN users     u  ON u.user_id      = gl.user_id
       WHERE u.class_id = ?
       GROUP BY q.level`,
      [classId]
    )

    // ── 參與率計算 ───────────────────────────────────────
    const [participationData] = await db.query(
      `SELECT
         COUNT(DISTINCT u.user_id)  AS active_users
       FROM users u
       JOIN game_logs gl ON gl.user_id = u.user_id
       WHERE u.class_id = ? AND u.role = 'student'`,
      [classId]
    )
    const activeUsers = participationData[0]?.active_users ?? 0
    const participationRate = total > 0
      ? Math.round((activeUsers / total) * 100) : 0

    // ── 回傳 ─────────────────────────────────────────────
    res.json({
      classes,
      students,
      summary,
      trend:        trendSimple.reverse(),   // 由舊到新
      level_stats:  levelStats,
      participation: {
        participation_rate: participationRate,
      },
    })

  } catch (e) {
    console.error('[teacher/dashboard]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  GET /api/teacher/students/:classId
//  取得班級所有學生（分組管理後台用）
// ══════════════════════════════════════════════════════════
router.get('/students/:classId', auth, teacherOnly, async (req, res) => {
  try {
    const classId = Number(req.params.classId)

    const [students] = await db.query(
      `SELECT u.user_id, u.student_id, u.nickname,
              u.group_id, u.is_leader, u.role,
              g.group_name
       FROM users u
       LEFT JOIN \`groups\` g ON g.group_id = u.group_id
       WHERE u.class_id = ? AND u.role = 'student'
       ORDER BY g.group_name, u.is_leader DESC, u.nickname`,
      [classId]
    )

    const [groups] = await db.query(
      'SELECT group_id, group_name FROM `groups` WHERE class_id = ?',
      [classId]
    )

    res.json({ students, groups })
  } catch (e) {
    console.error('[teacher/students]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  GET /api/teacher/students/:userId/logs
//  單一學生的完整答題紀錄
// ══════════════════════════════════════════════════════════
router.get('/students/:userId/logs', auth, teacherOnly, async (req, res) => {
  try {
    const userId = Number(req.params.userId)

    const [[student]] = await db.query(
      `SELECT u.user_id, u.nickname FROM users u
       JOIN classes c ON c.class_id = u.class_id
       WHERE u.user_id = ? AND u.role = 'student' AND c.teacher_id = ?`,
      [userId, req.user.user_id]
    )
    if (!student) return res.status(404).json({ error: '找不到學生，或這不是你管理的班級' })

    const [logs] = await db.query(
      `SELECT gl.log_id, gl.session_id, q.question_text, q.question_type,
              gl.user_answer, gl.is_correct, gl.response_time,
              (gl.base_score + gl.speed_bonus) AS score, gl.answered_at
       FROM game_logs gl
       JOIN questions q ON q.question_id = gl.question_id
       WHERE gl.user_id = ?
       ORDER BY gl.answered_at DESC`,
      [userId]
    )
    res.json({ student, logs })
  } catch (e) {
    console.error('[teacher/students/logs]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  PATCH /api/teacher/students/:userId/assign-group
//  教師後台：指定學生組別 & 組長
// ══════════════════════════════════════════════════════════
router.patch('/students/:userId/assign-group', auth, teacherOnly, async (req, res) => {
  try {
    const userId  = Number(req.params.userId)
    const { group_id, is_leader } = req.body

    await db.query(
      'UPDATE users SET group_id = ?, is_leader = ? WHERE user_id = ?',
      [group_id, is_leader ? 1 : 0, userId]
    )

    res.json({ message: '指定成功' })
  } catch (e) {
    console.error('[teacher/assign-group]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  PATCH /api/teacher/students/:userId/experiment-group
//  設定/取消單一學生的實驗組覆寫身份
//  Body: { experiment_group: 'experimental' | 'control' | null }
//  傳 null 代表取消覆寫，改回沿用班級預設值
// ══════════════════════════════════════════════════════════
router.patch('/students/:userId/experiment-group', auth, teacherOnly, async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const { experiment_group } = req.body

    if (experiment_group !== null &&
        experiment_group !== 'experimental' &&
        experiment_group !== 'control') {
      return res.status(400).json({ error: 'experiment_group 必須是 experimental、control 或 null' })
    }

    // 確認這個學生屬於這位教師管理的班級
    const [[student]] = await db.query(
      `SELECT u.user_id FROM users u
       JOIN classes c ON c.class_id = u.class_id
       WHERE u.user_id = ? AND u.role = 'student' AND c.teacher_id = ?`,
      [userId, req.user.user_id]
    )
    if (!student) return res.status(404).json({ error: '找不到學生，或這不是你管理的班級' })

    await db.query(
      'UPDATE users SET experiment_group = ? WHERE user_id = ?',
      [experiment_group, userId]
    )
    res.json({ message: '設定成功' })
  } catch (e) {
    console.error('[teacher/experiment-group]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  PATCH /api/teacher/classes/:classId/study-start-date
//  設定/取消班級的研究（前測）正式開始日，用來自動標記晚加入的轉學生
//  Body: { study_start_date: 'YYYY-MM-DD' | null }
// ══════════════════════════════════════════════════════════
router.patch('/classes/:classId/study-start-date', auth, teacherOnly, async (req, res) => {
  try {
    const classId = Number(req.params.classId)
    const { study_start_date } = req.body

    if (!(await verifyClassOwnership(classId, req.user.user_id)))
      return res.status(404).json({ error: '找不到班級，或這不是你管理的班級' })

    if (study_start_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(study_start_date))
      return res.status(400).json({ error: 'study_start_date 必須是 YYYY-MM-DD 格式，或 null' })

    await db.query(
      'UPDATE classes SET study_start_date = ? WHERE class_id = ?',
      [study_start_date, classId]
    )
    res.json({ message: '設定成功' })
  } catch (e) {
    console.error('[teacher/study-start-date]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  PATCH /api/teacher/students/:userId/transfer
//  轉學生保留帳號：把學生轉到（同一位教師底下的）另一個班級，沿用同一個
//  user_id，歷史作答/獎章紀錄都不會斷。
//
//  Body: { new_class_id: number, new_group_id?: number | null }
//
//  ⚠️ 目前只支援轉到「同一位教師」管理的班級——如果學生要轉去別的老師
//  帶的班級，這支 API 會擋掉，需要另外設計跨教師的授權方式，這次沒做。
//
//  轉班當下會把學生「轉班前」的有效實驗組別（教師覆寫值，或沒覆寫就用
//  舊班級的預設值）明確寫成新的個人覆寫，避免因為新班級的預設組別不同，
//  在學生沒被特別決定的情況下，實驗條件被悄悄換掉——如果教師本來就是想
//  讓轉班學生改用新班級的組別，轉班後再用 experiment-group 那支 API 手動
//  改掉即可。
// ══════════════════════════════════════════════════════════
router.patch('/students/:userId/transfer', auth, teacherOnly, async (req, res) => {
  try {
    const userId     = Number(req.params.userId)
    const newClassId = Number(req.body.new_class_id)
    const newGroupId = req.body.new_group_id ? Number(req.body.new_group_id) : null

    if (!newClassId)
      return res.status(400).json({ error: 'new_class_id 為必填' })

    // 學生現在的資料 + 有效實驗組別（COALESCE 個人覆寫或班級預設）
    const [[student]] = await db.query(
      `SELECT u.user_id, u.nickname, u.class_id AS old_class_id, u.group_id AS old_group_id,
              COALESCE(u.experiment_group, c.experiment_group) AS effective_experiment_group
       FROM users u
       JOIN classes c ON c.class_id = u.class_id
       WHERE u.user_id = ? AND u.role = 'student'`,
      [userId]
    )
    if (!student) return res.status(404).json({ error: '找不到這個學生' })

    // 只能操作自己管理班級的學生（轉出方跟轉入方都要是同一位教師）
    const ownsOldClass = await verifyClassOwnership(student.old_class_id, req.user.user_id)
    const ownsNewClass = await verifyClassOwnership(newClassId, req.user.user_id)
    if (!ownsOldClass || !ownsNewClass)
      return res.status(403).json({ error: '只能轉到你自己管理的班級' })

    if (newClassId === student.old_class_id)
      return res.status(400).json({ error: '新班級跟原本的班級一樣，不需要轉班' })

    // 如果有指定新小組，確認那個小組真的屬於新班級
    if (newGroupId) {
      const [[grp]] = await db.query(
        'SELECT group_id FROM `groups` WHERE group_id = ? AND class_id = ?',
        [newGroupId, newClassId]
      )
      if (!grp) return res.status(400).json({ error: '指定的小組不屬於新班級' })
    }

    await db.query(
      `UPDATE users
       SET class_id = ?, group_id = ?, is_leader = 0, experiment_group = ?
       WHERE user_id = ?`,
      [newClassId, newGroupId, student.effective_experiment_group, userId]
    )

    await db.query(
      `INSERT INTO student_transfers
         (user_id, old_class_id, new_class_id, old_group_id, new_group_id,
          experiment_group_kept, transferred_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, student.old_class_id, newClassId, student.old_group_id, newGroupId,
       student.effective_experiment_group, req.user.user_id]
    )

    res.json({
      message: `已將 ${student.nickname} 轉到新班級，實驗組別維持「${student.effective_experiment_group === 'experimental' ? '實驗組' : '對照組'}」`,
      experiment_group: student.effective_experiment_group,
    })
  } catch (e) {
    console.error('[teacher/transfer]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  GET /api/teacher/students/:userId/transfers
//  查詢某個學生的轉班歷史（給教師後台/研究資料匯出用）
// ══════════════════════════════════════════════════════════
router.get('/students/:userId/transfers', auth, teacherOnly, async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const [rows] = await db.query(
      `SELECT st.transfer_id, st.old_class_id, oc.class_name AS old_class_name,
              st.new_class_id, nc.class_name AS new_class_name,
              st.old_group_id, st.new_group_id, st.experiment_group_kept, st.transferred_at
       FROM student_transfers st
       JOIN classes oc ON oc.class_id = st.old_class_id
       JOIN classes nc ON nc.class_id = st.new_class_id
       WHERE st.user_id = ?
       ORDER BY st.transferred_at DESC`,
      [userId]
    )
    res.json({ transfers: rows })
  } catch (e) {
    console.error('[teacher/transfers]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  PATCH /api/teacher/students/:userId/withdraw
//  標記/取消學生中離
//  Body: { withdrawn: true | false }
//
//  中離**不是**鎖帳號、不是刪資料——學生仍然可以正常登入系統，只是：
//    1. 標記起來方便學姊之後跑分析時排除
//    2. 小組共同總分/獎章（group_realtime_scores VIEW、badges.js 的小組
//       平均）不再把他算進去，避免他停在原地的分數持續拖累/墊高還在
//       參與的組員的團隊表現
//  中離之前累積的個人分數/獎章/答題紀錄完全不動。
// ══════════════════════════════════════════════════════════
router.patch('/students/:userId/withdraw', auth, teacherOnly, async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const { withdrawn } = req.body

    const [[student]] = await db.query(
      `SELECT u.user_id, u.nickname FROM users u
       JOIN classes c ON c.class_id = u.class_id
       WHERE u.user_id = ? AND u.role = 'student' AND c.teacher_id = ?`,
      [userId, req.user.user_id]
    )
    if (!student) return res.status(404).json({ error: '找不到學生，或這不是你管理的班級' })

    await db.query(
      'UPDATE users SET withdrawn_at = ? WHERE user_id = ?',
      [withdrawn ? new Date() : null, userId]
    )

    res.json({
      message: withdrawn
        ? `已標記 ${student.nickname} 中離，他仍能登入使用系統，但不再計入小組平均/團體獎章`
        : `已取消 ${student.nickname} 的中離標記`
    })
  } catch (e) {
    console.error('[teacher/withdraw]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  PATCH /api/teacher/students/:userId/attendance
//  標記/取消單一學生「今日請假」
//  Body: { absent: true | false }
//
//  只存單一日期欄位（users.absent_date），不做歷史紀錄表——這是為了
//  解決小組有人沒到班、PK場次卡住等不到人的問題，不是要做出席分析。
//  請假的學生在 game.js 的 /session/:id/status 判斷「還要幾人才算
//  全部完成」時會被排除。
// ══════════════════════════════════════════════════════════
router.patch('/students/:userId/attendance', auth, teacherOnly, async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    const { absent } = req.body

    if (typeof absent !== 'boolean')
      return res.status(400).json({ error: 'absent 必須是 true 或 false' })

    // 確認這個學生屬於這位教師管理的班級
    const [[student]] = await db.query(
      `SELECT u.user_id FROM users u
       JOIN classes c ON c.class_id = u.class_id
       WHERE u.user_id = ? AND u.role = 'student' AND c.teacher_id = ?`,
      [userId, req.user.user_id]
    )
    if (!student) return res.status(404).json({ error: '找不到學生，或這不是你管理的班級' })

    await db.query(
      'UPDATE users SET absent_date = IF(?, CURDATE(), NULL) WHERE user_id = ?',
      [absent, userId]
    )
    res.json({ message: '設定成功' })
  } catch (e) {
    console.error('[teacher/attendance]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  個人挑戰場次管理
//
//  2026-08-05 改版：拿掉了「發起PK挑戰另一組」的機制，場次現在是個人
//  的、答完最後一題後端會自動結算（見 game.js session/submit），
//  不會再有「卡在進行中等對手」的情況，force-end 主要留給學生半路
//  棄挑戰、場次一直停在 in_progress 的情況清掉用。
// ══════════════════════════════════════════════════════════

// GET /api/teacher/sessions?class_id=1&status=in_progress — 場次列表
// status 選填：不傳就回全部狀態
router.get('/sessions', auth, teacherOnly, async (req, res) => {
  try {
    const classId = Number(req.query.class_id)
    const status  = req.query.status
    if (!classId) return res.status(400).json({ error: 'class_id 為必填' })
    if (!(await verifyClassOwnership(classId, req.user.user_id)))
      return res.status(403).json({ error: '這不是你管理的班級' })

    const params = [classId]
    let statusClause = ''
    if (status) {
      statusClause = ' AND gs.status = ?'
      params.push(status)
    }

    const [rows] = await db.query(
      `SELECT gs.session_id, gs.level, gs.status,
              ga.group_name, gs.started_at, gs.ended_at, gs.created_at
       FROM game_sessions gs
       JOIN \`groups\` ga ON ga.group_id = gs.group_a_id
       WHERE gs.class_id = ?${statusClause}
       ORDER BY gs.created_at DESC`,
      params
    )
    res.json({ sessions: rows })
  } catch (e) {
    console.error('[teacher/sessions]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// PATCH /api/teacher/sessions/:sessionId/force-end — 強制結束卡住的場次（測試用）
router.patch('/sessions/:sessionId/force-end', auth, teacherOnly, async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId)

    const [[session]] = await db.query(
      `SELECT gs.* FROM game_sessions gs
       JOIN classes c ON c.class_id = gs.class_id
       WHERE gs.session_id = ? AND c.teacher_id = ?`,
      [sessionId, req.user.user_id]
    )
    if (!session) return res.status(404).json({ error: '找不到場次，或這不是你管理的班級' })
    if (session.status === 'completed')
      return res.status(409).json({ error: '這場已經結束了' })

    await db.query(
      `UPDATE game_sessions SET status = 'completed', ended_at = NOW() WHERE session_id = ?`,
      [sessionId]
    )
    res.json({ message: '已強制結束' })
  } catch (e) {
    console.error('[teacher/sessions force-end]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  組別管理：建立 / 刪除 / 改名小組
// ══════════════════════════════════════════════════════════

// POST /api/teacher/groups — 建立新小組
router.post('/groups', auth, teacherOnly, async (req, res) => {
  try {
    const { class_id, group_name } = req.body
    if (!class_id || !group_name?.trim())
      return res.status(400).json({ error: 'class_id 和 group_name 為必填' })

    const [[cls]] = await db.query(
      'SELECT class_id FROM classes WHERE class_id = ? AND teacher_id = ?',
      [class_id, req.user.user_id]
    )
    if (!cls) return res.status(403).json({ error: '這不是你管理的班級' })

    const [result] = await db.query(
      'INSERT INTO `groups` (class_id, group_name) VALUES (?, ?)',
      [class_id, group_name.trim()]
    )
    res.status(201).json({ message: '建立成功', group_id: result.insertId })
  } catch (e) {
    console.error('[teacher/groups create]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// PATCH /api/teacher/groups/:groupId — 修改小組名稱
router.patch('/groups/:groupId', auth, teacherOnly, async (req, res) => {
  try {
    const groupId = Number(req.params.groupId)
    const { group_name } = req.body
    if (!group_name?.trim())
      return res.status(400).json({ error: 'group_name 為必填' })

    const [[group]] = await db.query(
      `SELECT g.group_id FROM \`groups\` g
       JOIN classes c ON c.class_id = g.class_id
       WHERE g.group_id = ? AND c.teacher_id = ?`,
      [groupId, req.user.user_id]
    )
    if (!group) return res.status(404).json({ error: '找不到小組，或這不是你管理的班級' })

    await db.query('UPDATE `groups` SET group_name = ? WHERE group_id = ?', [group_name.trim(), groupId])
    res.json({ message: '修改成功' })
  } catch (e) {
    console.error('[teacher/groups rename]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// DELETE /api/teacher/groups/:groupId — 刪除小組
router.delete('/groups/:groupId', auth, teacherOnly, async (req, res) => {
  try {
    const groupId = Number(req.params.groupId)

    const [[group]] = await db.query(
      `SELECT g.group_id FROM \`groups\` g
       JOIN classes c ON c.class_id = g.class_id
       WHERE g.group_id = ? AND c.teacher_id = ?`,
      [groupId, req.user.user_id]
    )
    if (!group) return res.status(404).json({ error: '找不到小組，或這不是你管理的班級' })

    // 組員的 group_id 由資料庫外鍵設為 SET NULL，這裡順便取消他們的組長身份
    await db.query('UPDATE users SET is_leader = 0 WHERE group_id = ?', [groupId])
    await db.query('DELETE FROM `groups` WHERE group_id = ?', [groupId])

    res.json({ message: '刪除成功' })
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2' || e.code === 'ER_ROW_IS_REFERENCED')
      return res.status(409).json({ error: '這個小組已經有 PK 對戰紀錄，無法刪除' })
    console.error('[teacher/groups delete]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// POST /api/teacher/classes/:classId/auto-group — 一鍵隨機分組
// 把「尚未分組」的學生隨機平均分配到班上「已存在」的小組，
// 依 classes.max_group_size 避免塞爆某一組；小組額滿後略過，
// 不會自動建立新小組（要先用 POST /groups 建好小組）
router.post('/classes/:classId/auto-group', auth, teacherOnly, async (req, res) => {
  try {
    const classId = Number(req.params.classId)
    if (!(await verifyClassOwnership(classId, req.user.user_id)))
      return res.status(403).json({ error: '這不是你管理的班級' })

    const [[cls]] = await db.query(
      'SELECT max_group_size FROM classes WHERE class_id = ?', [classId]
    )
    const maxSize = cls.max_group_size

    const [groups] = await db.query(
      `SELECT g.group_id, COUNT(u.user_id) AS current_size
       FROM \`groups\` g
       LEFT JOIN users u ON u.group_id = g.group_id AND u.role = 'student'
       WHERE g.class_id = ?
       GROUP BY g.group_id`,
      [classId]
    )
    if (!groups.length)
      return res.status(400).json({ error: '這個班級還沒有任何小組，請先建立小組' })

    const [ungrouped] = await db.query(
      `SELECT user_id FROM users WHERE class_id = ? AND role = 'student' AND group_id IS NULL`,
      [classId]
    )
    if (!ungrouped.length)
      return res.json({ message: '目前沒有未分組的學生', assigned: 0, skipped: 0 })

    // Fisher-Yates 洗牌
    for (let i = ungrouped.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ungrouped[i], ungrouped[j]] = [ungrouped[j], ungrouped[i]]
    }

    let assigned = 0
    for (const student of ungrouped) {
      // 每次都挑目前人數最少、且還沒額滿的小組（動態排序，維持組間人數平均）
      const target = groups
        .filter(g => g.current_size < maxSize)
        .sort((a, b) => a.current_size - b.current_size)[0]
      if (!target) break  // 全部小組都滿了

      await db.query('UPDATE users SET group_id = ? WHERE user_id = ?', [target.group_id, student.user_id])
      target.current_size++
      assigned++
    }

    res.json({
      message: `已分配 ${assigned} 位學生`,
      assigned,
      skipped: ungrouped.length - assigned,
    })
  } catch (e) {
    console.error('[teacher/auto-group]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  資料匯出：給論文研究用的原始資料
// ══════════════════════════════════════════════════════════

// GET /api/teacher/export/game-logs?class_id=1 — 完整答題紀錄
router.get('/export/game-logs', auth, teacherOnly, async (req, res) => {
  try {
    const classId = Number(req.query.class_id)
    if (!classId) return res.status(400).json({ error: 'class_id 為必填' })
    if (!(await verifyClassOwnership(classId, req.user.user_id)))
      return res.status(403).json({ error: '這不是你管理的班級' })

    const [rows] = await db.query(
      `SELECT u.nickname          AS student_name,
              gl.session_id,
              q.question_text,
              gl.user_answer,
              gl.is_correct,
              gl.response_time,
              (gl.base_score + gl.speed_bonus) AS score,
              gl.answered_at
       FROM game_logs gl
       JOIN users     u ON u.user_id     = gl.user_id
       JOIN questions q ON q.question_id = gl.question_id
       WHERE u.class_id = ?
       ORDER BY gl.answered_at DESC`,
      [classId]
    )
    res.json({ rows })
  } catch (e) {
    console.error('[teacher/export/game-logs]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// GET /api/teacher/export/social-logs?class_id=1 — 社群互動紀錄
router.get('/export/social-logs', auth, teacherOnly, async (req, res) => {
  try {
    const classId = Number(req.query.class_id)
    if (!classId) return res.status(400).json({ error: 'class_id 為必填' })
    if (!(await verifyClassOwnership(classId, req.user.user_id)))
      return res.status(403).json({ error: '這不是你管理的班級' })

    // comment_text（VARCHAR）跟 sticker_tag（ENUM）型別不同，混在同一個 SQL
    // CASE 欄位裡會讓 MySQL 對合併後欄位的字元集判斷出錯，中文內容會變亂碼
    // （已實測發生過）。分開撈這兩欄，合併邏輯留到這裡用 JS 處理。
    const [rows] = await db.query(
      `SELECT su.nickname AS sender_name,
              ru.nickname AS receiver_name,
              sl.action_type,
              sl.comment_text,
              sl.sticker_tag,
              sl.score_awarded,
              sl.created_at
       FROM social_logs sl
       JOIN users su ON su.user_id = sl.sender_id
       JOIN users ru ON ru.user_id = sl.receiver_id
       WHERE su.class_id = ?
       ORDER BY sl.created_at DESC`,
      [classId]
    )
    const withContent = rows.map(r => ({
      sender_name:   r.sender_name,
      receiver_name: r.receiver_name,
      action_type:   r.action_type,
      content:       r.action_type === 'comment' ? r.comment_text
                    : r.action_type === 'sticker' ? r.sticker_tag
                    : null,
      score_awarded: r.score_awarded,
      created_at:    r.created_at,
    }))
    res.json({ rows: withContent })
  } catch (e) {
    console.error('[teacher/export/social-logs]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// GET /api/teacher/export/badges?class_id=1 — 獎章獲得紀錄
router.get('/export/badges', auth, teacherOnly, async (req, res) => {
  try {
    const classId = Number(req.query.class_id)
    if (!classId) return res.status(400).json({ error: 'class_id 為必填' })
    if (!(await verifyClassOwnership(classId, req.user.user_id)))
      return res.status(403).json({ error: '這不是你管理的班級' })

    const [rows] = await db.query(
      `SELECT u.nickname   AS student_name,
              b.badge_name,
              b.badge_tier,
              b.icon_emoji,
              b.badge_category,
              ub.awarded_at
       FROM user_badges ub
       JOIN users  u ON u.user_id  = ub.user_id
       JOIN badges b ON b.badge_id = ub.badge_id
       WHERE u.class_id = ?
       ORDER BY ub.awarded_at DESC`,
      [classId]
    )
    res.json({ rows })
  } catch (e) {
    console.error('[teacher/export/badges]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

module.exports = router
