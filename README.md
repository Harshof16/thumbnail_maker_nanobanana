# Thumbnail Maker (Next.js)

A small Next.js app that helps creators generate multi-ratio YouTube thumbnails using an image-capable LLM. Upload a reference image, answer a short questionnaire, and generate horizontal / vertical / square variants. The app rewrites prompts with an LLM, calls an image model (via OpenRouter / OpenAI-compatible endpoint), and returns thumbnails you can preview and download.

Live demo: LIVE_LINK_PLACEHOLDER

---

## Quick start

Requirements
- Node.js 18+ (recommended)
- pnpm (used by this project) or npm/yarn

Install dependencies and run locally:

```powershell
pnpm install
pnpm dev
```

Open http://localhost:3000 in your browser.

Build for production:

```powershell
pnpm build
pnpm start
```

---

## Required environment variables
Create a `.env.local` file in the project root with at least:

```env
# OpenRouter / OpenAI-compatible key used for image generation
OPENROUTER_API_KEY=your_openrouter_key_here

# Optional: OpenAI key for prompt rewriting (chat completion)
OPENAI_API_KEY=your_openai_key_here

# Optional: base URL used when generating public upload URLs (defaults to http://localhost:3000)
APP_BASE_URL=http://localhost:3000
```

Notes
- The app tries to avoid inlining large base64 payloads into chat messages by saving uploads and passing a public URL to the model when possible.

---

## Folder structure
Top-level important files and folders:

```
/.next/                  # build output (ignored)
logs/                    # runtime logs created by the app (model call logs)
public/                  # static assets and public uploads
src/
  app/                   # Next.js app router pages & api
    api/generatethumbnails/route.ts   # backend orchestrator for generating thumbnails
    page.tsx              # main UI page
  components/             # React components (thumbnailGrid, questionnaire, header, etc.)
  lib/                    # helpers: prompt builder, image generation helper
package.json
pnpm-lock.yaml
README.md
```

Logging
- Model-call and prompt rewrite logs are appended to `logs/model_calls.log` as newline-delimited JSON. This file is created on-demand by the server and useful for debugging which prompts were sent to the model and when.

---

## How it works (high level)
- User uploads a reference image and fills the questionnaire.
- Server builds a system prompt via `src/lib/prompt.ts` and optionally rewrites it using a chat LLM.
- The server calls the image model (OpenRouter/OpenAI-compatible) and asks for multi-ratio outputs.
- Results are returned as base64 data URLs to the client and displayed in the grid; you can preview, download, or zip them.

## Development tips
- To inspect model-call logs in real time (PowerShell):

```powershell
Get-Content .\\logs\\model_calls.log -Wait
```

