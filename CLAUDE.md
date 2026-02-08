# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PetPoker is a Next.js application that generates Chinese New Year-themed poker cards featuring user-uploaded pet photos. Users upload a pet image, the app calls an AI image generation API, and returns two card options for the user to choose from.

## Commands

```bash
npm run dev      # Start development server (uses webpack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Flow
1. User uploads pet image → `src/app/page.tsx` (client component with state machine)
2. Frontend sends base64 image to `/api/generate`
3. `src/app/api/generate/route.ts` proxies to external AI API (Gemini-compatible or OpenAI-images)
4. API generates 2 cards in parallel, returns base64/URLs
5. User selects preferred card and downloads

### State Machine (page.tsx)
The app uses a discriminated union for state: `upload` → `generating` → `select` → `result`

### API Modes
The `/api/generate` route supports multiple API backends configured via environment:
- `gemini` (default): Gemini-style multimodal API
- `openai-images`: OpenAI images/edits endpoint
- `auto`: Try Gemini first, fallback to OpenAI-images

### Key Environment Variables
- `NANOBANANA_API_KEY` - Required API key
- `NANOBANANA_BASE_URL` - API endpoint (default: `https://api.mmw.ink`)
- `NANOBANANA_MODEL` - Model name
- `NANOBANANA_API_MODE` - `gemini` | `openai-images` | `auto`

See `.env.example` for full configuration options.

## Tech Stack
- Next.js 16 with App Router
- React 19
- Tailwind CSS 4
- Framer Motion for animations
- react-dropzone for image uploads
- TypeScript with `@/*` path alias mapping to `./src/*`
