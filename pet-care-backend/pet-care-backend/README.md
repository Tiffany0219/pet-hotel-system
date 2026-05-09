# 毛孩樂園後端 API（Flask + SQLite）

這是一個可搭配 React 前端的後端系統，提供會員、寵物、預約、訂單、付款與評價功能。

## 功能

- 會員註冊 / 登入
- JWT Token 驗證
- 寵物資料 CRUD
- 建立預約訂單
- 查詢我的訂單
- 取消預約
- 模擬付款
- 模擬訂單狀態更新
- 撰寫評價

## 安裝與執行

```bash
cd pet-care-backend
python -m venv .venv
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
python app.py
```

預設會啟動在：

```txt
http://127.0.0.1:5000
```

第一次啟動會自動建立 `pet_care.db` SQLite 資料庫，並建立測試帳號：

```txt
Email: demo@test.com
Password: demo123
```

## 前端串接方式

前端請把 localStorage 讀寫資料的地方改成呼叫 API。

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
- PATCH `/api/orders/:id/status`
- POST `/api/orders/:id/review`
