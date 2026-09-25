<template>
  <div class="home-page">
    <div class="bg-blob b1" aria-hidden="true"/>
    <div class="bg-blob b2" aria-hidden="true"/>
    <div class="bg-blob b3" aria-hidden="true"/>

    <!-- ══ 頂部使用者資訊 ══ -->
    <header class="user-header">
      <div class="user-left">
        <div class="avatar" @click="router.push({ name: 'profile' })">
          {{ authStore.user?.nickname?.charAt(0) ?? '?' }}
        </div>
        <div class="user-info">
          <p class="user-name">{{ authStore.user?.nickname ?? '玩家' }}</p>
          <p class="user-meta">
            {{ authStore.user?.group_name ?? 'A 組' }} ·
            {{ authStore.user?.class_name ?? '五年甲班' }}
          </p>
        </div>
      </div>
      <div class="score-chips">
        <div class="chip chip-sys">⚡ {{ authStore.user?.system_score ?? 0 }}</div>
      </div>
    </header>

    <!-- ══ 歡迎橫幅 ══ -->
    <div class="welcome-banner">
      <div class="banner-left">
        <p class="banner-greeting">{{ greeting }}，{{ authStore.user?.nickname }}！</p>
        <p class="banner-sub">今天也要努力學習英文喔 💪</p>
      </div>
      <div class="banner-icon">🎮</div>
    </div>

    <!-- ══ 主要功能按鈕 ══ -->
    <div class="main-btns">
      <!-- 學習區 -->
      <button class="main-btn btn-learn" @click="router.push({ name: 'game' })">
        <div class="btn-icon">📚</div>
        <div class="btn-info">
          <p class="btn-title">學習區</p>
          <p class="btn-sub">單字複習 · 練習</p>
        </div>
        <div class="btn-arrow">→</div>
      </button>

      <!-- 開始挑戰 -->
      <button class="main-btn btn-pk" @click="router.push({ name: 'challenge' })">
        <div class="btn-icon">⚔️</div>
        <div class="btn-info">
          <p class="btn-title">開始挑戰</p>
          <p class="btn-sub">PK 對戰 · 贏得分數</p>
        </div>
        <div class="btn-arrow">→</div>
      </button>

      <!-- 小組排行（只有實驗組看得到，對照組沒有這個入口） -->
      <button v-if="isExperimental" class="main-btn btn-rank" @click="router.push({ name: 'leaderboard' })">
        <div class="btn-icon">🏆</div>
        <div class="btn-info">
          <p class="btn-title">小組排行</p>
          <p class="btn-sub">看看大家的小組能量條</p>
        </div>
        <div class="btn-arrow">→</div>
      </button>

    </div>

    <!-- ══ 獎章牆（最近獲得） ══ -->
    <div class="section">
      <div class="sec-header">
        <span class="sec-title">🎖️ 我的獎章</span>
        <button class="sec-more" @click="router.push({ name: 'profile' })">查看全部 →</button>
      </div>
      <div v-if="recentBadges.length > 0">
        <div v-if="personalRecentBadges.length > 0" class="badge-row">
          <div v-for="b in personalRecentBadges" :key="b.badge_id" class="badge-item" :class="`tier-${b.badge_tier}`" :title="`${b.badge_name}：${b.condition_desc}`">
            <span class="badge-emoji">{{ b.icon_emoji }}</span>
            <span class="badge-name">{{ b.badge_name }}</span>
          </div>
        </div>
        <div v-if="teamRecentBadges.length > 0" class="team-badge-block">
          <p class="team-badge-subtitle">🤝 小組共同獎章 · 與你的組員一起努力達成！</p>
          <div class="badge-row">
            <div v-for="b in teamRecentBadges" :key="b.badge_id" class="badge-item team" :class="`tier-${b.badge_tier}`" :title="`${b.badge_name}：${b.condition_desc}`">
              <span class="badge-emoji">{{ b.icon_emoji }}</span>
              <span class="badge-name">{{ b.badge_name }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-badges">
        <p>完成 PK 挑戰來獲得第一個獎章！</p>
      </div>
    </div>

    <!-- ══ 登出按鈕 ══ -->
    <div class="logout-area">
      <button class="logout-btn" @click="logout">登出</button>
      <!-- 系統版本資訊 -->
      <p class="version-txt">英語小勇士 v1.0 · 五年甲班</p>
    </div>

    <!-- ══ 新獎章提醒 toast ══ -->
    <!-- 大部分獎章在 PK 結果頁就看過了（社群類還有全螢幕彈窗），這裡主要
         是補「週排程發放、沒經過結果頁」的獎章（不敗王者/全班守護者）。
         2026-09-23：改成一次一張、排隊輪播——一次拿到好幾個等級（例如小組
         共同獎章一次跨好幾級）時，每一張都要自己跳出來、寫清楚是拿到哪個
         等級、達成了什麼條件，不會被合併成「OOO 等 N 個」看不出細節 -->
    <Transition name="badge-toast-slide">
      <div v-if="currentToastBadge" :key="currentToastBadge.badge_id" class="badge-toast" @click="goProfileFromToast">
        <span class="badge-toast-emoji">{{ currentToastBadge.icon_emoji }}</span>
        <div class="badge-toast-body">
          <p class="badge-toast-title">🎉 {{ tierLabel(currentToastBadge.badge_tier) }}獎章解鎖！</p>
          <p class="badge-toast-sub">{{ currentToastBadge.badge_name }}</p>
          <p class="badge-toast-cond">達成條件：{{ currentToastBadge.condition_desc }}</p>
        </div>
        <span v-if="toastQueue.length > 1" class="badge-toast-queue">+{{ toastQueue.length - 1 }}</span>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'
const router    = useRouter()
const authStore = useAuthStore()

const isExperimental = computed(
  () => authStore.user?.experiment_group === 'experimental'
)

// ── 問候語 ────────────────────────────────────────────────
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return '早安'
  if (h < 17) return '午安'
  return '晚安'
})

// ── 獎章 ─────────────────────────────────────────────────
const recentBadges = ref([])
const toastQueue    = ref([])  // 還沒播放過的新獎章，一次跳一張
const toastTimer    = ref(null)

const currentToastBadge = computed(() => toastQueue.value[0] ?? null)

function tierLabel(tier) {
  return { bronze: '銅級', silver: '銀級', gold: '金級', legend: '傳說' }[tier] ?? tier
}

// 小組共同獎章要跟個人獎章分開顯示，讓學生知道哪些是自己拿的、
// 哪些是跟組員一起拿的
const personalRecentBadges = computed(() =>
  recentBadges.value.filter(b => b.badge_category !== 'social_team')
)
const teamRecentBadges = computed(() =>
  recentBadges.value.filter(b => b.badge_category === 'social_team')
)

// 排隊輪播：每張 toast 停留 3.2 秒後自動換下一張，全部播完才消失
function advanceToastQueue() {
  clearTimeout(toastTimer.value)
  if (toastQueue.value.length === 0) return
  toastTimer.value = setTimeout(() => {
    toastQueue.value = toastQueue.value.slice(1)
    advanceToastQueue()
  }, 3200)
}

async function fetchUnackBadges() {
  try {
    const { data } = await api.get('/badges/unacknowledged')
    const badges = data.badges ?? []
    if (badges.length === 0) return

    // 同一個等級只留一張（保險，理論上後端不會回傳重複的 badge_id）
    // 依銅→銀→金→傳說排序，讓小朋友照解鎖順序看到，比較有「升級」的感覺
    const tierRank = { bronze: 0, silver: 1, gold: 2, legend: 3 }
    toastQueue.value = [...badges].sort(
      (a, b) => (tierRank[a.badge_tier] ?? 9) - (tierRank[b.badge_tier] ?? 9)
    )

    // toast 是輕量提醒，看到就算數，不用像社群彈窗一樣要點「收下」才消失
    api.post('/badges/acknowledge', {
      badge_ids: badges.map(b => b.badge_id)
    }).catch(() => {})

    advanceToastQueue()
  } catch {}
}
function goProfileFromToast() {
  router.push({ name: 'profile' })
}

// ── 登出 ─────────────────────────────────────────────────
function logout() {
  authStore.logout()
  router.push({ name: 'login' })
}

// ── 取資料 ───────────────────────────────────────────────
async function fetchData() {
  try {
    const { data } = await api.get(
      `/badges/user/${authStore.user?.user_id}`
    )
    // 同一家族只留最高等級，跟個人頁獎章牆一致
    const rank = { bronze: 0, silver: 1, gold: 2, legend: 3 }
    const best = new Map()
    for (const b of (data.badges ?? []).filter(x => x.earned)) {
      const cur = best.get(b.badge_name)
      if (!cur || (rank[b.badge_tier] ?? 0) > (rank[cur.badge_tier] ?? 0)) best.set(b.badge_name, b)
    }
    recentBadges.value = [...best.values()].slice(0, 5)
  } catch {}
}

onMounted(() => {
  fetchData()
  fetchUnackBadges()
})
onUnmounted(() => clearTimeout(toastTimer.value))
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

.home-page {
  font-family: 'Nunito', sans-serif;
  background: #F0F7FF;
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  padding-bottom: 40px;
  position: relative;
  overflow: hidden;
}

/* 背景裝飾 */
.bg-blob { position:absolute;border-radius:50%;filter:blur(70px);opacity:.08;pointer-events:none; }
.b1 { width:280px;height:280px;background:#FF8C00;top:-80px;right:-80px; }
.b2 { width:200px;height:200px;background:#F59E0B;bottom:200px;left:-60px; }
.b3 { width:150px;height:150px;background:#FF6B35;top:45%;right:-40px; }

/* ── 頂部使用者 ── */
.user-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  background: #fff;
  border-bottom: 2px solid #E8F0FE;
  position: sticky;
  top: 0;
  z-index: 10;
}
.user-left { display:flex;align-items:center;gap:10px; }
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg,#FF8C00,#FF6B35);
  color: #fff;
  font-size: 18px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(255,140,0,.3);
}
.user-name { font-size:15px;font-weight:800;color:#3D2B00;margin-bottom:1px; }
.user-meta { font-size:11px;color:#A6842E; }
.score-chips { display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end; }
.chip { font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px; }
.chip-sys { background:#FFF7ED;color:#C2410C; }

/* ── 歡迎橫幅 ── */
.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 14px 16px;
  background: linear-gradient(135deg, #FF8C00 0%, #FF6B35 100%);
  border-radius: 20px;
  padding: 18px 20px;
  position: relative;
  z-index: 1;
}
.banner-greeting { font-size:16px;font-weight:900;color:#fff;margin-bottom:4px; }
.banner-sub { font-size:12px;color:rgba(255,255,255,.75); }
.banner-icon { font-size:40px; }

/* ── 主要按鈕 ── */
.main-btns {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 16px;
  position: relative;
  z-index: 1;
}
.main-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  border: none;
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  text-align: left;
  transition: all .2s;
  box-shadow: 0 4px 14px rgba(0,0,0,.08);
}
.main-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,.12); }
.main-btn:active { transform: scale(.98); }

.btn-learn { background: linear-gradient(135deg, #FFF3E0, #FFE0B2); }
.btn-pk    { background: linear-gradient(135deg, #FFF7ED, #FEF3C7); }
.btn-rank  { background: linear-gradient(135deg, #FFF3E0, #FFD9A0); }

.btn-icon { font-size: 28px; flex-shrink: 0; }
.btn-info { flex: 1; }
.btn-title { font-size:15px;font-weight:800;color:#3D2B00;margin-bottom:2px; }
.btn-sub   { font-size:11px;color:#8B6914; }
.btn-arrow { font-size:18px;color:#A6842E;font-weight:700; }

/* ── Section ── */
.section {
  margin: 16px 16px 0;
  background: #fff;
  border-radius: 18px;
  border: 1.5px solid #FFE0B2;
  padding: 14px 16px;
  position: relative;
  z-index: 1;
}
.sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.sec-title { font-size:14px;font-weight:800;color:#3D2B00; }
.sec-more  { font-size:12px;color:#FF8C00;font-weight:700;background:none;border:none;cursor:pointer; }


/* ── 獎章 ── */
.badge-row { display:flex;gap:10px;flex-wrap:wrap; }
.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: #FFFBF0;
  border-radius: 12px;
  border: 1.5px solid #FFE0B2;
  padding: 10px 12px;
  min-width: 60px;
}
.badge-emoji {
  font-size: 24px;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
} 
.badge-name  { font-size: 10px; font-weight: 700; color: #5C4300; text-align: center; }
.team-badge-block { margin-top: 12px; }
.team-badge-subtitle {
  font-size: 12px;
  font-weight: 700;
  color: #B45309;
  margin: 0 0 8px;
}
.badge-item.team {
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
  border: 1.5px solid #F59E0B;
}
/* 銅／銀／金／傳說用明顯不同的顏色區分（放在 .team 後面，等級色優先） */
.badge-item.tier-bronze { background: linear-gradient(160deg,#F6D9B8,#E2A66B); border: 2px solid #CD7F32; }
.badge-item.tier-silver { background: linear-gradient(160deg,#F1F5F9,#CBD5E1); border: 2px solid #94A3B8; }
.badge-item.tier-gold   { background: linear-gradient(160deg,#FFF3B0,#FFC629); border: 2px solid #E6A100; }
.badge-item.tier-legend { background: linear-gradient(160deg,#E9D5FF,#F9A8D4); border: 2px solid #A855F7; }
.empty-badges {
  text-align: center;
  padding: 12px;
  font-size: 13px;
  color: #A6842E;
}

/* ── 登出 ── */
.logout-area {
  margin: 20px 16px 0;
  text-align: center;
  position: relative;
  z-index: 1;
}
.logout-btn {
  padding: 10px 28px;
  border-radius: 20px;
  border: 1.5px solid #FFE0B2;
  background: #FFFBF0;
  font-family: 'Nunito', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #A6842E;
  cursor: pointer;
  transition: all .15s;
  margin-bottom: 8px;
}
.logout-btn:hover { border-color:#EF4444;color:#EF4444; }
.version-txt { font-size:11px;color:#E8D5B7; }

/* ── 新獎章 toast ── */
.badge-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 9999;
  width: calc(100% - 32px);
  max-width: 420px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #F59E0B, #FF6B35);
  color: #fff;
  padding: 14px 16px;
  border-radius: 18px;
  box-shadow: 0 12px 32px rgba(255,107,53,.4);
  cursor: pointer;
}
.badge-toast-emoji {
  font-size: 30px;
  flex-shrink: 0;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
}
.badge-toast-body { flex: 1; min-width: 0; }
.badge-toast-title { font-size: 13px; font-weight: 900; margin: 0 0 2px; }
.badge-toast-sub { font-size: 13px; font-weight: 800; opacity: .95; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge-toast-cond { font-size: 11px; opacity: .85; margin: 3px 0 0; line-height: 1.4; }
.badge-toast-queue {
  flex-shrink: 0; font-size: 11px; font-weight: 800;
  background: rgba(255,255,255,.25); border-radius: 999px; padding: 3px 8px;
}

.badge-toast-slide-enter-active { transition: all .35s cubic-bezier(.34,1.56,.64,1); }
.badge-toast-slide-leave-active { transition: all .25s ease; }
.badge-toast-slide-enter-from,
.badge-toast-slide-leave-to { transform: translateX(-50%) translateY(30px); opacity: 0; }
</style>
<style scoped>
@media (min-width:768px){.home-page{max-width:600px;padding-bottom:56px}.main-btn{min-height:76px}.btn-title,.sec-title{font-size:16px}.badge-row{justify-content:center}}
@media (min-width:1024px){.home-page{max-width:768px}.main-btns,.section{margin-left:24px;margin-right:24px}.main-btns{display:grid;grid-template-columns:repeat(3,1fr)}.main-btn{height:100%;flex-direction:column;text-align:center}.btn-arrow{display:none}}
</style>
