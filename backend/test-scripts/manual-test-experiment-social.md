# 實驗組/對照組 + 社群互評 — 手動測試腳本

給你自己在瀏覽器裡照著操作用的。涵蓋這次改動的四塊：實驗組限定的社群互評按鈕、
防偏袒輪替規則的錯誤提示、小組排行（實驗組看小組排名／對照組整頁鎖住）、教師
後台比較組分析頁的 PERR/STD 指標。

前端網址：http://localhost:5174（後端要跑著，port 3001）

測試帳號（都是「測試班級」，代碼 `ABC123`）：
- `T001` / `teacher123`（教師）
- `S001` / `student123`（**實驗組**，A組(實驗) 組長）
- `S003` / `test1234`（**實驗組**，A組(實驗) 組員，跟 S001 同組）
- `S002` / `test1234`（**對照組**，B組(對照) 組長，當 A 組的對手）

如果這幾個帳號在你的資料庫裡不存在，先跑：
```
cd backend
node scripts/seed-test-accounts.js
```
（`student_id` 是 S001/S002/S003 那三個帳號要另外用註冊 API 建，過程見這次對話紀錄，
或直接問 Claude Code「幫我重建測試帳號」。）

---

## 步驟 1：教師視角確認分組正確

1. 瀏覽器開一個分頁，登入 `T001` / `teacher123`（身份切換選「教師」）
2. 左側選單點「組別管理」
3. 應該看到兩張小組卡片：**A組(實驗)** 標橘色「實驗組」標籤、**B組(對照)** 標灰色
   「對照組」標籤，各自底下有組員名單
4. 左側選單點「比較組分析」，應該看到左右兩張卡片（實驗組 vs 對照組）分別列出
   平均答題分數、平均正確率、平均PK場次、**挫折後重試率(PERR)**、**自我超越時數(STD)**
   ——如果資料庫是全新的，這幾個數字會是 0，是正常的，要等步驟2打完PK才有數字

---

## 步驟 2：實驗組視角（S001）——社群互評 + 輪替規則

1. 開第二個分頁（或無痕視窗），登入 `S001` / `student123`（身份切換選「學生」）
2. 首頁應該看到三個按鈕：學習區、開始挑戰、**小組排行**（多這個，對照組沒有）
3. 點「開始挑戰」→ 找 B組 發起 PK → 一路答完（其中至少故意答錯一題，等一下
   教師後台的 PERR/STD 才會有東西可看）
4. 另外開第三個分頁登入 `S003` / `test1234`，把同一場 PK 的題目也答完
   （用「開始挑戰」或等它自動跳轉都可以，S003 是 S001 的隊友）
5. 兩人都答完後，S001 那個分頁應該會跳轉到結果頁（PKResultView）
6. 結果頁底部應該看到橘色「👏 給隊友鼓勵」按鈕，右邊帶 `05:00` 倒數計時
7. 點開它 → 選 S003（隊友）→ 送一次「拍拍手」→ 應該立刻看到「已拍拍手！」
   的成功狀態、畫面上有表情符號飄起來的動畫
8. **關鍵測試**：選同一個 S003，切到「貼紙」分頁，選一張貼紙送出
   → 應該跳出橘底的錯誤提示：「⚠️ 不能連續送給同一位隊友，先鼓勵其他人吧！」
   → 而且**貼紙按鈕不會被標記成已送出**（這是這次修的 bug：以前這裡會誤顯示
   「已送出」，其實後端沒存進去）
9. 如果 A 組有第三個人，換去對他送一次，應該會成功（輪替規則只擋「連續」）

---

## 步驟 3：實驗組視角（S001）——小組排行

1. 回首頁，點「小組排行」
2. 應該看到 Tab 切換「⚡ 小組能量條」／「❤️ 小組社群分」，排的是**小組**
   （A組(實驗)、B組(對照)），不是個人
3. 自己的小組如果不在前三名，應該會在上面看到浮條顯示「#排名 A組(實驗)（我的小組）」

---

## 步驟 4：對照組視角（S002）——確認限制生效

1. 開第四個分頁，登入 `S002` / `test1234`
2. 首頁應該**只有兩個按鈕**：學習區、開始挑戰——**沒有「小組排行」**
3. 如果直接在網址列打開 `http://localhost:5174/leaderboard`，應該看到鎖住畫面：
   🔒「這裡只有你自己看得到」，底下有「查看我的徽章 →」按鈕
4. 完成一場 PK 後，結果頁底部**不會有**「給隊友鼓勵」按鈕

---

## 步驟 5：回到教師後台看 PERR/STD 有數字了

1. 切回 `T001` 那個分頁，重新整理「比較組分析」頁
2. 這次「挫折後重試率(PERR)」「自我超越時數(STD)」應該都有實際數字了
   （前提是步驟2真的有故意答錯至少一題）
3. 左側選單「學生資料」頁的表格也可以看到 PERR/STD 兩欄，跟「匯出 CSV」也會帶這兩欄

---

## 收尾：把測試資料清乾淨

測完之後想清掉這次留下的 PK 紀錄、分數歸零，執行：
```
cd backend
node -e "
require('dotenv').config()
const db = require('./db')
;(async () => {
  await db.query('DELETE gl FROM game_logs gl JOIN game_sessions gs ON gs.session_id = gl.session_id WHERE gs.group_a_id IN (12,13) OR gs.group_b_id IN (12,13)')
  await db.query('DELETE sl FROM social_logs sl JOIN game_sessions gs ON gs.session_id = sl.session_id WHERE gs.group_a_id IN (12,13) OR gs.group_b_id IN (12,13)')
  await db.query('DELETE FROM game_sessions WHERE group_a_id IN (12,13) OR group_b_id IN (12,13)')
  await db.query('DELETE FROM user_badges WHERE user_id IN (30,31,32)')
  await db.query('UPDATE users SET system_score = 0, social_score = 0 WHERE user_id IN (30,31,32)')
  console.log('清乾淨了')
  process.exit(0)
})()
"
```

如果連分組、班級都不要了，想整個砍掉重來，額外跑：
```
node -e "
require('dotenv').config()
const db = require('./db')
;(async () => {
  await db.query('DELETE FROM users WHERE user_id IN (30,31,32,27)')
  await db.query('DELETE FROM \`groups\` WHERE group_id IN (12,13)')
  await db.query('DELETE FROM classes WHERE class_id = 8')
  console.log('全部清乾淨了')
  process.exit(0)
})()
"
```
