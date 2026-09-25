<!--
  frontend/src/App.vue
  根元件：只負責 router-view 顯示與全域 transition
-->
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="fade" mode="out-in">
      <!--
        :key="route.fullPath" 是關鍵：同一個路由設定只有網址參數變化時
        （例如 /word-practice/1 → /word-practice/9），Vue Router 預設
        會沿用同一個元件實體、不重新執行 <script setup>。這個 App 裡
        很多頁面用 const themeId = Number(route.params.themeId) 這種
        「只在掛載時算一次」的寫法，沒有這個 key 的話，切換同路由不同
        參數時畫面會卡在舊資料（例如切單元卻還是上一個單元的題目）。
      -->
      <component :is="Component" :key="route.fullPath"/>
    </Transition>
  </RouterView>
</template>

<script setup>
// 2026-08-05：拿掉「發起PK挑戰另一組」機制後，挑戰變成個人隨時可以
// 自己發起，不用再等組長發起、全域輪詢通知組員加入，WaitingForPK.vue
// 整個元件跟著拿掉了
</script>

<style>
/* ── 全域基礎樣式 ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  font-family: 'Nunito', 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* 頁面切換動畫 */
.fade-enter-active,
.fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }

/* 統一滾動條樣式 */
::-webkit-scrollbar       { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 2px; }
</style>
