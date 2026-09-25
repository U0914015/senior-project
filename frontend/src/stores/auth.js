/**
 * frontend/src/stores/auth.js
 * Pinia Auth Store — 登入狀態 & 使用者資料管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

export const useAuthStore = defineStore('auth', () => {

  // ── 狀態 ──────────────────────────────────────────────
  const user  = ref(JSON.parse(localStorage.getItem('pk_user')  || 'null'))
  const token = ref(localStorage.getItem('pk_token') || null)

  // ── Getters ───────────────────────────────────────────
  const isLoggedIn = computed(() => !!token.value)
  const isTeacher  = computed(() => user.value?.role === 'teacher')
  const isStudent  = computed(() => user.value?.role === 'student')

  const isExperimental = computed(
    () => user.value?.experiment_group === 'experimental'
  )

  const displayName = computed(
    () => user.value?.nickname ?? '玩家'
  )

  // ── Actions ───────────────────────────────────────────

  /** 登入：呼叫 API，儲存 token & user */
  async function login(student_id, password, role) {
    const { data } = await api.post('/auth/login', {
      student_id,
      password,
      role,
    })
    _setSession(data.token, data.user)
    return data
  }

  /** 登出：清除所有本地狀態 */
  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('pk_token')
    localStorage.removeItem('pk_user')
  }

  /** 更新使用者分數（答題或社群互動後即時更新） */
  function updateScore({ system_score, social_score }) {
    if (!user.value) return
    if (system_score !== undefined) user.value.system_score = system_score
    if (social_score !== undefined) user.value.social_score = social_score
    _saveUser()
  }

  /** 重新從後端拉取最新使用者資料 */
  async function refreshUser() {
    try {
      const { data } = await api.get(`/users/${user.value.user_id}/profile`)
      user.value = { ...user.value, ...data.profile }
      _saveUser()
    } catch { /* 保持現有狀態 */ }
  }

  // ── 私有工具 ──────────────────────────────────────────
  function _setSession(newToken, newUser) {
    token.value = newToken
    user.value  = newUser
    localStorage.setItem('pk_token', newToken)
    _saveUser()
  }

  function _saveUser() {
    localStorage.setItem('pk_user', JSON.stringify(user.value))
  }

  return {
    user,
    token,
    isLoggedIn,
    isTeacher,
    isStudent,
    isExperimental,
    displayName,
    login,
    logout,
    updateScore,
    refreshUser,
  }
})
