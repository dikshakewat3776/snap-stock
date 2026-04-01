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
- View inventory
- View low-stock alerts
- View reorder suggestions
- Export reorder list as text
- Request/response file logging (internal + external API calls)

## API endpoints
- `GET /api/health`
- `GET /api/inventory`
- `POST /api/scan` (multipart: `image`)
- `GET /api/uploads`
- `POST /api/confirm-scan`
- `PUT /api/inventory/:id`
- `GET /api/alerts`
- `GET /api/reorder`
- `GET /api/export/text`

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

## Validation
```bash
npm run typecheck
npm test
```


# Flow

## 1) First health check

Run from project root:

```bash
npm run typecheck
npm test -- --runInBand
```

If both pass, business logic is mostly fine and issue is likely runtime/device/config related.

## 2) Start app safely

```bash
npm run start
```

## 3) End-to-end runtime flow

1. `App.tsx` boots and calls `bootstrapApp()`
2. `bootstrapApp()` initializes SQLite + seeds catalog if empty
3. Home screen opens (`HomeScreen`)
4. Tap **Scan Shelf** -> `ScanScreen`
5. Camera capture -> `MockInferenceAdapter.detectProducts()`
6. Detection result stored in Zustand (`useAppStore`)
7. Navigate to `DetectionReviewScreen`
8. Confirm -> `ConfirmDetectionsUseCase.execute()`
9. Inventory updated in SQLite + sync_queue entry enqueued
10. Alerts screen computes low-stock + reorder suggestions

## 4) Where to debug by symptom

- App stuck on loading:
  - Check `src/app/providers/bootstrap.ts`
  - Check `src/infra/db/database.ts`
- Camera not opening:
  - Check `src/features/scan/screens/ScanScreen.tsx`
  - Confirm camera permission was granted
- Scan shows no detections:
  - Check `src/infra/inference/MockInferenceAdapter.ts`
  - Ensure captured image URI exists
- Confirm button does not update stock:
  - Check `src/domain/usecases/ConfirmDetectionsUseCase.ts`
  - Check `src/data/repositories/InventoryRepository.ts`
- Sync keeps failing:
  - Check `src/infra/sync/SyncService.ts`
  - Check `src/domain/services/syncBackoff.ts`
- Low stock/reorder wrong:
  - Check `src/domain/services/inventoryRules.ts`

## 5) Practical logging (copy/paste)

Use temporary logs, then remove after fixing:

```ts
console.log("[DEBUG] capture uri:", picture?.uri);
console.log("[DEBUG] detection result:", JSON.stringify(result, null, 2));
console.log("[DEBUG] inventory before update:", items);
console.log("[DEBUG] sync queue item:", item);
```

## 6) TypeScript quick cheat sheet

- `type` / `interface`: describes data shape
- `Promise<T>`: async function returns `T` later
- `| null`: value may be empty
- `private readonly`: class property cannot be reassigned outside constructor

Ignore advanced syntax initially; trace runtime values with logs.

## 7) Fast recovery checklist

1. Stop Metro
2. `rm -rf package-lock.json node_modules/`
3. `npm install`
4. `npx expo start --clear`
5. Re-run typecheck/tests
