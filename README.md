## PetPoker API Setup

项目里的 API 放置位置：

- 前端请求入口：`src/app/page.tsx`（调用 `/api/generate`）
- 服务端 API 代理：`src/app/api/generate/route.ts`

当前后端默认按 Gemini 兼容方式调用卖家接口（`https://api.mmw.ink`），并自动尝试多种认证头（`x-goog-api-key` / `Authorization: Bearer`）。

## Vercel 部署与环境变量（重要）

### 代码更新是否会自动部署？

是的。如果 Vercel 项目已经连接到 GitHub 仓库，并且 Production 监听 `main` 分支：

- 你本地改代码 -> `git commit` -> `git push origin main`
- Vercel 会自动构建并发布最新版本

你不需要每次重复 `vercel link` 或重新登录。

### 哪些东西必须放到环境变量里？

只有“密钥”必须放环境变量里：

- 必填：`NANOBANANA_API_KEY`（你的 Nano Banana / 卖家平台 API Key）

其他 `NANOBANANA_*` 变量都属于“可选配置”。不设置也能跑（会用后端默认值），但建议也放环境变量里，原因是：

- 以后你换接口/换模型时，只改 Vercel 环境变量就能生效，不一定要改代码
- 避免让不带上下文的 AI 改代码时，把你的线上配置意外改掉

### 环境变量优先级（避免混乱的关键）

后端会按这个逻辑工作（见 `src/app/api/generate/route.ts`）：

- 如果 Vercel / 本地设置了 `NANOBANANA_*` 环境变量：以环境变量为准
- 如果没设置：使用代码里的默认值

因此，只要你把配置放在 Vercel 环境变量里，之后 AI 修改代码的“默认值”，通常不会影响你的线上行为。

### 常用环境变量清单

必填（线上一定要配）：

- `NANOBANANA_API_KEY`

常用（建议线上也配，便于以后切换）：

- `NANOBANANA_BASE_URL`（默认 `https://api.mmw.ink`）
- `NANOBANANA_MODEL`（默认 `[A]gemini-3-pro-image-preview`）
- `NANOBANANA_API_MODE`：`gemini` / `openai-images` / `auto`
- `NANOBANANA_IMAGE_SIZE`（默认 `2K`）
- `NANOBANANA_INCLUDE_TEMPLATE`（默认 `1`）
- `NANOBANANA_DEBUG`（默认 `1`；线上建议改成 `0`）

### 在 Vercel 网页里怎么添加（英文界面）

Project -> `Settings` -> `Environment Variables` -> `Add`

- Name：填变量名（如 `NANOBANANA_API_KEY`）
- Value：填变量值
- Environment：建议同时勾选 `Production` / `Preview` / `Development`

保存后需要触发一次新部署（push 一次代码或者点 Redeploy），新变量才会进到新部署里。

### 安全规则（不要踩坑）

- 永远不要把真实 key 写进代码，也不要提交 `.env.local`
- 如果 key 曾经出现在聊天/日志里，建议立刻到提供方后台 rotate 一次，然后更新 Vercel 环境变量

### 1) 配置环境变量

```bash
cp .env.example .env.local
```

按你的 API 信息填写 `.env.local`。

关键变量：

- `NANOBANANA_API_KEY`
- `NANOBANANA_BASE_URL`
- `NANOBANANA_MODEL`
- `NANOBANANA_API_MODE`（`gemini` / `openai-images` / `auto`）

### 2) 本地运行

```bash
npm run dev
```

如果卖家后续改了文档，只要改 `.env.local` 里的 endpoint / model / mode 即可，通常不需要再改业务代码。

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
