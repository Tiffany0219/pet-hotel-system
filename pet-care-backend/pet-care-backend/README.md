# 毛孩樂園後端 API

毛孩樂園後端使用 Flask、SQLAlchemy、SQLite 與 JWT，提供會員、寵物、預約、付款、通知、照護、員工排程與系統管理 API。

## 線上 API

- Base URL：`https://pet-hotel-system.onrender.com/api`
- 健康檢查：[https://pet-hotel-system.onrender.com/api/health](https://pet-hotel-system.onrender.com/api/health)

## 技術

- Python 3.11
- Flask 3
- Flask-SQLAlchemy
- SQLite
- PyJWT
- Flask-CORS
- Werkzeug
- Gunicorn

## 核心資料模型

| 模型 | 用途 |
| --- | --- |
| `User` | 會員與員工帳號、角色、聯絡資料 |
| `Pet` | 寵物基本資料、照片與健康資訊 |
| `Order` | 住宿／美容預約、安排、付款、評價與狀態 |
| `CareLog` | 照護、美容、異常與完成照片回報 |
| `Notification` | 會員站內通知與已讀時間 |
| `AuditLog` | 狀態、付款、安排、聯絡與交班操作紀錄 |
| `AppSetting` | 服務價格、營業時間與通知設定 |
| `StaffShift` | 員工班表 |
| `StaffAttendance` | 上下班打卡 |

## 角色權限

| 角色 | 代碼 | 權限摘要 |
| --- | --- | --- |
| 會員 | `member` | 自己的寵物、訂單、付款、通知與評價 |
| 店務人員 | `staff` | 訂單、會員、安排、付款、入住退房、聯絡與交班 |
| 美容師 | `groomer` | 個人美容排程、狀態與服務回報 |
| 寵物照護師 | `caregiver` | 個人照護排程、狀態與照護回報 |
| 系統管理員 | `admin` | 所有管理功能、帳號、設定、班表與匯出 |

## 本機安裝

### macOS / Linux

```bash
cd pet-care-backend/pet-care-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Windows PowerShell

```powershell
cd pet-care-backend/pet-care-backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

預設網址：

```text
http://127.0.0.1:5050
```

健康檢查：

```text
GET http://127.0.0.1:5050/api/health
```

第一次啟動會：

1. 建立 SQLite 資料表。
2. 補上舊資料庫缺少的欄位。
3. 建立五種角色的測試帳號。
4. 建立會員測試寵物「小Q」。

系統不會再建立額外的展示會員與展示訂單。

## 環境變數

| 變數 | 說明 | 預設值 |
| --- | --- | --- |
| `PET_CARE_SECRET_KEY` | JWT 簽章密鑰 | 開發用預設密鑰 |
| `FRONTEND_ORIGINS` | CORS 允許來源，使用逗號分隔 | 本機 Vite 網址 |
| `PORT` | Flask 監聽連接埠 | `5050` |
| `FLASK_DEBUG` | 設為 `1` 啟用 Debug | 關閉 |

macOS / Linux 範例：

```bash
export PET_CARE_SECRET_KEY="請改成長且隨機的字串"
export FRONTEND_ORIGINS="http://localhost:5181,http://127.0.0.1:5181"
python app.py
```

## JWT 驗證

登入成功後會取得 Token：

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "id": "1",
    "email": "demo@test.com",
    "role": "member"
  }
}
```

呼叫需要登入的 API 時加入：

```http
Authorization: Bearer JWT_TOKEN
```

## API 一覽

所有路徑皆以 `/api` 開頭。

### 系統

| Method | Path | 說明 | 權限 |
| --- | --- | --- | --- |
| GET | `/health` | API 健康檢查 | 公開 |
| GET | `/public/system-settings` | 公開服務與營業設定 | 公開 |
| GET | `/availability/rooms` | 查詢房型可用數量 | 公開 |
| GET | `/availability/grooming` | 查詢美容時段名額 | 公開 |

### Auth

| Method | Path | 說明 | 權限 |
| --- | --- | --- | --- |
| POST | `/auth/register` | 會員註冊 | 公開 |
| POST | `/auth/login` | 登入並取得 JWT | 公開 |
| GET | `/auth/me` | 取得目前使用者 | 登入 |
| PUT | `/auth/me` | 更新姓名與電話 | 登入 |

### Pets

| Method | Path | 說明 | 權限 |
| --- | --- | --- | --- |
| GET | `/pets` | 取得自己的寵物 | 會員 |
| POST | `/pets` | 新增寵物 | 會員 |
| PUT | `/pets/:id` | 編輯寵物 | 寵物擁有者 |
| DELETE | `/pets/:id` | 刪除寵物 | 寵物擁有者 |

### Orders

| Method | Path | 說明 | 權限 |
| --- | --- | --- | --- |
| GET | `/orders` | 取得自己的訂單 | 會員 |
| GET | `/orders/:id` | 取得訂單詳情 | 訂單擁有者 |
| POST | `/orders` | 建立住宿或美容預約 | 會員 |
| PATCH | `/orders/:id/cancel` | 取消預約並釋出安排 | 訂單擁有者 |
| PATCH | `/orders/:id/reconfirm` | 預約前再次確認 | 訂單擁有者 |
| PATCH | `/orders/:id/pay` | 模擬付款 | 訂單擁有者 |
| POST | `/orders/:id/review` | 新增評分與評論 | 訂單擁有者 |
| GET | `/orders/:id/care-logs` | 查看公開照護回報 | 訂單擁有者 |

### Notifications

| Method | Path | 說明 | 權限 |
| --- | --- | --- | --- |
| GET | `/notifications` | 取得自己的通知 | 登入 |
| PATCH | `/notifications/:id/read` | 標示單則已讀 | 通知擁有者 |
| PATCH | `/notifications/read-all` | 全部標示已讀 | 登入 |

### Admin Orders

| Method | Path | 說明 | 權限 |
| --- | --- | --- | --- |
| GET | `/admin/stats` | 營運統計 | 店務／管理員 |
| GET | `/admin/orders` | 查詢所有訂單 | 店務／管理員 |
| GET | `/admin/members` | 會員與寵物摘要 | 店務／管理員 |
| POST | `/admin/orders` | 櫃檯建立訂單 | 店務／管理員 |
| PATCH | `/orders/:id/status` | 更新訂單狀態（相容路由） | 店務／管理員 |
| PATCH | `/admin/orders/:id/status` | 更新訂單狀態 | 店務／管理員 |
| PATCH | `/admin/orders/:id/assignment` | 安排房位或美容台 | 店務／管理員 |
| PATCH | `/admin/orders/:id/payment` | 更新付款資料 | 店務／管理員 |
| PATCH | `/admin/orders/:id/check-in` | 辦理入住 | 店務／管理員 |
| PATCH | `/admin/orders/:id/check-out` | 辦理退房 | 店務／管理員 |
| POST | `/admin/orders/:id/contact-logs` | 新增聯絡紀錄 | 店務／管理員 |
| POST | `/admin/orders/:id/handover-notes` | 新增交班備註 | 店務／管理員 |
| GET | `/admin/orders/:id/audit-logs` | 查看操作紀錄 | 店務／管理員 |
| GET | `/admin/orders/:id/care-logs` | 查看完整照護紀錄 | 店務／管理員 |
| POST | `/admin/orders/:id/care-logs` | 新增照護紀錄 | 店務／管理員 |

### System Admin

| Method | Path | 說明 | 權限 |
| --- | --- | --- | --- |
| GET | `/admin/system/users` | 員工帳號列表 | 管理員 |
| POST | `/admin/system/users` | 建立員工帳號 | 管理員 |
| PATCH | `/admin/system/users/:id` | 修改員工帳號與角色 | 管理員 |
| DELETE | `/admin/system/users/:id` | 刪除員工帳號 | 管理員 |
| GET | `/admin/system/service-catalog` | 服務價格設定 | 管理員 |
| PATCH | `/admin/system/service-catalog` | 更新服務價格 | 管理員 |
| GET | `/admin/system/business-settings` | 營業設定 | 管理員 |
| PATCH | `/admin/system/business-settings` | 更新營業設定 | 管理員 |
| GET | `/admin/system/notification-settings` | 通知設定 | 管理員 |
| PATCH | `/admin/system/notification-settings` | 更新通知設定 | 管理員 |
| GET | `/admin/assignments/options` | 房位與美容台設定 | 管理員 |
| PATCH | `/admin/assignments/options` | 更新房位與美容台 | 管理員 |
| GET | `/admin/staff-shifts` | 員工班表 | 管理員 |
| POST | `/admin/staff-shifts` | 新增排班 | 管理員 |
| DELETE | `/admin/staff-shifts/:id` | 刪除排班 | 管理員 |
| GET | `/admin/system/backup` | 下載系統備份 | 管理員 |

### Staff / Worker

| Method | Path | 說明 | 權限 |
| --- | --- | --- | --- |
| GET | `/staff/attendance/today` | 今日打卡資料 | 員工 |
| POST | `/staff/attendance/clock-in` | 上班打卡 | 員工 |
| POST | `/staff/attendance/clock-out` | 下班打卡 | 員工 |
| GET | `/worker/schedule` | 個人服務排程 | 美容／照護相關角色 |
| PATCH | `/worker/orders/:id/status` | 更新服務狀態 | 指派工作人員 |
| POST | `/worker/orders/:id/care-logs` | 回報、異常通知與照片 | 指派工作人員 |

### 匯出

| Method | Path | 說明 | 權限 |
| --- | --- | --- | --- |
| GET | `/admin/export/orders.csv` | 匯出訂單 CSV | 店務／管理員 |
| GET | `/admin/export/members.csv` | 匯出會員 CSV | 店務／管理員 |
| GET | `/admin/export/revenue.csv` | 匯出營收 CSV | 店務／管理員 |

## 主要商業規則

### 房位與美容時段

- 住宿預約會檢查指定日期範圍內的房型容量。
- 同一房位在重疊住宿日期不可重複安排。
- 美容預約會檢查時段剩餘容量。
- 同一美容台在同一天、同一時段不可重複安排。

### 預約確認

- 新訂單預設為「待確認」。
- 店家確認後可更新為「已確認」。
- 系統依 `bookingReminderHours` 在預約前建立再次確認通知。
- 會員可選擇保留或取消；取消後會釋出原安排。
- 預約日期已過且仍停留在可取消狀態時，系統會自動取消。

### 通知與照護回報

- 狀態、付款、入住、退房與照護回報可建立會員通知。
- 通知具有單則已讀與全部已讀功能。
- 照護紀錄可設定是否讓會員查看。
- 工作人員可在服務完成時附上照片。

### 稽核紀錄

以下操作會保存操作時間與內容：

- 狀態更新
- 房位或美容台安排
- 付款與收據
- 入住與退房
- 聯絡紀錄
- 交班備註
- 照護與異常回報

## 測試帳號

| 角色 | Email | 密碼 |
| --- | --- | --- |
| 會員 | `demo@test.com` | `demo123` |
| 店務人員 | `staff@test.com` | `staff123` |
| 美容師 | `groomer@test.com` | `groomer123` |
| 寵物照護師 | `caregiver@test.com` | `care123` |
| 系統管理員 | `admin@test.com` | `admin123` |

## 資料庫

SQLite 檔案：

```text
instance/pet_care.db
```

資料庫由 `db.create_all()` 建立，啟動時也會執行必要的簡易欄位補丁。

注意：

- 不要把正式會員資料庫提交到公開 GitHub。
- SQLite 適合開發、展示與單機使用。
- 多人正式使用建議改為 PostgreSQL。
- Render 未掛載 Persistent Disk 時，重新部署可能重建 SQLite 資料。

## 檢查

```bash
.venv/bin/python -m py_compile app.py
```

## Render 部署

```text
Root Directory: pet-care-backend/pet-care-backend
Build Command: pip install -r requirements.txt
Start Command: python3 app.py
```

環境變數：

```text
PET_CARE_SECRET_KEY=安全的隨機字串
FRONTEND_ORIGINS=https://你的-vercel-網址
```

後端會讀取 Render 提供的 `PORT`。

## 正式環境建議

- 將 SQLite 改為 PostgreSQL。
- 使用 Persistent Disk 或雲端資料庫。
- 將照片改存至 S3、Cloudinary 或其他物件儲存服務。
- 串接正式金流並驗證付款回呼。
- 加入密碼重設、Email 驗證與登入頻率限制。
- 將 Flask 開發伺服器改為正式 WSGI 啟動方式。
- 對 API 補上自動化測試與資料庫遷移工具。

## 相關文件

- [完整專案 README](../../README.md)
- [前端 README](../../pet-care-system/README.md)
- [部署說明](../../DEPLOYMENT.md)
