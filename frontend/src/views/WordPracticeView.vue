<template>
  <div class="practice-page">
    <NavBar title="單字練習" />
    <div class="bg-blob b1" aria-hidden="true"/>

    <!-- 頂部 -->
    <header class="top-bar">
      <button class="back-btn" @click="router.back()">←</button>
      <div class="top-center">
        <span class="top-title">單字練習</span>
        <span class="top-sub">{{ unitName }}</span>
      </div>
      <div style="width:36px"/>
    </header>

    <!-- 進度 -->
    <div class="progress-wrap">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPct + '%' }"/>
      </div>
      <span class="progress-txt">{{ currentIdx + 1 }} / {{ questions.length }}</span>
    </div>

    <!-- 答題區 -->
    <div v-if="!isFinished" class="question-area">
      <Transition name="slide-q" mode="out-in">
        <div :key="currentIdx" class="q-card">
          <!-- 題目 -->
          <p class="q-text">{{ currentQ.sentence }}</p>

          <!-- 選項 -->
          <div class="options">
            <button
              v-for="opt in currentQ.options"
              :key="opt"
              class="opt-btn"
              :class="optClass(opt)"
              :disabled="answered"
              @click="answer(opt)"
            >
              {{ opt }}
            </button>
          </div>

          <!-- 答對/錯提示 -->
          <Transition name="fade-ans">
            <div v-if="answered" class="answer-hint" :class="lastCorrect ? 'hint-ok' : 'hint-ng'">
              {{ lastCorrect ? '✓ 答對了！' : `✗ 正確答案：${currentQ.answer}` }}
            </div>
          </Transition>
        </div>
      </Transition>
    </div>

    <!-- 完成畫面 -->
    <div v-else class="finish-area">
      <div class="finish-icon">🎉</div>
      <p class="finish-title">練習完成！</p>
      <div class="result-card">
        <div class="r-item">
          <span class="r-num">{{ correctCount }}</span>
          <span class="r-lbl">答對題數</span>
        </div>
        <div class="r-item">
          <span class="r-num">{{ questions.length }}</span>
          <span class="r-lbl">總題數</span>
        </div>
        <div class="r-item">
          <span class="r-num">{{ accuracy }}%</span>
          <span class="r-lbl">正確率</span>
        </div>
      </div>

      <!-- 錯誤單字列表 -->
      <div v-if="wrongWords.length > 0" class="wrong-section">
        <p class="wrong-title">需要加強的單字</p>
        <div class="wrong-list">
          <div v-for="w in wrongWords" :key="w" class="wrong-item">
            <span class="wrong-en">{{ w }}</span>
          </div>
        </div>
      </div>

      <div class="finish-btns">
        <button class="retry-btn" @click="retry">再練一次</button>
        <button class="pk-btn" @click="router.push({ name: 'challenge' })">
          ⚔️ 去 PK 挑戰！
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/axios'
import NavBar from '@/components/NavBar.vue'

const router   = useRouter()
const route    = useRoute()
const themeId  = Number(route.params.themeId)
const unitName = history.state?.unitName ?? `單元 ${themeId}`
// 不依賴上一頁（單字複習）透過 router state 傳單字過來——這個做法會受
// 瀏覽器 history.state 的時機/快取影響，實測會出現卡到別的單元舊資料
// 的情況。改成這頁自己直接向後端要這個主題的單字，比較可靠。
let wordList = []

// 產生練習題（從單字生成選擇題）
function buildQuestions(words) {
  return words.map(w => {
    const wrong = words
      .filter(x => x.english !== w.english)
      .sort(() => Math.random() - .5)
      .slice(0, 3)
      .map(x => x.english)
    const opts = [...wrong, w.english].sort(() => Math.random() - .5)
    return {
      sentence: `"${w.chinese}" 的英文是？`,
      answer:   w.english,
      options:  opts,
    }
  }).sort(() => Math.random() - .5)
}

const questions   = ref([])
const currentIdx  = ref(0)
const answered    = ref(false)
const lastCorrect = ref(false)
const selectedOpt = ref(null)
const correctCount = ref(0)
const wrongWords   = ref([])
const isFinished   = ref(false)

const currentQ    = computed(() => questions.value[currentIdx.value] ?? {})
const progressPct = computed(() =>
  questions.value.length ? Math.round((currentIdx.value / questions.value.length) * 100) : 0
)
const accuracy = computed(() =>
  questions.value.length ? Math.round((correctCount.value / questions.value.length) * 100) : 0
)

function optClass(opt) {
  if (!answered.value) return ''
  if (opt === currentQ.value.answer) return 'opt-correct'
  if (opt === selectedOpt.value) return 'opt-wrong'
  return 'opt-dim'
}

function answer(opt) {
  if (answered.value) return
  answered.value    = true
  selectedOpt.value = opt
  lastCorrect.value = opt === currentQ.value.answer

  if (lastCorrect.value) {
    correctCount.value++
  } else {
    wrongWords.value.push(currentQ.value.answer)
  }

  // 「練習不手軟」獎章用：記錄一次單字選擇題練習，失敗不影響操作
  api.post('/questions/log-activity', { activity_type: 'word_practice' }).catch(() => {})

  setTimeout(() => {
    if (currentIdx.value < questions.value.length - 1) {
      currentIdx.value++
      answered.value    = false
      selectedOpt.value = null
    } else {
      isFinished.value = true
    }
  }, 1200)
}

function retry() {
  questions.value   = buildQuestions(wordList)
  currentIdx.value  = 0
  answered.value    = false
  selectedOpt.value = null
  correctCount.value = 0
  wrongWords.value   = []
  isFinished.value   = false
}

onMounted(async () => {
  try {
    const { data } = await api.get('/questions/review', {
      params: { theme_id: themeId, limit: 10 }
    })
    wordList = data.words ?? []
  } catch (e) {
    console.error('[WordPracticeView] 取得單字失敗', e)
    wordList = []
  }

  if (wordList.length >= 4) {
    questions.value = buildQuestions(wordList)
  } else {
    // API 失敗或這個主題單字不足 4 個時的備用資料，不影響操作流程
    const mock = [
      { english:'apple',   chinese:'蘋果' },
      { english:'banana',  chinese:'香蕉' },
      { english:'cat',     chinese:'貓咪' },
      { english:'dog',     chinese:'狗狗' },
      { english:'elephant',chinese:'大象' },
      { english:'happy',   chinese:'快樂的' },
    ]
    questions.value = buildQuestions(mock)
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
.practice-page { font-family:'Nunito',sans-serif;background:#F0F7FF;min-height:100vh;padding-bottom:40px;position:relative;overflow:hidden;max-width:480px;margin:0 auto; }
.bg-blob { position:absolute;border-radius:50%;filter:blur(60px);opacity:.08;pointer-events:none; }
.b1 { width:250px;height:250px;background:#4CAF50;top:-60px;right:-60px; }
.top-bar { display:flex;align-items:center;padding:14px 16px 12px;background:#fff;border-bottom:2px solid #E8F0FE;position:sticky;top:0;z-index:10;gap:10px; }
.back-btn { width:36px;height:36px;border-radius:10px;border:1.5px solid #FFE0B2;background:#FFFBF0;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center; }
.top-center { flex:1;text-align:center; }
.top-title { display:block;font-size:14px;font-weight:800;color:#3D2B00; }
.top-sub { font-size:12px;color:#A6842E; }
.progress-wrap { display:flex;align-items:center;gap:10px;padding:12px 16px 0; }
.progress-bar { flex:1;height:8px;background:#FFE0B2;border-radius:4px;overflow:hidden; }
.progress-fill { height:100%;background:linear-gradient(90deg,#4CAF50,#66BB6A);border-radius:4px;transition:width .4s; }
.progress-txt { font-size:12px;font-weight:700;color:#8B6914;white-space:nowrap; }
.question-area { padding:16px; }
.q-card { background:#fff;border-radius:20px;border:2px solid #FFE0B2;padding:24px 20px;box-shadow:0 6px 20px rgba(0,0,0,.06); }
.q-text { font-size:18px;font-weight:800;color:#3D2B00;text-align:center;margin-bottom:20px;line-height:1.5; }
.options { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px; }
.opt-btn { padding:14px 10px;border-radius:12px;border:2px solid #FFE0B2;background:#FFFBF0;font-family:'Nunito',sans-serif;font-size:14px;font-weight:700;color:#3D2B00;cursor:pointer;transition:all .15s; }
.opt-btn:hover:not(:disabled) { border-color:#FF8C00;background:#FFF3E0; }
.opt-btn:disabled { cursor:not-allowed; }
.opt-correct { border-color:#4CAF50!important;background:#F1F8F2!important;color:#1B5E20!important; }
.opt-wrong   { border-color:#EF4444!important;background:#FEF2F2!important;color:#B91C1C!important; }
.opt-dim     { opacity:.35; }
.answer-hint { text-align:center;font-size:14px;font-weight:700;padding:10px;border-radius:10px; }
.hint-ok { background:#E8F5E9;color:#1B5E20; }
.hint-ng { background:#FEE2E2;color:#B91C1C; }
.finish-area { padding:24px 16px;display:flex;flex-direction:column;align-items:center;text-align:center; }
.finish-icon { font-size:56px;margin-bottom:10px; }
.finish-title { font-size:22px;font-weight:900;color:#3D2B00;margin-bottom:16px; }
.result-card { display:flex;gap:20px;background:#fff;border-radius:18px;border:2px solid #FFE0B2;padding:18px 24px;margin-bottom:16px;box-shadow:0 4px 12px rgba(0,0,0,.06); }
.r-item { display:flex;flex-direction:column;align-items:center;gap:4px; }
.r-num { font-size:24px;font-weight:900;color:#FF8C00; }
.r-lbl { font-size:11px;color:#8B6914; }
.wrong-section { width:100%;margin-bottom:16px; }
.wrong-title { font-size:13px;font-weight:700;color:#EF4444;margin-bottom:8px; }
.wrong-list { display:flex;flex-wrap:wrap;gap:6px;justify-content:center; }
.wrong-item { background:#FEE2E2;border-radius:20px;padding:4px 12px; }
.wrong-en { font-size:13px;font-weight:700;color:#B91C1C; }
.finish-btns { display:flex;flex-direction:column;gap:10px;width:100%; }
.retry-btn { padding:13px;border-radius:14px;border:2px solid #FFE0B2;background:#FFFBF0;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;color:#8B6914;cursor:pointer; }
.pk-btn { padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#F59E0B,#EF4444);color:#fff;font-family:'Nunito',sans-serif;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 6px 20px #FF8C0040; }
.slide-q-enter-active,.slide-q-leave-active { transition:all .25s ease; }
.slide-q-enter-from { transform:translateX(30px);opacity:0; }
.slide-q-leave-to   { transform:translateX(-20px);opacity:0; }
.fade-ans-enter-active,.fade-ans-leave-active { transition:opacity .2s; }
.fade-ans-enter-from,.fade-ans-leave-to { opacity:0; }
</style>
<style scoped>
@media (min-width:768px){.practice-page{max-width:600px}.back-btn{width:44px;height:44px}.question-card{margin:24px;padding:28px}.question-text{font-size:22px}.option-btn{min-height:52px;font-size:17px}.next-btn,.restart-btn{min-height:48px;font-size:16px}}
@media (min-width:1024px){.practice-page{max-width:768px}.question-card{max-width:680px;margin:32px auto}.options{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.result-card{max-width:600px;margin-left:auto;margin-right:auto}}
</style>
