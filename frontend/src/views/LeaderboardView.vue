<template>
  <div class="lb-page">
    <NavBar title="小組排行" />
    <div class="bg-blob bl1" aria-hidden="true"/>
    <div class="bg-blob bl2" aria-hidden="true"/>
    <div class="bg-blob bl3" aria-hidden="true"/>

    <!-- ══ 頂部 ══ -->
    <header class="top-bar">
      <button class="back-btn" @click="router.back()">←</button>
      <div class="top-center">
        <h1 class="top-title">小組排行</h1>
        <p class="top-sub">{{ className }} · 即時排行</p>
      </div>
      <button v-if="isExperimental" class="refresh-btn" @click="fetchData" :class="{ spinning: isLoading }">
        ↻
      </button>
    </header>

    <!-- ══ 對照組：完全沒有排行榜可看 ══ -->
    <div v-if="!isExperimental" class="locked-area">
      <div class="locked-icon">🔒</div>
      <p class="locked-title">這裡只有你自己看得到</p>
      <p class="locked-sub">
        你的成果用「自我超越徽章」記錄，不跟同學排名比較。
        <br/>去個人頁看看你收集了哪些徽章吧！
      </p>
      <button class="locked-btn" @click="router.push({ name: 'profile' })">
        查看我的徽章 →
      </button>
    </div>

    <template v-else>

      <!-- ══ 我的小組浮條 ══ -->
      <Transition name="slide-down">
        <div v-if="myEntry && myRank > 3" class="my-rank-bar">
          <span class="my-rank-num">#{{ myRank }}</span>
          <div class="my-rank-av" :style="{ background: myEntry.color }">
            {{ myEntry.group_name.charAt(0) }}
          </div>
          <span class="my-rank-name">{{ myEntry.group_name }}（我的小組）</span>
          <span class="my-rank-score">{{ currentScore(myEntry) }} 分</span>
        </div>
      </Transition>

      <!-- ══ 前三名 Podium ══ -->
      <div v-if="!isLoading && top3.length > 0" class="podium-area"
           :class="{ 'social-mode': activeTab === 'social' }">
        <!-- 第二名 -->
        <div v-if="top3[1]" class="podium-item podium-2">
          <div class="podium-avatar" :style="{ background: top3[1].color }">
            {{ top3[1].group_name.charAt(0) }}
          </div>
          <div class="podium-name">{{ top3[1].group_name }}</div>
          <div class="podium-score">{{ currentScore(top3[1]) }}</div>
          <div class="podium-stand stand-2">
            <span class="stand-medal">🥈</span>
            <span class="stand-rank">2</span>
          </div>
        </div>

        <!-- 第一名 -->
        <div v-if="top3[0]" class="podium-item podium-1">
          <div class="podium-crown">👑</div>
          <div class="podium-avatar av-1" :style="{ background: top3[0].color }">
            {{ top3[0].group_name.charAt(0) }}
          </div>
          <div class="podium-name">{{ top3[0].group_name }}</div>
          <div class="podium-score score-1">{{ currentScore(top3[0]) }}</div>
          <div class="podium-stand stand-1">
            <span class="stand-medal">🥇</span>
            <span class="stand-rank">1</span>
          </div>
        </div>

        <!-- 第三名 -->
        <div v-if="top3[2]" class="podium-item podium-3">
          <div class="podium-avatar" :style="{ background: top3[2].color }">
            {{ top3[2].group_name.charAt(0) }}
          </div>
          <div class="podium-name">{{ top3[2].group_name }}</div>
          <div class="podium-score">{{ currentScore(top3[2]) }}</div>
          <div class="podium-stand stand-3">
            <span class="stand-medal">🥉</span>
            <span class="stand-rank">3</span>
          </div>
        </div>
      </div>

      <!-- ══ 完整排行列表 ══ -->
      <div class="list-area" :class="{ 'social-mode': activeTab === 'social' }">

        <!-- 載入中 -->
        <div v-if="isLoading" class="loading-wrap">
          <div class="spinner"/>
          <p>載入排行中…</p>
        </div>

        <!-- 列表 -->
        <div v-else class="rank-list">
          <div
            v-for="(entry, idx) in rankedList"
            :key="entry.group_id"
            class="rank-row"
            :class="{
              'is-me':     entry.group_id === authStore.user?.group_id,
              'rank-gold':   idx === 0,
              'rank-silver': idx === 1,
              'rank-bronze': idx === 2,
            }"
          >
            <!-- 名次 -->
            <div class="rank-num">
              <span v-if="idx < 3" class="rank-medal">
                {{ ['🥇','🥈','🥉'][idx] }}
              </span>
              <span v-else class="rank-plain">{{ idx + 1 }}</span>
            </div>

            <!-- 頭像 -->
            <div class="rank-av" :style="{ background: entry.color }">
              {{ entry.group_name.charAt(0) }}
            </div>

            <!-- 名字 & 人數 -->
            <div class="rank-info">
              <div class="rank-name">
                {{ entry.group_name }}
                <span v-if="entry.group_id === authStore.user?.group_id" class="me-chip">我的小組</span>
              </div>
              <div class="rank-group">
                {{ entry.member_count }} 人
              </div>
            </div>

            <!-- 分數 & 進度條 -->
            <div class="rank-score-col">
              <div class="rank-score-num">{{ currentScore(entry) }}</div>
              <div class="rank-bar">
                <div
                  class="rank-bar-fill"
                  :class="activeTab === 'system' ? 'fill-sys' : 'fill-soc'"
                  :style="{ width: scoreBarWidth(entry) + '%' }"
                />
              </div>
            </div>

          </div>
        </div>
      </div>

    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'
import NavBar from '@/components/NavBar.vue'

const router    = useRouter()
const authStore = useAuthStore()

// ── 對照組完全看不到排行榜（PDF 設計：私有化顯示、無排名） ──
const isExperimental = computed(
  () => authStore.user?.experiment_group === 'experimental'
)

// ── Tab（現在只剩小組能量條一種，學姊簡報沒有小組社群分這個維度，
// 2026-09-16 拿掉整個社群互評功能後這裡只留系統分） ──────────
const visibleTabs = [
  { id: 'system', label: '小組能量條', icon: '⚡' },
]
const activeTab = ref('system')

// ── 資料（現在是「組」不是「人」） ─────────────────────────
const entries   = ref([])  // [{group_id, group_name, total_score, member_count, color}]
const className = ref('五年甲班')
const isLoading = ref(false)

const COLORS = [
  '#FF8C00','#FF6B35','#FF6B35','#F59E0B',
  '#4CAF50','#FF8C00','#EF4444','#FFB300',
  '#F97316','#FF7A00','#FFB300','#8BC34A',
]

// ── 計算 ────────────────────────────────────────────────
// 2026-09-25：改排「小組能量值」（energy_score，排除當天請假組員後的在場組員
// 平均分），不是原本不分請假與否直接加總的 total_score——跟學姊確認過的算法
function currentScore(entry) {
  return entry.energy_score
}

const rankedList = computed(() => {
  return [...entries.value].sort((a, b) => currentScore(b) - currentScore(a))
})

const top3 = computed(() => rankedList.value.slice(0, 3))

const myEntry = computed(() =>
  rankedList.value.find(e => e.group_id === authStore.user?.group_id) ?? null
)

const myRank = computed(() => {
  const idx = rankedList.value.findIndex(
    e => e.group_id === authStore.user?.group_id
  )
  return idx + 1
})

const maxScore = computed(() =>
  Math.max(...rankedList.value.map(e => currentScore(e)), 1)
)
function scoreBarWidth(entry) {
  return Math.round((currentScore(entry) / maxScore.value) * 100)
}

// ── 取資料 ───────────────────────────────────────────────
// 小組即時總分沿用大字報同一支 API（group_realtime_scores VIEW），
// 學生端要帶自己的 class_id——這支 API 原本是設計給教師後台呼叫的，
// 沒帶 class_id 時只會 fallback 去找「這個 user_id 名下的班級」，
// 對學生帳號來說找不到東西，一定要自己帶 class_id
async function fetchData() {
  if (!isExperimental.value) return
  isLoading.value = true
  try {
    const { data } = await api.get('/game/group-scores', {
      params: { class_id: authStore.user?.class_id }
    })
    className.value = authStore.user?.class_name ?? className.value
    entries.value   = (data.groups ?? []).map((g, i) => ({
      ...g,
      total_score:      Number(g.total_score) || 0,
      energy_score:     Number(g.energy_score) || 0,
      color:            COLORS[i % COLORS.length],
    }))
  } catch {
    loadMock()
  } finally {
    isLoading.value = false
  }
}

function loadMock() {
  className.value = '五年甲班'
  entries.value = [
    { group_id:1, group_name:'A組', total_score:820, energy_score:205, member_count:4, color:'#FF8C00' },
    { group_id:2, group_name:'B組', total_score:640, energy_score:160, member_count:4, color:'#F59E0B' },
    { group_id:3, group_name:'C組', total_score:410, energy_score:137, member_count:3, color:'#4CAF50' },
  ]
}

onMounted(fetchData)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

.lb-page {
  font-family: 'Nunito', sans-serif;
  background: #3D2B00;
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  padding-bottom: 32px;
  position: relative;
  overflow: hidden;
}
.bg-blob {
  position: absolute; border-radius: 50%;
  filter: blur(80px); opacity: .1; pointer-events: none;
}
.bl1 { width:300px;height:300px;background:#FF8C00;top:-80px;right:-80px }
.bl2 { width:220px;height:220px;background:#F59E0B;bottom:300px;left:-70px }
.bl3 { width:160px;height:160px;background:#FF6B35;top:50%;right:-40px }

/* ── 頂部 ── */
.top-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px 12px;
  background: rgba(255,255,255,.03);
  border-bottom: 1px solid rgba(255,255,255,.07);
  position: sticky; top: 0; z-index: 10;
}
.back-btn, .refresh-btn {
  width: 36px; height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.05);
  color: rgba(255,255,255,.7);
  font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all .2s;
}
.back-btn:hover, .refresh-btn:hover { background: rgba(255,255,255,.1); }
.refresh-btn.spinning { animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.top-center { flex: 1; text-align: center; }
.top-title  { font-size: 16px; font-weight: 900; color: #fff; margin: 0; }
.top-sub    { font-size: 11px; color: rgba(255,255,255,.4); margin: 0; }

/* ── 對照組鎖住的空狀態 ── */
.locked-area {
  display: flex; flex-direction: column; align-items: center;
  text-align: center;
  padding: 64px 32px;
  position: relative; z-index: 1;
}
.locked-icon { font-size: 48px; margin-bottom: 14px; }
.locked-title { font-size: 16px; font-weight: 800; color: #fff; margin: 0 0 8px; }
.locked-sub { font-size: 13px; color: rgba(255,255,255,.5); line-height: 1.6; margin: 0 0 20px; }
.locked-btn {
  padding: 12px 28px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #FF8C00, #FF6B35);
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform .15s;
}
.locked-btn:hover { transform: translateY(-1px); }

/* ── Tab ── */
.tab-bar {
  display: flex; gap: 6px;
  padding: 12px 16px 0;
  position: relative; z-index: 1;
}
.tab-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 10px; border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  font-family: 'Nunito', sans-serif;
  font-size: 13px; font-weight: 700;
  color: rgba(255,255,255,.45); cursor: pointer;
  transition: all .18s;
}
.tab-btn.active {
  background: rgba(255,140,0,.2);
  border-color: #FF8C00;
  color: #FFCC80;
}
.tab-btn.active-social {
  background: rgba(255,107,53,.2);
  border-color: #FF6B35;
  color: #FFCC99;
}
.tab-icon { font-size: 15px; }

/* ── 我的浮條 ── */
.my-rank-bar {
  margin: 10px 16px 0;
  background: rgba(255,140,0,.18);
  border: 1.5px solid rgba(255,140,0,.4);
  border-radius: 12px;
  padding: 9px 13px;
  display: flex; align-items: center; gap: 9px;
  position: relative; z-index: 1;
}
.my-rank-num {
  font-size: 13px; font-weight: 900; color: #FFCC80;
  min-width: 28px;
}
.my-rank-av {
  width: 28px; height: 28px; border-radius: 50%;
  color: #fff; font-size: 12px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.my-rank-name { flex: 1; font-size: 13px; font-weight: 700; color: #fff; }
.my-rank-score {
  font-size: 14px; font-weight: 900; color: #FBBF24;
}
.slide-down-enter-active { transition: all .3s ease; }
.slide-down-leave-active { transition: all .2s ease; }
.slide-down-enter-from   { transform: translateY(-10px); opacity: 0; }
.slide-down-leave-to     { transform: translateY(-10px); opacity: 0; }

/* ── 社群排行強調橫幅 ── */
.social-emphasis-banner {
  margin: 10px 16px 0;
  background: linear-gradient(135deg, #FF6B35, #E64A19);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  text-align: center;
  padding: 10px 14px;
  border-radius: 14px;
  box-shadow: 0 6px 16px rgba(255,107,53,.3);
  position: relative; z-index: 1;
}

/* ── 社群模式主題色（把系統分排行的靛紫換成社群分的粉紅） ── */
.social-mode .stand-1 { background: linear-gradient(180deg,#FF6B35,#E64A19); }
.social-mode .stand-2 { background: linear-gradient(180deg,#FFAB73,#FF6B35); }
.social-mode .stand-3 { background: linear-gradient(180deg,#FFE0B2,#FFCC99); }
.social-mode .score-1 { color: #FFAB73; }
.social-mode.list-area .rank-row.is-me {
  background: rgba(255,107,53,.14);
  border-color: rgba(255,107,53,.35);
}
.social-mode.list-area .rank-row.rank-gold   { border-color: rgba(255,107,53,.35); }
.social-mode.list-area .rank-row.rank-silver { border-color: rgba(255,171,115,.3); }
.social-mode.list-area .rank-row.rank-bronze { border-color: rgba(255,224,178,.4); }

/* ── Podium ── */
.podium-area {
  display: flex; align-items: flex-end; justify-content: center;
  gap: 6px; padding: 20px 16px 0;
  position: relative; z-index: 1;
}
.podium-item {
  display: flex; flex-direction: column; align-items: center;
  flex: 1;
}
.podium-crown { font-size: 22px; margin-bottom: 4px; }
.podium-avatar {
  border-radius: 50%; color: #fff;
  font-weight: 800; display: flex;
  align-items: center; justify-content: center;
  border: 2.5px solid rgba(255,255,255,.3);
  margin-bottom: 5px;
}
.podium-1 .podium-avatar, .av-1 { width: 56px; height: 56px; font-size: 22px; }
.podium-2 .podium-avatar,
.podium-3 .podium-avatar         { width: 44px; height: 44px; font-size: 18px; }
.podium-name {
  font-size: 12px; font-weight: 800; color: #fff;
  text-align: center; margin-bottom: 2px;
  max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.podium-score {
  font-size: 12px; font-weight: 700; color: rgba(255,255,255,.55);
  margin-bottom: 6px;
}
.score-1 { color: #FBBF24; font-size: 14px; font-weight: 900; }
.podium-stand {
  width: 100%; border-radius: 10px 10px 0 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 10px 0 6px; gap: 2px;
}
.stand-1 { background: linear-gradient(180deg,#F59E0B,#D97706); min-height: 70px; }
.stand-2 { background: linear-gradient(180deg,#A6842E,#8B6914); min-height: 50px; }
.stand-3 { background: linear-gradient(180deg,#CD7C3A,#B45309); min-height: 35px; }
.stand-medal { font-size: 18px; }
.stand-rank  { font-size: 11px; font-weight: 900; color: rgba(255,255,255,.8); }

/* ── 列表 ── */
.list-area { padding: 14px 16px 0; position: relative; z-index: 1; }
.loading-wrap {
  display: flex; flex-direction: column; align-items: center;
  padding: 40px; gap: 12px; color: rgba(255,255,255,.4);
}
.spinner {
  width: 32px; height: 32px;
  border: 3px solid rgba(255,255,255,.1);
  border-top-color: #FF8C00;
  border-radius: 50%; animation: spin .8s linear infinite;
}

.rank-list { display: flex; flex-direction: column; gap: 7px; }
.rank-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 14px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  transition: all .15s;
}
.rank-row.is-me {
  background: rgba(255,140,0,.14);
  border-color: rgba(255,140,0,.35);
}
.rank-row.rank-gold   { border-color: rgba(245,158,11,.35); }
.rank-row.rank-silver { border-color: rgba(166,132,46,.25); }
.rank-row.rank-bronze { border-color: rgba(180,83,9,.3);    }

.rank-num { width: 30px; flex-shrink: 0; text-align: center; }
.rank-medal { font-size: 20px; }
.rank-plain { font-size: 13px; font-weight: 700; color: rgba(255,255,255,.4); }

.rank-av {
  width: 34px; height: 34px; border-radius: 50%;
  color: #fff; font-size: 14px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.rank-info  { flex: 1; min-width: 0; }
.rank-name  {
  font-size: 13px; font-weight: 800; color: #fff;
  display: flex; align-items: center; gap: 4px;
  margin-bottom: 2px;
}
.me-chip {
  font-size: 9px; background: #FF8C00; color: #fff;
  padding: 1px 5px; border-radius: 5px; font-weight: 700;
}
.rank-group {
  display: flex; align-items: center; gap: 4px;
  font-size: 10px; color: rgba(255,255,255,.4);
}

.rank-score-col {
  display: flex; flex-direction: column;
  align-items: flex-end; gap: 4px; flex-shrink: 0; min-width: 52px;
}
.rank-score-num { font-size: 15px; font-weight: 900; color: #fff; line-height: 1; }
.rank-bar {
  width: 52px; height: 4px;
  background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden;
}
.rank-bar-fill {
  height: 100%; border-radius: 2px; transition: width .5s ease;
}
.fill-sys { background: linear-gradient(90deg,#FF8C00,#FF6B35); }
.fill-soc { background: linear-gradient(90deg,#FF6B35,#E64A19); }
</style>
<style scoped>
@media (min-width:768px){.lb-page{max-width:600px}.top-title{font-size:20px}.tab-btn{min-height:48px;font-size:16px}.rank-row{min-height:58px}.player-name{font-size:16px}}
@media (min-width:1024px){.lb-page{max-width:768px}.podium{margin-left:24px;margin-right:24px}.rank-list{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:0 24px}.rank-row{border-radius:14px}.tab-row{padding-left:24px;padding-right:24px}}
</style>
