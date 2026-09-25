/**
 * test-team-badge-ui.js
 *
 * 驗證「小組共同獎章視覺呈現補強」三項改動背後的 API 資料是否正確：
 *   1. ProfileView.vue  → 獎章牆拆成 個人／小組共同 兩區塊，需要 group-members API
 *   2. PKResultView.vue → PK 結果頁小組共同獎章金色慶祝彈窗，需要同一支 API
 *   3. HomeView.vue     → 首頁「我的獎章」拆成兩列
 *
 * 這支腳本不測 Vue 元件本身（那要開瀏覽器肉眼看），只驗證三個畫面
 * 共同依賴的後端資料是否正確：
 *   - GET /api/users/:userId/group-members 回傳正確、不含自己
 *   - GET /api/badges/user/:userId 每筆獎章都帶 badge_category，
 *     且 social_team 分類至少能被前端 filter 邏輯正確篩出來
 *   - 沒有 group_id 的使用者，group-members 回傳空陣列而不是報錯
 *
 * 用法：
 *   cd backend
 *   node test-scripts/test-team-badge-ui.js
 *
 * 前提：本機後端已經跑起來（npm run dev, port 3000），且資料庫裡
 * 至少有一個實驗組小組已經拿到 social_team 獎章（本機測試資料已符合）。
 */

const BASE = 'http://localhost:3000/api'

let passed = 0
let failed = 0

function ok(label, cond, detail = '') {
  if (cond) {
    console.log(`✅ ${label}`)
    passed++
  } else {
    console.log(`❌ ${label}${detail ? '  → ' + detail : ''}`)
    failed++
  }
}

async function login(student_id, password, role = 'student') {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id, password, role }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`登入失敗 ${student_id}: ${data.error}`)
  return data
}

async function authedGet(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return { status: res.status, data }
}

async function main() {
  console.log('══ 小組共同獎章視覺呈現 — API 資料驗證 ══\n')

  // ── 1. 登入一個已知有小組共同獎章的實驗組學生（組長，帶隊員） ──
  const { token, user } = await login('student001', 'test1234')
  ok('登入 student001 成功', !!token)
  ok('student001 屬於實驗組', user.experiment_group === 'experimental',
    `實際: ${user.experiment_group}`)
  ok('student001 有 group_id（有小組才有隊友可以顯示）', !!user.group_id)

  // ── 2. group-members：應該回傳同組、排除自己 ──
  const gm = await authedGet(`/users/${user.user_id}/group-members`, token)
  ok('group-members 回應 200', gm.status === 200)
  ok('group-members 回傳陣列', Array.isArray(gm.data.members))
  ok('group-members 不含自己', !gm.data.members.some(m => m.user_id === user.user_id),
    JSON.stringify(gm.data.members))
  ok('group-members 至少有 1 位隊友（本機測試小組固定有組員）',
    gm.data.members.length > 0)
  if (gm.data.members.length > 0) {
    console.log(`   → 隊友名單: ${gm.data.members.map(m => m.nickname).join('、')}`)
  }

  // ── 3. badges/user：每筆獎章都要帶 badge_category，且能篩出 social_team ──
  const badges = await authedGet(`/badges/user/${user.user_id}`, token)
  ok('badges/user 回應 200', badges.status === 200)
  const allBadges = badges.data.badges ?? []
  ok('badges 陣列非空', allBadges.length > 0)
  ok('每筆獎章都有 badge_category 欄位',
    allBadges.every(b => 'badge_category' in b),
    'ProfileView/HomeView 的個人／小組共同 split 邏輯依賴這個欄位')

  const earned = allBadges.filter(b => b.earned)
  const earnedTeam = earned.filter(b => b.badge_category === 'social_team')
  const earnedPersonal = earned.filter(b => b.badge_category !== 'social_team')
  ok('已獲得獎章中，個人／小組共同兩邊都篩得出東西（否則畫面測不到分區效果）',
    earnedTeam.length > 0 && earnedPersonal.length > 0,
    `個人: ${earnedPersonal.length}, 小組共同: ${earnedTeam.length}`)
  if (earnedTeam.length > 0) {
    console.log(`   → 小組共同獎章: ${earnedTeam.map(b => b.badge_name).join('、')}`)
  }

  // ── 4. 邊界情況：沒有 group_id 的使用者，不應該噴錯，應該回空陣列 ──
  // student003 在本機測試資料裡是沒有分組的（group_id: null）
  const { token: t3, user: u3 } = await login('student003', 'test1234')
  ok('登入 student003（無小組）成功', !!t3)
  const gm3 = await authedGet(`/users/${u3.user_id}/group-members`, t3)
  ok('無小組使用者查 group-members 仍回 200（不噴 500）', gm3.status === 200)
  ok('無小組使用者的 members 是空陣列', Array.isArray(gm3.data.members) && gm3.data.members.length === 0,
    JSON.stringify(gm3.data))

  // ── 5. 邊界情況：查別人的 group-members 也要能查（前端固定查自己，
  //     但 API 本身沒有限制只能查自己，這裡順便驗證權限沒有過度收緊） ──
  const gmOther = await authedGet(`/users/${gm.data.members[0]?.user_id ?? user.user_id}/group-members`, token)
  ok('查詢隊友（而非自己）的 group-members 也正常回應', gmOther.status === 200)

  // ── 6. 邊界情況：不存在的 user_id 要回 404，不是 500 ──
  const gmMissing = await authedGet('/users/999999/group-members', token)
  ok('查詢不存在的 user_id 回 404', gmMissing.status === 404, `實際 status: ${gmMissing.status}`)

  console.log(`\n══ 結果：${passed} 通過 / ${failed} 失敗 ══`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => {
  console.error('測試腳本執行錯誤:', e)
  process.exit(1)
})
