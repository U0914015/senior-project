<template>
  <div class="login-page">

    <div class="bg-bubble b1" aria-hidden="true"/>
    <div class="bg-bubble b2" aria-hidden="true"/>
    <div class="bg-bubble b3" aria-hidden="true"/>

    <!-- 註冊成功提示 -->
    <Transition name="toast-drop">
      <div v-if="registeredToast" class="toast">
        🎉 帳號建立成功！請登入開始冒險
      </div>
    </Transition>

    <div class="card">

      <!-- Logo -->
      <div class="logo-area">
        <span class="logo-icon">⚔️</span>
        <h1 class="logo-title">英語 小勇士</h1>
        <p class="logo-sub">登入繼續你的冒險</p>
      </div>

      <!-- 身份切換 -->
      <div class="role-switch" role="tablist">
        <button
          v-for="r in roles" :key="r.id"
          class="role-btn"
          :class="{ active: form.role === r.id }"
          role="tab"
          :aria-selected="form.role === r.id"
          type="button"
          @click="form.role = r.id"
        >
          <span class="role-icon">{{ r.icon }}</span>
          {{ r.label }}
        </button>
      </div>

      <!-- 表單 -->
      <form class="form" @submit.prevent="handleLogin" novalidate>

        <!-- 帳號 -->
        <div class="field"
             :class="{ error: errors.student_id, success: touched.student_id && !errors.student_id }">
          <label class="field-label" for="student_id">
            <span class="label-icon">🪪</span>
            {{ form.role === 'student' ? '學號' : '教師帳號' }}
          </label>
          <div class="input-wrap">
            <input
              id="student_id"
              v-model.trim="form.student_id"
              type="text"
              class="field-input"
              :placeholder="form.role === 'student' ? '例：114524001' : '例：teacher01'"
              autocomplete="username"
              @blur="validate('student_id')"
            />
            <span class="field-status-icon">
              {{ touched.student_id ? (errors.student_id ? '✗' : '✓') : '' }}
            </span>
          </div>
          <p v-if="errors.student_id" class="field-err">{{ errors.student_id }}</p>
        </div>

        <!-- 密碼 -->
        <div class="field"
             :class="{ error: errors.password, success: touched.password && !errors.password }">
          <label class="field-label" for="password">
            <span class="label-icon">🔒</span> 密碼
          </label>
          <div class="input-wrap">
            <input
              id="password"
              v-model="form.password"
              :type="showPwd ? 'text' : 'password'"
              class="field-input"
              placeholder="請輸入密碼"
              autocomplete="current-password"
              @blur="validate('password')"
              @keyup.enter="handleLogin"
            />
            <button type="button" class="eye-btn"
                    @click="showPwd = !showPwd"
                    :aria-label="showPwd ? '隱藏密碼' : '顯示密碼'">
              {{ showPwd ? '🙈' : '👁️' }}
            </button>
          </div>
          <p v-if="errors.password" class="field-err">{{ errors.password }}</p>
        </div>

        <!-- 記住我 & 忘記密碼 -->
        <div class="remember-row">
          <label class="remember-label">
            <input v-model="rememberMe" type="checkbox" class="remember-check"/>
            <span>記住我</span>
          </label>
          <button type="button" class="forgot-btn" @click="forgotPwd">
            忘記密碼？
          </button>
        </div>

        <!-- API 錯誤 -->
        <Transition name="shake">
          <div v-if="apiError" class="api-error">
            ⚠️ {{ apiError }}
          </div>
        </Transition>

        <!-- 登入按鈕 -->
        <button
          type="submit"
          class="submit-btn"
          :class="{ loading: isLoading }"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="spin">⏳</span>
          <span v-else>
            {{ form.role === 'student' ? '🔑 登入英語小勇士' : '📊 進入後台' }}
          </span>
        </button>

      </form>

      <!-- 切換到註冊 -->
      <p v-if="form.role === 'student'" class="switch-row">
        還沒有帳號？
        <router-link to="/register" class="switch-link">點這裡免費註冊</router-link>
      </p>

      <!-- 分隔線 -->
      <div class="divider"><span>或</span></div>

      <!-- 快速測試帳號（開發用，上線前移除） -->
      <div class="dev-btns">
        <button type="button" class="dev-btn" @click="fillDemo('student')">
          🧪 填入測試學生帳號
        </button>
        <button type="button" class="dev-btn" @click="fillDemo('teacher')">
          🧪 填入測試老師帳號
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

// ── 身份 ────────────────────────────────────────────────
const roles = [
  { id: 'student', label: '學生',   icon: '🎒' },
  { id: 'teacher', label: '老師',   icon: '📚' },
]

// ── 表單 ────────────────────────────────────────────────
const form = reactive({
  student_id: '',
  password:   '',
  role:       'student',
})
const errors    = reactive({})
const touched   = reactive({})
const showPwd   = ref(false)
const rememberMe = ref(false)
const isLoading  = ref(false)
const apiError   = ref('')

// ── 註冊成功 toast ───────────────────────────────────────
const registeredToast = ref(false)
onMounted(() => {
  if (route.query.registered === '1') {
    registeredToast.value = true
    setTimeout(() => registeredToast.value = false, 3500)
  }
  // 記住我：還原上次帳號
  const saved = localStorage.getItem('saved_student_id')
  if (saved) { form.student_id = saved; rememberMe.value = true }
})

// ── 驗證 ─────────────────────────────────────────────────
function validate(field) {
  touched[field] = true
  errors[field]  = ''
  if (field === 'student_id' && !form.student_id)
    errors.student_id = '請輸入帳號'
  if (field === 'password' && !form.password)
    errors.password = '請輸入密碼'
}

function validateAll() {
  validate('student_id')
  validate('password')
  return !Object.values(errors).some(Boolean)
}

// ── 登入 ─────────────────────────────────────────────────
async function handleLogin() {
  apiError.value = ''
  if (!validateAll()) return

  isLoading.value = true
  try {
    await authStore.login(form.student_id, form.password, form.role)

    if (rememberMe.value)
      localStorage.setItem('saved_student_id', form.student_id)
    else
      localStorage.removeItem('saved_student_id')

    router.push(form.role === 'teacher' ? '/dashboard' : '/home')

  } catch (e) {
    apiError.value = e.response?.data?.error ?? '登入失敗，請確認帳號密碼'
  } finally {
    isLoading.value = false
  }
}

// ── 忘記密碼（先 alert，之後可改成 modal） ───────────────
function forgotPwd() {
  alert('請聯絡老師重設密碼。')
}

// ── 開發測試快填 ─────────────────────────────────────────
// 這兩組帳密要對到 backend/scripts/seed-test-accounts.js 實際建出來的帳號，
// 不然按這個按鈕填出來的帳密在資料庫裡根本不存在，登入一定失敗
// （這就是先前「教師後台登不進去」的原因——舊的 teacher01/114524001 從來
// 沒有被建立過）
function fillDemo(role) {
  form.role       = role
  form.student_id = role === 'student' ? 'S001' : 'T001'
  form.password   = role === 'student' ? 'student123' : 'teacher123'
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

.login-page {
  min-height: 100vh;
  background: linear-gradient(145deg, #5D3A00 0%, #8B4500 60%, #5D3A00 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  font-family: 'Nunito', sans-serif;
  position: relative;
  overflow: hidden;
}

/* 背景泡泡 */
.bg-bubble { position:absolute;border-radius:50%;opacity:.12;pointer-events:none }
.b1 { width:300px;height:300px;background:#FFB74D;top:-70px;left:-70px }
.b2 { width:180px;height:180px;background:#FFAB73;bottom:60px;right:-40px }
.b3 { width:120px;height:120px;background:#66BB6A;top:35%;right:12% }

/* Toast */
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #E8F5E9;
  border: 1.5px solid #6EE7B7;
  border-radius: 14px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 700;
  color: #1B5E20;
  z-index: 100;
  white-space: nowrap;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
}
.toast-drop-enter-active { transition: all .4s cubic-bezier(.34,1.56,.64,1) }
.toast-drop-leave-active { transition: all .3s ease }
.toast-drop-enter-from  { transform: translateX(-50%) translateY(-60px); opacity: 0 }
.toast-drop-leave-to    { transform: translateX(-50%) translateY(-60px); opacity: 0 }

/* 卡片 */
.card {
  background: #fff;
  border-radius: 28px;
  width: 100%;
  max-width: 400px;
  padding: 28px 28px 24px;
  box-shadow: 0 24px 64px rgba(0,0,0,.35);
  position: relative;
  z-index: 1;
}

/* Logo */
.logo-area { text-align:center;margin-bottom:22px }
.logo-icon  { font-size:38px;display:block;margin-bottom:5px }
.logo-title { font-size:21px;font-weight:900;color:#3D2B00;margin:0 0 3px;letter-spacing:-.3px }
.logo-sub   { font-size:13px;color:#8B6914;margin:0 }

/* 身份切換 */
.role-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  background: #FFF3E0;
  border-radius: 14px;
  padding: 4px;
}
.role-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  border: none;
  background: transparent;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #8B6914;
  cursor: pointer;
  transition: all .2s;
}
.role-btn.active {
  background: #fff;
  color: #E65100;
  box-shadow: 0 2px 8px rgba(0,0,0,.10);
}
.role-icon { font-size: 16px }

/* 欄位 */
.field { margin-bottom: 16px }
.field-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  color: #3D2B00;
  margin-bottom: 6px;
}
.label-icon { font-size: 14px }

.input-wrap { position:relative;display:flex;align-items:center }
.field-input {
  width: 100%;
  padding: 11px 40px 11px 14px;
  border-radius: 12px;
  border: 2px solid #FFE0B2;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  color: #3D2B00;
  outline: none;
  background: #FFFBF0;
  transition: border-color .18s, box-shadow .18s;
}
.field-input:focus {
  border-color: #FF8C00;
  background: #fff;
  box-shadow: 0 0 0 3px #FF8C0030;
}
.field.error   .field-input { border-color:#F87171;background:#FFF5F5 }
.field.success .field-input { border-color:#66BB6A;background:#F1F8F2 }

.field-status-icon {
  position: absolute;
  right: 12px;
  font-size: 14px;
  font-weight: 800;
  pointer-events: none;
}
.field.error   .field-status-icon { color:#EF4444 }
.field.success .field-status-icon { color:#4CAF50 }

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

/* 記住我 & 忘記密碼 */
.remember-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.remember-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #5C4300;
  cursor: pointer;
}
.remember-check { accent-color: #FF8C00; width:14px;height:14px }
.forgot-btn {
  background: none;
  border: none;
  font-family: 'Nunito', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #FF8C00;
  cursor: pointer;
  padding: 0;
}
.forgot-btn:hover { text-decoration: underline }

/* API 錯誤 */
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
.shake-enter-active { animation: shake .4s ease }
@keyframes shake {
  0%,100%{ transform:translateX(0) }
  20%    { transform:translateX(-6px) }
  40%    { transform:translateX(6px) }
  60%    { transform:translateX(-4px) }
  80%    { transform:translateX(4px) }
}

/* 登入按鈕 */
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
  box-shadow: 0 6px 20px #FF8C0040;
  transition: transform .18s, box-shadow .18s, opacity .18s;
  margin-bottom: 16px;
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px #FF8C0055;
}
.submit-btn:active:not(:disabled) { transform: scale(.98) }
.submit-btn:disabled { opacity:.7;cursor:not-allowed }
.spin { display:inline-block;animation:spin 1s linear infinite }
@keyframes spin { to{ transform:rotate(360deg) } }

/* 切換到註冊 */
.switch-row {
  text-align: center;
  font-size: 13px;
  color: #8B6914;
  margin: 0 0 14px;
}
.switch-link { color:#FF8C00;font-weight:700;text-decoration:none }
.switch-link:hover { text-decoration:underline }

/* 分隔線 */
.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: #E8D5B7;
  font-size: 12px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #FFE0B2;
}

/* 開發測試按鈕 */
.dev-btns { display:flex;gap:8px }
.dev-btn {
  flex: 1;
  padding: 8px;
  border-radius: 10px;
  border: 1.5px dashed #E8D5B7;
  background: #FFFBF0;
  font-family: 'Nunito', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #A6842E;
  cursor: pointer;
  transition: all .15s;
  text-align: center;
}
.dev-btn:hover { border-color:#FF8C00;color:#FF8C00;background:#FFF3E0 }
</style>
