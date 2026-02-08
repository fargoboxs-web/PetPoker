# PetPoker API Handoff (for another Coding Agent)

## 1) Project and Goal
- Project path: `/Users/fargobox/Poker/petpoker`
- Stack: Next.js 16 App Router (`src/app`)
- Current product flow:
  1. Upload pet photo
  2. Call backend `/api/generate`
  3. Get 2 generated cards
  4. User selects one and downloads

## 2) Critical File Map
- Frontend API call entry:
  - `/Users/fargobox/Poker/petpoker/src/app/page.tsx`
- Backend API relay route:
  - `/Users/fargobox/Poker/petpoker/src/app/api/generate/route.ts`
- Poker template used by backend:
  - `/Users/fargobox/Poker/petpoker/public/poker-template.png`
- Env template:
  - `/Users/fargobox/Poker/petpoker/.env.example`
- Runtime env (contains real key locally):
  - `/Users/fargobox/Poker/petpoker/.env.local`

## 3) Current API Provider Setup
- Provider endpoint: `https://api.mmw.ink`
- Default model: `[A]gemini-3-pro-image-preview`
- Key format: `sk-...`
- Current mode: Gemini-compatible (`NANOBANANA_API_MODE=gemini`)

Seller model list that was provided:
- `gemini-3-pro-image-preview`
- `gemini-3-pro-image-preview-2k`
- `gemini-3-pro-image-preview-4k`
- `[A]gemini-3-pro-image-preview`
- `[A]gemini-3-pro-image-preview-2k`
- `[A]gemini-3-pro-image-preview-4k`

## 4) Backend Behavior (important)
File: `/Users/fargobox/Poker/petpoker/src/app/api/generate/route.ts`

### Request contract (from frontend)
`POST /api/generate` with JSON:
```json
{
  "petImage": "data:image/png;base64,..."
}
```

### Response contract (to frontend)
Success:
```json
{
  "success": true,
  "cards": ["<url_or_dataurl_1>", "<url_or_dataurl_2>"]
}
```

Error:
```json
{
  "success": false,
  "error": "..."
}
```

### Generation logic
- Reads uploaded `petImage` (base64 data URL)
- Optionally reads local template `/poker-template.png` and sends it as second image when `NANOBANANA_INCLUDE_TEMPLATE=1`
- Generates **2 cards in parallel** via `Promise.all`

### API mode support
- `gemini` (default):
  - Calls `generateContent` style endpoint.
  - Endpoint fallback order:
    1. `NANOBANANA_GEMINI_ENDPOINT_TEMPLATE` (default `/v1beta/models/{model}:generateContent`)
    2. `/v1beta/models/{model}:generateContent`
    3. `/v1/models/{model}:generateContent`
- `openai-images`:
  - Calls image endpoint (`NANOBANANA_IMAGE_ENDPOINT`, default `/v1/images/edits`) with multipart form-data
- `auto`:
  - Try Gemini first, fallback to image endpoint

### Auth fallback behavior
Backend tries these auth headers (deduplicated):
1. Custom env auth header (`NANOBANANA_AUTH_HEADER` + `NANOBANANA_AUTH_SCHEME`)
2. `x-goog-api-key: <key>`
3. `Authorization: Bearer <key>`

### Response parsing
Route accepts multiple upstream response shapes:
- OpenAI-like: `data[0].url` or `data[0].b64_json`
- Gemini-like: `candidates[].content.parts[].inlineData/inline_data`
- Text containing image URL (regex extract)

## 5) Environment Variables
Use `/Users/fargobox/Poker/petpoker/.env.example` as baseline.

Key variables:
- Required:
  - `NANOBANANA_API_KEY`
- Provider:
  - `NANOBANANA_BASE_URL=https://api.mmw.ink`
  - `NANOBANANA_MODEL=[A]gemini-3-pro-image-preview`
  - `NANOBANANA_API_MODE=gemini`
  - `NANOBANANA_IMAGE_SIZE=2K`
  - `NANOBANANA_INCLUDE_TEMPLATE=1`
- Optional:
  - `NANOBANANA_TIMEOUT_MS=300000`
  - `NANOBANANA_GEMINI_ENDPOINT_TEMPLATE=/v1beta/models/{model}:generateContent`
  - `NANOBANANA_DEBUG=1` (for logs)
  - `NANOBANANA_GROUP`
  - `NANOBANANA_EXTRA_HEADERS` (JSON)

For `openai-images` mode only:
- `NANOBANANA_IMAGE_ENDPOINT`
- `NANOBANANA_MODEL_FIELD`
- `NANOBANANA_PROMPT_FIELD`
- `NANOBANANA_IMAGE_FIELD`
- `NANOBANANA_TEMPLATE_IMAGE_FIELD`

## 6) Runtime/Tooling Constraints Already Fixed
- Turbopack caused runtime failure (`turbo.createProject` with wasm bindings).
- Project is intentionally configured to use webpack for stability:
  - `/Users/fargobox/Poker/petpoker/package.json`
    - `dev`: `next dev --webpack`
    - `build`: `next build --webpack`
  - `/Users/fargobox/Poker/petpoker/next.config.ts`
    - `turbopack.root = process.cwd()`

## 7) Known Issues / Non-API Noise
- Build can fail in restricted network because `next/font` fetches Google Fonts (`fonts.googleapis.com`).
- This is separate from API integration and does not necessarily block local `npm run dev`.

## 8) Current State Clarification
- The temporary “3-style selection” feature was requested and then fully rolled back.
- Current logic is single fixed prompt, 2-card output.

## 9) Quick Verification Checklist for New Agent
1. Ensure `.env.local` exists and key is set.
2. Run:
   - `npm run lint`
   - `npm run dev`
3. Open app and upload a pet image.
4. Confirm `/api/generate` returns `success: true` with 2 card URLs/data URLs.
5. If generation fails, inspect server logs from `route.ts` (`NANOBANANA_DEBUG=1`).

## 10) Security Note
- Real API key is stored in local `.env.local`.
- Do not commit `.env.local`.
- If key was exposed in chat/logs, rotate it at provider side.
