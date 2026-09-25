<!--
  ═══════════════════════════════════════════════════════
  views/QuestionPracticeView.vue
  句型挑戰／課文挑戰的練習頁

  跟 WordPracticeView（單字挑戰用）不同：這頁不是自己現場組合中英配對題，
  是直接向後端 /questions/stage 拉真實題庫（mcq/fill_blank/ordering，
  也支援 image_choice/listening，跟 PKBattleView 用同一套題型），
  練習模式沒有排名疑慮，後端會直接給 correct_answer，答完立刻有回饋。

  用法：從 UnitSelectView 導過來，帶 themeId（路由參數）+ level（query）
  ═══════════════════════════════════════════════════════
-->
<template>
  <div class="practice-page">
    <NavBar :title="levelLabel" />
    <div class="bg-blob b1" aria-hidden="true"/>

    <!-- 頂部 -->
    <header class="top-bar">
      <button class="back-btn" @click="router.back()">←</button>
      <div class="top-center">
        <span class="top-title">{{ levelLabel }}</span>
        <span class="top-sub">{{ unitName }}</span>
      </div>
      <div style="width:36px"/>
    </header>

    <!-- 載入中 -->
    <div v-if="isLoading" class="loading-area">
      <div class="loading-spinner"/>
      <p>題目載入中…</p>
    </div>

    <!-- 沒有題目 -->
    <div v-else-if="!isLoading && questions.length === 0" class="empty-area">
      <p class="empty-icon">📭</p>
      <p>這個單元目前還沒有{{ levelLabel }}的題目</p>
      <button class="retry-btn" @click="router.back()">返回單元選擇</button>
    </div>

    <template v-else>
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
            <!-- 題型標籤 -->
            <div class="q-meta">
              <span class="q-type-tag" :class="`type-${currentQ.question_type}`">
                {{ typeLabel(currentQ.question_type) }}
              </span>
            </div>

            <!-- 圖片題 -->
            <div v-if="currentQ.image_url" class="q-image-wrap">
              <img
                v-if="!imageLoadFailed"
                :src="currentQ.image_url"
                alt="題目圖片"
                class="q-image"
                @error="imageLoadFailed = true"
              />
              <div v-else class="image-fallback">❓</div>
            </div>

            <!-- 聽力題 -->
            <div v-if="currentQ.audio_text" class="listening-controls">
              <button class="play-audio-btn" @click="playAudio(currentQ.audio_text)">
                🔊 再聽一次
              </button>
            </div>

            <!-- 題目文字 -->
            <p class="q-text">{{ currentQ.question_text }}</p>

            <!-- 選擇題（含圖片題、聽力題） -->
            <div v-if="isMcq" class="options">
              <button
                v-for="opt in currentQ.options"
                :key="opt"
                class="opt-btn"
                :class="optClass(opt)"
                :disabled="answered"
                @click="answerMcq(opt)"
              >
                {{ opt }}
              </button>
            </div>

            <!-- 填空題 -->
            <div v-else-if="currentQ.question_type === 'fill_blank'" class="fill-area">
              <div class="fill-input-wrap">
                <input
                  ref="fillInput"
                  v-model="fillAnswer"
                  class="fill-input"
                  :class="{ correct: answered && lastCorrect, wrong: answered && !lastCorrect }"
                  type="text"
                  placeholder="請輸入答案…"
                  :disabled="answered"
                  @keyup.enter="answerFill"
                />
                <button class="send-btn" :disabled="answered || !fillAnswer.trim()" @click="answerFill">
                  送出
                </button>
              </div>
            </div>

            <!-- 排序題 -->
            <div v-else-if="currentQ.question_type === 'ordering'" class="order-area">
              <div class="order-bank">
                <button
                  v-for="(word, i) in orderBank"
                  :key="i"
                  class="order-word"
                  :class="{ used: orderSelected.includes(i) }"
                  :disabled="answered || orderSelected.includes(i)"
                  @click="pickWord(i)"
                >
                  {{ word }}
                </button>
              </div>
              <div class="order-sentence">
                <span v-if="orderSelected.length === 0" class="order-placeholder">
                  點上方單字組成句子…
                </span>
                <span
                  v-for="(idx, i) in orderSelected"
                  :key="i"
                  class="order-slot"
                  @click="removeWord(i)"
                >{{ orderBank[idx] }}</span>
              </div>
              <button class="send-btn order-submit" :disabled="answered || orderSelected.length === 0" @click="answerOrder">
                確認句子
              </button>
            </div>

            <!-- 答對/錯提示 + 解釋 -->
            <Transition name="fade-ans">
              <div v-if="answered" class="answer-hint" :class="lastCorrect ? 'hint-ok' : 'hint-ng'">
                <p class="hint-main">
                  {{ lastCorrect ? '✓ 答對了！' : `✗ 正確答案：${currentQ.correct_answer}` }}
                </p>
                <p v-if="currentQ.explanation" class="hint-explain">{{ currentQ.explanation }}</p>
              </div>
            </Transition>

            <button v-if="answered" class="next-btn" @click="nextQuestion">
              {{ currentIdx < questions.length - 1 ? '下一題 →' : '看結果' }}
            </button>
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

        <div class="finish-btns">
          <button class="retry-btn" @click="fetchQuestions">再練一次</button>
          <button class="pk-btn" @click="router.push({ name: 'challenge' })">
            ⚔️ 去 PK 挑戰！
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/axios'
import NavBar from '@/components/NavBar.vue'

const router   = useRouter()
const route    = useRoute()
const themeId  = Number(route.params.themeId)
const level    = route.query.level || 'sentence'
const unitName = history.state?.unitName ?? `單元 ${themeId}`

const LEVEL_LABEL = { vocabulary: '單字挑戰', sentence: '句型挑戰', reading: '課文挑戰' }
const levelLabel = computed(() => LEVEL_LABEL[level] ?? '練習')

// ── 語音功能（跟 PKBattleView 同一套邏輯）─────────────────
let cachedVoice = null
function pickVoice() {
  if (!('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices || voices.length === 0) return null
  return voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang?.startsWith('en')) || voices[0]
}
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = pickVoice() }
  cachedVoice = pickVoice()
}
function playAudio(text) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang  = 'en-US'
  utter.rate  = 0.85
  utter.pitch = 1.05
  if (!cachedVoice) cachedVoice = pickVoice()
  if (cachedVoice) utter.voice = cachedVoice
  window.speechSynthesis.speak(utter)
  // 「聽力小耳朵」獎章用：記錄一次聽力發音點擊，失敗不影響操作
  api.post('/questions/log-activity', { activity_type: 'listening' }).catch(() => {})
}

// ── 題目資料 ────────────────────────────────────────────
const isLoading    = ref(true)
const questions    = ref([])
const currentIdx   = ref(0)
const currentQ     = computed(() => questions.value[currentIdx.value] ?? {})
const imageLoadFailed = ref(false)

const isMcq = computed(() => {
  const t = currentQ.value?.question_type
  return t === 'mcq' || t === 'image_choice' || t === 'listening'
})

async function fetchQuestions() {
  isLoading.value  = true
  isFinished.value = false
  currentIdx.value = 0
  correctCount.value = 0
  wrongList.value  = []
  try {
    const { data } = await api.get('/questions/stage', {
      params: { level, theme_id: themeId, limit: 8 }
    })
    questions.value = data.questions
    if (questions.value.length) initQuestionState()
  } catch (e) {
    console.error('[QuestionPracticeView] fetchQuestions', e)
    questions.value = []
  } finally {
    isLoading.value = false
  }
}

// ── 答題狀態 ────────────────────────────────────────────
const answered    = ref(false)
const lastCorrect = ref(false)
const selectedOpt = ref(null)
const fillAnswer  = ref('')
const fillInput   = ref(null)
const orderBank     = ref([])
const orderSelected = ref([])

const correctCount = ref(0)
const wrongList     = ref([])
const isFinished    = ref(false)

const progressPct = computed(() =>
  questions.value.length ? Math.round((currentIdx.value / questions.value.length) * 100) : 0
)
const accuracy = computed(() =>
  questions.value.length ? Math.round((correctCount.value / questions.value.length) * 100) : 0
)

function typeLabel(type) {
  const map = { mcq: '選擇題', fill_blank: '填空題', ordering: '排序題', image_choice: '圖片題', listening: '聽力題' }
  return map[type] ?? type
}

function optClass(opt) {
  if (!answered.value) return ''
  if (opt === currentQ.value?.correct_answer) return 'opt-correct'
  if (opt === selectedOpt.value && !lastCorrect.value) return 'opt-wrong'
  return 'opt-dim'
}

function judge(userAnswer) {
  const correct = String(currentQ.value.correct_answer ?? '').trim().toLowerCase()
  const given    = String(userAnswer ?? '').trim().toLowerCase()
  answered.value    = true
  lastCorrect.value = given === correct
  if (lastCorrect.value) {
    correctCount.value++
  } else {
    wrongList.value.push(currentQ.value.question_text)
  }
}

function answerMcq(opt) {
  if (answered.value) return
  selectedOpt.value = opt
  judge(opt)
}
function answerFill() {
  if (answered.value || !fillAnswer.value.trim()) return
  judge(fillAnswer.value.trim())
}
function pickWord(idx) {
  if (!orderSelected.value.includes(idx)) orderSelected.value.push(idx)
}
function removeWord(i) {
  if (!answered.value) orderSelected.value.splice(i, 1)
}
function answerOrder() {
  if (answered.value || !orderSelected.value.length) return
  const answerText = orderSelected.value.map(i => orderBank.value[i]).join(' ')
  judge(answerText)
}

// 排序題字庫初始化：把正確答案拆字後洗牌
function initOrderBank() {
  if (currentQ.value.question_type === 'ordering' && currentQ.value.correct_answer) {
    orderBank.value = currentQ.value.correct_answer.split(' ')
    orderSelected.value = []
  }
}
function initQuestionState() {
  answered.value    = false
  lastCorrect.value = false
  selectedOpt.value = null
  fillAnswer.value  = ''
  imageLoadFailed.value = false
  initOrderBank()
  if (currentQ.value.audio_text) {
    nextTick(() => setTimeout(() => playAudio(currentQ.value.audio_text), 400))
  }
  if (currentQ.value.question_type === 'fill_blank') {
    nextTick(() => fillInput.value?.focus())
  }
}

function nextQuestion() {
  if (currentIdx.value < questions.value.length - 1) {
    currentIdx.value++
    initQuestionState()
  } else {
    isFinished.value = true
  }
}

onMounted(fetchQuestions)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
.practice-page { font-family:'Nunito',sans-serif;background:#F0F7FF;min-height:100vh;padding-bottom:40px;position:relative;overflow:hidden;max-width:480px;margin:0 auto; }
.bg-blob { position:absolute;border-radius:50%;filter:blur(60px);opacity:.08;pointer-events:none; }
.b1 { width:250px;height:250px;background:#FF6B35;top:-60px;right:-60px; }
.top-bar { display:flex;align-items:center;padding:14px 16px 12px;background:#fff;border-bottom:2px solid #E8F0FE;position:sticky;top:0;z-index:10;gap:10px; }
.back-btn { width:36px;height:36px;border-radius:10px;border:1.5px solid #FFE0B2;background:#FFFBF0;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center; }
.top-center { flex:1;text-align:center; }
.top-title { display:block;font-size:14px;font-weight:800;color:#3D2B00; }
.top-sub { font-size:12px;color:#A6842E; }

.loading-area, .empty-area { display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;text-align:center;color:#8B6914;gap:12px; }
.loading-spinner { width:36px;height:36px;border:4px solid #FFE0B2;border-top-color:#FF6B35;border-radius:50%;animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.empty-icon { font-size:48px; }

.progress-wrap { display:flex;align-items:center;gap:10px;padding:12px 16px 0; }
.progress-bar { flex:1;height:8px;background:#FFE0B2;border-radius:4px;overflow:hidden; }
.progress-fill { height:100%;background:linear-gradient(90deg,#FF6B35,#FFA733);border-radius:4px;transition:width .4s; }
.progress-txt { font-size:12px;font-weight:700;color:#8B6914;white-space:nowrap; }

.question-area { padding:16px; }
.q-card { background:#fff;border-radius:20px;border:2px solid #FFE0B2;padding:22px 20px;box-shadow:0 6px 20px rgba(0,0,0,.06); }
.q-meta { margin-bottom:10px; }
.q-type-tag { font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px; }
.type-mcq          { background:#FFF3E0;color:#E65100; }
.type-fill_blank   { background:#FEF3C7;color:#92400E; }
.type-ordering     { background:#F1F8F2;color:#2E7D32; }
.type-image_choice { background:#FFF3E0;color:#BF360C; }
.type-listening    { background:#FFF3E0;color:#8B4500; }

.q-image-wrap { display:flex;justify-content:center;margin:10px 0; }
.q-image { max-width:180px;max-height:150px;border-radius:14px;border:3px solid #FFE0B2;object-fit:cover; }
.image-fallback { font-size:40px;text-align:center;padding:16px; }

.listening-controls { display:flex;justify-content:center;margin:10px 0; }
.play-audio-btn { padding:10px 20px;border-radius:50px;border:none;background:linear-gradient(135deg,#FF6B35,#FFA733);color:#fff;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(255,107,53,.3); }

.q-text { font-size:17px;font-weight:800;color:#3D2B00;text-align:center;margin:14px 0 20px;line-height:1.6;white-space:pre-line; }

.options { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px; }
.opt-btn { padding:14px 10px;border-radius:12px;border:2px solid #FFE0B2;background:#FFFBF0;font-family:'Nunito',sans-serif;font-size:14px;font-weight:700;color:#3D2B00;cursor:pointer;transition:all .15s; }
.opt-btn:hover:not(:disabled) { border-color:#FF6B35;background:#FFF8E1; }
.opt-btn:disabled { cursor:not-allowed; }
.opt-correct { border-color:#4CAF50!important;background:#F1F8F2!important;color:#1B5E20!important; }
.opt-wrong   { border-color:#EF4444!important;background:#FEF2F2!important;color:#B91C1C!important; }
.opt-dim     { opacity:.35; }

.fill-area { margin-bottom:14px; }
.fill-input-wrap { display:flex;gap:8px; }
.fill-input { flex:1;padding:13px 14px;border-radius:12px;border:1.5px solid #FFE0B2;font-family:'Nunito',sans-serif;font-size:15px;font-weight:700;outline:none;transition:border-color .15s; }
.fill-input:focus { border-color:#FF6B35; }
.fill-input.correct { border-color:#4CAF50;background:#F1F8F2; }
.fill-input.wrong   { border-color:#EF4444;background:#FEF2F2; }

.order-area { display:flex;flex-direction:column;gap:12px;margin-bottom:14px; }
.order-bank { display:flex;flex-wrap:wrap;gap:8px; }
.order-word { padding:8px 14px;border-radius:20px;border:1.5px solid #FFE0B2;background:#FFFBF0;font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;color:#3D2B00;cursor:pointer;transition:all .15s; }
.order-word:hover:not(:disabled):not(.used) { border-color:#FF6B35;background:#FFF8E1; }
.order-word.used { opacity:.25;cursor:not-allowed; }
.order-sentence { min-height:48px;border-radius:12px;border:1.5px dashed #FFE0B2;padding:10px 12px;display:flex;flex-wrap:wrap;align-items:center;gap:6px; }
.order-placeholder { color:#A6842E;font-size:13px; }
.order-slot { padding:5px 12px;border-radius:20px;background:#FF6B35;color:#fff;font-size:13px;font-weight:700;cursor:pointer; }
.order-submit { margin-top:2px; }

.send-btn { width:100%;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,#FF6B35,#FFA733);color:#fff;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;cursor:pointer;transition:opacity .15s; }
.send-btn:disabled { opacity:.4;cursor:not-allowed; }

.answer-hint { text-align:center;font-size:13px;font-weight:700;padding:12px;border-radius:12px;margin-top:6px; }
.hint-ok { background:#E8F5E9;color:#1B5E20; }
.hint-ng { background:#FEE2E2;color:#B91C1C; }
.hint-main { margin-bottom:4px; }
.hint-explain { font-size:12px;font-weight:600;opacity:.85; }

.next-btn { width:100%;margin-top:14px;padding:13px;border-radius:12px;border:none;background:linear-gradient(135deg,#F59E0B,#EF4444);color:#fff;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;cursor:pointer; }

.finish-area { padding:24px 16px;display:flex;flex-direction:column;align-items:center;text-align:center; }
.finish-icon { font-size:56px;margin-bottom:10px; }
.finish-title { font-size:22px;font-weight:900;color:#3D2B00;margin-bottom:16px; }
.result-card { display:flex;gap:20px;background:#fff;border-radius:18px;border:2px solid #FFE0B2;padding:18px 24px;margin-bottom:16px;box-shadow:0 4px 12px rgba(0,0,0,.06); }
.r-item { display:flex;flex-direction:column;align-items:center;gap:4px; }
.r-num { font-size:24px;font-weight:900;color:#FF6B35; }
.r-lbl { font-size:11px;color:#8B6914; }
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
@media (min-width:768px){.practice-page{max-width:600px}.back-btn{width:44px;height:44px}.q-card{padding:28px}.q-text{font-size:20px}.opt-btn{min-height:52px;font-size:16px}.send-btn,.next-btn,.retry-btn,.pk-btn{min-height:48px;font-size:16px}}
@media (min-width:1024px){.practice-page{max-width:768px}.q-card{max-width:680px;margin:0 auto}.options{grid-template-columns:repeat(2,1fr);gap:14px}.result-card{max-width:600px;margin-left:auto;margin-right:auto}}
</style>
