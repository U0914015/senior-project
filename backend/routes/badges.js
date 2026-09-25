/**
 * routes/badges.js
 * 獎章觸發檢查 API
 *
 * 端點：
 *  POST /api/badges/check   → PK 結束後檢查並發放新獎章
 *  GET  /api/badges/user/:userId → 取得某人全部獎章
 *
 * 獎章改版（競爭／共同兩大類，競爭類分參與-技巧-鼓勵三分類，銅銀金傳說
 * 四級）：badge_id 對照表見 scripts/redesign-badges.sql
 *
 * 2026-09-16 更新：跟學姊確認過，完全照 2026-08-26 進度報告的設計走——
 * 對照組是「個人獎章、全程不設排行榜」，實驗組是「小組組間積分解鎖共同
 * 獎章、有排行榜」，簡報裡完全沒有提到社群互評/社群分這件事，這是之前
 * 誤植另一份 PDF 的設計。整個社群互評功能（按讚/貼紙/留言、social_score、
 * 團結小隊）已經拿掉，只留下跟社群互動無關的競爭類獎章跟學霸小隊
 * （小組平均系統分）這個共同獎章。social_logs 表跟 /api/social/interact
 * 路由還在（沒刪），但前端已經不會再呼叫，比照 help_requests 的處理方式。
 */

const express = require('express')
const router  = express.Router()
const db      = require('../db')
const auth    = require('../middleware/auth')

// 找一組日期（YYYY-MM-DD 字串陣列，已去重排序）裡最長的連續天數
function longestConsecutiveDays(dateStrings) {
  if (dateStrings.length === 0) return 0
  const days = dateStrings.map(d => new Date(d).getTime() / 86400000)
  let longest = 1
  let current = 1
  for (let i = 1; i < days.length; i++) {
    current = (days[i] - days[i - 1] === 1) ? current + 1 : 1
    longest = Math.max(longest, current)
  }
  return longest
}

// 找一組整數（已去重排序）裡最長的連續數列——「小隊全勤」用來算連續活躍週數，
// 邏輯跟 longestConsecutiveDays 一樣，差別只在單位是「週數」不是「日期」
function longestConsecutiveInts(nums) {
  if (nums.length === 0) return 0
  let longest = 1
  let current = 1
  for (let i = 1; i < nums.length; i++) {
    current = (nums[i] - nums[i - 1] === 1) ? current + 1 : 1
    longest = Math.max(longest, current)
  }
  return longest
}

// ══════════════════════════════════════════════════════════
//  核心：檢查並發放獎章
//  呼叫時機：
//    1. POST /game/session/submit 每題答完後
//    2. POST /badges/check   PK 結果頁主動呼叫
// ══════════════════════════════════════════════════════════
async function checkAndAwardBadges(userId, sessionId = null) {
  const newBadges = []

  // ── 取使用者當前數據 ──────────────────────────────────
  const [[user]] = await db.query(
    `SELECT u.user_id, u.system_score, u.class_id, u.group_id,
            COALESCE(u.experiment_group, c.experiment_group) AS experiment_group
     FROM users u
     JOIN classes c ON c.class_id = u.class_id
     WHERE u.user_id = ?`,
    [userId]
  )
  if (!user) return newBadges

  const isExperimental = user.experiment_group === 'experimental'

  // ── 取本場得分（單場表現用）──────────────────────────
  let sessionScore = 0
  let fastCorrect  = 0   // 5秒內答對題數

  if (sessionId) {
    const [[ss]] = await db.query(
      `SELECT
         COALESCE(SUM(base_score + speed_bonus), 0)    AS session_score,
         SUM(is_correct = 1 AND response_time <= 5)    AS fast_correct
       FROM game_logs
       WHERE session_id = ? AND user_id = ?`,
      [sessionId, userId]
    )
    sessionScore = ss?.session_score ?? 0
    fastCorrect  = ss?.fast_correct  ?? 0
  }

  // ── 累積場次、累積不同日期參與——只跟自己過去比，不跟別人排名 ──
  const [[participation]] = await db.query(
    `SELECT COUNT(DISTINCT session_id) AS total_games,
            COUNT(DISTINCT DATE(answered_at)) AS distinct_days
     FROM game_logs WHERE user_id = ?`,
    [userId]
  )
  const totalGames   = participation?.total_games   ?? 0
  const distinctDays = participation?.distinct_days ?? 0

  // 連續天數（全勤挑戰用）——把每個有作答的日期抓出來算最長連續
  const [dayRows] = await db.query(
    `SELECT DISTINCT DATE(answered_at) AS d FROM game_logs
     WHERE user_id = ? ORDER BY d ASC`,
    [userId]
  )
  const consecutiveDays = longestConsecutiveDays(dayRows.map(r => r.d))

  // 歷史累積答對/答錯題數（正確率之王／越挫越勇）
  const [[correctWrong]] = await db.query(
    `SELECT SUM(is_correct = 1) AS total_correct, SUM(is_correct = 0) AS total_wrong
     FROM game_logs WHERE user_id = ?`,
    [userId]
  )
  const totalCorrect = correctWrong?.total_correct ?? 0
  const totalWrong   = correctWrong?.total_wrong   ?? 0

  // 累積挑戰過的不同主題數（主題探索家）
  const [[themeSpread]] = await db.query(
    `SELECT COUNT(DISTINCT q.theme_id) AS cnt
     FROM game_logs gl JOIN questions q ON q.question_id = gl.question_id
     WHERE gl.user_id = ?`,
    [userId]
  )
  const distinctThemes = themeSpread?.cnt ?? 0

  // 單一主題正確率90%以上的場次數（主題精通者）
  const [themeAccRows] = await db.query(
    `SELECT gl.session_id, q.theme_id,
            SUM(gl.is_correct) / COUNT(*) * 100 AS accuracy
     FROM game_logs gl JOIN questions q ON q.question_id = gl.question_id
     WHERE gl.user_id = ?
     GROUP BY gl.session_id, q.theme_id
     HAVING accuracy >= 90`,
    [userId]
  )
  const themeMasterySessions = themeAccRows.length

  // ── 單場飛躍／穩紮穩打／逆轉勝／單場高手(傳說)：都要看「這個人過去
  // 每一場的正確率／單場總分」，用同一份資料算完
  let progressPoints    = 0      // 本場正確率 vs 上一場，用來判「單場飛躍」門檻
  let currentStreak     = 0      // 穩紮穩打：以本場結尾往回算，連續場次都≥50%
  let cumulativeComeback = 0     // 逆轉勝：歷史上「單場進步≥20個百分點」發生過幾次
  let lastTwoPerfect    = false  // 單場高手傳說級：最近兩場單場總分都≥100

  const [sessionAccuracies] = await db.query(
    `SELECT gl.session_id,
            SUM(gl.is_correct) / COUNT(*) * 100 AS accuracy,
            SUM(gl.base_score + gl.speed_bonus)  AS total_score
     FROM game_logs gl
     JOIN game_sessions gs ON gs.session_id = gl.session_id
     WHERE gl.user_id = ?
     GROUP BY gl.session_id
     ORDER BY gs.started_at ASC`,
    [userId]
  )
  if (sessionAccuracies.length > 0) {
    // 逆轉勝：掃過所有場次，數有幾次「這場比上一場進步≥20個百分點」
    for (let i = 1; i < sessionAccuracies.length; i++) {
      if (sessionAccuracies[i].accuracy - sessionAccuracies[i - 1].accuracy >= 20) {
        cumulativeComeback++
      }
    }
    // 穩紮穩打：以「本場（sessionId）」結尾往回算連續≥50%的場數
    if (sessionId) {
      const idx = sessionAccuracies.findIndex(s => s.session_id === sessionId)
      if (idx >= 0) {
        progressPoints = idx > 0
          ? sessionAccuracies[idx].accuracy - sessionAccuracies[idx - 1].accuracy
          : 0
        let streak = 0
        for (let i = idx; i >= 0; i--) {
          if (sessionAccuracies[i].accuracy >= 50) streak++
          else break
        }
        currentStreak = streak
      }
    }
    // 單場高手傳說級：最後兩場單場總分是否都≥100
    const last2 = sessionAccuracies.slice(-2)
    lastTwoPerfect = last2.length === 2 && last2.every(s => s.total_score >= 100)
  }

  // ── 使用次數追蹤（單字複習狂／練習不手軟／聽力小耳朵）─────
  const [activityRows] = await db.query(
    `SELECT activity_type, COUNT(*) AS cnt
     FROM activity_logs WHERE user_id = ?
     GROUP BY activity_type`,
    [userId]
  ).catch(() => [[]])
  const activityCounts = { word_review: 0, word_practice: 0, listening: 0 }
  for (const row of activityRows) activityCounts[row.activity_type] = row.cnt

  // ── 已擁有的獎章 ──────────────────────────────────────
  const [owned] = await db.query(
    'SELECT badge_id FROM user_badges WHERE user_id = ?', [userId]
  )
  const ownedIds = new Set(owned.map(r => r.badge_id))

  // ── 觸發條件表（badge_id 對照 scripts/redesign-badges.sql）───
  const checks = [
    // ══ 競爭獎章／參與類 id 1-28 ══
    { id: 1,  pass: user.system_score >= 100  },
    { id: 2,  pass: user.system_score >= 500  },
    { id: 3,  pass: user.system_score >= 1000 },
    { id: 4,  pass: user.system_score >= 3000 },
    { id: 5,  pass: totalGames >= 10  },
    { id: 6,  pass: totalGames >= 25  },
    { id: 7,  pass: totalGames >= 50  },
    { id: 8,  pass: totalGames >= 100 },
    { id: 9,  pass: distinctDays >= 5  },
    { id: 10, pass: distinctDays >= 10 },
    { id: 11, pass: distinctDays >= 20 },
    { id: 12, pass: distinctDays >= 40 },
    { id: 13, pass: activityCounts.word_review >= 10  },
    { id: 14, pass: activityCounts.word_review >= 30  },
    { id: 15, pass: activityCounts.word_review >= 60  },
    { id: 16, pass: activityCounts.word_review >= 100 },
    { id: 17, pass: activityCounts.word_practice >= 10  },
    { id: 18, pass: activityCounts.word_practice >= 30  },
    { id: 19, pass: activityCounts.word_practice >= 60  },
    { id: 20, pass: activityCounts.word_practice >= 100 },
    { id: 21, pass: activityCounts.listening >= 10  },
    { id: 22, pass: activityCounts.listening >= 30  },
    { id: 23, pass: activityCounts.listening >= 60  },
    { id: 24, pass: activityCounts.listening >= 100 },
    { id: 25, pass: distinctThemes >= 3  },
    { id: 26, pass: distinctThemes >= 5  },
    { id: 27, pass: distinctThemes >= 7  },
    { id: 28, pass: distinctThemes >= 10 },

    // ══ 競爭獎章／技巧類 id 29-52 ══
    { id: 29, pass: sessionScore >= 60  },
    { id: 30, pass: sessionScore >= 80  },
    { id: 31, pass: sessionScore >= 100 },
    { id: 32, pass: lastTwoPerfect },
    { id: 33, pass: fastCorrect >= 5  },
    { id: 34, pass: fastCorrect >= 10 },
    { id: 35, pass: fastCorrect >= 15 },
    { id: 36, pass: fastCorrect >= 20 },
    { id: 37, pass: totalCorrect >= 50  },
    { id: 38, pass: totalCorrect >= 150 },
    { id: 39, pass: totalCorrect >= 300 },
    { id: 40, pass: totalCorrect >= 600 },
    { id: 41, pass: progressPoints >= 10 },
    { id: 42, pass: progressPoints >= 20 },
    { id: 43, pass: progressPoints >= 30 },
    { id: 44, pass: progressPoints >= 40 },
    { id: 45, pass: currentStreak >= 2  },
    { id: 46, pass: currentStreak >= 3  },
    { id: 47, pass: currentStreak >= 5  },
    { id: 48, pass: currentStreak >= 10 },
    { id: 49, pass: themeMasterySessions >= 1  },
    { id: 50, pass: themeMasterySessions >= 3  },
    { id: 51, pass: themeMasterySessions >= 5  },
    { id: 52, pass: themeMasterySessions >= 10 },

    // ══ 競爭獎章／鼓勵類 id 53-64 ══
    { id: 53, pass: totalWrong >= 20  },
    { id: 54, pass: totalWrong >= 50  },
    { id: 55, pass: totalWrong >= 100 },
    { id: 56, pass: totalWrong >= 200 },
    { id: 57, pass: cumulativeComeback >= 1  },
    { id: 58, pass: cumulativeComeback >= 3  },
    { id: 59, pass: cumulativeComeback >= 5  },
    { id: 60, pass: cumulativeComeback >= 10 },
    { id: 61, pass: consecutiveDays >= 3  },
    { id: 62, pass: consecutiveDays >= 7  },
    { id: 63, pass: consecutiveDays >= 14 },
    { id: 64, pass: consecutiveDays >= 30 },
  ]

  // ── 發放新獎章 ────────────────────────────────────────
  for (const { id, pass } of checks) {
    if (!pass || ownedIds.has(id)) continue

    try {
      await db.query(
        `INSERT IGNORE INTO user_badges (user_id, badge_id, session_id)
         VALUES (?, ?, ?)`,
        [userId, id, sessionId]
      )
      const [[badge]] = await db.query(
        `SELECT badge_id, badge_name, icon_emoji, badge_tier, badge_category, condition_desc
         FROM badges WHERE badge_id = ?`,
        [id]
      )
      newBadges.push(badge)
    } catch { /* 重複寫入忽略 */ }
  }

  // ── 小組共同獎章（學霸小隊，id 65-68）：這個人的動作可能剛好讓全組
  // 平均系統分跨過門檻，一次檢查、全組一起發。只開放實驗組（對照組沒有
  // 小組概念）
  if (isExperimental && user.group_id) {
    const teamAwards = await checkAndAwardTeamBadges(user.group_id)
    // 只有「這次呼叫的當事人」拿到的團隊獎章會回傳出去給前端立刻顯示；
    // 其他組員同時拿到的，user_badges 已經寫入、acknowledged 預設是0，
    // 他們下次登入首頁會被「新獎章」toast 撿到，不用在這裡特別處理
    if (teamAwards[userId]) newBadges.push(...teamAwards[userId])
  }

  return newBadges
}

// 目前系統實際開放給學生的主題（跟 questions.js /themes、game.js session/start 的
// theme_id IN (11,12,17,18) 條件保持一致）——「全域探索隊」拿這個算涉獵覆蓋率用
const OPEN_THEME_IDS = [11, 12, 17, 18]

// ══════════════════════════════════════════════════════════
//  小組共同獎章：一次檢查全組所有門檻，通過的話全組成員一起 INSERT IGNORE，
//  回傳 { user_id: [新獎章...] } 方便呼叫端知道每個人各拿到了什麼
//
//  2026-09-22 擴增：原本只有「學霸小隊」一個家族，跟學姊確認過共同獎章是
//  2026-08-26 進度報告裡實驗一自變項的核心（小組協作共榮結構），份量太薄，
//  這次補了 8 個新家族（見 scripts/expand-team-badges.sql 開頭註解的完整設計說明），
//  条件涵蓋「很快就能拿到」到「要撐到研究第10週才拿得到」的完整難度區間
// ══════════════════════════════════════════════════════════
async function checkAndAwardTeamBadges(groupId) {
  const result = {}

  // 中離的組員不算進小組平均，也不會再收到新的小組共同獎章——他們中離
  // 之前已經拿到的獎章不受影響，這裡只是不讓他們繼續影響「還在參與」的
  // 組員的團隊表現
  const [members] = await db.query(
    'SELECT user_id FROM users WHERE group_id = ? AND role = \'student\' AND withdrawn_at IS NULL',
    [groupId]
  )
  if (members.length === 0) return result
  const memberIds = members.map(m => m.user_id)

  const [[avgScores]] = await db.query(
    `SELECT AVG(system_score) AS avg_system
     FROM users WHERE group_id = ? AND role = 'student' AND withdrawn_at IS NULL`,
    [groupId]
  )
  const avgSystem = avgScores?.avg_system ?? 0

  // ── 並肩作戰／打卡常勝軍／火力全開／閃電小隊／全域探索隊：都是小隊全體
  // game_logs 的累積聚合，一次查完 ──────────────────────────────
  const [[teamAgg]] = await db.query(
    `SELECT COUNT(DISTINCT gl.session_id)               AS total_sessions,
            COUNT(DISTINCT DATE(gl.answered_at))         AS active_days,
            SUM(gl.is_correct = 1)                       AS total_correct,
            SUM(gl.is_correct = 1 AND gl.response_time <= 5) AS fast_correct,
            COUNT(DISTINCT q.theme_id)                   AS theme_coverage
     FROM game_logs gl
     JOIN questions q ON q.question_id = gl.question_id
     WHERE gl.user_id IN (?)`,
    [memberIds]
  )
  const teamTotalSessions = teamAgg?.total_sessions ?? 0
  const teamActiveDays    = teamAgg?.active_days    ?? 0
  const teamTotalCorrect  = teamAgg?.total_correct  ?? 0
  const teamFastCorrect   = teamAgg?.fast_correct   ?? 0
  const teamThemeCoverage = teamAgg?.theme_coverage ?? 0

  // ── 小隊全勤：連續活躍週數，錨定該組所屬班級的 study_start_date。
  // 沒設定研究開始日的班級查不出週數，這個家族就是不會觸發，不是 bug ──
  let teamConsecutiveWeeks = 0
  const [[classInfo]] = await db.query(
    `SELECT c.study_start_date
     FROM \`groups\` g JOIN classes c ON c.class_id = g.class_id
     WHERE g.group_id = ?`,
    [groupId]
  )
  if (classInfo?.study_start_date) {
    const [weekRows] = await db.query(
      `SELECT DISTINCT week_num FROM (
         SELECT FLOOR(DATEDIFF(DATE(answered_at), ?) / 7) AS week_num
         FROM game_logs WHERE user_id IN (?)
       ) weeks
       WHERE week_num >= 0
       ORDER BY week_num ASC`,
      [classInfo.study_start_date, memberIds]
    )
    teamConsecutiveWeeks = longestConsecutiveInts(weekRows.map(r => r.week_num))
  }

  // ── 絕地反攻：小隊全體「單場正確率比上一場進步≥20個百分點」次數加總，
  // 每個成員各自的場次歷史要分開算，用 user_id 分組後在 JS 裡逐一掃過 ──
  const [sessionAccRows] = await db.query(
    `SELECT gl.user_id, gl.session_id,
            SUM(gl.is_correct) / COUNT(*) * 100 AS accuracy
     FROM game_logs gl
     JOIN game_sessions gs ON gs.session_id = gl.session_id
     WHERE gl.user_id IN (?)
     GROUP BY gl.user_id, gl.session_id
     ORDER BY gl.user_id ASC, gs.started_at ASC`,
    [memberIds]
  )
  let teamComebackTotal = 0
  let prevUserId = null
  let prevAccuracy = null
  for (const row of sessionAccRows) {
    if (row.user_id !== prevUserId) { prevUserId = row.user_id; prevAccuracy = null }
    if (prevAccuracy !== null && row.accuracy - prevAccuracy >= 20) teamComebackTotal++
    prevAccuracy = row.accuracy
  }

  // ── 人人有功練：組裡有幾個人「個人系統分」各自跨過某個門檻 ──────
  async function membersAtOrAbove(threshold) {
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS n FROM users
       WHERE group_id = ? AND role = 'student' AND withdrawn_at IS NULL AND system_score >= ?`,
      [groupId, threshold]
    )
    return row?.n ?? 0
  }
  const membersAt50  = await membersAtOrAbove(50)
  const membersAt150 = await membersAtOrAbove(150)
  const membersAt300 = await membersAtOrAbove(300)
  const membersAt800 = await membersAtOrAbove(800)

  const teamChecks = [
    // 學霸小隊：小組平均系統分
    { id: 65, pass: avgSystem >= 100  },
    { id: 66, pass: avgSystem >= 500  },
    { id: 67, pass: avgSystem >= 1000 },
    { id: 68, pass: avgSystem >= 3000 },

    // 並肩作戰：小隊累積出賽場次
    { id: 69, pass: teamTotalSessions >= 10  },
    { id: 70, pass: teamTotalSessions >= 30  },
    { id: 71, pass: teamTotalSessions >= 70  },
    { id: 72, pass: teamTotalSessions >= 150 },

    // 打卡常勝軍：小隊不重複活躍天數
    { id: 73, pass: teamActiveDays >= 8  },
    { id: 74, pass: teamActiveDays >= 20 },
    { id: 75, pass: teamActiveDays >= 35 },
    { id: 76, pass: teamActiveDays >= 50 },

    // 火力全開：小隊累積答對題數
    { id: 77, pass: teamTotalCorrect >= 200  },
    { id: 78, pass: teamTotalCorrect >= 600  },
    { id: 79, pass: teamTotalCorrect >= 1200 },
    { id: 80, pass: teamTotalCorrect >= 2400 },

    // 閃電小隊：小隊累積5秒內快速答對題數
    { id: 81, pass: teamFastCorrect >= 15  },
    { id: 82, pass: teamFastCorrect >= 40  },
    { id: 83, pass: teamFastCorrect >= 90  },
    { id: 84, pass: teamFastCorrect >= 180 },

    // 全域探索隊：小隊涉獵過的不同主題數
    { id: 85, pass: teamThemeCoverage >= 2 },
    { id: 86, pass: teamThemeCoverage >= 3 },
    { id: 87, pass: teamThemeCoverage >= OPEN_THEME_IDS.length },
    { id: 88, pass: teamThemeCoverage >= OPEN_THEME_IDS.length && teamTotalSessions >= 40 },

    // 小隊全勤：連續活躍週數（傳說級=撐完整個10週實驗期）
    { id: 89, pass: teamConsecutiveWeeks >= 2  },
    { id: 90, pass: teamConsecutiveWeeks >= 4  },
    { id: 91, pass: teamConsecutiveWeeks >= 7  },
    { id: 92, pass: teamConsecutiveWeeks >= 10 },

    // 絕地反攻：小隊全體「單場大進步」次數加總
    { id: 93, pass: teamComebackTotal >= 3  },
    { id: 94, pass: teamComebackTotal >= 8  },
    { id: 95, pass: teamComebackTotal >= 16 },
    { id: 96, pass: teamComebackTotal >= 30 },

    // 人人有功練：組裡跨過門檻的人數（gold/legend 要求「全員」，用 memberIds.length
    // 動態比對，不寫死4人，之後不管小組人數多少都適用）
    { id: 97,  pass: membersAt50  >= Math.min(2, memberIds.length) },
    { id: 98,  pass: membersAt150 >= Math.min(3, memberIds.length) },
    { id: 99,  pass: membersAt300 >= memberIds.length },
    { id: 100, pass: membersAt800 >= memberIds.length },
  ]
  if (!teamChecks.some(c => c.pass)) return result

  for (const { id, pass } of teamChecks) {
    if (!pass) continue
    for (const memberId of memberIds) {
      try {
        const [insertResult] = await db.query(
          'INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)',
          [memberId, id]
        )
        if (insertResult.affectedRows > 0) {
          const [[badge]] = await db.query(
            `SELECT badge_id, badge_name, icon_emoji, badge_tier, badge_category, condition_desc
             FROM badges WHERE badge_id = ?`,
            [id]
          )
          if (!result[memberId]) result[memberId] = []
          result[memberId].push(badge)
        }
      } catch { /* 重複寫入忽略 */ }
    }
  }

  return result
}

// ══════════════════════════════════════════════════════════
//  POST /api/badges/check
//  PK 結果頁主動呼叫
// ══════════════════════════════════════════════════════════
router.post('/check', auth, async (req, res) => {
  try {
    const { session_id } = req.body
    const newBadges = await checkAndAwardBadges(req.user.user_id, session_id)
    res.json({ new_badges: newBadges })
  } catch (e) {
    console.error('[badges/check]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  GET /api/badges/unacknowledged
//  首頁用：查詢有沒有還沒被提醒過的新獎章
//  正常情況下 PK 結果頁看過就會標記已讀，這支主要是補「不是經過結果頁
//  觸發」的獎章沒被看到的情況
// ══════════════════════════════════════════════════════════
router.get('/unacknowledged', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.badge_id, b.badge_name, b.icon_emoji, b.badge_tier,
              b.badge_category, b.condition_desc
       FROM user_badges ub
       JOIN badges b ON b.badge_id = ub.badge_id
       WHERE ub.user_id = ? AND ub.acknowledged = 0
       ORDER BY ub.awarded_at DESC`,
      [req.user.user_id]
    )
    res.json({ badges: rows })
  } catch (e) {
    console.error('[badges/unacknowledged]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  POST /api/badges/acknowledge
//  標記獎章已經提醒過（顯示過全螢幕彈窗/結果頁列表/首頁toast之後呼叫）
//  Body: { badge_ids: [1, 2, 3] }
// ══════════════════════════════════════════════════════════
router.post('/acknowledge', auth, async (req, res) => {
  try {
    const { badge_ids } = req.body
    if (!Array.isArray(badge_ids) || badge_ids.length === 0)
      return res.status(400).json({ error: 'badge_ids 必須是非空陣列' })

    await db.query(
      `UPDATE user_badges SET acknowledged = 1
       WHERE user_id = ? AND badge_id IN (?)`,
      [req.user.user_id, badge_ids]
    )
    res.json({ ok: true })
  } catch (e) {
    console.error('[badges/acknowledge]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ══════════════════════════════════════════════════════════
//  GET /api/badges/user/:userId
//  個人頁 / 英雄榜取得獎章列表
// ══════════════════════════════════════════════════════════
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const targetId = Number(req.params.userId)

    // 所有獎章（含是否已獲得）
    const [all] = await db.query(
      `SELECT b.*,
              IF(ub.badge_id IS NOT NULL, 1, 0) AS earned,
              ub.awarded_at
       FROM badges b
       LEFT JOIN user_badges ub
         ON ub.badge_id = b.badge_id AND ub.user_id = ?
       WHERE b.is_active = 1
       ORDER BY b.badge_category, b.badge_tier`,
      [targetId]
    )

    // 小組共同成就（social_team）額外帶入同組組員名單，前端才能顯示
    // 「與 OOO 一起獲得」——只有真的有 social_team 徽章時才查，省一次查詢
    if (all.some(b => b.badge_category === 'social_team')) {
      const [[target]] = await db.query(
        'SELECT group_id FROM users WHERE user_id = ?', [targetId]
      )
      if (target?.group_id) {
        const [members] = await db.query(
          `SELECT nickname FROM users
           WHERE group_id = ? AND role = 'student' AND user_id != ?
           ORDER BY is_leader DESC, nickname`,
          [target.group_id, targetId]
        )
        const teammateNames = members.map(m => m.nickname)
        all.forEach(b => {
          if (b.badge_category === 'social_team') b.teammates = teammateNames
        })
      }
    }

    res.json({ badges: all })
  } catch (e) {
    console.error('[badges/user]', e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

module.exports = { router, checkAndAwardBadges }
