<!--
  views/ScoreboardView.vue
  教室大字報：投影到班級大螢幕用，全螢幕、深棕底、大字體，
  顯示全班每個小組的即時「團隊能量值」，每 5 秒自動更新一次，資料來自
  group_realtime_scores view。2026-09-25 起排的是 energy_score（排除當天請假組員後，
  在場組員的平均分），不是全組總分，跟學姊的「請假算法」一致，也是這樣排序的。
  （原本另外有一個「投影模式」ProjectorView.vue 做個人排行，2026-09-16 已經拿掉——
  個人社群分排行的設計本身已經作廢，且對照組/實驗組都「全程不設個人排行榜」，
  這裡的小組總分排行才是唯一該留著的投影功能）
-->
<template>
  <div class="board-page">
    <div class="bg-blob bl1" aria-hidden="true"/>
    <div class="bg-blob bl2" aria-hidden="true"/>

    <header class="board-header">
      <span class="board-title">🏆 小組排行榜</span>
      <span class="board-live">● 即時更新</span>
    </header>

    <div class="board-body">
      <div v-if="groups.length === 0" class="board-empty">還沒有資料</div>

      <div
        v-for="(g, idx) in groups"
        :key="g.group_id"
        class="group-row"
        :class="{ 'is-first': idx === 0 }"
      >
        <span class="group-rank">
          <span v-if="idx === 0">👑</span>
          <span v-else>{{ idx + 1 }}</span>
        </span>
        <span class="group-name">{{ g.group_name }}</span>
        <span class="group-members">{{ g.member_count }} 人</span>
        <span class="group-score">{{ g.energy_score }} 分</span>
      </div>
    </div>

    <div class="board-updated">最後更新：{{ lastUpdated }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/axios'

const route = useRoute()
const classId = route.query.class_id ? Number(route.query.class_id) : null

const groups      = ref([])
const lastUpdated = ref('—')

function formatNow() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function fetchGroupScores() {
  try {
    const { data } = await api.get('/game/group-scores', {
      params: classId ? { class_id: classId } : {}
    })
    groups.value = data.groups ?? []
    lastUpdated.value = formatNow()
  } catch (e) {
    console.error('[ScoreboardView] fetchGroupScores', e)
  }
}

let pollTimer = null
onMounted(() => {
  fetchGroupScores()
  pollTimer = setInterval(fetchGroupScores, 5000)
})
onUnmounted(() => clearInterval(pollTimer))
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

.board-page {
  font-family: 'Nunito', sans-serif;
  background: #3D2B00;
  min-height: 100vh;
  width: 100%;
  padding: 32px 48px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

.bg-blob { position:absolute;border-radius:50%;filter:blur(120px);opacity:.15;pointer-events:none; }
.bl1 { width:500px;height:500px;background:#FF8C00;top:-150px;right:-100px; }
.bl2 { width:400px;height:400px;background:#FFD700;bottom:-120px;left:-100px; }

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}
.board-title {
  font-size: 40px;
  font-weight: 900;
  color: #FFFBF0;
}
.board-live {
  font-size: 18px;
  font-weight: 700;
  color: #66BB6A;
  display: flex;
  align-items: center;
  gap: 6px;
}

.board-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.board-empty {
  font-size: 28px;
  color: rgba(255,251,240,.5);
  text-align: center;
  padding: 80px 0;
}

.group-row {
  display: flex;
  align-items: center;
  gap: 24px;
  background: rgba(255,255,255,.06);
  border: 2px solid rgba(255,255,255,.1);
  border-radius: 20px;
  padding: 20px 32px;
  transition: transform .3s ease;
}

.group-row.is-first {
  background: linear-gradient(135deg, #FFD700, #FFB300);
  border-color: #FFD700;
  box-shadow: 0 8px 32px rgba(255,215,0,.35);
  transform: scale(1.03);
}

.group-rank {
  flex: none;
  width: 64px;
  font-size: 36px;
  font-weight: 900;
  color: #FFFBF0;
  text-align: center;
}
.group-row.is-first .group-rank { color: #3D2B00; }

.group-name {
  flex: 1;
  font-size: 32px;
  font-weight: 800;
  color: #FFFBF0;
}
.group-row.is-first .group-name { color: #3D2B00; }

.group-members {
  flex: none;
  font-size: 18px;
  font-weight: 700;
  color: rgba(255,251,240,.6);
}
.group-row.is-first .group-members { color: rgba(61,43,0,.7); }

.group-score {
  flex: none;
  min-width: 140px;
  text-align: right;
  font-size: 36px;
  font-weight: 900;
  color: #FFD700;
}
.group-row.is-first .group-score { color: #3D2B00; }

.board-updated {
  position: fixed;
  right: 24px;
  bottom: 20px;
  font-size: 15px;
  font-weight: 700;
  color: rgba(255,251,240,.45);
  z-index: 1;
}

@media (max-width: 768px) {
  .board-page { padding: 20px; }
  .board-title { font-size: 28px; }
  .group-name { font-size: 22px; }
  .group-score { font-size: 26px; min-width: 100px; }
}
</style>
