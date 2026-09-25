<!--
  frontend/src/views/NotFoundView.vue
  404 頁面
-->
<template>
  <div class="nf-page">
    <div class="nf-icon">🗺️</div>
    <h1 class="nf-title">找不到頁面</h1>
    <p class="nf-sub">這裡什麼都沒有，可能是網址輸入錯誤</p>
    <button class="nf-btn" @click="goHome">回到首頁</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const router    = useRouter()
const authStore = useAuthStore()
function goHome() {
  router.push(authStore.isTeacher ? '/dashboard' : '/game')
}
</script>

<style scoped>
.nf-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #3D2B00;
  font-family: 'Nunito', sans-serif;
  text-align: center;
  padding: 24px;
}
.nf-icon  { font-size: 56px; }
.nf-title { font-size: 22px; font-weight: 900; color: #fff; }
.nf-sub   { font-size: 14px; color: rgba(255,255,255,.45); }
.nf-btn {
  margin-top: 8px;
  padding: 12px 28px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #FF8C00, #FF6B35);
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}
</style>
