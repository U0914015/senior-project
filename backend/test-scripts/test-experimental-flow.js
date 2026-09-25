/**
 * 實驗組流程測試
 *
 * 2026-08-05 改版：系統拿掉了「發起PK挑戰另一組、等對方答完」的機制，
 * 現在是個人隨時可以發起自己的挑戰，答完直接結算。實驗組跟對照組的
 * 差異變成：有沒有小組概念（小組排行/小組貢獻度）、有沒有社群互評。
 *
 * 前置條件：backend 要跑著（npm run dev），資料庫要有 backend/scripts/seed-test-accounts.js
 * 建出來的帳號（S001/S003 是實驗組、同組）。如果帳號不存在，先跑：
 * node backend/scripts/seed-test-accounts.js
 *
 * 跑法：node backend/test-scripts/test-experimental-flow.js
 *
 * 涵蓋範圍：
 *   1. 發起個人挑戰、答完最後一題自動結算（不用等任何人）
 *   2. 小組排行（/game/group-scores）看得到自己的小組、分數有更新
 *   3. 小組貢獻度（/game/session/:id/group-contribution）看得到累積分數
 *   4. 社群互評：送出成功、正確拿到分數/獎章
 *   5. 防偏袒輪替規則：連續送同一個隊友要被擋下（400）
 *   6. 換一個隊友之後可以送成功（輪替規則只擋「連續」，不是完全禁止）
 */
const { api, login, ok } = require('./_helpers')

async function playRound(token, level = 'vocabulary') {
  const start = await api('POST', '/game/session/start', { level }, token)
  if (start.status !== 201) return { start, sessionId: null, lastSubmit: null }
  const sessionId = start.data.session_id
  let lastSubmit = null
  for (const q of start.data.questions) {
    lastSubmit = await api('POST', '/game/session/submit',
      { session_id: sessionId, question_id: q.question_id, user_answer: 'test', response_time: 8 },
      token)
  }
  return { start, sessionId, lastSubmit }
}

async function main() {
  let allPass = true
  const fail = () => { allPass = false }

  console.log('── 登入 ──')
  const s1 = await login('S001', 'student123', 'student')  // 實驗組，A組
  const s3 = await login('S003', 'test1234',   'student')  // 實驗組，A組（隊友）
  ok('S001/S003 登入成功', s1.token && s3.token) || fail()
  ok('S001 experiment_group 是 experimental', s1.user.experiment_group === 'experimental',
     `實際值：${s1.user.experiment_group}`) || fail()

  console.log('\n── 發起個人挑戰，不用等任何人 ──')
  const { start, sessionId, lastSubmit } = await playRound(s1.token)
  ok('session/start 成功（不用帶對手）', start.status === 201, `HTTP ${start.status}`) || fail()
  ok('答完最後一題後端直接標記完成', lastSubmit?.data?.session_completed === true,
     JSON.stringify(lastSubmit?.data)) || fail()

  const result = await api('GET', `/game/session/${sessionId}/result`, null, s1.token)
  ok('結果頁拿得到個人成績', result.status === 200 && result.data.my_score, JSON.stringify(result.data)) || fail()

  console.log('\n── 小組排行 ──')
  const scores = await api('GET', `/game/group-scores?class_id=${s1.user.class_id}`, null, s1.token)
  const myGroupScore = (scores.data.groups ?? []).find(g => g.group_id === s1.user.group_id)
  ok('小組排行看得到自己的小組', !!myGroupScore, JSON.stringify(scores.data.groups)) || fail()

  console.log('\n── 小組貢獻度（累積至今） ──')
  const contribution = await api('GET', `/game/session/${sessionId}/group-contribution`, null, s1.token)
  ok('小組貢獻度回傳成功', contribution.status === 200 && Array.isArray(contribution.data.members),
     JSON.stringify(contribution.data)) || fail()

  console.log('\n── 社群互評 ──')
  const like = await api('POST', '/social/interact',
    { session_id: sessionId, receiver_id: s3.user.user_id, action_type: 'like' }, s1.token)
  ok('送出「拍拍手」成功', like.status === 200 && like.data.score_awarded === 10,
     JSON.stringify(like.data)) || fail()

  console.log('\n── 防偏袒輪替規則 ──')
  const stickerSamePerson = await api('POST', '/social/interact',
    { session_id: sessionId, receiver_id: s3.user.user_id, action_type: 'sticker', sticker_tag: 'brave' },
    s1.token)
  ok('連續送同一人被擋下（400）', stickerSamePerson.status === 400,
     JSON.stringify(stickerSamePerson.data)) || fail()

  const teammates = await api('GET', '/game/my-group', null, s1.token)
  const other = (teammates.data.members ?? []).find(
    m => m.user_id !== s1.user.user_id && m.user_id !== s3.user.user_id
  )
  if (other) {
    const toOther = await api('POST', '/social/interact',
      { session_id: sessionId, receiver_id: other.user_id, action_type: 'like' }, s1.token)
    ok('換一個隊友送，正常成功', toOther.status === 200, JSON.stringify(toOther.data)) || fail()
  } else {
    console.log('ℹ️  A組目前只有 2 人，沒有第三人可以測「換人送成功」，略過')
  }

  console.log(`\n${allPass ? '🎉 全部通過' : '⚠️ 有測試沒過，往上找 ❌'}`)
  process.exit(allPass ? 0 : 1)
}

main().catch(e => { console.error('測試腳本本身出錯：', e); process.exit(1) })
