<template>
  <div class="result-page">
    <div class="bg-blob bl1" aria-hidden="true"/>
    <div class="bg-blob bl2" aria-hidden="true"/>
    <div class="bg-blob bl3" aria-hidden="true"/>

    <!-- ══ 載入中 ══ -->
    <div v-if="isLoading" class="loading-area">
      <div class="spinner"/>
      <p>結算中…</p>
    </div>

    <template v-else>

      <!-- ══ 成績標題（個人挑戰，依表現分級，不再比對手輸贏） ══ -->
      <div class="winner-banner" :class="bannerClass">
        <div class="confetti-row" aria-hidden="true">{{ bannerEmoji }}</div>
        <h1 class="banner-title">{{ bannerTitle }}</h1>
        <p class="banner-sub">{{ bannerSub }}</p>
      </div>

      <!-- ══ 我的成績卡 ══ -->
      <div class="my-score-card">
        <div class="ms-header">
          <div class="ms-avatar" :style="{ background: '#FF8C00' }">
            {{ authStore.user?.nickname?.charAt(0) }}
          </div>
          <div class="ms-info">
            <p class="ms-name">{{ authStore.user?.nickname }}</p>
          </div>
        </div>

        <div class="ms-stats">
          <div class="stat-box">
            <span class="stat-num highlight">{{ myScore?.session_score ?? 0 }}</span>
            <span class="stat-lbl">本場得分</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ myScore?.correct_count ?? 0 }} / {{ totalQuestions }}</span>
            <span class="stat-lbl">答對題數</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ myScore?.accuracy ?? 0 }}%</span>
            <span class="stat-lbl">正確率</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ myScore?.avg_response_time ?? 0 }}s</span>
            <span class="stat-lbl">平均秒數</span>
          </div>
        </div>

        <!-- 速度加成提示 -->
        <div v-if="speedBonus > 0" class="speed-tip">
          ⚡ 速度加成 +{{ speedBonus }} 分（答題夠快！）
        </div>
      </div>

      <!-- ══ 小組能量條（只有實驗組看得到，對照組沒有小組概念） ══ -->
      <div v-if="isExperimental && groupScoreEntry" class="section">
        <div class="sec-header">
          <span class="sec-tag">⚡ 小組能量條</span>
          <span class="sec-sub">{{ groupRankLabel }}</span>
        </div>
        <div class="energy-card">
          <div class="energy-header">
            <span class="energy-group-name">{{ groupScoreEntry.group_name }}</span>
            <span class="energy-score">{{ groupScoreEntry.energy_score }} 分</span>
          </div>
          <div class="energy-bar-wrap">
            <div class="energy-bar-fill" :style="{ width: energyBarWidth + '%' }"/>
          </div>
          <p class="energy-hint">這場你幫小組加了 {{ myScore?.session_score ?? 0 }} 分！</p>
        </div>
      </div>

      <!-- ══ 小組貢獻度（累積至今，只有實驗組看得到） ══ -->
      <div v-if="isExperimental && contribution" class="section">
        <div class="sec-header">
          <span class="sec-tag">小組貢獻度</span>
        </div>
        <div class="group-contribution">
          <div class="total-score">小組累積總分：{{ contribution.total_score }} 分</div>
          <div v-for="m in contribution.members" :key="m.nickname"
               class="member-bar">
            <span class="name">{{ m.nickname }}</span>
            <div class="bar-wrap">
              <div class="bar-fill"
                   :style="{ width: m.percentage + '%' }"/>
            </div>
            <span class="score">{{ m.score }}分（{{ m.percentage }}%）</span>
          </div>
        </div>
      </div>

      <!-- ══ 獎章提示（系統類獎章，非社群類已經用全螢幕彈窗慶祝過了） ══ -->
      <div v-if="nonSocialNewBadges.length > 0" class="section">
        <div class="sec-header">
          <span class="sec-tag">🎖️ 獲得新獎章！</span>
        </div>
        <div class="badge-list">
          <div v-for="b in nonSocialNewBadges" :key="b.badge_id" class="badge-card">
            <span class="badge-emoji">{{ b.icon_emoji }}</span>
            <div>
              <p class="badge-name">
                {{ b.badge_name }}
                <span class="badge-tier-chip" :class="`tier-${b.badge_tier}`">{{ tierLabel(b.badge_tier) }}</span>
              </p>
              <p class="badge-desc">{{ b.condition_desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ 底部按鈕 ══ -->
      <div class="bottom-btns">
        <button class="home-btn" @click="goHome">
          回到學習基地
        </button>
      </div>

    </template>

    <!-- ══ 個人獎章全螢幕慶祝彈窗 ══ -->
    <!-- 用系統本來的橘色主題色，跟小組共同獎章的金色彈窗做出區隔，
         一次把這場拿到的個人獎章都秀出來（不逐張跳） -->
    <Transition name="badge-modal-fade">
      <div v-if="showPersonalBadgeModal" class="badge-modal-backdrop">
        <div class="badge-modal personal-badge-modal">
          <div class="badge-modal-confetti" aria-hidden="true">🎉🎖️🎉</div>
          <p class="badge-modal-title">
            {{ nonSocialNewBadges.length > 1 ? `獲得 ${nonSocialNewBadges.length} 個新獎章！` : '獲得新獎章！' }}
          </p>
          <div class="badge-modal-list personal-list">
            <div v-for="b in nonSocialNewBadges" :key="b.badge_id" class="badge-modal-item personal">
              <span class="badge-modal-emoji">{{ b.icon_emoji }}</span>
              <p class="badge-modal-name">
                {{ b.badge_name }}
                <span class="badge-tier-chip" :class="`tier-${b.badge_tier}`">{{ tierLabel(b.badge_tier) }}</span>
              </p>
              <p class="badge-modal-cond">{{ b.condition_desc }}</p>
            </div>
          </div>
          <button class="badge-modal-confirm personal" @click="closePersonalBadgeModal">太棒了！🎉</button>
        </div>
      </div>
    </Transition>

    <!-- ══ 小組共同獎章全螢幕慶祝彈窗 ══ -->
    <!-- 跟一般社群獎章彈窗刻意做視覺區隔（金色漸層），文案強調「整組一起」，
         這樣學生才會意識到這是跟組員共同努力的成果，不是自己一個人的成就 -->
    <Transition name="badge-modal-fade">
      <div v-if="showTeamBadgeModal" class="badge-modal-backdrop">
        <div class="badge-modal team-badge-modal">
          <div class="badge-modal-confetti" aria-hidden="true">🎉🤝🎉</div>
          <p class="badge-modal-title">小組共同成就解鎖！</p>
          <div class="badge-modal-list">
            <div v-for="b in teamBadgesToCelebrate" :key="b.badge_id" class="badge-modal-item team">
              <span class="badge-modal-emoji">{{ b.icon_emoji }}</span>
              <p class="badge-modal-name">
                你們整組一起達成「{{ b.badge_name }}」
                <span class="badge-tier-chip" :class="`tier-${b.badge_tier}`">{{ tierLabel(b.badge_tier) }}</span>！
              </p>
              <p class="team-badge-mates">
                你{{ teamBadgeMemberNames ? ' + ' + teamBadgeMemberNames.split('、').join(' + ') : '' }} 一起獲得 🏅
              </p>
            </div>
          </div>
          <button class="badge-modal-confirm team" @click="closeTeamBadgeModal">收下 🎁</button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

const SESSION_ID     = Number(route.params.sessionId)
const isExperimental = computed(
  () => authStore.user?.experiment_group === 'experimental'
)

// ── 資料 ────────────────────────────────────────────────
const isLoading    = ref(true)
const myScore      = ref(null)
const newBadges    = ref([])
const totalQuestions = ref(5)
const contribution  = ref(null)
const groupMembers = ref([]) // 同組組員名單（不含自己），小組共同獎章彈窗要點名是跟誰一起拿到的
const groupScoreEntry = ref(null) // 我的小組在全班小組排行裡的那一筆
const groupRank       = ref(null) // 我的小組目前排第幾名
const topGroupScore   = ref(0)    // 全班小組裡目前最高分，能量條拿來當基準

// 小組共同獎章（social_team，例如學霸小隊）用全螢幕彈窗慶祝、文案強調
// 「這是跟組員一起達成的」，其他一般獎章維持結果頁區塊的顯示方式
const nonSocialNewBadges = computed(() =>
  newBadges.value.filter(b => b.badge_category !== 'social_team')
)
const teamBadgesToCelebrate = computed(() =>
  newBadges.value.filter(b => b.badge_category === 'social_team')
)
const teamBadgeMemberNames = computed(() => groupMembers.value.map(m => m.nickname).join('、'))

// 同一個獎章家族（例如「單場飛躍」）銅/銀/金/傳說四級門檻很接近，同一場一次跨好幾級是常見情況，
// 沒有標示等級的話會看起來像是同一張獎章重複發了 4 次——加上等級標籤讓它們讀起來是「同家族的
// 4 個不同等級」，不是重複，作法跟 ProfileView.vue 獎章牆的 tierLabel() 一致
function tierLabel(tier) {
  return { bronze: '銅級', silver: '銀級', gold: '金級', legend: '傳說' }[tier] ?? tier
}
const showTeamBadgeModal = ref(false)
// 2026-09-25：學姊問「得到獎章時是否有大畫面讓學生知道」——原本只有小組共同獎章有
// 全螢幕慶祝彈窗，個人獎章只安靜地列在頁面上的小卡片，容易被忽略。補一個個人獎章版本，
// 樣式跟小組共同獎章的金色彈窗做出區隔（用系統本來的橘色主題色），一次把這場拿到的
// 個人獎章都秀出來（不逐張跳，一次PK常常拿到10幾張，逐張跳對小朋友來說太煩）
const showPersonalBadgeModal = ref(false)

// ── 成績標題：個人挑戰沒有對手可以比輸贏了，改成依這場正確率分級 ──
const bannerTier = computed(() => {
  const acc = myScore.value?.accuracy ?? 0
  if (acc >= 80) return 'great'
  if (acc >= 50) return 'ok'
  return 'low'
})
const bannerEmoji = computed(() => ({ great: '🎉🏆🎉', ok: '💪', low: '📚' }[bannerTier.value]))
const bannerClass = computed(() => ({
  'banner-win':  bannerTier.value === 'great',
  'banner-lose': bannerTier.value === 'low',
  'banner-draw': bannerTier.value === 'ok',
}))
const bannerTitle = computed(() => ({
  great: '🏆 太棒了！',
  ok:    '繼續加油！',
  low:   '再接再厲！',
}[bannerTier.value]))
const bannerSub = computed(() => ({
  great: '你的表現很出色，繼續保持！',
  ok:    '穩紮穩打，下一場更好！',
  low:   '沒關係，多練習幾次就會更熟悉！',
}[bannerTier.value]))

// ── 小組能量條 ───────────────────────────────────────────
const groupRankLabel = computed(() =>
  groupRank.value ? `全班第 ${groupRank.value} 名` : ''
)
const energyBarWidth = computed(() => {
  const mine = Number(groupScoreEntry.value?.energy_score ?? 0)
  const max  = Math.max(topGroupScore.value, mine, 1)
  return Math.round((mine / max) * 100)
})

// 速度加成（估算）
const speedBonus = computed(() => {
  const base = (myScore.value?.correct_count ?? 0) * 10
  const total = myScore.value?.session_score ?? 0
  return Math.max(total - base, 0)
})

// ── 載入結果 ─────────────────────────────────────────────
async function fetchResult() {
  isLoading.value = true
  try {
    const { data } = await api.get(`/game/session/${SESSION_ID}/result`)
    myScore.value = data.my_score

    // 實驗組才有小組概念：小組貢獻度、小組能量條。
    // 對照組是純個人挑戰，這幾個都不用查
    if (isExperimental.value) {
      fetchContribution()
      fetchGroupScores()
    }

    // 檢查新獎章
    await checkBadges()
  } catch {
    // Mock 資料
    loadMock()
  } finally {
    isLoading.value = false
  }
}

async function fetchContribution() {
  try {
    const { data } = await api.get(`/game/session/${SESSION_ID}/group-contribution`)
    contribution.value = data
  } catch (e) {
    console.error('[fetchContribution]', e)
  }
}

// 小組能量條：跟大字報/小組排行同一支API（group_realtime_scores VIEW），
// 找出我的小組那一筆、順便算出目前排第幾名跟全班最高分（能量條基準）。
// 2026-09-25 起排名/顯示都改用 energy_score（排除當天請假組員的在場組員
// 平均分），不是全組總分——跟學姊確認過的「請假算法」
async function fetchGroupScores() {
  try {
    const { data } = await api.get('/game/group-scores', {
      params: { class_id: authStore.user?.class_id }
    })
    const groups = (data.groups ?? []).map(g => ({ ...g, energy_score: Number(g.energy_score) || 0 }))
    const sorted = [...groups].sort((a, b) => b.energy_score - a.energy_score)
    const idx = sorted.findIndex(g => g.group_id === authStore.user?.group_id)
    groupScoreEntry.value = idx >= 0 ? sorted[idx] : null
    groupRank.value       = idx >= 0 ? idx + 1 : null
    topGroupScore.value   = sorted[0]?.energy_score ?? 0
  } catch (e) {
    console.error('[fetchGroupScores]', e)
  }
}

async function checkBadges() {
  try {
    const { data } = await api.post('/badges/check', {
      session_id: SESSION_ID
    })
    newBadges.value = data.new_badges ?? []
    acknowledgeBadges(newBadges.value)
    await presentPendingBadgeModals()
  } catch { /* 獎章系統還沒做也不影響 */ }
}

function acknowledgeBadges(badges) {
  // 顯示過（或即將顯示）了就標記已讀，首頁的「你有新獎章」toast
  // 才不會對同一個獎章重複提醒
  if (badges.length > 0) {
    api.post('/badges/acknowledge', {
      badge_ids: badges.map(b => b.badge_id)
    }).catch(() => {})
  }
}

async function fetchGroupMembersForModal() {
  try {
    const { data } = await api.get(`/users/${authStore.user?.user_id}/group-members`)
    groupMembers.value = data.members ?? []
  } catch (e) {
    console.error('[fetchGroupMembersForModal]', e)
  }
}

// 獎章大螢幕慶祝——結果頁重新載入獎章時（初次進頁）呼叫一次。
// 順序：先秀個人獎章大畫面，收下之後才秀小組共同獎章大畫面，兩個一起跳出來會太亂
async function presentPendingBadgeModals() {
  if (nonSocialNewBadges.value.length > 0) {
    showPersonalBadgeModal.value = true
    return
  }
  await presentTeamBadgeModal()
}

async function presentTeamBadgeModal() {
  if (teamBadgesToCelebrate.value.length > 0) {
    await fetchGroupMembersForModal()
    showTeamBadgeModal.value = true
  }
}

function closePersonalBadgeModal() {
  showPersonalBadgeModal.value = false
  presentTeamBadgeModal()
}

// 小組共同獎章彈窗收下後，把已經慶祝過的移出 newBadges（避免下一輪
// 又被同一個 computed 挑出來重複顯示）
function closeTeamBadgeModal() {
  const shownIds = new Set(teamBadgesToCelebrate.value.map(b => b.badge_id))
  newBadges.value = newBadges.value.filter(b => !shownIds.has(b.badge_id))
  showTeamBadgeModal.value = false
}

function loadMock() {
  myScore.value = {
    user_id: authStore.user?.user_id, session_score: 65,
    correct_count: 4, accuracy: 80, avg_response_time: 12.3,
  }
  groupScoreEntry.value = { group_id: 1, group_name: 'A 組', total_score: 320, energy_score: 80, member_count: 4 }
  groupRank.value = 2
  topGroupScore.value = 480
  newBadges.value = [
    { badge_id: 1, icon_emoji: '🔥', badge_name: '高分王', condition_desc: '單場達 80 分', badge_category: 'system_single' }
  ]
}

// ── 頁面跳轉 ─────────────────────────────────────────────
function goHome() {
  router.push({ name: 'game' })
}

onMounted(fetchResult)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

.result-page {
  font-family: 'Nunito', sans-serif;
  background: #3D2B00;
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  padding-bottom: 40px;
  position: relative;
  overflow: hidden;
}
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: .12;
  pointer-events: none;
}
.bl1 { width:280px;height:280px;background:#FF8C00;top:-60px;right:-60px }
.bl2 { width:200px;height:200px;background:#F59E0B;bottom:200px;left:-60px }
.bl3 { width:160px;height:160px;background:#FF6B35;top:40%;right:-40px }

/* 載入 */
.loading-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: rgba(255,255,255,.5);
  gap: 16px;
}
.spinner {
  width: 40px; height: 40px;
  border: 3px solid rgba(255,255,255,.1);
  border-top-color: #FF8C00;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 勝負橫幅 ── */
.winner-banner {
  padding: 28px 20px 24px;
  text-align: center;
  position: relative;
  z-index: 1;
}
.banner-win  { background: linear-gradient(160deg, #1B5E20 0%, #3D2B00 60%); }
.banner-lose { background: linear-gradient(160deg, #4A2E00 0%, #3D2B00 60%); }
.banner-draw { background: linear-gradient(160deg, #3D2B00 0%, #3D2B00 60%); }
.confetti-row { font-size: 28px; margin-bottom: 8px; }
.banner-title {
  font-size: 26px;
  font-weight: 900;
  color: #fff;
  margin-bottom: 6px;
}
.banner-sub {
  font-size: 13px;
  color: rgba(255,255,255,.55);
}

/* ── 我的成績卡 ── */
.my-score-card {
  margin: 0 16px 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 20px;
  padding: 16px;
  position: relative;
  z-index: 1;
}
.ms-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.ms-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ms-name {
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 2px;
}
.ms-group { font-size: 11px; color: rgba(255,255,255,.45); }
.ms-info  { flex: 1; }
.ms-rank-badge {
  font-size: 26px;
  flex-shrink: 0;
}

.ms-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: rgba(255,255,255,.05);
  border-radius: 12px;
  padding: 10px 6px;
}
.stat-num {
  font-size: 16px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
}
.stat-num.highlight { color: #FBBF24; font-size: 20px; }
.stat-lbl { font-size: 10px; color: rgba(255,255,255,.4); text-align: center; }

.speed-tip {
  margin-top: 10px;
  background: rgba(251,191,36,.12);
  border: 1px solid rgba(251,191,36,.3);
  border-radius: 10px;
  padding: 7px 12px;
  font-size: 12px;
  color: #FBBF24;
  font-weight: 700;
  text-align: center;
}

/* ── Section ── */
.section {
  padding: 0 16px 14px;
  position: relative;
  z-index: 1;
}
.sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.sec-tag {
  font-size: 12px;
  font-weight: 700;
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.7);
  padding: 3px 10px;
  border-radius: 20px;
}
.sec-sub { font-size: 11px; color: rgba(255,255,255,.35); }

/* ── 小組能量條 ── */
.energy-card {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 16px;
  padding: 14px 16px;
}
.energy-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.energy-group-name { font-size: 14px; font-weight: 800; color: #fff; }
.energy-score { font-size: 18px; font-weight: 900; color: #FBBF24; }
.energy-bar-wrap {
  height: 14px;
  border-radius: 7px;
  background: rgba(255,255,255,.08);
  overflow: hidden;
  margin-bottom: 8px;
}
.energy-bar-fill {
  height: 100%;
  border-radius: 7px;
  background: linear-gradient(90deg, #FF8C00, #FF6B35);
  transition: width .6s ease;
}
.energy-hint { font-size: 12px; color: rgba(255,255,255,.5); margin: 0; }

/* ── 小組貢獻度 ── */
.group-contribution { display: flex; flex-direction: column; gap: 10px; }
.total-score {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,.7);
  margin-bottom: 4px;
}
.member-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.member-bar .name {
  flex: none;
  width: 64px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.member-bar .bar-wrap {
  flex: 1;
  height: 14px;
  border-radius: 7px;
  background: rgba(255,255,255,.08);
  overflow: hidden;
}
.member-bar .bar-fill {
  height: 100%;
  border-radius: 7px;
  background: linear-gradient(90deg, #FF8C00, #FF6B35);
  transition: width .6s ease;
}
.member-bar .score {
  flex: none;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,.75);
  white-space: nowrap;
}

/* ── 獎章 ── */
.badge-list { display: flex; flex-direction: column; gap: 8px; }
.badge-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(251,191,36,.08);
  border: 1px solid rgba(251,191,36,.25);
  border-radius: 14px;
  padding: 12px 14px;
}
.badge-emoji { font-size: 28px; flex-shrink: 0; }
.badge-name  { font-size: 14px; font-weight: 800; color: #FBBF24; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
.badge-desc  { font-size: 11px; color: rgba(255,255,255,.45); }
.badge-tier-chip {
  font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 999px;
  background: rgba(255,255,255,.1); color: rgba(255,255,255,.6);
}
.badge-tier-chip.tier-bronze { background: #CD7F32; color: #2B1600; }
.badge-tier-chip.tier-silver { background: #CBD5E1; color: #1E293B; }
.badge-tier-chip.tier-gold   { background: #FFC629; color: #3B2600; }
.badge-tier-chip.tier-legend { background: linear-gradient(90deg,#A855F7,#EC4899); color: #fff; }

/* ── 底部按鈕 ── */
.bottom-btns {
  padding: 14px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  z-index: 1;
}
.home-btn {
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 1.5px solid rgba(255,255,255,.15);
  background: transparent;
  color: rgba(255,255,255,.6);
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all .15s;
}
.home-btn:hover {
  border-color: rgba(255,255,255,.3);
  color: #fff;
  background: rgba(255,255,255,.05);
}

/* ── 小組共同獎章／獎章全螢幕彈窗 ── */
.badge-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(61,43,0, .85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}
.badge-modal {
  width: 100%;
  max-width: 380px;
  background: linear-gradient(160deg, #FF6B35, #FF6B35);
  border-radius: 28px;
  padding: 32px 24px 24px;
  text-align: center;
  box-shadow: 0 30px 80px rgba(255,107,53, .4);
}
.badge-modal-confetti { font-size: 32px; margin-bottom: 8px; }
.badge-modal-title {
  font-size: 20px;
  font-weight: 900;
  color: #fff;
  margin-bottom: 18px;
}
.badge-modal-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 22px; }
.badge-modal-item {
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 18px;
  padding: 16px;
}
.badge-modal-emoji { font-size: 44px; display: block; margin-bottom: 6px; }
.badge-modal-name { font-size: 17px; font-weight: 900; color: #fff; margin-bottom: 4px; }
.badge-modal-desc { font-size: 12px; color: rgba(255,255,255,.8); }
.badge-modal-cond { font-size: 12px; color: rgba(255,255,255,.85); line-height: 1.4; }
/* 個人獎章一次可能拿到很多張（不像小組共同獎章通常1、2張），清單要能捲動，
   不然畫面會被撐爆 */
.badge-modal-list.personal-list {
  max-height: 50vh; overflow-y: auto;
  padding-right: 4px;
}
.badge-modal-item.personal { text-align: left; display: flex; flex-direction: column; gap: 2px; }
.badge-modal-item.personal .badge-modal-emoji { display: inline; margin-right: 8px; margin-bottom: 0; }
.badge-modal-item.personal .badge-modal-name { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.badge-modal-confirm {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 16px;
  background: #fff;
  color: #E64A19;
  font-family: 'Nunito', sans-serif;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
  transition: transform .15s;
}
.badge-modal-confirm:hover { transform: scale(1.03); }

/* 小組共同獎章：金色漸層，跟個人／一般社群獎章的粉紫漸層明顯區隔，
   強調「這是整組的成就」 */
.team-badge-modal {
  background: linear-gradient(160deg, #F59E0B, #D97706);
  box-shadow: 0 30px 80px rgba(245, 158, 11, .45);
}
.badge-modal-item.team {
  background: rgba(255,255,255,.2);
  border: 1px solid rgba(255,255,255,.4);
}
.team-badge-mates {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin-top: 4px;
}
/* 金色漸層背景上，暗色系的等級色塊會糊掉，改用白底深字才看得清楚 */
.team-badge-modal .badge-tier-chip {
  background: rgba(255,255,255,.9);
}
.team-badge-modal .badge-tier-chip.tier-bronze { color: #92400E; }
.team-badge-modal .badge-tier-chip.tier-silver { color: #57534E; }
.team-badge-modal .badge-tier-chip.tier-gold   { color: #B45309; }
.team-badge-modal .badge-tier-chip.tier-legend { color: #C2410C; }
.badge-modal-confirm.team { color: #B45309; }

.badge-modal-fade-enter-active,
.badge-modal-fade-leave-active { transition: opacity .25s; }
.badge-modal-fade-enter-from,
.badge-modal-fade-leave-to { opacity: 0; }
</style>
<style scoped>
@media (min-width:768px){.result-page{max-width:600px}.banner-title{font-size:32px}.ms-stats{gap:14px}.stat-num{font-size:18px}.bottom-btns button{min-height:48px;font-size:16px}.section{padding-left:24px;padding-right:24px}}
@media (min-width:1024px){.result-page{max-width:768px}.my-score-card,.team-compare{margin-left:24px;margin-right:24px}.result-page>.section{margin-left:24px;margin-right:24px}.score-list{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.score-row{border-radius:12px}.bottom-btns{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding-left:24px;padding-right:24px}.bottom-btns button{width:100%}}
</style>
