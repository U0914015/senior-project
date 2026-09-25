<template>
  <div class="profile-page">
    <NavBar title="個人頁" />
    <div class="bg-blob bl1" aria-hidden="true"/>
    <div class="bg-blob bl2" aria-hidden="true"/>

    <!-- ══ 頂部導覽 ══ -->
    <header class="top-bar">
      <button class="back-btn" @click="router.back()">←</button>
      <span class="top-title">{{ isMe ? '我的個人頁' : '玩家資訊' }}</span>
      <div style="width:36px"/>
    </header>

    <!-- ══ 載入中 ══ -->
    <div v-if="isLoading" class="loading-wrap">
      <div class="spinner"/>
    </div>

    <template v-else>

      <!-- ══ 個人資訊卡 ══ -->
      <div class="hero-card">
        <!-- 頭像 & 基本資料 -->
        <div class="hero-top">
          <div class="avatar-wrap">
            <div class="avatar" :style="{ background: avatarColor }">
              {{ profile.nickname?.charAt(0) }}
            </div>
            <div v-if="profile.is_leader" class="leader-crown">👑</div>
          </div>
          <div class="hero-info">
            <div class="hero-name">
              {{ profile.nickname }}
              <span v-if="isMe" class="me-tag">我</span>
            </div>
            <div class="hero-group">
              <span class="group-dot" :style="{ background: groupColor }"/>
              {{ profile.group_name }} · {{ profile.class_name }}
            </div>
            <div class="hero-role-tag" v-if="profile.is_leader">組長</div>
          </div>
          <!-- 排名 -->
          <div class="hero-rank">
            <span class="rank-num">#{{ profile.class_rank }}</span>
            <span class="rank-lbl">班級排名</span>
          </div>
        </div>

        <!-- 分數總覽：社群分/總分是已經拿掉的社群互評功能殘留，2026-09-25 跟學姊
             確認後拿掉，只留答題分數 -->
        <div class="score-row">
          <div class="score-item sys">
            <span class="score-icon">⚡</span>
            <span class="score-val">{{ profile.system_score }}</span>
            <span class="score-lbl">答題分數</span>
          </div>
        </div>
      </div>

      <!-- ══ 答題數據 ══ -->
      <div class="section">
        <div class="sec-tag">📊 答題數據</div>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-icon">🎯</span>
            <span class="stat-val">{{ profile.total_games }}</span>
            <span class="stat-lbl">PK 場次</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">✅</span>
            <span class="stat-val">{{ profile.correct_count }}</span>
            <span class="stat-lbl">答對題數</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">📈</span>
            <span class="stat-val">{{ profile.accuracy }}%</span>
            <span class="stat-lbl">正確率</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">⚡</span>
            <span class="stat-val">{{ profile.avg_response_time }}s</span>
            <span class="stat-lbl">平均秒數</span>
          </div>
        </div>

        <!-- 正確率進度條 -->
        <div class="accuracy-bar-wrap">
          <div class="accuracy-label">
            <span>正確率</span>
            <span class="accuracy-val">{{ profile.accuracy }}%</span>
          </div>
          <div class="accuracy-bar">
            <div class="accuracy-fill"
                 :style="{ width: profile.accuracy + '%' }"
                 :class="accuracyClass"/>
          </div>
        </div>
      </div>

      <!-- ══ 獎章牆 ══ -->
      <div class="section">
        <div class="sec-header-row">
          <div class="sec-tag">🎖️ 獎章牆</div>
          <span class="sec-count">{{ earnedBadges.length }} / {{ badgeFamilies.size }}</span>
        </div>

        <!-- 個人獎章 -->
        <div v-if="earnedPersonalBadges.length > 0" class="badge-subsection">
          <p class="badge-subsection-title">⚡ 個人獎章</p>
          <div class="badge-grid">
            <div
              v-for="b in earnedPersonalBadges"
              :key="b.badge_id"
              class="badge-card earned"
              :class="`tier-${b.badge_tier}`"
              role="button"
              tabindex="0"
              @click="openBadgeDetail(b)"
              @keydown.enter="openBadgeDetail(b)"
            >
              <span class="badge-emoji">{{ b.icon_emoji }}</span>
              <span class="badge-name">{{ b.badge_name }}</span>
              <span class="badge-tier-label" :class="`tier-${b.badge_tier}`">{{ tierLabel(b.badge_tier) }}</span>
              <span class="badge-hint">{{ nextHint(b) }}</span>
            </div>
          </div>
        </div>

        <!-- 小組共同獎章：跟個人獎章分開顯示，卡片下方標出跟誰一起拿到的 -->
        <div v-if="earnedTeamBadges.length > 0" class="badge-subsection team">
          <p class="badge-subsection-title team">🤝 小組共同獎章</p>
          <div class="badge-grid">
            <div
              v-for="b in earnedTeamBadges"
              :key="b.badge_id"
              class="badge-card earned team"
              :class="`tier-${b.badge_tier}`"
              role="button"
              tabindex="0"
              @click="openBadgeDetail(b)"
              @keydown.enter="openBadgeDetail(b)"
            >
              <span class="badge-emoji">{{ b.icon_emoji }}</span>
              <span class="badge-name">{{ b.badge_name }}</span>
              <span class="badge-tier-label" :class="`tier-${b.badge_tier}`">{{ tierLabel(b.badge_tier) }}</span>
              <span v-if="groupMemberNames" class="badge-team-mates">
                與 {{ groupMemberNames }} 一起獲得 ✨
              </span>
              <span class="badge-hint">{{ nextHint(b) }}</span>
            </div>
          </div>
        </div>

        <!-- 未解鎖：跟已解鎖一樣拆成「個人」／「共同」兩塊，實驗組學生才會清楚看到
             共同獎章的存在跟怎麼解鎖，不會因為還沒拿過共同獎章就完全看不到這個分類 -->
        <div v-if="lockedPersonalBadges.length > 0" class="locked-section">
          <p class="locked-title">⚡ 個人獎章・未解鎖</p>
          <div class="badge-grid">
            <div
              v-for="b in lockedPersonalBadges"
              :key="b.badge_id"
              class="badge-card locked"
              role="button"
              tabindex="0"
              @click="openBadgeDetail(b)"
              @keydown.enter="openBadgeDetail(b)"
            >
              <span class="badge-emoji locked-emoji">🔒</span>
              <span class="badge-name locked-name">{{ b.badge_name }}</span>
              <span class="badge-tier-label locked-tier" :class="`tier-${b.badge_tier}`">{{ tierLabel(b.badge_tier) }}</span>
              <span class="badge-cond">{{ b.condition_desc }}</span>
            </div>
          </div>
        </div>

        <div v-if="lockedTeamBadges.length > 0" class="locked-section team">
          <p class="locked-title team">🤝 小組共同獎章・未解鎖</p>
          <div class="badge-grid">
            <div
              v-for="b in lockedTeamBadges"
              :key="b.badge_id"
              class="badge-card locked"
              role="button"
              tabindex="0"
              @click="openBadgeDetail(b)"
              @keydown.enter="openBadgeDetail(b)"
            >
              <span class="badge-emoji locked-emoji">🔒</span>
              <span class="badge-name locked-name">{{ b.badge_name }}</span>
              <span class="badge-tier-label locked-tier" :class="`tier-${b.badge_tier}`">{{ tierLabel(b.badge_tier) }}</span>
              <span class="badge-cond">{{ b.condition_desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ 近期答題紀錄 ══ -->
      <div class="section">
        <div class="sec-tag">📋 近期 PK 紀錄</div>
        <div v-if="recentGames.length === 0" class="empty-txt">
          還沒有答題紀錄
        </div>
        <div v-else class="game-list">
          <div
            v-for="g in recentGames"
            :key="g.session_id"
            class="game-row"
            :class="g.result"
          >
            <div class="game-left">
              <div class="game-result-icon">
                {{ g.result === 'win' ? '🏆' : g.result === 'draw' ? '🤝' : '💪' }}
              </div>
              <div class="game-info">
                <div class="game-vs">
                  vs {{ g.opponent_group }}
                </div>
                <div class="game-meta">
                  {{ levelLabel(g.level) }} · {{ g.date }}
                </div>
              </div>
            </div>
            <div class="game-right">
              <div class="game-score">{{ g.score }} 分</div>
              <div class="game-acc">{{ g.accuracy }}% 正確</div>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- ══ 獎章說明：點任何一張獎章（已解鎖／未解鎖）都會秀出這個家族每一級的達成條件，
         讓學生知道下一級怎麼拿、其他獎章怎麼解鎖 ══ -->
    <Transition name="badge-detail-fade">
      <div v-if="detailFamily" class="badge-detail-backdrop" @click.self="closeBadgeDetail">
        <div class="badge-detail-sheet" role="dialog" aria-modal="true">
          <button class="badge-detail-close" aria-label="關閉" @click="closeBadgeDetail">✕</button>
          <div class="badge-detail-head">
            <span class="badge-detail-emoji">{{ detailFamily[0].icon_emoji }}</span>
            <div>
              <p class="badge-detail-name">{{ detailFamily[0].badge_name }}</p>
              <p v-if="detailFamily[0].badge_category === 'social_team'" class="badge-detail-sub">
                🤝 小組共同獎章：全組一起努力，達標時全組一起解鎖
              </p>
              <p v-else class="badge-detail-sub">⚡ 個人獎章：自己努力就能升級</p>
            </div>
          </div>
          <ul class="badge-tier-list">
            <li
              v-for="t in detailFamily"
              :key="t.badge_id"
              class="badge-tier-row"
              :class="[`tier-${t.badge_tier}`, { got: t.earned, next: t.badge_id === detailNextId }]"
            >
              <span class="badge-tier-label" :class="`tier-${t.badge_tier}`">{{ tierLabel(t.badge_tier) }}</span>
              <span class="badge-tier-cond">{{ t.condition_desc }}</span>
              <span class="badge-tier-status">
                {{ t.earned ? '✅ 已達成' : (t.badge_id === detailNextId ? '🎯 下一個目標' : '🔒') }}
              </span>
            </li>
          </ul>
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
import NavBar from '@/components/NavBar.vue'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

// 若無 userId param 就看自己的
const targetUserId = computed(() =>
  route.params.userId ? Number(route.params.userId) : authStore.user?.user_id
)
const isMe = computed(() => targetUserId.value === authStore.user?.user_id)

const isExperimental = computed(
  () => authStore.user?.experiment_group === 'experimental'
)

// ── 資料 ────────────────────────────────────────────────
const isLoading   = ref(true)
const profile     = ref({})
const allBadges   = ref([])
const recentGames = ref([])
const groupMembers = ref([]) // 同組組員名單（不含自己），小組共同獎章要標示「跟誰一起獲得」

// ── 顏色 ─────────────────────────────────────────────────
const COLORS = ['#FF8C00','#FF6B35','#FF6B35','#F59E0B',
                '#4CAF50','#FF8C00','#EF4444','#FFB300']
const GROUP_COLORS = ['#FF8C00','#F59E0B','#4CAF50','#FF6B35']

const avatarColor = computed(
  () => COLORS[(targetUserId.value ?? 0) % COLORS.length]
)
const groupColor = computed(
  () => GROUP_COLORS[(profile.value?.group_id ?? 0) % GROUP_COLORS.length]
)

// ── 計算 ─────────────────────────────────────────────────
// 2026-09-23：獎章改成銅/銀/金/傳說同一個「家族」（同 badge_name）只顯示最高已拿到的等級，
// 不然像「單場飛躍」這種常常一次跨好幾級的家族，獎章牆會一次塞 4 張看起來幾乎一樣的卡片。
// 「未解鎖」也比照改成每個家族只顯示「下一個還沒拿到的等級」，不會把同一家族還沒拿到的
// 3 個等級都列出來
const TIER_ORDER = ['bronze', 'silver', 'gold', 'legend']

const badgeFamilies = computed(() => {
  const map = new Map()
  for (const b of allBadges.value) {
    if (!map.has(b.badge_name)) map.set(b.badge_name, [])
    map.get(b.badge_name).push(b)
  }
  for (const list of map.values()) {
    list.sort((a, b) => TIER_ORDER.indexOf(a.badge_tier) - TIER_ORDER.indexOf(b.badge_tier))
  }
  return map
})

const earnedBadges = computed(() => {
  const result = []
  for (const list of badgeFamilies.value.values()) {
    const earnedTiers = list.filter(b => b.earned)
    if (earnedTiers.length > 0) result.push(earnedTiers[earnedTiers.length - 1]) // 最高等級
  }
  return result
})
// 不再只截前 6 個：老師希望學生能看到「所有」還沒解鎖的獎章怎麼拿
const lockedBadges = computed(() => {
  const result = []
  for (const list of badgeFamilies.value.values()) {
    const nextTier = list.find(b => !b.earned) // 這個家族下一個還沒拿到的等級
    if (nextTier) result.push(nextTier)
  }
  return result
})
// 2026-09-25：未解鎖清單也拆成個人／共同兩塊，跟已解鎖的區分方式一致——
// 學姊反映實驗組學生的獎章牆只看得到個人獎章、完全不知道共同獎章這個分類存在，
// 拆開顯示才能讓還沒拿過共同獎章的學生也看到「有這個東西、要怎麼解鎖」
const lockedPersonalBadges = computed(() =>
  lockedBadges.value.filter(b => b.badge_category !== 'social_team')
)
const lockedTeamBadges = computed(() =>
  lockedBadges.value.filter(b => b.badge_category === 'social_team')
)

// 點獎章 → 秀出該家族全部等級的條件
const detailFamilyName = ref(null)
const detailFamily = computed(() =>
  detailFamilyName.value ? badgeFamilies.value.get(detailFamilyName.value) ?? null : null
)
const detailNextId = computed(() =>
  detailFamily.value?.find(t => !t.earned)?.badge_id ?? null
)
function openBadgeDetail(b) { detailFamilyName.value = b.badge_name }
function closeBadgeDetail() { detailFamilyName.value = null }
// 滑鼠移到「已解鎖」的獎章上時，秀出下一級要怎麼解鎖（不是重複講已經達成的條件）——
// 學姊反映之前只能點開才看得到，希望滑鼠移過去就能秀出來
function nextHint(b) {
  const family = badgeFamilies.value.get(b.badge_name) ?? []
  const next = family.find(t => !t.earned)
  return next ? `🎯 下一級（${tierLabel(next.badge_tier)}）：${next.condition_desc}` : '🏆 已達最高等級！'
}
// 小組共同獎章（social_team）跟個人獎章分開顯示，才能凸顯「這是跟組員
// 一起達成的」，不然混在同一格獎章牆裡，學生根本看不出差別
const earnedPersonalBadges = computed(() =>
  earnedBadges.value.filter(b => b.badge_category !== 'social_team')
)
const earnedTeamBadges = computed(() =>
  earnedBadges.value.filter(b => b.badge_category === 'social_team')
)
const groupMemberNames = computed(() =>
  groupMembers.value.map(m => m.nickname).join('、')
)

const accuracyClass = computed(() => {
  const acc = profile.value?.accuracy ?? 0
  if (acc >= 80) return 'acc-great'
  if (acc >= 60) return 'acc-ok'
  return 'acc-low'
})

// ── 工具 ─────────────────────────────────────────────────
function tierLabel(tier) {
  return { bronze:'銅級', silver:'銀級', gold:'金級', legend:'傳說' }[tier] ?? tier
}
function levelLabel(level) {
  return { vocabulary:'單字', sentence:'句型', reading:'課文' }[level] ?? level
}
// ── 取資料 ───────────────────────────────────────────────
async function fetchProfile() {
  isLoading.value = true
  try {
    const { data } = await api.get(`/users/${targetUserId.value}/profile`)
    profile.value     = data.profile
    allBadges.value   = data.badges
    recentGames.value = data.recent_games
  } catch {
    loadMock()
  } finally {
    isLoading.value = false
  }
}

async function fetchGroupMembers() {
  // 學姊系統沒有實驗組/對照組之分，小組共同成就對所有學生開放，
  // 不能沿用原本「只有實驗組才查組員」的判斷，不然團隊徽章卡片上
  // 「與 OOO 一起獲得」的名字永遠是空的
  try {
    const { data } = await api.get(`/users/${targetUserId.value}/group-members`)
    groupMembers.value = data.members ?? []
  } catch (e) {
    console.error('[fetchGroupMembers]', e)
  }
}

function loadMock() {
  profile.value = {
    user_id:          1,
    nickname:         authStore.user?.nickname ?? '小庇',
    group_id:         1,
    group_name:       'A 組',
    class_name:       '五年甲班',
    is_leader:        1,
    class_rank:       1,
    system_score:     3500,
    total_games:      18,
    correct_count:    72,
    accuracy:         80,
    avg_response_time: 12.3,
  }
  allBadges.value = [
    { badge_id:1, badge_name:'學習新星',   icon_emoji:'📘', badge_tier:'bronze', condition_desc:'累積100分',  earned:true  },
    { badge_id:2, badge_name:'初級挑戰者', icon_emoji:'🎯', badge_tier:'bronze', condition_desc:'單場達60分', earned:true  },
    { badge_id:3, badge_name:'高分王',     icon_emoji:'🔥', badge_tier:'silver', condition_desc:'單場達80分', earned:true  },
    { badge_id:4, badge_name:'人氣王',     icon_emoji:'🌟', badge_tier:'bronze', condition_desc:'社群100分',  earned:true  },
    { badge_id:5, badge_name:'英語冒險者', icon_emoji:'📗', badge_tier:'silver', condition_desc:'累積500分',  earned:false },
    { badge_id:6, badge_name:'冠軍王',     icon_emoji:'🥇', badge_tier:'gold',   condition_desc:'排行榜第一', earned:false },
    { badge_id:7, badge_name:'滿分傳說',   icon_emoji:'👑', badge_tier:'legend', condition_desc:'單場達100分',earned:false },
    { badge_id:8, badge_name:'社群明星',   icon_emoji:'💫', badge_tier:'gold',   condition_desc:'社群1000分', earned:false },
  ]
  recentGames.value = [
    { session_id:10, opponent_group:'B 組', level:'vocabulary', result:'win',  score:65, accuracy:80, date:'6/9' },
    { session_id:9,  opponent_group:'C 組', level:'sentence',   result:'lose', score:45, accuracy:60, date:'6/8' },
    { session_id:8,  opponent_group:'D 組', level:'vocabulary', result:'win',  score:70, accuracy:100,date:'6/7' },
    { session_id:7,  opponent_group:'B 組', level:'reading',    result:'draw', score:50, accuracy:60, date:'6/6' },
  ]
}

onMounted(() => {
  fetchProfile()
  fetchGroupMembers()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

.profile-page {
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
  position: absolute; border-radius: 50%;
  filter: blur(80px); opacity: .1; pointer-events: none;
}
.bl1 { width:280px;height:280px;background:#FF8C00;top:-70px;right:-70px }
.bl2 { width:200px;height:200px;background:#F59E0B;bottom:200px;left:-60px }

/* ── 頂部 ── */
.top-bar {
  display: flex; align-items: center;
  padding: 14px 16px 12px;
  background: rgba(255,255,255,.03);
  border-bottom: 1px solid rgba(255,255,255,.07);
  position: sticky; top: 0; z-index: 10;
}
.back-btn {
  width: 36px; height: 36px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.05);
  color: rgba(255,255,255,.7); font-size: 16px;
  cursor: pointer; display: flex;
  align-items: center; justify-content: center;
}
.back-btn:hover { background: rgba(255,255,255,.1); }
.top-title {
  flex: 1; text-align: center;
  font-size: 15px; font-weight: 800; color: #fff;
}

.loading-wrap {
  display: flex; justify-content: center;
  align-items: center; height: 50vh;
}
.spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(255,255,255,.1);
  border-top-color: #FF8C00;
  border-radius: 50%; animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 個人資訊卡 ── */
.hero-card {
  margin: 14px 16px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 22px;
  padding: 18px 16px;
  position: relative; z-index: 1;
}
.hero-top {
  display: flex; align-items: center;
  gap: 12px; margin-bottom: 16px;
}
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar {
  width: 56px; height: 56px; border-radius: 50%;
  color: #fff; font-size: 22px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  border: 2.5px solid rgba(255,255,255,.2);
}
.leader-crown {
  position: absolute; top: -8px; right: -4px;
  font-size: 16px;
}
.hero-info { flex: 1; min-width: 0; }
.hero-name {
  font-size: 18px; font-weight: 900; color: #fff;
  display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
}
.me-tag {
  font-size: 10px; background: #FF8C00; color: #fff;
  padding: 1px 6px; border-radius: 6px; font-weight: 700;
}
.hero-group {
  font-size: 12px; color: rgba(255,255,255,.45);
  display: flex; align-items: center; gap: 5px; margin-bottom: 4px;
}
.group-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.hero-role-tag {
  display: inline-block; font-size: 10px;
  background: rgba(245,158,11,.3); color: #FCD34D;
  padding: 2px 8px; border-radius: 6px; font-weight: 700;
}
.hero-rank {
  display: flex; flex-direction: column;
  align-items: center; flex-shrink: 0;
  background: rgba(255,255,255,.06);
  border-radius: 12px; padding: 10px 14px;
}
.rank-num { font-size: 20px; font-weight: 900; color: #FBBF24; line-height: 1; }
.rank-lbl { font-size: 10px; color: rgba(255,255,255,.4); margin-top: 2px; }

.score-row {
  display: flex; align-items: center;
  background: rgba(255,255,255,.04);
  border-radius: 14px; padding: 12px 10px;
}
.score-item {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 3px;
}
.score-icon { font-size: 16px; }
.score-val  { font-size: 20px; font-weight: 900; color: #fff; line-height: 1; }
.score-lbl  { font-size: 10px; color: rgba(255,255,255,.4); }
.score-item.sys .score-val  { color: #FBBF24; }

/* ── Section ── */
.section {
  margin: 0 16px 14px;
  position: relative; z-index: 1;
}
.sec-tag {
  display: inline-block;
  font-size: 12px; font-weight: 700;
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.65);
  padding: 4px 12px; border-radius: 20px;
  margin-bottom: 10px;
}
.sec-header-row {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 10px;
}
.sec-count { font-size: 11px; color: rgba(255,255,255,.35); }

/* ── 數據格 ── */
.stats-grid {
  display: grid; grid-template-columns: repeat(4,1fr);
  gap: 8px; margin-bottom: 12px;
}
.stat-card {
  display: flex; flex-direction: column;
  align-items: center; gap: 4px;
  background: rgba(255,255,255,.05);
  border-radius: 14px; padding: 12px 6px;
}
.stat-icon { font-size: 18px; }
.stat-val  { font-size: 16px; font-weight: 900; color: #fff; line-height: 1; }
.stat-lbl  { font-size: 10px; color: rgba(255,255,255,.4); text-align: center; }

.accuracy-bar-wrap { }
.accuracy-label {
  display: flex; justify-content: space-between;
  font-size: 12px; color: rgba(255,255,255,.5);
  margin-bottom: 6px;
}
.accuracy-val { font-weight: 700; color: #fff; }
.accuracy-bar {
  height: 8px; background: rgba(255,255,255,.08);
  border-radius: 4px; overflow: hidden;
}
.accuracy-fill {
  height: 100%; border-radius: 4px;
  transition: width .6s ease;
}
.acc-great { background: linear-gradient(90deg,#4CAF50,#66BB6A); }
.acc-ok    { background: linear-gradient(90deg,#F59E0B,#FBBF24); }
.acc-low   { background: linear-gradient(90deg,#EF4444,#F87171); }

/* ── 獎章牆 ── */
.badge-subsection { margin-bottom: 14px; }
.badge-subsection-title {
  font-size: 12px; font-weight: 700;
  color: rgba(255,255,255,.5); margin-bottom: 8px;
}
.badge-subsection-title.team { color: #FCD34D; }
/* 小組共同獎章卡片要放組員名字，欄位比較寬才不會擠成一團 */
.badge-subsection.team .badge-grid { grid-template-columns: repeat(2,1fr); }

.badge-grid {
  display: grid; grid-template-columns: repeat(3,1fr);
  gap: 8px; margin-bottom: 10px;
}
.badge-card {
  display: flex; flex-direction: column;
  align-items: center; gap: 4px;
  border-radius: 14px; padding: 12px 8px;
  text-align: center;
  position: relative;
}
.badge-card.earned {
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
}
/* 銅／銀／金／傳說四個等級用明顯不同的顏色區分（老師建議）：
   銅=古銅橘棕、銀=冷銀灰藍、金=亮黃、傳說=紫粉漸層 */
.badge-card.tier-bronze {
  border: 1.5px solid rgba(205,127,50,.75);
  background: linear-gradient(160deg, rgba(205,127,50,.26), rgba(120,63,20,.12));
}
.badge-card.tier-silver {
  border: 1.5px solid rgba(203,213,225,.8);
  background: linear-gradient(160deg, rgba(203,213,225,.24), rgba(100,116,139,.12));
}
.badge-card.tier-gold {
  border: 1.5px solid rgba(255,198,41,.9);
  background: linear-gradient(160deg, rgba(255,198,41,.28), rgba(217,119,6,.12));
  box-shadow: 0 0 12px rgba(255,198,41,.25);
}
.badge-card.tier-legend {
  border: 1.5px solid rgba(192,132,252,.95);
  background: linear-gradient(160deg, rgba(168,85,247,.32), rgba(236,72,153,.2));
  box-shadow: 0 0 16px rgba(192,132,252,.4);
}
.badge-card[role="button"] { cursor: pointer; transition: transform .12s; }
.badge-card[role="button"]:hover { transform: translateY(-2px); }
.badge-card[role="button"]:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

/* 滑鼠移到（或鍵盤 focus）已解鎖的獎章卡片上，跳出「下一級怎麼解鎖」的提示——
   自己畫的提示框，字級/亮度都自己控制，不用瀏覽器原生 title 那種小小灰灰的提示 */
.badge-hint {
  position: absolute; left: 50%; bottom: calc(100% + 8px);
  transform: translateX(-50%) translateY(4px);
  width: max-content; max-width: 200px;
  background: #1F1400; color: #fff;
  font-size: 12px; font-weight: 600; line-height: 1.4;
  padding: 8px 12px; border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0,0,0,.4);
  opacity: 0; pointer-events: none;
  transition: opacity .15s, transform .15s;
  z-index: 5;
}
.badge-hint::after {
  content: ''; position: absolute; top: 100%; left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent; border-top-color: #1F1400;
}
.badge-card:hover .badge-hint,
.badge-card:focus-visible .badge-hint {
  opacity: 1; transform: translateX(-50%) translateY(0);
}

/* 等級標籤：實心小色塊，不用看邊框顏色也分得出來 */
.badge-tier-label.tier-bronze { background: #CD7F32; color: #2B1600; }
.badge-tier-label.tier-silver { background: #CBD5E1; color: #1E293B; }
.badge-tier-label.tier-gold   { background: #FFC629; color: #3B2600; }
.badge-tier-label.tier-legend { background: linear-gradient(90deg,#A855F7,#EC4899); color: #fff; }

/* 小組共同獎章：組員名字另外標出來，顏色沿用等級色 */
.badge-team-mates {
  font-size: 9px; line-height: 1.3;
  color: rgba(255,255,255,.6);
  margin-top: 2px;
}

/* ── 獎章說明彈窗 ── */
.badge-detail-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.6);
  display: flex; align-items: flex-end; justify-content: center;
}
.badge-detail-sheet {
  position: relative; width: 100%; max-width: 480px;
  background: #3D2B00; color: #fff;
  border-radius: 22px 22px 0 0; padding: 22px 18px 28px;
  box-shadow: 0 -12px 40px rgba(0,0,0,.45);
}
.badge-detail-close {
  position: absolute; top: 12px; right: 14px;
  width: 32px; height: 32px; border-radius: 50%;
  border: none; background: rgba(255,255,255,.12); color: #fff;
  font-size: 14px; cursor: pointer;
}
.badge-detail-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-right: 36px; }
.badge-detail-emoji {
  font-size: 40px;
  font-family: 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;
}
.badge-detail-name { font-size: 18px; font-weight: 900; margin: 0; }
.badge-detail-sub { font-size: 12px; color: rgba(255,255,255,.6); margin: 3px 0 0; }
.badge-tier-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.badge-tier-row {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 12px;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
  opacity: .6;
}
.badge-tier-row.got  { opacity: 1; }
.badge-tier-row.next { opacity: 1; border-style: dashed; border-color: rgba(255,255,255,.55); }
.badge-tier-row .badge-tier-label { font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 999px; }
.badge-tier-cond { font-size: 13px; line-height: 1.4; }
.badge-tier-status { font-size: 11px; font-weight: 700; white-space: nowrap; color: rgba(255,255,255,.75); }
.badge-detail-fade-enter-active, .badge-detail-fade-leave-active { transition: opacity .2s; }
.badge-detail-fade-enter-from, .badge-detail-fade-leave-to { opacity: 0; }

.badge-card.locked {
  background: rgba(255,255,255,.02);
  border: 1px dashed rgba(255,255,255,.1);
}
.badge-emoji {
  font-size: 26px;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
}
.badge-name  { font-size: 11px; font-weight: 700; color: #fff; }
.badge-tier-label { font-size: 9px; font-weight: 800; padding: 1px 8px; border-radius: 999px; color: rgba(255,255,255,.5); }
.locked-emoji { filter: grayscale(1); opacity: .5; }
.locked-name  { color: rgba(255,255,255,.75)!important; }
.locked-tier  { opacity: .8; }
/* 2026-09-25：學姊反映解鎖條件文字太小太暗，看不清楚——字級跟亮度都調高，
   跟卡片名稱一樣看得清楚，不再刻意壓暗 */
.badge-cond   { font-size: 12px; font-weight: 600; line-height: 1.4; color: rgba(255,255,255,.85); }
.locked-section { margin-top: 4px; }
.locked-title {
  font-size: 12px; color: rgba(255,255,255,.55);
  margin-bottom: 8px; font-weight: 700;
}
.locked-title.team { color: #FCD34D; }
.empty-txt {
  font-size: 13px; color: rgba(255,255,255,.3);
  text-align: center; padding: 20px;
}

/* ── 近期紀錄 ── */
.game-list { display: flex; flex-direction: column; gap: 7px; }
.game-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 13px; border-radius: 14px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
}
.game-row.win  { border-color: rgba(76,175,80,.3); background: rgba(76,175,80,.07); }
.game-row.lose { border-color: rgba(239,68,68,.2);  background: rgba(239,68,68,.04); }
.game-row.draw { border-color: rgba(245,158,11,.25); }
.game-left { display: flex; align-items: center; gap: 10px; }
.game-result-icon { font-size: 22px; }
.game-vs   { font-size: 13px; font-weight: 800; color: #fff; margin-bottom: 2px; }
.game-meta { font-size: 10px; color: rgba(255,255,255,.4); }
.game-right { text-align: right; }
.game-score { font-size: 15px; font-weight: 900; color: #FBBF24; }
.game-acc   { font-size: 10px; color: rgba(255,255,255,.4); }
</style>
<style scoped>
@media (min-width:768px){.profile-page{max-width:600px}.back-btn{width:44px;height:44px}.hero-card{padding:24px}.avatar{width:68px;height:68px}.hero-name{font-size:21px}.section{padding-left:24px;padding-right:24px}.badge-card{min-height:120px}.badge-name{font-size:13px}}
@media (min-width:1024px){.profile-page{max-width:768px}.hero-card,.score-row{margin-left:24px;margin-right:24px}.stats-grid{grid-template-columns:repeat(4,1fr)}.badge-grid{grid-template-columns:repeat(4,1fr)}.profile-page>.section{margin-left:24px;margin-right:24px}}
</style>
