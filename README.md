## PetPoker API Setup

项目里的 API 放置位置：

- 前端请求入口：`src/app/page.tsx`（调用 `/api/generate`）
- 服务端 API 代理：`src/app/api/generate/route.ts`

当前后端默认按 Gemini 兼容方式调用卖家接口（`https://api.mmw.ink`），并自动尝试多种认证头（`x-goog-api-key` / `Authorization: Bearer`）。

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
