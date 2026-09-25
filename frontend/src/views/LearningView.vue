
<template>
  <div class="learning-page">
   <NavBar title="學習區" />
    <!-- ── 頂部狀態列 ── -->
    <header class="top-bar">
      <div class="player-info">
        <div class="avatar">{{ userInitial }}</div>
        <div>
          <p class="player-name">{{ user.nickname }}</p>
          <p class="player-group">{{ user.groupName }} · {{ user.className }}</p>
        </div>
      </div>
      <div class="score-chips">
        <div class="chip chip-system">
          <i class="ti ti-bolt"></i>
          <span>{{ user.systemScore }}</span>
        </div>
      </div>
    </header>

    <!-- ── 今日學習單元 ── -->
    <section class="section">
      <div class="section-header">
        <span class="section-tag">今日學習單元</span>
      </div>

      <div class="unit-cards">
        <div
          v-for="stage in learningStages"
          :key="stage.id"
          class="unit-card"
          :class="[`card-${stage.color}`, { 'card-locked': stage.locked, 'card-active': activeStage === stage.id }]"
          @click="!stage.locked && selectStage(stage)"
        >
          <div class="card-icon">{{ stage.emoji }}</div>
          <div class="card-body">
            <p class="card-title">{{ stage.title }}</p>
            <p class="card-sub">{{ stage.subtitle }}</p>
          </div>
   <div class="card-right">
            <i v-if="stage.locked" class="ti ti-lock lock-icon"></i>
            <i v-else-if="stage.progress === 100" class="ti ti-circle-check done-icon"></i>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 複習區 ── -->
    <section class="section">
      <div class="section-header">
        <span class="section-tag tag-review">複習區</span>
        <button class="refresh-btn" @click="loadReviewWords">
          <i class="ti ti-refresh"></i> 換一批
        </button>
      </div>

      <div class="review-grid">
        <div
          v-for="word in reviewWords"
          :key="word.id"
          class="word-card"
          :class="{ flipped: word.flipped }"
          @click="flipWord(word)"
        >
          <div class="word-front">
            <span class="word-en">{{ word.en }}</span>
          </div>
          <div class="word-back">
            <span class="word-zh">{{ word.zh }}</span>
            <span class="word-en-sm">{{ word.en }}</span>
          </div>
        </div>
      </div>

      <div class="review-stats">
        <span>已複習 <strong>{{ flippedCount }}</strong> / {{ reviewWords.length }} 個單字</span>
        <div class="review-bar">
          <div class="review-fill" :style="{ width: reviewProgress + '%' }"></div>
        </div>
      </div>
    </section>

    <!-- ── 開始 PK 按鈕 ── -->
    <section class="pk-section">
      <div class="pk-card">
        <div class="pk-info">
          <p class="pk-title">準備好了嗎？</p>
          <p class="pk-sub">複習單字後即可開始 PK 對戰！</p>

        </div>
       <!-- PK 按鈕永遠可以點，不需要完成學習才解鎖 -->
<button
  class="pk-btn pk-btn-ready"
  @click="goToPK"
>
  <i class="ti ti-swords"></i>
  <span>⚔️ 開始英語冒險！</span>
</button>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const authStore = useAuthStore()
// ── 使用者資訊 ──────────────────────────────────────
const user = ref({
  nickname:    authStore.user?.nickname   || '小庇',
  groupName:   authStore.user?.groupName  || 'A 組',
  className:   authStore.user?.className  || '五年甲班',
  systemScore: authStore.user?.system_score ?? 0,
})

const userInitial = computed(() => user.value.nickname.charAt(0))

// ── 學習關卡 ────────────────────────────────────────
const activeStage = ref(null)

const learningStages = ref([
  {
    id: 'vocabulary',
    title: '單字挑戰',
    subtitle: '認讀 · 拼字 · 圖片配對',
    emoji: '🌟',
    color: 'yellow',
    progress: 0,
    locked: false,
  },
  {
    id: 'sentence',
    title: '句型挑戰',
    subtitle: '排序 · 填空 · 配對',
    emoji: '💬',
    color: 'blue',
    progress: 0,
    locked: false,
  },
  {
    id: 'reading',
    title: '課文挑戰',
    subtitle: '閱讀 · 角色對話 · 聽力',
    emoji: '📖',
    color: 'green',
    progress: 0,
    locked: false,
  },
])

// 點擊關卡時跳到元單元選擇頁
// stage.id 是 'vocabulary' / 'sentence' / 'reading'
function selectStage(stage) {
  activeStage.value = stage.id
  router.push({ 
    name: 'unit-select',           // ← 改這裡
    query: { level: stage.id }     // 帶上關卡類型
  })
}

function ringStyle(progress) {
  const deg = Math.round(progress * 3.6)
  return {
    background: `conic-gradient(var(--ring-color, #FBBF24) ${deg}deg, #FFE0B2 ${deg}deg)`,
  }
}

// ── 複習區 ──────────────────────────────────────────
// 抽真正題庫裡的單字，不指定 theme_id 就是從目前開放中的單元（後端已經
// 擋掉 theme 1-10 舊教材／theme 13-16 未複核單元）隨機抽，跟 ChallengeView
// 選單元後進去的 WordReviewView 用同一支 API，只是這裡不綁定特定單元
const reviewWords = ref([])

async function loadReviewWords() {
  try {
    const { data } = await api.get('/questions/review', { params: { limit: 6 } })
    reviewWords.value = (data.words ?? []).map(w => ({
      id: w.word_id, en: w.english, zh: w.chinese, flipped: false,
    }))
  } catch (e) {
    console.error('[loadReviewWords]', e)
    reviewWords.value = []
  }
}

function flipWord(word) {
  word.flipped = !word.flipped
}

const flippedCount   = computed(() => reviewWords.value.filter(w => w.flipped).length)
const reviewProgress = computed(() =>
  reviewWords.value.length ? Math.round((flippedCount.value / reviewWords.value.length) * 100) : 0
)

// ── PK 解鎖條件 ─────────────────────────────────────
const pkUnlocked = computed(() =>
  learningStages.value.every(s => s.progress >= 60)
)

function goToPK() {
   router.push({ name: 'challenge' })
}

// ── 讀取進度（串接後端） ─────────────────────────────
async function fetchProgress() {
  try {
    const { data } = await api.get('/game/progress')
    data.stages.forEach(s => {
      const stage = learningStages.value.find(l => l.id === s.type)
      // 只顯示今日練習進度，不再用「練習達標才解鎖」覆寫 locked——
      // 學習區練習（單字/句型/課文）不會把結果寫回 game_logs，
      // 這個解鎖條件永遠達不到，會讓學生卡死進不去下一關
      if (stage) stage.progress = s.progress
    })
  } catch {
    // 若 API 尚未建好，使用本地 mock 資料
    learningStages.value[0].progress = 40
  }
}

onMounted(() => {
  loadReviewWords()
  fetchProgress()
})
</script>

<style scoped>
/* ── 字型 ── */
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Nunito+Sans:wght@400;600&display=swap');

.learning-page {
  font-family: 'Nunito', sans-serif;
  background: #F0F7FF;
  min-height: 100vh;
  padding: 0 0 120px;
  max-width: 480px;
  margin: 0 auto;
}

/* ── 頂部狀態列 ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  background: #fff;
  border-bottom: 2px solid #E8F0FE;
  position: sticky;
  top: 0;
  z-index: 10;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF8C00, #FF6B35);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-name {
  font-size: 15px;
  font-weight: 700;
  color: #3D2B00;
  margin: 0;
}

.player-group {
  font-size: 12px;
  color: #A6842E;
  margin: 0;
}

.score-chips {
  display: flex;
  gap: 8px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
}

.chip-system {
  background: #FFF7ED;
  color: #C2410C;
}

.chip-social {
  background: #FFFBF0;
  color: #BF360C;
}

/* ── Section ── */
.section {
  padding: 20px 20px 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-tag {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: #FFF3E0;
  color: #E65100;
  padding: 4px 10px;
  border-radius: 20px;
}

.tag-review {
  background: #F1F8F2;
  color: #2E7D32;
}

.unit-label {
  font-size: 12px;
  color: #A6842E;
  font-weight: 600;
}

.refresh-btn {
  background: none;
  border: 1.5px solid #E8F5E9;
  color: #43A047;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Nunito', sans-serif;
  transition: background 0.2s;
}

.refresh-btn:hover {
  background: #E8F5E9;
}

/* ── 學習單元卡片 ── */
.unit-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unit-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.18s, box-shadow 0.18s;
  position: relative;
}

.unit-card:hover:not(.card-locked) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.unit-card:active:not(.card-locked) {
  transform: scale(0.98);
}

.card-yellow { background: #FFFBEB; border-color: #FDE68A; }
.card-blue   { background: #EFF6FF; border-color: #FFE0B2; }
.card-green  { background: #F1F8F2; border-color: #C8E6C9; }

.card-locked {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.3);
}

.card-active {
  box-shadow: 0 0 0 3px #FF8C0050;
}

.card-icon {
  font-size: 32px;
  flex-shrink: 0;
  width: 48px;
  text-align: center;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 800;
  color: #3D2B00;
  margin: 0 0 2px;
}

.card-sub {
  font-size: 12px;
  color: #8B6914;
  margin: 0;
  font-family: 'Nunito Sans', sans-serif;
}

.card-right {
  flex-shrink: 0;
  position: relative;
}

.progress-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  --ring-color: #FBBF24;
}

.card-blue .progress-ring   { --ring-color: #FFB74D; }
.card-green .progress-ring  { --ring-color: #66BB6A; }

.progress-ring::after {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: #fff;
}

.ring-num {
  position: relative;
  z-index: 1;
  font-size: 11px;
  font-weight: 800;
  color: #5C4300;
}

.lock-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #A6842E;
}

.done-icon {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 18px;
  color: #4CAF50;
  background: #fff;
  border-radius: 50%;
}

/* ── 複習區單字卡 ── */
.review-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.word-card {
  height: 72px;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.4s;
}

.word-card.flipped {
  transform: rotateY(180deg);
}

.word-front,
.word-back {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 2px solid #FFE0B2;
}

.word-front {
  background: #fff;
}

.word-back {
  background: #FFF3E0;
  border-color: #FFE0B2;
  transform: rotateY(180deg);
}

.word-en {
  font-size: 14px;
  font-weight: 800;
  color: #3D2B00;
}

.word-zh {
  font-size: 15px;
  font-weight: 800;
  color: #E65100;
}

.word-en-sm {
  font-size: 11px;
  color: #FF8C00;
  font-family: 'Nunito Sans', sans-serif;
}

.review-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #8B6914;
  font-family: 'Nunito Sans', sans-serif;
}

.review-stats strong {
  color: #3D2B00;
  font-weight: 800;
}

.review-bar {
  flex: 1;
  height: 6px;
  background: #FFE0B2;
  border-radius: 3px;
  overflow: hidden;
}

.review-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF8C00, #FF6B35);
  border-radius: 3px;
  transition: width 0.4s ease;
}

/* ── PK 區塊 ── */
.pk-section {
  padding: 20px 20px 0;
}

.pk-card {
  background: #fff;
  border-radius: 20px;
  border: 2px solid #FFE0B2;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pk-title {
  font-size: 18px;
  font-weight: 800;
  color: #3D2B00;
  margin: 0 0 4px;
}

.pk-sub {
  font-size: 12px;
  color: #A6842E;
  margin: 0 0 12px;
  font-family: 'Nunito Sans', sans-serif;
}

.pk-checklist {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #5C4300;
  font-weight: 600;
}

.check-done { color: #4CAF50; font-size: 16px; }
.check-todo { color: #E8D5B7; font-size: 16px; }

.pk-btn {
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  border: none;
  font-family: 'Nunito', sans-serif;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.18s, box-shadow 0.18s;
  letter-spacing: 0.3px;
}

.pk-btn-ready {
  background: linear-gradient(135deg, #FF8C00, #FF6B35);
  color: #fff;
  box-shadow: 0 6px 20px #FF8C0040;
}

.pk-btn-ready:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px #FF8C0055;
}

.pk-btn-ready:active {
  transform: scale(0.97);
}

.pk-btn-locked {
  background: #FFF3E0;
  color: #A6842E;
  cursor: not-allowed;
}
</style>
<style scoped>
@media (min-width:768px){.learning-page{max-width:600px;padding-bottom:140px}.stage-card,.pk-btn{min-height:56px}.card-title,.pk-title{font-size:18px}.word-card{height:88px}.word-en,.word-zh{font-size:16px}}
@media (min-width:1024px){.learning-page{max-width:768px}.stages{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.stage-card{height:100%;flex-direction:column;text-align:center}.review-grid{grid-template-columns:repeat(4,1fr)}.pk-card{display:grid;grid-template-columns:1fr auto;align-items:center}.pk-btn{min-width:190px}}
</style>
