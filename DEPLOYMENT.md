# 部署說明：Vercel + Render

建議部署方式：

- 前端：Vercel
- 後端：Render

## 1. 後端部署到 Render

1. 登入 Render，選擇 **New Web Service**。
2. 連接 GitHub repo：`Tiffany0219/pet-hotel-system`。
3. 如果 Render 偵測到 `render.yaml`，可以直接使用 Blueprint 建立服務。
4. 後端服務設定：
   - Root Directory：`pet-care-backend/pet-care-backend`
   - Build Command：`pip install -r requirements.txt`
   - Start Command：`python3 -m gunicorn app:app`
5. 環境變數：
   - `PET_CARE_SECRET_KEY`：請用一段隨機字串
   - `FRONTEND_ORIGINS`：填入 Vercel 前端網址，例如 `https://你的前端網址.vercel.app`

後端網址會類似：

```txt
https://pet-care-backend.onrender.com
```

前端 API URL 要使用：

```txt
https://pet-care-backend.onrender.com/api
```

如果 Render log 出現：

```txt
ERROR: Could not open requirements file: No such file or directory: 'requirements.txt'
```

代表 Render 沒有進到後端資料夾。請到 Render 服務的 **Settings**，確認：

```txt
Root Directory = pet-care-backend/pet-care-backend
Build Command = pip install -r requirements.txt
Start Command = python3 -m gunicorn app:app
```

儲存後按 **Manual Deploy > Deploy latest commit**。

如果不想改 Root Directory，也可以用根目錄部署設定：

```txt
Build Command = pip install -r requirements.txt
Start Command = python3 -m gunicorn --chdir pet-care-backend/pet-care-backend app:app
```

## 2. 前端部署到 Vercel

1. 登入 Vercel，選擇 **Add New Project**。
2. 匯入 GitHub repo：`Tiffany0219/pet-hotel-system`。
3. Project Root / Root Directory 設為：

```txt
pet-care-system
```

4. Build 設定：
   - Framework Preset：Vite
   - Build Command：`npm run build`
   - Output Directory：`dist`
5. 環境變數：

```txt
VITE_API_BASE_URL=https://你的-render-後端網址/api
```

6. 部署完成後，把 Vercel 網址回填到 Render 的 `FRONTEND_ORIGINS`。

## 注意

- 前端有 `vercel.json`，重新整理 `/login`、`/admin` 等路由不會 404。
- 後端會使用平台提供的 `PORT` 啟動。
- 目前後端使用 SQLite，適合展示與課堂專案；正式商用建議改成雲端資料庫。
