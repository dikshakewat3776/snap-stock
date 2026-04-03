# Smart Inventory Scanner (Web Portal)

Pure Node.js + Express web app for shelf-image scanning, inventory updates, alerts, and reorder exports.

## Prerequisites
- Node.js 20+
- npm 10+

## Local setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Set your provider key in `.env`:
   - OpenAI:
     - `AI_PROVIDER=openai`
     - `OPENAI_API_KEY=...`
   - Gemini:
     - `AI_PROVIDER=gemini`
     - `GEMINI_API_KEY=...`
4. Start app:
   ```bash
   npm run dev
   ```
5. Open:
   - `http://localhost:3000` (or your `PORT`)

## Features
- Upload shelf image and run AI detection (OpenAI or Gemini)
- Confirm scan and apply stock updates
- Run AI detection and confirm scans
- Request/response file logging (internal + external API calls)

## API endpoints
- `GET /api/health`
- `POST /api/scan` (multipart: `image` up to 10 files)
- `GET /api/uploads`
- `POST /api/confirm-scan`

## Data and logs
- Inventory: `data/inventory.json`
- Upload index: `data/upload-index.json`
- Uploaded images: `uploads/`
- Daily logs: `logs/YYYY-MM-DD.log`

## Deploy / setup on a server
1. Provision Node.js 20+ environment.
2. Copy project files and run:
   ```bash
   npm ci
   ```
3. Set env vars in hosting platform:
   - `PORT` (for platform port)
   - `AI_PROVIDER`
   - `OPENAI_API_KEY` or `GEMINI_API_KEY`
   - optional: `OPENAI_MODEL` / `GEMINI_MODEL`
4. Start process:
   ```bash
   npm start
   ```
5. (Recommended) Use a process manager (`pm2`, systemd, or host-native service).
6. Persist writable folders across restarts if needed:
   - `data/`, `uploads/`, `logs/`

## GitHub push quick steps
```bash
git init
git add .
git commit -m "Initial smart inventory scanner web app"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### LiveReview (`lrc`) — setup

LiveReview is a separate CLI that can gate Git commits with an AI review attestation. This repo does **not** ship the hook; it is installed on your machine (often globally).

**Official site:** [https://livereview.hexmos.com/](https://livereview.hexmos.com/)

1. **Install or update the CLI** (if `lrc` is not on your `PATH`):
   ```bash
   # If you already have lrc:
   lrc self-update
   ```
   Follow your team’s install path if different (some setups use a package manager or `~/.local/bin`).

2. **First-time configuration** (auth + AI / API settings):
   ```bash
   lrc setup
   ```
   Complete the prompts (Hexmos / LiveReview + AI as directed).

3. **Install Git hook dispatchers** (once per machine; uses Git’s `core.hooksPath`):
   ```bash
   lrc hooks install
   ```

4. **Enable hooks for this repository** (from this project’s root):
   ```bash
   lrc hooks enable
   lrc hooks status
   ```
   To turn LiveReview off **only for this repo**:
   ```bash
   lrc hooks disable
   ```
   To remove dispatchers entirely:
   ```bash
   lrc hooks uninstall
   ```

### LiveReview — usage in this project

Typical flow when hooks are enabled:

1. Stage your changes: `git add …`
2. Run a review on what you staged:
   ```bash
   lrc review --staged
   ```
3. Commit: `git commit -m "…"`  
   If the hook still complains, use one of the options below.

**Options when you need attestation without a full review** (only if your team allows):

| Situation | Command |
|-----------|---------|
| Skip review, record attestation locally | `lrc review --staged --skip` |
| Vouch manually (no full AI review) | `lrc review --staged --vouch` |

**If commit fails with `review attestation missing`**

Run one of the review commands above, then commit again. Emergency bypass (may violate org policy):

```bash
git commit --no-verify -m "Your message"
```

## Validation
```bash
npm run typecheck
npm test
```


# Flow

## 1) Start the server

```bash
npm run dev
```

Your web portal is available at `http://localhost:${PORT}` (or whatever `PORT` you set).

## 2) End-to-end runtime flow

1. The browser loads `public/index.html`
2. User selects `1..10` shelf images and clicks `Scan`
3. Browser calls `POST /api/scan` with multipart field name `image`
4. Server:
   1. saves each uploaded image to `uploads/`
   2. calls the configured AI provider (via `AI_PROVIDER` + the relevant API key)
   3. returns detection JSON back to the browser
5. User clicks `Confirm Scan`
6. Browser calls `POST /api/confirm-scan` with the scan payload
7. Server updates `data/inventory.json` using `aggregated_items` (matched by `product_name` + `brand`)

## 3) Where to debug by symptom

- Scan fails (provider error / rate limit / TLS):
  - Check `logs/YYYY-MM-DD.log` for `external_error` entries
- Scan returns invalid/empty JSON:
  - Check `external_response` entries (preview) for provider output issues
- Confirm doesn’t update inventory:
  - Check `logs/YYYY-MM-DD.log` for `/api/confirm-scan` payload shape

## 4) Logs

- Daily logs are written to `logs/YYYY-MM-DD.log`
- Requests are correlated via `x-request-id` and `x-application-id` headers

## 6) TypeScript quick cheat sheet

**Types and values**

- `type` / `interface`: describes the shape of an object or value (fields and their types).
- `string` / `number` / `boolean`: primitive types; use them so the compiler catches mistakes early.
- `|`: union — “this value is one of these types,” e.g. `string | number`.
- `| null` / `| undefined`: value may be missing; forces you to check before using it safely.
- `?` on a property: optional — the field may be absent, e.g. `{ name?: string }`.
- `readonly`: property cannot be reassigned after creation (immutability hint).

**Functions**

- `(a: string) => number`: function type — takes a string, returns a number.
- `async function` / `async () => {}`: always returns a `Promise`; use `await` to get the result.
- `Promise<T>`: a value that will resolve to type `T` later (typical for network, timers, files).
- `void`: function returns nothing useful.

**Objects and APIs**

- `obj?.field` / `obj?.method?.()`: optional chaining — if `obj` is `null`/`undefined`, the whole expression is `undefined` instead of crashing.
- `value ?? defaultValue`: nullish coalescing — use `defaultValue` when `value` is `null` or `undefined`.
- `as Type`: tell the compiler to treat a value as `Type`; use sparingly — you are taking responsibility if it is wrong.

**Arrays and generics**

- `T[]` / `Array<T>`: array of items of type `T`.
- `Map<K, V>` / `Set<T>`: typed collections; `K`, `V`, `T` are placeholders (generics).

**Classes (when you see them)**

- `public` / `private` / `protected`: who can see or call a member.
- `private readonly`: class property cannot be reassigned outside the constructor.

**This repo**

- Run `npm run typecheck` to verify types without changing files.

**Reference**

- [TypeScript cheatsheets](https://www.typescriptlang.org/cheatsheets/) — printable PDFs from the TypeScript team.
