<template>
  <div class="review-page">
    <NavBar title="單字複習" />
    <div class="bg-blob b1" aria-hidden="true"/>

    <!-- 頂部 -->
    <header class="top-bar">
      <button class="back-btn" @click="router.back()">←</button>
      <div class="top-center">
        <span class="top-title">今日學習單元</span>
        <span class="top-sub">{{ unitName }}</span>
      </div>
      <div style="width:36px"/>
    </header>

    <!-- 進度條 -->
    <div class="progress-wrap">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPct + '%' }"/>
      </div>
      <span class="progress-txt">{{ currentIdx + 1 }} / {{ words.length }}</span>
    </div>

    <!-- 單字卡 -->
    <div class="card-area">
      <Transition :name="slideDir" mode="out-in">
        <div v-if="currentWord" :key="currentIdx" class="word-card">
          <!-- 圖示區：有插圖用插圖，沒有就退回字母圓圈 -->
          <div class="word-icon">
            <img
              v-if="currentWord.image_url && !imageLoadFailed"
              :src="currentWord.image_url"
              :alt="currentWord.english"
              class="word-image"
              @error="imageLoadFailed = true"
            />
            <div v-else class="icon-circle">
              {{ currentWord.english.charAt(0).toUpperCase() }}
            </div>
          </div>
          <!-- 英文 -->
          <div class="word-english">{{ currentWord.english }}</div>
          <!-- 例句 -->
          <div class="word-sentence">
            {{ exampleSentence(currentWord) }}
          </div>
          <!-- 中文 -->
          <div class="word-chinese">{{ currentWord.chinese }}</div>
          <!-- 詞性 -->
          <div class="pos-tag">{{ posLabel(currentWord.part_of_speech) }}</div>
        </div>
      </Transition>
    </div>

    <!-- 導航按鈕 -->
    <div class="nav-btns">
      <button class="nav-btn prev" :disabled="currentIdx === 0" @click="prev">
        ← 上一個
      </button>
      <button v-if="currentIdx < words.length - 1" class="nav-btn next" @click="next">
        下一個 →
      </button>
      <button v-else class="nav-btn done" @click="startPractice">
        開始練習 →
      </button>
    </div>

    <!-- 載入中 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"/>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/axios'
import NavBar from '@/components/NavBar.vue'

const router    = useRouter()
const route     = useRoute()
const themeId   = Number(route.params.themeId)
const unitName  = history.state?.unitName ?? `單元 ${themeId}`

const words      = ref([])
const currentIdx = ref(0)
// 圖片載入失敗時退回字母圓圈，換卡時要重置，不然錯誤狀態會延續到下一張卡
const imageLoadFailed = ref(false)
watch(currentIdx, () => { imageLoadFailed.value = false })
const isLoading  = ref(false)
const slideDir   = ref('slide-left')

const currentWord  = computed(() => words.value[currentIdx.value] ?? null)
const progressPct  = computed(() =>
  words.value.length ? Math.round(((currentIdx.value + 1) / words.value.length) * 100) : 0
)

function posLabel(pos) {
  const map = { noun:'名詞', verb:'動詞', adjective:'形容詞', pronoun:'代名詞', number:'數字', preposition:'介系詞', other:'其他' }
  return map[pos] ?? pos
}

// 例句：以前是不分詞性統一套「This is a {word}.」，會出現「This is a cloudy.」這種文法錯誤的句子
// （cloudy 是形容詞，不能加冠詞）。改成依詞性/語意挑對應到教材裡實際會用到的句型——
// 天氣形容詞用「It's cloudy.」、報時數字用「It's three o'clock.」、三餐/作息名詞用
// 「It's time for lunch.」，其餘才退回「This is a/an {word}.」的具體名詞句型。
const HOUR_WORDS = ['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve']
const TIME_FOR_WORDS = ['breakfast', 'lunch', 'dinner', 'bed', 'class', 'school']
// 特例句：詞性規則套不上去、或套上去語意怪的單字，直接給實際會用到的句子
const SENTENCE_OVERRIDES = {
  how:       "How's the weather today?",
  weather:   "What's the weather like today?",
  time:      'What time is it?',
  "o'clock": "It's seven o'clock.",
  wind:      'The wind is blowing.',
  snatch:    'The wind snatched his hat!',
  blow:      'The wind can blow the kite away.',
  take:      'The wind can take your hat.',
  fly:       'Look! The kite can fly.',
  wolf:      "Mr. Wolf, what's the time?",
  eat:       'I eat breakfast every morning.',
  run:       'I run to school every day.',
}

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}

function exampleSentence(word) {
  if (!word) return ''
  const en = word.english
  if (SENTENCE_OVERRIDES[en]) return SENTENCE_OVERRIDES[en]
  if (word.part_of_speech === 'adjective') return `It's ${en}.`
  if (word.part_of_speech === 'number') {
    return HOUR_WORDS.includes(en) ? `It's ${en} o'clock.` : `It's three ${en}.`
  }
  if (TIME_FOR_WORDS.includes(en)) return `It's time for ${en}.`
  // 剩下的都是具體可數名詞（newspaper/umbrella/hat/clock…），套「This is a/an ___」沒問題
  return `This is ${articleFor(en)} ${en}.`
}

function next() {
  slideDir.value = 'slide-left'
  if (currentIdx.value < words.value.length - 1) currentIdx.value++
  // 「單字複習狂」獎章用：記錄一次翻牌複習，失敗不影響操作
  api.post('/questions/log-activity', { activity_type: 'word_review' }).catch(() => {})
}
function prev() {
  slideDir.value = 'slide-right'
  if (currentIdx.value > 0) currentIdx.value--
}
function startPractice() {
  // 練習頁現在自己會向後端拿這個主題的單字，這裡不用再傳 words 過去
  router.push({ name: 'word-practice', params: { themeId }, state: { unitName } })
}

async function fetchWords() {
  isLoading.value = true
  try {
    const { data } = await api.get(`/questions/review?theme_id=${themeId}&limit=10`)
    words.value = data.words ?? data
  } catch {
    // Mock 資料
    words.value = [
      { english:'apple',   chinese:'蘋果', part_of_speech:'noun' },
      { english:'banana',  chinese:'香蕉', part_of_speech:'noun' },
      { english:'cat',     chinese:'貓咪', part_of_speech:'noun' },
      { english:'dog',     chinese:'狗狗', part_of_speech:'noun' },
      { english:'elephant',chinese:'大象', part_of_speech:'noun' },
      { english:'happy',   chinese:'快樂的', part_of_speech:'adjective' },
      { english:'run',     chinese:'跑步', part_of_speech:'verb' },
      { english:'big',     chinese:'大的', part_of_speech:'adjective' },
    ]
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchWords)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
.review-page { font-family:'Nunito',sans-serif;background:#F0F7FF;min-height:100vh;padding-bottom:40px;position:relative;overflow:hidden;max-width:480px;margin:0 auto; }
.bg-blob { position:absolute;border-radius:50%;filter:blur(60px);opacity:.08;pointer-events:none; }
.b1 { width:250px;height:250px;background:#FF8C00;top:-60px;right:-60px; }
.top-bar { display:flex;align-items:center;padding:14px 16px 12px;background:#fff;border-bottom:2px solid #E8F0FE;position:sticky;top:0;z-index:10;gap:10px; }
.back-btn { width:36px;height:36px;border-radius:10px;border:1.5px solid #FFE0B2;background:#FFFBF0;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center; }
.top-center { flex:1;text-align:center; }
.top-title { display:block;font-size:14px;font-weight:800;color:#3D2B00; }
.top-sub { font-size:12px;color:#A6842E; }
.progress-wrap { display:flex;align-items:center;gap:10px;padding:12px 16px 0; }
.progress-bar { flex:1;height:8px;background:#FFE0B2;border-radius:4px;overflow:hidden; }
.progress-fill { height:100%;background:linear-gradient(90deg,#FF8C00,#FF6B35);border-radius:4px;transition:width .4s; }
.progress-txt { font-size:12px;font-weight:700;color:#8B6914;white-space:nowrap; }
.card-area { padding:20px 16px;display:flex;justify-content:center; }
.word-card { background:#fff;border-radius:24px;border:2px solid #FFE0B2;padding:28px 24px;width:100%;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.08); }
.word-icon { margin-bottom:16px; }
.icon-circle { width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#FF8C00,#FF6B35);color:#fff;font-size:32px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto;box-shadow:0 8px 20px rgba(255,140,0,.3); }
.word-image { width:100px;height:100px;border-radius:20px;border:3px solid #FFE0B2;object-fit:cover;margin:0 auto;display:block;background:#FFFBF0; }
.word-english { font-size:32px;font-weight:900;color:#3D2B00;margin-bottom:8px; }
.word-sentence { font-size:14px;color:#8B6914;margin-bottom:12px;font-style:italic; }
.word-chinese { font-size:22px;font-weight:800;color:#FF8C00;margin-bottom:10px; }
.pos-tag { display:inline-block;font-size:11px;background:#FFF3E0;color:#E65100;padding:3px 12px;border-radius:20px;font-weight:700; }
.nav-btns { display:flex;gap:10px;padding:0 16px; }
.nav-btn { flex:1;padding:13px;border-radius:14px;border:none;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;cursor:pointer;transition:all .18s; }
.nav-btn.prev { background:#FFF3E0;color:#8B6914; }
.nav-btn.next { background:linear-gradient(135deg,#FF8C00,#FF6B35);color:#fff;box-shadow:0 6px 16px rgba(255,140,0,.3); }
.nav-btn.done { background:linear-gradient(135deg,#4CAF50,#66BB6A);color:#fff;box-shadow:0 6px 16px rgba(76,175,80,.3); }
.nav-btn:disabled { opacity:.4;cursor:not-allowed; }
.loading-overlay { position:fixed;inset:0;background:rgba(255,255,255,.8);display:flex;align-items:center;justify-content:center;z-index:50; }
.spinner { width:36px;height:36px;border:3px solid #FFE0B2;border-top-color:#FF8C00;border-radius:50%;animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.slide-left-enter-active,.slide-left-leave-active { transition:all .25s ease; }
.slide-left-enter-from { transform:translateX(40px);opacity:0; }
.slide-left-leave-to  { transform:translateX(-30px);opacity:0; }
.slide-right-enter-active,.slide-right-leave-active { transition:all .25s ease; }
.slide-right-enter-from { transform:translateX(-40px);opacity:0; }
.slide-right-leave-to  { transform:translateX(30px);opacity:0; }
</style>
<style scoped>
@media (min-width:768px){.review-page{max-width:600px}.back-btn{width:44px;height:44px}.top-title{font-size:17px}.progress-wrap,.card-area,.nav-btns{padding-left:24px;padding-right:24px}.word-card{max-width:520px;padding:40px 32px}.icon-circle{width:100px;height:100px;font-size:40px}.word-image{width:120px;height:120px}.word-english{font-size:40px}.word-chinese{font-size:28px}.word-sentence{font-size:16px}.nav-btn{min-height:48px;font-size:16px}}
@media (min-width:1024px){.review-page{max-width:768px}.card-area{padding-top:32px}.word-card{max-width:620px}.nav-btns{max-width:620px;margin:0 auto}}
</style>
