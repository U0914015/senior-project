<template>
  <Teleport to="body">
    <Transition name="backdrop-fade">
      <div v-if="visible" class="backdrop" @click.self="tryClose">

        <!-- 飛起來的反應動畫，像 Google Meet 的表情反應：從畫面下方往上飄、
             淡出。目前沒有 WebSocket，只有送出的人自己看得到 -->
        <div class="reaction-layer" aria-hidden="true">
          <TransitionGroup name="float-up">
            <span v-for="r in reactions" :key="r.id" class="floating-emoji"
                  :style="{ '--drift': r.drift + 'px', left: r.left + '%' }">
              {{ r.emoji }}
            </span>
          </TransitionGroup>
        </div>

        <!-- 倒數圓環 -->
        <div class="timer-ring-wrap">
          <svg class="timer-svg" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" class="ring-track"/>
            <circle cx="28" cy="28" r="24" class="ring-fill"
              :stroke-dasharray="`${ringDash} 150.8`"
              :class="{ urgent: secondsLeft <= 60 }"/>
          </svg>
          <div class="timer-inner">
            <span class="timer-num">{{ mmss }}</span>
            <span class="timer-label">剩餘</span>
          </div>
        </div>

        <!-- 彈窗主體 -->
        <Transition name="modal-pop">
          <div v-if="visible" class="modal">

            <!-- 標頭 -->
            <div class="modal-header">
              <div class="confetti-row" aria-hidden="true">🎉</div>
              <h2 class="modal-title">PK 結束！給隊友一點鼓勵</h2>
              <p class="modal-sub">互動後可獲得社群分數，5 分鐘限定！</p>
            </div>

            <!-- 隊友列表 -->
            <div class="teammate-list">
              <div v-for="mate in teammates" :key="mate.user_id"
                   class="teammate-card"
                   :class="{ selected: selectedId === mate.user_id }"
                   @click="selectMate(mate)">
                <div class="mate-avatar" :style="{ background: mate.color }">
                  {{ mate.nickname.charAt(0) }}
                </div>
                <div class="mate-info">
                  <span class="mate-name">{{ mate.nickname }}</span>
                  <span class="mate-score">+{{ mate.session_score }} 分</span>
                </div>
                <div v-if="hasSentTo(mate.user_id)" class="sent-badge">已互動 ✓</div>
              </div>
            </div>

            <!-- 互動區（選了隊友才顯示） -->
            <Transition name="slide-up">
              <div v-if="selectedMate" class="interact-area">
                <p class="interact-title">
                  對 <strong>{{ selectedMate.nickname }}</strong> 送出：
                </p>

                <Transition name="slide-up">
                  <p v-if="errorMsg" class="interact-error">⚠️ {{ errorMsg }}</p>
                </Transition>

                <!-- Tab 切換 -->
                <div class="tab-row" role="tablist">
                  <button v-for="tab in tabs" :key="tab.id"
                          class="tab-btn"
                          :class="{ active: activeTab === tab.id }"
                          role="tab"
                          @click="activeTab = tab.id">
                    <span class="tab-icon">{{ tab.icon }}</span>
                    <span>{{ tab.label }}</span>
                    <span class="tab-pts">+{{ tab.pts }}分</span>
                  </button>
                </div>

                <!-- 按讚 -->
                <div v-if="activeTab === 'like'" class="action-panel">
                  <button class="like-big-btn"
                          :class="{ liked: liked }"
                          :disabled="liked"
                          @click="sendLike">
                    <span class="like-icon">{{ liked ? '👏' : '👏' }}</span>
                    <span>{{ liked ? '已拍拍手！' : '拍拍手' }}</span>
                  </button>
                  <p class="action-hint">每人限按一次，+10 社群分</p>
                </div>

                <!-- 貼紙 -->
                <div v-if="activeTab === 'sticker'" class="action-panel">
                  <div class="sticker-grid">
                    <button v-for="s in stickers" :key="s.tag"
                            class="sticker-btn"
                            :disabled="stickerSent"
                            :class="{ picked: selectedSticker === s.tag }"
                            @click="selectedSticker = s.tag">
                      <span class="sticker-emoji">{{ s.emoji }}</span>
                      <span class="sticker-name">{{ s.name }}</span>
                    </button>
                  </div>
                  <button class="send-btn" :disabled="!selectedSticker || stickerSent" @click="sendSticker">
                    {{ stickerSent ? '已送出貼紙 ✓' : '送出貼紙 +30分' }}
                  </button>
                  <p v-if="stickerSent" class="action-hint">每人限送一次貼紙</p>
                </div>

                <!-- 留言 -->
                <div v-if="activeTab === 'comment'" class="action-panel">
                  <div class="preset-grid">
                    <button v-for="p in presets" :key="p.text"
                            class="preset-btn"
                            :disabled="commentSent"
                            :class="[`preset-${p.category}`, { active: commentText === p.text }]"
                            @click="commentText = p.text">
                      {{ p.text }}
                    </button>
                  </div>
                  <div class="custom-row">
                    <input v-model="commentText"
                           class="comment-input"
                           maxlength="50"
                           :disabled="commentSent"
                           placeholder="或自己輸入（最多 50 字）"/>
                    <span class="char-count">{{ commentText.length }}/50</span>
                  </div>
                  <button class="send-btn" :disabled="!commentText.trim() || commentSent" @click="sendComment">
                    {{ commentSent ? '已送出留言 ✓' : '送出留言 +50分' }}
                  </button>
                  <p v-if="commentSent" class="action-hint">每人限送一次留言</p>
                </div>

              </div>
            </Transition>

            <!-- 底部：完成/跳過 -->
            <div class="modal-footer">
              <button class="skip-btn" @click="tryClose">
                {{ allSent ? '完成 → 小組排行' : '先跳過' }}
              </button>
            </div>

          </div>
        </Transition>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

// ── Props ────────────────────────────────────────────────
const props = defineProps({
  sessionId:  { type: Number, required: true },
  teammates:  { type: Array,  required: true },  // [{user_id, nickname, session_score, color}]
  durationSec:{ type: Number, default: 300 },    // 5分鐘
})
const emit = defineEmits(['close', 'done', 'badge-earned'])

const router  = useRouter()
const visible = ref(true)

// ── 倒數計時 ─────────────────────────────────────────────
const secondsLeft = ref(props.durationSec)
const CIRC = 2 * Math.PI * 24  // r=24 → 約 150.8

const ringDash = computed(() =>
  (secondsLeft.value / props.durationSec) * CIRC
)
const mmss = computed(() => {
  const m = Math.floor(secondsLeft.value / 60).toString().padStart(2, '0')
  const s = (secondsLeft.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

let timer = null
onMounted(() => {
  timer = setInterval(() => {
    if (secondsLeft.value <= 0) {
      clearInterval(timer)
      autoClose()
    } else {
      secondsLeft.value--
    }
  }, 1000)
})
onUnmounted(() => clearInterval(timer))

function autoClose() {
  visible.value = false
  setTimeout(() => {
    emit('done')
    router.push({ name: 'leaderboard' })
  }, 400)
}
function tryClose() {
  visible.value = false
  setTimeout(() => emit('close'), 400)
}

// ── 隊友選擇 ─────────────────────────────────────────────
const selectedId   = ref(null)
const selectedMate = computed(() =>
  props.teammates.find(m => m.user_id === selectedId.value) || null
)
function selectMate(mate) {
  selectedId.value   = mate.user_id
  activeTab.value    = 'like'
  liked.value        = sentActions.value[mate.user_id]?.includes('like') ?? false
  selectedSticker.value = null
  commentText.value  = ''
}

// ── 已互動記錄 ───────────────────────────────────────────
const sentActions = ref({})  // { user_id: ['like', 'sticker', 'comment'] }

function hasSentTo(uid) {
  return (sentActions.value[uid]?.length ?? 0) > 0
}
const allSent = computed(() =>
  props.teammates.every(m => hasSentTo(m.user_id))
)
function markSent(uid, type) {
  if (!sentActions.value[uid]) sentActions.value[uid] = []
  if (!sentActions.value[uid].includes(type))
    sentActions.value[uid].push(type)
}
// 貼紙、留言跟按讚一樣「每人限一次」，用 computed 自動跟著 selectedId 換人重算，
// 不用像 liked 那樣手動在 selectMate/watch 裡重設
const stickerSent = computed(() => sentActions.value[selectedId.value]?.includes('sticker') ?? false)
const commentSent = computed(() => sentActions.value[selectedId.value]?.includes('comment') ?? false)

// ── Tab ──────────────────────────────────────────────────
const activeTab = ref('like')
const tabs = [
  { id: 'like',    label: '拍拍手', icon: '👏', pts: 10 },
  { id: 'sticker', label: '貼紙',   icon: '⭐', pts: 30 },
  { id: 'comment', label: '留言',   icon: '💬', pts: 50 },
]

// ── 飛起來的反應動畫 ─────────────────────────────────────
const reactions = ref([])  // { id, emoji, left, drift }
let reactionSeq = 0
function fireReactions(emoji, count = 1) {
  for (let i = 0; i < count; i++) {
    const id = reactionSeq++
    reactions.value.push({
      id,
      emoji,
      left:  45 + Math.random() * 10,       // 畫面中間附近，留一點隨機
      drift: Math.round((Math.random() - 0.5) * 80), // 左右飄移 -40~40px
    })
    // 動畫跑完（見 CSS .floating-emoji 的 1.8s）就從陣列移除，不然元素會一直堆積
    setTimeout(() => {
      reactions.value = reactions.value.filter(r => r.id !== id)
    }, 1800)
  }
}

// ── 按讚 ─────────────────────────────────────────────────
const liked = ref(false)
async function sendLike() {
  if (liked.value || !selectedMate.value) return
  const ok = await postInteract({ action_type: 'like', score_awarded: 10 })
  if (!ok) return
  liked.value = true
  markSent(selectedMate.value.user_id, 'like')
  fireReactions('👏', 3)
}

// ── 貼紙 ─────────────────────────────────────────────────
const selectedSticker = ref(null)
const stickers = [
  { tag: 'brave',     emoji: '🦁', name: '好勇氣' },
  { tag: 'clear',     emoji: '💡', name: '說很清楚' },
  { tag: 'helpful',   emoji: '🤝', name: '很幫忙' },
  { tag: 'awesome',   emoji: '🌟', name: '很棒' },
  { tag: 'keep_going',emoji: '💪', name: '不放棄' },
  { tag: 'smart',     emoji: '🧠', name: '很聰明' },
  { tag: 'fast',      emoji: '⚡', name: '反應快' },
  { tag: 'teamwork',  emoji: '🤗', name: '好隊友' },
  { tag: 'creative',  emoji: '🎨', name: '有創意' },
]
async function sendSticker() {
  if (!selectedSticker.value || !selectedMate.value) return
  const tag = selectedSticker.value
  const ok = await postInteract({
    action_type:  'sticker',
    sticker_tag:  tag,
    score_awarded: 30
  })
  if (!ok) return
  markSent(selectedMate.value.user_id, 'sticker')
  const stickerEmoji = stickers.find(s => s.tag === tag)?.emoji ?? '⭐'
  fireReactions(stickerEmoji, 3)
  selectedSticker.value = null
}

// ── 留言 ─────────────────────────────────────────────────
const commentText = ref('')
const presets = [
  { text: '你很棒！',           category: 'encouragement' },
  { text: '加油不要怕！',       category: 'encouragement' },
  { text: '做得很好！',         category: 'encouragement' },
  { text: '你剛剛答得很好！',   category: 'performance' },
  { text: '你的反應很快！',     category: 'performance' },
  { text: '下一次一起努力！',   category: 'team_support' },
  { text: '一起加油！',         category: 'team_support' },
]
async function sendComment() {
  if (!commentText.value.trim() || !selectedMate.value) return
  const isPreset = presets.some(p => p.text === commentText.value)
  const category = presets.find(p => p.text === commentText.value)?.category ?? null
  const ok = await postInteract({
    action_type:      'comment',
    comment_text:     commentText.value.trim(),
    comment_category: category,
    is_preset:        isPreset ? 1 : 0,
    score_awarded:    50
  })
  if (!ok) return
  markSent(selectedMate.value.user_id, 'comment')
  fireReactions('💬', 3)
  commentText.value = ''
}

// ── 送出失敗提示（例如踩到「不能連續送同一人」的防偏袒規則） ──
// 之前這裡沒有回傳成功與否，呼叫端會不管後端有沒有真的存進去，
// 都先把 liked/markSent/飄動畫做掉，導致後端擋下時畫面卻顯示「已送出」
const errorMsg = ref('')
let errorTimer = null
function showError(msg) {
  errorMsg.value = msg
  clearTimeout(errorTimer)
  errorTimer = setTimeout(() => { errorMsg.value = '' }, 3000)
}

// ── 共用 API 呼叫 ────────────────────────────────────────
// 回傳 true/false，呼叫端要等這個結果才能把畫面標記成「已送出」
async function postInteract(payload) {
  try {
    const { data } = await api.post('/social/interact', {
      session_id:  props.sessionId,
      receiver_id: selectedMate.value.user_id,
      ...payload
    })
    // 互動當下就有可能跨過獎章門檻（尤其是小組共同獎章），交給外層
    // （PKResultView）決定要不要在這個彈窗關掉之後跳慶祝畫面
    if (data?.new_badges?.length > 0) {
      emit('badge-earned', data.new_badges)
    }
    return true
  } catch (e) {
    console.error('Social interact error:', e)
    showError(e.response?.data?.error || '送出失敗，請再試一次')
    return false
  }
}

// 切換隊友時重設 liked 狀態
watch(selectedId, (uid) => {
  liked.value = sentActions.value[uid]?.includes('like') ?? false
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

/* ── 遮罩 ── */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(61,43,0, 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
  font-family: 'Nunito', sans-serif;
}

/* ── 飛起來的反應動畫 ── */
.reaction-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 10000;
}
.floating-emoji {
  position: absolute;
  bottom: 12%;
  font-size: 34px;
  transform: translateX(-50%);
  animation: float-rise 1.8s ease-out forwards;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,.25));
}
@keyframes float-rise {
  0%   { transform: translate(-50%, 0) scale(.4) rotate(0deg); opacity: 0; }
  12%  { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--drift)), -60vh) scale(1.15) rotate(12deg); opacity: 0; }
}

/* ── 計時器圓環 ── */
.timer-ring-wrap {
  position: relative;
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
  flex-shrink: 0;
}
.timer-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring-track {
  fill: none;
  stroke: rgba(255,255,255,.2);
  stroke-width: 4;
}
.ring-fill {
  fill: none;
  stroke: #66BB6A;
  stroke-width: 4;
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
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}
.timer-label {
  font-size: 9px;
  color: rgba(255,255,255,.6);
}

/* ── 彈窗 ── */
.modal {
  background: #fff;
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 32px 80px rgba(0,0,0,.35);
}
.modal-header {
  text-align: center;
  padding: 20px 20px 12px;
  background: linear-gradient(135deg, #FF8C00 0%, #FF6B35 100%);
  border-radius: 24px 24px 0 0;
}
.confetti-row { font-size: 24px; margin-bottom: 4px; }
.modal-title {
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 4px;
}
.modal-sub {
  font-size: 12px;
  color: rgba(255,255,255,.8);
  margin: 0;
}

/* ── 隊友列表 ── */
.teammate-list {
  padding: 14px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.teammate-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 2px solid #FFE0B2;
  cursor: pointer;
  transition: border-color .15s, background .15s;
  background: #FFFBF0;
}
.teammate-card:hover { border-color: #FFCC80; background: #FFF3E0; }
.teammate-card.selected { border-color: #FF8C00; background: #FFF3E0; }
.mate-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.mate-info { flex: 1; min-width: 0; }
.mate-name { font-size: 13px; font-weight: 700; color: #3D2B00; display: block; }
.mate-score { font-size: 11px; color: #FF8C00; font-weight: 600; }
.sent-badge {
  font-size: 11px;
  background: #E8F5E9;
  color: #1B5E20;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 700;
  white-space: nowrap;
}

/* ── 互動區 ── */
.interact-area {
  padding: 14px 16px 0;
  border-top: 1.5px dashed #FFE0B2;
  margin-top: 12px;
}
.interact-title {
  font-size: 13px;
  color: #5C4300;
  margin: 0 0 10px;
}
.interact-title strong { color: #FF8C00; }
.interact-error {
  font-size: 12px;
  font-weight: 700;
  color: #C2410C;
  background: #FFF3E0;
  border: 1.5px solid #FFCC80;
  border-radius: 10px;
  padding: 8px 10px;
  margin: 0 0 10px;
  text-align: center;
}

/* ── Tab ── */
.tab-row {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}
.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 12px;
  border: 2px solid #FFE0B2;
  background: #FFFBF0;
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #8B6914;
  transition: all .15s;
}
.tab-btn .tab-icon { font-size: 18px; }
.tab-btn .tab-pts {
  font-size: 10px;
  color: #4CAF50;
  font-weight: 700;
}
.tab-btn.active {
  border-color: #FF8C00;
  background: #FFF3E0;
  color: #E65100;
}

/* ── 動作區塊 ── */
.action-panel { padding-bottom: 4px; }
.action-hint { font-size: 11px; color: #A6842E; text-align: center; margin: 6px 0 0; }

/* 按讚 */
.like-big-btn {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: 2px solid #FDE68A;
  background: #FFFBEB;
  font-family: 'Nunito', sans-serif;
  font-size: 15px;
  font-weight: 800;
  color: #92400E;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all .18s;
}
.like-big-btn:hover:not(:disabled) {
  background: #FEF3C7;
  transform: scale(1.02);
}
.like-big-btn.liked {
  background: #E8F5E9;
  border-color: #6EE7B7;
  color: #1B5E20;
  cursor: not-allowed;
}
.like-icon { font-size: 22px; }

/* 貼紙 */
.sticker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}
.sticker-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 14px;
  border: 2px solid #FFE0B2;
  background: #FFFBF0;
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  transition: all .15s;
}
.sticker-emoji { font-size: 28px; }
.sticker-name { font-size: 11px; font-weight: 700; color: #5C4300; }
.sticker-btn.picked {
  border-color: #FF6B35;
  background: #FFF8E1;
}
.sticker-btn:hover:not(.picked) { border-color: #FFCC80; }

/* 留言 */
.preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.preset-btn {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1.5px solid #FFE0B2;
  background: #FFFBF0;
  font-family: 'Nunito', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
  color: #3D2B00;
}
.preset-btn.preset-encouragement { border-color: #FDE68A; background: #FFFBEB; color: #92400E; }
.preset-btn.preset-performance   { border-color: #FFE0B2; background: #EFF6FF; color: #E65100; }
.preset-btn.preset-team_support  { border-color: #C8E6C9; background: #F1F8F2; color: #2E7D32; }
.preset-btn.active { transform: scale(.97); box-shadow: inset 0 2px 4px rgba(0,0,0,.08); }

.custom-row {
  position: relative;
  margin-bottom: 8px;
}
.comment-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 44px 10px 12px;
  border-radius: 12px;
  border: 1.5px solid #FFE0B2;
  font-family: 'Nunito', sans-serif;
  font-size: 13px;
  outline: none;
  transition: border-color .15s;
}
.comment-input:focus { border-color: #FF8C00; }
.char-count {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #A6842E;
}

/* 送出按鈕 */
.send-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #FF8C00, #FF6B35);
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity .15s, transform .15s;
}
.send-btn:disabled { opacity: .4; cursor: not-allowed; }
.send-btn:not(:disabled):hover { opacity: .92; transform: translateY(-1px); }

/* ── 底部 ── */
.modal-footer {
  padding: 12px 16px 16px;
  text-align: center;
}
.skip-btn {
  padding: 10px 28px;
  border-radius: 20px;
  border: 1.5px solid #FFE0B2;
  background: #FFFBF0;
  font-family: 'Nunito', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #8B6914;
  cursor: pointer;
  transition: all .15s;
}
.skip-btn:hover { border-color: #FF8C00; color: #FF8C00; }

/* ── 動畫 ── */
.backdrop-fade-enter-active,
.backdrop-fade-leave-active { transition: opacity .3s; }
.backdrop-fade-enter-from,
.backdrop-fade-leave-to { opacity: 0; }

.modal-pop-enter-active { transition: all .35s cubic-bezier(.34,1.56,.64,1); }
.modal-pop-leave-active { transition: all .25s ease; }
.modal-pop-enter-from { transform: scale(.8) translateY(40px); opacity: 0; }
.modal-pop-leave-to   { transform: scale(.95) translateY(10px); opacity: 0; }

.slide-up-enter-active { transition: all .25s ease; }
.slide-up-leave-active { transition: all .2s ease; }
.slide-up-enter-from   { transform: translateY(12px); opacity: 0; }
.slide-up-leave-to     { transform: translateY(-6px); opacity: 0; }
</style>
<style scoped>
@media (min-width:768px){.modal{width:min(600px,calc(100vw - 64px));max-height:88vh}.modal-title{font-size:22px}.modal-sub,.mate-name{font-size:16px}.teammate-card{padding:14px}.tab-btn,.preset-btn,.sticker-btn{min-height:44px}.like-big-btn,.send-btn,.skip-btn{min-height:48px;font-size:16px}.comment-input{min-height:48px;font-size:16px}.sticker-grid{grid-template-columns:repeat(4,1fr)}}
@media (min-width:1024px){.modal{width:min(720px,calc(100vw - 96px))}.teammate-list{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.sticker-grid{grid-template-columns:repeat(5,1fr)}}
</style>
