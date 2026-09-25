/**
 * frontend/src/api/axios.js
 * Axios 共用實例
 */
import axios from 'axios'

// Fallback for records that were previously saved as '?' before the database
// connection was switched to utf8mb4. Keeping it here protects every badge
// response (profile, home, leaderboard, and PK result) until old cloud data
// has been repaired.
const BADGE_EMOJIS = {
  1: '🎯', 2: '🔥', 3: '💥', 4: '⚡', 5: '📘', 6: '📗',
  7: '📙', 8: '📕', 9: '🥉', 10: '🥈', 11: '🥇', 12: '👑',
  13: '👍', 14: '💬', 15: '⭐', 16: '🌈', 17: '🌟', 18: '💖',
  19: '🎖️', 20: '💎', 21: '🥉', 22: '🥈', 23: '🥇', 24: '🏅',
}

function restoreBadgeEmojis(value) {
  if (Array.isArray(value)) {
    value.forEach(restoreBadgeEmojis)
  } else if (value && typeof value === 'object') {
    if (value.icon_emoji === '?' && BADGE_EMOJIS[value.badge_id]) {
      value.icon_emoji = BADGE_EMOJIS[value.badge_id]
    }
    Object.values(value).forEach(restoreBadgeEmojis)
  }
  return value
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
})

// ── Request 攔截器：自動帶 JWT ─────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pk_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response 攔截器：token 過期自動跳登入 ─────────────
api.interceptors.response.use(
  res => {
    restoreBadgeEmojis(res.data)
    return res
  },
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pk_token')
      localStorage.removeItem('pk_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
