/**
 * setup-team-badge-test-data.js
 *
 * 給「手動測試腳本」用的前置準備：把 A 組（student001+002）的社群分數
 * 卡在小組共同獎章門檻的前一步，讓你在瀏覽器裡只要做「一次」社群互動
 * （按讚/貼貼圖/留言都行），就會親眼看到平均分數跨過門檻、觸發真正的
 * 頒發流程（不是灌假的 user_badges 資料，是讓你自己觸發真的 code path）。
 *
 * 門檻：AVG(social_score) 100 / 500 / 1500 → 銅/銀/金
 *   （badges.js 的 checkAndAwardTeamBadges，全組 2 人時 sum = avg*2）
 *
 * 用法：
 *   cd backend
 *   node test-scripts/setup-team-badge-test-data.js bronze   ← 預設
 *   node test-scripts/setup-team-badge-test-data.js silver
 *   node test-scripts/setup-team-badge-test-data.js gold
 */

require('dotenv').config()
const db = require('../db')

const THRESHOLDS = { bronze: 100, silver: 500, gold: 1500 }
const tier = process.argv[2] || 'bronze'
const threshold = THRESHOLDS[tier]

if (!threshold) {
  console.error('用法: node setup-team-badge-test-data.js [bronze|silver|gold]')
  process.exit(1)
}

;(async () => {
  const GROUP_ID = 1 // A 組：student001（組長）+ student002

  const [members] = await db.query(
    "SELECT user_id, nickname FROM users WHERE group_id = ? AND role = 'student'",
    [GROUP_ID]
  )
  if (members.length === 0) {
    console.error('A 組（group_id=1）目前沒有學生，請確認測試帳號還在。')
    process.exit(1)
  }

  // avg = threshold - 1，讓任何一次互動（最小 +10 分）都足以推過門檻
  const target = threshold - 1
  for (const m of members) {
    await db.query('UPDATE users SET social_score = ? WHERE user_id = ?', [target, m.user_id])
  }

  console.log(`✅ A 組 ${members.map(m => m.nickname).join('、')} 的 social_score 已設為 ${target}`)
  console.log(`   （平均 = ${target}，只差 1 分就跨過「${tier}」門檻 = ${threshold}）`)
  console.log('')
  console.log('接下來請照 manual-test-team-badge-ui.md 的步驟，在瀏覽器裡實際操作。')
  process.exit(0)
})().catch(e => {
  console.error(e)
  process.exit(1)
})
