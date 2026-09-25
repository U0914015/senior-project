/**
 * 教師後台測試
 *
 * 前置條件同其他兩支腳本，最好先跑過 test-experimental-flow.js /
 * test-control-flow.js 讓資料庫裡有實際的 PK 紀錄，不然 PERR/STD 都會是
 * null（還沒有任何答錯紀錄可以算）。
 * 跑法：node backend/test-scripts/test-teacher-dashboard.js
 *
 * 涵蓋範圍：
 *   1. 教師登入、班級清單
 *   2. /teacher/dashboard：學生列表裡每個人都有 experiment_group、perr、std 欄位
 *   3. summary 裡實驗組/對照組的平均值都算得出來（exp_avg_* vs ctrl_avg_*）
 *   4. 組別管理（/teacher/students/:classId）看得到 A組/B組
 *   5. 場次管理（/teacher/sessions）看得到剛剛測試流程留下的場次
 */
const { api, login, ok } = require('./_helpers')

async function main() {
  let allPass = true
  const fail = () => { allPass = false }

  console.log('── 登入 ──')
  const t1 = await login('T001', 'teacher123', 'teacher')
  ok('T001 登入成功', !!t1.token) || fail()

  console.log('\n── 班級清單 ──')
  const classes = await api('GET', '/teacher/classes', null, t1.token)
  ok('查得到班級清單', classes.status === 200 && classes.data.classes?.length > 0,
     JSON.stringify(classes.data)) || fail()
  const classId = classes.data.classes?.[0]?.class_id
  console.log(`ℹ️  用第一個班級測試，class_id=${classId}`)

  console.log('\n── 班級總覽 dashboard ──')
  const dash = await api('GET', `/teacher/dashboard?class_id=${classId}`, null, t1.token)
  ok('dashboard 回傳成功', dash.status === 200, `HTTP ${dash.status}`) || fail()

  const students = dash.data.students ?? []
  ok('學生列表非空', students.length > 0, `共 ${students.length} 人`) || fail()

  const hasExpField = students.every(s => 'experiment_group' in s)
  ok('每個學生都有 experiment_group 欄位', hasExpField) || fail()
  const hasPerrStdField = students.every(s => 'perr' in s && 'std' in s)
  ok('每個學生都有 perr/std 欄位', hasPerrStdField) || fail()

  console.log('\n── 學生 PERR/STD 明細 ──')
  students.forEach(s => {
    console.log(
      `   ${s.nickname}（${s.experiment_group ?? '未設定'}）` +
      `　答題分數=${s.system_score}　正確率=${s.accuracy}%　` +
      `PERR=${s.perr ?? '—'}${s.perr !== null ? '%' : ''}　STD=${s.std ?? '—'}`
    )
  })
  const anyPerrData = students.some(s => s.perr !== null)
  if (!anyPerrData) {
    console.log('ℹ️  目前沒有任何學生有 PERR/STD 數值（代表還沒有人在資料庫裡留下答錯紀錄），' +
      '先跑 test-experimental-flow.js / test-control-flow.js 累積一些資料再測一次比較準')
  }

  console.log('\n── 實驗組/對照組比較摘要 ──')
  const sm = dash.data.summary ?? {}
  console.log(
    `   實驗組：${sm.exp_count ?? 0} 人　平均答題分數=${sm.exp_avg_system}　` +
    `平均正確率=${sm.exp_avg_accuracy}%　PERR=${sm.exp_avg_perr}%　STD=${sm.exp_avg_std}題`
  )
  console.log(
    `   對照組：${sm.ctrl_count ?? 0} 人　平均答題分數=${sm.ctrl_avg_system}　` +
    `平均正確率=${sm.ctrl_avg_accuracy}%　PERR=${sm.ctrl_avg_perr}%　STD=${sm.ctrl_avg_std}題`
  )
  ok('summary 有算出實驗組/對照組人數', (sm.exp_count ?? 0) + (sm.ctrl_count ?? 0) === students.length,
     `exp=${sm.exp_count} ctrl=${sm.ctrl_count} total=${students.length}`) || fail()

  console.log('\n── 組別管理 ──')
  const groupMgmt = await api('GET', `/teacher/students/${classId}`, null, t1.token)
  ok('組別管理資料正常', groupMgmt.status === 200 && groupMgmt.data.groups?.length > 0,
     JSON.stringify(groupMgmt.data.groups?.map(g => g.group_name))) || fail()

  console.log('\n── 場次管理 ──')
  const sessions = await api('GET', `/teacher/sessions?class_id=${classId}`, null, t1.token)
  ok('場次列表正常', sessions.status === 200, `共 ${sessions.data.sessions?.length ?? 0} 場`) || fail()

  console.log('\n── 小組即時總分（大字報用，教師視角） ──')
  const groupScores = await api('GET', `/game/group-scores?class_id=${classId}`, null, t1.token)
  ok('大字報資料正常', groupScores.status === 200, JSON.stringify(groupScores.data.groups)) || fail()

  console.log(`\n${allPass ? '🎉 全部通過' : '⚠️ 有測試沒過，往上找 ❌'}`)
  process.exit(allPass ? 0 : 1)
}

main().catch(e => { console.error('測試腳本本身出錯：', e); process.exit(1) })
