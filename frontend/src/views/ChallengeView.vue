<template>
  <div class="challenge-page">
<NavBar title="選擇挑戰" />
    <div class="bg-blob bl1" aria-hidden="true"/>
    <div class="bg-blob bl2" aria-hidden="true"/>

    <!-- ── 頂部導覽 ── -->
    <header class="top-bar">
      <button class="back-btn" @click="router.back()" aria-label="返回">
        <span>←</span>
      </button>
      <div class="top-center">
        <span class="top-title">選擇挑戰內容</span>
        <span class="top-sub">{{ isExperimental ? myGroup.group_name : '個人挑戰' }}</span>
      </div>
      <div class="top-right">
        <div class="chip chip-sys">⚡{{ authStore.user?.system_score ?? 0 }}</div>
      </div>
    </header>

    <!-- ── 我的小組資訊（只有實驗組才有小組概念） ── -->
    <section v-if="isExperimental" class="my-group-card">
      <div class="mg-left">
        <div class="mg-badge">我的小組</div>
        <div class="mg-name">{{ myGroup.group_name }}</div>
        <div class="mg-members">
          <span v-for="m in myGroup.members" :key="m.user_id"
                class="member-dot"
                :title="m.nickname"
                :style="{ background: m.color }">
            {{ m.nickname.charAt(0) }}
          </span>
        </div>
      </div>
      <div class="mg-right">
        <div class="mg-rounds">
          <span class="wr-num">{{ myGroup.total_games }}</span>
          <span class="wr-lbl">小組累積場次</span>
        </div>
      </div>
    </section>

    <!-- ── 關卡選擇 ── -->
    <section class="section">
      <div class="section-header">
        <span class="sec-tag">選擇關卡</span>
      </div>
      <div class="level-row">
        <button
          v-for="lv in levels"
          :key="lv.id"
          class="lv-btn"
          :class="[`lv-${lv.color}`, { active: selectedLevel === lv.id, locked: lv.locked }]"
          :disabled="lv.locked"
          @click="selectedLevel = lv.id"
        >
          <span class="lv-icon">{{ lv.emoji }}</span>
          <span class="lv-name">{{ lv.name }}</span>
          <span v-if="lv.locked" class="lv-lock">🔒</span>
        </button>
      </div>

      <!-- 單元選擇 -->
      <div v-if="selectedLevel" class="unit-select-row">
        <div class="sec-tag" style="margin-bottom:8px">選擇單元</div>
        <div class="unit-grid">
          <button
            v-for="unit in units"
            :key="unit.id"
            class="unit-chip"
            :class="{ active: selectedUnitId === unit.id }"
            @click="selectedUnitId = unit.id"
          >
            {{ unit.name }}
          </button>
        </div>
      </div>
    </section>

    <!-- ── 底部發起按鈕 ── -->
    <div class="bottom-bar">
      <button
        class="pk-btn"
        :class="{ loading: isSending }"
        :disabled="isSending || !selectedUnitId"
        @click="startChallenge"
      >
        <span v-if="isSending" class="spin">⏳</span>
        <span v-else-if="!selectedUnitId">請先選擇學習單元</span>
        <span v-else>⚔️ 開始挑戰！</span>
      </button>
    </div>

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

const isExperimental = computed(
  () => authStore.user?.experiment_group === 'experimental'
)

// 單元選擇
const selectedUnitId = ref(null)
const units = ref([])

async function fetchUnits() {
  try {
    const { data } = await api.get('/questions/themes')
    units.value = data.themes.map(t => ({
      id:   t.theme_id,
      name: t.theme_name,
    }))
  } catch {
    units.value = Array.from({ length: 12 }, (_, i) => ({
      id:   i + 1,
      name: `B4CH${i + 1}`,
    }))
  }
}

// ── 我的小組資訊（只有實驗組會用到，對照組不顯示） ──────────
const myGroup = ref({
  group_name: '載入中…',
  total_games: 0,
  members: [],
})

// ── 關卡 ─────────────────────────────────────────────────
const selectedLevel = ref('vocabulary')
const levels = ref([
  { id: 'vocabulary', name: '單字挑戰', emoji: '🌟', color: 'yellow', locked: false },
  { id: 'sentence',   name: '句型挑戰', emoji: '💬', color: 'blue',   locked: false },
  { id: 'reading',    name: '課文挑戰', emoji: '📖', color: 'green',  locked: false },
])

// ── 取得資料 ─────────────────────────────────────────────
async function fetchMyGroup() {
  if (!isExperimental.value) return
  try {
    const { data } = await api.get('/game/my-group')
    myGroup.value = data
  } catch {
    myGroup.value = {
      group_name: 'A 組', total_games: 0,
      members: [
        { user_id: 1, nickname: '小庇',   color: '#FF8C00' },
        { user_id: 2, nickname: '兔龜龜', color: '#FF6B35' },
      ],
    }
  }
}

// ── 發起挑戰 ─────────────────────────────────────────────
const isSending = ref(false)
async function startChallenge() {
  if (!selectedUnitId.value || isSending.value) return
  isSending.value = true
  try {
    const { data } = await api.post('/game/session/start', {
      level:    selectedLevel.value,
      theme_id: selectedUnitId.value,
    })
    router.push({
      name: 'pk-battle',
      params: { sessionId: data.session_id },
    })
  } catch (e) {
    alert(e.response?.data?.error ?? '發起失敗，請稍後再試')
  } finally {
    isSending.value = false
  }
}

onMounted(() => {
  fetchMyGroup()
  fetchUnits()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

.challenge-page {
  font-family: 'Nunito', sans-serif;
  background: #F0F7FF;
  min-height: 100vh;
  padding-bottom: 140px;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

/* 背景裝飾 */
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: .08;
  pointer-events: none;
  z-index: 0;
}
.bl1 { width: 300px; height: 300px; background: #FF8C00; top: -80px; right: -80px; }
.bl2 { width: 200px; height: 200px; background: #F59E0B; bottom: 200px; left: -60px; }

/* ── 頂部 ── */
.top-bar {
  display: flex;
  align-items: center;
  padding: 14px 16px 12px;
  background: #fff;
  border-bottom: 2px solid #E8F0FE;
  position: sticky;
  top: 0;
  z-index: 10;
  gap: 10px;
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1.5px solid #FFE0B2;
  background: #FFFBF0;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background .15s;
}
.back-btn:hover { background: #FFF3E0; }
.top-center { flex: 1; min-width: 0; }
.top-title {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: #3D2B00;
}
.top-sub { font-size: 12px; color: #A6842E; }
.chip {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
}
.chip-sys { background: #FFF7ED; color: #C2410C; }

/* ── 我的小組卡片 ── */
.my-group-card {
  margin: 14px 16px 0;
  background: linear-gradient(135deg, #FF8C00 0%, #FF6B35 100%);
  border-radius: 18px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}
.mg-badge {
  font-size: 11px;
  background: rgba(255,255,255,.25);
  color: #fff;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 700;
  display: inline-block;
  margin-bottom: 5px;
}
.mg-name {
  font-size: 20px;
  font-weight: 900;
  color: #fff;
  margin-bottom: 8px;
}
.mg-members { display: flex; gap: 5px; }
.member-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,255,255,.5);
}
.mg-rounds { text-align: center; }
.wr-num { display: block; font-size: 26px; font-weight: 900; color: #fff; line-height: 1; }
.wr-lbl { font-size: 11px; color: rgba(255,255,255,.75); max-width: 80px; }

/* ── Section ── */
.section {
  padding: 16px 16px 0;
  position: relative;
  z-index: 1;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.sec-tag {
  font-size: 12px;
  font-weight: 700;
  background: #FFF3E0;
  color: #E65100;
  padding: 3px 10px;
  border-radius: 20px;
}

/* ── 關卡按鈕 ── */
.level-row {
  display: flex;
  gap: 8px;
}
.lv-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 14px;
  border: 2px solid transparent;
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  font-size: 12px;
  font-weight: 700;
  transition: all .18s;
  position: relative;
}
.lv-icon { font-size: 22px; }
.lv-name { color: #3D2B00; }
.lv-lock { font-size: 14px; }

.lv-yellow { background: #FFFBEB; border-color: #FDE68A; }
.lv-blue   { background: #EFF6FF; border-color: #FFE0B2; }
.lv-green  { background: #F1F8F2; border-color: #C8E6C9; }

.lv-btn.active.lv-yellow { border-color: #F59E0B; box-shadow: 0 0 0 3px #FEF3C780; }
.lv-btn.active.lv-blue   { border-color: #FF8C00; box-shadow: 0 0 0 3px #FFE0B280; }
.lv-btn.active.lv-green  { border-color: #4CAF50; box-shadow: 0 0 0 3px #C8E6C980; }

.lv-btn.locked {
  opacity: .45;
  cursor: not-allowed;
  filter: grayscale(.4);
}

/* ── 底部發起區 ── */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  background: rgba(255,255,255,.96);
  backdrop-filter: blur(12px);
  border-top: 1.5px solid #FFE0B2;
  padding: 14px 16px 24px;
  z-index: 20;
}

.pk-btn {
  width: 100%;
  padding: 15px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
  letter-spacing: .3px;
  box-shadow: 0 6px 20px #FF8C0040;
  transition: transform .18s, box-shadow .18s, opacity .18s;
}
.pk-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px #EF444450;
}
.pk-btn:active:not(:disabled) { transform: scale(.98); }
.pk-btn:disabled {
  background: #FFF3E0;
  color: #A6842E;
  box-shadow: none;
  cursor: not-allowed;
}
.spin { display: inline-block; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 單元選擇格 */
.unit-select-row {
  margin-top: 14px;
  position: relative;
  z-index: 1;
}
.unit-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
}
.unit-chip {
  padding: 8px 4px;
  border-radius: 10px;
  border: 1.5px solid #FFE0B2;
  background: #FFFBF0;
  font-family: 'Nunito', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #5C4300;
  cursor: pointer;
  transition: all .15s;
  text-align: center;
}
.unit-chip:hover {
  border-color: #FF8C00;
  background: #FFF3E0;
  color: #E65100;
}
.unit-chip.active {
  border-color: #FF8C00;
  background: #FF8C00;
  color: #fff;
}
</style>
<style scoped>
@media (min-width:768px){.challenge-page{max-width:600px}.back-btn{width:44px;height:44px}.level-btn,.start-btn{min-height:48px}.top-title,.mg-name{font-size:18px}.bottom-bar{max-width:600px}}
@media (min-width:1024px){.challenge-page{max-width:768px}.level-row{display:grid;grid-template-columns:repeat(3,1fr)}.bottom-bar{max-width:768px;padding-left:24px;padding-right:24px}.unit-grid{grid-template-columns:repeat(6,1fr)}}
</style>
