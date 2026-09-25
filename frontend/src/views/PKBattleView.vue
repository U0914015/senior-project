<template>
  <div class="battle-page">
    <NavBar title="個人挑戰" :show-back="false" />
    <div class="bg-blob bl1" aria-hidden="true"/>
    <div class="bg-blob bl2" aria-hidden="true"/>

    <!-- ══ 頂部狀態列 ══ -->
    <header class="top-bar">
      <div class="progress-info">
        <span class="q-count">{{ currentIndex + 1 }} / {{ questions.length }}</span>
        <div class="q-bar">
          <div class="q-fill" :style="{ width: qProgress + '%' }"/>
        </div>
      </div>
    </header>

    <!-- ══ 計時器 ══ -->
    <div class="timer-area">
      <!-- 答完最後一題進結束畫面時，questionTimer 會被清掉，timeLeft
           停在最後一次的數字不會再變——不加這個 v-if 的話畫面會一直
           顯示一個「卡住不動」的倒數，看起來像當機 -->
      <div v-if="!isFinished" class="timer-ring-wrap">
        <svg class="timer-svg" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" class="ring-track"/>
          <circle cx="40" cy="40" r="34" class="ring-fill"
            :class="{ urgent: timeLeft <= 10 }"
            :stroke-dasharray="`${ringDash} 213.6`"/>
        </svg>
        <div class="timer-inner">
          <span class="timer-num" :class="{ urgent: timeLeft <= 10 }">
            {{ timeLeft }}
          </span>
          <span class="timer-lbl">秒</span>
        </div>
      </div>

      <!-- 即時分數 -->
      <div v-if="!isFinished" class="score-board">
        <div class="score-item">
          <span class="score-num">{{ roundScore }}</span>
          <span class="score-lbl">本場得分</span>
        </div>
        <div class="score-divider"/>
        <div class="score-item">
          <span class="score-num correct-count">{{ correctCount }}</span>
          <span class="score-lbl">答對題數</span>
        </div>
        <div class="score-divider"/>
        <div class="score-item">
          <span class="score-num">{{ streak }}</span>
          <span class="score-lbl">連勝🔥</span>
        </div>
      </div>
    </div>

    <!-- ══ 答題動畫 Overlay ══ -->
    <Transition name="result-pop">
      <div v-if="showResult" class="result-overlay"
           :class="lastCorrect ? 'overlay-correct' : 'overlay-wrong'">
        <div class="result-icon">{{ lastCorrect ? '🎉' : '😅' }}</div>
        <div class="result-txt">{{ lastCorrect ? '答對了！' : '答錯了' }}</div>
        <div v-if="lastScore > 0" class="result-score">+{{ lastScore }} 分</div>
        <div v-if="!lastCorrect" class="result-answer">
          正確答案：<strong>{{ currentQuestion?.correct_answer }}</strong>
        </div>
      </div>
    </Transition>

    <!-- ══ 題目卡片 ══ -->
    <Transition name="slide-q" mode="out-in">
      <div v-if="currentQuestion && !isFinished"
           :key="currentIndex"
           class="question-card">

        <!-- 難度 & 題型標籤 -->
        <div class="q-meta">
          <span class="q-type-tag" :class="`type-${currentQuestion.question_type}`">
            {{ typeLabel(currentQuestion.question_type) }}
          </span>
          <span class="q-diff">
            {{ '⭐'.repeat(currentQuestion.difficulty) }}
          </span>
        </div>

        <!-- 圖片題：有 image_url 才顯示，圖片載入失敗顯示問號佔位 -->
        <div v-if="currentQuestion.image_url" class="question-image-wrap">
          <img
            v-if="!imageLoadFailed"
            :src="currentQuestion.image_url"
            alt="題目圖片"
            class="question-image"
            @error="imageLoadFailed = true"
          />
          <div v-else class="image-fallback">❓</div>
        </div>

        <!-- 聽力題：有 audio_text 才顯示喇叭按鈕 -->
        <div v-if="currentQuestion.audio_text" class="listening-controls">
          <button
            class="play-audio-btn"
            @click="playAudio(currentQuestion.audio_text)"
          >
            🔊 再聽一次
          </button>
          <p class="listening-hint">仔細聽，選出正確答案</p>
        </div>

        <!-- 題目文字 -->
        <p class="q-text">{{ currentQuestion.question_text }}</p>

        <!-- MCQ 選項（含圖片題、聽力題，共用同一套選項 UI） -->
        <div v-if="isMcq" class="options-grid">
          <button
            v-for="(opt, idx) in currentQuestion.options"
            :key="opt"
            class="option-btn"
            :class="optionClass(opt)"
            :disabled="answered"
            @click="submitAnswer(opt)"
          >
            <span class="opt-letter">{{ ['A','B','C','D'][idx] }}</span>
            <span class="opt-text">{{ opt }}</span>
          </button>
        </div>

        <!-- 填空題 -->
        <div v-else-if="currentQuestion.question_type === 'fill_blank'"
             class="fill-area">
          <div class="fill-input-wrap">
            <input
              ref="fillInput"
              v-model="fillAnswer"
              class="fill-input"
              :class="{
                correct: answered && lastCorrect,
                wrong:   answered && !lastCorrect
              }"
              type="text"
              placeholder="請輸入答案…"
              :disabled="answered"
              @keyup.enter="submitFill"
            />
            <button class="fill-send-btn"
                    :disabled="answered || !fillAnswer.trim()"
                    @click="submitFill">
              送出
            </button>
          </div>
          <p class="fill-hint">按 Enter 或點「送出」確認</p>
        </div>

        <!-- 排序題 -->
        <div v-else-if="currentQuestion.question_type === 'ordering'"
             class="order-area">
          <div class="order-bank">
            <button
              v-for="word in orderBank"
              :key="word"
              class="order-word"
              :class="{ used: orderSelected.includes(word) }"
              :disabled="answered || orderSelected.includes(word)"
              @click="pickWord(word)"
            >
              {{ word }}
            </button>
          </div>
          <div class="order-sentence">
            <div class="order-slots">
              <span v-if="orderSelected.length === 0" class="order-placeholder">
                點上方單字組成句子…
              </span>
              <span
                v-for="(w, i) in orderSelected"
                :key="i"
                class="order-slot"
                @click="removeWord(i)"
              >{{ w }}</span>
            </div>
          </div>
          <button class="fill-send-btn order-submit"
                  :disabled="answered || orderSelected.length === 0"
                  @click="submitOrder">
            確認句子
          </button>
        </div>

      </div>
    </Transition>

    <!-- ══ 載入失敗 ══ -->
    <div v-if="loadError" class="error-area">
      <div class="error-icon">⚠️</div>
      <p class="error-title">連不上場次</p>
      <p class="error-sub">{{ loadError }}</p>
      <button class="retry-btn" @click="fetchSession">重新載入</button>
    </div>

    <!-- ══ 完成畫面 ══ -->
    <div v-if="isFinished" class="finish-area">
      <div class="finish-icon">🏆</div>
      <p class="finish-title">挑戰結束！</p>
      <div class="finish-stats">
        <div class="f-stat">
          <span class="f-num">{{ roundScore }}</span>
          <span class="f-lbl">本場得分</span>
        </div>
        <div class="f-stat">
          <span class="f-num">{{ correctCount }} / {{ questions.length }}</span>
          <span class="f-lbl">答對題數</span>
        </div>
        <div class="f-stat">
          <span class="f-num">{{ accuracy }}%</span>
          <span class="f-lbl">正確率</span>
        </div>
      </div>
      <button class="next-btn" @click="goResult">
        查看結果 →
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/axios'
import NavBar from '@/components/NavBar.vue'

const router    = useRouter()
const route     = useRoute()

const SESSION_ID  = Number(route.params.sessionId)
const TIME_LIMIT  = 30   // 每題秒數

// ── 語音功能：使用瀏覽器內建 Web Speech API ──────────────
// 這個版本會優先選 en-US 聲音，並快取避免每次重新搜尋
let cachedVoice = null

function pickVoice() {
  if (!('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices || voices.length === 0) return null
  return (
    voices.find(v => v.lang === 'en-US') ||
    voices.find(v => v.lang?.startsWith('en')) ||
    voices[0]
  )
}

// 瀏覽器聲音列表載入完成時快取聲音引擎
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = pickVoice() }
  cachedVoice = pickVoice()
}

// 播放英文單字或句子
// text：要朗讀的英文文字
// rate：語速，0.85 是稍微放慢，讓國小生聽清楚
function playAudio(text) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang    = 'en-US'
  utter.rate    = 0.85
  utter.pitch   = 1.05
  if (!cachedVoice) cachedVoice = pickVoice()
  if (cachedVoice) utter.voice = cachedVoice
  window.speechSynthesis.speak(utter)
  // 「聽力小耳朵」獎章用：記錄一次聽力發音點擊，失敗不影響操作
  api.post('/questions/log-activity', { activity_type: 'listening' }).catch(() => {})
}

// ── 題目資料 ────────────────────────────────────────────
const questions    = ref([])
const currentIndex = ref(0)
const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null)

// 圖片題載入失敗時顯示問號佔位，換題時要重置，不然錯誤狀態會延續到下一題
const imageLoadFailed = ref(false)

// 聽力題自動播放：題目切換（含第一題載入）時，如果是聽力題就自動唸一次
watch(currentQuestion, (q) => {
  imageLoadFailed.value = false
  if (q?.audio_text) {
    nextTick(() => setTimeout(() => playAudio(q.audio_text), 400))
  }
})

// ── 答題狀態 ────────────────────────────────────────────
const answered    = ref(false)
const fillAnswer  = ref('')
const fillInput   = ref(null)

// 排序題
const orderBank     = ref([])
const orderSelected = ref([])

// ── 計時 ────────────────────────────────────────────────
const timeLeft = ref(TIME_LIMIT)
const CIRC     = 2 * Math.PI * 34   // r=34 → 約 213.6
const ringDash = computed(() => (timeLeft.value / TIME_LIMIT) * CIRC)

let questionTimer = null

function timerTick() {
  if (timeLeft.value <= 0) {
    clearInterval(questionTimer)
    if (!answered.value) autoSubmit()
  } else {
    timeLeft.value--
  }
}
function startTimer() {
  clearInterval(questionTimer)
  timeLeft.value = TIME_LIMIT
  questionTimer = setInterval(timerTick, 1000)
}

// 時間到自動提交空答案
async function autoSubmit() {
  answered.value = true
  lastCorrect.value = false
  lastScore.value   = 0
  showResult.value  = true

  await postAnswer('', timeLeft.value)
  setTimeout(nextQuestion, 1800)
}

// ── 分數 ────────────────────────────────────────────────
const roundScore   = ref(0)
const correctCount = ref(0)
const streak       = ref(0)

// ── 答對動畫 ────────────────────────────────────────────
const showResult     = ref(false)
const lastCorrect    = ref(false)
const lastScore      = ref(0)
const selectedOpt    = ref(null)

// 圖片題、聽力題跟一般選擇題一樣是「從選項挑一個」的互動方式，共用同一套 UI
const isMcq = computed(() => {
  const type = currentQuestion.value?.question_type
  return type === 'mcq' || type === 'image_choice' || type === 'listening'
})

function optionClass(opt) {
  if (!answered.value) return ''
  if (opt === currentQuestion.value?.correct_answer) return 'opt-correct'
  if (opt === selectedOpt.value && !lastCorrect.value) return 'opt-wrong'
  return 'opt-dim'
}

// ── MCQ 提交 ─────────────────────────────────────────────
async function submitAnswer(opt) {
  if (answered.value) return
  answered.value  = true
  selectedOpt.value = opt
  clearInterval(questionTimer)

  const timeTaken = TIME_LIMIT - timeLeft.value
  const { data }  = await postAnswer(opt, timeTaken)

  lastCorrect.value    = data.is_correct
  lastScore.value      = data.round_score
  if (data.correct_answer !== undefined)
    currentQuestion.value.correct_answer = data.correct_answer

  updateScore(data)
  showResult.value = true
  setTimeout(nextQuestion, 1800)
}

// ── 填空提交 ─────────────────────────────────────────────
async function submitFill() {
  if (answered.value || !fillAnswer.value.trim()) return
  answered.value = true
  clearInterval(questionTimer)

  const timeTaken = TIME_LIMIT - timeLeft.value
  const { data }  = await postAnswer(fillAnswer.value.trim(), timeTaken)

  lastCorrect.value    = data.is_correct
  lastScore.value      = data.round_score
  if (data.correct_answer !== undefined)
    currentQuestion.value.correct_answer = data.correct_answer

  updateScore(data)
  showResult.value = true
  setTimeout(nextQuestion, 1800)
}

// ── 排序題 ───────────────────────────────────────────────
function pickWord(word) {
  if (!orderSelected.value.includes(word))
    orderSelected.value.push(word)
}
function removeWord(idx) {
  if (!answered.value) orderSelected.value.splice(idx, 1)
}
async function submitOrder() {
  if (answered.value || !orderSelected.value.length) return
  answered.value = true
  clearInterval(questionTimer)

  const answer    = orderSelected.value.join(' ')
  const timeTaken = TIME_LIMIT - timeLeft.value
  const { data }  = await postAnswer(answer, timeTaken)

  lastCorrect.value    = data.is_correct
  lastScore.value      = data.round_score
  if (data.correct_answer !== undefined)
    currentQuestion.value.correct_answer = data.correct_answer
  updateScore(data)
  showResult.value = true
  setTimeout(nextQuestion, 1800)
}

// ── 共用：呼叫 submit API ────────────────────────────────
async function postAnswer(answer, timeTaken) {
  try {
    return await api.post('/game/session/submit', {
      session_id:    SESSION_ID,
      question_id:   currentQuestion.value.question_id,
      user_answer:   answer,
      response_time: timeTaken,
    })
  } catch {
    return { data: { is_correct: false, round_score: 0, base_score: 0, speed_bonus: 0 } }
  }
}

function updateScore(data) {
  if (data.is_correct) {
    correctCount.value++
    streak.value++
    roundScore.value += data.round_score
  } else {
    streak.value = 0
  }
}

// ── 下一題 ───────────────────────────────────────────────
function nextQuestion() {
  showResult.value  = false
  answered.value    = false
  selectedOpt.value = null
  fillAnswer.value  = ''
  orderSelected.value = []

  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
    // 初始化排序題字庫
    initOrderBank()
    nextTick(() => {
      if (currentQuestion.value?.question_type === 'fill_blank') {
        fillInput.value?.focus()
      }
    })
    startTimer()
  } else {
    // 個人挑戰答完最後一題就直接結算，不用等任何人
    clearInterval(questionTimer)
    isFinished.value = true
  }
}

function initOrderBank() {
  const q = questions.value[currentIndex.value]
  if (q?.question_type === 'ordering') {
    orderBank.value     = q.correct_answer.split(' ').sort(() => Math.random() - 0.5)
    orderSelected.value = []
  }
}

// ── 題型標籤 ─────────────────────────────────────────────
function typeLabel(type) {
  const map = {
    mcq: '選擇題', fill_blank: '填空題', ordering: '排序題',
    image_choice: '圖片題', listening: '聽力題',
  }
  return map[type] ?? type
}

// ── 進度 ─────────────────────────────────────────────────
const qProgress = computed(() =>
  ((currentIndex.value) / Math.max(questions.value.length, 1)) * 100
)
const accuracy = computed(() =>
  questions.value.length
    ? Math.round((correctCount.value / questions.value.length) * 100)
    : 0
)

// ── 完成狀態 ─────────────────────────────────────────────
const isFinished = ref(false)


// ── 載入題目 ─────────────────────────────────────────────
// 不管是第一次進場次、還是中途重新整理/斷線重進，都靠 session_id
// 向後端要完整狀態，不依賴 history.state（重新整理後就沒了）。
// 以前這裡失敗會靜默退回寫死的假題目，畫面看起來正常但其實跟真實
// 場次完全脫鉤，出過事故（單元9/10練習頁也中過同一種招）——改成
// 失敗就老實顯示錯誤，讓人重試，不要偷偷塞假資料。
const loadError = ref('')

async function fetchSession() {
  loadError.value = ''
  try {
    const { data } = await api.get(`/game/session/${SESSION_ID}/resume`)

    // 場次其實已經結束了（可能是之前中斷、教師強制結束），不用再答題，
    // 直接進結果頁
    if (data.session_status === 'completed') {
      goResult()
      return
    }

    questions.value  = data.questions

    // 接上已經答過的進度：分數/答對數還原，跳到第一題還沒答的
    const answeredIds   = new Set(data.answered_question_ids ?? [])
    correctCount.value  = data.correct_so_far ?? 0
    roundScore.value    = data.score_so_far ?? 0

    const firstUnanswered = questions.value.findIndex(q => !answeredIds.has(q.question_id))
    if (firstUnanswered === -1) {
      // 題目全部都答過了，直接顯示完成畫面
      isFinished.value = true
      return
    }
    currentIndex.value = firstUnanswered

    initOrderBank()
    startTimer()
  } catch (e) {
    console.error('fetchSession', e)
    loadError.value = e.response?.data?.error || '連不上伺服器，請檢查網路後重試'
  }
}

// ── 跳轉結果頁 ────────────────────────────────────────────
function goResult() {
  router.push({ name: 'pk-result', params: { sessionId: SESSION_ID } })
}

onMounted(() => {
  fetchSession()
})
onUnmounted(() => {
  clearInterval(questionTimer)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

.battle-page {
  font-family: 'Nunito', sans-serif;
  background: #3D2B00;
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  padding-bottom: 40px;
}

/* 背景裝飾 */
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: .15;
  pointer-events: none;
}
.bl1 { width:300px;height:300px;background:#FF8C00;top:-80px;right:-80px }
.bl2 { width:200px;height:200px;background:#F59E0B;bottom:100px;left:-60px }

/* ── 頂部 ── */
.top-bar {
  padding: 14px 16px 10px;
  background: rgba(255,255,255,.04);
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.progress-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.q-count {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,.5);
  white-space: nowrap;
}
.q-bar {
  flex: 1;
  height: 5px;
  background: rgba(255,255,255,.1);
  border-radius: 3px;
  overflow: hidden;
}
.q-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF8C00, #FF6B35);
  border-radius: 3px;
  transition: width .4s ease;
}

/* ── 計時器區 ── */
.timer-area {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
}
.timer-ring-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}
.timer-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring-track {
  fill: none;
  stroke: rgba(255,255,255,.1);
  stroke-width: 5;
}
.ring-fill {
  fill: none;
  stroke: #66BB6A;
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dasharray .9s linear, stroke .3s;
}
.ring-fill.urgent { stroke: #F87171; }
.timer-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.timer-num {
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  transition: color .3s;
}
.timer-num.urgent { color: #F87171; }
.timer-lbl { font-size: 10px; color: rgba(255,255,255,.5); }

/* 分數板 */
.score-board {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(255,255,255,.05);
  border-radius: 16px;
  padding: 12px 14px;
  gap: 0;
}
.score-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.score-num {
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
}
.correct-count { color: #66BB6A; }
.score-lbl { font-size: 10px; color: rgba(255,255,255,.45); }
.score-divider {
  width: 1px;
  height: 32px;
  background: rgba(255,255,255,.1);
  flex-shrink: 0;
}

/* ── 答題結果 Overlay ── */
.result-overlay {
  /* 原本是 position:absolute 貼著 .battle-page（可能比 100vh 高很多，
     因為底下還有題目卡），bottom:0 會跟著撐到整個頁面底部，內容置中
     後常常被擠到第一屏看不到。改成 fixed 直接貼視窗，才能保證答題結果
     一定在畫面正中間、看得到。 */
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 50;
  border-radius: 0;
  pointer-events: none;
}
.overlay-correct { background: rgba(76,175,80, .92); }
.overlay-wrong   { background: rgba(239, 68,  68,  .88); }
.result-icon  { font-size: 56px; margin-bottom: 8px; }
.result-txt   { font-size: 24px; font-weight: 900; color: #fff; margin-bottom: 6px; }
.result-score { font-size: 32px; font-weight: 900; color: #fff; }
.result-answer {
  font-size: 14px;
  color: rgba(255,255,255,.9);
  margin-top: 8px;
  background: rgba(0,0,0,.2);
  padding: 6px 14px;
  border-radius: 20px;
}

.result-pop-enter-active { transition: all .25s cubic-bezier(.34,1.56,.64,1); }
.result-pop-leave-active { transition: all .2s ease; }
.result-pop-enter-from   { transform: scale(.7); opacity: 0; }
.result-pop-leave-to     { transform: scale(1.05); opacity: 0; }

/* ── 題目卡 ── */
.question-card {
  margin: 0 16px 16px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 22px;
  padding: 20px 18px;
  backdrop-filter: blur(8px);
}

.q-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.q-type-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
}
.type-mcq          { background: #FFF3E0; color: #E65100; }
.type-fill_blank   { background: #FEF3C7; color: #92400E; }
.type-ordering     { background: #F1F8F2; color: #2E7D32; }
.type-image_choice { background: #FFF3E0; color: #BF360C; }
.type-listening    { background: #FFF3E0; color: #8B4500; }
.q-diff { font-size: 13px; }

.question-image-wrap {
  display: flex;
  justify-content: center;
  margin: 16px 0;
}
.question-image {
  max-width: 220px;
  max-height: 180px;
  border-radius: 16px;
  border: 3px solid #FFE0B2;
  object-fit: cover;
}
.image-fallback {
  font-size: 48px;
  text-align: center;
  padding: 20px;
}
.listening-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 20px 0;
}
.play-audio-btn {
  padding: 14px 28px;
  border-radius: 50px;
  border: none;
  background: linear-gradient(135deg, #FF8C00, #FF6B35);
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 17px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(255,140,0,0.35);
  transition: transform 0.15s;
}
.play-audio-btn:hover  { transform: scale(1.05); }
.play-audio-btn:active { transform: scale(0.95); }
.listening-hint {
  font-size: 13px;
  color: #A6842E;
  font-family: 'Nunito', sans-serif;
  margin: 0;
}

.q-text {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  line-height: 1.6;
  margin-bottom: 18px;
}

/* MCQ 選項 */
.options-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.option-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border-radius: 14px;
  border: 1.5px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.06);
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-align: left;
  transition: all .15s;
  width: 100%;
}
.option-btn:hover:not(:disabled) {
  border-color: #FF8C00;
  background: rgba(255,140,0,.2);
  transform: translateX(3px);
}
.option-btn:disabled { cursor: not-allowed; }

.opt-letter {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  flex-shrink: 0;
}
.opt-correct {
  border-color: #66BB6A !important;
  background: rgba(102,187,106,.25) !important;
}
.opt-correct .opt-letter { background: #66BB6A; color: #fff; }
.opt-wrong {
  border-color: #F87171 !important;
  background: rgba(248,113,113,.2) !important;
}
.opt-wrong .opt-letter { background: #F87171; color: #fff; }
.opt-dim { opacity: .35; }

/* 填空題 */
.fill-area { display: flex; flex-direction: column; gap: 8px; }
.fill-input-wrap {
  display: flex;
  gap: 8px;
}
.fill-input {
  flex: 1;
  padding: 13px 14px;
  border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,.2);
  background: rgba(255,255,255,.08);
  font-family: 'Nunito', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  outline: none;
  transition: border-color .15s;
}
.fill-input::placeholder { color: rgba(255,255,255,.3); }
.fill-input:focus { border-color: #FF8C00; }
.fill-input.correct { border-color: #66BB6A; background: rgba(102,187,106,.15); }
.fill-input.wrong   { border-color: #F87171; background: rgba(248,113,113,.1); }

.fill-send-btn {
  padding: 12px 18px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #FF8C00, #FF6B35);
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity .15s, transform .15s;
  white-space: nowrap;
}
.fill-send-btn:disabled { opacity: .4; cursor: not-allowed; }
.fill-send-btn:not(:disabled):hover { opacity: .9; transform: translateY(-1px); }

.fill-hint { font-size: 11px; color: rgba(255,255,255,.35); text-align: center; }

/* 排序題 */
.order-area { display: flex; flex-direction: column; gap: 12px; }
.order-bank { display: flex; flex-wrap: wrap; gap: 8px; }
.order-word {
  padding: 8px 14px;
  border-radius: 20px;
  border: 1.5px solid rgba(255,255,255,.2);
  background: rgba(255,255,255,.08);
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all .15s;
}
.order-word:hover:not(:disabled):not(.used) {
  border-color: #FF8C00;
  background: rgba(255,140,0,.25);
}
.order-word.used { opacity: .25; cursor: not-allowed; }

.order-sentence {
  min-height: 52px;
  border-radius: 12px;
  border: 1.5px dashed rgba(255,255,255,.2);
  padding: 10px 12px;
  display: flex;
  align-items: center;
}
.order-slots { display: flex; flex-wrap: wrap; gap: 6px; }
.order-placeholder { color: rgba(255,255,255,.25); font-size: 13px; }
.order-slot {
  padding: 5px 12px;
  border-radius: 20px;
  background: #FF8C00;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .15s;
}
.order-slot:hover { opacity: .8; }
.order-submit { margin-top: 4px; }

/* 題目切換動畫 */
.slide-q-enter-active { transition: all .3s cubic-bezier(.34,1.56,.64,1); }
.slide-q-leave-active { transition: all .2s ease; }
.slide-q-enter-from   { transform: translateX(40px); opacity: 0; }
.slide-q-leave-to     { transform: translateX(-30px); opacity: 0; }

/* ── 完成畫面 ── */
.finish-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}
.finish-icon  { font-size: 64px; margin-bottom: 12px; }
.finish-title {
  font-size: 24px;
  font-weight: 900;
  color: #fff;
  margin-bottom: 24px;
}
.finish-stats {
  display: flex;
  gap: 24px;
  background: rgba(255,255,255,.06);
  border-radius: 18px;
  padding: 20px 28px;
  margin-bottom: 28px;
}
.f-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.f-num  { font-size: 26px; font-weight: 900; color: #fff; line-height: 1; }
.f-lbl  { font-size: 11px; color: rgba(255,255,255,.45); }

.next-btn {
  padding: 15px 36px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #F59E0B, #EF4444);
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 8px 24px #FF8C0040;
  transition: transform .18s, box-shadow .18s;
}
.next-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px #EF444450; }
.next-btn:active { transform: scale(.97); }

/* ── 載入失敗 ── */
.error-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}
.error-icon  { font-size: 56px; margin-bottom: 12px; }
.error-title { font-size: 20px; font-weight: 900; color: #fff; margin-bottom: 8px; }
.error-sub   { font-size: 13px; color: rgba(255,255,255,.5); margin-bottom: 24px; max-width: 280px; }
.retry-btn {
  padding: 13px 32px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #FF8C00, #FF6B35);
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(255,140,0,.35);
}

</style>
<style scoped>
@media (min-width:768px){.battle-page{max-width:600px}.battle-header{padding:18px 24px}.timer-wrap{width:96px;height:96px}.q-text{font-size:19px}.option-btn,.fill-input,.fill-send-btn,.word-chip,.next-btn{min-height:48px;font-size:16px}.question-card{padding:24px}.answer-grid{gap:14px}}
@media (min-width:1024px){.battle-page{max-width:768px}.battle-main{display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:start}.question-card{margin:0}.answer-area{margin:0}.answer-grid{grid-template-columns:repeat(2,1fr)}.battle-header{padding-left:32px;padding-right:32px}}
</style>
