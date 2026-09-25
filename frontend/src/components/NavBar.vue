<!--
  ═══════════════════════════════════════════════════════
  components/NavBar.vue
  共用導覽列元件（簡化版）
  
  功能：
    1. 左側「← 回上頁」按鈕
    2. 中間標題
    3. 右側「🏠 回首頁」按鈕
  
  使用方式：
    <NavBar title="小組排行" />
    <NavBar title="PK 對戰" :show-back="false" />
  ═══════════════════════════════════════════════════════
-->
<template>
  <header class="navbar">

    <!-- 左側：回上頁 -->
    <button
      v-if="showBack"
      class="nav-btn back-btn"
      @click="router.back()"
    >
      ← 回上頁
    </button>
    <div v-else class="placeholder"/>

    <!-- 中間：標題 -->
    <h1 class="nav-title">{{ title }}</h1>

    <!-- 右側：回首頁 -->
    <button
      class="nav-btn home-btn"
      @click="router.push('/home')"
    >
      🏠 首頁
    </button>

  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'

// 初始化路由
const router = useRouter()

// Props：父元件傳進來的設定
defineProps({
  // title：頁面標題（必填）
  title: {
    type:     String,
    required: true,
  },
  // showBack：是否顯示回上頁按鈕（預設顯示）
  showBack: {
    type:    Boolean,
    default: true,
  },
})
</script>

<style scoped>
/* 導覽列 */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px 11px;
  background: #fff;
  border-bottom: 2px solid #E8F0FE;
  position: sticky;
  top: 0;
  z-index: 100;
  font-family: 'Nunito', sans-serif;
}

/* 標題 */
.nav-title {
  font-size: 15px;
  font-weight: 800;
  color: #3D2B00;
  flex: 1;
  text-align: center;
  margin: 0;
}

/* 按鈕共用 */
.nav-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  font-size: 13px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 20px;
  transition: all .15s;
  min-width: 72px;
  white-space: nowrap;
}

/* 回上頁按鈕 */
.back-btn {
  color: #8B6914;
  border: 1.5px solid #FFE0B2;
  background: #FFFBF0;
  text-align: left;
}
.back-btn:hover {
  background: #FFE0B2;
  color: #3D2B00;
}

/* 回首頁按鈕 */
.home-btn {
  color: #E65100;
  border: 1.5px solid #FFE0B2;
  background: #FFF3E0;
  text-align: right;
}
.home-btn:hover {
  background: #FFE0B2;
}

/* 佔位（當不顯示回上頁時，讓標題保持置中） */
.placeholder {
  min-width: 72px;
}
</style>
<style scoped>
@media (min-width:768px){.navbar{padding:16px 24px 14px}.nav-title{font-size:18px}.nav-btn{min-height:44px;font-size:15px;min-width:94px}.placeholder{min-width:94px}}
</style>
