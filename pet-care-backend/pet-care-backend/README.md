# 毛孩樂園後端 API（Flask + SQLite）

這是一個可搭配 React 前端的後端系統，提供會員、寵物、預約、訂單、付款、評價與管理員後台功能。

## 功能

- 會員註冊 / 登入
- JWT Token 驗證
- 寵物資料 CRUD
- 建立預約訂單
- 查詢我的訂單
- 取消預約
- 模擬付款
- 撰寫評價
- 管理員查詢全部訂單、更新訂單狀態
- 管理員查看今日房況、營收、會員與寵物統計
- 管理員安排住宿房位、美容台與美容時段
- 管理員可維護住宿房位、美容台與美容時段選項
- 安排時會檢查房位與美容台時段是否衝突
- 管理員可登記未付款、已付訂金、已付款與付款方式
- 管理員新增照護紀錄，並可控制是否顯示給客戶
- 會員可查看自己訂單的公開照護紀錄
- 管理員可查看訂單操作紀錄，包含狀態、安排、付款與照護紀錄異動

## 安裝與執行

```bash
cd pet-care-backend/pet-care-backend
python3 -m venv .venv
```

Windows PowerShell：

```bash
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

macOS / Linux：

```bash
source .venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

正式使用前建議設定 JWT secret：

```bash
export PET_CARE_SECRET_KEY="請換成一段夠長的隨機字串"
python3 app.py
```

預設會啟動在：

```txt
http://127.0.0.1:5050
```

第一次啟動會自動建立 `pet_care.db` SQLite 資料庫，並建立測試帳號。

一般會員：

```txt
Email: demo@test.com
Password: demo123
```

管理員：

```txt
Email: admin@test.com
Password: admin123
```

## 前端串接方式

前端已改為呼叫 API。

登入後會取得 token，請存到 localStorage：

```ts
localStorage.setItem("token", data.token);
```

之後呼叫需要登入的 API 時加上：

```ts
Authorization: `Bearer ${localStorage.getItem("token")}`
```

## API 快速整理

### Auth

- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`

### Pets

- GET `/api/pets`
- POST `/api/pets`
- PUT `/api/pets/:id`
- DELETE `/api/pets/:id`

### Orders

- GET `/api/orders`
- POST `/api/orders`
- PATCH `/api/orders/:id/cancel`
- PATCH `/api/orders/:id/pay`
- POST `/api/orders/:id/review`
- GET `/api/orders/:id/care-logs`

### Admin

- GET `/api/admin/stats`
- GET `/api/admin/orders`
- GET `/api/admin/assignments/options`
- PATCH `/api/admin/assignments/options`
- PATCH `/api/admin/orders/:id/status`
- PATCH `/api/admin/orders/:id/assignment`
- PATCH `/api/admin/orders/:id/payment`
- GET `/api/admin/orders/:id/audit-logs`
- GET `/api/admin/orders/:id/care-logs`
- POST `/api/admin/orders/:id/care-logs`
