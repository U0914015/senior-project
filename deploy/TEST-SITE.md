# 學姊測試站

狀態：已部署，已通過線上 API 流程與網站資源檢查。

- 網站：https://pk-english-senior.vercel.app
- 後端：https://pk-english-senior-api.vercel.app
- 管理帳號：lily414016@gmail.com
- 前後端：該帳號的 Vercel 專案 pk-english-senior、pk-english-senior-api。
- 資料庫：使用者建立的 Aiven MySQL mysql-57d9070 / defaultdb。
- 原本本機 pk_english_senior 與原 Cloud Run / Cloud SQL 沒有被修改。

## 給學姊的測試帳號

| 登入身分 | 帳號 | 密碼 |
| --- | --- | --- |
| 教師 | T001 | teacher123 |
| 實驗組學生 | E01–E06 | test1234 |
| 對照組學生 | C01–C06 | test1234 |

登入頁請先選對學生／教師身分。
教師帳號可以看到兩個測試班級、四個小組。
實驗組班級代碼 EXPT01；對照組 CTRT01。
建議學姊先用 E01 或 C01 從頭測試；E06、C06 已有部署驗證所產生的答題、分數與獎章紀錄。

## 建議檢核流程

1. 用 E01 登入，確認單元、單字翻牌與練習題內容。
2. 進行單字、句型、閱讀挑戰，確認圖片／聽力文字、答案與解說是否符合教材。
3. 查看挑戰結果、個人頁與獎章，再用 C01 比較另一種學生流程。
4. 切換教師 T001，查看班級、小組、學生紀錄與大字報。

教材正確性仍由學姊核對；此次驗證確認系統與資料可以運作，未替代教材內容審查。

## 已匯入與驗證

- 18 個主題、245 個單字、364 道題目、68 個獎章定義。
- 新建 13 個測試帳號、2 個班級、4 個小組，不含既有學生作答／社群紀錄。
- 學生畫面按現有程式設定顯示 theme_id 11、12、17、18。
- 教師、實驗組與對照組登入成功。
- 實驗組三種挑戰與對照組單字挑戰完成；續答、判分、成績儲存、獎章 API 正常。
- 個人資料、獎章牆、排行、兩班教師儀表板與小組成績 API 正常。
- 46 張教材圖片皆包含在前端成品。
- 登入頁、JavaScript/CSS 與直接開啟內頁正常。
- 未完成瀏覽器視覺逐頁檢查，因瀏覽器控制工具無法啟動。

## 後續維護

Vercel 後端使用 production 私密環境變數：DB_HOST、DB_PORT、DB_USER、DB_PASSWORD、DB_NAME、DB_SSL、DB_SSL_CA、DB_CONNECTION_LIMIT、JWT_SECRET。不要將它們放入前端或公開程式碼。

本機 deploy/private 保存教材快照、CA、連線設定與驗證結果，已加入忽略清單，不可上傳為網站內容。

重新部署時，需將最新後端程式同步到 deploy/vercel-backend；前端以 VITE_API_URL=/api 建置後同步到 deploy/vercel-frontend，保留其 vercel.json 的 API 轉送與內頁 fallback。

initialize-demo.cjs 僅供空白資料庫首次初始化；目前雲端已完成匯入，不要再次初始化或清空。

## 2026-09-23 更新進度

- 後端已部署：dpl_7G2raZdhKPiCS9M4dT5aGbUuKofr。
- 雲端教材已同步：5 筆單字、3 筆題目修正，新增 32 個共同獎章（共 100 個）。同步前的教材備份位於 deploy/private/pre-update-reference-20260923.json。
- 保留現有帳號與作答紀錄；未匯入本機的真實班級名單，等待使用者確認範圍。
- 線上 API 驗證通過：教師登入與兩班儀表板、E06 三種挑戰、C06 單字挑戰、續答、判分、儲存成績、獎章、個人頁與排行。驗證在 E06/C06 新增測試作答紀錄。
- 前端已以 VITE_API_URL=/api 建置並同步至部署資料夾，50 張教材圖片皆齊全。
- 使用者重新完成 Vercel 登入後，前端已正式發布：dpl_Cz8rZpVnn1JA91FpC9bSQ8sdgJ7r。已確認正式網址載入最新建置檔案，內頁連結、API 轉送、E01／C01／T001 登入與資料讀取皆通過。


### 再次更新部署（2026-09-23）

- 前端：dpl_Bw9hYG2vSop4bAfTihXKdrnZX8ST；後端：dpl_D7i6qGRcVJXiZQ5jYxMjuGUMhtjR，皆已正式發布。
- 最新前端建置、正式網址版本比對、內頁路由、E01/C01/T001 登入與資料讀取皆通過。
- 教材四表與雲端一致，未修改資料庫內容，保留線上帳號與作答紀錄。
