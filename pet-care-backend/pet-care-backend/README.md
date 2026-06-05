# 毛孩樂園後端 API（Flask + SQLite）

這是一個可搭配 React 前端的後端系統，提供會員、寵物、預約、訂單、付款、評價與店務管理後台功能。

## 功能

- 會員註冊 / 登入
- JWT Token 驗證
- 寵物資料 CRUD
- 寵物健康資料欄位：過敏、疾病 / 用藥、疫苗日期、獸醫院與緊急聯絡人
- 建立預約訂單
- 預約加購服務與加購金額計算
- 查詢我的訂單
- 取消預約
- 模擬付款
- 撰寫評價
- 店務人員查詢全部訂單、更新訂單狀態
- 店務人員查看今日房況、營收、會員與寵物統計
- 店務人員安排住宿房位、美容台與美容時段
- 系統管理員可維護員工帳號、服務價格、住宿房位、美容台、營業班表與通知規則
- 安排時會檢查房位與美容台時段是否衝突
- 店務人員可登記未付款、已付訂金、已付款與付款方式
- 店務人員新增照護紀錄，並可控制是否顯示給客戶
- 會員可查看自己訂單的公開照護紀錄
- 店務人員可查看訂單操作紀錄，包含狀態、安排、付款與照護紀錄異動
- 會員通知中心與通知已讀功能
- 預約前幾天自動產生會員確認通知，會員確認後預約才維持成立；若會員取消，訂單會取消並釋出原本安排的位置
- 員工上班 / 下班打卡紀錄
- 美容師與寵物照護師工作排程查詢
- 美容師與寵物照護師可更新服務狀態、新增服務回報、異常通知與完成照片
- 系統管理員可匯出營運資料，並管理員工班表

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

店務人員：

```txt
Email: staff@test.com
Password: staff123
```

美容師：

```txt
Email: groomer@test.com
Password: groomer123
```

寵物照護師：

```txt
Email: caregiver@test.com
Password: care123
```

系統管理員：

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
- PATCH `/api/orders/:id/reconfirm`
- PATCH `/api/orders/:id/pay`
- POST `/api/orders/:id/review`
- GET `/api/orders/:id/care-logs`
- GET `/api/orders/:id`

### Admin

- GET `/api/admin/stats`
- GET `/api/admin/orders`
- GET `/api/admin/system/users`
- POST `/api/admin/system/users`
- PATCH `/api/admin/system/users/:id`
- DELETE `/api/admin/system/users/:id`
- GET `/api/admin/system/service-catalog`
- PATCH `/api/admin/system/service-catalog`
- GET `/api/admin/system/business-settings`
- PATCH `/api/admin/system/business-settings`
- GET `/api/admin/system/notification-settings`
- PATCH `/api/admin/system/notification-settings`
- GET `/api/admin/assignments/options`
- PATCH `/api/admin/assignments/options`
- PATCH `/api/admin/orders/:id/status`
- PATCH `/api/admin/orders/:id/assignment`
- PATCH `/api/admin/orders/:id/payment`
- GET `/api/admin/orders/:id/audit-logs`
- GET `/api/admin/orders/:id/care-logs`
- POST `/api/admin/orders/:id/care-logs`

### Staff / Worker

- GET `/api/staff/attendance/today`
- POST `/api/staff/attendance/clock-in`
- POST `/api/staff/attendance/clock-out`
- GET `/api/worker/schedule`
- PATCH `/api/worker/orders/:id/status`
- POST `/api/worker/orders/:id/care-logs`

### Notifications

- GET `/api/notifications`
- PATCH `/api/notifications/:id/read`
- PATCH `/api/notifications/read-all`

### Public

- GET `/api/public/system-settings`
- GET `/api/availability/rooms`
- GET `/api/availability/grooming`
