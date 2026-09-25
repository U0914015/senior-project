<template>
  <div class="register-page">

    <!-- 背景裝飾泡泡 -->
    <div class="bg-bubble b1" aria-hidden="true"/>
    <div class="bg-bubble b2" aria-hidden="true"/>
    <div class="bg-bubble b3" aria-hidden="true"/>

    <div class="card">

      <!-- Logo 區 -->
      <div class="logo-area">
        <div class="logo-icon">⚔️</div>
        <h1 class="logo-title">英語 PK 挑戰</h1>
        <p class="logo-sub">建立你的冒險帳號</p>
      </div>

      <!-- 表單 -->
      <form class="form" @submit.prevent="handleRegister" novalidate>

        <!-- 學號 -->
        <div class="field" :class="{ error: errors.student_id, success: touched.student_id && !errors.student_id }">
          <label class="field-label" for="student_id">
            <span class="label-icon">🪪</span> 學號
          </label>
          <div class="input-wrap">
            <input
              id="student_id"
              v-model.trim="form.student_id"
              type="text"
              class="field-input"
              placeholder="例：114524001"
              autocomplete="username"
              @blur="validate('student_id')"
            />
            <span class="field-status-icon">
              {{ touched.student_id ? (errors.student_id ? '✗' : '✓') : '' }}
            </span>
          </div>
          <p v-if="errors.student_id" class="field-err">{{ errors.student_id }}</p>
        </div>

        <!-- 暱稱 -->
        <div class="field" :class="{ error: errors.nickname, success: touched.nickname && !errors.nickname }">
          <label class="field-label" for="nickname">
            <span class="label-icon">✨</span> 遊戲暱稱
          </label>
          <div class="input-wrap">
            <input
              id="nickname"
              v-model.trim="form.nickname"
              type="text"
              class="field-input"
              placeholder="在小組排行上顯示的名字"
              maxlength="20"
              @blur="validate('nickname')"
            />
            <span class="char-hint">{{ form.nickname.length }}/20</span>
          </div>
          <p v-if="errors.nickname" class="field-err">{{ errors.nickname }}</p>
        </div>

        <!-- 班級代碼 -->
        <div class="field" :class="{ error: errors.class_code, success: touched.class_code && !errors.class_code }">
          <label class="field-label" for="class_code">
            <span class="label-icon">🏫</span> 班級代碼
          </label>
          <div class="input-wrap">
            <input
              id="class_code"
              v-model.trim="form.class_code"
              type="text"
              class="field-input"
              placeholder="請輸入老師提供的代碼"
              maxlength="10"
              style="text-transform:uppercase"
              @blur="validate('class_code')"
            />
            <span class="field-status-icon">
              {{ touched.class_code ? (errors.class_code ? '✗' : '✓') : '' }}
            </span>
          </div>
          <p v-if="errors.class_code" class="field-err">{{ errors.class_code }}</p>
          <p v-else class="field-hint">由老師在黑板上寫給你，輸入大寫英文+數字</p>
        </div>

        <!-- 密碼 -->
        <div class="field" :class="{ error: errors.password, success: touched.password && !errors.password }">
          <label class="field-label" for="password">
            <span class="label-icon">🔒</span> 密碼
          </label>
          <div class="input-wrap">
            <input
              id="password"
              v-model="form.password"
              :type="showPwd ? 'text' : 'password'"
              class="field-input"
              placeholder="至少 8 位，英文＋數字"
              autocomplete="new-password"
              @blur="validate('password')"
              @input="checkStrength"
            />
            <button type="button" class="eye-btn" @click="showPwd = !showPwd"
                    :aria-label="showPwd ? '隱藏密碼' : '顯示密碼'">
              {{ showPwd ? '🙈' : '👁️' }}
            </button>
          </div>
          <!-- 強度條 -->
          <div v-if="form.password" class="strength-wrap">
            <div class="strength-bar">
              <div class="strength-fill" :class="`str-${strength.level}`"
                   :style="{ width: strength.pct + '%' }"/>
            </div>
            <span class="strength-label" :class="`str-${strength.level}`">
              {{ strength.text }}
            </span>
          </div>
          <p v-if="errors.password" class="field-err">{{ errors.password }}</p>
        </div>

        <!-- 確認密碼 -->
        <div class="field" :class="{ error: errors.confirm, success: touched.confirm && !errors.confirm }">
          <label class="field-label" for="confirm">
            <span class="label-icon">🔒</span> 確認密碼
          </label>
          <div class="input-wrap">
            <input
              id="confirm"
              v-model="form.confirm"
              :type="showPwd ? 'text' : 'password'"
              class="field-input"
              placeholder="再輸入一次密碼"
              autocomplete="new-password"
              @blur="validate('confirm')"
            />
            <span class="field-status-icon">
              {{ touched.confirm ? (errors.confirm ? '✗' : '✓') : '' }}
            </span>
          </div>
          <p v-if="errors.confirm" class="field-err">{{ errors.confirm }}</p>
        </div>

        <!-- API 錯誤 -->
        <div v-if="apiError" class="api-error">
          ⚠️ {{ apiError }}
        </div>

        <!-- 送出按鈕 -->
        <button
          type="submit"
          class="submit-btn"
          :class="{ loading: isLoading }"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="spin">⏳</span>
          <span v-else>🚀 建立帳號，出發！</span>
        </button>

      </form>

      <!-- 切換到登入 -->
      <p class="switch-row">
        已經有帳號了？
        <router-link to="/login" class="switch-link">點這裡登入</router-link>
      </p>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

const router = useRouter()

// ── 表單資料 ─────────────────────────────────────────────
const form = reactive({
  student_id: '',
  nickname:   '',
  class_code: '',
  password:   '',
  confirm:    '',
})

const errors  = reactive({})
const touched = reactive({})
const showPwd   = ref(false)
const isLoading = ref(false)
const apiError  = ref('')

// ── 密碼強度 ─────────────────────────────────────────────
const strength = reactive({ level: 'weak', pct: 0, text: '太短了' })

function checkStrength() {
  const p = form.password
  let score = 0
  if (p.length >= 8)               score++
  if (p.length >= 12)              score++
  if (/[A-Za-z]/.test(p))         score++
  if (/[0-9]/.test(p))            score++
  if (/[^A-Za-z0-9]/.test(p))     score++

  if (score <= 1)      Object.assign(strength, { level: 'weak',   pct: 25,  text: '太簡單' })
  else if (score <= 2) Object.assign(strength, { level: 'fair',   pct: 50,  text: '普通' })
  else if (score <= 3) Object.assign(strength, { level: 'good',   pct: 75,  text: '不錯！' })
  else                 Object.assign(strength, { level: 'strong', pct: 100, text: '超強💪' })
}

// ── 驗證 ─────────────────────────────────────────────────
function validate(field) {
  touched[field] = true
  errors[field]  = ''

  switch (field) {
    case 'student_id':
      if (!form.student_id)
        errors.student_id = '請輸入學號'
      else if (form.student_id.length < 3)
        errors.student_id = '學號至少 3 位'
      break

    case 'nickname':
      if (!form.nickname)
        errors.nickname = '請輸入遊戲暱稱'
      else if (form.nickname.length < 2)
        errors.nickname = '暱稱至少 2 個字'
      break

    case 'class_code':
      if (!form.class_code)
        errors.class_code = '請輸入班級代碼'
      else if (form.class_code.length < 4)
        errors.class_code = '班級代碼至少 4 位'
      break

    case 'password':
      if (!form.password)
        errors.password = '請輸入密碼'
      else if (form.password.length < 8)
        errors.password = '密碼至少需要 8 位'
      else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))
        errors.password = '密碼需包含英文和數字'
      break

    case 'confirm':
      if (!form.confirm)
        errors.confirm = '請再輸入一次密碼'
      else if (form.confirm !== form.password)
        errors.confirm = '兩次密碼不一樣，請重新輸入'
      break
  }
}

function validateAll() {
  ;['student_id', 'nickname', 'class_code', 'password', 'confirm'].forEach(validate)
  return !Object.values(errors).some(Boolean)
}

// ── 送出 ─────────────────────────────────────────────────
async function handleRegister() {
  apiError.value = ''
  if (!validateAll()) return

  isLoading.value = true
  try {
    await api.post('/auth/register', {
      student_id: form.student_id,
      nickname:   form.nickname,
      class_code: form.class_code.toUpperCase(),
      password:   form.password,
    })
    // 成功 → 跳登入頁，帶成功提示
    router.push({ name: 'login', query: { registered: '1' } })
  } catch (e) {
    apiError.value = e.response?.data?.error ?? '註冊失敗，請稍後再試'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

/* ── 頁面底色 ── */
.register-page {
  min-height: 100vh;
  background: linear-gradient(145deg, #5D3A00 0%, #8B4500 60%, #5D3A00 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px 40px;
  font-family: 'Nunito', sans-serif;
  position: relative;
  overflow: hidden;
}

/* ── 背景泡泡 ── */
.bg-bubble {
  position: absolute;
  border-radius: 50%;
  opacity: .12;
  pointer-events: none;
}
.b1 { width: 320px; height: 320px; background: #FFB74D; top: -80px; right: -80px; }
.b2 { width: 200px; height: 200px; background: #66BB6A; bottom: 40px; left: -60px; }
.b3 { width: 140px; height: 140px; background: #FFAB73; top: 40%; left: 10%; }

/* ── 卡片 ── */
.card {
  background: #fff;
  border-radius: 28px;
  width: 100%;
  max-width: 400px;
  padding: 28px 28px 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, .35);
  position: relative;
  z-index: 1;
}

/* ── Logo ── */
.logo-area {
  text-align: center;
  margin-bottom: 24px;
}
.logo-icon {
  font-size: 40px;
  margin-bottom: 6px;
  display: block;
}
.logo-title {
  font-size: 22px;
  font-weight: 900;
  color: #3D2B00;
  margin: 0 0 4px;
  letter-spacing: -.3px;
}
.logo-sub {
  font-size: 13px;
  color: #8B6914;
  margin: 0;
}

/* ── 欄位 ── */
.field {
  margin-bottom: 16px;
}
.field-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  color: #3D2B00;
  margin-bottom: 6px;
}
.label-icon { font-size: 14px; }

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.field-input {
  width: 100%;
  padding: 11px 40px 11px 14px;
  border-radius: 12px;
  border: 2px solid #FFE0B2;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  color: #3D2B00;
  outline: none;
  transition: border-color .18s, box-shadow .18s;
  background: #FFFBF0;
}
.field-input:focus {
  border-color: #FF8C00;
  background: #fff;
  box-shadow: 0 0 0 3px #FF8C0030;
}
.field.error .field-input   { border-color: #F87171; background: #FFF5F5; }
.field.success .field-input { border-color: #66BB6A; background: #F1F8F2; }

.field-status-icon {
  position: absolute;
  right: 12px;
  font-size: 14px;
  font-weight: 800;
  pointer-events: none;
}
.field.error   .field-status-icon { color: #EF4444; }
.field.success .field-status-icon { color: #4CAF50; }

.char-hint {
  position: absolute;
  right: 12px;
  font-size: 11px;
  color: #A6842E;
  pointer-events: none;
}

.eye-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  line-height: 1;
}

.field-err {
  font-size: 12px;
  color: #EF4444;
  margin: 4px 0 0 2px;
  font-weight: 600;
}
.field-hint {
  font-size: 11px;
  color: #A6842E;
  margin: 4px 0 0 2px;
}

/* ── 密碼強度 ── */
.strength-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.strength-bar {
  flex: 1;
  height: 5px;
  background: #FFE0B2;
  border-radius: 3px;
  overflow: hidden;
}
.strength-fill {
  height: 100%;
  border-radius: 3px;
  transition: width .3s, background .3s;
}
.str-weak   { background: #F87171; }
.str-fair   { background: #FBBF24; }
.str-good   { background: #66BB6A; }
.str-strong { background: #4CAF50; }

.strength-label {
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.str-weak  .strength-label,
span.str-weak   { color: #EF4444; }
span.str-fair   { color: #F59E0B; }
span.str-good   { color: #4CAF50; }
span.str-strong { color: #43A047; }

/* ── API 錯誤 ── */
.api-error {
  background: #FEF2F2;
  border: 1.5px solid #FECACA;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: #B91C1C;
  font-weight: 600;
  margin-bottom: 14px;
}

/* ── 送出按鈕 ── */
.submit-btn {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #FF8C00 0%, #FF6B35 100%);
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: .3px;
  transition: transform .18s, box-shadow .18s, opacity .18s;
  box-shadow: 0 6px 20px #FF8C0040;
  margin-bottom: 16px;
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px #FF8C0055;
}
.submit-btn:active:not(:disabled) { transform: scale(.98); }
.submit-btn:disabled {
  opacity: .7;
  cursor: not-allowed;
}
.submit-btn.loading { opacity: .8; }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 切換 ── */
.switch-row {
  text-align: center;
  font-size: 13px;
  color: #8B6914;
  margin: 0;
}
.switch-link {
  color: #FF8C00;
  font-weight: 700;
  text-decoration: none;
}
.switch-link:hover { text-decoration: underline; }
</style>
