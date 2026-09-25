# 小組共同獎章視覺呈現 — 手動測試腳本

給你自己在瀏覽器裡照著操作用的。涵蓋三個補強：ProfileView 個人頁獎章牆分區、
PKResultView 金色慶祝彈窗、HomeView 首頁獎章分列。

測試帳號（都是 TEST01／五年甲班・A 組）：
- student001 / test1234（組長，暱稱「測試生001(組長)」）
- student002 / test1234（組員，暱稱「測試生002」）

---

## 前置準備：讓分數卡在門檻前一步

小組共同獎章門檻是「全組平均社群分」100 / 500 / 1500（銅/銀/金）。A 組現在只有
2 個人，靠瀏覽器手動按讚/貼貼圖/留言要湊到 100 分要按不少下，所以先用這支腳本
把分數卡在門檻前 1 分，這樣你等一下在瀏覽器裡只要送「一次」互動就會親眼看到
真正觸發、真正跨過門檻的完整流程（不是灌假資料，是讓你自己觸發真的程式邏輯）：

```
cd backend
node test-scripts/setup-team-badge-test-data.js bronze
```

想測銀章/金章，把 `bronze` 換成 `silver` / `gold` 即可。

---

## 步驟 1：完成一場 PK

1. 用瀏覽器開兩個分頁（或一般＋無痕各一），分別登入 student001、student002
2. 兩人都用「發起挑戰」找對方小組（B 組／student004）打一場 PK，直到打完進入結果頁
   - 如果嫌麻煩，也可以只用 student001 那邊完成整場（組員 student002 的答題可以隨便選）

> 目的只是要有一個 `session_id`，讓等一下的社群互評有地方掛。

---

## 步驟 2：在結果頁送出社群互動，親眼看小組共同獎章金色彈窗跳出來

1. student001 停在 PK 結果頁，點開「社群互評」入口
2. 選 student002（隊友），送一則留言（任一預設文字都可以，留言是 +50 分，
   最保險一定會跨過前置準備留的門檻）
3. **關掉社群互評彈窗**（這步很關鍵——獎章是互動送出當下就在後端發放了，
   但畫面要等你關掉社群彈窗才會補跳慶祝視窗）
4. 應該會看到：**金色漸層**全螢幕彈窗，寫著「小組共同成就解鎖！你們整組一起
   達成「團結小隊」！你 + 測試生002 一起獲得 🏅」
   - 這個彈窗跟一般社群獎章的粉紫漸層彈窗要有明顯視覺差異
5. 點「收下 🎁」關掉

**如果沒跳出來**：先確認前置準備腳本有跑成功、確認留言真的送出去了（網路
面板應該看得到 `POST /api/social/interact` 回應裡有 `new_badges` 陣列且包含
`social_team` 分類的項目）。

---

## 步驟 3：檢查個人頁（ProfileView）獎章牆分區

1. 前往「個人頁」
2. 獎章牆應該分成兩個區塊：
   - 「⚡ 個人獎章」— 一般獎章
   - 「🤝 小組共同獎章」— 應該看得到「團結小隊」，卡片上顯示
     **「與 測試生002 一起獲得 ✨」**
3. 用 student002 帳號登入也檢查一次，這次應該顯示「與 測試生001(組長) 一起獲得」

---

## 步驟 4：檢查首頁（HomeView）獎章分列

1. 回到首頁
2. 「🎖️ 我的獎章」應該分成兩列：
   - 第一列：個人獎章（跟平常一樣的樣式）
   - 第二列：標題「🤝 小組共同獎章 · 與你的組員一起努力達成！」，底下是金色系
     卡片，包含剛拿到的「團結小隊」

---

## 收尾：把測試資料清乾淨

測完之後想恢復乾淨狀態、留給下次測試用，執行：

```
cd backend
node -e "
require('dotenv').config()
const db = require('./db')
;(async () => {
  await db.query('DELETE gl FROM game_logs gl JOIN game_sessions gs ON gs.session_id = gl.session_id WHERE gs.group_a_id IN (1,2,3,4,5) OR gs.group_b_id IN (1,2,3,4,5)')
  await db.query('DELETE FROM game_sessions WHERE group_a_id IN (1,2,3,4,5) OR group_b_id IN (1,2,3,4,5)')
  await db.query('DELETE FROM user_badges WHERE user_id IN (8,9,10,11,12,13,14)')
  await db.query('UPDATE users SET system_score = 0, social_score = 0 WHERE user_id IN (8,9,10,11,12,13,14)')
  console.log('清乾淨了')
  process.exit(0)
})()
"
```
