# 英語PK學習遊戲系統

## 專案背景
陳瑩軒的碩士論文研究系統，研究問題：「社群支持是否能促進學生在競爭式學習環境中的學習動機與學習表現」。目標族群：國小三四年級學生。

## 技術架構
- **前端**：Vue.js 3 + Vite + Pinia + Vue Router + Axios，位於 `frontend/`
- **後端**：Node.js + Express 5 + mysql2 + jsonwebtoken + bcrypt，位於 `backend/`
- **資料庫**：MySQL 8.0，資料庫名稱 `pk_english`
- **雲端**：Google Cloud Run（後端）+ Firebase Hosting（前端）+ Cloud SQL（資料庫）

## 本機開發設定
```
後端啟動：cd backend && npm run dev（nodemon，port 3000）
前端啟動：cd frontend && npm run dev（port 5173）
本機 MySQL port：3305
本機 DB 密碼：0000
```

> `backend/.env` 沒有被 `nodemon` 監看（專案沒有 `nodemon.json`），改完 `.env` 要手動重啟 `npm run dev`，否則舊的環境變數會一直留在記憶體裡（例如舊的 DB port），導致查詢時連線失敗回 500。

## 雲端設定
```
後端 URL：https://pk-english-backend-933512443719.asia-east1.run.app
前端 URL：https://project-f21ae14c-5812-494e-9ad.web.app
Cloud SQL 連線名稱：project-f21ae14c-5812-494e-9ad:asia-east1:pk-english-db
Cloud SQL 公開 IP：35.194.153.74
Cloud SQL 密碼：pkenglish2026
```

⚠️ **`backend/.env`、`frontend/.env` 目前是被 git 追蹤的檔案**（repo 沒有 `.gitignore`），上面這組密碼等同已經在 git 歷史紀錄裡。之後有機會應該補 `.gitignore` 並把 `.env` 從版控移除、密碼輪替。

## 重新部署後端指令
```cmd
cd backend
gcloud run deploy pk-english-backend --source . --region asia-east1 --allow-unauthenticated --clear-base-image --add-cloudsql-instances=project-f21ae14c-5812-494e-9ad:asia-east1:pk-english-db --set-env-vars="DB_HOST=/cloudsql/project-f21ae14c-5812-494e-9ad:asia-east1:pk-english-db,DB_PORT=3306,DB_USER=root,DB_PASSWORD=pkenglish2026,DB_NAME=pk_english,JWT_SECRET=pk_english_secret_2025"
```

## 重新部署前端指令
```cmd
cd frontend
npm run build
firebase deploy --only hosting
```

## db.js 連線邏輯
`backend/db.js` 用 `DB_HOST` 是否以 `/cloudsql` 開頭判斷走 Unix Socket（Cloud Run 連 Cloud SQL）還是 host+port（本機）。Pool 建立後有掛 `pool.on('connection', ...)` 對每一條新建立的實體連線強制 `SET NAMES utf8mb4`——因為 `charset` 設定和單次 `SET NAMES` 都只保證「當下那條連線」，pool 裡其他連線在 Cloud SQL 上可能仍用 server 端預設 charset，導致 emoji 等 4-byte 字元被轉成 `?`。

## 資料庫結構（11張表）
- `classes`：班級（含 `experiment_group` 欄位區分實驗/對照組）
- `groups`：小組（**保留字**，SQL 要用反引號 `` `groups` ``）
- `users`：學生/教師帳號（含 `system_score`、`social_score`、`is_leader`）
- `themes`：8個學習主題（`theme_id` 1-8，Super Fun 是 9-10）
- `words`：149個單字
- `questions`：80道題目（`mcq`/`fill_blank`/`ordering`，含 `image_url`、`audio_text` 欄位）
- `game_sessions`：PK場次記錄
- `game_logs`：每題答題記錄
- `social_logs`：社群互動記錄（按讚/貼紙/留言）
- `badges`：24個獎章定義（銅銀金傳說四等級）
- `user_badges`：學生獲得的獎章

## 重要設計決策
- 實驗組（`experimental`）：有社群互評功能（`SocialModal`）、社群分排行 Tab
- 對照組（`control`）：只有 PK 對戰，沒有社群功能
- 前端用 `isExperimental = authStore.user?.experiment_group === 'experimental'` 判斷
- PK 等待室用 Short Polling（每 3 秒查一次 `/api/game/session/:id/status`）
- 獎章觸發：每場 PK 結束後呼叫 `POST /api/badges/check`
- 登入時 JWT payload 含 `user_id`、`role`、`class_id`，有效期 7 天；`middleware/auth.js` 從 `Authorization: Bearer <token>` 解出並掛到 `req.user`

## 目前已知 Bug 清單
1. ~~**雲端 emoji 顯示問號**：db.js 的連線層級 utf8mb4 設定沒有生效~~ → 已修正，見上方「db.js 連線邏輯」
2. ~~**本機無法登入**：本機 MySQL 跑在 3305 port，仍然 500 錯誤~~ → 根因是 nodemon 不監看 `.env`，改完要手動重啟
3. **RWD**：畫面固定 480px 寬，平板跑版
4. **多模態題目前端**：`PKBattleView.vue` 還沒有圖片題和聽力題的顯示邏輯
5. **教師後台建立小組**：前端樂觀更新，沒有真正串接 `POST /teacher/groups` API
6. **雲端獎章 emoji 舊資料**：Cloud SQL 既有 `badges.icon_emoji` 可能已被寫成 `?`。前端 `src/api/axios.js` 已有依 `badge_id` 的顯示備援；後續需在可連線至 Cloud SQL 的環境執行 `cd backend && npm run repair:badge-emojis`，再部署前端（目前 Firebase CLI 的 HTTPS 連線失敗）。

## 前端頁面清單
```
views/
  LoginView.vue       - 登入（學生/教師切換）
  RegisterView.vue    - 註冊
  HomeView.vue        - 遊戲主畫面（登入後首頁）
  LearningView.vue    - 學習區（三關卡進度）
  UnitSelectView.vue  - 單元選擇（B4CH1~12）
  WordReviewView.vue  - 單字翻牌複習
  WordPracticeView.vue- 單字選擇題練習
  ChallengeView.vue   - 挑戰選擇（選對手小組+單元）
  PKBattleView.vue    - PK對戰（mcq/fill_blank/ordering三題型）
  PKResultView.vue    - 結果頁（勝負+獎章+社群入口）
  LeaderboardView.vue - 英雄榜（系統分+社群分Tab）
  ProfileView.vue     - 個人頁（獎章牆+PK紀錄）
  DashboardView.vue   - 教師後台（四頁籤）
  NotFoundView.vue    - 404

components/
  NavBar.vue          - 共用導覽列（回上頁+回首頁）
  SocialModal.vue     - 社群互評彈窗（實驗組限定）
  WaitingForPK.vue    - 等待PK開始（組員用，Short Polling）
```

## 後端 API 清單
```
/api/auth/register    POST - 註冊
/api/auth/login       POST - 登入
/api/game/my-group    GET  - 我的小組
/api/game/groups      GET  - 同班小組列表
/api/game/progress    GET  - 今日學習進度
/api/game/session/start    POST - 發起PK
/api/game/session/submit   POST - 提交答案
/api/game/session/active   GET  - 查詢有沒有進行中的PK（組員Polling用）
/api/game/session/:id/status GET - 等待室Polling
/api/game/session/:id/result GET - 最終成績
/api/game/leaderboard  GET - 英雄榜
/api/questions/review  GET - 複習區單字
/api/questions/themes  GET - 主題清單
/api/social/interact   POST - 社群互動
/api/badges/check      POST - 觸發獎章檢查
/api/badges/user/:id   GET  - 個人獎章
/api/users/:id/profile GET  - 個人頁資料
/api/teacher/dashboard GET  - 教師後台儀表板
/api/teacher/students/:classId GET - 班級學生列表
/api/teacher/students/:id/assign-group PATCH - 指定組別
```

## 測試帳號
```
學生：student_id=114524001, password=test1234, class_code=TEST01
教師：student_id=teacher01, password=test1234
```

## GitHub
https://github.com/U0914015/pk-english-game
