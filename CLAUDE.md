# 學姊系統（暫名，沿用「英語小勇士」介面文案）

## 專案背景
從陳瑩軒的碩論系統「夥伴PK英語學習遊戲」（`C:\Users\lily4\pk-english-game`）複製並改造而來，
是**完全獨立的第二個研究系統**，給另一位學姊使用。技術棧、資料庫結構、遊戲機制大部分沿用原系統，
但拿掉了社群互評功能、拿掉了實驗組/對照組雙軌設計，改成單一版本，並新增「小組貢獻度」「小組共同成就」
「大字報」等原系統沒有的功能。

⚠️ **這份文件跟原系統的 CLAUDE.md 是分開獨立的兩份**，改這個系統時只看這份，不要照抄原系統文件裡的
網址/資料庫名稱/port，兩邊已經刻意錯開避免衝突。

## 技術架構
- 前端：Vue.js 3 + Vite + Pinia + Vue Router + Axios，位於 `frontend/`
- 後端：Node.js + Express 5 + mysql2 + jsonwebtoken + bcrypt，位於 `backend/`
- 資料庫：MySQL 8.0，資料庫名稱 **`pk_english_senior`**（跟原系統的 `pk_english` 是同一台 MySQL
  伺服器底下兩個完全獨立的資料庫，不共用任何一張表）

## 本機開發設定
```
後端啟動：cd backend && npm run dev（nodemon，port 3001 ← 跟原系統的 3000 錯開）
前端啟動：cd frontend && npm run dev（port 5174 ← 跟原系統的 5173 錯開）
本機 MySQL port：3305（跟原系統共用同一台本機 MySQL，資料庫名稱不同）
本機 DB 密碼：0000
```

> 同樣要注意：`backend/.env` 沒有被 nodemon 監看，改完要手動重啟 `npm run dev`。

## 資料庫現況（2026-08-01 建立時的快照）
資料庫是從原系統的 `pk_english` **複製 schema + 參考資料**建立的，複製範圍：
- ✅ 複製了：13 張表的完整結構、`themes`（10個）、`words`（167個）、`questions`（164題）、
  `badges`（37個定義）——這些是「教材/遊戲規則」性質的資料，兩個系統可以共用起點
- ❌ 沒有複製：`users`、`groups`、`classes`、`game_sessions`、`game_logs`、`social_logs`、
  `user_badges`、`help_requests`、`session_questions` ——這些是陳瑩軒自己論文的參與者資料，
  學姊系統要用自己的教師帳號重新建班級/學生/小組

**目前資料庫裡沒有任何學生／班級／小組資料**，教師登入後台會是全空的，這是預期行為，不是 bug。

### 主題（themes）現況
`theme_id` 1-10 沿用原系統的教材（8個一般主題 + Super Fun 1-2）。`theme_id` 11-16 是學姊教材第三冊
六個單元（The Big Wind/天氣、Going Back Home/時間、Be Honest/文具、Earthquake Drill/位置、
Halloween/文化節慶、Get Ready/數字11-20），2026-08-01 匯入，共 44 個單字、112 道題目。

⚠️ **這批內容不是我自己讀 PDF 生出來的**——使用者直接貼了現成的 SQL 給我，我沒有拿到、也沒有讀過
原始教材 PDF，無法獨立驗證這些單字/句型/課文內容是否真的忠實反映教材。我做的是：檢查 SQL 語法、
比對資料庫 schema（抓到並修正了 3 個問題：`part_of_speech` 沒有 `adverb` 這個 ENUM 值、排序題
`correct_answer` 原本是 JSON 陣列格式但前端實際比對用的是空白分隔字串、`words.word_no`/`grade`
兩個 NOT NULL 欄位原本沒填）、執行後驗證筆數與格式。**內容本身的正確性（教材對應是否精確）沒有
被人工複核過**，之後最好還是讓學姊或熟悉這套教材的人抽查幾題。

`theme_id >= 17` 之後如果還有更多教材，依同樣模式繼續往後編號即可。

⚠️ **2026-09-15 更新**：跟學姊確認過，這次實驗實際只會用到 `theme_id` 11-16（第三冊六單元），
`theme_id` 1-10（原系統教材）不在實驗範圍內，前端不該讓學生選到。做法是在後端擋掉，不是刪資料：
`questions.js` 的 `GET /themes` 只回傳 `theme_id >= 11`（`UnitSelectView`/`ChallengeView` 兩個
單元選擇畫面都是靠這支 API 決定要顯示哪些單元，改這裡就夠了），另外 `/review`、`/stage`、
`game.js` 的 `session/start` 這三支在「沒有指定 theme_id、從所有主題隨機抽」的 fallback 分支
也都加了 `theme_id >= 11` 的條件，避免任何路徑意外抽到舊教材。`theme_id` 1-10 的資料本身沒有動，
之後如果要恢復只要拿掉這幾個 `>= 11` 條件即可。

⚠️ **2026-09-15 更新**：學姊提供「前測資料」資料夾（`前測資料/`，內含空白考卷、答案卷、逐題詳解
三份 docx），是國小四年級教科書+補充教材的前測考卷，內容其實就是在考 `theme_id` 11（The Big
Wind／天氣）跟 12（Going Back Home／時間）這兩個單元，所以直接匯進這兩個 theme 底下，
沒有另外開新 theme。匯入腳本是 `backend/scripts/add-pretest-w1w2-content.sql`，新增了 15 個單字
（`word_id` 212-226）、50 道題目（`question_id` 277-326），`theme_id` 11-16 累積起來現在是
59 個單字、162 道題目（原本 44/112 + 這次 15/50）。

- 答案全部來自學姊給的答案卷跟詳解檔，**不是 AI 自己看圖猜的**——但過程中發現「四年級前測詳解.docx」
  的七-1/七-2兩題詳解文字（寫成 sunny/cold）跟答案卷及原始圖片（圖片明明是雲朵/太陽）對不上，
  最後採用答案卷+圖片一致的版本（cloudy/sunny），**詳解文字檔那兩題的文字本身有誤**，之後跟學姊
  對稿時記得提這件事。
- 原始考卷「一、三、六」幾節是紙本特有的「3張手繪圖當選項」版面，跟系統既有 `image_choice`
  （給1張圖選文字）方向相反，匯入時**沒有照抄紙本版面**，改成套用系統既有格式（給圖選字／純文字
  聽力選項），「九」裡兩題純讀時鐘數字的題目（9:40／4:55）也因為沒有另外畫時鐘美術，改成純文字
  `mcq`。「十二」對話填空原本一格題目有兩格填空，拆成兩筆 `fill_blank`，跟七/八/十一既有的
  「一格一題」粒度一致。這些改動的取捨判斷都寫在 SQL 檔的開頭註解裡。
- 新畫了 7 張 SVG 插圖（`wolf`/`hot`/`cold`/`breakfast`/`fifteen`/`twenty-five`/`thirty`，放在
  `frontend/public/images/senior/The_Big_Wind/` 或 `Going_Back_Home/`），風格比照既有的圖
  （200×200、圓形色塊背景+扁平插畫），其餘題目重用既有圖檔（cloudy/sunny/forty/twenty）。

## 跟原系統的功能差異

⚠️ **2026-08-04 更新**：學姊（林妏庭 Irene）帶來她的博士論文進度報告 PDF，發現她實際的研究設計
**需要**實驗組/對照組雙軌 + 社群互評，跟這個專案一開始「拿掉雙軌設計、拿掉社群互評」的方向正好相反。
已經把這兩個功能**接回來**，細節見下面「實驗組/對照組雙軌設計（2026-08-04 接回）」那節。下面這張表
格是還維持「拿掉」狀態的差異，跟已經接回來的分開列。

⚠️ **2026-09-16 更新**：上面「社群互評已接回」是誤植了另一份 PDF 的設計，2026-08-26 的正式進度
報告完全沒有提到社群互評/社群分，已經整個拿掉、改回跟簡報一致的版本，細節見後面「整個社群互評功能
拿掉，改成完全照簡報設計」那節。下面這兩張表格跟「實驗組/對照組雙軌設計」那節提到「社群互評」的
部分，都是已經作廢的舊狀態，只留著給交接時對照歷史用。

| 功能 | 原系統（pk-english-game） | 學姊系統（本專案） |
|---|---|---|
| 實驗組/對照組雙軌設計 | 有（研究核心） | **已接回**（2026-08-04）——後端骨架（`experiment_group` 欄位、教師後台的比較組分析頁、PATCH 覆寫 API）其實從沒被拿掉，只是沒有真實資料流過；這次補上學生端的真實閘控邏輯 |
| 社群互評（按讚/貼紙/留言） | 有，實驗組限定 | **已接回**（2026-08-04）——`SocialModal.vue` 重新掛回 `PKResultView.vue`，用 `isExperimental` 閘控，比照原系統 pattern |
| 英雄榜社群分排行 | 有 | **拿掉**，只剩系統分（顯示文字已改成「答題分數」）排行，`LeaderboardView.vue` 的 tab 只剩一個——⚠️注意這行講的是「個人」社群分排行，跟下面已改成「小組」排行的新設計是兩回事 |
| 英雄榜入口 | 首頁 + 結果頁都有按鈕 | 首頁已加回「小組排行」入口（2026-08-04，僅實驗組看得到），結果頁仍沒有入口按鈕 |
| 小組貢獻度 | 沒有 | **新增**：`GET /api/game/session/:id/group-contribution`，PK 結果頁「本場排行」下方顯示每人對小組總分的貢獻百分比橫條圖 |
| 小組共同成就 | 有（social_team 類徽章） | **保留**，個人頁獎章牆會拉出來獨立顯示、標註「與 OOO 一起獲得」 |
| 大字報 | 沒有（有 ProjectorView 個人排行投影模式） | **新增** `ScoreboardView.vue`（`/scoreboard`），顯示小組即時總分，教師後台按「📺 大字報」開新分頁 |
| 配色 | 深色科技風（靛紫主色） | 溫暖橘黃色系（`#FF8C00` 主色） |
| 介面文案 | 「英語PK學習遊戲」「英雄榜」等 | 「英語小勇士」「小組排行」等，三年級友善用字 |

## ⚠️ 2026-08-05：拿掉「小組互打PK」，改成個人挑戰

再次跟學姊確認簡報內容後，發現連 2026-08-04 剛接回來的「發起PK挑戰另一組」機制方向都錯了——
正確設計是：**實驗組**有社群評分功能、小組爬分，但**不跟別組PK**；**對照組**更單純，個人挑戰，
沒有隊友、沒有小組排行。兩組都改成任何人隨時可以發起自己的挑戰，答完最後一題後端直接結算，
不用等任何人。

這連帶砍掉了一整個子系統：
- `game.js` 的呼救/搶救機制（`/session/:id/help-request*` 五支API）整個刪掉——結構上不可能再運作，
  因為題目不再有「同組隊友同時在打同一場」這件事了
- `/session/active`（組員查詢有沒有進行中的PK自動跳轉）跟著刪掉
- 前端 `WaitingForPK.vue`（全域輪詢組長有沒有發起PK）整個檔案刪掉，`App.vue` 拿掉掛載
- `ChallengeView.vue` 拿掉選對手小組的畫面，改成選關卡/單元後直接發起
- `PKBattleView.vue` 拿掉 VS 對手標題、等待室（等對方答完）、求救按鈕跟救援視窗
- `PKResultView.vue` 拿掉「本場排行」（跟對手/隊友比較）、「小組對決 VS」，改成純個人成績卡；
  新增「小組能量條」（只有實驗組看得到，抓 `group_realtime_scores` 顯示小組即時總分/排名）；
  「小組貢獻度」從「這場PK裡的貢獻」改成「這個小組累積至今的貢獻」（因為現在每場都只有自己
  一個人在打，算單場貢獻永遠是自己100%，沒有意義了）
- `game_sessions.group_b_id` 欄位還在（NOT NULL，沒改資料庫結構），但現在永遠等於 `group_a_id`——
  純粹是滿足外鍵約束的技術性欄位，不代表真的有對手，**之後如果要查詢/分析資料要記得這件事**
- `help_requests` 表還在（沒刪表），但不會再有新資料寫入，跟 `social_logs` 拿掉 SocialModal 時
  留下的表是同樣的處理方式
- 教師後台「場次管理」不再顯示「vs 對手」，`force-end` 強制結束也不再判斷勝負（沒有對手可比）

## 實驗組/對照組雙軌設計（2026-08-04 接回）

依照學姊博士論文進度報告 PDF 的設計，實驗組（小組協作型）跟對照組（個人能力成就型）差異如下，
已在這次改動中實作：

| | 對照組 | 實驗組 |
|---|---|---|
| 排行榜 | **完全看不到**（`LeaderboardView.vue` 顯示「這裡只有你自己看得到 🔒」的鎖住畫面） | 看得到，但排的是**小組**總分（團隊能量條），不是個人排名 |
| 徽章 | 私有化顯示，個人自我超越徽章（銅/銀/金對應單場60/80/100分，這幾個 badge 本來就存在，不用改） | 同上，另外還有 `social_team` 小組共同徽章 |
| 社群互評 | 沒有，`PKResultView.vue` 底部不會出現「給隊友鼓勵」按鈕 | 有，PK結束後5分鐘限定，跟原系統一樣的按讚(10)/貼紙(30)/留言(50) |
| 首頁入口 | 沒有「小組排行」按鈕 | 有 |

判斷用的是 `authStore.user?.experiment_group === 'experimental'`，這個值來自
`COALESCE(users.experiment_group, classes.experiment_group)`（登入時 `auth.js` 算好回傳），
教師後台「組別管理」頁可以對整班或單一學生覆寫。**新建的班級預設是 `control`**，要手動在教師後台
把學生或整個班級改成 `experimental`，不然大家都會是對照組。

- 小組排行用的是既有的 `group_realtime_scores` VIEW（`GET /api/game/group-scores`，大字報也是用
  這支），學生端呼叫時要自己帶 `class_id`（這支 API 原本是給教師後台設計的，沒帶 `class_id` 時會
  fallback 去查「這個 user_id 名下的班級」，對學生帳號來說查不到東西）。
- 社群互評新增了「不能連續送給同一位隊友」的擋（`social.js`），對應 PDF 說的「輪替機制防偏袒」。
  PDF 裡這段其實只是論文的理論敘述，原系統（`pk-english-game`）程式碼裡並沒有真的做這個限制，
  是這次才第一次寫成真的規則。
- **PERR（挫折後重試率）/ STD（自我超越時數）**：這兩個 PDF 上的心理韌性指標，完全是從既有的
  `game_logs`（`round_number`、`is_correct`、`answered_at`）用 SQL window function 算出來的衍生
  指標，**沒有改資料庫結構，也没有要求學生多做任何操作**。定義是這次設計時發明的操作型定義，PDF
  原本設想的情境（有「重試同一題」這種明確動作）跟這個 PK 對戰系統的玩法（題目連續作答、沒有重試
  單題的介面）不完全對得上，是刻意簡化過的版本：
  - PERR = 這個人答錯的題目裡，「那場 PK 後面還有繼續作答」的比例（用 `round_number < 那場最大
    round_number` 判斷）
  - STD = 答錯之後，那場還撐了幾題才停（`那場最大round_number - 答錯當下的round_number`，取平均）
  - 被隊友救援的題目（`rescued_by_user_id` 不是 NULL）排除，因為 `is_correct` 反映的是救援者的
    作答結果
  - 呈現在教師後台「比較組分析」頁（`GET /api/teacher/dashboard` 回傳的 `summary.exp_avg_perr` /
    `ctrl_avg_perr` / `exp_avg_std` / `ctrl_avg_std`），以及學生資料表的 PERR/STD 兩欄
  - **這是這次設計時新發明的操作型定義，不是 PDF 原文照搬，之後如果學姊要拿去寫進論文方法論，
    務必先跟她確認這個簡化過的定義站不站得住腳**

⚠️ 不在這次範圍內、PDF 有提到但沒做的：S-FLCAS / FLLE / 學術日常韌性量表這幾份問卷（PDF 設計是
紙本或另外的量表工具，沒有整合進系統）、W5 難度陡升節點（Challenge Shock）、雙師分工/ANCOVA/
Growth Curve Modeling 這些是研究方法論本身，不是系統功能。

## 獎章系統改版（2026-09-13）

原本的 37 個獎章（`system_single`/`system_accum`/`system_rank`/`social_action`/`social_accum`/
`social_rank`/`social_team` 七類）**整包報廢重種**，改成從原系統 `pk-english-game` 那邊一份還沒
commit 的獎章改版（競爭／社群／共同三大類，各分參與-技巧(影響力)-鼓勵三分類，銅銀金傳說四級制）
移植過來，但**不是整包 144 個都搬過來**——拿掉了 44 個跟本專案機制對不上的：

- 16 個綁在呼救/搶救機制上的（敢求救、神隊友、雪中送炭、互助小隊）——這機制 2026-08-05 已經整個
  拿掉，`help_requests` 不會再有新資料
- 16 個綁在小組互打PK輸贏上的（逆風而戰、屢敗屢戰、常勝小隊、連勝小隊）——2026-08-05 拿掉小組
  互打PK後，`winner_group_id`/`group_a_id` vs `group_b_id` 的輸贏比較已經沒有意義
- 4 個「全員到齊」（同一場次要有多個不同 user_id 一起出賽才會觸發）——結構上不可能再發生，因為
  現在每場PK都只有發起人自己一個人在打
- 8 個個人班排名次類（排行常勝軍、社群排行王）——依 2026-08-26 學姊博班進度報告的實驗一自變項
  設計，對照組是「個人獎章＋全程不設個人排行榜」、實驗組是「共同獎章＋組內無排名、組間才有競爭」，
  不管哪一組，個人在班上的名次都不該再被強調

剩下 **100 個獎章**（`badge_id` 1-100，7 個分類：`competitive_participation`/`competitive_skill`/
`competitive_encouragement`/`social_participation`/`social_influence`/`social_encouragement`/
`social_team`），SQL 種子檔是 `backend/scripts/redesign-badges.sql`，開頭註解有完整的取捨說明。
新增了 12 個獎章要用的 `activity_logs` 表（記錄單字翻牌複習/單字選擇題練習/聽力發音點擊次數，
`backend/scripts/add-activity-logs.sql`），對應前端 4 個頁面（`WordReviewView.vue`/
`WordPracticeView.vue`/`QuestionPracticeView.vue`/`PKBattleView.vue`）新增的
`POST /api/questions/log-activity` 呼叫。`backend/routes/badges.js` 判斷邏輯也跟著簡化——
拿掉了個人排名(`sys_rank`/`socRank`)、救援次數、對手輸贏這幾組不再需要的查詢，`weekly-rank-check`
端點（原本用來發連續三週冠軍的傳說級獎章）也整個拿掉，因為已經沒有任何個人排名類獎章了。

⚠️ `user_badges` 隨著 `TRUNCATE` 一起清空重來，但當時資料庫裡只有測試帳號的獎章紀錄，沒有真的
學生資料，所以這是安全的。

## 轉學生保留帳號機制（2026-09-15）

學生轉班（換到同一位教師底下的另一個班級）時，沿用同一個 `user_id`，答題紀錄/獎章都不會斷，
只是重新指定 `class_id`／`group_id`。新增：

- `backend/scripts/add-student-transfers.sql`：`student_transfers` 表，純粹留一筆紀錄
  （誰在什麼時候從哪班轉到哪班、轉班當下小組跟實驗組別分別是什麼），方便學姊寫論文方法論時
  交代轉班/流失情況，不影響任何遊戲邏輯
- `PATCH /api/teacher/students/:userId/transfer`（`teacher.js`）：Body `{ new_class_id }`。
  **只能轉到同一位教師管理的班級**，跨教師轉班這次沒做，會直接被擋掉，需要的話要另外設計授權方式
- 轉班當下會把學生「轉班前」算出來的有效實驗組別（教師覆寫值，或沒覆寫就用舊班級預設值）
  明確寫成新的個人覆寫，**避免因為新班級的預設組別不同，實驗條件在教師沒有特別決定的情況下被
  悄悄換掉**——這是刻意的研究設計考量，不是隨便挑的行為；如果教師本來就是想讓轉班學生改用新
  班級的組別，轉班後再用既有的 `experiment-group` API 手動改掉即可
- 轉班後小組是空的（`group_id` 設回 `NULL`），教師要到教師後台「小組管理」頁重新分組——這次
  沒有做「同時指定新小組」的介面，是刻意簡化的 MVP 範圍
- 前端：教師後台「學生資料表」每一列多一個「🔄 轉班」按鈕（只有教師管理超過1個班級時才顯示），
  跳出確認用的 Modal，選新班級後呼叫上面那支 API
- 已用一次性的測試資料（用完即刪，沒有動到既有的 `seed-test-accounts.js` 測試帳號）驗證過整條
  邏輯：從 `control` 預設班轉到 `experimental` 預設班，學生的有效實驗組別正確維持 `control`

## 轉學生（從別校轉進來）標記機制（2026-09-15）

上面「轉學生保留帳號機制」處理的是同系統內轉班；這節是另一種情境——**學生從別的學校轉進來**，
沒有經歷過前測、沒被隨機分派過。技術上這種學生本來就能自己用班級代碼註冊帳號（`auth.js`
的 `/register` 本來就沒有時間限制），所以問題不是「能不能建帳號」，是研究方法論上「怎麼知道
誰缺前測基準值，之後分析要不要排除」。

跟學姊確認後的處理方式：**先讓他們正常使用系統、比照補前測，但用時間點把他們標記出來**，
之後看資料乾不乾淨再決定要不要排除，不是系統擋他們或先天分開計算。目前做的：

- `classes` 新增 `study_start_date`（`backend/scripts/add-study-start-date.sql`）：教師可以設定
  這個班級的研究/前測正式開始日，教師後台頂部班級選單旁邊有「📅 研究開始日」的日期輸入框
  （`PATCH /api/teacher/classes/:classId/study-start-date`）
- 教師後台學生資料表跟 `GET /api/teacher/dashboard` 的 `summary.late_joiner_count` 會自動算出
  「晚加入」學生：`study_start_date` 有設定、且這個帳號的 `created_at` 晚於那天，就會標記
  🆕 晚加入（純粹是標記，**不會限制他們使用系統任何功能**），CSV 匯出也有這欄
- 已用一次性測試資料驗證過：`created_at` 早於研究開始日的標記 `is_late_joiner=0`，晚於的標記 `=1`

⚠️ **這次沒做的部分**：「補前測」本身沒有做成系統功能——theme 11/12 的前測題目已經在題庫裡，
晚加入的學生可以直接照正常流程玩到那些內容，但系統沒有「正式前測事件」的概念（例如強制他在
某個時間內把前測題目一次性作答完、獨立於一般練習/PK計分之外記錄一個前測分數）。如果學姊要的是
更嚴謹的「補測」流程，這是後續需要另外設計的功能，目前只等於「他們會自然玩到那些題目」。

## 學生中離機制（2026-09-15）

跟學姊確認過：學生中離**仍然可以正常登入系統**（不是退出研究就整個斷線，比較像是「不再納入分析」
而不是「不能再被收集任何資料」），但**小組共同總分/獎章要把他排除在外重算**，不然他停在原地的
分數會一直拖累（或墊高）還在參與的組員的團隊表現，對其他人不公平。中離不是刪帳號、不是鎖登入，
中離前累積的個人分數/獎章/答題紀錄完全不動。

- `users` 新增 `withdrawn_at`（`backend/scripts/add-student-withdrawal.sql`），`NULL` 表示仍在研究中
- `PATCH /api/teacher/students/:userId/withdraw`（Body `{ withdrawn: true|false }`）：標記/取消中離
- **`group_realtime_scores` VIEW 重新定義**，JOIN 條件加上 `withdrawn_at IS NULL`——大字報、小組排行
  用的都是這個 VIEW，中離者的分數自動不會被算進團隊總分/平均
- `badges.js` 的 `checkAndAwardTeamBadges`（團結小隊/學霸小隊那兩個小組共同獎章）的組員清單跟平均分
  查詢也都加了同樣的排除條件——中離者不會再收到新的小組共同獎章，但中離前已經拿到的不會被收回
- 教師後台學生資料表每列多一個「🚪 標記中離／↩️ 取消中離」按鈕，中離的學生會顯示「🚪 已中離」標籤，
  CSV 匯出也有這欄；`summary.withdrawn_count` 顯示中離人數
- ⚠️ **範圍限定在小組共同總分/獎章**，個人排行/教師後台的整體班級平均（`avg_system_score` 等）
  這次沒有跟著排除中離者，只做了明確要求的那塊，之後如果需要再擴大範圍
- 已用一次性測試資料驗證過：中離前小組平均是兩人分數的平均，中離後只剩還在參與的組員，數字正確

## 系統整合全流程測試（2026-09-16）

用真正跑起來的 dev server（不是直接呼叫函式）走過一輪：教師登入→儀表板、學生登入→
`/questions/themes` 主題限制→發起PK→答題→結算→`/badges/check`（驗證 2026-09-13 改版後的
100個獎章真的會發放，這場拿到經驗收藏家/賽場常客/主題探索家/單場高手/極速應答王/單場飛躍/
主題精通者/越挫越勇/逆轉勝/全能社交家/學霸小隊等多個獎章）→小組即時總分→對照組排行榜。

⚠️ **測試中發現並修好的實際 bug**：`GET /api/game/leaderboard`（英雄榜個人排行）**後端完全沒有
擋對照組**——「對照組完全看不到排行榜」原本只有前端 `LeaderboardView.vue` 用
`authStore.user?.experiment_group === 'experimental'` 判斷要不要顯示鎖住畫面，後端這支 API
本身誰打都給全班個人名次。這跟 2026-08-04 就定案的研究設計「對照組全程不設個人排行榜」不符——
對照組帳號只要繞過前端直接呼叫這支 API（或之後前端不小心改壞判斷邏輯），就能看到全班排名，
跟成就目標理論「避免同儕排名壓力」的實驗設計初衷矛盾。**已修好**：`game.js` 的 `/leaderboard`
現在會先查呼叫者的有效 `experiment_group`，對照組直接回傳 `{ entries: [], locked: true }`，
不會真的把資料撈出來。已用真實 HTTP 請求驗證過：S002（對照組）拿到空陣列+`locked:true`，
S001（實驗組）正常拿到全班名次。

其餘檢查結果：主題限制正確只回傳 11-16、防作弊（session/start 回傳的題目不含 correct_answer）
正常、小組即時總分正確反映兩個組員的累積分數、儀表板新欄位（`late_joiner_count`/
`withdrawn_count`/`study_start_date`/PERR/STD）都正確出現在回傳資料裡。另外發現一個**次要**
問題：`POST /api/social/interact` 如果 `receiver_id` 傳 `null`（不完整的請求），會噴未處理的
500而不是乾淨的400錯誤訊息——前端正常操作不會發生這種請求（一定是從下拉選單選一個真的組員），
實際風險很低，這次沒有修，僅記錄。

⚠️ **這次測試沒有涵蓋的部分**：瀏覽器視覺層——這台機器沒有 `chromium-cli` 也沒裝 Playwright，
只做了到 HTTP API 這層的驗證，沒有真的截圖看畫面渲染對不對。Dev server 目前還在背景跑著
（前端 `:5174`、後端 `:3001`），建議另外自己打開瀏覽器點過一輪，尤其是這次新加的教師後台
UI（🔄轉班／🚪標記中離／📅研究開始日 那幾個新按鈕/輸入框）沒有經過視覺確認。

## Unit1/Unit2 內容跟權威教材對齊、系統範圍收斂到這兩單元（2026-09-16）

學姊提供了真正的權威教材原文（`前測資料/四年級教科書內容.docx`、
`前測資料/四年級補充繪本教材.docx`——教科書 Unit1《The Big Wind》+ Unit2《Going Back Home》+
補充繪本《The Wind Blew》、《What's the Time, Mr. Wolf?》），逐字核對現有 theme 11/12 單字表
後發現幾個問題，都已修正：

- **`wolf` 分類錯誤**：原本掛在 theme 11（天氣），但它是繪本二《Mr. Wolf》的核心詞彙（繪本二講的
  是時間），已改成 theme 12，相關的 2 道題目（question_id 287、294）theme_id 也一併改過來
- **`rabbit`、`frog` 兩份權威教材都沒有出現**，是之前匯入前測時從錯誤選項反推出來的，不是真的教材
  內容，已刪除
- **補了 21 個教材有教但系統沒有的單字**（`word_id` 227-247）：theme 11 補 `wind`（風，跟已有的
  形容詞 `windy` 是不同詞）、`kite`、`blow(blew)`、`take(took)`、`fly(flew)`；theme 12 補
  `one`~`twelve` 整組基數（繪本二「It's [1-12] o'clock」句型的基本建構單字，原本完全缺席）、
  `eat`、`run`、`bed`、`class`
- **補了 38 道對應題目**（`question_id` 327-364），包含這些新單字的挑戰區/練習區內容，以及原本
  教材有教但沒有題目練習到的句型：天氣疊加句型（"It's sunny and hot."類）、"It's time for
  bed/class"（原本只有 lunch）、地名替換問句（"How's the weather in Taipei?"類）
- **把 `words.image_url` 補上了**：`WordReviewView.vue` 的單字翻牌卡片本來就會讀這個欄位顯示插圖
  （沒有就退回字母圓圈），但這個欄位之前一直是空的——這次把 theme 11/12 所有「概念具體、畫得出來」
  的單字都補上圖（45/50個），畫了 31 張新 SVG（風格延續既有的圓形色塊+扁平插畫）。當時 `how`/
  `weather`/`time`/`o'clock`/`snatch` 這 5 個抽象詞刻意不畫圖，維持字母圓圈的預設行為——**這個
  決定 2026-09-22 已經推翻**，見下面「補齊剩下 5 個抽象詞的插圖」段落
- **`WordPracticeView.vue`（練習區單字練習）不需要額外的 `questions` 表資料**——它是直接從
  `words` 表用 `/questions/review` 拿到的單字清單在前端組題，新單字一補進 `words` 就自動會出現
  在練習區；`questions` 表的新題目主要是為了「挑戰區」（PK 個人挑戰用 `game.js` 抽題）的內容完整度
- 匯入腳本：`backend/scripts/add-unit1-unit2-picturebook-content.sql`

⚠️ **系統範圍再收斂**：跟學姊確認後，現在系統實際只需要 theme 11（The Big Wind）+ theme 12
（Going Back Home）這兩個單元，不是原本的 theme 11-16 六個單元。做法比照之前拿掉 theme 1-10
的方式——**後端擋掉，不刪資料**：`questions.js` 的 `/themes`、`/review`、`/stage` 三支，跟
`game.js` 的 `session/start`，原本的 `theme_id >= 11` 條件全部改成 `theme_id IN (11,12)`（後來
2026-09-16 補充繪本教材拆成獨立的 theme 17/18 之後，這幾個地方又改成
`theme_id IN (11,12,17,18)`，見後面「補充繪本教材拆成獨立單元」段落）。theme 13-16（Be Honest/
Earthquake Drill/Halloween/Get Ready）的資料本身沒有動，之後如果這幾個單元也做完跟權威教材的
核對，把這幾個地方的條件改回涵蓋它們就能重新開放。已用真實 HTTP 請求驗證過：
`/questions/review` 抽到的單字 45/50 個有圖。

## 整個社群互評功能拿掉，改成完全照簡報設計（2026-09-16）

跟學姊確認過：2026-08-04「接回社群互評」那次是誤植了另一份 PDF 的設計，2026-08-26 進度報告裡
**完全沒有提到社群互評／社群分**，實際設計就只是：對照組「個人獎章、全程不設排行榜」，實驗組
「小組組間積分解鎖共同獎章、有排行榜」。這次把社群互評整個拿掉，回到跟簡報一致的版本：

- **前端**：`PKResultView.vue` 拿掉「給隊友鼓勵」按鈕、5分鐘倒數計時、`SocialModal` 掛載、
  社群獎章全螢幕彈窗（`SocialModal.vue` 檔案還在，只是沒有地方會掛載它，比照 `WaitingForPK.vue`
  被拿掉前的處理方式，需要的話還能重新掛回去）；`LeaderboardView.vue` 小組排行原本有「小組能量條
  ／小組社群分」兩個 tab，現在只剩小組能量條一個，`social-mode` 相關的 CSS/class 綁定沒有全部清乾淨
  （反正 activeTab 永遠是 'system'，不影響顯示，只是有些死掉的 class 綁定留著）
- **獎章**：拿掉 32 個獎章（`badge_id` 65-96）——拍拍手達人/暖心留言家/貼紙收藏家/全能社交家
  （social_participation）、人氣指數/被隊友喜愛（social_influence）、全能鼓勵家
  （social_encouragement）、團結小隊（social_team，小組平均社群分）。學霸小隊（小組平均系統分）
  保留，重新編號成 65-68。剩下 **68 個獎章**，SQL 在 `backend/scripts/remove-social-badges.sql`
- **`badges.js`**：拿掉 likesSent/stickersSent/commentsSent/receivedCount 這些不再需要的查詢，
  `checkAndAwardTeamBadges` 只剩學霸小隊一個家族
- **`group_realtime_scores` VIEW 拿掉 `avg_social_score` 欄位**（重新定義過），這支 VIEW 是
  大字報／小組排行／`game.js` 的 `/group-scores` 共用的資料來源，`game.js` 那支查詢原本有
  `SELECT ... avg_social_score ...`，欄位拿掉後有跟著改查詢，不然會直接噴 SQL 錯誤——這是這次
  改動過程中抓到、順手修掉的
- `social_logs` 表、`/api/social/interact` 路由都還在（沒刪），但前端已經不會再呼叫，比照
  `help_requests` 的處理方式；`users.social_score` 欄位也還在，之後只會永遠停在 0，教師後台/CSV
  匯出裡有些地方還是會顯示這個永遠是 0 的欄位（例如 `teacher.js` 的 `summary.avg_social_score`），
  沒有特別去清，屬於無害的殘留
- 已用真實 HTTP 請求驗證過：`/game/group-scores`、`/badges/check`、`/badges/user/:id` 都正常運作，
  獎章分類只剩 `competitive_participation`/`competitive_skill`/`competitive_encouragement`/
  `social_team` 四種

## 補充繪本教材拆成獨立單元（2026-09-16）

跟學姊確認過：補充繪本教材（`前測資料/四年級補充繪本教材.docx`）的內容不該混在教科書 Unit1
（theme 11 The Big Wind）／Unit2（theme 12 Going Back Home）底下，要另外設兩個單元。新增：

- `theme_id` 17：《The Wind Blew》（繪本一）
- `theme_id` 18：《What's the Time, Mr. Wolf?》（繪本二）

判斷「這個字/這題該搬去繪本單元、還是留在教科書單元」的依據是重新逐字比對兩份權威文件——容易搞混
的兩種情況要特別注意：

- 教科書 Unit2 自己的「It's time for [三餐/活動]」句型本來就有教 `breakfast`/`lunch`/`dinner`/
  `bed`/`class`/`school`，繪本二雖然也重複用到這些字，但因為教科書本來就教過，**維持留在
  theme 12，沒有搬動**
- 教科書 Unit2 的數字只到 `fifteen`/`twenty`/`twenty-five`/`thirty`/`forty`/`fifty`（拿來報
  分鐘用），`one`~`twelve` 這組基數只有繪本二的「It's [1-12] o'clock」句型在教，教科書完全沒有，
  所以整組（連同對應的12道圖片選字題目）搬去 theme 18；`o'clock`／`time` 兩份文件都有教，
  維持留在 theme 12

搬動明細：
- theme 11 → 17：`newspaper`/`umbrella`/`scarf`/`shirt`/`balloon`/`hat`/`snatch`/`wind`/`kite`/
  `blow`/`take`/`fly`（12個單字）+ 18道題目，theme 11 現在只剩教科書原本的 8 個天氣形容詞單字
- theme 12 → 18：`wolf`/`clock`/`one`~`twelve`/`eat`/`run`（16個單字）+ 18道題目，theme 12
  現在剩教科書 Unit2 原本的內容（14個單字）
- 搬題目時第一輪用單字比對抓，事後又用「題目 correct_answer 是不是繪本專屬單字」重新逐題掃過
  一次，多抓到 2 題原本漏掉的（`The big wind blows an umbrella.`、`The wind blew.`——這兩題的
  正確答案剛好是繪本專屬單字，但一開始只顧著搬「單字本身的題目」忘記搬「用到這些單字的句型題」）
- 匯入腳本：`backend/scripts/split-picturebook-units.sql`
- 系統開放的主題範圍從 `theme_id IN (11,12)` 改成 `theme_id IN (11,12,17,18)`（`questions.js`
  的 `/themes`、`/review`、`/stage`，`game.js` 的 `session/start`），已用真實 HTTP 請求驗證過
  四個單元都能正常抽題發起挑戰
- 圖片檔案本身沒有搬動位置（例如 `wolf.svg` 還在 `The_Big_Wind/` 資料夾底下），因為 `image_url`
  只是一個字串路徑，跟 `theme_id` 分類無關，搬動 theme_id 不需要跟著搬檔案

## 教師後台一併清掉社群互評殘留（2026-09-16）

上面「整個社群互評功能拿掉」那次只處理了學生端（`PKResultView.vue`/`LeaderboardView.vue`），
教師後台（`DashboardView.vue`、`teacher.js` 的 `/dashboard`）還留著一整套圍繞社群分/社群互動建的
圖表跟頁面——這些從此之後只會永遠是 0/空，這次一併拿掉：

- **`teacher.js` 的 `/dashboard`**：學生查詢拿掉 `social_score`/`support_sent`/`support_received`
  三個欄位（連同對應的 `social_logs` JOIN 子查詢一起刪）；`summary` 拿掉 `avg_social_score`/
  `total_social_acts`；近7場趨勢拿掉 `avg_social`（順便發現這裡本來就有兩份趨勢查詢，一份用
  subquery 寫的從沒被實際使用過，直接刪掉，只留下真的在用的那份）；拿掉「社群互動次數分布」
  （`socialStats`）跟「社群互動率」（`socialRate`）兩個查詢，`participation` 現在只剩
  `participation_rate`
- **`DashboardView.vue`**：
  - 拿掉「互動紀錄」整個 nav 分頁（`social-logs`）跟對應的 `fetchSocialLogs`／`exportSocialLogs`
  - 總覽頁「分數趨勢」圖從雙線（答題分數/社群分）改單線（只剩答題分數），拿掉「社群互動次數分布」
    長條圖，「PK參與率&留存」改成只顯示「PK參與率」
  - 學生資料表拿掉「社群分」欄位跟排序選項，「比較組分析」頁拿掉兩組的「平均社群分」比較卡，
    總覽 KPI 卡拿掉「平均社群分」「總社群互動」
  - CSV 匯出拿掉社群分/送出支持/收到支持三欄
- `backend/routes/teacher.js` 的 `GET /export/social-logs` 端點本身沒有刪，比照 `help_requests`
  的處理方式留著但前端已經沒有地方會呼叫
- 已用真實 HTTP 請求驗證過：`/teacher/dashboard` 回傳的 `summary`/學生欄位/`trend`/
  `participation` 都已經不含任何社群相關欄位，教師後台前端也重新 build 通過

## 學習區首頁「複習區」接回真實題庫（2026-09-16）

學姊截圖抓到：`LearningView.vue`（學習區首頁）上的「複習區」單字卡（dog/banana/apple/father/
mother/school 那些）**整個是寫死的假資料**，`WORD_BANK` 常數擺明是佔位用的通用單字，從來沒有
真的呼叫後端，跟現在題庫的 theme 11/12/17/18 完全無關（`school` 剛好重疊純屬巧合）。已改成真的
呼叫 `GET /api/questions/review?limit=6`（不指定 `theme_id`，就會照後端既有的限制從目前開放中的
單元隨機抽——跟 `WordReviewView.vue` 同一支 API，只是這裡沒有綁定特定單元），「換一批」按鈕現在
真的會重新抽真實單字。已用真實請求驗證過抽到的都是 theme 11/12/17/18 的字（例如 one/breakfast/
snatch/cloudy）。

順便拿掉了頁面頂部一個漏掉的「❤️ 社群分」數字 chip（`user.socialScore`）——這是之前拿掉整個
社群互評功能時漏掉的殘留，這次一併清掉，頂部現在只剩「⚡ 答題分數」。

## 教師後台拿掉「投影模式」（2026-09-16）

教師後台原本有兩個投影用的按鈕：「📽️ 投影模式」（`ProjectorView.vue`，`/projector`）跟
「📺 大字報」（`ScoreboardView.vue`，`/scoreboard`）。檢查發現「投影模式」是從原系統
`pk-english-game` 帶過來、但從沒跟這個專案現在的設計對齊過的舊功能——它做的是**個人**排行投影
（預設模式還是「❤️ 社群分排行」，另一個 tab 是系統分排行），這跟這個專案兩個已經定案的設計都衝突：

- 2026-09-16「整個社群互評功能拿掉」那次已經把社群分/社群互評整個廢掉了，`ProjectorView.vue`
  預設模式讀的 `social_score` 從此以後只會永遠是 0
- 2026-08-26 學姊博班進度報告的實驗一設計是「對照組個人獎章＋全程不設個人排行榜、實驗組共同獎章＋
  組內無排名／組間才有競爭」，不管哪一組都不該把**個人**名次投影出來給全班看，這點跟拿掉 8 個
  個人班排名次類獎章（見「獎章系統改版」段落）是同一個理由

「📺 大字報」（`ScoreboardView.vue`）沒有這個問題——它排的是**小組**總分，符合「組間才有競爭」
的設計，這次沒有動，保留。已拿掉：`router/index.js` 的 `/projector` 路由、`DashboardView.vue`
的「📽️ 投影模式」按鈕跟 `openProjector()` 函式、`ProjectorView.vue` 檔案本身（直接刪除，不是
比照 `SocialModal.vue`/`WaitingForPK.vue` 那種「留檔案但拔掉掛載點」的處理方式——因為這個檔案的
排行邏輯本身跟現在的設計互斥，不是「之後可能用得到」的暫時拿掉，沒有保留的理由）。`teacher.js`
後端沒有專屬這個功能的 API（它借用既有的 `/teacher/dashboard`、`/teacher/export/badges`），
所以後端不用改。

## 修正「單字複習」例句的文法錯誤（2026-09-22）

陳瑩軒回報：`WordReviewView.vue`（單字複習翻卡）的例句不分詞性統一套用「This is a {word}.」樣板，
碰到形容詞（例如 `cloudy`）就會出現「This is a cloudy.」這種文法錯誤的句子——形容詞前面不能加冠詞。
改成依詞性/語意分流，套用教材裡實際會用到的句型：

- 天氣形容詞（`cloudy`/`rainy`/`sunny`/`windy`/`cold`/`hot`）→「It's cloudy.」
- 報時數字：`one`~`twelve`（繪本二教的整點）→「It's three o'clock.」；`fifteen`/`twenty`/
  `twenty-five`/`thirty`/`forty`/`fifty`（教科書 Unit2 教的分鐘數）→「It's three fifteen.」
- 三餐/作息類名詞（`breakfast`/`lunch`/`dinner`/`bed`/`class`/`school`）→「It's time for lunch.」
- 其餘語意特殊、套規則會很怪的單字（`how`/`weather`/`time`/`o'clock`/`wind`/`snatch`/`blow`/
  `take`/`fly`/`wolf`/`eat`/`run`）用一張明確的例外對照表給固定句子，例如 `wolf` → "Mr. Wolf,
  what's the time?"（呼應繪本二書名）、`snatch` → "The wind snatched his hat!"（呼應繪本一「風吹走
  東西」的情節，`hat` 剛好也是繪本一單字之一）
- 剩下真的是「可以指著說『這是一個』」的具體名詞（`newspaper`/`umbrella`/`hat`/`kite`/`clock` 等）
  才維持原本「This is a/an {word}.」的句型，`a`/`an` 用單字開頭是不是母音字母簡單判斷
  （50 個字裡只有 `umbrella` 需要用 `an`，沒有 silent-h 之類的例外要處理）

新的判斷函式 `exampleSentence()` 直接寫在 `WordReviewView.vue` 裡（沒有另外抽成共用檔案，因為
目前只有這個畫面會顯示例句——`LearningView.vue` 的複習區翻卡沒有例句欄位）。已經對照
theme 11/12/17/18 現有的 50 個單字全部手動跑過一輪結果，確認沒有文法怪異或語意不通的句子。

## 補齊剩下 5 個抽象詞的插圖（2026-09-22）

陳瑩軒回報：學習區有些單字沒有圖，導致看圖作答的題目答不出來。查了一下，theme 11/12/17/18 這
50 個單字裡確實有 5 個從 2026-09-16 就一直是 `words.image_url IS NULL`（`how`/`weather`/`time`/
`o'clock`/`snatch`），當時是因為覺得這幾個字太抽象、畫不出來，刻意留給字母圓圈的預設樣式。這次
推翻那個決定，補齊全部 50 個字的圖：

- **`time`**：其實 `frontend/public/images/senior/Going_Back_Home/time.svg` 這張圖檔案本身
  早就存在（`question_id 190` 那題 image_choice 題目本來就在用），只是 `words` 表裡 `time`
  這個單字的 `image_url` 欄位沒有指過去，是純粹的資料遺漏，不用畫新圖，補上連結就好
- **`how`**：新畫成對話泡泡裡一個大問號，呼應「How's the weather?」的用法
- **`weather`**：新畫成太陽＋雲＋雨滴三個小圖示放在一起，代表「天氣」這個籠統概念（跟 `cloudy.svg`
  單純「太陽被雲遮住」不同，特地畫成三種天氣現象並列以區隔）
- **`o'clock`**：新畫成時針分針都疊在12點的鐘面（不像 `clock.svg` 那張物件圖有鐘腳、指針隨意指某個
  角度）——用「兩指針疊在正上方」代表「整點」的概念，跟已有的 `one.svg`~`twelve.svg` 那些指到
  特定時刻、下面還印數字時間的畫法做出區隔
- **`snatch`**：新畫成一隻手伸過去、帽子被風吹得往右上飛走，呼應繪本一《The Wind Blew》裡「風把
  東西搶走」的情境，也呼應上面例句修正時給這個字配的例句「The wind snatched his hat!」

新增檔案：`frontend/public/images/senior/The_Big_Wind/how.svg`、`weather.svg`、`snatch.svg`，
`frontend/public/images/senior/Going_Back_Home/oclock.svg`（檔名沒有用單引號，避免檔案系統問題，
`words.image_url` 裡照樣指到這個檔名）。已用 SQL 直接把這 5 個 `word_id`（174/175/182/183/221）
的 `image_url` 更新好，並重新查過整個 theme 11/12/17/18 範圍，確認 `image_url IS NULL` 的筆數
是 0——**現在這 4 個開放中的單元，50 個單字全部都有圖了**。

## 補上 3 題「沒圖答不出來」的填空題（2026-09-22）

上面補的是**單字**的圖（`words.image_url`），這次陳瑩軒回報的是**題目**本身缺圖——挑戰區/練習區的
句型挑戰裡，有幾題 `fill_blank` 題型的空格答案是「題目文字本身沒講、也沒給圖」的具體數值，學生
只能用猜的。逐題audit過 theme 11/12/17/18 全部 `fill_blank`／`mcq` 題目後，**只有 3 題**真的是
這個問題（`mcq` 都有文字選項可以選，不算；有些 `fill_blank` 空格其實是文法固定的，例如
「What ___ is it?」只能填 `time`，這種靠句型本身就能推出答案，也不算）：

- `question_id 175`「How's the weather? It's _____.」答案 `windy`——天氣可以是晴/雨/多雲/冷/熱
  任何一種，沒圖猜不出來
- `question_id 193`「What time is it? It's twelve _____.」答案 `thirty`——分鐘可以是任何數字
- `question_id 326`「A: What time is it? B: It's eleven ______________.」答案 `twenty`——
  陳瑩軒截圖回報的就是這題

修法很簡單，不用畫新圖：這三題的空格要考的字，剛好都是**題目文字裡已經講過小時、只缺分鐘/天氣**
這種情況，所以直接重用對應單字本來就有的圖檔——175 接 `windy.svg`、193 接 `thirty.svg`、326 接
`twenty.svg`（分鐘類單字的圖本來就沒有畫特定小時，本來就適合單獨拿來當「這格該填哪個分鐘」的提示）。
`QuestionPracticeView.vue`／`PKBattleView.vue` 顯示圖片的判斷式本來就是「只要 `question.image_url`
有值就顯示」，不分題型，所以後端把 `questions.image_url` 補上就會自動生效，前端不用改。已用真實
`/questions/stage` API 請求驗證過，`question_id 326` 現在回傳的 `image_url` 正確指到
`twenty.svg`。

## 登入頁按鈕文案改掉重複的「開始挑戰」（2026-09-22）

陳瑩軒回報：登入頁（學生身份）送出按鈕寫「🎮 開始挑戰！」，跟登入後首頁上「⚔️ 開始挑戰」那顆
真正用來發起 PK 的按鈕撞名，容易搞混「這顆是登入、那顆才是真的去打PK」。改成
`frontend/src/views/LoginView.vue` 的送出按鈕文案改成「🔑 登入英語小勇士」，跟首頁的「開始挑戰」
按鈕做出區隔；教師登入的「📊 進入後台」維持不動，本來就沒有這個撞名問題。

## PK結算頁的新獎章列表補上等級標籤（2026-09-22）

陳瑩軒截圖回報：C01（對照組）打完一場PK後，「獲得新獎章！」列表裡「單場飛躍」出現了 4 次，
看起來像是同一個獎章重複發放的 bug。查證後**這不是對照組專屬、也不是重複發放的 bug**——
`badges` 表裡「單場飛躍」本來就是銅/銀/金/傳說四個獨立的 `badge_id`，門檻分別是「本場正確率
較上一場進步 10/20/30/40 個百分點」，這位學生剛好單場進步幅度一次跨過全部 4 個門檻，四個獎章
都是第一次拿到，所以後端一次發了 4 筆——這個行為對實驗組/對照組完全一樣，只是**這位學生剛好
進步很多**才會這麼明顯。

真正的問題是`PKResultView.vue`「獲得新獎章！」的卡片只顯示 `badge_name`／`condition_desc`，
沒有顯示 `badge_tier`，四張卡片名稱一樣、說明文字又相近，才會被誤認成重複。修法是照
`ProfileView.vue` 獎章牆本來就有的 `tierLabel()` 慣例，在獎章名稱旁加一個「銅級/銀級/金級/傳說」
的小標籤（`.badge-tier-chip`），讓四張卡片讀起來是「單場飛躍 銅級/銀級/金級/傳說」四個不同等級，
不是重複；小組共同獎章的全螢幕慶祝彈窗（`showTeamBadgeModal`）也有一樣的潛在問題（例如「學霸
小隊」同一場衝過好幾級），一併加上等級標籤，金色漸層背景那邊另外用白底深字的配色，不然暗色系
的等級色塊會被金色背景吃掉看不清楚。純前端顯示修正，後端獎章判斷邏輯本身沒有問題、不用改。

## 修好「課文挑戰」選到沒題目的單元會給 0 分的 bug（2026-09-22）

陳瑩軒回報：對照組選「課文挑戰」+《The Wind Blew》或《What's the Time, Mr. Wolf?》（theme 17/18，
補充繪本兩單元）還是能進到答題畫面，但畫面顯示「1/0」，什麼都不用答就直接「挑戰結束」、0分。

查證後：`questions.level` 分 `vocabulary`/`sentence`/`reading` 三種，theme 17/18 目前**只有
`vocabulary`／`sentence` 的題目，完全沒有 `reading`（課文挑戰）的題庫**（跟教科書 Unit1/Unit2
的 theme 11/12 不一樣，那兩個單元各有 5 題 reading）。真正的 bug 在 `game.js` 的
`POST /session/start`：不管抽不抽得到題目，都會**先建立一筆 `game_sessions` 記錄**，抽題抽到
0 題也一樣回傳成功、附上空題目陣列，前端 `PKBattleView.vue` 就會顯示「1/0」然後直接判定挑戰結束。

**修法**：把抽題的邏輯搬到建立 `game_sessions` 記錄**之前**，抽到 0 題就直接回傳 `404` +
「這個單元目前沒有這個關卡的題目，請換一個單元或關卡試試看。」，不會再留下一筆空場次。
`ChallengeView.vue` 發起挑戰失敗時本來就有 `alert(e.response?.data?.error ?? ...)` 的錯誤處理，
不用改前端，這個新的錯誤訊息會自動跳出來。已用真實 HTTP 請求驗證過：`reading + theme 17/18`
現在乾淨地回 404，`reading + theme 11`、`vocabulary + theme 17` 這些原本就有題目的組合完全不受
影響；也把 2026-09-15 測試時期就卡在資料庫裡、同樣成因的一筆 0 題壞場次（`session_id 89`）清掉了。

⚠️ **這次沒做的部分**：前端「選擇挑戰」畫面目前還是會讓學生看到「課文挑戰」＋《The Wind Blew》／
《Mr. Wolf》這個組合可以選，只是選了會跳出錯誤訊息、不會再進到破損畫面——比較理想的做法是選單元
時就先知道哪些單元沒有對應關卡的題目、直接不給選，但這需要多一支「每個單元每個關卡各有幾題」的
API，這次先做「後端擋掉+前端顯示清楚的錯誤訊息」這個比較小的修正，之後如果要做更好的 UX 可以再加。

## 共同獎章大幅擴增（2026-09-22）

學姊提供 `前測資料/20260826妏庭-實驗一(更新版).pptx`（進度報告簡報），確認了兩件事：
1. **共同獎章是實驗一自變項設計的核心**——簡報「自變項」那頁白紙黑字寫「實驗組＝小組協作共榮結構
   （共同獎章）：團體能量條與共同獎章，全組成員積分共享，能量達標時共同解鎖『團隊榮譽獎章』」，
   跟對照組「個人自主成就結構（個人獎章）」是對照設計的兩端，份量應該要相當
2. **實驗期程是 10 週**——依變項表格裡「詞彙記憶鞏固度」量測工具寫「實驗後2-3週之延遲後測(W10)」，
   代表整個實驗規劃是跑到第10週

但改版前共同獎章只有「學霸小隊」一個家族（4個獎章：小組平均系統分100/500/1000/3000），個人獎章
卻有16個家族（64個獎章），比例明顯失衡，撐不起簡報裡「共同獎章是自變項核心」這句話。這次擴增：

- **新增 8 個家族、32 個獎章**（`badge_id` 69-100），連同原本的學霸小隊共 **9 個家族、36 個共同
  獎章**，全部沿用既有的 `social_team` 分類（沒有改 ENUM，靠 `badge_name`分家族，review 工作台/
  個人頁獎章牆本來就是照 `badge_name` 分組顯示，不用改前端）：
  - **並肩作戰**（小隊累積出賽場次 10/30/70/150 場）
  - **打卡常勝軍**（小隊不重複活躍天數 8/20/35/50 天——鼓勵細水長流，不是集中爆衝）
  - **火力全開**（小隊累積答對題數 200/600/1200/2400 題）
  - **閃電小隊**（小隊累積5秒內快速答對題數 15/40/90/180 題）
  - **全域探索隊**（小隊涉獵過的不同主題數 2/3/4個，傳說級要4主題全涉獵+累積出賽≥40場）
  - **小隊全勤**（小隊連續活躍週數 2/4/7/10 週——**傳說級直接對應 W10，撐完整個實驗期才拿得到**，
    是這次設計的旗艦款，直接呼應簡報的10週規劃）
  - **絕地反攻**（小隊全體「單場正確率比上一場進步≥20個百分點」次數加總 3/8/16/30 次）
  - **人人有功練**（小組裡「個人系統分達到門檻」的人數，門檻/人數要求一起升級：
    ≥2人達50分／≥3人達150分／全員達300分／全員達800分——gold/legend要求**全員**，直接呼應簡報
    依變項表格裡「社會互動均衡度」關心的「避免少數人主導、內向者邊緣化」，不能只靠一個人扛全組）
- 完整設計理由跟每個門檻的計算依據寫在 `backend/scripts/expand-team-badges.sql` 開頭的註解裡
- 難度區間刻意拉開：**很容易拿到**的（人人有功練銅牌只要2人各拿50分、並肩作戰銅牌10場，大概
  第一兩次上課就能達成）到**需要長期累積或全員到位**的（小隊全勤傳說級數學上不可能在第10週之前
  拿到；人人有功練傳說級要求全組每個人都自己練到800分，沒辦法只靠一個強者扛全組；火力全開/閃電
  小隊傳說級門檻是個人版的4倍，需要長時間累積），確保整個10週期程裡都還有新獎章可以解鎖，不會
  第一週就把獎章全部領完
- **`backend/routes/badges.js` 的 `checkAndAwardTeamBadges()`**：原本只查小組平均分，這次補了
  5組新的聚合查詢（`game_logs` 累積場次/活躍天數/答對數/快速答對數/主題涵蓋，`game_sessions`+
  `study_start_date` 算連續活躍週數，逐組員算「單場大進步」次數加總，還有「跨門檻人數」查詢），
  新增 `longestConsecutiveInts()` 輔助函式（跟既有的 `longestConsecutiveDays()` 邏輯一樣，只是
  單位從「日期」換成「週數」）。「人人有功練」的「全員」判斷用 `memberIds.length` 動態比對，
  沒有寫死4人，不管小組實際有幾人都適用
- ⚠️ **「小隊全勤」依賴該班的 `classes.study_start_date`**——教師後台頂部「📅 研究開始日」要先
  設定，這個家族才算得出「第幾週」，沒設定的班級這個家族永遠不會觸發，這是設計上的必要依賴，
  不是 bug，正式開始跑實驗前記得提醒學姊設定
- 已用真實 HTTP 請求驗證過：拿 401 班「第 1 組」兩位真實學生實際登入、發起PK、答題、結算，
  確認第2位成員系統分跨過50分門檻的瞬間，「人人有功練」銅牌正確地讓全組4人（含另外2位還沒上場
  的組員）都拿到、「並肩作戰」銅牌正確地因為只有2場還沒到10場門檻而沒有誤發；測試完已經把這次
  產生的測試場次/獎章/分數都清乾淨、`study_start_date` 也還原回 `NULL`，沒有留下污染真實學生
  資料的痕跡
- ⚠️ **這次沒做的部分**：教材複核工作台（Claude Artifact）裡的獎章清單快照還停在68個舊數字，
  沒有主動重新整理成100個——之前那次是使用者明確要求才做的，這次沒有要求就不主動動它，之後如果
  要看新的共同獎章清單，可以再請我更新那份工作台

## 獎章牆改成「只顯示最高等級」＋新獎章 toast 改成排隊輪播並附上獲得條件（2026-09-23）

共同獎章擴增到 9 家族後，隔天就用真實測試帳號（S001）打了一場PK，一次撈出 **12 個家族同時擁有
2 個以上等級**（例如「主題探索家」銅銀金傳說 4 級一次全拿）——這證實了獎章數量變多之後，原本
「每個等級各自顯示成一張卡片」的設計會讓獎章牆/新獎章通知變得又亂又重複，使用者也提出同樣的
需求：**同一家族只顯示已拿到的最高等級**，而且**每次升級都要跳 toast、並且寫出達成的條件**。

- **`ProfileView.vue` 獎章牆**：`earnedBadges`／`lockedBadges` 兩個 computed 改成先照
  `badge_name` 分家族（`badgeFamilies`），每個家族只取「已拿到的最高等級」進已解鎖清單、
  「還沒拿到的下一個等級」進未解鎖清單——不會再出現同一個家族一次列出 3、4 張幾乎一樣的卡片。
  頂部「X / Y」計數也跟著改成「已解鎖家族數 / 家族總數」，不然視覺上看到的卡片數量會跟數字對不上
- **`HomeView.vue` 新獎章 toast**：原本是「掉出一張合併的 toast，寫『OOO 等 N 個』，其餘 N-1 個
  完全看不到內容」，改成**排隊輪播**——`toastQueue` 存放這次 `/badges/unacknowledged` 撈到的全部
  新獎章（依銅→銀→金→傳說排序，讓小朋友有「一路升級」的感覺），一次只顯示 `toastQueue[0]`，
  每張停留 3.2 秒後自動換下一張，右上角有「+N」提示還有幾張排隊中；每張 toast 都寫「🎉 {等級}
  獎章解鎖！」+ 獎章名稱 + 「達成條件：{condition_desc}」，不會再有任何一個新獎章的資訊被隱藏掉
- PK 結果頁（`PKResultView.vue`）的「獲得新獎章！」清單本來就有顯示每張獎章的
  `condition_desc`（上次 2026-09-22 補等級標籤時順便做的），這次沒有另外改，維持原本清單式的
  呈現（不是 toast），因為那裡本來就是「PK剛打完、正在看結果」的情境，持續顯示比轉瞬即逝的
  toast 更適合
- 已用真實 HTTP 請求驗證過：S001 打一場PK一次觸發16筆新獎章（含多個家族一次跨2-3級），
  `/badges/unacknowledged`／`/badges/user/:id` 回傳的欄位（`badge_tier`／`condition_desc`）
  都齊全，家族分組邏輯正確把「主題探索家」等12個一次多級的家族都收斂成只顯示最高級
- 這次沒有動後端——`checkAndAwardBadges`/`checkAndAwardTeamBadges` 本來就是「每個等級各自獨立
  判斷、各自寫進 `user_badges`」，這個資料層設計沒有問題（歷史紀錄本來就該留著每一級何時拿到），
  純粹是前端「怎麼呈現這些資料」的問題，所以只改了 `ProfileView.vue`／`HomeView.vue` 兩個檔案

## 獎章可點開看條件＋銅銀金傳說用不同顏色區分（2026-09-24）

老師（學姊）兩點建議：
1. **要讓學生知道怎麼獲得獎章**——在系統上秀出來，觸碰獎章時要能看到條件，才知道其他獎章怎麼解鎖
2. **銅／銀／金的獎章要變色區別**

- **`ProfileView.vue`**：獎章牆上每一張卡片（已解鎖／未解鎖、個人／小組共同）都能點（`role="button"`，
  也支援鍵盤 Enter，桌機滑鼠停留有 `title` 提示），點下去從底部滑出「獎章說明」彈窗
  （`detailFamily`），列出**這個家族每一級**的達成條件，標示 ✅已達成／🎯下一個目標／🔒，
  小組共同獎章另外註明「全組一起努力、達標時全組一起解鎖」。未解鎖清單原本只截前 6 個，
  這次拿掉截斷，所有還沒開始的家族都看得到、點得開；未解鎖卡片也補上等級標籤
- **顏色**：銅=古銅橘棕、銀=冷銀灰藍、金=亮黃（帶微光）、傳說=紫粉漸層（較強光暈），卡片底色/
  邊框＋實心等級標籤（`.badge-tier-label`）兩層都用同一套色，不用看邊框也分得出來。原本小組共同
  獎章卡片會用橘色漸層蓋掉等級色，已拿掉，改成等級色優先
- **`PKResultView.vue`**：等級小標籤改用同一套實心色（原本銀級偏橄欖色，跟金級分不太出來）
- **`HomeView.vue`**：首頁「我的獎章」小卡也套同一套等級顏色，並比照個人頁只留每個家族最高
  等級、停留有條件提示
- 純前端修改，後端沒動；已重新 build 通過，**沒有瀏覽器實機視覺確認**（這台機器沒有截圖工具），
  建議打開個人頁點幾張獎章、對照四種顏色看看

## 學姊「20260924系統修改部份.docx」逐項處理（2026-09-25）

學姊整理了一份含 6 張截圖的修改需求文件（`前測資料/20260924系統修改部份.docx`），逐項處理如下：

1. **獎章觸碰要秀出條件** — 2026-09-24 已做（見上一節），這次沒有再動。
2. **金銀銅要變色區別** — 2026-09-24 已做，這次沒有再動。
3. **「實驗組沒有共同獎章,只有個人獎章->改成共同獎章」**：對照截圖（`image2.png`）發現實驗組學生
   的獎章牆只顯示「⚡ 個人獎章」，完全看不到「🤝 小組共同獎章」這個分類存在（就算還沒拿到任何一個
   共同獎章，也應該讓學生知道有這個分類、知道怎麼解鎖）。`ProfileView.vue` 的「未解鎖」清單原本是
   個人／共同混在同一個 grid 裡不分類，這次比照「已解鎖」的做法拆成
   `lockedPersonalBadges`／`lockedTeamBadges` 兩個 computed、各自一個標題區塊（🤝 小組共同獎章・
   未解鎖），實驗組學生現在就算一個共同獎章都還沒拿到，也能在「未解鎖」看到全部 9 個共同獎章家族
   跟各自的達成條件
4. **「先拿掉此功能」**：對照截圖（`image3.png`）確認學姊指的是 `ProfileView.vue` 上還留著的
   「❤️ 社群互動」整塊（送出按讚/貼紙/留言、收到互動、收到的互動明細）——這是 2026-09-16 拿掉
   社群互評功能時**唯一沒清乾淨**的殘留頁面（CLAUDE.md 當時的紀錄本來寫「無害的殘留，不用特別清」，
   這次學姊明確要求拿掉，蓋過之前的判斷）。已整塊移除，連同 hero card 上的「❤️ 社群分」「🏆 總分」
   （social_score 永遠是0，加起來的總分沒有意義，一併拿掉，只留「⚡ 答題分數」）。純前端移除，
   後端 `users.likes_sent` 等欄位、`/users/:id/profile` 回傳內容都沒有動（比照 `help_requests`
   的處理方式，欄位留著但沒人顯示）
5. **請假的算法（團隊能量條）**：學姊給了明確公式跟算例——
   `團隊能量值 = 當週出席學生總積分 ÷ 當週出席學生人數`（範例：4人中1人缺席，(90+80+70)÷3=80，
   不是 90+80+70=240）。系統裡「團隊能量條」這個詞在 `PKResultView.vue` 小組能量條／
   `LeaderboardView.vue` 小組排行／`ScoreboardView.vue` 大字報三個畫面指的都是同一個底層數字
   （`group_realtime_scores` VIEW），改了會同時影響這三個畫面的顯示數字跟小組排名依據——這是
   刻意的，因為學姊給的是完整公式跟算例，不是含糊建議。做法：
   - `backend/scripts/add-attendance-aware-team-energy.sql` 重新定義 VIEW，**新增**
     `energy_score`（當天沒請假的組員平均分，全組都請假時給 0，避免除以0）跟 `present_count`
     兩個欄位，原本的 `total_score`／`member_count`（全組總分／全組人數，不排除請假）完全沒動，
     以後如果哪裡需要看不排除請假的原始總分還能用
   - 請假判斷沿用既有的 `users.absent_date`（教師後台「🏠 出席」按鈕在用的同一個欄位，只有
     「今天有沒有請假」單日欄位，沒有歷史紀錄表——`當週` 這個詞在這裡當「目前」解讀，不是另外
     做一套按週分割的歷史計分系統）
   - `game.js` 的 `/group-scores` 改成 `ORDER BY energy_score DESC`（原本是 `total_score`），
     一併回傳 `energy_score`／`present_count`
   - `LeaderboardView.vue`（排序＋顯示分數）、`ScoreboardView.vue`（大字報顯示分數）、
     `PKResultView.vue`（小組能量條顯示分數＋能量條寬度計算）三個畫面全部改讀 `energy_score`
   - 已用真實請求驗證過：把一位組員標記今天請假後，`energy_score` 正確排除他重算、
     `total_score` 完全不受影響，取消請假後正確還原
6. **「得到獎章時是否有一個大畫面?」**：原本只有小組共同獎章有全螢幕慶祝彈窗，個人獎章只安靜地
   列在頁面上的小卡片區塊，容易被忽略。`PKResultView.vue` 新增 `showPersonalBadgeModal`，
   結算頁載入時如果有新的個人獎章會先跳一個全螢幕慶祝彈窗（橘色主題，跟小組共同獎章的金色彈窗
   做出區隔），一次列出這場拿到的全部個人獎章（不逐張跳——一場PK常常一次拿到10幾張，逐張跳對
   小朋友來說太煩），清單做了捲動避免撐爆畫面。收下個人獎章彈窗後，才接著跳小組共同獎章彈窗
   （如果有的話），兩個彈窗不會同時疊在一起
7. **「組長是成績最好的那一位?」確認為是**：401/402 真實班級匯入時（2026-09-22）因為原始文件
   沒有明確指定組長，`is_leader` 全部留 0。這次回去重新對照學姊的異質性分組表，把每組「高先備
   (1人)」欄位對應到的學生設成組長——401 六組：蕭辰曦/陳羿蓁/林子安/黃若凝/蔡勻溱/簡羽偲；
   402 五個正式組：卓品丞/許沛倢/簡紹麒/古凱崴/馮楷傑（402 的「第6組(不記入)」沒有高中低先備
   角色，不設組長）。⚠️ 401 第4組「高先備」剛好是黃若凝（家長不同意、已標記中離的學生）——
   組長這個標記純粹是遊戲角色顯示（👑 皇冠圖示/「組長」標籤），不涉及額外資料蒐集，跟中離互不衝突，
   照學姊的規則一樣設成組長
8. **「班級會有自動登出功能?請小孩自行登出」**：確認為 Q&A，不是功能請求——系統目前的登出機制
   是首頁底部的「登出」按鈕，多位學生共用裝置時要學生自己記得按登出，沒有寫自動登出機制，
   這次沒有新增程式，維持現狀
9. **「滑鼠移到獎章上時要秀出如何解鎖字有點小和暗」**：對照截圖（`image5.png`）確認是「未解鎖」
   卡片下方的達成條件文字（`.badge-cond`）——字級從 10px 提到 12px、顏色從
   `rgba(255,255,255,.5)` 提到 `.85`，「未解鎖」標題／等級標籤／鎖頭圖示也一併調亮，不再刻意
   壓暗。另外原本「已解鎖」的獎章卡片只能用滑鼠原生的 `title` 提示（小小灰灰、無法調樣式）看到
   條件，改成自己畫的懸浮提示框（`.badge-hint`，滑鼠移過去或鍵盤 focus 都會顯示），內容是
   「🎯 下一級（銀級）：條件文字」——不是重複講已經達成的條件，而是告訴學生**再往上一級要幹嘛**，
   已經是傳說級的家族則顯示「🏆 已達最高等級！」

這份文件裡還附了另一批**三年級（301/302/303 班）家長同意書＋前後測成績**名單（`image1.png`，
跟 2026-09-22 匯入的 401/402/403 四年級名單是不同批學生）。原本因為文件沒說明這三班誰是實驗組/
對照組、也沒附分組表，向使用者確認過要不要匯入——**已確認 301/302/303 這批不用匯入系統**，
只是這批名單剛好也在同一份文件裡，不是這次系統修改的一部分。之後如果真的要用到這批學生，
再重新確認實驗組/對照組怎麼分、有沒有分組表，照 401/402/403 的 `seed-real-class-roster.js`
同一套流程匯入即可。

## ⚠️ 已知的設計缺口（尚未解決，交接時要知道）
1. ~~小組共同成就（social_team 徽章）結構性拿不到~~ **已解決（2026-08-04）**：社群互評接回來後，
   `social_team` 徽章（小組平均社群分跨門檻）現在真的可以被觸發了。
2. ~~教師後台的實驗組/對照組 UI 殘留~~ **已解決（2026-08-04）**：這些 UI 本來就不是殘留，是完整
   做好但沒有真實資料流過的功能，現在學生端有真的 `experiment_group` 閘控邏輯了，資料會是有意義的。
3. **`theme_id 13-16` 內容未經人工複核**（theme 11/12 已經解決，見下）：這批題目是使用者直接貼
   SQL 給 AI 匯入的，AI 沒有看過原始教材 PDF，只做了 schema/格式層面的檢查，內容本身（教材對應是否
   精確）建議找熟悉教材的人抽查。2026-08-05 補畫了這批題目裡 23 題 `image_choice` 題型缺的圖
   （原本 `image_url` 指向從沒存在過的 `.png` 檔，`/images/senior/` 資料夾原本根本不存在）。畫的是
   AI 手繪的簡易 SVG 插圖，**內容對不對（例如 earthquake drill 的 under.svg 畫的「球在椅子下面」
   是否真的對應教材原本要考的情境）沒有人核對過**。不過目前系統範圍已收斂到只開放 theme 11/12
   （見上面「Unit1/Unit2 內容跟權威教材對齊」段落），theme 13-16 這批暫時不會被學生看到，
   之後真的要開放這幾個單元時再補做這輪核對。
   ~~theme 11/12 內容未經人工複核~~ **已解決（2026-09-16）**：學姊提供了真正的權威教材原文
   （教科書 Unit1+2、補充繪本教材），逐字核對過現有單字表，抓到並修正 3 個問題（wolf 分類錯誤、
   rabbit/frog 不是真教材內容、21個教材有教但系統沒有的單字），這兩個單元現在的內容跟她的教材
   逐字對得起來，不是憑空匯入的。
4. **尚未部署到雲端**：`firebase.json` 已經把 `site` 改成 `pk-english-senior`，但這個 Firebase
   Hosting site **還沒有實際建立**（需要 `firebase login --reauth` 後跑
   `firebase hosting:sites:create pk-english-senior`）。Cloud Run 後端也還沒部署過。部署指令
   見下方。
5. **`theme_id 11-16` 的複核還沒真的做完**：做了一個複核用的 Claude Artifact 頁面（列出全部單字/
   題目/插圖，可以標記「沒問題／有問題」+留言，跟看的人即時同步），但學姊實際核對完了沒有還不確定，
   交接時記得追蹤這件事有沒有下文。2026-09-15 新增的 15 個單字/50 道題目（前測內容）答案有經過
   學姊的答案卷/詳解檔確認，信心比原本那批高，但重新設計過的題型（例如「一、三、六」從紙本的
   3圖選項改成給圖選字／純文字聽力）**沒有跟學姊確認過這樣改是否還合乎她要考的重點**，加上
   「四年級前測詳解.docx」七-1/七-2 兩題文字本身有誤（見上面「獎章系統改版」前的匯入說明段落），
   建議一起拿給學姊看過一輪。
6. ~~獎章改版還沒有真人實測~~ **部分解決（2026-09-16）**：用測試帳號打真實 API（登入→發起PK→
   答題→結算→badges/check）驗證過會正常發放（那場拿到10幾個獎章），但只測了 PK 答題觸發的那批，
   **`activity_logs` 那 3 種行為（單字複習/單字練習/聽力點擊）觸發的 12 個獎章這次沒有測到**——
   要實際去點 `WordReviewView`/`WordPracticeView`/`QuestionPracticeView`/`PKBattleView` 才會
   呼叫 `log-activity`，這次的測試腳本沒有涵蓋這幾個學習區頁面，之後要記得補測。

## 部署指令（尚未執行過，第一次部署前要先建 Firebase site）
```cmd
:: 只需要做一次：建立新的 Hosting site
firebase login --reauth
firebase hosting:sites:create pk-english-senior

:: 之後每次部署前端
cd frontend
npm run build
firebase deploy --only hosting

:: 部署後端（沿用同一個 Cloud SQL 執行個體，換 DB_NAME 指向獨立資料庫）
cd backend
gcloud run deploy pk-english-backend-senior --source . --region asia-east1 --allow-unauthenticated --clear-base-image --add-cloudsql-instances=project-f21ae14c-5812-494e-9ad:asia-east1:pk-english-db --set-env-vars="DB_HOST=/cloudsql/project-f21ae14c-5812-494e-9ad:asia-east1:pk-english-db,DB_PORT=3306,DB_USER=root,DB_PASSWORD=pkenglish2026,DB_NAME=pk_english_senior,JWT_SECRET=pk_english_senior_secret_2026"
```
部署後前端網址會是 `https://pk-english-senior.web.app`，`backend/server.js` 的 CORS 清單已經
先加好這個網址等它生效。

## 資料庫結構（15張表，比原系統多 `activity_logs`、`student_transfers` 兩張）
⚠️ 下面這份表格清單本身有點滯後——`words`/`questions`/`badges` 的筆數是 2026-08-01 剛建庫時的
數字，之後 theme 11-16 匯入、2026-09-13 獎章改版、2026-09-15 前測內容匯入都讓筆數變了，正確的
最新筆數請看上面對應的各個 ⚠️ 日期段落，這裡只列表結構本身。
- `classes`：班級
- `groups`：小組（保留字，SQL 要用反引號）
- `users`：學生/教師帳號
- `themes`：學習主題（1-10 是原系統教材，11-16 是學姊教材第三冊六單元，17-18 是從補充繪本教材
  拆出來的獨立單元——見「補充繪本教材拆成獨立單元」段落，**系統目前只開放 11、12、17、18**）
- `words`：單字（1-10 底下 167 個，11-16 底下 78 個，2026-09-16 拆出 17/18 後 11/12/17/18 這四個
  開放中的單元共 50 個，**系統目前只開放 11、12、17、18**）
- `questions`：題目（目前 364 題，1-10 底下 164 題，11-16 底下 200 題，`mcq`/`fill_blank`/
  `ordering`/`matching`/`listening`/`image_choice` 六種題型）
- `session_questions`：單場 PK 實際抽到的題目與題序
- `game_sessions`：PK 場次記錄
- `game_logs`：每題答題記錄
- `activity_logs`：**2026-09-13 新增**，記錄單字翻牌複習/單字選擇題練習/聽力發音點擊次數，
  給獎章系統用（見「獎章系統改版」段落）
- `student_transfers`：**2026-09-15 新增**，轉學生轉班紀錄（見「轉學生保留帳號機制」段落）
- `help_requests`：PK 呼救/搶救機制的求救紀錄，**2026-08-05 起功能已拿掉，表還在但不會再有新資料**
- `social_logs`：社群互動記錄表**還在**（schema 沒刪），但因為前端拿掉了 SocialModal，實際上
  不會再有新資料寫入
- `badges`：**2026-09-13 改版後 100 個**獎章定義（原本37個已整包報廢重種，見「獎章系統改版」段落）
- `user_badges`：學生獲得的獎章
- `group_realtime_scores`（VIEW，非表）：大字報用，即時計算每組總分/平均社群分/人數

## 後端 API 清單（跟原系統的差異處已標註）
```
/api/auth/register    POST - 註冊
/api/auth/login       POST - 登入
/api/game/my-group    GET  - 我的小組
/api/game/groups      GET  - 同班小組列表
/api/game/progress    GET  - 今日學習進度
/api/game/session/start    POST - 發起PK
/api/game/session/submit   POST - 提交答案
/api/game/session/:id/status  GET - 等待室Polling
/api/game/session/:id/result  GET - 最終成績
/api/game/session/:id/group-contribution GET - 小組貢獻度【新增】
/api/game/group-scores GET - 小組即時總分，大字報用【新增】
/api/game/leaderboard  GET - 排行榜資料
/api/questions/review  GET - 複習區單字
/api/questions/themes  GET - 主題清單
/api/questions/log-activity POST - 記錄單字複習/練習/聽力點擊次數，給獎章用【2026-09-13新增】
/api/social/interact   POST - 社群互動（路由還在，但 2026-09-16 拿掉社群互評後前端已經沒有地方會呼叫它）
/api/badges/check      POST - 觸發獎章檢查
/api/badges/unacknowledged GET - 首頁用，查有沒有還沒提醒過的新獎章
/api/badges/acknowledge POST - 標記獎章已提醒過
/api/badges/user/:id   GET  - 個人獎章（social_team 類會額外帶 teammates 欄位）【修改】
/api/users/:id/profile GET  - 個人頁資料
/api/users/:id/group-members GET - 同組組員名單
/api/teacher/dashboard GET  - 教師後台儀表板
/api/teacher/students/:userId/transfer PATCH - 轉學生轉班（僅限同一位教師底下）【2026-09-15新增】
/api/teacher/students/:userId/transfers GET - 查某學生的轉班歷史【2026-09-15新增】
/api/teacher/classes/:classId/study-start-date PATCH - 設定研究開始日，標記晚加入的轉學生【2026-09-15新增】
/api/teacher/students/:userId/withdraw PATCH - 標記/取消學生中離【2026-09-15新增】
```

## 測試帳號
2026-08-04 已建立測試資料（`backend/scripts/seed-test-accounts.js` 可以重新建教師+班級）：
- 教師 `T001` / `teacher123`，班級「測試班級」代碼 `ABC123`
- 學生 `S001`（實驗組，A組組長）/ `S002`（對照組，B組組長）/ `S003`（實驗組，A組組員），
  密碼分別是 `student123` / `test1234` / `test1234`
- 這個班級預設是 `control`，S001/S003 是**個人覆寫**成實驗組——這組帳號是拿來測試「個人覆寫」
  這個功能本身用的，不是「兩班分開跑」的示範

⚠️ **2026-09-16 補充**：跟學姊確認過，正式跑實驗時實驗組/對照組會是**分開的班級**，不是同一班
用個人覆寫混著跑（個人覆寫功能還是留著，用在「這個學生要轉組別」之類的例外情況）。補了
`backend/scripts/seed-separate-arm-classes.js`，建兩個乾淨的示範班級：
- 「三年A班（實驗組）」代碼 `EXPT01`，2組×3人：`E01`~`E06`（`E01`/`E04` 是組長）
- 「三年B班（對照組）」代碼 `CTRT01`，1組6人（對照組沒有小組概念，分組純粹滿足資料庫外鍵，
  學生完全看不到）：`C01`~`C06`
- 學生密碼都是 `test1234`，教師帳號沿用同一個 `T001`/`teacher123`
- 已用真實請求驗證過：`EXPT01` 的小組排行只看得到自己班的 甲組/乙組，不會跟 `ABC123`（舊測試班）
  的組別混在一起——排行本來就是用 `class_id` 分開查的，班級一分開，排行自然就分開，不需要另外
  加任何隔離邏輯
- `classes.max_group_size` 只是「一鍵隨機分組」功能用的上限，不影響手動指定分組，每個班級可以
  各自設不同的值（目前 `EXPT01` 設 4、`CTRT01` 設 6，都只是示範用的預設值，正式帳號可以另外調）
- 正式上課前記得把 `ABC123`/`EXPT01`/`CTRT01` 這些測試班級全部清掉，不要跟學姊真正的班級資料
  混在一起

⚠️ 用 curl 或終端機直接測試中文暱稱的 API 時要注意：Windows Git Bash 的終端機編碼可能不是
UTF-8，直接在命令列打中文字串傳給後端會存成亂碼（實測發生過），改用 Node 寫小段 script 用
`http.request` 送 request body 比較保險。

## ⚠️ 真實班級名單已匯入（2026-09-22）

上面「測試帳號」那節都是**假資料**，這節開始是**真的學生**——學姊提供
`前測資料/四年級家長同意書+前後測成績(1).docx`（家長同意書簽署狀況＋前測分數＋她自己排好的
異質性分組表），已經照裡面的名單建好帳號、灌好分組，**這些是真的三、四年級小朋友的真實姓名**，
交接/備份/截圖分享時要當一般個資處理，不要隨便外流。

- **401 班、402 班＝實驗組，403 班＝對照組**（跟使用者確認過的分法），三班各自是獨立的
  `classes` 記錄（`class_id` 15/16/17，代碼 `C0401`/`C0402`/`C0403`），教師沿用既有的 `T001`
  帳號，沒有另外幫學姊建專屬教師登入
- **401/402 的小組直接照學姊自己的「異質性分組表」建**（每組 1高先備+2中先備+1低先備，共6組，
  每組4人）；403（對照組）沒有分組表，跟 `seed-separate-arm-classes.js` 的 `CTRT01` 一樣，
  全班放同一個佔位小組（「對照組（不分小組）」），對照組本來就不需要真的組別
- **家長「不同意」的 4 位學生**（401：羅哲宇 座號5、黃若凝 座號24；402：陳翊綸 座號7、
  嚴子宸 座號18）：**建了帳號，但直接標記中離**（`withdrawn_at` 設成建立當下的時間）——沿用
  既有的中離機制，讓他們可以正常登入、正常玩遊戲，但小組共同總分/共同獎章會把他們排除在外
  重算，不會因為家長不同意研究分析卻拖累或墊高其他同意組員的團隊數據。跟使用者確認過這個
  處理方式，選項是三選一（建帳號但標記中離 / 完全不建帳號 / 正常建帳號不標記），選的是
  第一個
  - ⚠️ 402 班學姊自己的分組表把這 2 位不同意的學生，跟另外 2 位「同意」的學生（韓予喬 座號24、
    蔡秉宸 座號14）一起歸成「第6組(不記入)」；401 班的分組表則是直接把 2 位不同意的學生編進
    正常的第3組/第4組，沒有另外歸類。這次**忠實照學姊文件的分組結構建組**（401 的 3/4組維持
    原樣、402 真的建出一個「第 6 組(不記入)」），但中離標記只精準蓋在那 4 位「家長真的勾不同意」
    的學生身上——韓予喬、蔡秉宸雖然被學姊放進「不記入」那組，但家長是同意的，所以沒有標記中離，
    正常算進研究分析
  - 前測分數（docx 裡的「前測」欄）**只拿來確認分組依據，沒有寫進資料庫任何欄位**——系統裡沒有
    對應「紙本前測分數」的欄位，這批分數本質上跟系統的 `system_score`（PK 對戰得分）是不同的
    東西，硬塞進某個分數欄位會混淆兩種資料，這次刻意不做
- **學號規則**：文件裡只有座號、沒有真正的校務學號，用「班級+兩位數座號」湊成系統登入帳號
  （例如 401 班座號 1 號 → `40101`，402 班座號 24 號 → `40224`，403 班座號 1 號 → `40301`），
  跟真實學號無關，純粹是這個系統登入用的帳號代稱
- **密碼統一先設 `hero1234`**（8碼、英數混合，符合系統密碼規則），方便老師直接口頭公告全班，
  之後要不要換成個別密碼可以自己調整
- 匯入用的原始名單/分組/同意狀態資料存在 `backend/scripts/real-roster-401-402-403.json`
  （從 docx 表格解析出來的結構化資料），實際寫入資料庫的腳本是
  `backend/scripts/seed-real-class-roster.js`
- 已用真實 HTTP 請求驗證過：401/402/403 三班學生都能正常登入、`experiment_group` 正確對應
  班級預設值、401/402 每組人數都是4人、403 全班24人在同一個佔位小組、中離學生（羅哲宇）能正常
  登入但標記維持中離狀態
- ⚠️ **這次沒做的部分**：401/402 分組表裡標出的「高先備/中先備A/中先備B/低先備」角色、每組平均
  分數這些資訊只用來確認分組本身，沒有另外存進資料庫（`groups` 表沒有對應欄位可以記錄這個），
  之後如果要分析先備能力跟遊戲表現的關聯，要另外設計怎麼存這份對照關係；也沒有指定任何組長
  （`is_leader` 全部是 0），文件裡沒有明確指定誰是組長，教師後台「組別管理」頁可以之後手動設定
