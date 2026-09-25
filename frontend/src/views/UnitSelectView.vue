<template>
  <div class="unit-page">
    <NavBar title="選擇單元" />
    <div class="bg-blob b1" aria-hidden="true"/>
    <div class="bg-blob b2" aria-hidden="true"/>

    <!-- 頂部 -->
    <header class="top-bar">
      <button class="back-btn" @click="router.push({ name: 'game' })">←</button>
      <span class="top-title">選擇學習單元</span>
      <div style="width:36px"/>
    </header>

    <!-- 說明 -->
    <p class="hint">選擇要複習的章節，完成後即可解鎖 PK 對戰！</p>

    <!-- 單元格 -->
    <div class="unit-grid">
      <div
        v-for="unit in units"
        :key="unit.id"
        class="unit-card"
        :class="{ done: unit.progress >= 60, active: unit.progress > 0 && unit.progress < 60 }"
        @click="goUnit(unit)"
      >
        <div class="unit-label">{{ unit.name }}</div>
        <div class="unit-bar">
          <div class="unit-fill" :style="{ width: unit.progress + '%' }"/>
        </div>
        <div class="unit-pct">{{ unit.progress }}%</div>
        <div v-if="unit.progress >= 60" class="unit-check">✓</div>
      </div>
    </div>

    <!-- 底部按鈕 -->
    <div class="bottom-area">
      <button class="pk-btn" @click="() => router.push('/challenge')">
  ⚔️ 開始英語冒險
</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/axios'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const route  = useRoute()
// LearningView 傳過來的關卡類型（vocabulary/sentence/reading），沒帶就當單字關
const level  = route.query.level || 'vocabulary'

const units = ref([
  { id: 1, name: 'B4CH1',  progress: 0 },
  { id: 2, name: 'B4CH2',  progress: 0 },
  { id: 3, name: 'B4CH3',  progress: 0 },
  { id: 4, name: 'B4CH4',  progress: 0 },
  { id: 5, name: 'B4CH5',  progress: 0 },
  { id: 6, name: 'B4CH6',  progress: 0 },
  { id: 7, name: 'B4CH7',  progress: 0 },
  { id: 8, name: 'B4CH8',  progress: 0 },
  { id: 9, name: 'B4CH9',  progress: 0 },
  { id: 10, name: 'B4CH10', progress: 0 },
  { id: 11, name: 'B4CH11', progress: 0 },
  { id: 12, name: 'B4CH12', progress: 0 },
])

function goUnit(unit) {
  if (level === 'vocabulary') {
    // 單字關：翻牌複習 → 選擇題配對（既有流程，不動）
    router.push({ name: 'word-review', params: { themeId: unit.id }, state: { unitName: unit.name } })
  } else {
    // 句型/課文關：真實題庫練習頁（mcq/fill_blank/ordering，也支援圖片/聽力題）
    router.push({
      name: 'question-practice',
      params: { themeId: unit.id },
      query:  { level },
      state:  { unitName: unit.name },
    })
  }
}

onMounted(async () => {
  try {
    // 從後端取得真實的主題清單
    const { data } = await api.get('/questions/themes')
    // 把後端的主題資料對應到顯示格式
    units.value = data.themes.map(t => ({
      id:       t.theme_id,
      name:     t.theme_name,
      progress: 0,
    }))
  } catch {
    // API 失敗時用預設的 B4CH1~B4CH12
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
.unit-page { font-family:'Nunito',sans-serif; background:#F0F7FF; min-height:100vh; padding-bottom:100px; position:relative; overflow:hidden; max-width:480px; margin:0 auto; }
.bg-blob { position:absolute; border-radius:50%; filter:blur(60px); opacity:.08; pointer-events:none; }
.b1 { width:250px;height:250px;background:#FF8C00;top:-60px;right:-60px; }
.b2 { width:180px;height:180px;background:#F59E0B;bottom:150px;left:-50px; }
.top-bar { display:flex;align-items:center;padding:14px 16px 12px;background:#fff;border-bottom:2px solid #E8F0FE;position:sticky;top:0;z-index:10;gap:10px; }
.back-btn { width:36px;height:36px;border-radius:10px;border:1.5px solid #FFE0B2;background:#FFFBF0;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center; }
.top-title { flex:1;text-align:center;font-size:15px;font-weight:800;color:#3D2B00; }
.hint { font-size:13px;color:#8B6914;text-align:center;padding:12px 16px 4px; }
.unit-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 16px;position:relative;z-index:1; }
.unit-card { background:#fff;border-radius:14px;border:2px solid #FFE0B2;padding:12px 10px;text-align:center;cursor:pointer;transition:all .18s;position:relative; }
.unit-card:hover { border-color:#FF8C00;transform:translateY(-2px);box-shadow:0 6px 16px rgba(255,140,0,.12); }
.unit-card.active { border-color:#F59E0B;background:#FFFBEB; }
.unit-card.done { border-color:#4CAF50;background:#F1F8F2; }
.unit-label { font-size:13px;font-weight:800;color:#3D2B00;margin-bottom:6px; }
.unit-bar { height:4px;background:#FFE0B2;border-radius:2px;overflow:hidden;margin-bottom:4px; }
.unit-fill { height:100%;background:linear-gradient(90deg,#FF8C00,#FF6B35);border-radius:2px;transition:width .4s; }
.unit-card.done .unit-fill { background:linear-gradient(90deg,#4CAF50,#66BB6A); }
.unit-pct { font-size:10px;color:#A6842E;font-weight:600; }
.unit-check { position:absolute;top:6px;right:8px;font-size:13px;color:#4CAF50;font-weight:900; }
.bottom-area { position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;padding:14px 16px 24px;background:rgba(255,255,255,.96);border-top:1.5px solid #FFE0B2;z-index:20; }
.pk-btn { width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#F59E0B,#EF4444);color:#fff;font-family:'Nunito',sans-serif;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 6px 20px #FF8C0040;transition:transform .18s; }
.pk-btn:hover { transform:translateY(-2px); }
</style>
<style scoped>
@media (min-width:768px){.unit-page{max-width:600px;padding-bottom:116px}.back-btn{width:44px;height:44px}.top-title{font-size:18px}.hint{font-size:16px}.unit-grid{gap:14px;padding:16px 24px}.unit-card{min-height:112px;padding:18px 12px}.unit-label{font-size:16px}.bottom-area{max-width:600px;padding:16px 24px 28px}.pk-btn{min-height:48px;font-size:17px}}
@media (min-width:1024px){.unit-page{max-width:768px}.unit-grid{grid-template-columns:repeat(4,1fr);padding:20px 32px}.bottom-area{max-width:768px;padding-left:32px;padding-right:32px}}
</style>
