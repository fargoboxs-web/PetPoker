# Repository Guidelines

## Project Structure & Module Organization
- Application code lives in `src/` using Next.js App Router.
- UI pages and API routes are in `src/app/` (for example, `src/app/page.tsx` and `src/app/api/generate/route.ts`).
- Reusable UI pieces are in `src/components/` (PascalCase files like `CardSelector.tsx`).
- Static assets are in `public/`; card source assets are in `Playing Cards/`.
- Root config files include `package.json`, `tsconfig.json`, `eslint.config.mjs`, and `next.config.ts`.

## Build, Test, and Development Commands
- `npm run dev`: start local dev server with webpack on `http://localhost:3000`.
- `npm run build`: production build.
- `npm run start`: run the built app.
- `npm run lint`: run ESLint checks (`eslint-config-next` + TypeScript rules).

Example workflow:
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Coding Style & Naming Conventions
- Language: TypeScript (`strict` mode enabled in `tsconfig.json`).
- Indentation: 2 spaces; use single quotes and semicolons to match existing files.
- Components/types: `PascalCase`; variables/functions: `camelCase`.
- Next.js route handlers follow App Router conventions (`route.ts` under `src/app/api/**`).
- Use `@/*` imports for `src/*` paths (example: `@/components/ImageUploader`).
- Prefer Tailwind utility classes for styling; keep class lists readable and grouped logically.

## Testing Guidelines
- No automated test framework is currently configured (`npm test` is not available).
- Minimum gate before PR: `npm run lint` and a manual UI smoke test.
- Manual smoke test for this app should cover: upload image, generate cards via `/api/generate`, select a card, and download output.
- If adding tests, prefer colocated `*.test.ts(x)` files near the feature or under `src/**/__tests__/`.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history (`feat:`, `chore:`). Keep messages imperative and scoped.
- Keep commits focused to one logical change.
- PRs should include:
  - Short summary of behavior change.
  - Any `.env` or API configuration updates.
  - Screenshots/GIFs for UI changes.
  - Validation notes (lint + manual test steps).

## Security & Configuration Tips
- Store secrets in `.env.local`; never commit real API keys.
- Start from `.env.example` and document any new variables in both `.env.example` and `README.md`.
