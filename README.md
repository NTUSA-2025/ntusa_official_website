# NTUSA Website

這個專案是 NTUSA 官網的 Next.js 應用程式，除了首頁內容展示，也包含文章投稿、審核流程、Google Workspace 權限判斷與郵件通知。

## 功能概覽

- 首頁顯示已通過審核的文章
- 使用 Google OAuth 登入，且僅允許 `@ntusa.ntu.edu.tw` 帳號
- 依 Google Workspace 群組決定使用者角色與部門
- 提供文章編輯器、送審、退回、核准、重新送審流程
- 上傳文章封面圖片到 Cloudflare R2
- 使用 Resend 寄送送審與審核結果通知信

## 技術棧

- Next.js 16 + React 19
- TypeScript
- NextAuth
- Prisma + PostgreSQL
- Cloudflare R2
- Resend
- next-intl

## 角色與權限

- `admin`
  - 目前由 `infor@ntusa.ntu.edu.tw` 群組成員取得
  - 可審核文章，也可管理其他文章
- `reviewer`
  - 為 `pr-dept@ntusa.ntu.edu.tw` 群組中的 `OWNER` 或 `MANAGER`
  - 可在 `/review` 審核文章
- `editor`
  - 一般部門成員，或非主管權限的公關部成員
  - 可撰寫、編輯、重新送審自己的文章

## 主要頁面

- `/`：首頁，僅顯示 `APPROVED` 文章
- `/editor`：新增文章
- `/editor/[id]`：編輯既有文章
- `/review`：審核後台

## 開發前準備

請先安裝以下服務或帳號：

- Node.js 18+，建議使用目前 LTS
- PostgreSQL
- Google OAuth Client
- Google Workspace Service Account，並啟用 Domain-Wide Delegation 與 Admin SDK Directory API
- Cloudflare R2 Bucket
- Resend API Key

## 本機啟動

1. 安裝套件

```bash
npm install
```

2. 複製環境變數檔

```bash
cp .env.example .env
```

3. 填入 `.env` 內容後，初始化 Prisma

```bash
npx prisma generate
npx prisma db push
```

4. 啟動開發伺服器

```bash
npm run dev
```

預設網址是 `http://localhost:3000`。

## 環境變數說明

### 必填

- `DATABASE_URL`
  - PostgreSQL 連線字串
- `NEXTAUTH_SECRET`
  - NextAuth session secret
- `NEXTAUTH_URL`
  - 本機通常是 `http://localhost:3000`，正式站請填正式網址
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
  - Google OAuth 登入設定
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_WORKSPACE_ADMIN_EMAIL`
  - Google Workspace 群組查詢與角色判斷使用
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `NEXT_PUBLIC_R2_PUBLIC_URL`
  - 封面圖上傳與公開讀取使用
- `RESEND_API_KEY`
  - 寄送送審通知與審核通知信

### 選填

- `NEXTAUTH_CLIENT_SECRET`
  - 若有額外代理或舊設定需求可提供；未填時會退回使用 `GOOGLE_CLIENT_SECRET`
- `REVIEWER_EMAILS`
  - 逗號分隔的通知收件人，預設為 `pr-dept@ntusa.ntu.edu.tw`

## 開發流程說明

### 文章生命週期

1. 使用者在 `/editor` 建立文章
2. 新文章預設寫入 `PENDING`
3. 系統寄送待審核通知給 `REVIEWER_EMAILS`
4. 公關部主管或資訊部管理員可在 `/review` 核准或退回
5. 文章核准後才會出現在首頁
6. 已有文章被修改後，狀態會重設為 `PENDING` 並重新送審

### 權限來源

- 使用者登入後，系統會從 Google Workspace 群組判斷部門
- `infor@ntusa.ntu.edu.tw` 成員會被視為 `admin`
- `pr-dept@ntusa.ntu.edu.tw` 的 `OWNER` 或 `MANAGER` 會被視為 `reviewer`
- 其他 `@ntusa.ntu.edu.tw` 群組成員預設為 `editor`

## 常用指令

```bash
npm run dev
npm run lint
npm run test
npm run test:e2e
npm run build
```

## 部署

目前正式環境的架構應為：

- `PM2` 啟動 Next.js 應用程式
- `Caddy` 負責 HTTPS 與反向代理到 Next.js 服務

部署前至少應先確認：

```bash
npm run lint
npm run test
npm run build
```

### 重新部署應用程式

```bash
pm2 restart ntusa-website
```

### Caddy 注意事項

- `NEXTAUTH_URL` 應設為正式站的 `https` 網址
- Caddy 需將正式網域反向代理到 PM2 啟動中的 Next.js 服務
- 若 Caddy 代理的不是預設埠，請同步確認 PM2 啟動參數與 Caddy 設定一致

如果部署方式、網域或代理規則有變動，請一併更新這份 README，避免文件和實際環境脫節。
