/**
 * frontend/src/router/index.js
 * Vue Router 完整路由設定
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  // ── 公開頁面（不需登入）──────────────────────────────
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { public: true },
  },
{
  path: '/unit-select',
  name: 'unit-select',
  component: () => import('@/views/UnitSelectView.vue'),
  meta: { requiresAuth: true, role: 'student' }
},
{
  path: '/word-review/:themeId',
  name: 'word-review',
  component: () => import('@/views/WordReviewView.vue'),
  meta: { requiresAuth: true, role: 'student' }
},
{
  path: '/word-practice/:themeId',
  name: 'word-practice',
  component: () => import('@/views/WordPracticeView.vue'),
  meta: { requiresAuth: true, role: 'student' }
},
{
  path: '/question-practice/:themeId',
  name: 'question-practice',
  component: () => import('@/views/QuestionPracticeView.vue'),
  meta: { requiresAuth: true, role: 'student' }
},
  // ── 學生頁面（需登入，role: student）────────────────
 {
  path: '/home',
  name: 'home',
  component: () => import('@/views/HomeView.vue'),
  meta: { requiresAuth: true, role: 'student' }
},
{
  path: '/game',
  name: 'game',
  component: () => import('@/views/LearningView.vue'),
  meta: { requiresAuth: true, role: 'student' }
},
  {
    path: '/challenge',
    name: 'challenge',
    component: () => import('@/views/ChallengeView.vue'),
    meta: { requiresAuth: true, role: 'student' },
  },
  {
    path: '/battle/:sessionId',
    name: 'pk-battle',
    component: () => import('@/views/PKBattleView.vue'),
    meta: { requiresAuth: true, role: 'student' },
  },
  {
    path: '/result/:sessionId',
    name: 'pk-result',
    component: () => import('@/views/PKResultView.vue'),
    meta: { requiresAuth: true, role: 'student' },
  },
  {
    path: '/leaderboard',
    name: 'leaderboard',
    component: () => import('@/views/LeaderboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile/:userId?',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },

  // ── 教師頁面（需登入，role: teacher）───────────────
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, role: 'teacher' },
  },
  {
    path: '/scoreboard',
    name: 'scoreboard',
    component: () => import('@/views/ScoreboardView.vue'),
    meta: { requiresAuth: true, role: 'teacher' },
  },

  // ── 404 ─────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// ── 路由守衛 ─────────────────────────────────────────────
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 公開頁面：已登入就導向對應首頁
  if (to.meta.public) {
    if (authStore.isLoggedIn) {
      return next(authStore.isTeacher ? '/dashboard' : '/home')
    }
    return next()
  }

  // 需要登入：沒 token 就跳登入頁
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // 角色限制：學生不能進後台，老師不能進學生頁面
  if (to.meta.role === 'teacher' && !authStore.isTeacher) {
    return next({ name: 'game' })
  }
  if (to.meta.role === 'student' && authStore.isTeacher) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
