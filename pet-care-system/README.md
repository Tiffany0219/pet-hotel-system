# 毛孩樂園｜寵物住宿與美容預約系統

這是一個以 React + Vite + Tailwind CSS 製作的寵物住宿與美容管理系統，搭配 Flask + SQLite 後端 API 使用。

## 功能

- 首頁品牌介紹
- 服務項目瀏覽
- 住宿房型瀏覽
- 美容方案瀏覽
- 分店資訊瀏覽
- 會員登入 / 註冊
- 會員中心
- 寵物資料新增、編輯、刪除
- 線上預約住宿或美容服務
- 我的訂單列表
- 前台 / 店務端預約狀態自動同步
- 模擬付款
- 服務評價
- 店務管理後台：今日工作台、房況管理、訂單查詢、營收與會員統計
- 系統管理員可控管營運設定，例如員工帳號、服務價格、房位、美容台、營業班表與通知規則
- 今日工作台只顯示待確認、今日入住 / 退房、今日美容與進行中服務
- 訂單查詢預設只顯示最近 10 筆，可用搜尋與篩選查看歷史訂單
- 店務人員可為住宿訂單安排房位，為美容訂單安排美容台與時段
- 系統管理員可在營運設定維護員工帳號、服務價格、可用房位、美容台與美容時段
- 系統會檢查同一房位住宿期間、同一美容台時段不可重複安排
- 店務端預約詳情：查看客戶資訊、預約內容與寵物照護資料
- 店務端可紀錄付款狀態、付款方式、訂金與尾款
- 店務端可新增照護紀錄 / 店家回報，並選擇是否顯示給客戶
- 店務端可查看訂單狀態、安排、付款與照護紀錄的操作紀錄
- 前台會員可在訂單中查看店家公開的照護回報
- 會員端右上角通知鈴鐺，可查看店家回報與系統通知，已讀後會從鈴鐺清單消失
- 美容師與寵物照護師有專屬工作台，可查看排程、打卡、回報異常與完成服務
- 美容師與寵物照護師的訂單卡片可收合，完成後可上傳照片給家長查看
- 櫃檯、店務人員、美容師與照護師皆支援上班 / 下班打卡紀錄
- 前台取消預約與刪除寵物使用系統內確認視窗，不再跳出瀏覽器原生提示

## 測試帳號

一般會員：

- Email：demo@test.com
- Password：demo123

店務人員：

- Email：staff@test.com
- Password：staff123

美容師：

- Email：groomer@test.com
- Password：groomer123

寵物照護師：

- Email：caregiver@test.com
- Password：care123

系統管理員：

- Email：admin@test.com
- Password：admin123

登入後會依帳號角色自動導向：

- 一般會員：`/dashboard`
- 店務人員：`/admin`
- 美容師：`/workbench`
- 寵物照護師：`/workbench`
- 系統管理員：`/admin`

## 執行方式

請先啟動後端 API：

```bash
cd ../pet-care-backend/pet-care-backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python app.py
```

後端預設會啟動在：

```bash
http://127.0.0.1:5050
```

接著啟動前端：

```bash
npm install
npm run dev
```

如果未來後端 API 不在 `http://127.0.0.1:5050/api`，可複製 `.env.example` 成 `.env`，並調整：

```bash
VITE_API_BASE_URL=http://你的後端網址/api
```

接著打開終端機顯示的本機網址，例如：

```bash
http://127.0.0.1:5181
```

## 資料儲存

會員、寵物、訂單、付款與評價資料由 Flask API 寫入 SQLite 資料庫。前端只會在 `localStorage` 保存登入用的 JWT token。
