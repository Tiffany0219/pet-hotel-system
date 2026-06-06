# 毛孩樂園前端

毛孩樂園前端使用 React、TypeScript、Vite 與 Tailwind CSS 製作，提供公開服務頁面、會員中心、店務管理後台、美容師與照護師工作台，以及系統管理功能。

## 線上網站

[https://pet-hotel-system-oo4k.vercel.app](https://pet-hotel-system-oo4k.vercel.app)

## 技術

- React 18
- TypeScript
- Vite 6
- Tailwind CSS 4
- React Router 7
- Lucide React
- Sonner
- date-fns

## 頁面路由

| 路由 | 頁面 | 權限 |
| --- | --- | --- |
| `/` | 首頁 | 公開 |
| `/services` | 服務項目 | 公開 |
| `/rooms` | 住宿房型 | 公開 |
| `/grooming` | 美容服務 | 公開 |
| `/branches` | 分店資訊 | 公開 |
| `/about` | 關於我們 | 公開 |
| `/login` | 登入與註冊 | 公開 |
| `/dashboard` | 會員中心 | 登入會員 |
| `/pets` | 寵物資料 | 登入會員 |
| `/booking` | 線上預約 | 登入會員 |
| `/orders` | 訂單與歷史紀錄 | 登入會員 |
| `/orders/:id` | 訂單詳情 | 登入會員 |
| `/notifications` | 通知中心 | 登入會員 |
| `/admin` | 店務／系統管理後台 | 店務人員、系統管理員 |
| `/workbench` | 美容／照護工作台 | 店務人員、美容師、照護師、系統管理員 |

## 公開介面

### 首頁

- 品牌與服務介紹
- 住宿空間圖片輪播
- 房況摘要
- 最近照護回報
- 立即預約與服務導覽

### 服務項目

- 寵物住宿
- 美容服務
- 日間托育
- 餵藥與特殊照護
- 照護回報
- 接送服務
- 彈窗顯示服務細節

### 住宿房型

- 房型圖片與特色
- 每晚價格
- 適合寵物類型
- 入住時間、攜帶物品與取消規則

### 美容服務

- 基礎洗澡護理
- 造型剪毛設計
- SPA 深層護理
- 服務內容與起始價格

### 分店資訊

- 分店照片
- 地址、電話、Email 與營業時間
- 各分店服務項目與特色
- Google Maps 連結

## 會員端

### 會員中心

- 毛孩資料數量
- 今日預約
- 待付款訂單
- 未讀通知
- 會員資料編輯
- 快速前往預約、寵物與訂單頁

### 寵物資料

- 新增、編輯與刪除寵物
- 物種、性別、品種、年齡與體重
- 過敏、用藥、疫苗、獸醫與緊急聯絡資料
- 預設圖片選擇
- 自行上傳寵物照片

### 預約

- 住宿與美容服務切換
- 四步驟進度顯示
- 寵物卡片選擇
- 房型或美容項目選擇
- 日期與美容時段選擇
- 房況與時段剩餘數量
- 接送、餵藥照護與散步加購
- 即時價格與預約摘要

### 訂單與通知

- 進行中訂單
- 已完成與已取消歷史紀錄
- 模擬付款
- 取消預約
- 預約前再次確認
- 照護紀錄與完成照片
- 服務評分與評論
- 通知已讀與全部已讀

## 店務管理後台

- 今日營運總覽
- 今日入住、退房、美容與進行中服務
- 待確認與待付款項目
- 訂單搜尋、篩選與分頁
- 會員快速查詢
- 現場建立會員訂單
- 安排住宿房位
- 安排美容台與美容時段
- 辦理入住與退房
- 付款、收據與尾款管理
- 電話、LINE 等聯絡紀錄
- 交班備註與操作歷程
- 房況、營收、會員與服務圖表
- CSV 營運資料匯出

## 美容師與照護師工作台

- 個人今日排程
- 上班與下班打卡
- 可收合的訂單卡片
- 寵物健康資訊與家長備註
- 服務狀態更新
- 新增照護或美容回報
- 發送異常通知
- 完成服務後上傳照片

## 系統管理

- 員工帳號與角色管理
- 服務與價格設定
- 房位、美容台與美容時段設定
- 員工班表
- 營業時間與公休日
- 預約與付款提醒規則
- 系統資料備份

## 專案結構

```text
src/
├── components/
│   ├── ConfirmDialog.tsx
│   ├── Layout.tsx
│   ├── MemberBackButton.tsx
│   ├── RequireAdmin.tsx
│   ├── RequireAuth.tsx
│   └── RequireWorker.tsx
├── contexts/
│   └── AuthContext.tsx
├── pages/
│   ├── Home.tsx
│   ├── Services.tsx
│   ├── Rooms.tsx
│   ├── Grooming.tsx
│   ├── Branches.tsx
│   ├── About.tsx
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Pets.tsx
│   ├── Booking.tsx
│   ├── Orders.tsx
│   ├── OrderDetail.tsx
│   ├── Notifications.tsx
│   ├── AdminDashboard.tsx
│   └── WorkerDashboard.tsx
├── App.tsx
├── config.ts
├── systemSettings.ts
└── types.ts
```

## 本機啟動

後端需先啟動在 `http://127.0.0.1:5050`。

```bash
cd pet-care-system
cp .env.example .env
npm install
npm run dev
```

預設網址：

```text
http://127.0.0.1:5181
```

## 環境變數

`.env`：

```env
VITE_API_BASE_URL=http://127.0.0.1:5050/api
```

若未設定，前端會使用：

```text
http://127.0.0.1:5050/api
```

修改 `.env` 後需要重新啟動 Vite。

## 可用指令

```bash
npm run dev       # 啟動開發伺服器
npm run build     # 建立正式版本
npm run preview   # 預覽正式版本
npx tsc --noEmit  # TypeScript 型別檢查
```

## 登入與權限

- JWT Token 儲存在 `localStorage` 的 `token`。
- `RequireAuth` 保護會員頁面。
- `RequireAdmin` 限制店務人員與系統管理員。
- `RequireWorker` 限制店務、美容、照護與系統管理角色。
- 登入後會依角色導向對應介面。

## Vercel 部署

```text
Root Directory: pet-care-system
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

環境變數：

```env
VITE_API_BASE_URL=https://你的-render-網址/api
```

`vercel.json` 已設定 SPA Rewrite，直接重新整理 `/admin`、`/orders` 等子路由不會出現 404。

## 相關文件

- [完整專案 README](../README.md)
- [後端 API README](../pet-care-backend/pet-care-backend/README.md)
- [部署說明](../DEPLOYMENT.md)
