# 毛孩樂園｜寵物住宿與美容管理系統

毛孩樂園是一套整合會員預約、寵物資料、住宿房位、美容排程、照護回報、櫃檯營運與系統管理的全端管理系統。

系統依照登入角色提供不同工作介面，讓會員、店務人員、美容師、寵物照護師與系統管理員可以在同一平台完成各自的工作。

## 線上展示

- 前端網站：[https://pet-hotel-system-oo4k.vercel.app](https://pet-hotel-system-oo4k.vercel.app)
- 後端健康檢查：[https://pet-hotel-system.onrender.com/api/health](https://pet-hotel-system.onrender.com/api/health)

> Render 免費服務休眠後，第一次開啟 API 可能需要等待一段時間。

## 開發目的

傳統寵物旅館與美容店常透過電話、紙本或通訊軟體管理預約，容易出現房位重複、交班資訊遺漏、照護紀錄分散，以及會員無法即時掌握毛孩狀況等問題。

本系統希望將以下流程集中管理：

- 顧客從了解服務、建立寵物資料到完成預約。
- 櫃檯從確認訂單、安排位置到入住、退房與付款。
- 美容師與照護師從查看排程到完成回報。
- 系統管理員從帳號權限、服務價格到營運統計。

## 系統特色

- 住宿與美容服務線上預約
- 寵物基本資料、健康資訊與照片管理
- 房型、美容時段與剩餘名額檢查
- 訂單、付款、取消、評價與歷史紀錄
- 預約前再次確認與逾期自動取消
- 站內通知、照護回報、異常通知與已讀管理
- 櫃檯入住、退房、房位安排、聯絡紀錄與交班備註
- 美容師與照護師專屬工作台
- 員工上下班打卡與班表管理
- 系統管理員帳號、價格、營業資訊與通知規則管理
- 營運統計、圖表、CSV 匯出與系統備份
- 角色權限控管與 JWT 登入驗證

## 系統資料流程

```text
React 前端
   │
   │ HTTPS / JSON / JWT
   ▼
Flask REST API
   │
   ├── 身分驗證與角色權限
   ├── 預約、房位與時段規則
   ├── 通知、照護與稽核紀錄
   ▼
SQLite 資料庫
```

## 使用角色

| 角色 | 登入後介面 | 主要功能 |
| --- | --- | --- |
| 會員 `member` | 會員中心 | 管理寵物、預約住宿或美容、付款、取消、確認預約、查看通知與照護回報、服務評價 |
| 店務人員 `staff` | 店務管理後台 | 今日營運、會員查詢、現場建單、安排房位與美容台、入住退房、付款、聯絡與交班 |
| 美容師 `groomer` | 照護工作台 | 查看美容排程、更新狀態、填寫服務回報、異常通知、上傳完成照片、打卡 |
| 寵物照護師 `caregiver` | 照護工作台 | 查看住宿照護排程、餵食與健康資訊、照護紀錄、異常通知、完成照片、打卡 |
| 系統管理員 `admin` | 系統管理後台 | 管理員工帳號、權限、價格、房位、美容台、班表、營業時間、通知規則與營運資料 |

## 各角色操作流程

### 會員

1. 註冊或登入會員帳號。
2. 建立寵物資料與健康注意事項。
3. 選擇住宿或美容服務。
4. 選擇寵物、房型或美容時段。
5. 確認預約摘要與預估金額。
6. 送出預約並等待店家確認。
7. 在訂單與通知中心查看進度、付款及照護回報。
8. 服務完成後可留下評分與評論。

### 店務人員

1. 查看今日預約、入住、退房、美容與待付款項目。
2. 搜尋既有會員或協助現場顧客建立訂單。
3. 確認訂單並安排住宿房位、美容台與服務時段。
4. 辦理入住或退房，更新付款與訂單狀態。
5. 記錄電話、LINE 等聯絡內容。
6. 建立交班備註，讓下一個班次繼續追蹤。

### 美容師與寵物照護師

1. 打卡上班並查看當日排程。
2. 展開訂單查看寵物資料、健康資訊與家長備註。
3. 更新服務狀態與新增照護紀錄。
4. 發現異常時通知家長。
5. 完成服務後上傳照片與回報內容。
6. 工作結束後打卡下班。

### 系統管理員

1. 查看訂單、會員、營收與服務分布統計。
2. 建立或調整員工帳號與角色。
3. 管理住宿價格、美容價格與加購服務。
4. 設定房位、美容台、美容時段與員工班表。
5. 管理營業時間、公休日與通知規則。
6. 匯出訂單、會員及營收資料，或下載系統備份。

## 預約與訂單狀態

常用訂單狀態如下：

```text
待確認 → 已確認 → 待會員確認 → 已入住／進行中 → 已完成
                                 └────────────→ 已取消
```

- 店家可將新預約由「待確認」更新為「已確認」。
- 系統會依通知設定，在預約前產生再次確認通知。
- 會員選擇不保留預約時，訂單會取消並釋出原房位或時段。
- 預約日期已過但仍未進入服務流程的訂單，系統會自動取消。
- 已完成與已取消訂單會收納在歷史紀錄中。

## 技術架構

### 前端

- React 18
- TypeScript
- Vite 6
- Tailwind CSS 4
- React Router 7
- Lucide React
- Sonner

### 後端

- Python 3.11
- Flask 3
- Flask-SQLAlchemy
- SQLite
- JWT
- Flask-CORS

### 部署

- 前端：Vercel
- 後端：Render
- 原始碼：GitHub

## 專案結構

```text
pet-hotel-system/
├── pet-care-system/                  # React 前端
│   ├── src/
│   │   ├── components/               # 共用元件與權限路由
│   │   ├── contexts/                 # 登入狀態
│   │   ├── pages/                    # 公開頁、會員端與管理介面
│   │   ├── App.tsx                   # 前端路由
│   │   ├── config.ts                 # API 網址設定
│   │   └── systemSettings.ts         # 前端預設營運設定
│   ├── public/                       # 圖片等靜態資源
│   ├── .env.example
│   ├── package.json
│   └── vercel.json
├── pet-care-backend/
│   └── pet-care-backend/
│       ├── app.py                    # Flask API、資料模型與初始化
│       ├── requirements.txt
│       ├── Procfile
│       └── runtime.txt
├── DEPLOYMENT.md                     # Vercel 與 Render 部署說明
├── render.yaml
└── README.md
```

## 測試帳號

| 角色 | Email | 密碼 |
| --- | --- | --- |
| 會員 | `demo@test.com` | `demo123` |
| 店務人員 | `staff@test.com` | `staff123` |
| 美容師 | `groomer@test.com` | `groomer123` |
| 寵物照護師 | `caregiver@test.com` | `care123` |
| 系統管理員 | `admin@test.com` | `admin123` |

> 測試帳號僅供展示。正式環境請更換密碼並設定安全的 `PET_CARE_SECRET_KEY`。

## 本機執行

### 1. 取得專案

```bash
git clone https://github.com/Tiffany0219/pet-hotel-system.git
cd pet-hotel-system
```

### 2. 啟動後端

macOS / Linux：

```bash
cd pet-care-backend/pet-care-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Windows PowerShell：

```powershell
cd pet-care-backend/pet-care-backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

後端預設網址：

```text
http://127.0.0.1:5050
```

健康檢查：

```text
http://127.0.0.1:5050/api/health
```

### 3. 設定並啟動前端

另開一個終端機：

```bash
cd pet-care-system
cp .env.example .env
npm install
npm run dev
```

`.env` 預設內容：

```env
VITE_API_BASE_URL=http://127.0.0.1:5050/api
```

前端預設網址：

```text
http://127.0.0.1:5181
```

如果連接埠已被占用，Vite 會自動嘗試下一個可用連接埠。

## 環境變數

### 前端

| 變數 | 用途 | 範例 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Flask API 基底網址 | `http://127.0.0.1:5050/api` |

### 後端

| 變數 | 用途 | 範例 |
| --- | --- | --- |
| `PET_CARE_SECRET_KEY` | JWT 簽章密鑰 | 一段長且隨機的字串 |
| `FRONTEND_ORIGINS` | 允許的前端 CORS 網域，可用逗號分隔 | `http://localhost:5181,https://example.vercel.app` |
| `PORT` | 後端監聽連接埠，由 Render 自動提供 | `5050` |
| `FLASK_DEBUG` | 是否啟用 Flask Debug | `1` |

## 建置與檢查

前端型別檢查：

```bash
cd pet-care-system
npx tsc --noEmit
```

前端正式建置：

```bash
npm run build
```

後端語法檢查：

```bash
cd pet-care-backend/pet-care-backend
.venv/bin/python -m py_compile app.py
```

## 部署摘要

### Render 後端

```text
Root Directory: pet-care-backend/pet-care-backend
Build Command: pip install -r requirements.txt
Start Command: python3 app.py
```

Render 環境變數：

```text
PET_CARE_SECRET_KEY=安全的隨機字串
FRONTEND_ORIGINS=https://你的-vercel-網址
```

### Vercel 前端

```text
Root Directory: pet-care-system
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Vercel 環境變數：

```text
VITE_API_BASE_URL=https://你的-render-網址/api
```

完整步驟請參考 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 資料儲存與注意事項

- 前端只在 `localStorage` 儲存 JWT Token。
- 會員、寵物、訂單、通知、照護紀錄、班表與設定由 Flask API 寫入 SQLite。
- 本機資料庫位於後端的 `instance/pet_care.db`。
- SQLite 適合課堂展示與單機專案。
- Render 的暫時性檔案系統可能在重新部署後重建資料；正式環境建議改用 PostgreSQL 或掛載 Persistent Disk。
- 目前的付款功能為系統流程模擬，沒有串接第三方金流。
- 上傳圖片目前以 Data URL 儲存，正式環境建議改用雲端物件儲存服務。

## 常見問題

### `Address already in use`

表示連接埠已被其他程式使用。可以找出占用程式：

```bash
lsof -i :5050
```

或使用其他連接埠：

```bash
PORT=5051 python app.py
```

### 找不到 `app.py`

請確認目前位於正確資料夾：

```bash
cd pet-care-backend/pet-care-backend
python app.py
```

### 前端顯示後端未啟動

1. 確認 `/api/health` 可以開啟。
2. 確認前端 `.env` 的 `VITE_API_BASE_URL` 正確。
3. 修改 `.env` 後重新啟動 `npm run dev`。
4. 部署時確認 Render 的 `FRONTEND_ORIGINS` 包含 Vercel 網址。

### Vercel 子頁重新整理後 404

專案已提供 `pet-care-system/vercel.json`，請確認 Vercel 的 Root Directory 設為 `pet-care-system`。

## 延伸文件

- [前端說明](pet-care-system/README.md)
- [後端 API 說明](pet-care-backend/pet-care-backend/README.md)
- [部署說明](DEPLOYMENT.md)
