/**
 * 對照組流程測試
 *
 * 2026-08-05 改版：對照組是最單純的個人挑戰——沒有隊友、沒有小組排行、
 * 沒有社群互評。跟實驗組共用同一套答題引擎，差別只在前端要不要顯示
 * 小組/社群相關的畫面（後端本來就是「前端擋、後端不重複驗證」的既有
 * 設計慣例，這支腳本會如實記錄這個現況）。
 *
 * 前置條件同 test-experimental-flow.js（要先跑過 seed-test-accounts.js）。
 * 跑法：node backend/test-scripts/test-control-flow.js
 */
const { api, login, ok } = require('./_helpers')

async function main() {
  let allPass = true
  const fail = () => { allPass = false }

  console.log('── 登入 ──')
  const s2 = await login('S002', 'test1234', 'student')  // 對照組
  ok('S002 登入成功', !!s2.token) || fail()
  ok('S002 experiment_group 是 control', s2.user.experiment_group === 'control',
     `實際值：${s2.user.experiment_group}`) || fail()

  console.log('\n── 對照組發起個人挑戰，答完自動結算 ──')
  const start = await api('POST', '/game/session/start', { level: 'vocabulary' }, s2.token)
  ok('session/start 成功', start.status === 201, `HTTP ${start.status}`) || fail()
  const sessionId = start.data.session_id

  let lastSubmit = null
  for (const q of start.data.questions) {
    lastSubmit = await api('POST', '/game/session/submit',
      { session_id: sessionId, question_id: q.question_id, user_answer: 'test', response_time: 8 },
      s2.token)
  }
  ok('答完最後一題自動結算', lastSubmit?.data?.session_completed === true,
     JSON.stringify(lastSubmit?.data)) || fail()

  const result = await api('GET', `/game/session/${sessionId}/result`, null, s2.token)
  ok('結果頁拿得到個人成績', result.status === 200 && result.data.my_score, JSON.stringify(result.data)) || fail()

  console.log('\n── 個人資料 / 私有徽章牆（對照組本來就該看得到自己的） ──')
  const profile = await api('GET', `/users/${s2.user.user_id}/profile`, null, s2.token)
  ok('個人頁正常', profile.status === 200, `HTTP ${profile.status}`) || fail()
  const badges = await api('GET', `/badges/user/${s2.user.user_id}`, null, s2.token)
  ok('個人徽章牆正常（私有化顯示，只有自己看得到）', badges.status === 200, `HTTP ${badges.status}`) || fail()

  console.log('\n── 這幾支 API 現況是「後端不擋、前端擋」，這裡如實記錄現況 ──')
  const groupScores = await api('GET', `/game/group-scores?class_id=${s2.user.class_id}`, null, s2.token)
  console.log(`ℹ️ 對照組呼叫 /game/group-scores → HTTP ${groupScores.status}` +
    '（LeaderboardView.vue、ChallengeView.vue 前端會依 isExperimental 隱藏小組相關UI，但 API 本身沒有擋）')

  console.log(`\n${allPass ? '🎉 全部通過' : '⚠️ 有測試沒過，往上找 ❌'}`)
  process.exit(allPass ? 0 : 1)
}

main().catch(e => { console.error('測試腳本本身出錯：', e); process.exit(1) })
